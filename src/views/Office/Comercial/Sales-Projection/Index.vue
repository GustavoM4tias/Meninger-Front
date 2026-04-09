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
    <div v-else-if="loading" class="px-6 flex flex-col items-center justify-center py-24 gap-3">
      <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p class="text-sm text-gray-500 dark:text-gray-400">Carregando relatório…</p>
    </div>

    <!-- ── Conteúdo ──────────────────────────────────────────────────────────── -->
    <div v-else class="px-6 pb-8 space-y-6">
      <ProjectionMetricsCards :metrics="summaryMetrics" />
      <EnterpriseComparisonTable
        :data="combinedEnterprises"
        :time-elapsed-pct="projStore.timeElapsedPct" />
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import { useSalesProjectionReportStore } from '@/stores/Comercial/Projections/salesProjectionReportStore'
import Favorite from '@/components/config/Favorite.vue'
import ReportFilters from './components/ReportFilters.vue'
import ProjectionMetricsCards from './components/ProjectionMetricsCards.vue'
import EnterpriseComparisonTable from './components/EnterpriseComparisonTable.vue'

const contractsStore = useContractsStore()
const projStore = useSalesProjectionReportStore()

// Esta página sempre agrupa por empreendimento para permitir o cruzamento com projeções
contractsStore.groupBy = 'enterprise'

const loading = ref(false)

const hasError = computed(() => !!(contractsStore.error || projStore.error))
const errorMessage = computed(() =>
  contractsStore.error || projStore.error || 'Erro ao carregar relatório.'
)

// ── Lookups de projeção por erp_id e nome ────────────────────────────────────

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

const getProj = (row) =>
  projByErpId.value.get(String(row.enterprise_id ?? '')) ||
  projByName.value.get((row.name || '').trim().toUpperCase()) ||
  null

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

// ── Dados combinados: vendas reais (contractsStore) + metas (projStore) ──────

const combinedEnterprises = computed(() => {
  const isNet = contractsStore.isNet
  const salesRows = contractsStore.salesByEnterprise

  const seen = new Set()
  const result = []

  for (const row of salesRows) {
    if (row.onlyProjectionRow) continue
    const proj = getProj(row)
    const realizedVgv = isNet ? (row.total_value_net || 0) : (row.total_value_gross || 0)
    const projectedVgv = proj?.summary?.projected_vgv ?? 0
    const achievementPct = projectedVgv > 0
      ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
      : null

    seen.add(String(row.enterprise_id ?? ''))
    result.push({
      enterprise_id:   row.enterprise_id,
      name:            row.name,
      count:           row.count,
      realizedVgv,
      projectedVgv,
      projectedUnits:  proj?.summary?.projected_units ?? 0,
      achievementPct,
      status:          statusOf(realizedVgv, projectedVgv, achievementPct),
    })
  }

  // Empreendimentos com projeção mas sem vendas no período filtrado
  for (const ent of (projStore.enterprisesResolved ?? [])) {
    if (ent.erp_id && seen.has(String(ent.erp_id))) continue
    const projectedVgv = ent.summary?.projected_vgv ?? 0
    if (!projectedVgv) continue
    result.push({
      enterprise_id:  ent.erp_id,
      name:           ent.name,
      count:          0,
      realizedVgv:    0,
      projectedVgv,
      projectedUnits: ent.summary?.projected_units ?? 0,
      achievementPct: 0,
      status:         'no_sales',
    })
  }

  return result.sort((a, b) => b.realizedVgv - a.realizedVgv)
})

// ── Resumo para os cards ──────────────────────────────────────────────────────

const summaryMetrics = computed(() => {
  const list = combinedEnterprises.value
  const m    = contractsStore.metrics

  const projectedVgv = list.reduce((s, e) => s + e.projectedVgv, 0)
  const realizedVgv  = list.reduce((s, e) => s + e.realizedVgv, 0)
  const achievementPct = projectedVgv > 0
    ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
    : null

  return {
    ...m,
    projectedVgv,
    achievementPct,
    timeElapsedPct: projStore.timeElapsedPct ?? 0,
  }
})

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
  contractsStore.setFilters({
    startDate:      filters.startDate,
    endDate:        filters.endDate,
    situation:      'Emitido',
    enterpriseName: filters.enterpriseName ?? [],
  })
  loading.value = true
  try {
    await Promise.all([
      contractsStore.fetchContracts({ force: true }),
      projStore.fetchReport({
        startDate:      filters.startDate,
        endDate:        filters.endDate,
        situation:      'Emitido',
        enterpriseName: filters.enterpriseName ?? [],
      }),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  contractsStore.groupBy = 'enterprise'

  // Carrega metadados em paralelo
  await Promise.all([
    contractsStore.fetchEnterprises(),
    contractsStore.fetchWorkflowGroups(),
    projStore.fetchProjectionsList(),
    projStore.fetchEnterprises(),
  ])

  // Define datas padrão (mês atual) e carrega dados
  const startDate = dayjs().startOf('month').format('YYYY-MM-DD')
  const endDate   = dayjs().endOf('month').format('YYYY-MM-DD')
  contractsStore.setFilters({ startDate, endDate, situation: 'Emitido', enterpriseName: [] })
  await loadData()
})
</script>
