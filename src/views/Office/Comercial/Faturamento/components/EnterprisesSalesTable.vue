<script setup>
import { ref, computed, watchEffect } from 'vue';
import { useCan } from '@/composables/useCan';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import EnterpriseDetailModal from './EnterpriseDetailModal.vue';
import Export from '@/components/config/Export.vue';

import IconButton from '@/components/UI/IconButton.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Panel from '@/components/UI/Panel.vue';
import DataTable from '@/components/UI/DataTable.vue';
import ActionBar from '@/components/UI/ActionBar.vue';

const props = defineProps({ data: { type: Array, required: true } });
const emit = defineEmits(['open-land-sync', 'open-closing', 'selection-metrics']);

const contractsStore = useContractsStore();
// Ordenação pelo CABEÇALHO da tabela (padrão do sistema) — o dropdown de
// direcionamento saiu da toolbar.
const sortConfig = ref({ key: 'value', direction: 'desc' });
const open = ref(false);

const selectedKeys = ref(new Set());

const showModal = ref(false);
const modalSales = ref([]);
const modalTitle = ref('');
const modalEnterprise = ref({ name: '' });

const valueModeLabel = computed(() => contractsStore.valueModeLabel);

// Ações desta tela (lib/screenCapabilities.js no back): view segue a alçada,
// configure é admin. Lia `localStorage.getItem('role')` — qualquer um se dava
// admin no navegador. Ver composables/useCan.js.
const can = useCan('/comercial/relatorios/faturamento');

const groupByOptions = [
  { value: 'enterprise', label: 'Empreendimento', icon: 'fas fa-building' },
  { value: 'company', label: 'Empresa', icon: 'fas fa-city' },
];

// O alternador Listagem / Pizza / Colunas saiu em 2026-08-31: relatório é uma
// leitura só, de cima para baixo (DESIGN-LANGUAGE, "Padrões de VISUALIZAÇÃO").
// A comparação entre linhas que a pizza dava agora está na coluna
// Participação, dentro da própria linha.
//
// A paleta fixa de dez hex também saiu. A cor de dado é `series-1..8` e segue a
// ENTIDADE; aqui ela era escolhida pelo índice da linha, então mudava de cor a
// cada reordenação - era enfeite, não informação.

// Colunas ordenáveis, na ordem em que aparecem.
const sortColumns = [
  { key: 'name', label: 'Nome' },
  { key: 'count', label: 'Vendas' },
  { key: 'value', label: 'Valor total' },
  { key: 'ticket', label: 'Ticket médio' },
];

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v || 0);

/* ===================== VALORES =====================
 * Toda a regra (distrato, projeção vinculada, ticket) mora no contractsStore
 * para que esta tabela e a de Vendas × Projeção mostrem o mesmo número.
 */
const distratoCount = (row) => contractsStore.distratoCountForRow(row);
const distratoValue = (row) => contractsStore.distratoValueForRow(row);
// Vendas com ajuste contábil (máscara sobre o dado do Sienge). Selo informativo,
// como o de distrato: o valor exibido já vem corrigido do servidor.
const adjustedCount = (row) => contractsStore.adjustmentCountForRow(row);
const baseValue = (row) => contractsStore.realizedValueForRow(row);
const appendedValue = (row) => contractsStore.projectedValueForRow(row);
const totalCombined = (row) => contractsStore.combinedValueForRow(row);
const realizedCount = (row) => contractsStore.realizedCountForRow(row);
const combinedCount = (row) => contractsStore.combinedCountForRow(row);
const ticketMedio = (row) => contractsStore.ticketForRow(row);
const isUnlinked = (row) => contractsStore.isUnlinkedProjectionRow(row);

/* ===================== TITLE (hover no nome) =====================
 * Identificação rápida para ocultar na engrenagem: o title nativo mostra
 * o código da empresa, o(s) centro(s) de custo e os nomes da linha.
 */
const enterpriseNamesById = computed(() => {
  const map = new Map();
  for (const c of contractsStore.contracts || []) {
    const eid = Number(c.enterprise_id);
    if (Number.isFinite(eid) && eid > 0 && c.enterprise_name && !map.has(eid)) {
      map.set(eid, c.enterprise_name);
    }
  }
  for (const e of contractsStore.enterprises || []) {
    const eid = Number(e.id);
    if (Number.isFinite(eid) && eid > 0 && e.name && !map.has(eid)) map.set(eid, e.name);
  }
  return map;
});

const rowTitle = (row) => {
  const lines = [];
  if (contractsStore.groupBy === 'company') {
    lines.push(`Empresa ${row.company_id ?? 's/ código'} - ${row.name}`);
    const ids = Array.isArray(row.enterpriseIds) ? row.enterpriseIds : [];
    if (ids.length) {
      lines.push('Centros de custo:');
      for (const eid of [...ids].sort((a, b) => a - b)) {
        lines.push(`${eid} - ${enterpriseNamesById.value.get(Number(eid)) || 'sem nome'}`);
      }
    }
  } else {
    const eid = row.enterprise_id ?? row.id ?? null;
    lines.push(`CC ${eid ?? 's/ código'} - ${row.name}`);
    const comp = eid != null
      ? (contractsStore.enterpriseToCompanyMap.get(Number(eid))
        ?? contractsStore._enterpriseCompanyMap.get(Number(eid))
        ?? null)
      : null;
    if (comp && (comp.company_id != null || comp.company_name)) {
      lines.push(`Empresa ${comp.company_id ?? 's/ código'} - ${comp.company_name || 'sem nome'}`);
    }
  }
  return lines.join('\n');
};

/* ===================== SORT (pelo cabeçalho) ===================== */
const sortValueOf = (row, key) => {
  switch (key) {
    case 'name': return (row.name || '').toLowerCase();
    case 'count': return combinedCount(row);
    case 'ticket': return ticketMedio(row);
    case 'value':
    default: return totalCombined(row);
  }
};

const sortedData = computed(() => {
  const { key, direction } = sortConfig.value;
  const dir = direction === 'asc' ? 1 : -1;
  return [...props.data].sort((a, b) => {
    const av = sortValueOf(a, key);
    const bv = sortValueOf(b, key);
    if (typeof av === 'string' || typeof bv === 'string') {
      return String(av).localeCompare(String(bv), 'pt-BR') * dir;
    }
    return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
  });
});

// Texto começa A→Z; número começa do maior (o que interessa em valores).
function handleSort(key) {
  if (sortConfig.value.key === key) {
    sortConfig.value = { key, direction: sortConfig.value.direction === 'asc' ? 'desc' : 'asc' };
  } else {
    sortConfig.value = { key, direction: key === 'name' ? 'asc' : 'desc' };
  }
}

function sortIcon(key) {
  if (sortConfig.value.key !== key) return 'fas fa-sort text-ink-subtle/40';
  return sortConfig.value.direction === 'asc' ? 'fas fa-sort-up text-accent' : 'fas fa-sort-down text-accent';
}

const sortLabel = computed(() => {
  const col = sortColumns.find(c => c.key === sortConfig.value.key);
  return `${col?.label || sortConfig.value.key} ${sortConfig.value.direction === 'asc' ? '↑' : '↓'}`;
});

const totalCount = computed(() =>
  sortedData.value.reduce((s, e) => s + realizedCount(e), 0)
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
const openSingle = async (row) => {
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
const openGroup = async () => {
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

  modalEnterprise.value = { name: modalTitle.value };
  showModal.value = true;
};

/* ===================== COLUNAS (padrão DataTable) =====================
 * A prioridade decide a ORDEM no celular, nunca o que existe: as seis colunas
 * continuam alcançáveis nas duas larguras.
 */
const columns = computed(() => [
  { key: 'sel', label: 'Sel.', priority: 2, align: 'center', width: '3.25rem', truncate: false },
  {
    key: 'name', priority: 1, sortable: true, truncate: false,
    label: contractsStore.groupBy === 'company' ? 'Empresa' : 'Empreendimento',
  },
  { key: 'count', label: 'Vendas', priority: 1, numeric: true, sortable: true, width: '7rem' },
  { key: 'value', label: `Valor total (${valueModeLabel.value})`, priority: 1, numeric: true, sortable: true, width: '13rem' },
  { key: 'share', label: 'Participação', priority: 2, width: '13rem', truncate: false },
  { key: 'ticket', label: `Ticket médio (${valueModeLabel.value})`, priority: 2, numeric: true, sortable: true, width: '11rem' },
]);

/* Participação da linha no valor do período. É o que a pizza mostrava, agora
 * presa à própria linha - a barra é proporcional ao MAIOR valor da lista e não
 * ao total, senão numa cauda longa tudo vira um traço achatado. */
const maiorValor = computed(() =>
  props.data.reduce((m, r) => Math.max(m, totalCombined(r) || 0), 0));

const sharePct = (row) =>
  totalValueAll.value > 0 ? (totalCombined(row) / totalValueAll.value) * 100 : 0;

const shareWidth = (row) =>
  maiorValor.value > 0 ? `${Math.max(2, (totalCombined(row) / maiorValor.value) * 100)}%` : '0%';

/* Ordenação CONTROLADA: a DataTable mostra os controles, mas quem ordena é esta
 * tela - é a `sortedData` que alimenta a exportação e o rótulo de ordenação do
 * cabeçalho da planilha. */
const onSortBy = (key) => { if (key && key !== sortConfig.value.key) handleSort(key); };
const onSortDir = (dir) => { sortConfig.value = { ...sortConfig.value, direction: dir }; };

const someVisibleChecked = computed(
  () => visibleKeys.value.some((k) => selectedKeys.value.has(k)) && !allVisibleChecked.value);

const clearSelection = () => { selectedKeys.value = new Set(); };

const selectionSummary = computed(() => {
  const n = selectedRows.value.length;
  const unidade = contractsStore.groupBy === 'company' ? 'empresa' : 'empreendimento';
  const vendas = selectedSales.value.length;
  return `${n} ${unidade}${n === 1 ? '' : 's'} · ${vendas} venda${vendas === 1 ? '' : 's'}`;
});

const closeModal = () => {
  showModal.value = false;
  const ok = contractsStore.restoreDashboardFromCache();
  if (!ok) contractsStore.fetchContracts({ view: 'dashboard' });
};

// ── Bridges para SegmentedControl ────────────────────────
// VGV / VGV+DC mudou para os filtros do topo (DashboardFilters).
const groupByProxy = computed({
  get: () => contractsStore.groupBy,
  set: (v) => contractsStore.setGroupBy(v),
});
</script>

<template>
  <!-- Painel (não Surface): o bloco tem assunto, ação e estado vazio próprios. -->
  <Panel :padded="false" icon="fas fa-table-list"
    :title="`Vendas por ${contractsStore.groupBy === 'company' ? 'empresa' : 'empreendimento'}`"
    :subtitle="`${sortedData.length} ${contractsStore.groupBy === 'company' ? 'empresa(s)' : 'empreendimento(s)'} · ${totalCount} venda(s) · ${formatCurrency(totalValueAll)}`">

    <template #actions>
      <SegmentedControl v-model="groupByProxy" :options="groupByOptions" size="sm" />
      <IconButton v-if="can('configure')" icon="fas fa-cog" size="sm" label="Configurar regras"
        @click="emit('open-land-sync')" />
      <IconButton v-if="can('configure')" icon="fas fa-file-shield" size="sm"
        label="Consolidação (fechamento mensal)" @click="emit('open-closing')" />
      <IconButton icon="fas fa-download" size="sm" label="Exportar dados" @click="open = true" />
      <IconButton icon="fas fa-list" size="sm" label="Ver todas as vendas do período"
        :disabled="disabledOpen" @click="openGroup()" />
    </template>

    <!-- Selecionar todos vive fora da tabela porque precisa existir nas DUAS
         larguras: no celular não há cabeçalho de coluna onde encaixá-lo. -->
    <div v-if="sortedData.length" class="px-3 sm:px-4 pt-3 flex items-center gap-2">
      <input id="sel-todos" type="checkbox" class="checkbox checkbox-sm"
        :checked="allVisibleChecked" :indeterminate.prop="someVisibleChecked"
        @change="toggleAllVisible($event)" />
      <label for="sel-todos" class="text-micro text-ink-muted cursor-pointer select-none">
        Selecionar todos ({{ sortedData.length }})
      </label>
    </div>

    <div class="p-3 sm:p-4">
      <DataTable :columns="columns" :rows="sortedData" row-key="key" clickable manual-sort
        :sort-by="sortConfig.key" :sort-dir="sortConfig.direction"
        empty-icon="fas fa-building" empty-title="Nenhum empreendimento encontrado"
        empty-text="Ajuste os filtros para ver resultados."
        @update:sortBy="onSortBy" @update:sortDir="onSortDir" @row-click="openSingle">

        <!-- Seleção: o clique nunca chega na linha, então marcar não abre. -->
        <template #cell-sel="{ row }">
          <input type="checkbox" class="checkbox checkbox-sm" :checked="selectedKeys.has(row.key)"
            :aria-label="`Selecionar ${row.name}`"
            @click.stop @change="toggleOne(row.key, $event)" />
        </template>

        <template #cell-name="{ row }">
          <span class="inline-flex items-center gap-2 min-w-0">
            <span class="truncate font-medium text-ink" :title="rowTitle(row)">{{ row.name }}</span>
            <span v-if="!row.onlyProjectionRow && row.proj_count > 0" v-tippy="'Projeção vinculada'"
              class="h-2 w-2 rounded-full bg-data-pos shrink-0"></span>
            <Badge v-if="isUnlinked(row)" variant="warning" size="sm"
              v-tippy="'Esta projeção não achou o empreendimento correspondente no Sienge, por isso aparece em linha separada. Um admin resolve na engrenagem, aba Vínculo CV ↔ Sienge.'">
              <i class="fas fa-link-slash text-micro"></i>Sem vínculo
            </Badge>
            <Badge v-else-if="row.onlyProjectionRow" variant="success" size="sm">
              <i class="fas fa-chart-line text-micro"></i>Projeção
            </Badge>
            <Badge v-if="!row.onlyProjectionRow && adjustedCount(row) > 0" variant="info" size="sm"
              v-tippy="'Venda(s) com ajuste contábil — o valor exibido já vem corrigido. Detalhe na linha da venda.'">
              <i class="fas fa-wand-magic-sparkles text-micro"></i>{{ adjustedCount(row) }} ajustada(s)
            </Badge>
          </span>
        </template>

        <template #cell-count="{ row }">
          <span class="inline-flex items-baseline gap-1.5 justify-end">
            <span class="font-semibold text-ink">{{ realizedCount(row) }}</span>
            <span v-if="!row.onlyProjectionRow && row.proj_count" v-tippy="'Projeção'"
              class="text-micro font-semibold text-data-pos">+{{ row.proj_count }}</span>
            <span v-if="!row.onlyProjectionRow && distratoCount(row) > 0"
              v-tippy="'Distratada(s) depois da venda — contabilizadas no período'"
              class="text-micro font-semibold text-data-warn">
              <i class="fas fa-file-circle-xmark"></i>{{ distratoCount(row) }}</span>
          </span>
        </template>

        <template #cell-value="{ row }">
          <span class="block font-semibold text-data-pos">{{ formatCurrency(baseValue(row)) }}</span>
          <span v-if="!row.onlyProjectionRow && appendedValue(row) > 0"
            class="block text-micro text-data-pos">+{{ formatCurrency(appendedValue(row)) }}</span>
          <span v-if="!row.onlyProjectionRow && distratoValue(row) > 0"
            v-tippy="'Valor de vendas distratadas — incluído no total'"
            class="block text-micro text-data-warn">
            <i class="fas fa-file-circle-xmark"></i> {{ formatCurrency(distratoValue(row)) }}</span>
        </template>

        <!-- Participação: o que a pizza respondia, agora dentro da linha. -->
        <template #cell-share="{ row }">
          <span class="flex items-center gap-2">
            <span class="flex-1 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
              <span class="block h-full rounded-full bg-accent/70 transition-all duration-420 ease-out-expo"
                :style="{ width: shareWidth(row) }"></span>
            </span>
            <span class="text-micro text-ink-muted tabular-nums w-11 text-right">
              {{ sharePct(row).toFixed(1) }}%
            </span>
          </span>
        </template>

        <template #cell-ticket="{ row }">
          <span class="text-ink-muted">{{ formatCurrency(ticketMedio(row)) }}</span>
        </template>

        <template #actions="{ row }">
          <IconButton icon="fas fa-eye" size="sm" label="Ver as vendas" @click="openSingle(row)" />
        </template>
      </DataTable>
    </div>
  </Panel>

  <!-- Barra da seleção: o recorte já recalcula os cartões do topo; aqui ficam
       as ações que valem para o conjunto inteiro. -->
  <ActionBar v-if="selectedKeys.size > 0" :count="selectedKeys.size"
    :unit="contractsStore.groupBy === 'company' ? 'empresas' : 'empreendimentos'"
    :summary="selectionSummary" @clear="clearSelection">
    <Button size="sm" icon="fas fa-list" @click="openGroup()">Ver as vendas</Button>
  </ActionBar>

  <Export v-model="open" :source="sortedData" title="Vendas por empreendimento"
    initial-delimiter=";" initial-array-mode="join" :preselect="[]"
    :filters="{
      'Modo de valor': valueModeLabel,
      'Ordenação': sortLabel,
      'Total de empreendimentos': totalCount,
    }" />

  <EnterpriseDetailModal v-if="showModal" :enterprise="modalEnterprise" :sales="modalSales"
    @close="closeModal" />
</template>
