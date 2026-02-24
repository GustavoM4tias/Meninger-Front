<template>
  <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-600 overflow-hidden">

    <!-- Header -->
    <div class="p-6 border-b border-gray-200 dark:border-gray-600">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold">Vendas por Empreendimento</h3>
          <p class="text-sm">Performance de cada empreendimento</p>
        </div>

        <div class="flex items-center gap-2">
          <button v-if="isAdmin"
            class="inline-flex items-center justify-center p-2 rounded-full text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            v-tippy="'Configurar empreendimentos com terreno externo'" @click="emit('open-land-sync')">
            <i class="fas fa-cog"></i>
          </button>

          <!-- VGV / VGV+DC -->
          <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
            <button @click="contractsStore.setValueMode('net')" :class="[
              'px-3 py-1 text-sm font-medium',
              contractsStore.valueMode === 'net'
                ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100'
            ]">
              VGV
            </button>
            <button @click="contractsStore.setValueMode('gross')" :class="[
              'px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700',
              contractsStore.valueMode === 'gross'
                ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100'
            ]">
              VGV+DC
            </button>
          </div>

          <!-- Ações (1..N) -->
          <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
            <button @click="openGroup('list')" :disabled="disabledOpen"
              class="px-3 py-1 text-sm font-medium bg-white dark:bg-gray-600 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
              Listagem
            </button>
            <button @click="openGroup('pie')" :disabled="disabledOpen"
              class="px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-600 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
              Pizza
            </button>
            <button @click="openGroup('bar')" :disabled="disabledOpen"
              class="px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-600 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
              Colunas
            </button>
          </div>

          <!-- GroupBy -->
          <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
            <button @click="contractsStore.setGroupBy('enterprise')" :class="[
              'px-3 py-1 text-sm font-medium',
              contractsStore.groupBy === 'enterprise'
                ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100'
            ]">
              Empreendimento
            </button>
            <button @click="contractsStore.setGroupBy('company')" :class="[
              'px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700',
              contractsStore.groupBy === 'company'
                ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100'
            ]">
              Empresa
            </button>
          </div>

          <button class="text-2xl ps-2" v-tippy="'Exportar Dados'" @click="open = true">
            <i class="fas fa-download"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="sortedData.length === 0" class="p-12 text-center">
      <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <p>Nenhum empreendimento encontrado</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-600">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-10">
              <input type="checkbox" :checked="allVisibleChecked" @change="toggleAllVisible($event)" />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
              {{ contractsStore.groupBy === 'company' ? 'Empresa' : 'Empreendimento' }}
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Vendas</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
              Valor Total <span class="text-gray-400">({{ valueModeLabel }})</span>
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
              Ticket Médio <span class="text-gray-400">({{ valueModeLabel }})</span>
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Ações</th>
          </tr>
        </thead>

        <tbody class="bg-white dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-600">
          <tr v-for="(enterprise, index) in sortedData" :key="enterprise.key" :class="enterprise.onlyProjectionRow
            ? 'bg-green-50/70 dark:bg-green-900/20 hover:bg-green-100/70 dark:hover:bg-green-900/30'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/70'">
            <td class="px-6 py-4">
              <input type="checkbox" :checked="selectedKeys.has(enterprise.key)"
                @change="toggleOne(enterprise.key, $event)" />
            </td>

            <td class="px-6 py-4">
              <div class="flex items-center">
                <div :style="{ backgroundColor: getColor(index) }" class="w-3 h-3 rounded-full mr-3"></div>
                <div class="flex text-sm font-medium line-clamp-2">
                  {{ enterprise.name }}
                  <div v-if="!enterprise.onlyProjectionRow && enterprise.proj_count > 0"
                    class="w-2 h-2 rounded-full ml-2 my-auto cursor-pointer bg-emerald-400 animate-pulse"
                    v-tippy="'Projeção vinculada'" />
                </div>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm font-semibold relative">
                {{ enterprise.count - distratoCount(enterprise) }}

                <span v-if="!enterprise.onlyProjectionRow && enterprise.proj_count"
                  class="font-bold text-emerald-600 absolute -top-3">
                  +{{ enterprise.proj_count }}
                </span>

                <span v-if="!enterprise.onlyProjectionRow && distratoCount(enterprise) > 0"
                  class="font-bold text-red-600 absolute -top-4 right-2" v-tippy="'Distratos (não contabilizados)'">
                  -{{ distratoCount(enterprise) }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm font-semibold text-green-600">
                {{ formatCurrency(baseValue(enterprise)) }}

                <span v-if="!enterprise.onlyProjectionRow && appendedValue(enterprise) > 0"
                  class="text-emerald-600 font-semibold text-xs">
                  <br />+{{ formatCurrency(appendedValue(enterprise)) }}
                </span>

                <span v-if="!enterprise.onlyProjectionRow && distratoValue(enterprise) > 0"
                  class="text-red-600 font-semibold text-xs" v-tippy="'Distratos (não contabilizados)'">
                  <br />-{{ formatCurrency(distratoValue(enterprise)) }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm">
                {{ formatCurrency(ticketMedio(enterprise)) }}
              </div>
            </td>

            <td class="w-fit">
              <div class="flex gap-1 pe-2 justify-center items-center">
                <button @click="openSingle(enterprise, 'list')"
                  class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                  v-tippy="'Relatório de Vendas'">
                  <i class="fas fa-eye"></i>
                </button>
                <button @click="openSingle(enterprise, 'pie')"
                  class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                  v-tippy="'Relatório de Pizza por imobiliária'">
                  <i class="fas fa-chart-pie"></i>
                </button>
                <button @click="openSingle(enterprise, 'bar')"
                  class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                  v-tippy="'Relatório de Barra por imobiliária'">
                  <i class="fas fa-chart-bar"></i>
                </button>
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

  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import EnterpriseDetailModal from './EnterpriseDetailModal.vue'
import Export from '@/components/config/Export.vue'

const props = defineProps({ data: { type: Array, required: true } })
const emit = defineEmits(['open-land-sync', 'selection-metrics'])

const contractsStore = useContractsStore()
const sortBy = ref('value-desc')
const open = ref(false)

/* seleção (usando keys únicas) */
const selectedKeys = ref(new Set())

/* modal */
const showModal = ref(false)
const modalSales = ref([])
const modalTitle = ref('')
const initialMode = ref('list')
const modalEnterprise = ref({ name: '' })

const valueModeLabel = computed(() => contractsStore.valueModeLabel)

const isAdmin = computed(() => {
  try { return localStorage.getItem('role') === 'admin' } catch { return false }
})

const colors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
]

const getColor = (i) => colors[i % colors.length]

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(v || 0)

const appendedValue = (e) => {
  if (e.onlyProjectionRow) return 0
  return contractsStore.valueMode === 'net' ? (e.proj_value_net || 0) : (e.proj_value_gross || 0)
}

const totalCombined = (e) => baseValue(e) + appendedValue(e)

/* ===================== DISTRATO (dashboard) ===================== */
const norm = (v) => String(v ?? '').trim().toLowerCase()

const repasseStatusOfSale = (sale) => {
  const first = sale?.contracts?.[0] || {}
  const r = first?.repasse?.[0]
  if (r) {
    const sr = (r.status_repasse ?? r.statusRepasse ?? '').toString().trim()
    if (sr) return sr
  }
  const res = first?.reserva
  if (res) {
    const srr = (res.status_repasse ?? res.statusRepasse ?? '').toString().trim()
    if (srr) return srr
  }
  return null
}

const saleIsDistrato = (sale) => norm(repasseStatusOfSale(sale)) === 'distrato'

const distratoMetaForRow = (row) => {
  const snapshot = Array.isArray(contractsStore.uniqueSales) ? contractsStore.uniqueSales : []
  const sales = salesForRowFrom(snapshot, row)

  let count = 0
  let value = 0

  for (const s of sales) {
    if (!saleIsDistrato(s)) continue
    if (row.onlyProjectionRow) continue
    count += 1
    value += Number(contractsStore.valuePicker(s) || 0)
  }

  return { count, value }
}

const distratoCount = (row) => distratoMetaForRow(row).count
const distratoValue = (row) => distratoMetaForRow(row).value

const baseValue = (e) => {
  if (e.onlyProjectionRow) {
    return contractsStore.isNet ? Number(e.total_value_net || 0) : Number(e.total_value_gross || 0)
  }
  const base = Number(contractsStore.valuePicker(e) || 0)
  const dv = Number(distratoValue(e) || 0)
  return (Number.isFinite(base) ? base : 0) - (Number.isFinite(dv) ? dv : 0)
}

const ticketMedio = (e) => {
  const denom = (e.count || 0) - distratoCount(e)
  const safeDenom = denom > 0 ? denom : 1
  return baseValue(e) / safeDenom
}

/* ===================== SORT ===================== */
const sortedData = computed(() => {
  const data = [...props.data]
  switch (sortBy.value) {
    case 'count':
      return data.sort(
        (a, b) =>
          ((a.count - distratoCount(a)) + (a.onlyProjectionRow ? 0 : a.proj_count)) -
          ((b.count - distratoCount(b)) + (b.onlyProjectionRow ? 0 : b.proj_count))
      )
    case 'count-desc':
      return data.sort(
        (a, b) =>
          ((b.count - distratoCount(b)) + (b.onlyProjectionRow ? 0 : b.proj_count)) -
          ((a.count - distratoCount(a)) + (a.onlyProjectionRow ? 0 : a.proj_count))
      )
    case 'value':
      return data.sort((a, b) => totalCombined(a) - totalCombined(b))
    case 'value-desc':
    default:
      return data.sort((a, b) => totalCombined(b) - totalCombined(a))
  }
})

/* ===================== seleção ===================== */
const visibleKeys = computed(() => sortedData.value.map((e) => e.key))
const allVisibleChecked = computed(
  () => visibleKeys.value.every((k) => selectedKeys.value.has(k)) && visibleKeys.value.length > 0
)
const disabledOpen = computed(() => props.data.length === 0)

const toggleAllVisible = (evt) => {
  const next = new Set(selectedKeys.value)
  if (evt.target.checked) visibleKeys.value.forEach((k) => next.add(k))
  else visibleKeys.value.forEach((k) => next.delete(k))
  selectedKeys.value = next
}

const toggleOne = (key, evt) => {
  const next = new Set(selectedKeys.value)
  evt.target.checked ? next.add(key) : next.delete(key)
  selectedKeys.value = next
}

/* =====================
   FILTRO CORRETO POR ROW
   ===================== */
const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const salesForRowFrom = (sales, row) => {
  const byCompany = contractsStore.groupBy === 'company'
  const onlyProjRow = !!row.onlyProjectionRow

  const rowCompanyId = toNum(row.company_id ?? row.id ?? null)
  const rowEnterpriseId = toNum(row.enterprise_id ?? row.id ?? null)

  // ✅ lista de empreendimentos permitidos p/ linha de projeção em company
  const allowedEnterpriseIds =
    (byCompany && onlyProjRow && Array.isArray(row.enterpriseIds) && row.enterpriseIds.length > 0)
      ? new Set(row.enterpriseIds.map(Number).filter(Number.isFinite))
      : null

  return (sales || []).filter((sale) => {
    const contracts = Array.isArray(sale?.contracts) ? sale.contracts : []
    if (!contracts.length) return false

    let belongs = false

    if (byCompany) {
      if (rowCompanyId != null) {
        belongs = contracts.some((c) => toNum(c.company_id) === rowCompanyId)
      } else {
        // antes: qualquer company_id null entrava
        // agora: só entra se estiver no(s) empreendimento(s) da linha
        belongs = contracts.some((c) => c.company_id == null)
        if (belongs && allowedEnterpriseIds) {
          belongs = contracts.some((c) => allowedEnterpriseIds.has(Number(c.enterprise_id)))
        }
      }
    } else {
      if (rowEnterpriseId != null) belongs = contracts.some((c) => toNum(c.enterprise_id) === rowEnterpriseId)
      else belongs = false
    }

    if (!belongs) return false

    if (onlyProjRow) return contracts.every((c) => !!c._projection)
    return true
  })
}

/* =====================
   MODAL - SINGLE (CORRIGIDO)
   ===================== */
const openSingle = async (row, mode = 'list') => {
  const dashboardSalesSnapshot = Array.isArray(contractsStore.uniqueSales) ? [...contractsStore.uniqueSales] : []
  const targetSales = salesForRowFrom(dashboardSalesSnapshot, row)

  // ✅ regra: company usa enterpriseIds do próprio row (mais confiável)
  const enterpriseIds =
    (contractsStore.groupBy === 'company' && Array.isArray(row.enterpriseIds) && row.enterpriseIds.length > 0)
      ? [...new Set(row.enterpriseIds.map(Number).filter(Number.isFinite))]
      : [
        ...new Set(
          targetSales
            .flatMap((s) => (s.contracts || []).map((c) => Number(c?.enterprise_id)))
            .filter((id) => Number.isFinite(id) && id > 0)
        )
      ]

  if (enterpriseIds.length > 0) {
    await contractsStore.fetchContracts({ view: 'detail', enterpriseIds })
  } else if (contractsStore.groupBy === 'enterprise' && row.id != null) {
    await contractsStore.fetchContracts({ view: 'detail', enterpriseId: row.id })
  } else {
    await contractsStore.fetchContracts({ view: 'detail' })
  }

  const detailSalesSnapshot = Array.isArray(contractsStore.uniqueSales) ? [...contractsStore.uniqueSales] : []
  modalSales.value = salesForRowFrom(detailSalesSnapshot, row)

  modalTitle.value =
    (contractsStore.groupBy === 'company' ? `Empresa: ${row.name}` : row.name) +
    (row.onlyProjectionRow ? ' • Projeções' : '')

  initialMode.value = mode
  modalEnterprise.value = { ...row, name: modalTitle.value }
  showModal.value = true
}

const saleDedupeKey = (s) => {
  const first = s?.contracts?.[0] || {}
  return [
    s.customer_id ?? '',
    s.unit_id ?? s.unit_name ?? '',
    s.financial_institution_date ?? first.financial_institution_date ?? '',
    (contractsStore.groupBy === 'company'
      ? (first.company_id ?? first.company_name ?? '')
      : (first.enterprise_id ?? first.enterprise_name ?? s.enterprise_name ?? '')
    )
  ].map(v => String(v ?? '').trim()).join('|')
}

const selectedRows = computed(() => {
  if (selectedKeys.value.size === 0) return []
  const keys = selectedKeys.value
  return props.data.filter(r => keys.has(r.key))
})

const selectedSales = computed(() => {
  if (selectedRows.value.length === 0) return []

  const snapshot = Array.isArray(contractsStore.uniqueSales) ? contractsStore.uniqueSales : []
  const dedupe = new Map()

  for (const r of selectedRows.value) {
    const list = salesForRowFrom(snapshot, r)
    for (const s of list) {
      const k = saleDedupeKey(s)
      if (!dedupe.has(k)) dedupe.set(k, s)
    }
  }

  return [...dedupe.values()]
})

const selectionMetricsComputed = computed(() => {
  // sem seleção => null (Dashboard cai nas métricas globais)
  if (selectedSales.value.length === 0) return null

  const sales = selectedSales.value
  const totalSales = sales.length

  const totalValueNet = sales.reduce((sum, s) => sum + (Number(s.total_value_net) || 0), 0)
  const totalValueGross = sales.reduce((sum, s) => sum + (Number(s.total_value_gross) || 0), 0)

  const avgSaleValueNet = totalSales > 0 ? totalValueNet / totalSales : 0
  const avgSaleValueGross = totalSales > 0 ? totalValueGross / totalSales : 0

  const totalContracts = sales.reduce((sum, s) => sum + (Array.isArray(s.contracts) ? s.contracts.length : 0), 0)

  const entSet = new Set()
  for (const s of sales) {
    for (const c of (s.contracts || [])) {
      const eid = Number(c.enterprise_id)
      if (Number.isFinite(eid) && eid > 0) entSet.add(eid)
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

    // opcional (mantém compat com seu objeto atual)
    totalSalesWithProjections: null
  }
})

// emite sempre que seleção / groupBy / uniqueSales mudar
watchEffect(() => {
  emit('selection-metrics', selectionMetricsComputed.value)
})

/* =====================
   MODAL - GROUP (CORRIGIDO + BUG row.id removido)
   ===================== */
const openGroup = async (mode = 'list') => {
  const keysSet =
    selectedKeys.value.size > 0 ? new Set(selectedKeys.value) : new Set(props.data.map((e) => e.key))

  const rows = props.data.filter((r) => keysSet.has(r.key))

  const dashboardSalesSnapshot = Array.isArray(contractsStore.uniqueSales) ? [...contractsStore.uniqueSales] : []

  const allSales = []
  for (const r of rows) allSales.push(...salesForRowFrom(dashboardSalesSnapshot, r))

  const enterpriseIds =
    (contractsStore.groupBy === 'company')
      ? [...new Set(rows.flatMap(r => (r.enterpriseIds || [])).map(Number).filter(Number.isFinite))]
      : [...new Set(allSales.flatMap(s => (s.contracts || []).map(c => Number(c.enterprise_id))).filter(Number.isFinite))]

  if (enterpriseIds.length > 0) {
    await contractsStore.fetchContracts({ view: 'detail', enterpriseIds })
  } else if (contractsStore.groupBy === 'enterprise' && rows.length === 1 && rows[0]?.id != null) {
    // ✅ aqui era o bug: "row" não existe dentro do openGroup
    await contractsStore.fetchContracts({ view: 'detail', enterpriseId: rows[0].id })
  } else {
    await contractsStore.fetchContracts({ view: 'detail' })
  }

  const salesSnapshot = Array.isArray(contractsStore.uniqueSales) ? [...contractsStore.uniqueSales] : []

  const dedupe = new Map()
  for (const r of rows) {
    for (const s of salesForRowFrom(salesSnapshot, r)) {
      const first = s?.contracts?.[0] || {}
      const key =
        [
          s.customer_id ?? '',
          s.unit_id ?? s.unit_name ?? '',
          s.financial_institution_date ?? first.financial_institution_date ?? '',
          (contractsStore.groupBy === 'company'
            ? (first.company_id ?? first.company_name ?? '')
            : (first.enterprise_id ?? first.enterprise_name ?? s.enterprise_name ?? '')
          )
        ]
          .map((v) => String(v ?? '').trim())
          .join('|')

      if (!dedupe.has(key)) dedupe.set(key, s)
    }
  }

  modalSales.value = [...dedupe.values()]
  modalTitle.value =
    rows.length === 1
      ? (contractsStore.groupBy === 'company' ? `Empresa: ${rows[0].name}` : rows[0].name)
      : `Conjunto de ${rows.length} ${contractsStore.groupBy === 'company' ? 'empresas' : 'empreendimentos'}`

  initialMode.value = mode
  modalEnterprise.value = { name: modalTitle.value }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  const ok = contractsStore.restoreDashboardFromCache()
  if (!ok) contractsStore.fetchContracts({ view: 'dashboard' })
}
</script>
