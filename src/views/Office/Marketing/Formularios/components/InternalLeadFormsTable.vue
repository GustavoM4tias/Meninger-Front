<script setup>
// Formulários internos (LPs) no padrão de tela do Office: resumo em StatRow,
// filtros no FilterBar (fechado por padrão, filtra ao digitar), lista em
// DataTable dentro de um Panel (ordena pelo cabeçalho, vira cartão no celular).

import { computed, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useLeadFormsStore } from '@/stores/Marketing/Capture/leadFormsStore';
import StatRow from '@/components/UI/StatRow.vue';
import Panel from '@/components/UI/Panel.vue';
import DataTable from '@/components/UI/DataTable.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import IconButton from '@/components/UI/IconButton.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const LP_HOST = 'https://lp.menin.com.br';

const emit = defineEmits(['edit']);

const store = useLeadFormsStore();
const toast = useToast();

// As contagens de leads (colunas/resumo) são recortadas pelo período mestre da
// store (store.periodo, default mês atual - sem picker na tela). O filtro de
// datas abaixo é OUTRA coisa: filtra quais FORMULÁRIOS aparecem (pela data de
// início/criação) - por isso começa vazio (mostra todos).
const ALL = '__all__';   // o Select esconde "" como placeholder, então "todos" é um sentinela
const search = ref('');
const filterActive   = ref('ALL');  // ALL | ACTIVE | INACTIVE
const filterPriority = ref(ALL);    // ALL | high | normal | low
const filterOrigem   = ref(ALL);    // ALL | SI | FB | IG | GO | MP | OU
const filterDateFrom = ref('');     // start_date (ou created_at se sem start_date)
const filterDateTo   = ref('');
const hideEnded      = ref(false);  // esconde forms com end_date no passado

const ORIGEM_LABELS = { SI: 'WebSite', FB: 'Facebook', IG: 'Instagram', GO: 'Google', MP: 'Mídia Paga', OU: 'Outros' };
const priorityOptions = [
    { value: ALL, label: 'Todas prioridades' },
    { value: 'high', label: 'Alta' }, { value: 'normal', label: 'Normal' }, { value: 'low', label: 'Baixa' },
];
const origemOptions = [
    { value: ALL, label: 'Todas origens CV' },
    ...Object.entries(ORIGEM_LABELS).map(([value, label]) => ({ value, label })),
];

function openEdit(f) { emit('edit', f); }

async function quickToggle(f) { await store.toggleActive(f.id); }

function lpUrl(f) { return `${LP_HOST}/${f.slug}`; }

async function copyLpUrl(f) {
    try { await navigator.clipboard.writeText(lpUrl(f)); toast.success('URL da LP copiada.'); }
    catch { toast.error('Não consegui copiar.'); }
}

function inRange(iso) {
    if (!iso) return false;
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return false;
    if (filterDateFrom.value && dt < new Date(filterDateFrom.value)) return false;
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
    return store.forms.filter(f => {
        if (filterActive.value === 'ACTIVE'   && !f.active) return false;
        if (filterActive.value === 'INACTIVE' &&  f.active) return false;
        if (filterPriority.value !== ALL && f.priority !== filterPriority.value) return false;
        if (filterOrigem.value !== ALL && f.cv_origem !== filterOrigem.value) return false;
        if (hideEnded.value && endedAlready(f)) return false;
        if ((filterDateFrom.value || filterDateTo.value) && !inRange(f.start_date || f.created_at)) return false;
        if (q) {
            const txt = [f.name, f.slug, f.midia_slug, f.campaign_ref, f.description,
                Array.isArray(f.tags) ? f.tags.join(' ') : '']
                .filter(Boolean).join(' ').toLowerCase();
            if (!txt.includes(q)) return false;
        }
        return true;
    });
});

// Selo "N ativos" da barra (o status no SegmentedControl fica fora da conta).
const activeFiltersCount = computed(() =>
    [search.value.trim(), filterPriority.value !== ALL, filterOrigem.value !== ALL,
        filterDateFrom.value, filterDateTo.value, hideEnded.value].filter(Boolean).length);

function clearFilters() {
    search.value = '';
    filterPriority.value = ALL;
    filterOrigem.value = ALL;
    filterDateFrom.value = '';
    filterDateTo.value = '';
    hideEnded.value = false;
}

const summary = computed(() => {
    const acc = { total: 0, delivered: 0, held: 0, failed: 0, actives: 0 };
    for (const f of filtered.value) {
        acc.total    += f.stats?.total    || 0;
        acc.delivered+= f.stats?.delivered|| 0;
        acc.held     += f.stats?.held     || 0;
        acc.failed   += f.stats?.failed   || 0;
        if (f.active) acc.actives += 1;
    }
    return acc;
});

const intFmt = new Intl.NumberFormat('pt-BR');
const kpiCards = computed(() => {
    const s = summary.value;
    return [
        { key: 'forms',     label: 'Forms exibidos',   raw: filtered.value.length, format: v => intFmt.format(v), icon: 'fas fa-square-poll-vertical', tone: 'accent', hint: `${s.actives} ativo(s)` },
        { key: 'total',     label: 'Leads no período', raw: s.total,     format: v => intFmt.format(v), icon: 'fas fa-users',              tone: 'neutral' },
        { key: 'delivered', label: 'Entregues ao CV',  raw: s.delivered, format: v => intFmt.format(v), icon: 'fas fa-circle-check',       tone: 'pos' },
        { key: 'held',      label: 'Represados',       raw: s.held,      format: v => intFmt.format(v), icon: 'fas fa-hourglass-half',     tone: s.held ? 'warn' : 'neutral' },
        { key: 'failed',    label: 'Com erro',         raw: s.failed,    format: v => intFmt.format(v), icon: 'fas fa-circle-exclamation', tone: s.failed ? 'neg' : 'neutral', hint: s.failed ? 'falha/recusa no CV' : '' },
    ];
});

function priorityDot(p) {
    if (p === 'high')   return { cls: 'bg-data-neg',   title: 'Prioridade alta' };
    if (p === 'low')    return { cls: 'bg-ink-subtle', title: 'Prioridade baixa' };
    return { cls: 'bg-data-pos', title: 'Prioridade normal' };
}

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
    if (d < 30)     return `${Math.floor(d / 7)}sem`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtShortDate(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    catch { return '-'; }
}

// Colunas (DataTable): prioridade decide a ordem no celular. As linhas chegam
// achatadas para a ordenação do cabeçalho funcionar (stats.total vira `total`).
const COLUMNS = [
    { key: 'name',         label: 'Formulário', priority: 1, sortable: true, width: '30%' },
    { key: 'total',        label: 'Leads',      priority: 1, sortable: true, numeric: true, width: '6rem' },
    { key: 'active',       label: 'Status',     priority: 1, sortable: true, width: '7rem' },
    { key: 'midia_slug',   label: 'Mídia',      priority: 2, sortable: true },
    { key: 'delivery',     label: 'Entrega',    priority: 2, sortable: true, numeric: true, width: '9rem' },
    { key: 'last_lead_at', label: 'Último lead',priority: 2, sortable: true, width: '7rem' },
    { key: 'periodo',      label: 'Período',    priority: 3 },
    { key: 'emps',         label: 'Empreend.',  priority: 3, numeric: true, width: '6rem' },
    { key: 'created_at',   label: 'Criado',     priority: 3, sortable: true, width: '6rem', format: fmtShortDate },
];
const rows = computed(() => filtered.value.map(f => ({
    ...f,
    total: f.stats?.total || 0,
    delivery: f.stats?.total ? Math.round(((f.stats.delivered || 0) / f.stats.total) * 100) : null,
    last_lead_at: f.stats?.last_lead_at || null,
    emps: Array.isArray(f.bound_empreendimentos) ? f.bound_empreendimentos.length : 0,
    periodo: f.start_date || f.end_date ? `${f.start_date ? fmtShortDate(f.start_date) : 'criação'} a ${f.end_date ? fmtShortDate(f.end_date) : 'sem fim'}` : 'sem fim',
    ended: endedAlready(f),
})));
</script>

<template>
  <div class="space-y-4">

    <StatRow :items="kpiCards" :loading="store.loading && !store.forms.length" :cols="{ sm: 3, md: 5, lg: 5 }" size="sm" />

    <EmptyState v-if="store.error" icon="fas fa-circle-exclamation" size="sm"
      title="Não deu para carregar os formulários" :description="store.error" />

    <FilterBar :active-count="activeFiltersCount" auto-apply>
      <template #actions>
        <SegmentedControl v-model="filterActive" :options="statusOptions" size="sm" />
        <IconButton icon="fas fa-eraser" size="sm" label="Limpar filtros" :disabled="!activeFiltersCount" @click="clearFilters" />
        <IconButton icon="fas fa-arrows-rotate" size="sm" label="Atualizar" :disabled="store.loading" @click="store.fetchAll" />
      </template>

      <Input v-model="search" label="Buscar" size="sm" icon-left="fas fa-magnifying-glass"
        placeholder="Nome, slug, mídia, referência, tag..." class="sm:col-span-2" />
      <Select v-model="filterPriority" label="Prioridade" :options="priorityOptions" size="sm" placeholder="" />
      <Select v-model="filterOrigem" label="Origem CV" :options="origemOptions" size="sm" placeholder="" />
      <Input v-model="filterDateFrom" type="date" label="Formulário iniciado de" size="sm"
        hint="Filtra pela data de início/criação do formulário. O recorte dos leads é o período da Central." />
      <Input v-model="filterDateTo" type="date" label="até" size="sm" />
      <div class="sm:col-span-2 flex items-end pb-1">
        <Switch v-model="hideEnded" size="sm" label="Ocultar encerrados" description="Esconde formulários com data de encerramento no passado." />
      </div>
    </FilterBar>

    <Panel title="Formulários internos" icon="fas fa-square-poll-vertical" :padded="false"
      :subtitle="`${filtered.length} de ${store.forms.length} · leads contados no período da Central`">
      <DataTable :columns="COLUMNS" :rows="rows" row-key="id" :loading="store.loading && !store.forms.length"
        sort-by="created_at" sort-dir="desc" clickable @row-click="openEdit"
        :empty-icon="store.forms.length ? 'fas fa-filter' : 'fas fa-square-poll-vertical'"
        :empty-title="store.forms.length ? 'Nada corresponde aos filtros' : 'Nenhum formulário ainda'"
        :empty-text="store.forms.length ? 'Ajuste a busca ou limpe os filtros para ver todos.' : 'Crie o primeiro em Novo formulário.'">

        <template #cell-name="{ row }">
          <div class="flex items-center gap-2.5 min-w-0">
            <span :class="['inline-block w-2 h-2 rounded-full shrink-0', priorityDot(row.priority).cls]" :title="priorityDot(row.priority).title"></span>
            <div class="min-w-0">
              <div class="text-ink font-medium leading-tight truncate">{{ row.name }}</div>
              <div class="text-micro font-mono text-ink-subtle truncate mt-0.5">
                /{{ row.slug }}<span v-if="row.campaign_ref"> · {{ row.campaign_ref }}</span>
              </div>
            </div>
          </div>
        </template>

        <template #cell-total="{ row }">
          <div class="font-semibold text-ink tabular-nums" title="Leads captados no período da Central">{{ row.total }}</div>
          <div v-if="row.stats?.failed" class="text-micro text-data-neg font-medium">{{ row.stats.failed }} com erro</div>
        </template>

        <!-- Liga/desliga ali mesmo, sem abrir o formulário -->
        <template #cell-active="{ row }">
          <div class="inline-flex items-center gap-2" @click.stop>
            <Switch :model-value="!!row.active" size="sm" @update:model-value="quickToggle(row)" />
            <span class="text-micro" :class="row.active ? 'text-data-pos' : 'text-ink-subtle'">{{ row.active ? 'Ativo' : 'Inativo' }}</span>
          </div>
        </template>

        <template #cell-midia_slug="{ row }">
          <div class="font-mono text-micro" :class="row.midia_slug ? 'text-ink' : 'text-ink-subtle'">{{ row.midia_slug || '-' }}</div>
          <div class="text-micro text-ink-subtle">{{ ORIGEM_LABELS[row.cv_origem] || row.cv_origem || '-' }}</div>
        </template>

        <template #cell-delivery="{ row }">
          <template v-if="row.delivery !== null">
            <div class="inline-flex items-center gap-1.5 justify-end">
              <div class="w-12 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                <div class="h-full bg-data-pos" :style="{ width: row.delivery + '%' }"></div>
              </div>
              <span class="text-micro font-medium text-ink tabular-nums">{{ row.delivery }}%</span>
            </div>
            <div v-if="row.stats?.held" class="text-micro text-data-warn">{{ row.stats.held }} represado(s)</div>
          </template>
          <span v-else class="text-ink-subtle">-</span>
        </template>

        <template #cell-last_lead_at="{ value }"><span class="text-ink-muted">{{ fmtRelative(value) }}</span></template>

        <template #cell-periodo="{ row }">
          <span class="text-ink-muted">{{ row.periodo }}</span>
          <Badge v-if="row.ended" variant="danger" size="sm" class="ml-1.5">encerrado</Badge>
        </template>

        <template #cell-emps="{ value }"><span :class="value ? 'text-ink' : 'text-ink-subtle'">{{ value || '-' }}</span></template>

        <template #actions="{ row }">
          <div class="inline-flex items-center gap-0.5">
            <a :href="lpUrl(row)" target="_blank" rel="noopener" @click.stop title="Abrir LP em nova aba"
              class="h-8 w-8 grid place-items-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors focus-ring">
              <i class="fas fa-arrow-up-right-from-square text-xs"></i>
            </a>
            <IconButton icon="fas fa-copy" size="sm" label="Copiar URL da LP" @click="copyLpUrl(row)" />
            <IconButton icon="fas fa-pen" size="sm" label="Editar" @click="openEdit(row)" />
          </div>
        </template>
      </DataTable>
    </Panel>
  </div>
</template>
