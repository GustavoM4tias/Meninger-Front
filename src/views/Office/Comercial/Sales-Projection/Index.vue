<template>
  <div class="h-full overflow-y-auto">

    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <div class="px-6 pt-6">
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Vendas × Projeção</h1>
        <Favorite :router="'/comercial/sales-projection'" :section="'Vendas x Projeção'" class="m-auto ml-0" />
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Compare as metas projetadas com as vendas realizadas, empreendimento a empreendimento.
      </p>
    </div>

    <!-- ── Filtros ───────────────────────────────────────────────────────────── -->
    <div class="px-6 py-4">
      <ReportFilters @filter-changed="handleFilterChange" />
    </div>

    <!-- ── Erro ──────────────────────────────────────────────────────────────── -->
    <div v-if="hasError" class="px-6 pb-6">
      <div class="rounded-2xl border border-red-200 dark:border-red-700/50
                  bg-red-50 dark:bg-red-900/20 p-6 text-center space-y-3">
        <p class="text-red-600 dark:text-red-400 font-semibold">{{ errorMessage }}</p>
        <button @click="loadData()"
          class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">
          Tentar novamente
        </button>
      </div>
    </div>

    <!-- ── Carregando ────────────────────────────────────────────────────────── -->
    <div v-else-if="loading" class="px-6 pb-8 space-y-6 fa-fade [--fa-animation-duration:2s] opacity-75">
      <div class="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full"></div>
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full"></div>
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full"></div>
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full"></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full"></div>
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full"></div>
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full"></div>
      </div>

      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden h-[80vh]">
      </div>
    </div>

    <!-- ── Conteúdo ──────────────────────────────────────────────────────────── -->
    <div v-else class="px-6 pb-8 space-y-6">
      <ProjectionMetricsCards :metrics="summaryMetrics" />
      <EnterpriseComparisonTable
        :data="combinedData"
        :time-elapsed-pct="projStore.timeElapsedPct"
        @selection-metrics="onSelectionMetrics"
        @open-detail="openDetail"
        @open-settings="isSettingsOpen = true"
        @open-rules="isRulesOpen = true" />
    </div>

  </div>

  <!-- ── Modal de detalhes (mesmo do Faturamento + aba Comparação) ─────────── -->
  <EnterpriseDetailModal v-if="isDetailOpen && detailEnterprise && detailSales.length" :enterprise="detailEnterprise"
    :sales="detailSales" :projection-row="detailRow" :time-elapsed-pct="projStore.timeElapsedPct" initial-mode="list"
    @close="isDetailOpen = false" />

  <!-- ── Modal de configurações de meta ───────────────────────────────────── -->
  <ProjectionSettingsModal :open="isSettingsOpen" @close="isSettingsOpen = false" />

  <!-- ── Modal de regras (mesmo do Faturamento) ────────────────────────────── -->
  <LandSyncConfigModal :open="isRulesOpen" @close="isRulesOpen = false" />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import { useSalesProjectionReportStore } from '@/stores/Comercial/Projections/salesProjectionReportStore'
import { useProjectionGoalModeStore } from '@/stores/Comercial/Projections/projectionGoalModeStore'
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore'
import Favorite from '@/components/config/Favorite.vue'
import ReportFilters from './components/ReportFilters.vue'
import ProjectionMetricsCards from './components/ProjectionMetricsCards.vue'
import EnterpriseComparisonTable from './components/EnterpriseComparisonTable.vue'
import ProjectionSettingsModal from './components/ProjectionSettingsModal.vue'
import EnterpriseDetailModal from '@/views/Office/Comercial/Faturamento/components/EnterpriseDetailModal.vue'
import LandSyncConfigModal from '@/views/Office/Comercial/Faturamento/components/LandSyncConfigModal.vue'
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore'

const contractsStore  = useContractsStore()
const projStore       = useSalesProjectionReportStore()
const goalStore       = useProjectionGoalModeStore()  // eslint-disable-line no-unused-vars
const stageRulesStore = useStageCommissionRulesStore()
const hiddenStore     = useHiddenEnterprisesStore()

// Padrão: por empreendimento (garante que projeções sem vendas apareçam)
contractsStore.groupBy = 'enterprise'

const loading = ref(false)
const selectionMetrics = ref(null)

// ── Detail modal ──────────────────────────────────────────────────────────────
const isDetailOpen = ref(false)
const detailRow = ref(null)
const detailEnterprise = ref(null)

// ── Settings modal (goal mode) ────────────────────────────────────────────────
const isSettingsOpen = ref(false)

// ── Rules modal (same as Faturamento: hidden enterprises, overrides, commission) ─
const isRulesOpen = ref(false)

// ── Active company filter ─────────────────────────────────────────────────────
const selectedCompanyIds = ref([])

const hasError = computed(() => !!(contractsStore.error || projStore.error))
const errorMessage = computed(() => contractsStore.error || projStore.error || 'Erro ao carregar relatório.')

// ── Sales for detail modal ────────────────────────────────────────────────────
const detailSales = computed(() => {
  const row = detailRow.value
  if (!row) return []
  const eid = row.enterprise_id != null ? Number(row.enterprise_id) : null
  if (eid == null) return []
  return (contractsStore.uniqueSales || []).filter(sale => {
    const contracts = Array.isArray(sale?.contracts) ? sale.contracts : []
    return contracts.some(c => Number(c.enterprise_id) === eid)
  })
})

function openDetail(row) {
  detailRow.value = row
  detailEnterprise.value = {
    name: row.name || 'Empreendimento',
    id: row.enterprise_id ?? row.id ?? null,
    cost_center_code: null,
  }
  isDetailOpen.value = true
}

// ── Lookups de projeção (nível empreendimento) ────────────────────────────────

const projByErpId = computed(() => {
  const map = new Map()
  for (const ent of (projStore.enterprisesResolved ?? [])) {
    if (ent.erp_id != null) map.set(String(ent.erp_id), ent)
  }
  return map
})

const projByName = computed(() => {
  const map = new Map()
  for (const ent of (projStore.enterprisesResolved ?? [])) {
    if (ent.name) map.set(ent.name.trim().toUpperCase(), ent)
  }
  return map
})

function getProj(row) {
  return projByErpId.value.get(String(row.enterprise_id ?? '')) ||
    projByName.value.get((row.name || '').trim().toUpperCase()) ||
    null
}

function statusOf(realizedVgv, projectedVgv, achievementPct) {
  const elapsed = projStore.timeElapsedPct ?? 0
  if (!projectedVgv) return 'no_projection'
  if (!realizedVgv) return 'no_sales'
  if (elapsed === 0) return achievementPct >= 100 ? 'ahead' : 'behind'
  const ratio = achievementPct / elapsed
  if (ratio >= 1.1) return 'ahead'
  if (ratio >= 0.8) return 'on_track'
  if (ratio >= 0.4) return 'behind'
  return 'at_risk'
}

// ── Filter projStore enterprises: hidden + selected company ──────────────────
const filteredProjEnterprises = computed(() => {
  const all = projStore.enterprisesResolved ?? []

  return all.filter(ent => {
    const eid = ent.erp_id != null ? Number(ent.erp_id) : null

    // 1. Hidden enterprises (same rule as contractsStore.uniqueSales)
    if (eid != null && hiddenStore.hiddenIds.has(eid)) return false

    // 2. Company filter — usa company_id que vem direto do relatório de projeção
    if (selectedCompanyIds.value.length) {
      const cid = ent.company_id != null ? Number(ent.company_id) : null
      if (cid != null && !selectedCompanyIds.value.includes(cid)) return false
    }

    return true
  })
})

// ── Dados combinados — reage a groupBy, valueMode e ambos os stores ───────────
//
// REGRA: real+workflow vem 100% do contractsStore (salesByEnterprise / salesByCompany)
// que já tem a lógica de resolução de workflow idêntica ao Faturamento.
// Este computed só adiciona as colunas de meta (projectedVgv / projectedUnits)
// vindas do relatório de projeção (filteredProjEnterprises).

const combinedData = computed(() => {
  const isCompany = contractsStore.groupBy === 'company'
  const isNet     = contractsStore.isNet

  if (isCompany) {
    // ── Por empresa ──────────────────────────────────────────────────────────
    // Meta agregada por company_id (do relatório de projeção)
    const projByCompanyId = new Map()
    const companyNameMap  = new Map()
    for (const ent of filteredProjEnterprises.value) {
      const cid = ent.company_id != null ? Number(ent.company_id) : null
      if (!cid) continue
      const prev = projByCompanyId.get(cid) ?? { projected_vgv: 0, projected_units: 0 }
      prev.projected_vgv   += ent.summary?.projected_vgv   ?? 0
      prev.projected_units += ent.summary?.projected_units ?? 0
      projByCompanyId.set(cid, prev)
      if (!companyNameMap.has(cid) && ent.company_name) companyNameMap.set(cid, ent.company_name)
    }

    const seenCompanyIds = new Set()
    const result = []

    // Passo 1 — linhas do store (já têm real + workflow corretos)
    for (const row of contractsStore.salesByCompany) {
      const cid = row.company_id != null ? Number(row.company_id) : null
      if (cid != null) seenCompanyIds.add(cid)

      const proj          = cid != null ? projByCompanyId.get(cid) : null
      const wfVgv         = isNet ? (row.proj_value_net || 0) : (row.proj_value_gross || 0)
      const realizedVgvBase = isNet ? (row.total_value_net || 0) : (row.total_value_gross || 0)
      // Para linhas só-workflow (count=0, total=0), usa wfVgv como realizado
      const realizedVgv   = realizedVgvBase > 0 ? realizedVgvBase : wfVgv
      const projectedVgv  = proj?.projected_vgv  ?? 0
      const projectedUnits = proj?.projected_units ?? 0
      const achievementPct = projectedVgv > 0
        ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
        : null

      result.push({
        ...row,
        _key: `COMP:${cid ?? row.name}`,
        company_id: cid,
        realizedVgv,
        projectedVgv,
        projectedUnits,
        achievementPct,
        status: statusOf(realizedVgv, projectedVgv, achievementPct),
      })
    }

    // Passo 2 — empresas com meta mas sem nenhuma linha no store
    for (const [cid, proj] of projByCompanyId) {
      if (seenCompanyIds.has(cid)) continue
      if (!proj.projected_vgv) continue
      const name = companyNameMap.get(cid) ?? `Empresa ${cid}`
      result.push({
        _key: `COMP:${cid}`,
        name,
        company_id: cid,
        count: 0,
        proj_count: 0,
        proj_value_net: 0,
        proj_value_gross: 0,
        total_value_net: 0,
        total_value_gross: 0,
        onlyProjectionRow: false,
        realizedVgv: 0,
        projectedVgv: proj.projected_vgv,
        projectedUnits: proj.projected_units,
        achievementPct: 0,
        status: 'no_sales',
      })
    }

    return result.sort((a, b) => b.realizedVgv - a.realizedVgv)

  } else {
    // ── Por empreendimento ───────────────────────────────────────────────────
    const seen   = new Set()
    const result = []

    // Passo 1 — linhas do store (já têm real + workflow mesclados corretamente)
    for (const row of contractsStore.salesByEnterprise) {
      const eidStr = String(row.enterprise_id ?? row.id ?? '')
      if (eidStr) seen.add(eidStr)

      const proj           = getProj(row)
      const realizedVgv    = isNet ? (row.total_value_net || 0) : (row.total_value_gross || 0)
      // Para onlyProjectionRow, realizedVgv vem de total_value_net/gross do próprio row
      const effectiveRealized = row.onlyProjectionRow
        ? (isNet ? Number(row.total_value_net || 0) : Number(row.total_value_gross || 0))
        : realizedVgv
      const projectedVgv   = proj?.summary?.projected_vgv   ?? 0
      const projectedUnits = proj?.summary?.projected_units ?? 0
      const achievementPct = projectedVgv > 0
        ? parseFloat((effectiveRealized / projectedVgv * 100).toFixed(1))
        : null

      result.push({
        ...row,
        _key: `ENT:${eidStr || row.name}`,
        enterprise_id: row.enterprise_id ?? row.id ?? null,
        realizedVgv: effectiveRealized,
        projectedVgv,
        projectedUnits,
        achievementPct,
        status: statusOf(effectiveRealized, projectedVgv, achievementPct),
      })
    }

    // Passo 2 — empreendimentos com meta mas sem linha no store (sem vendas nem workflow)
    for (const ent of filteredProjEnterprises.value) {
      if (ent.erp_id && seen.has(String(ent.erp_id))) continue
      const projectedVgv = ent.summary?.projected_vgv ?? 0
      if (!projectedVgv) continue
      result.push({
        _key: `ENT:${ent.erp_id ?? ent.name}`,
        name: ent.name,
        enterprise_id: ent.erp_id ?? null,
        id: ent.erp_id ?? null,
        count: 0,
        proj_count: 0,
        proj_value_net: 0,
        proj_value_gross: 0,
        total_value_net: 0,
        total_value_gross: 0,
        onlyProjectionRow: false,
        realizedVgv: 0,
        projectedVgv,
        projectedUnits: ent.summary?.projected_units ?? 0,
        achievementPct: 0,
        status: 'no_sales',
      })
    }

    return result.sort((a, b) => b.realizedVgv - a.realizedVgv)
  }
})

// ── Métricas completas (toda a listagem) ──────────────────────────────────────

const fullSummaryMetrics = computed(() => {
  const list     = combinedData.value
  const m        = contractsStore.metrics
  const useNet   = contractsStore.isNet

  const projectedVgv   = list.reduce((s, e) => s + e.projectedVgv,   0)
  const projectedUnits = list.reduce((s, e) => s + e.projectedUnits, 0)

  // VGV realizado = contratos reais (total_value_net/gross) + pipeline workflow
  // (proj_value_net/gross). Usamos esses campos directamente em vez de e.realizedVgv
  // para evitar dupla-contagem nas linhas em que realizedVgv já usa o workflowVgv
  // como fallback (empresas com 0 vendas reais mas com workflow, ex.: VERONA).
  const realizedVgv = list.reduce((s, e) => {
    const baseReal = useNet ? (e.total_value_net  || 0) : (e.total_value_gross  || 0)
    const wfVgv    = useNet ? (e.proj_value_net   || 0) : (e.proj_value_gross   || 0)
    return s + baseReal + wfVgv
  }, 0)

  const achievementPct = projectedVgv > 0
    ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
    : null
  const avgProjectedTicket = projectedUnits > 0 ? projectedVgv / projectedUnits : 0

  return {
    ...m,
    projectedVgv,
    projectedUnits,
    avgProjectedTicket,
    achievementPct,
    timeElapsedPct: projStore.timeElapsedPct ?? 0,
  }
})

// summaryMetrics: usa seleção da tabela se houver, senão o resumo completo
const summaryMetrics = computed(() => selectionMetrics.value ?? fullSummaryMetrics.value)

function onSelectionMetrics(m) {
  selectionMetrics.value = m
}

// ── Ações ─────────────────────────────────────────────────────────────────────

async function loadData(params = {}) {
  loading.value = true
  try {
    await Promise.all([
      contractsStore.fetchContracts(),
      projStore.fetchReport(params),
    ])
  } finally {
    loading.value = false
  }
}

async function handleFilterChange(filters) {
  selectionMetrics.value = null
  selectedCompanyIds.value = filters.companyIds ?? []

  contractsStore.setFilters({
    startDate: filters.startDate,
    endDate: filters.endDate,
    situation: 'Emitido',
    companyIds: filters.companyIds ?? [],
    enterpriseName: [],
  })
  loading.value = true
  try {
    await Promise.all([
      contractsStore.fetchContracts({ force: true }),
      projStore.fetchReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
        situation: 'Emitido',
      }),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  contractsStore.groupBy = 'enterprise'
  goalStore.load()

  const isAdmin = (() => { try { return localStorage.getItem('role') === 'admin' } catch { return false } })()

  await Promise.all([
    contractsStore.fetchCompanies(),
    contractsStore.fetchEnterprises(),
    contractsStore.fetchWorkflowGroups(),
    projStore.fetchProjectionsList(),
    projStore.fetchEnterprises(),
    stageRulesStore.fetchAll(),
    ...(isAdmin ? [hiddenStore.fetchAll()] : []),
  ])

  const startDate = dayjs().startOf('month').format('YYYY-MM-DD')
  const endDate = dayjs().endOf('month').format('YYYY-MM-DD')
  contractsStore.setFilters({ startDate, endDate, situation: 'Emitido', enterpriseName: [], companyIds: [] })
  await loadData()
})
</script>
