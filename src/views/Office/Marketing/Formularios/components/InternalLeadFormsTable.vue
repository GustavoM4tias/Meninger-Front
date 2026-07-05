<script setup>
// Tabela dos formulários internos (LPs): KPIs, filtros, paginação e toggle
// ativo inline, tudo num card único seguindo o padrão do SalesTable.

import { computed, ref, watch } from 'vue';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import IconButton from '@/components/UI/IconButton.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const LP_HOST = 'https://lp.menin.com.br';

// Mesma cara dos fields do design system (fieldBase), na altura sm.
const ctlClass = [
  'h-8 rounded-md border border-line bg-surface-raised text-xs text-ink',
  'shadow-inner-soft outline-none transition-all duration-150',
  'focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20',
].join(' ');

const emit = defineEmits(['edit']);

const store = useLeadFormsStore();

// Período default: últimos 90 dias (limpar volta pra esse baseline; pra ver
// tudo, basta apagar as datas manualmente).
function localISO(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const DATE_TO_DEFAULT   = localISO(new Date());
const DATE_FROM_DEFAULT = localISO(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));

const search = ref('');
const filterActive   = ref('ALL');  // ALL | ACTIVE | INACTIVE
const filterPriority = ref('ALL');  // ALL | high | normal | low
const filterOrigem   = ref('ALL');  // ALL | SI | FB | IG | GO | MP | OU
const filterDateFrom = ref(DATE_FROM_DEFAULT); // start_date (ou created_at se sem start_date)
const filterDateTo   = ref(DATE_TO_DEFAULT);
const hideEnded      = ref(false);  // esconde forms com end_date no passado
const sortBy         = ref('created'); // created | last_lead | total | name

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

const statusOptions = computed(() => {
    const all = store.forms.length;
    const actives = store.forms.filter(f => f.active).length;
    return [
        { value: 'ALL',      label: 'Todos',    count: all },
        { value: 'ACTIVE',   label: 'Ativos',   count: actives },
        { value: 'INACTIVE', label: 'Inativos', count: all - actives },
    ];
});

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
    } else {
        // created — mais recentes primeiro (default)
        arr.sort((a, b) => {
            const da = a.created_at ? new Date(a.created_at).getTime() : 0;
            const db = b.created_at ? new Date(b.created_at).getTime() : 0;
            return db - da;
        });
    }
    return arr;
});

// ── Paginação ───────────────────────────────────────────────────────────────
const currentPage = ref(1);
const itemsPerPage = 25;

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / itemsPerPage)));
const startItem  = computed(() => (currentPage.value - 1) * itemsPerPage + 1);
const endItem    = computed(() => Math.min(currentPage.value * itemsPerPage, filtered.value.length));
const paginated  = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filtered.value.slice(start, start + itemsPerPage);
});
const visiblePages = computed(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages.value, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
});

watch([search, filterActive, filterPriority, filterOrigem, filterDateFrom, filterDateTo, hideEnded, sortBy],
    () => { currentPage.value = 1; });

const hasFilters = computed(() =>
    !!search.value.trim() || filterActive.value !== 'ALL' || filterPriority.value !== 'ALL'
    || filterOrigem.value !== 'ALL' || hideEnded.value
    || filterDateFrom.value !== DATE_FROM_DEFAULT || filterDateTo.value !== DATE_TO_DEFAULT);

function clearFilters() {
    search.value = '';
    filterActive.value = 'ALL';
    filterPriority.value = 'ALL';
    filterOrigem.value = 'ALL';
    filterDateFrom.value = DATE_FROM_DEFAULT;
    filterDateTo.value = DATE_TO_DEFAULT;
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
  <div class="space-y-4">

    <!-- Resumo -->
    <Surface variant="raised" padding="none" class="overflow-hidden">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-line/60">
        <div class="px-4 py-3">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-square-poll-vertical"></i>Forms exibidos
          </div>
          <div class="mt-1 text-xl font-semibold text-ink leading-none">{{ filtered.length }}</div>
          <div class="mt-1 text-[10px] text-ink-subtle">{{ summary.actives }} ativos</div>
        </div>
        <div class="px-4 py-3">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-users"></i>Leads totais
          </div>
          <div class="mt-1 text-xl font-semibold text-ink leading-none">{{ summary.total }}</div>
        </div>
        <div class="px-4 py-3">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-calendar-days"></i>Últimos 30 dias
          </div>
          <div class="mt-1 text-xl font-semibold text-ink leading-none">{{ summary.last_30d }}</div>
        </div>
        <div class="px-4 py-3">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-circle-check"></i>Entregues ao CV
          </div>
          <div class="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400 leading-none">{{ summary.delivered }}</div>
        </div>
        <div class="px-4 py-3">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-hourglass-half"></i>Em held
          </div>
          <div class="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-400 leading-none">{{ summary.held }}</div>
        </div>
      </div>
    </Surface>

    <!-- Erro -->
    <div v-if="store.error"
      class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
      <i class="fas fa-circle-exclamation mt-0.5"></i>
      <div>{{ store.error }}</div>
    </div>

    <!-- Card principal: toolbar + filtros + tabela + paginação -->
    <Surface variant="raised" padding="none" class="overflow-hidden">

      <!-- Toolbar -->
      <div class="p-3 sm:p-4 border-b border-line flex flex-col lg:flex-row lg:items-center gap-3">
        <div class="flex-1 min-w-0">
          <Input v-model="search" size="sm" icon-left="fas fa-magnifying-glass"
            placeholder="Buscar por nome, slug, mídia, ref, tag..." />
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <SegmentedControl v-model="filterActive" :options="statusOptions" size="sm" />
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loading" @click="store.fetchAll">
            Atualizar
          </Button>
        </div>
      </div>

      <!-- Filtros secundários -->
      <div class="px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/30 flex flex-wrap items-center gap-2">
        <select v-model="filterPriority" :class="[ctlClass, 'px-2.5 cursor-pointer']">
          <option value="ALL">Todas prioridades</option>
          <option value="high">Alta</option>
          <option value="normal">Normal</option>
          <option value="low">Baixa</option>
        </select>

        <select v-model="filterOrigem" :class="[ctlClass, 'px-2.5 cursor-pointer']">
          <option value="ALL">Todas origens CV</option>
          <option v-for="(label, v) in ORIGEM_LABELS" :key="v" :value="v">{{ label }}</option>
        </select>

        <div :class="[ctlClass, 'inline-flex items-center gap-1.5 px-2.5 text-ink-subtle']">
          <input v-model="filterDateFrom" type="date"
            class="bg-transparent text-xs text-ink outline-none w-[6.8rem] border-0 p-0 focus:ring-0 shadow-none" />
          <i class="fas fa-arrow-right-long text-[9px]"></i>
          <input v-model="filterDateTo" type="date"
            class="bg-transparent text-xs text-ink outline-none w-[6.8rem] border-0 p-0 focus:ring-0 shadow-none" />
        </div>

        <label :class="[ctlClass, 'inline-flex items-center gap-1.5 px-2.5 cursor-pointer select-none text-ink-muted hover:text-ink']">
          <input type="checkbox" v-model="hideEnded" class="h-3.5 w-3.5 rounded border-line accent-emerald-500" />
          Ocultar encerrados
        </label>

        <button v-if="hasFilters" @click="clearFilters"
          class="h-8 inline-flex items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-accent hover:bg-accent-soft transition-colors">
          <i class="fas fa-filter-circle-xmark text-[10px]"></i>Limpar
        </button>

        <div class="flex-1"></div>

        <select v-model="sortBy" :class="[ctlClass, 'px-2.5 cursor-pointer']" title="Ordenação">
          <option value="created">Mais recentes</option>
          <option value="last_lead">Último lead</option>
          <option value="total">Mais leads</option>
          <option value="name">Nome A-Z</option>
        </select>
      </div>

      <!-- Tabela -->
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-surface-sunken/30 border-b border-line">
            <tr>
              <th class="px-4 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Formulário</th>
              <th class="px-4 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Mídia</th>
              <th class="px-4 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Período</th>
              <th class="px-4 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreend.</th>
              <th class="px-4 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
              <th class="px-4 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Entrega</th>
              <th class="px-4 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último</th>
              <th class="px-4 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
              <th class="px-4 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line/60">
            <tr v-if="store.loading">
              <td colspan="9" class="px-4 py-12 text-center text-ink-subtle">
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
            <tr v-else v-for="f in paginated" :key="f.id"
              @click="openEdit(f)"
              class="group hover:bg-surface-sunken/40 cursor-pointer transition-colors">

              <!-- Form -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  <span :class="['inline-block w-2 h-2 rounded-full shrink-0', priorityDot(f.priority).cls]" :title="priorityDot(f.priority).title"></span>
                  <div class="min-w-0">
                    <div class="text-ink font-medium leading-tight truncate">{{ f.name }}</div>
                    <div class="text-[10px] font-mono text-ink-subtle truncate mt-0.5">
                      /{{ f.slug }}<span v-if="f.campaign_ref"> · {{ f.campaign_ref }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Mídia -->
              <td class="px-4 py-3">
                <div v-if="f.midia_slug" class="font-mono text-[11px] text-ink">{{ f.midia_slug }}</div>
                <div v-else class="text-[11px] text-ink-subtle italic">—</div>
                <div class="text-[10px] text-ink-subtle mt-0.5">{{ ORIGEM_LABELS[f.cv_origem] || f.cv_origem || '—' }}</div>
              </td>

              <!-- Período -->
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="text-[11px] text-ink-muted">
                  <span v-if="f.start_date">{{ fmtShortDate(f.start_date) }}</span>
                  <span v-else class="text-ink-subtle italic">desde criação</span>
                </div>
                <div class="text-[10px] mt-0.5" :class="endedAlready(f) ? 'text-red-500 font-medium' : 'text-ink-subtle'">
                  <template v-if="f.end_date">→ {{ fmtShortDate(f.end_date) }}<span v-if="endedAlready(f)"> (encerrado)</span></template>
                  <template v-else>sem fim</template>
                </div>
              </td>

              <!-- Empreendimentos -->
              <td class="px-4 py-3 text-center text-ink-muted">
                <span v-if="Array.isArray(f.bound_empreendimentos) && f.bound_empreendimentos.length"
                  class="text-xs">{{ f.bound_empreendimentos.length }}</span>
                <span v-else class="text-[11px] text-ink-subtle italic">—</span>
              </td>

              <!-- Leads count -->
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="text-sm font-semibold text-ink leading-tight">{{ f.stats?.total || 0 }}</div>
                <div class="text-[10px] text-ink-subtle leading-tight mt-0.5">
                  <span v-if="f.stats?.last_30d">+{{ f.stats.last_30d }} (30d)</span>
                  <span v-else>—</span>
                </div>
              </td>

              <!-- Entrega -->
              <td class="px-4 py-3 text-center">
                <template v-if="deliveryRate(f.stats) !== null">
                  <div class="inline-flex items-center gap-1.5">
                    <div class="w-12 h-1.5 rounded-full bg-surface-sunken border border-line/40 overflow-hidden">
                      <div class="h-full bg-emerald-500" :style="{ width: deliveryRate(f.stats) + '%' }"></div>
                    </div>
                    <span class="text-[10px] font-medium text-ink">{{ deliveryRate(f.stats) }}%</span>
                  </div>
                  <div v-if="f.stats.held" class="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{{ f.stats.held }} held</div>
                </template>
                <span v-else class="text-[11px] text-ink-subtle italic">—</span>
              </td>

              <!-- Último lead -->
              <td class="px-4 py-3 text-[11px] text-ink-muted whitespace-nowrap">
                {{ fmtRelative(f.stats?.last_lead_at) }}
              </td>

              <!-- Status toggle (inline) -->
              <td class="px-4 py-3 text-center">
                <button @click="quickToggle($event, f)"
                  :title="f.active ? 'Clique para desativar' : 'Clique para ativar'"
                  :class="['inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                    f.active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/20']">
                  <i :class="f.active ? 'fas fa-circle-check' : 'fas fa-circle-pause'" class="text-[10px]"></i>
                  {{ f.active ? 'Ativo' : 'Inativo' }}
                </button>
              </td>

              <!-- Ações rápidas (aparecem no hover) -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a :href="lpUrl(f)" target="_blank" rel="noopener" @click.stop
                    title="Abrir LP em nova aba"
                    class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-accent hover:bg-accent-soft transition-colors">
                    <i class="fas fa-arrow-up-right-from-square text-[11px]"></i>
                  </a>
                  <button @click="copyLpUrl($event, f)"
                    title="Copiar URL da LP"
                    class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-accent hover:bg-accent-soft transition-colors">
                    <i class="fas fa-copy text-[11px]"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <div v-if="totalPages > 1"
        class="px-4 py-3 border-t border-line bg-surface-sunken/30 flex flex-wrap items-center justify-between gap-2">
        <div class="text-xs text-ink-muted font-mono">
          {{ startItem }}–{{ endItem }} de {{ filtered.length }}
        </div>
        <div class="flex items-center gap-1">
          <IconButton icon="fas fa-angles-left" size="sm" label="Primeira"
            :disabled="currentPage === 1" @click="currentPage = 1" />
          <IconButton icon="fas fa-chevron-left" size="sm" label="Anterior"
            :disabled="currentPage === 1" @click="currentPage--" />
          <button v-for="page in visiblePages" :key="page" @click="currentPage = page"
            class="min-w-[32px] h-8 px-2 rounded-md text-xs font-mono transition-colors"
            :class="page === currentPage
              ? 'bg-accent text-white'
              : 'text-ink-muted hover:bg-surface-sunken'">
            {{ page }}
          </button>
          <IconButton icon="fas fa-chevron-right" size="sm" label="Próxima"
            :disabled="currentPage === totalPages" @click="currentPage++" />
          <IconButton icon="fas fa-angles-right" size="sm" label="Última"
            :disabled="currentPage === totalPages" @click="currentPage = totalPages" />
        </div>
      </div>
    </Surface>
  </div>
</template>
