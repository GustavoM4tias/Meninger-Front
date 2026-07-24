<script setup>
// Modal do Lead Form Meta — visão por form (não confunde com mapping de
// roteamento, que vive na campanha agora).
//
// Tabs:
//   1. Estrutura & Mapeamento — perguntas do form e pra qual campo CV vão
//   2. Gestão interna — descrição, prioridade, referência de campanha
//   3. Comparativo — Meta × Office × CV (números + funil)
//   4. Leads recentes — últimos 20 + CSV export
//
// Vínculo CV (empreendimento, mídia, UTMs, extras) MIGROU pra MetaCampaign.

import { ref, watch, computed } from 'vue';
import { useMetaFormsStore } from '@/stores/Marketing/Capture/metaFormsStore';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    form: { type: Object, default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const store = useMetaFormsStore();

const activeSection = ref('estrutura');

// Gestão (editável)
const description = ref('');
const priority    = ref('normal');
const campaignRef = ref('');
const savingMeta  = ref(false);
const localError  = ref(null);

// Field mappings (editável)
const fmLoading = ref(false);
const fmSaving  = ref(false);
const fmEditor  = ref(null);          // { form, items, available_targets }
const fmDraft   = ref({});            // { questionKey: cvField | '' }

const downloadingCsv = ref(false);

// Leads recentes
const recentLeads = ref([]);
const loadingLeads = ref(false);

function close() { emit('update:open', false); }

watch([() => props.open, () => props.form], async ([isOpen, f]) => {
    if (!isOpen || !f) return;

    description.value = f.description || '';
    priority.value    = f.priority || 'normal';
    campaignRef.value = f.campaign_ref || '';

    localError.value = null;
    activeSection.value = 'estrutura';

    fmEditor.value = null;
    fmDraft.value = {};
    recentLeads.value = [];

    // Pré-carrega o editor de mapeamento (tab default)
    fmLoading.value = true;
    try {
        const d = await store.fetchFieldMappings(f.id);
        if (d?.ok) {
            fmEditor.value = d;
            // Popula draft com current ou vazio (= usa auto)
            for (const item of d.items) {
                fmDraft.value[item.question_key] = item.current_mapping || '';
            }
        }
    } finally {
        fmLoading.value = false;
    }

    // Pré-carrega leads em paralelo
    loadingLeads.value = true;
    try {
        recentLeads.value = await store.fetchRecentLeads(f.id, { limit: 20 });
    } finally {
        loadingLeads.value = false;
    }
}, { immediate: true });

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtMoney(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0); }
function fmtInt(v)   { return new Intl.NumberFormat('pt-BR').format(Number(v) || 0); }
function fmtRelative(iso) {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return 'agora';
    const min = Math.floor(ms / 60000);
    if (min < 1)    return 'agora';
    if (min < 60)   return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24)     return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7)      return `${d}d`;
    return new Date(iso).toLocaleDateString('pt-BR');
}

function statusColor(s) {
    if (s === 'delivered')               return 'text-emerald-600 dark:text-emerald-300';
    if (s === 'held')                    return 'text-amber-600 dark:text-amber-300';
    if (s === 'historical')              return 'text-violet-600 dark:text-violet-300';
    if (s === 'spam')                    return 'text-red-500';
    if (s === 'failed' || s === 'rejected') return 'text-red-600 dark:text-red-300';
    return 'text-ink-muted';
}

const statusBadge = computed(() => {
    const s = String(props.form?.status || '').toUpperCase();
    if (s === 'ACTIVE')   return { label: 'Ativo na Meta',  cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (s === 'ARCHIVED') return { label: 'Arquivado',      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (s === 'DELETED')  return { label: 'Excluído',       cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (s === 'DRAFT')    return { label: 'Rascunho',       cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
});

const stats = computed(() => props.form?.stats || { total: 0, last_30d: 0, delivered: 0, held: 0, spam: 0, failed: 0, last_lead_at: null });

// ── Field mapping ──────────────────────────────────────────────────────────
const fmGrouped = computed(() => {
    if (!fmEditor.value?.available_targets) return [];
    const byGroup = new Map();
    for (const t of fmEditor.value.available_targets) {
        if (!byGroup.has(t.group)) byGroup.set(t.group, []);
        byGroup.get(t.group).push(t);
    }
    return [...byGroup.entries()].map(([group, items]) => ({ group, items }));
});

function effectiveMapping(item) {
    const draft = fmDraft.value[item.question_key];
    return draft || item.auto_detected || 'extra';
}

function targetLabel(targetKey) {
    if (!targetKey) return '—';
    const target = fmEditor.value?.available_targets?.find(t => t.key === targetKey);
    return target?.label || targetKey;
}

async function saveFieldMappings() {
    if (!props.form?.id) return;
    fmSaving.value = true;
    try {
        // Só envia o que tá explicitamente setado (string truthy). Vazios → null no backend = "usa auto".
        const payload = {};
        for (const [k, v] of Object.entries(fmDraft.value)) {
            if (v && v.trim()) payload[k] = v;
        }
        await store.saveFieldMappings(props.form.id, payload);
        // Recarrega o editor pra refletir estado salvo
        const d = await store.fetchFieldMappings(props.form.id);
        if (d?.ok) {
            fmEditor.value = d;
            for (const item of d.items) {
                fmDraft.value[item.question_key] = item.current_mapping || '';
            }
        }
    } finally {
        fmSaving.value = false;
    }
}

function resetMappingToAuto(questionKey) {
    fmDraft.value[questionKey] = '';
}

// ── Gestão ─────────────────────────────────────────────────────────────────
async function saveGestao() {
    localError.value = null;
    savingMeta.value = true;
    try {
        const ok = await store.updateMapping(props.form.id, {
            description: description.value.trim() || null,
            priority: priority.value || 'normal',
            campaign_ref: campaignRef.value.trim() || null,
        });
        if (!ok) localError.value = store.error || 'Erro ao salvar.';
        else emit('saved');
    } finally {
        savingMeta.value = false;
    }
}

// ── Export ─────────────────────────────────────────────────────────────────
async function exportCsv(filter) {
    downloadingCsv.value = true;
    try {
        await store.downloadLeadsCsv(props.form.id, { cv: filter });
    } catch (e) {
        alert('Erro ao exportar: ' + e.message);
    } finally {
        downloadingCsv.value = false;
    }
}

const sections = [
    { key: 'estrutura',   label: 'Estrutura & Mapeamento', icon: 'fas fa-list-check' },
    { key: 'gestao',      label: 'Gestão interna',         icon: 'fas fa-clipboard-list' },
    { key: 'leads',       label: 'Leads recentes',         icon: 'fas fa-users' },
];
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
    <div class="bg-surface text-ink w-full max-w-4xl rounded-xl shadow-xl border border-line max-h-[92vh] flex flex-col">

      <!-- Header -->
      <header class="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-line shrink-0">
        <div class="shrink-0 w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
          <i class="fab fa-meta text-lg"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold text-ink leading-tight truncate">{{ form?.name || 'Formulário Meta' }}</h3>
          <p class="text-xs text-ink-subtle mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
            <span class="font-mono">#{{ form?.id }}</span>
            <span v-if="form?.page_name">· {{ form.page_name }}</span>
            <span v-if="form?.locale">· {{ form.locale }}</span>
            <span v-if="form?.created_time">· Criado {{ new Date(form.created_time).toLocaleDateString('pt-BR') }}</span>
          </p>
        </div>
        <span :class="['inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium', statusBadge.cls]">
          {{ statusBadge.label }}
        </span>
        <button @click="close" class="shrink-0 text-ink-subtle hover:text-ink p-1"><i class="fas fa-times"></i></button>
      </header>

      <!-- KPI bar -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-3 border-b border-line bg-surface-sunken/30 shrink-0">
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Total</div>
          <div class="text-lg font-semibold text-ink">{{ fmtInt(stats.total) }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Últimos 30d</div>
          <div class="text-lg font-semibold text-ink">{{ fmtInt(stats.last_30d) }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Entregues</div>
          <div class="text-lg font-semibold text-emerald-600 dark:text-emerald-300">{{ fmtInt(stats.delivered) }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Pendentes</div>
          <div class="text-lg font-semibold text-amber-600 dark:text-amber-300">{{ fmtInt(stats.held) }}</div>
        </div>
        <div class="text-center col-span-2 sm:col-span-1">
          <div class="text-[10px] uppercase tracking-wider text-ink-subtle">Último lead</div>
          <div class="text-sm font-medium text-ink">{{ fmtRelative(stats.last_lead_at) }}</div>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="px-5 border-b border-line shrink-0 overflow-x-auto">
        <div class="flex gap-0">
          <button v-for="s in sections" :key="s.key" @click="activeSection = s.key"
            :class="['px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5',
              activeSection === s.key
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-muted hover:text-ink']">
            <i :class="s.icon" class="text-[10px]"></i>
            {{ s.label }}
          </button>
        </div>
      </nav>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        <!-- ── Estrutura & Mapeamento ────────────────────────────────────── -->
        <section v-show="activeSection === 'estrutura'" class="space-y-3">
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5">
            <div class="text-sm font-medium text-ink mb-0.5">
              <i class="fas fa-list-check text-accent mr-1.5"></i>Perguntas do form → campo CV
            </div>
            <p class="text-xs text-ink-subtle">
              Pra cada pergunta da Meta, escolha qual campo do CV vai receber a resposta.
              Em branco = o sistema usa <b>auto-detecção</b> (sugestão mostrada em cinza).
              <span class="text-violet-700 dark:text-violet-300">extra_fields</span> = mantém em JSONB custom.
              <span class="text-red-600 dark:text-red-300">Ignorar</span> = não envia ao CV.
            </p>
          </div>

          <div v-if="fmLoading" class="text-center py-8 text-ink-subtle">
            <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando estrutura...
          </div>

          <div v-else-if="!fmEditor || !fmEditor.items?.length"
            class="text-center py-8 text-ink-subtle text-sm rounded-lg border border-dashed border-line">
            <i class="fas fa-circle-info text-xl mb-1 block"></i>
            Sem perguntas no form ainda. Sincronize na Central Meta → <span class="font-mono">Captação → Sincronizar Meta</span>.
          </div>

          <div v-else class="space-y-2">
            <div v-for="item in fmEditor.items" :key="item.question_key"
              class="rounded-lg border border-line bg-surface px-3 py-2.5 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-start">

              <!-- Pergunta -->
              <div class="min-w-0">
                <div class="text-sm font-medium text-ink leading-tight">{{ item.question_label }}</div>
                <div class="text-[10px] font-mono text-ink-subtle mt-0.5">
                  key: {{ item.question_key }}<span v-if="item.question_type"> · type: {{ item.question_type }}</span>
                </div>
              </div>

              <!-- Mapping -->
              <div class="flex items-center gap-2 shrink-0 min-w-[280px]">
                <select v-model="fmDraft[item.question_key]"
                  class="rounded border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent/40">
                  <option value="">— Auto ({{ targetLabel(item.auto_detected) || 'extra_fields' }}) —</option>
                  <optgroup v-for="grp in fmGrouped" :key="grp.group" :label="grp.group">
                    <option v-for="t in grp.items" :key="t.key" :value="t.key">{{ t.label }}</option>
                  </optgroup>
                </select>

                <button v-if="fmDraft[item.question_key]"
                  @click="resetMappingToAuto(item.question_key)"
                  class="text-[10px] text-ink-subtle hover:text-red-500" title="Voltar ao automático">
                  <i class="fas fa-rotate-left"></i>
                </button>
              </div>

              <!-- Preview do que vai acontecer -->
              <div class="md:col-span-2 text-[10px] flex items-center gap-1.5 pt-1 border-t border-line/40">
                <i class="fas fa-arrow-right text-ink-subtle"></i>
                <span class="text-ink-subtle">Vai pra:</span>
                <span class="font-mono px-1.5 py-0.5 rounded"
                  :class="effectiveMapping(item) === 'ignore'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-300'
                    : effectiveMapping(item) === 'extra'
                      ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'">
                  {{ targetLabel(effectiveMapping(item)) }}
                </span>
                <span v-if="!fmDraft[item.question_key] && item.auto_detected" class="text-[9px] text-ink-subtle italic">
                  · via auto-detect
                </span>
                <span v-else-if="!fmDraft[item.question_key]" class="text-[9px] text-ink-subtle italic">
                  · sem match no parser → vira extra_fields
                </span>
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <Button variant="primary" size="sm" icon="fas fa-save" :loading="fmSaving" @click="saveFieldMappings">
                Salvar mapeamentos
              </Button>
            </div>
          </div>
        </section>

        <!-- ── Gestão interna ────────────────────────────────────────────── -->
        <section v-show="activeSection === 'gestao'" class="space-y-3">
          <div class="rounded-lg border border-line/60 bg-surface-sunken/30 px-3 py-2.5 text-xs text-ink-subtle">
            <i class="fas fa-circle-info mr-1"></i>
            Vínculo CV (empreendimento, mídia, UTMs, extras) agora vive nas <b>campanhas</b>, não nos forms.
            Aqui só ficam metadados internos.
          </div>

          <div>
            <label class="text-sm font-medium text-ink block mb-1">Descrição interna</label>
            <textarea v-model="description" rows="3"
              placeholder="Notas pra equipe — ex: form do lançamento Wish, criado em 03/2026"
              class="w-full rounded border border-line bg-surface px-3 py-2 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40 resize-y" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-ink block mb-1">Prioridade</label>
              <select v-model="priority" class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent/40">
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium text-ink block mb-1">Referência da campanha</label>
              <input v-model="campaignRef" type="text" placeholder="LANC-WISH-OUT-2026"
                class="w-full rounded border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40 font-mono" />
            </div>
          </div>

          <div v-if="localError" class="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            <i class="fas fa-circle-exclamation mr-1.5"></i>{{ localError }}
          </div>

          <div class="flex justify-end">
            <Button variant="primary" size="sm" icon="fas fa-save" :loading="savingMeta" @click="saveGestao">Salvar</Button>
          </div>
        </section>

        <!-- ── Leads recentes ────────────────────────────────────────────── -->
        <section v-show="activeSection === 'leads'" class="space-y-2">
          <div class="flex justify-between items-center">
            <div class="text-[11px] text-ink-subtle">Últimos 20 — pra ver todos, exporte CSV.</div>
            <Button variant="ghost" size="sm" icon="fas fa-download" :loading="downloadingCsv" @click="exportCsv(null)">Exportar CSV</Button>
          </div>

          <div v-if="loadingLeads" class="text-center py-8 text-ink-subtle">
            <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando leads...
          </div>
          <div v-else-if="!recentLeads.length" class="text-center py-8 text-ink-subtle text-sm">
            <i class="fas fa-inbox text-2xl mb-2 block"></i>Nenhum lead chegou por esse form ainda.
          </div>
          <div v-else class="rounded-lg border border-line overflow-hidden">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-sunken/30 border-b border-line">
                <tr>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Quando</th>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Contato</th>
                  <th class="px-3 py-2 text-left  text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Mídia</th>
                  <th class="px-3 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">CV</th>
                  <th class="px-3 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-for="l in recentLeads" :key="l.id" class="hover:bg-surface-hover/40">
                  <td class="px-3 py-2 text-[11px] text-ink-subtle whitespace-nowrap">{{ fmtRelative(l.created_at) }}</td>
                  <td class="px-3 py-2">
                    <div class="text-ink text-xs">{{ l.nome || '(sem nome)' }}</div>
                    <div class="text-[10px] text-ink-subtle">{{ l.email || l.telefone || '' }}</div>
                  </td>
                  <td class="px-3 py-2 text-[11px] font-mono text-ink-muted">{{ l.midia_slug || '—' }}</td>
                  <td class="px-3 py-2 text-center">
                    <span v-if="l.cv_idlead" class="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-300">
                      <i class="fas fa-check-circle text-[9px]"></i>#{{ l.cv_idlead }}
                    </span>
                    <span v-else class="text-[10px] text-ink-subtle italic">sem match</span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span :class="['text-[11px] font-medium', statusColor(l.status)]">{{ l.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-line flex items-center justify-between gap-2 bg-surface-sunken/30 shrink-0">
        <div class="text-[10px] text-ink-subtle">
          Última sync: {{ form?.last_synced_at ? new Date(form.last_synced_at).toLocaleString('pt-BR') : '—' }}
        </div>
        <Button variant="secondary" size="sm" @click="close">Fechar</Button>
      </footer>
    </div>
  </div>
</template>
