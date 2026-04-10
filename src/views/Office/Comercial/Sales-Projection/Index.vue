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
        :data="combinedData"
        :time-elapsed-pct="projStore.timeElapsedPct"
        @selection-metrics="onSelectionMetrics" />
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
const projStore      = useSalesProjectionReportStore()

// Padrão: por empreendimento (garante que projeções sem vendas apareçam)
contractsStore.groupBy = 'enterprise'

const loading          = ref(false)
const selectionMetrics = ref(null)

const hasError     = computed(() => !!(contractsStore.error || projStore.error))
const errorMessage = computed(() => contractsStore.error || projStore.error || 'Erro ao carregar relatório.')

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
  if (!realizedVgv)  return 'no_sales'
  if (elapsed === 0) return achievementPct >= 100 ? 'ahead' : 'behind'
  const ratio = achievementPct / elapsed
  if (ratio >= 1.1) return 'ahead'
  if (ratio >= 0.8) return 'on_track'
  if (ratio >= 0.4) return 'behind'
  return 'at_risk'
}

// ── Dados combinados — reage a groupBy, valueMode e ambos os stores ───────────

const combinedData = computed(() => {
  const isCompany = contractsStore.groupBy === 'company'
  const isNet     = contractsStore.isNet

  if (isCompany) {
    // ── Por empresa ──────────────────────────────────────────────────────────
    const salesRows = contractsStore.salesByCompany
    const emap      = contractsStore.enterpriseToCompanyMap

    // Agrega projeções por company_id usando o mapa enterprise → empresa
    const projByCompanyId = new Map()
    for (const ent of (projStore.enterprisesResolved ?? [])) {
      if (!ent.erp_id) continue
      const compInfo = emap.get(Number(ent.erp_id))
      if (!compInfo?.company_id) continue
      const cid  = Number(compInfo.company_id)
      const prev = projByCompanyId.get(cid) ?? { projected_vgv: 0, projected_units: 0 }
      prev.projected_vgv   += ent.summary?.projected_vgv   ?? 0
      prev.projected_units += ent.summary?.projected_units ?? 0
      projByCompanyId.set(cid, prev)
    }

    const result = []
    for (const row of salesRows) {
      if (row.onlyProjectionRow) continue   // projeções workflow por empresa não são vinculadas a projStore, skip intencional
      const cid            = row.company_id != null ? Number(row.company_id) : null
      const proj           = cid != null ? projByCompanyId.get(cid) : null
      const realizedVgv    = isNet ? (row.total_value_net || 0) : (row.total_value_gross || 0)
      const projectedVgv   = proj?.projected_vgv   ?? 0
      const projectedUnits = proj?.projected_units ?? 0
      const achievementPct = projectedVgv > 0
        ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
        : null

      result.push({
        _key:              `COMP:${cid ?? row.name}`,
        name:              row.name,
        count:             row.count,
        total_value_net:   row.total_value_net   || 0,
        total_value_gross: row.total_value_gross || 0,
        realizedVgv,
        projectedVgv,
        projectedUnits,
        achievementPct,
        status: statusOf(realizedVgv, projectedVgv, achievementPct),
      })
    }
    return result.sort((a, b) => b.realizedVgv - a.realizedVgv)

  } else {
    // ── Por empreendimento ───────────────────────────────────────────────────
    const salesRows = contractsStore.salesByEnterprise
    const emap      = contractsStore.enterpriseToCompanyMap
    const seen      = new Set()
    const result    = []

    // Workflow projections chegam com company_id mas sem enterprise_id.
    // salesByEnterprise não consegue ligá-las aos empreendimentos (id = null).
    // Solução: agregar por company_id diretamente de uniqueSales, depois mapear.
    const compProjData = new Map() // company_id → { proj_count, proj_value_net, proj_value_gross }
    for (const s of (contractsStore.uniqueSales ?? [])) {
      const contracts = Array.isArray(s.contracts) ? s.contracts : []
      if (!contracts.length || !contracts.every(c => c._projection)) continue
      const first = contracts[0] || {}
      const cid   = first.company_id != null ? Number(first.company_id) : null
      if (cid == null) continue
      const prev = compProjData.get(cid) ?? { proj_count: 0, proj_value_net: 0, proj_value_gross: 0 }
      prev.proj_count      += 1
      prev.proj_value_net  += Number(s.total_value_net   || 0)
      prev.proj_value_gross += Number(s.total_value_gross || 0)
      compProjData.set(cid, prev)
    }

    // ── Passo 1: linhas reais ────────────────────────────────────────────────
    for (const row of salesRows) {
      if (row.onlyProjectionRow) continue
      const eidStr = String(row.enterprise_id ?? row.id ?? '')
      if (eidStr) seen.add(eidStr)

      const proj           = getProj(row)
      const realizedVgv    = isNet ? (row.total_value_net || 0) : (row.total_value_gross || 0)
      const projectedVgv   = proj?.summary?.projected_vgv   ?? 0
      const projectedUnits = proj?.summary?.projected_units ?? 0
      const achievementPct = projectedVgv > 0
        ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
        : null

      // Busca proj de workflow via company mãe (pois enterprise_id vem null do Sienge)
      const eid      = Number(row.enterprise_id ?? row.id ?? 0)
      const compInfo = emap.get(eid)
      const compProj = compInfo?.company_id != null ? compProjData.get(Number(compInfo.company_id)) : null

      result.push({
        ...row,
        _key:             `ENT:${eidStr || row.name}`,
        enterprise_id:    row.enterprise_id ?? row.id ?? null,
        proj_count:       row.proj_count      || compProj?.proj_count      || 0,
        proj_value_net:   row.proj_value_net  || compProj?.proj_value_net  || 0,
        proj_value_gross: row.proj_value_gross|| compProj?.proj_value_gross|| 0,
        realizedVgv,
        projectedVgv,
        projectedUnits,
        achievementPct,
        status: statusOf(realizedVgv, projectedVgv, achievementPct),
      })
    }

    // ── Passo 2: linhas de projeção pura ────────────────────────────────────
    // A store cria onlyProjectionRow quando a projeção chega sem enterprise_id
    // (workflow), impossibilitando o match por ID. Tentamos mesclar pelo nome
    // na linha real já adicionada; se não houver, criamos linha verde nova.
    for (const row of salesRows) {
      if (!row.onlyProjectionRow) continue
      const eidStr  = String(row.enterprise_id ?? row.id ?? '')
      const rowName = (row.name || '').trim().toUpperCase()

      const existingIdx = result.findIndex(r =>
        !r.onlyProjectionRow && (
          (eidStr && String(r.enterprise_id ?? r.id ?? '') === eidStr) ||
          (!eidStr && (r.name || '').trim().toUpperCase() === rowName)
        )
      )

      if (existingIdx >= 0) {
        // Mescla dados de projeção na linha real existente
        const ex = result[existingIdx]
        ex.proj_count       = (ex.proj_count       || 0) + (row.count            || 0)
        ex.proj_value_net   = (ex.proj_value_net   || 0) + (row.total_value_net  || 0)
        ex.proj_value_gross = (ex.proj_value_gross || 0) + (row.total_value_gross|| 0)
      } else {
        // Sem correspondência → linha verde nova (pipeline de projeção sem venda real)
        if (eidStr) seen.add(eidStr)
        const proj           = getProj(row)
        const projectedVgv   = proj?.summary?.projected_vgv   ?? 0
        const projectedUnits = proj?.summary?.projected_units ?? 0
        // realizedVgv espelha o que baseValue() vai retornar (total_value_net/gross do row)
        // para que "Realizado", "% Atingida" e "Status" sejam consistentes entre si.
        const realizedVgv    = isNet
          ? Number(row.total_value_net  || 0)
          : Number(row.total_value_gross|| 0)
        const achievementPct = projectedVgv > 0
          ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
          : null

        result.push({
          ...row,
          _key:              `ENT:${eidStr || row.name}`,
          enterprise_id:     row.enterprise_id ?? row.id ?? null,
          onlyProjectionRow: true,
          realizedVgv,
          projectedVgv,
          projectedUnits,
          achievementPct,
          status:            statusOf(realizedVgv, projectedVgv, achievementPct),
        })
      }
    }

    // Empreendimentos com projeção mas sem vendas no período
    for (const ent of (projStore.enterprisesResolved ?? [])) {
      if (ent.erp_id && seen.has(String(ent.erp_id))) continue
      const projectedVgv = ent.summary?.projected_vgv ?? 0
      if (!projectedVgv) continue
      result.push({
        _key:              `ENT:${ent.erp_id ?? ent.name}`,
        name:              ent.name,
        enterprise_id:     ent.erp_id ?? null,
        id:                ent.erp_id ?? null,
        count:             0,
        proj_count:        0,
        proj_value_net:    0,
        proj_value_gross:  0,
        total_value_net:   0,
        total_value_gross: 0,
        onlyProjectionRow: false,
        realizedVgv:       0,
        projectedVgv,
        projectedUnits:    ent.summary?.projected_units ?? 0,
        achievementPct:    0,
        status:            'no_sales',
      })
    }
    return result.sort((a, b) => b.realizedVgv - a.realizedVgv)
  }
})

// ── Métricas completas (toda a listagem) ──────────────────────────────────────

const fullSummaryMetrics = computed(() => {
  const list = combinedData.value
  const m    = contractsStore.metrics

  const projectedVgv   = list.reduce((s, e) => s + e.projectedVgv,   0)
  const projectedUnits = list.reduce((s, e) => s + e.projectedUnits, 0)
  const realizedVgv    = list.reduce((s, e) => s + e.realizedVgv,    0)

  const achievementPct     = projectedVgv > 0
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

  await Promise.all([
    contractsStore.fetchEnterprises(),
    contractsStore.fetchWorkflowGroups(),
    projStore.fetchProjectionsList(),
    projStore.fetchEnterprises(),
  ])

  const startDate = dayjs().startOf('month').format('YYYY-MM-DD')
  const endDate   = dayjs().endOf('month').format('YYYY-MM-DD')
  contractsStore.setFilters({ startDate, endDate, situation: 'Emitido', enterpriseName: [] })
  await loadData()
})
</script>
