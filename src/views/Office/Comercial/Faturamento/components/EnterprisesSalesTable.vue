<script setup>
import { ref, computed, watchEffect } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import EnterpriseDetailModal from './EnterpriseDetailModal.vue';
import Export from '@/components/config/Export.vue';

import IconButton from '@/components/UI/IconButton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({ data: { type: Array, required: true } });
const emit = defineEmits(['open-land-sync', 'selection-metrics']);

const contractsStore = useContractsStore();
const sortBy = ref('value-desc');
const open = ref(false);

const selectedKeys = ref(new Set());

const showModal = ref(false);
const modalSales = ref([]);
const modalTitle = ref('');
const initialMode = ref('list');
const modalEnterprise = ref({ name: '' });

const valueModeLabel = computed(() => contractsStore.valueModeLabel);

const isAdmin = computed(() => {
  try { return localStorage.getItem('role') === 'admin'; } catch { return false; }
});

const valueModeOptions = [
  { value: 'net', label: 'VGV' },
  { value: 'gross', label: 'VGV+DC' },
];

const groupByOptions = [
  { value: 'enterprise', label: 'Empreendimento', icon: 'fas fa-building' },
  { value: 'company', label: 'Empresa', icon: 'fas fa-city' },
];

const viewOptions = [
  { value: 'list', label: 'Listagem', icon: 'fas fa-list' },
  { value: 'pie', label: 'Pizza', icon: 'fas fa-chart-pie' },
  { value: 'bar', label: 'Colunas', icon: 'fas fa-chart-column' },
];

const sortOptions = [
  { value: 'value-desc', label: 'Valor ↓' },
  { value: 'value', label: 'Valor ↑' },
  { value: 'count-desc', label: 'Vendas ↓' },
  { value: 'count', label: 'Vendas ↑' },
];

const colors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
];

const getColor = (i) => colors[i % colors.length];

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);

const appendedValue = (e) => {
  if (e.onlyProjectionRow) return 0;
  return contractsStore.valueMode === 'net' ? (e.proj_value_net || 0) : (e.proj_value_gross || 0);
};

const totalCombined = (e) => baseValue(e) + appendedValue(e);

/* ===================== DISTRATO ===================== */
const norm = (v) => String(v ?? '').trim().toLowerCase();

const repasseStatusOfSale = (sale) => {
  const first = sale?.contracts?.[0] || {};
  const r = first?.repasse?.[0];
  if (r) {
    const sr = (r.status_repasse ?? r.statusRepasse ?? '').toString().trim();
    if (sr) return sr;
  }
  const res = first?.reserva;
  if (res) {
    const srr = (res.status_repasse ?? res.statusRepasse ?? '').toString().trim();
    if (srr) return srr;
  }
  return null;
};

const saleIsDistrato = (sale) => norm(repasseStatusOfSale(sale)) === 'distrato';

const distratoMetaForRow = (row) => {
  const snapshot = Array.isArray(contractsStore.uniqueSales) ? contractsStore.uniqueSales : [];
  const sales = salesForRowFrom(snapshot, row);

  let count = 0;
  let value = 0;

  for (const s of sales) {
    if (!saleIsDistrato(s)) continue;
    if (row.onlyProjectionRow) continue;
    count += 1;
    value += Number(contractsStore.valuePicker(s) || 0);
  }
  return { count, value };
};

const distratoCount = (row) => distratoMetaForRow(row).count;
const distratoValue = (row) => distratoMetaForRow(row).value;

const baseValue = (e) => {
  if (e.onlyProjectionRow) {
    return contractsStore.isNet ? Number(e.total_value_net || 0) : Number(e.total_value_gross || 0);
  }
  const base = Number(contractsStore.valuePicker(e) || 0);
  const dv = Number(distratoValue(e) || 0);
  return (Number.isFinite(base) ? base : 0) - (Number.isFinite(dv) ? dv : 0);
};

const ticketMedio = (e) => {
  const denom = (e.count || 0) - distratoCount(e);
  const safeDenom = denom > 0 ? denom : 1;
  return baseValue(e) / safeDenom;
};

/* ===================== SORT ===================== */
const sortedData = computed(() => {
  const data = [...props.data];
  switch (sortBy.value) {
    case 'count':
      return data.sort(
        (a, b) =>
          ((a.count - distratoCount(a)) + (a.onlyProjectionRow ? 0 : a.proj_count)) -
          ((b.count - distratoCount(b)) + (b.onlyProjectionRow ? 0 : b.proj_count))
      );
    case 'count-desc':
      return data.sort(
        (a, b) =>
          ((b.count - distratoCount(b)) + (b.onlyProjectionRow ? 0 : b.proj_count)) -
          ((a.count - distratoCount(a)) + (a.onlyProjectionRow ? 0 : a.proj_count))
      );
    case 'value':
      return data.sort((a, b) => totalCombined(a) - totalCombined(b));
    case 'value-desc':
    default:
      return data.sort((a, b) => totalCombined(b) - totalCombined(a));
  }
});

const totalCount = computed(() =>
  sortedData.value.reduce((s, e) => s + (e.count || 0) - distratoCount(e), 0)
);
const totalValueAll = computed(() =>
  sortedData.value.reduce((s, e) => s + totalCombined(e), 0)
);

/* ===================== seleção ===================== */
const visibleKeys = computed(() => sortedData.value.map((e) => e.key));
const allVisibleChecked = computed(
  () => visibleKeys.value.every((k) => selectedKeys.value.has(k)) && visibleKeys.value.length > 0
);
const disabledOpen = computed(() => props.data.length === 0);

const toggleAllVisible = (evt) => {
  const next = new Set(selectedKeys.value);
  if (evt.target.checked) visibleKeys.value.forEach((k) => next.add(k));
  else visibleKeys.value.forEach((k) => next.delete(k));
  selectedKeys.value = next;
};

const toggleOne = (key, evt) => {
  const next = new Set(selectedKeys.value);
  evt.target.checked ? next.add(key) : next.delete(key);
  selectedKeys.value = next;
};

/* ===================== FILTRO POR ROW ===================== */
const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const salesForRowFrom = (sales, row) => {
  const byCompany = contractsStore.groupBy === 'company';
  const onlyProjRow = !!row.onlyProjectionRow;
  const rowCompanyId = toNum(row.company_id ?? row.id ?? null);
  const rowEnterpriseId = toNum(row.enterprise_id ?? row.id ?? null);

  return (sales || []).filter((sale) => {
    const contracts = Array.isArray(sale?.contracts) ? sale.contracts : [];
    if (!contracts.length) return false;

    let belongs = false;
    if (byCompany) {
      if (rowCompanyId != null) belongs = contracts.some((c) => toNum(c.company_id) === rowCompanyId);
      else belongs = contracts.some((c) => c.company_id == null);
    } else {
      if (rowEnterpriseId != null) belongs = contracts.some((c) => toNum(c.enterprise_id) === rowEnterpriseId);
      else belongs = false;
    }

    if (!belongs) return false;
    if (onlyProjRow) return contracts.every((c) => !!c._projection);
    return true;
  });
};

const salesForModalRowFrom = (sales, row, ctx = {}) => {
  const byCompany = contractsStore.groupBy === 'company';
  const onlyProjRow = !!row.onlyProjectionRow;

  if (byCompany && onlyProjRow) {
    const allowed = Array.isArray(ctx.enterpriseIds) ? ctx.enterpriseIds : [];
    const allowedSet = new Set(allowed.map(Number).filter(Number.isFinite));

    return (sales || []).filter((sale) => {
      const contracts = Array.isArray(sale?.contracts) ? sale.contracts : [];
      if (!contracts.length) return false;
      if (!contracts.every((c) => !!c._projection)) return false;
      if (allowedSet.size > 0) return contracts.some((c) => allowedSet.has(Number(c.enterprise_id)));
      return true;
    });
  }

  if (!byCompany && !onlyProjRow) {
    const rowEnterpriseId = toNum(row.enterprise_id ?? row.id ?? null);
    const rowName = (row.name || '').toUpperCase().trim();

    return (sales || []).filter((sale) => {
      const contracts = Array.isArray(sale?.contracts) ? sale.contracts : [];
      if (!contracts.length) return false;

      const hasReal = contracts.some((c) => !c._projection);
      if (hasReal) {
        return rowEnterpriseId != null
          ? contracts.some((c) => !c._projection && toNum(c.enterprise_id) === rowEnterpriseId)
          : false;
      }

      if (rowEnterpriseId != null) {
        const matchById = contracts.some((c) => toNum(c.enterprise_id) === rowEnterpriseId);
        if (matchById) return true;
      }

      if (rowName) {
        return contracts.some((c) => {
          const projName = (c.enterprise_name || '').toUpperCase().trim();
          return projName && (rowName.includes(projName) || projName.includes(rowName));
        });
      }
      return false;
    });
  }

  return salesForRowFrom(sales, row);
};

/* ===================== MODAL - SINGLE ===================== */
const openSingle = async (row, mode = 'list') => {
  const dashboardSalesSnapshot = Array.isArray(contractsStore.uniqueSales) ? [...contractsStore.uniqueSales] : [];
  const targetSales = salesForRowFrom(dashboardSalesSnapshot, row);

  const enterpriseIds =
    (contractsStore.groupBy === 'company' && Array.isArray(row.enterpriseIds) && row.enterpriseIds.length > 0)
      ? [...new Set(row.enterpriseIds.map(Number).filter(Number.isFinite))]
      : [
        ...new Set(
          targetSales
            .flatMap((s) => (s.contracts || []).map((c) => Number(c?.enterprise_id)))
            .filter((id) => Number.isFinite(id) && id > 0)
        ),
      ];

  if (enterpriseIds.length > 0) {
    await contractsStore.fetchContracts({ view: 'detail', enterpriseIds });
  } else if (contractsStore.groupBy === 'enterprise' && row.id != null) {
    await contractsStore.fetchContracts({ view: 'detail', enterpriseId: row.id });
  } else {
    await contractsStore.fetchContracts({ view: 'detail' });
  }

  const detailSalesSnapshot = Array.isArray(contractsStore.uniqueSales) ? [...contractsStore.uniqueSales] : [];

  modalSales.value = salesForModalRowFrom(detailSalesSnapshot, row, { enterpriseIds });

  modalTitle.value =
    (contractsStore.groupBy === 'company' ? `Empresa: ${row.name}` : row.name) +
    (row.onlyProjectionRow ? ' • Projeções' : '');

  initialMode.value = mode;
  modalEnterprise.value = { ...row, name: modalTitle.value };
  showModal.value = true;
};

const saleDedupeKey = (s) => {
  const first = s?.contracts?.[0] || {};
  return [
    s.customer_id ?? '',
    s.unit_id ?? s.unit_name ?? '',
    s.financial_institution_date ?? first.financial_institution_date ?? '',
    (contractsStore.groupBy === 'company'
      ? (first.company_id ?? first.company_name ?? '')
      : (first.enterprise_id ?? first.enterprise_name ?? s.enterprise_name ?? '')
    ),
  ].map(v => String(v ?? '').trim()).join('|');
};

const selectedRows = computed(() => {
  if (selectedKeys.value.size === 0) return [];
  const keys = selectedKeys.value;
  return props.data.filter(r => keys.has(r.key));
});

const selectedSales = computed(() => {
  if (selectedRows.value.length === 0) return [];

  const snapshot = Array.isArray(contractsStore.uniqueSales) ? contractsStore.uniqueSales : [];
  const dedupe = new Map();

  for (const r of selectedRows.value) {
    const list = salesForRowFrom(snapshot, r);
    for (const s of list) {
      const k = saleDedupeKey(s);
      if (!dedupe.has(k)) dedupe.set(k, s);
    }
  }
  return [...dedupe.values()];
});

const selectionMetricsComputed = computed(() => {
  if (selectedSales.value.length === 0) return null;

  const sales = selectedSales.value;
  const totalSales = sales.length;

  const totalValueNet = sales.reduce((sum, s) => sum + (Number(s.total_value_net) || 0), 0);
  const totalValueGross = sales.reduce((sum, s) => sum + (Number(s.total_value_gross) || 0), 0);

  const avgSaleValueNet = totalSales > 0 ? totalValueNet / totalSales : 0;
  const avgSaleValueGross = totalSales > 0 ? totalValueGross / totalSales : 0;

  const totalContracts = sales.reduce((sum, s) => sum + (Array.isArray(s.contracts) ? s.contracts.length : 0), 0);

  const entSet = new Set();
  for (const s of sales) {
    for (const c of (s.contracts || [])) {
      const eid = Number(c.enterprise_id);
      if (Number.isFinite(eid) && eid > 0) entSet.add(eid);
    }
  }

  return {
    totalSales,
    totalContracts,
    totalValueNet,
    totalValueGross,
    avgSaleValueNet,
    avgSaleValueGross,
    totalValue: totalValueNet,
    avgSaleValue: avgSaleValueNet,
    totalEnterprises: entSet.size,
    totalSalesWithProjections: null,
  };
});

watchEffect(() => {
  emit('selection-metrics', selectionMetricsComputed.value);
});

/* ===================== MODAL - GROUP ===================== */
const openGroup = async (mode = 'list') => {
  const keysSet =
    selectedKeys.value.size > 0 ? new Set(selectedKeys.value) : new Set(props.data.map((e) => e.key));

  const rows = props.data.filter((r) => keysSet.has(r.key));

  const dashboardSalesSnapshot = Array.isArray(contractsStore.uniqueSales) ? [...contractsStore.uniqueSales] : [];
  const allSales = [];
  for (const r of rows) allSales.push(...salesForRowFrom(dashboardSalesSnapshot, r));

  const enterpriseIds =
    (contractsStore.groupBy === 'company')
      ? [...new Set(rows.flatMap(r => (r.enterpriseIds || [])).map(Number).filter(Number.isFinite))]
      : [...new Set(allSales.flatMap(s => (s.contracts || []).map(c => Number(c.enterprise_id))).filter(Number.isFinite))];

  if (enterpriseIds.length > 0) {
    await contractsStore.fetchContracts({ view: 'detail', enterpriseIds });
  } else if (contractsStore.groupBy === 'enterprise' && rows.length === 1 && rows[0]?.id != null) {
    await contractsStore.fetchContracts({ view: 'detail', enterpriseId: rows[0].id });
  } else {
    await contractsStore.fetchContracts({ view: 'detail' });
  }

  const salesSnapshot = Array.isArray(contractsStore.uniqueSales) ? [...contractsStore.uniqueSales] : [];

  const dedupe = new Map();
  for (const r of rows) {
    const list = salesForModalRowFrom(salesSnapshot, r, { enterpriseIds: (r.enterpriseIds || enterpriseIds) });
    for (const s of list) {
      const first = s?.contracts?.[0] || {};
      const key = [
        s.customer_id ?? '',
        s.unit_id ?? s.unit_name ?? '',
        s.financial_institution_date ?? first.financial_institution_date ?? '',
        (contractsStore.groupBy === 'company'
          ? (first.company_id ?? first.company_name ?? '')
          : (first.enterprise_id ?? first.enterprise_name ?? s.enterprise_name ?? '')
        ),
      ].map((v) => String(v ?? '').trim()).join('|');

      if (!dedupe.has(key)) dedupe.set(key, s);
    }
  }

  modalSales.value = [...dedupe.values()];
  modalTitle.value =
    rows.length === 1
      ? (contractsStore.groupBy === 'company' ? `Empresa: ${rows[0].name}` : rows[0].name)
      : `Conjunto de ${rows.length} ${contractsStore.groupBy === 'company' ? 'empresas' : 'empreendimentos'}`;

  initialMode.value = mode;
  modalEnterprise.value = { name: modalTitle.value };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  const ok = contractsStore.restoreDashboardFromCache();
  if (!ok) contractsStore.fetchContracts({ view: 'dashboard' });
};

// ── Bridges para SegmentedControl ────────────────────────
const valueModeProxy = computed({
  get: () => contractsStore.valueMode,
  set: (v) => contractsStore.setValueMode(v),
});
const groupByProxy = computed({
  get: () => contractsStore.groupBy,
  set: (v) => contractsStore.setGroupBy(v),
});
const lastView = ref('list');
const onViewChange = (mode) => {
  lastView.value = mode;
  openGroup(mode);
};
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient overflow-hidden">

    <!-- Header -->
    <div class="flex flex-col gap-3 p-3 sm:p-4 border-b border-line">
      <div class="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2 min-w-0 w-full">
          <h3 class="text-sm font-semibold text-ink">
            Vendas por {{ contractsStore.groupBy === 'company' ? 'empresa' : 'empreendimento' }}
          </h3>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-ink">{{ sortedData.length }}</span>
            {{ contractsStore.groupBy === 'company' ? 'empresa(s)' : 'empreendimento(s)' }} ·
            <span class="font-mono text-ink">{{ totalCount }}</span> venda(s) ·
            <span class="font-mono text-ink">{{ formatCurrency(totalValueAll) }}</span>
            <span v-if="selectedKeys.size" class="text-accent">
              · <span class="font-mono">{{ selectedKeys.size }}</span> selecionado(s)
            </span>
          </p>
        </div>

      </div>

      <!-- Toolbar de toggles -->
      <div class="flex items-center gap-2 flex-wrap">
        <SegmentedControl v-model="groupByProxy" :options="groupByOptions" size="sm" />
        <IconButton v-if="isAdmin" icon="fas fa-cog" size="sm" label="Configurar regras" class="md:max-w-20"
          @click="emit('open-land-sync')" />
        <IconButton icon="fas fa-download" size="md" label="Exportar dados" @click="open = true" />
        <div class="ml-auto flex items-center gap-2 flex-wrap">
          <Select v-model="sortBy" :options="sortOptions" size="sm" class="md:max-w-20" />
          <SegmentedControl v-model="valueModeProxy" :options="valueModeOptions" size="sm" />
          <SegmentedControl :model-value="lastView" :options="viewOptions" size="sm" @change="onViewChange" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <EmptyState v-if="sortedData.length === 0" icon="fas fa-building" title="Nenhum empreendimento encontrado"
      description="Ajuste os filtros para ver resultados." />

    <!-- Mobile: cards -->
    <div v-else class="md:hidden divide-y divide-line">
      <article v-for="(enterprise, idx) in sortedData" :key="enterprise.key"
        class="flex items-start gap-3 p-3 cursor-pointer hover:bg-surface-sunken/40 transition-colors"
        :class="enterprise.onlyProjectionRow ? 'bg-emerald-500/5' : ''" @click="openSingle(enterprise)">
        <input type="checkbox" :checked="selectedKeys.has(enterprise.key)" @click.stop
          @change="toggleOne(enterprise.key, $event)" class="mt-1 shrink-0 accent-accent" />

        <div :style="{ backgroundColor: getColor(idx) }" class="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"></div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-medium text-ink truncate flex items-center gap-1.5">
              {{ enterprise.name }}
              <span v-if="!enterprise.onlyProjectionRow && enterprise.proj_count > 0" v-tippy="'Projeção vinculada'"
                class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            </p>
            <i class="fas fa-chevron-right text-xs text-ink-subtle mt-1 shrink-0"></i>
          </div>

          <div class="flex items-center gap-3 mt-1.5 flex-wrap text-[11px]">
            <span class="text-ink-muted font-mono">
              <span class="text-ink font-semibold">{{ enterprise.count - distratoCount(enterprise) }}</span> venda(s)
              <span v-if="!enterprise.onlyProjectionRow && enterprise.proj_count"
                class="text-emerald-500 font-semibold">+{{ enterprise.proj_count }}</span>
              <span v-if="!enterprise.onlyProjectionRow && distratoCount(enterprise) > 0"
                class="text-red-500 font-semibold" v-tippy="'Distratos (não contabilizados)'">−{{
                  distratoCount(enterprise) }}</span>
            </span>
          </div>

          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {{ formatCurrency(baseValue(enterprise)) }}
            </span>
            <span v-if="!enterprise.onlyProjectionRow && appendedValue(enterprise) > 0"
              class="text-[11px] text-emerald-500 font-mono tabular-nums">
              +{{ formatCurrency(appendedValue(enterprise)) }}
            </span>
          </div>
          <p class="text-[10px] text-ink-subtle font-mono mt-0.5">
            ticket {{ formatCurrency(ticketMedio(enterprise)) }}
          </p>
        </div>
      </article>
    </div>

    <!-- Desktop: tabela -->
    <div v-if="sortedData.length" class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-surface-sunken/40 border-b border-line">
          <tr>
            <th class="px-4 py-2.5 w-10">
              <input type="checkbox" :checked="allVisibleChecked" @change="toggleAllVisible($event)"
                class="accent-accent" />
            </th>
            <th class="px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
              {{ contractsStore.groupBy === 'company' ? 'Empresa' : 'Empreendimento' }}
            </th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Vendas
            </th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
              Valor total
              <span class="text-ink-subtle/70">({{ valueModeLabel }})</span>
            </th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
              Ticket médio
              <span class="text-ink-subtle/70">({{ valueModeLabel }})</span>
            </th>
            <th class="px-4 py-2.5 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Ações
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-line">
          <tr v-for="(enterprise, idx) in sortedData" :key="enterprise.key" class="transition-colors" :class="enterprise.onlyProjectionRow
            ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
            : 'hover:bg-surface-sunken/40'">
            <td class="px-4 py-3">
              <input type="checkbox" :checked="selectedKeys.has(enterprise.key)"
                @change="toggleOne(enterprise.key, $event)" class="accent-accent" />
            </td>

            <!-- Nome -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div :style="{ backgroundColor: getColor(idx) }" class="w-2.5 h-2.5 rounded-full shrink-0"></div>
                <span class="text-sm font-medium text-ink truncate max-w-[28rem]">
                  {{ enterprise.name }}
                </span>
                <span v-if="!enterprise.onlyProjectionRow && enterprise.proj_count > 0" v-tippy="'Projeção vinculada'"
                  class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <Badge v-if="enterprise.onlyProjectionRow" variant="success" size="sm">
                  <i class="fas fa-chart-line text-[9px]"></i>Projeção
                </Badge>
              </div>
            </td>

            <!-- Vendas -->
            <td class="px-4 py-3 text-right">
              <div class="text-sm font-semibold text-ink tabular-nums relative inline-block">
                {{ enterprise.count - distratoCount(enterprise) }}

                <span v-if="!enterprise.onlyProjectionRow && enterprise.proj_count"
                  class="absolute -top-3 -right-2 text-[10px] font-bold text-emerald-500 font-mono"
                  v-tippy="'Projeção'">
                  +{{ enterprise.proj_count }}
                </span>

                <span v-if="!enterprise.onlyProjectionRow && distratoCount(enterprise) > 0"
                  class="absolute -bottom-3 -right-2 text-[10px] font-bold text-red-500 font-mono"
                  v-tippy="'Distratos (não contabilizados)'">
                  −{{ distratoCount(enterprise) }}
                </span>
              </div>
            </td>

            <!-- Valor -->
            <td class="px-4 py-3 text-right">
              <div class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {{ formatCurrency(baseValue(enterprise)) }}
              </div>
              <div v-if="!enterprise.onlyProjectionRow && appendedValue(enterprise) > 0"
                class="text-[11px] text-emerald-500 font-mono tabular-nums">
                +{{ formatCurrency(appendedValue(enterprise)) }}
              </div>
              <div v-if="!enterprise.onlyProjectionRow && distratoValue(enterprise) > 0"
                class="text-[11px] text-red-500 font-mono tabular-nums" v-tippy="'Distratos (não contabilizados)'">
                −{{ formatCurrency(distratoValue(enterprise)) }}
              </div>
            </td>

            <!-- Ticket -->
            <td class="px-4 py-3 text-right">
              <span class="text-sm text-ink-muted tabular-nums font-mono">
                {{ formatCurrency(ticketMedio(enterprise)) }}
              </span>
            </td>

            <!-- Ações -->
            <td class="px-4 py-3">
              <div class="flex gap-1 justify-center">
                <IconButton icon="fas fa-eye" size="sm" label="Relatório de vendas"
                  @click.stop="openSingle(enterprise, 'list')" />
                <IconButton icon="fas fa-chart-pie" size="sm" label="Pizza por imobiliária"
                  @click.stop="openSingle(enterprise, 'pie')" />
                <IconButton icon="fas fa-chart-column" size="sm" label="Colunas por imobiliária"
                  @click.stop="openSingle(enterprise, 'bar')" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Export v-model="open" :source="sortedData" title="Exportação de vendas" filename="Relatório de Faturamento"
      initial-delimiter=";" initial-array-mode="join" :preselect="[]" />

    <EnterpriseDetailModal v-if="showModal" :enterprise="modalEnterprise" :sales="modalSales"
      :initial-mode="initialMode" @close="closeModal" />
  </section>
</template>
