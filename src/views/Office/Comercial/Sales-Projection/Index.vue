<script setup>
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';

import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useSalesProjectionReportStore } from '@/stores/Comercial/Projections/salesProjectionReportStore';
import { useProjectionGoalModeStore } from '@/stores/Comercial/Projections/projectionGoalModeStore';
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore';
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore';
import { useTrSatelliteStore } from '@/stores/Comercial/Contracts/trSatelliteStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Button from '@/components/UI/Button.vue';

import ReportFilters from './components/ReportFilters.vue';
import ProjectionMetricsCards from './components/ProjectionMetricsCards.vue';
import EnterpriseComparisonTable from './components/EnterpriseComparisonTable.vue';
import ProjectionSettingsModal from './components/ProjectionSettingsModal.vue';
import ProjectionChartsModal from './components/ProjectionChartsModal.vue';
import EnterpriseDetailModal from '@/views/Office/Comercial/Faturamento/components/EnterpriseDetailModal.vue';
import LandSyncConfigModal from '@/views/Office/Comercial/Faturamento/components/LandSyncConfigModal.vue';

const contractsStore = useContractsStore();
const projStore = useSalesProjectionReportStore();
const goalStore = useProjectionGoalModeStore();
const stageRulesStore = useStageCommissionRulesStore();
const hiddenStore = useHiddenEnterprisesStore();
const trSatelliteStore = useTrSatelliteStore();

// Padrão: por empreendimento (garante que projeções sem vendas apareçam)
contractsStore.groupBy = 'enterprise';

const loading = ref(false);
const selectionMetrics = ref(null);

// ── Detail modal ──────────────────────────────────────────────────────────────
const isDetailOpen = ref(false);
const detailRow = ref(null);
const detailEnterprise = ref(null);

// ── Settings modal (goal mode) ────────────────────────────────────────────────
const isSettingsOpen = ref(false);

// ── Rules modal ──────────────────────────────────────────────────────────────
const isRulesOpen = ref(false);

// ── Charts modal ─────────────────────────────────────────────────────────────
const isChartsOpen = ref(false);

// ── Active company filter ─────────────────────────────────────────────────────
const selectedCompanyIds = ref([]);

const hasError = computed(() => !!(contractsStore.error || projStore.error));
const errorMessage = computed(() => contractsStore.error || projStore.error || 'Erro ao carregar relatório.');

// ── Sales for detail modal ────────────────────────────────────────────────────
const detailSales = computed(() => {
  const row = detailRow.value;
  if (!row) return [];
  const eid = row.enterprise_id != null ? Number(row.enterprise_id) : null;
  if (eid == null) return [];
  return (contractsStore.uniqueSales || []).filter(sale => {
    const contracts = Array.isArray(sale?.contracts) ? sale.contracts : [];
    return contracts.some(c => Number(c.enterprise_id) === eid);
  });
});

function openDetail(row) {
  detailRow.value = row;
  detailEnterprise.value = {
    name: row.name || 'Empreendimento',
    id: row.enterprise_id ?? row.id ?? null,
    cost_center_code: null,
  };
  isDetailOpen.value = true;
}

// ── Lookups de projeção (nível empreendimento) ────────────────────────────────
const projByErpId = computed(() => {
  const map = new Map();
  for (const ent of (projStore.enterprisesResolved ?? [])) {
    if (ent.erp_id != null) map.set(String(ent.erp_id), ent);
  }
  return map;
});

const projByName = computed(() => {
  const map = new Map();
  for (const ent of (projStore.enterprisesResolved ?? [])) {
    if (ent.name) map.set(ent.name.trim().toUpperCase(), ent);
  }
  return map;
});

function getProj(row) {
  return projByErpId.value.get(String(row.enterprise_id ?? '')) ||
    projByName.value.get((row.name || '').trim().toUpperCase()) ||
    null;
}

function statusOf(realizedVgv, projectedVgv, achievementPct) {
  const elapsed = projStore.timeElapsedPct ?? 0;
  if (!projectedVgv) return 'no_projection';
  if (!realizedVgv) return 'no_sales';
  if (elapsed === 0) return achievementPct >= 100 ? 'ahead' : 'behind';
  const ratio = achievementPct / elapsed;
  if (ratio >= 1.1) return 'ahead';
  if (ratio >= 0.8) return 'on_track';
  if (ratio >= 0.4) return 'behind';
  return 'at_risk';
}

// ── Filter projStore enterprises: hidden enterprises (admin-only setting) ────
// O filtro de empresa é aplicado server-side em /projections/report (companyIds).
// Aqui só precisamos remover empreendimentos ocultos por configuração admin.
const filteredProjEnterprises = computed(() => {
  const all = projStore.enterprisesResolved ?? [];
  if (hiddenStore.hiddenIds.size === 0) return all;
  return all.filter(ent => {
    const eid = ent.erp_id != null ? Number(ent.erp_id) : null;
    return eid == null || !hiddenStore.hiddenIds.has(eid);
  });
});

// ── Dados combinados ────────────────────────────────────────────────────
const combinedData = computed(() => {
  const isCompany = contractsStore.groupBy === 'company';
  const isNet = contractsStore.isNet;

  if (isCompany) {
    // Mapeia empresa -> projeções e identifica os empreendimentos COM projeção,
    // para excluir vendas órfãs (de empreendimentos sem projeção) da agregação
    // por empresa. Sem essa exclusão, a venda órfã infla o numerador (realizado)
    // sem inflar o denominador (projetado), distorcendo o % Atingida.
    const projByCompanyId = new Map();
    const companyNameMap = new Map();
    const projectedEnterpriseIds = new Set();
    for (const ent of filteredProjEnterprises.value) {
      const cid = ent.company_id != null ? Number(ent.company_id) : null;
      if (!cid) continue;
      const prev = projByCompanyId.get(cid) ?? { projected_vgv: 0, projected_units: 0 };
      prev.projected_vgv += ent.summary?.projected_vgv ?? 0;
      prev.projected_units += ent.summary?.projected_units ?? 0;
      projByCompanyId.set(cid, prev);
      if (!companyNameMap.has(cid) && ent.company_name) companyNameMap.set(cid, ent.company_name);
      const eid = ent.erp_id != null ? Number(ent.erp_id) : null;
      if (eid != null && Number.isFinite(eid)) projectedEnterpriseIds.add(eid);
    }

    // Agrega salesByEnterprise por company_id, considerando apenas empreendimentos
    // que têm projeção. Empresas 100% órfãs continuam usando o agregado total
    // (fallback abaixo), mantendo visibilidade.
    const entToCompanyMap = contractsStore.enterpriseToCompanyMap;
    const projOnlyAggByCompany = new Map();
    for (const entRow of contractsStore.salesByEnterprise) {
      const eid = entRow.enterprise_id != null ? Number(entRow.enterprise_id) : null;
      if (eid == null || !projectedEnterpriseIds.has(eid)) continue;
      const cid = entToCompanyMap.get(eid)?.company_id != null
        ? Number(entToCompanyMap.get(eid).company_id) : null;
      if (cid == null) continue;
      const prev = projOnlyAggByCompany.get(cid) ?? {
        count: 0, total_value_net: 0, total_value_gross: 0,
        proj_count: 0, proj_value_net: 0, proj_value_gross: 0,
      };
      prev.count += entRow.count || 0;
      prev.total_value_net += entRow.total_value_net || 0;
      prev.total_value_gross += entRow.total_value_gross || 0;
      prev.proj_count += entRow.proj_count || 0;
      prev.proj_value_net += entRow.proj_value_net || 0;
      prev.proj_value_gross += entRow.proj_value_gross || 0;
      projOnlyAggByCompany.set(cid, prev);
    }

    const seenCompanyIds = new Set();
    const result = [];

    for (const row of contractsStore.salesByCompany) {
      const cid = row.company_id != null ? Number(row.company_id) : null;
      if (cid != null) seenCompanyIds.add(cid);

      const proj = cid != null ? projByCompanyId.get(cid) : null;
      // Quando a empresa tem ao menos um empreendimento com projeção, usa o
      // agregado restrito (sem órfãos). Caso contrário, mantém o agregado total
      // do salesByCompany — assim empresas 100% órfãs continuam aparecendo.
      const restricted = (proj && cid != null) ? projOnlyAggByCompany.get(cid) : null;
      const effectiveRow = restricted ? { ...row, ...restricted } : row;

      const wfVgv = isNet ? (effectiveRow.proj_value_net || 0) : (effectiveRow.proj_value_gross || 0);
      const realizedVgvBase = isNet ? (effectiveRow.total_value_net || 0) : (effectiveRow.total_value_gross || 0);
      const realizedVgv = realizedVgvBase > 0 ? realizedVgvBase : wfVgv;
      const projectedVgv = proj?.projected_vgv ?? 0;
      const projectedUnits = proj?.projected_units ?? 0;
      const achievementPct = projectedVgv > 0
        ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
        : null;

      result.push({
        ...effectiveRow,
        _key: `COMP:${cid ?? row.name}`,
        company_id: cid,
        realizedVgv,
        projectedVgv,
        projectedUnits,
        achievementPct,
        status: statusOf(realizedVgv, projectedVgv, achievementPct),
      });
    }

    for (const [cid, proj] of projByCompanyId) {
      if (seenCompanyIds.has(cid)) continue;
      if (!proj.projected_vgv) continue;
      const name = companyNameMap.get(cid) ?? `Empresa ${cid}`;
      result.push({
        _key: `COMP:${cid}`,
        name,
        company_id: cid,
        count: 0, proj_count: 0,
        proj_value_net: 0, proj_value_gross: 0,
        total_value_net: 0, total_value_gross: 0,
        onlyProjectionRow: false,
        realizedVgv: 0,
        projectedVgv: proj.projected_vgv,
        projectedUnits: proj.projected_units,
        achievementPct: 0,
        status: 'no_sales',
      });
    }

    return result.sort((a, b) => b.realizedVgv - a.realizedVgv);
  } else {
    const seen = new Set();
    const result = [];

    for (const row of contractsStore.salesByEnterprise) {
      const eidStr = String(row.enterprise_id ?? row.id ?? '');
      if (eidStr) seen.add(eidStr);

      const proj = getProj(row);
      const realizedVgv = isNet ? (row.total_value_net || 0) : (row.total_value_gross || 0);
      const effectiveRealized = row.onlyProjectionRow
        ? (isNet ? Number(row.total_value_net || 0) : Number(row.total_value_gross || 0))
        : realizedVgv;
      const projectedVgv = proj?.summary?.projected_vgv ?? 0;
      const projectedUnits = proj?.summary?.projected_units ?? 0;
      const achievementPct = projectedVgv > 0
        ? parseFloat((effectiveRealized / projectedVgv * 100).toFixed(1))
        : null;

      result.push({
        ...row,
        _key: `ENT:${eidStr || row.name}`,
        enterprise_id: row.enterprise_id ?? row.id ?? null,
        realizedVgv: effectiveRealized,
        projectedVgv, projectedUnits,
        achievementPct,
        status: statusOf(effectiveRealized, projectedVgv, achievementPct),
      });
    }

    for (const ent of filteredProjEnterprises.value) {
      if (ent.erp_id && seen.has(String(ent.erp_id))) continue;
      const projectedVgv = ent.summary?.projected_vgv ?? 0;
      if (!projectedVgv) continue;
      result.push({
        _key: `ENT:${ent.erp_id ?? ent.name}`,
        name: ent.name,
        enterprise_id: ent.erp_id ?? null,
        id: ent.erp_id ?? null,
        count: 0, proj_count: 0,
        proj_value_net: 0, proj_value_gross: 0,
        total_value_net: 0, total_value_gross: 0,
        onlyProjectionRow: false,
        realizedVgv: 0,
        projectedVgv,
        projectedUnits: ent.summary?.projected_units ?? 0,
        achievementPct: 0,
        status: 'no_sales',
      });
    }

    return result.sort((a, b) => b.realizedVgv - a.realizedVgv);
  }
});

// ── % Atingida por linha (respeita modo de meta units|vgv) ───────────────
// Distratos são subtraídos via contractsStore.distratoCountForRow para alinhar
// com a tabela (effectiveAchievementPct no EnterpriseComparisonTable).
function rowEffectivePct(row, useNet) {
  const eid = row.enterprise_id ?? row.id ?? null;
  const mode = goalStore.modeForEnterprise(eid);
  if (mode === 'units') {
    const projected = row.projectedUnits || 0;
    if (projected <= 0) return null;
    const effectiveCount = (row.count || 0) > 0 ? (row.count || 0) : (row.proj_count || 0);
    const realized = Math.max(0, effectiveCount - contractsStore.distratoCountForRow(row));
    return (realized / projected) * 100;
  }
  const projectedVgv = row.projectedVgv || 0;
  if (projectedVgv <= 0) return null;
  const baseReal = useNet ? (row.total_value_net || 0) : (row.total_value_gross || 0);
  const wfVgv = row.onlyProjectionRow ? 0 : (useNet ? (row.proj_value_net || 0) : (row.proj_value_gross || 0));
  const realizedVgv = baseReal + wfVgv;
  return (realizedVgv / projectedVgv) * 100;
}

// ── Métricas completas ────────────────────────────────────────────────────
// % Atingida e aggregateMode são SEMPRE calculados no nível de empreendimento,
// respeitando o goal-mode individual (units|vgv) configurado para cada um.
// Isso garante que o KPI seja idêntico entre as views Empreendimento e Empresa
// (a regra é por empreendimento — agrupar por empresa não muda o cálculo).
const fullSummaryMetrics = computed(() => {
  const list = combinedData.value;
  const m = contractsStore.metrics;
  const useNet = contractsStore.isNet;

  const projectedVgv = list.reduce((s, e) => s + e.projectedVgv, 0);
  const projectedUnits = list.reduce((s, e) => s + e.projectedUnits, 0);

  // Buckets por mode — ratio de somas (não média ponderada de %s) para evitar
  // o paradoxo de Jensen. Numerador inclui TODAS as vendas (mesmo de órfãos
  // sem projeção) para alinhar com o card "Total de vendas". Denominador
  // só inclui empreendimentos com projeção (que é o que faz sentido como meta).
  let aggregateMode = null;
  // Bucket "units": numerador em UNIDADES, denominador em UNIDADES
  let unitsRealized = 0, unitsProjected = 0, unitsWeightVgv = 0;
  // Bucket "vgv": numerador em REAIS, denominador em REAIS
  let vgvRealized = 0, vgvProjected = 0, vgvWeightVgv = 0;

  // 1) Numerador — soma realizado (em unidades OU vgv) de TODOS os
  //    empreendimentos com vendas, no mode efetivo de cada um.
  for (const entRow of contractsStore.salesByEnterprise) {
    const eid = entRow.enterprise_id != null ? Number(entRow.enterprise_id) : null;
    const mode = goalStore.modeForEnterprise(eid);
    if (mode === 'units') {
      const distratoCount = contractsStore.distratoCountForRow(entRow);
      const effectiveCount = (entRow.count || 0) > 0 ? (entRow.count || 0) : (entRow.proj_count || 0);
      const realizedUnits = Math.max(0, effectiveCount - distratoCount);
      unitsRealized += realizedUnits;
    } else {
      const baseReal = useNet ? (entRow.total_value_net || 0) : (entRow.total_value_gross || 0);
      const wfVgv = entRow.onlyProjectionRow ? 0 : (useNet ? (entRow.proj_value_net || 0) : (entRow.proj_value_gross || 0));
      vgvRealized += baseReal + wfVgv;
    }
  }

  // 2) Denominador — soma projetado SOMENTE dos empreendimentos com projeção.
  //    Determina aggregateMode aqui também (baseado nos com projeção).
  for (const ent of filteredProjEnterprises.value) {
    const projEntVgv = ent.summary?.projected_vgv ?? 0;
    const projEntUnits = ent.summary?.projected_units ?? 0;
    if (projEntVgv <= 0 && projEntUnits <= 0) continue;

    const eid = ent.erp_id != null ? Number(ent.erp_id) : null;
    const mode = goalStore.modeForEnterprise(eid);
    if (aggregateMode == null) aggregateMode = mode;
    else if (aggregateMode !== mode) aggregateMode = 'mixed';

    if (mode === 'units' && projEntUnits > 0) {
      unitsProjected += projEntUnits;
      unitsWeightVgv += projEntVgv;
    } else if (mode !== 'units' && projEntVgv > 0) {
      vgvProjected += projEntVgv;
      vgvWeightVgv += projEntVgv;
    }
  }
  aggregateMode = aggregateMode || goalStore.globalMode || 'vgv';

  // Ratio de somas dentro de cada mode (corretos individualmente).
  const unitsPct = unitsProjected > 0 ? (unitsRealized / unitsProjected) * 100 : null;
  const vgvPct   = vgvProjected   > 0 ? (vgvRealized   / vgvProjected)   * 100 : null;

  // Consolidação entre modes: média ponderada pelo peso em VGV de cada bucket
  // (denominador comum). Quando há só um mode, retorna o ratio puro daquele mode.
  let achievementPct = null;
  if (unitsPct != null && vgvPct != null) {
    const totalW = unitsWeightVgv + vgvWeightVgv;
    achievementPct = totalW > 0
      ? parseFloat(((unitsPct * unitsWeightVgv + vgvPct * vgvWeightVgv) / totalW).toFixed(1))
      : null;
  } else if (unitsPct != null) {
    achievementPct = parseFloat(unitsPct.toFixed(1));
  } else if (vgvPct != null) {
    achievementPct = parseFloat(vgvPct.toFixed(1));
  }
  const avgProjectedTicket = projectedUnits > 0 ? projectedVgv / projectedUnits : 0;

  return {
    ...m,
    projectedVgv, projectedUnits,
    avgProjectedTicket,
    achievementPct,
    aggregateMode,
    timeElapsedPct: projStore.timeElapsedPct ?? 0,
  };
});

const summaryMetrics = computed(() => selectionMetrics.value ?? fullSummaryMetrics.value);

function onSelectionMetrics(m) {
  selectionMetrics.value = m;
}

// ── Ações ─────────────────────────────────────────────────────────────────────
async function loadData(params = {}) {
  loading.value = true;
  try {
    await Promise.all([
      contractsStore.fetchContracts(),
      projStore.fetchReport(params),
    ]);
  } finally {
    loading.value = false;
  }
}

async function handleFilterChange(filters) {
  selectionMetrics.value = null;
  selectedCompanyIds.value = filters.companyIds ?? [];

  contractsStore.setFilters({
    startDate: filters.startDate,
    endDate: filters.endDate,
    situation: 'Emitido',
    companyIds: filters.companyIds ?? [],
    enterpriseName: [],
  });
  loading.value = true;
  try {
    await Promise.all([
      contractsStore.fetchContracts({ force: true }),
      projStore.fetchReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
        situation: 'Emitido',
        companyIds: filters.companyIds ?? [],
      }),
    ]);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  contractsStore.groupBy = 'enterprise';
  goalStore.load();

  const isAdmin = (() => {
    try { return localStorage.getItem('role') === 'admin'; } catch { return false; }
  })();

  await Promise.all([
    contractsStore.fetchCompanies(),
    contractsStore.fetchEnterprises(),
    contractsStore.fetchWorkflowGroups(),
    projStore.fetchProjectionsList(),
    projStore.fetchEnterprises(),
    stageRulesStore.fetchAll(),
    trSatelliteStore.fetchAll(),
    ...(isAdmin ? [hiddenStore.fetchAll()] : []),
  ]);

  const startDate = dayjs().startOf('month').format('YYYY-MM-DD');
  const endDate = dayjs().endOf('month').format('YYYY-MM-DD');
  contractsStore.setFilters({ startDate, endDate, situation: 'Emitido', enterpriseName: [], companyIds: [] });
  await loadData();
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader
        subtitle="Compare as metas projetadas com as vendas realizadas, empreendimento a empreendimento."
        icon="fas fa-bullseye">
        <template #title>
          <span>Vendas × Projeção</span>
          <Favorite :router="'/comercial/sales-projection'" :section="'Vendas x Projeção'" />
        </template>
      </PageHeader>

      <!-- Filtros -->
      <div class="mb-4">
        <ReportFilters @filter-changed="handleFilterChange" />
      </div>

      <!-- Erro -->
      <div v-if="hasError"
        class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>{{ errorMessage }}
        </div>
        <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="loadData()">
          Tentar novamente
        </Button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando relatório de vendas × projeção...</p>
      </div>

      <!-- Conteúdo -->
      <div v-else class="space-y-4">
        <ProjectionMetricsCards :metrics="summaryMetrics" />
        <EnterpriseComparisonTable
          :data="combinedData"
          :time-elapsed-pct="projStore.timeElapsedPct"
          @selection-metrics="onSelectionMetrics"
          @open-detail="openDetail"
          @open-settings="isSettingsOpen = true"
          @open-rules="isRulesOpen = true"
          @open-charts="isChartsOpen = true" />
      </div>
    </PageContainer>

    <!-- Modais -->
    <EnterpriseDetailModal
      v-if="isDetailOpen && detailEnterprise && detailSales.length"
      :enterprise="detailEnterprise"
      :sales="detailSales"
      :projection-row="detailRow"
      :time-elapsed-pct="projStore.timeElapsedPct"
      initial-mode="list"
      @close="isDetailOpen = false" />

    <ProjectionSettingsModal :open="isSettingsOpen" @close="isSettingsOpen = false" />
    <LandSyncConfigModal :open="isRulesOpen" @close="isRulesOpen = false" />

    <!-- Modal de análise gráfica -->
    <ProjectionChartsModal
      :open="isChartsOpen"
      :data="combinedData"
      :metrics="summaryMetrics"
      :time-elapsed-pct="projStore.timeElapsedPct"
      @close="isChartsOpen = false"
      @open-detail="openDetail" />
  </div>
</template>
