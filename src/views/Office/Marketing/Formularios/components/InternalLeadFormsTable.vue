<script setup>
// Tabela dos formulários internos (LPs) com KPIs, filtros e toggle ativo inline.
// Filtros: busca, status (segmented), prioridade, origem CV, período, encerrados.

import { computed, ref } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const LP_HOST = 'https://lp.menin.com.br';

const emit = defineEmits(['edit']);

const store = useLeadFormsStore();

const search = ref('');
const filterActive   = ref('ALL');  // ALL | ACTIVE | INACTIVE
const filterPriority = ref('ALL');  // ALL | high | normal | low
const filterOrigem   = ref('ALL');  // ALL | SI | FB | IG | GO | MP | OU
const filterDateFrom = ref('');     // start_date (ou created_at se sem start_date)
const filterDateTo   = ref('');
const hideEnded      = ref(false);  // esconde forms com end_date no passado
const sortBy         = ref('last_lead'); // last_lead | total | name | created

const ORIGEM_LABELS = { SI: 'WebSite', FB: 'Facebook', IG: 'Instagram', GO: 'Google', MP: 'Mídia Paga', OU: 'Outros' };

function openEdit(f) { emit('edit', f); }

async function quickToggle(e, f) {
    e.stopPropagation();   // não abre o modal
    await store.toggleActive(f.id);
}

function lpUrl(f) { return `${LP_HOST}/${f.slug}`; }

async function copyLpUrl(e, f) {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(lpUrl(f)); window.alert('URL da LP copiada.'); }
    catch { window.alert('Não consegui copiar.'); }
}

function fmtDate(iso) {
    if (!iso) return null;
    try { return new Date(iso); } catch { return null; }
}
function inRange(iso) {
    const dt = fmtDate(iso);
    if (!dt) return false;
    if (filterDateFrom.value) {
        const from = new Date(filterDateFrom.value);
        if (dt < from) return false;
    }
    if (filterDateTo.value) {
        const to = new Date(filterDateTo.value);
        to.setHours(23, 59, 59, 999);
        if (dt > to) return false;
    }
    return true;
}

function endedAlready(f) {
    if (!f.end_date) return false;
    const end = new Date(f.end_date);
    end.setHours(23, 59, 59, 999);
    return Date.now() > end.getTime();
}

const statusCounts = computed(() => {
    const all = store.forms.length;
    const actives = store.forms.filter(f => f.active).length;
    return { all, actives, inactives: all - actives };
});

const statusOptions = computed(() => [
    { value: 'ALL',      label: 'Todos',    count: statusCounts.value.all },
    { value: 'ACTIVE',   label: 'Ativos',   count: statusCounts.value.actives },
    { value: 'INACTIVE', label: 'Inativos', count: statusCounts.value.inactives },
]);

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    let arr = store.forms.filter(f => {
        if (filterActive.value === 'ACTIVE'   && !f.active) return false;
        if (filterActive.value === 'INACTIVE' &&  f.active) return false;

        if (filterPriority.value !== 'ALL' && f.priority !== filterPriority.value) return false;
        if (filterOrigem.value !== 'ALL' && f.cv_origem !== filterOrigem.value) return false;
        if (hideEnded.value && endedAlready(f)) return false;

        if (filterDateFrom.value || filterDateTo.value) {
            const ref = f.start_date || f.created_at;
            if (!inRange(ref)) return false;
        }

        if (q) {
            const txt = [f.name, f.slug, f.midia_slug, f.campaign_ref, f.description,
                Array.isArray(f.tags) ? f.tags.join(' ') : '']
                .filter(Boolean).join(' ').toLowerCase();
            if (!txt.includes(q)) return false;
        }
        return true;
    });

    arr = [...arr];
    if (sortBy.value === 'last_lead') {
        arr.sort((a, b) => {
            const ta = a.stats?.last_lead_at ? new Date(a.stats.last_lead_at).getTime() : 0;
            const tb = b.stats?.last_lead_at ? new Date(b.stats.last_lead_at).getTime() : 0;
            return tb - ta;
        });
    } else if (sortBy.value === 'total') {
        arr.sort((a, b) => (b.stats?.total || 0) - (a.stats?.total || 0));
    } else if (sortBy.value === 'name') {
        arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else if (sortBy.value === 'created') {
        arr.sort((a, b) => {
            const ta = a.start_date || a.created_at;
            const tb = b.start_date || b.created_at;
            const da = ta ? new Date(ta).getTime() : 0;
            const db = tb ? new Date(tb).getTime() : 0;
            return db - da;
        });
    }
    return arr;
});

const hasFilters = computed(() =>
    !!search.value.trim() || filterActive.value !== 'ALL' || filterPriority.value !== 'ALL'
    || filterOrigem.value !== 'ALL' || !!filterDateFrom.value || !!filterDateTo.value || hideEnded.value);

function clearFilters() {
    search.value = '';
    filterActive.value = 'ALL';
    filterPriority.value = 'ALL';
    filterOrigem.value = 'ALL';
    filterDateFrom.value = '';
    filterDateTo.value = '';
    hideEnded.value = false;
}

const summary = computed(() => {
    const acc = { total: 0, last_30d: 0, delivered: 0, held: 0, actives: 0 };
    for (const f of filtered.value) {
        acc.total    += f.stats?.total    || 0;
        acc.last_30d += f.stats?.last_30d || 0;
        acc.delivered+= f.stats?.delivered|| 0;
        acc.held     += f.stats?.held     || 0;
        if (f.active) acc.actives += 1;
    }
    return acc;
});

const KPIS = [
    { key: 'forms',     label: 'Forms exibidos',  icon: 'fas fa-square-poll-vertical', tone: 'text-accent bg-accent/10' },
    { key: 'total',     label: 'Leads totais',    icon: 'fas fa-users',                tone: 'text-ink bg-surface-sunken' },
    { key: 'last_30d',  label: 'Últimos 30 dias', icon: 'fas fa-calendar-days',        tone: 'text-blue-600 dark:text-blue-300 bg-blue-500/10' },
    { key: 'delivered', label: 'Entregues ao CV', icon: 'fas fa-circle-check',         tone: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10' },
    { key: 'held',      label: 'Em held',         icon: 'fas fa-hourglass-half',       tone: 'text-amber-600 dark:text-amber-300 bg-amber-500/10' },
];

function kpiValue(key) {
    if (key === 'forms') return filtered.value.length;
    return summary.value[key];
}

function priorityDot(p) {
    if (p === 'high')   return { cls: 'bg-red-500',     title: 'Prioridade alta' };
    if (p === 'low')    return { cls: 'bg-slate-400',   title: 'Prioridade baixa' };
    return { cls: 'bg-emerald-500', title: 'Prioridade normal' };
}

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
    if (d < 30)     return `${Math.floor(d / 7)}sem`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function deliveryRate(stats) {
    if (!stats?.total) return null;
    return Math.round(((stats.delivered || 0) / stats.total) * 100);
}

function fmtShortDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    catch { return '—'; }
}
</script>

<template>
  <div class="space-y-3">

    <!-- Resumo -->
    <Surface variant="raised" padding="sm">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div v-for="k in KPIS" :key="k.key" class="flex items-center gap-2.5 min-w-0">
          <div :class="['h-9 w-9 rounded-lg grid place-items-center shrink-0', k.tone]">
            <i :class="k.icon" class="text-sm"></i>
          </div>
          <div class="min-w-0">
            <div class="text-lg font-semibold text-ink leading-tight">{{ kpiValue(k.key) }}</div>
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle truncate">
              {{ k.label }}<span v-if="k.key === 'forms'" class="normal-case tracking-normal"> · {{ summary.actives }} ativos</span>
            </div>
          </div>
        </div>
      </div>
    </Surface>

    <!-- Filtros -->
    <Surface variant="raised" padding="sm" class="space-y-2.5">
      <div class="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div class="flex-1 min-w-0">
          <Input v-model="search" size="sm" icon-left="fas fa-magnifying-glass"
            placeholder="Buscar por nome, slug, mídia, ref, tag..." />
        </div>
        <SegmentedControl v-model="filterActive" :options="statusOptions" size="sm" />
        <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loading" @click="store.fetchAll">
          Atualizar
        </Button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select v-model="filterPriority"
          class="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent/40">
          <option value="ALL">Todas prioridades</option>
          <option value="high">Alta</option>
          <option value="normal">Normal</option>
          <option value="low">Baixa</option>
        </select>

        <select v-model="filterOrigem"
          class="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent/40">
          <option value="ALL">Todas origens CV</option>
          <option v-for="(label, v) in ORIGEM_LABELS" :key="v" :value="v">{{ label }} ({{ v }})</option>
        </select>

        <div class="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink-subtle">
          <i class="fas fa-calendar text-[10px]"></i>
          <input v-model="filterDateFrom" type="date"
            class="bg-transparent text-xs text-ink focus:outline-none w-[7.5rem]" />
          <span>→</span>
          <input v-model="filterDateTo" type="date"
            class="bg-transparent text-xs text-ink focus:outline-none w-[7.5rem]" />
        </div>

        <label class="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-muted cursor-pointer select-none hover:text-ink transition-colors">
          <input type="checkbox" v-model="hideEnded" class="h-3.5 w-3.5 rounded border-line accent-emerald-500" />
          Ocultar encerrados
        </label>

        <div class="flex-1"></div>

        <button v-if="hasFilters" @click="clearFilters"
          class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors">
          <i class="fas fa-filter-circle-xmark text-[10px]"></i>Limpar filtros
        </button>

        <div class="flex items-center gap-1.5 text-xs text-ink-subtle">
          <i class="fas fa-arrow-down-wide-short text-[10px]"></i>
          <select v-model="sortBy"
            class="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent/40">
            <option value="last_lead">Último lead</option>
            <option value="total">Mais leads</option>
            <option value="name">Nome A-Z</option>
            <option value="created">Mais novos</option>
          </select>
        </div>
      </div>
    </Surface>

    <!-- Erro -->
    <div v-if="store.error"
      class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
      <i class="fas fa-circle-exclamation mt-0.5"></i>
      <div>{{ store.error }}</div>
    </div>

    <!-- Tabela -->
    <Surface variant="raised" padding="none" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-surface-sunken/30 border-b border-line">
            <tr>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Formulário</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Mídia</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Período</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreend.</th>
              <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Entrega</th>
              <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último</th>
              <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
              <th class="px-3 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line/60">
            <tr v-if="store.loading">
              <td colspan="9" class="px-4 py-10 text-center text-ink-subtle">
                <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
              </td>
            </tr>
            <tr v-else-if="!store.forms.length">
              <td colspan="9">
                <EmptyState icon="fas fa-square-poll-vertical" title="Nenhum formulário ainda"
                  description='Crie o primeiro clicando em "Novo formulário".' />
              </td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="9">
                <EmptyState icon="fas fa-filter" size="sm" title="Nada corresponde aos filtros"
                  description="Ajuste a busca ou limpe os filtros pra ver todos os formulários." />
              </td>
            </tr>
            <tr v-else v-for="f in filtered" :key="f.id"
              @click="openEdit(f)"
              class="group hover:bg-surface-hover/40 cursor-pointer transition-colors">

              <!-- Form -->
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <span :class="['inline-block w-2 h-2 rounded-full shrink-0', priorityDot(f.priority).cls]" :title="priorityDot(f.priority).title"></span>
                  <div class="min-w-0">
                    <div class="text-ink font-medium leading-tight truncate">{{ f.name }}</div>
                    <div class="text-[10px] font-mono text-ink-subtle truncate">
                      /{{ f.slug }}<span v-if="f.campaign_ref"> · {{ f.campaign_ref }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Mídia -->
              <td class="px-3 py-2.5">
                <div v-if="f.midia_slug" class="font-mono text-[11px] text-ink">{{ f.midia_slug }}</div>
                <div v-else class="text-[11px] text-ink-subtle italic">—</div>
                <div class="text-[10px] text-ink-subtle">{{ ORIGEM_LABELS[f.cv_origem] || f.cv_origem || '—' }}</div>
              </td>

              <!-- Período -->
              <td class="px-3 py-2.5">
                <div class="text-[11px] text-ink-muted">
                  <span v-if="f.start_date">{{ fmtShortDate(f.start_date) }}</span>
                  <span v-else class="text-ink-subtle italic">desde criação</span>
                </div>
                <div class="text-[10px]" :class="endedAlready(f) ? 'text-red-500 font-medium' : 'text-ink-subtle'">
                  <template v-if="f.end_date">→ {{ fmtShortDate(f.end_date) }}<span v-if="endedAlready(f)"> (encerrado)</span></template>
                  <template v-else>sem fim</template>
                </div>
              </td>

              <!-- Empreendimentos -->
              <td class="px-3 py-2.5 text-center text-ink-muted">
                <span v-if="Array.isArray(f.bound_empreendimentos) && f.bound_empreendimentos.length"
                  class="text-xs">{{ f.bound_empreendimentos.length }}</span>
                <span v-else class="text-[11px] text-ink-subtle italic">—</span>
              </td>

              <!-- Leads count -->
              <td class="px-3 py-2.5 text-right whitespace-nowrap">
                <div class="text-sm font-semibold text-ink leading-tight">{{ f.stats?.total || 0 }}</div>
                <div class="text-[10px] text-ink-subtle leading-tight">
                  <span v-if="f.stats?.last_30d">+{{ f.stats.last_30d }} (30d)</span>
                  <span v-else>—</span>
                </div>
              </td>

              <!-- Entrega -->
              <td class="px-3 py-2.5 text-center">
                <template v-if="deliveryRate(f.stats) !== null">
                  <div class="inline-flex items-center gap-1.5">
                    <div class="w-12 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                      <div class="h-full bg-emerald-500" :style="{ width: deliveryRate(f.stats) + '%' }"></div>
                    </div>
                    <span class="text-[10px] font-medium text-ink">{{ deliveryRate(f.stats) }}%</span>
                  </div>
                  <div v-if="f.stats.held" class="text-[10px] text-amber-600 dark:text-amber-300">{{ f.stats.held }} held</div>
                </template>
                <span v-else class="text-[11px] text-ink-subtle italic">—</span>
              </td>

              <!-- Último lead -->
              <td class="px-3 py-2.5 text-[11px] text-ink-muted whitespace-nowrap">
                {{ fmtRelative(f.stats?.last_lead_at) }}
              </td>

              <!-- Status toggle (inline) -->
              <td class="px-3 py-2.5 text-center">
                <button @click="quickToggle($event, f)"
                  :title="f.active ? 'Clique para desativar' : 'Clique para ativar'"
                  :class="['inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                    f.active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20']">
                  <i :class="f.active ? 'fas fa-circle-check' : 'fas fa-circle-pause'" class="text-[10px]"></i>
                  {{ f.active ? 'Ativo' : 'Inativo' }}
                </button>
              </td>

              <!-- Ações rápidas (aparecem no hover) -->
              <td class="px-3 py-2.5">
                <div class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a :href="lpUrl(f)" target="_blank" rel="noopener" @click.stop
                    title="Abrir LP em nova aba"
                    class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-accent hover:bg-accent/10 transition-colors">
                    <i class="fas fa-arrow-up-right-from-square text-[11px]"></i>
                  </a>
                  <button @click="copyLpUrl($event, f)"
                    title="Copiar URL da LP"
                    class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-accent hover:bg-accent/10 transition-colors">
                    <i class="fas fa-copy text-[11px]"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Surface>
  </div>
</template>
