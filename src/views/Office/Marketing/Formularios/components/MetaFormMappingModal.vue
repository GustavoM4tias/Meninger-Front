<script setup>
// Modal do Lead Form Meta - visão por form (não confunde com mapping de
// roteamento, que vive na campanha agora). Cartão flutuante sobre a página da
// campanha, nos primitivos do Office: KPIs em StatRow, seções num
// SegmentedControl, cada bloco num Panel, lista em DataTable.
//
// Seções:
//   1. Estrutura & Mapeamento - perguntas do form e pra qual campo CV vão
//   2. Gestão interna - descrição, prioridade, referência de campanha
//   3. Leads recentes - últimos 20 + CSV export
//
// Vínculo CV (empreendimento, mídia, UTMs, extras) MIGROU pra MetaCampaign.

import { ref, watch, computed } from 'vue';
import { useMetaFormsStore } from '@/stores/Marketing/Capture/metaFormsStore';
import Button from '@/components/UI/Button.vue';
import Modal from '@/components/UI/Modal.vue';
import Panel from '@/components/UI/Panel.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import IconButton from '@/components/UI/IconButton.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import { fieldBase, labelBase } from '@/components/UI/_classes.js';
import LeadStatusBadge from '@/views/Office/Marketing/Captacao/components/LeadStatusBadge.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

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
function fmtInt(v)   { return new Intl.NumberFormat('pt-BR').format(Number(v) || 0); }
function fmtRelative(iso) {
    if (!iso) return '-';
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

const statusBadge = computed(() => {
    const s = String(props.form?.status || '').toUpperCase();
    if (s === 'ACTIVE')   return { label: 'Ativo na Meta', variant: 'success' };
    if (s === 'ARCHIVED') return { label: 'Arquivado',     variant: 'warning' };
    if (s === 'DELETED')  return { label: 'Excluído',      variant: 'danger' };
    if (s === 'DRAFT')    return { label: 'Rascunho',      variant: 'neutral' };
    return { label: s || '-', variant: 'neutral' };
});

const stats = computed(() => props.form?.stats || { total: 0, last_30d: 0, delivered: 0, held: 0, spam: 0, failed: 0, last_lead_at: null });
const kpiCards = computed(() => {
    const s = stats.value;
    return [
        { key: 'total',     label: 'Leads (total)',   raw: Number(s.total) || 0,     format: fmtInt, icon: 'fas fa-users',          tone: 'accent' },
        { key: 'last_30d',  label: 'Últimos 30 dias', raw: Number(s.last_30d) || 0,  format: fmtInt, icon: 'fas fa-calendar-days',  tone: 'neutral' },
        { key: 'delivered', label: 'Entregues ao CV', raw: Number(s.delivered) || 0, format: fmtInt, icon: 'fas fa-circle-check',   tone: 'pos' },
        { key: 'held',      label: 'Represados',      raw: Number(s.held) || 0,      format: fmtInt, icon: 'fas fa-hourglass-half', tone: s.held ? 'warn' : 'neutral' },
        { key: 'last',      label: 'Último lead',     value: fmtRelative(s.last_lead_at), icon: 'fas fa-clock', tone: 'neutral' },
    ];
});

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Baixa' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Alta' },
];
const LEADS_COLUMNS = [
    { key: 'nome',       label: 'Contato', priority: 1, sortable: true, width: '34%' },
    { key: 'status',     label: 'Status',  priority: 1, sortable: true, width: '11rem' },
    { key: 'created_at', label: 'Quando',  priority: 2, sortable: true, width: '7rem' },
    { key: 'cv_idlead',  label: 'CV',      priority: 2, sortable: true, width: '8rem' },
    { key: 'midia_slug', label: 'Mídia',   priority: 3, sortable: true },
];

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

// O Select esconde "" como placeholder, então "auto" é um sentinela; o
// rascunho guarda '' (= usa auto), como o backend espera.
const AUTO = '__auto__';
const targetOptions = computed(() => fmGrouped.value.flatMap(g =>
    g.items.map(t => ({ value: t.key, label: `${g.group} · ${t.label}` }))));
function mappingOptions(item) {
    return [{ value: AUTO, label: `Auto (${targetLabel(item.auto_detected) || 'extra_fields'})` }, ...targetOptions.value];
}
function mappingSel(item) { return fmDraft.value[item.question_key] || AUTO; }
function setMapping(item, v) { fmDraft.value[item.question_key] = v === AUTO ? '' : v; }
function mappingVariant(item) {
    const eff = effectiveMapping(item);
    return eff === 'ignore' ? 'danger' : eff === 'extra' ? 'accent' : 'success';
}

function effectiveMapping(item) {
    const draft = fmDraft.value[item.question_key];
    return draft || item.auto_detected || 'extra';
}

function targetLabel(targetKey) {
    if (!targetKey) return '-';
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
        toast.error('Erro ao exportar: ' + e.message);
    } finally {
        downloadingCsv.value = false;
    }
}

const sections = [
    { value: 'estrutura', label: 'Mapeamento', icon: 'fas fa-list-check' },
    { value: 'gestao',    label: 'Gestão',     icon: 'fas fa-clipboard-list' },
    { value: 'leads',     label: 'Leads',      icon: 'fas fa-users' },
];
</script>
<template>
  <Modal :open="open" size="xl" :padded="false" @close="close">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="shrink-0 h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
          <i class="fab fa-meta"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">{{ form?.name || 'Formulário Meta' }}</h2>
          <p class="text-xs text-ink-muted mt-0.5 truncate">
            <span class="font-mono">#{{ form?.id }}</span>
            <span v-if="form?.page_name"> · {{ form.page_name }}</span>
            <span v-if="form?.locale"> · {{ form.locale }}</span>
            <span v-if="form?.created_time"> · criado {{ new Date(form.created_time).toLocaleDateString('pt-BR') }}</span>
          </p>
        </div>
        <Badge :variant="statusBadge.variant" size="sm" dot class="ml-auto shrink-0">{{ statusBadge.label }}</Badge>
      </div>
    </template>

    <div class="p-4 sm:p-5 space-y-4">
      <StatRow :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 5 }" size="sm" />

      <SegmentedControl v-model="activeSection" :options="sections" size="sm" />

      <!-- ── Estrutura & Mapeamento ──────────────────────────────────────── -->
      <template v-if="activeSection === 'estrutura'">
        <Panel title="Perguntas do form e campo CV" icon="fas fa-list-check" :padded="false"
          subtitle="Em branco o sistema usa a auto-detecção. extra_fields guarda em JSON; Ignorar não envia ao CV."
          :loading="fmLoading"
          :empty="!fmLoading && (!fmEditor || !fmEditor.items?.length)"
          empty-icon="fas fa-circle-info" empty-title="Sem perguntas no form ainda"
          empty-text="Sincronize os formulários na Central Meta (Captação, Sincronizar Meta).">
          <ul class="divide-y divide-line">
            <li v-for="item in fmEditor?.items || []" :key="item.question_key"
              class="px-4 py-3 grid grid-cols-1 md:grid-cols-[1fr,minmax(16rem,20rem)] gap-x-4 gap-y-2 items-start">
              <div class="min-w-0">
                <div class="text-sm font-medium text-ink leading-tight">{{ item.question_label }}</div>
                <div class="text-micro font-mono text-ink-subtle mt-0.5">
                  key: {{ item.question_key }}<span v-if="item.question_type"> · type: {{ item.question_type }}</span>
                </div>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-micro text-ink-subtle">
                  <i class="fas fa-arrow-right"></i>
                  <span>Vai para</span>
                  <Badge :variant="mappingVariant(item)" size="sm"><span class="font-mono">{{ targetLabel(effectiveMapping(item)) }}</span></Badge>
                  <span v-if="!fmDraft[item.question_key]">{{ item.auto_detected ? 'via auto-detecção' : 'sem match no parser: vira extra_fields' }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <Select :model-value="mappingSel(item)" @update:model-value="v => setMapping(item, v)"
                  :options="mappingOptions(item)" size="sm" placeholder="" />
                <IconButton v-if="fmDraft[item.question_key]" icon="fas fa-rotate-left" size="sm" label="Voltar ao automático"
                  @click="resetMappingToAuto(item.question_key)" />
              </div>
            </li>
          </ul>
          <template v-if="fmEditor?.items?.length" #footer>
            <div class="flex justify-end">
              <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="fmSaving" @click="saveFieldMappings">Salvar mapeamentos</Button>
            </div>
          </template>
        </Panel>
      </template>

      <!-- ── Gestão interna ──────────────────────────────────────────────── -->
      <template v-if="activeSection === 'gestao'">
        <Panel title="Gestão interna" icon="fas fa-clipboard-list"
          subtitle="Só no Office. O vínculo CV (empreendimento, mídia, UTMs) vive na campanha, não no form.">
          <div class="space-y-4">
            <div>
              <label :class="labelBase">Descrição interna</label>
              <textarea v-model="description" rows="3" placeholder="Notas para a equipe. Ex: form do lançamento Wish, criado em 03/2026"
                :class="[fieldBase, 'rounded-lg px-3 py-2 text-sm resize-y']" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select v-model="priority" label="Prioridade" :options="PRIORITY_OPTIONS" placeholder="" />
              <Input v-model="campaignRef" label="Referência da campanha" placeholder="LANC-WISH-OUT-2026" />
            </div>
            <p v-if="localError" class="text-xs text-data-neg flex items-center gap-1">
              <i class="fas fa-circle-exclamation"></i>{{ localError }}
            </p>
          </div>
          <template #footer>
            <div class="flex justify-end">
              <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="savingMeta" @click="saveGestao">Salvar</Button>
            </div>
          </template>
        </Panel>
      </template>

      <!-- ── Leads recentes ──────────────────────────────────────────────── -->
      <template v-if="activeSection === 'leads'">
        <Panel title="Leads recentes" icon="fas fa-users" :padded="false" subtitle="Os últimos 20. Para ver todos, exporte o CSV.">
          <template #actions>
            <Button variant="ghost" size="sm" icon="fas fa-download" :loading="downloadingCsv" @click="exportCsv(null)">Exportar CSV</Button>
          </template>
          <DataTable :columns="LEADS_COLUMNS" :rows="recentLeads" row-key="id" :loading="loadingLeads"
            sort-by="created_at" sort-dir="desc"
            empty-icon="fas fa-inbox" empty-title="Nenhum lead" empty-text="Nenhum lead chegou por esse form ainda.">
            <template #cell-nome="{ row }">
              <div class="text-ink">{{ row.nome || '(sem nome)' }}</div>
              <div class="text-micro text-ink-subtle truncate">{{ row.email || row.telefone || '' }}</div>
            </template>
            <template #cell-status="{ value }"><LeadStatusBadge :status="value" size="sm" /></template>
            <template #cell-created_at="{ value }"><span class="text-ink-muted">{{ fmtRelative(value) }}</span></template>
            <template #cell-cv_idlead="{ value }">
              <span v-if="value" class="font-mono text-data-pos"><i class="fas fa-check-circle text-micro mr-1"></i>#{{ value }}</span>
              <span v-else class="text-ink-subtle">sem match</span>
            </template>
            <template #cell-midia_slug="{ value }"><span class="font-mono text-ink-muted">{{ value || '-' }}</span></template>
          </DataTable>
        </Panel>
      </template>
    </div>

    <template #footer>
      <div class="flex-1 text-micro text-ink-subtle">
        Última sync: {{ form?.last_synced_at ? new Date(form.last_synced_at).toLocaleString('pt-BR') : '-' }}
      </div>
      <Button variant="secondary" size="sm" @click="close">Fechar</Button>
    </template>
  </Modal>
</template>
