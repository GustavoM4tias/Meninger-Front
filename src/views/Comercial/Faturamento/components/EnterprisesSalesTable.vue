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
          <!-- VGV / VGV+DC -->
          <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
            <button @click="contractsStore.setValueMode('net')"
              :class="['px-3 py-1 text-sm font-medium', contractsStore.valueMode === 'net' ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100']">
              VGV
            </button>
            <button @click="contractsStore.setValueMode('gross')"
              :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', contractsStore.valueMode === 'gross' ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100']">
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

          <!-- Ordenação -->
          <button @click="sortBy = sortBy === 'count' ? 'count-desc' : 'count'"
            :class="['px-3 py-1 rounded-md text-sm font-medium transition-colors', sortBy.includes('count') ? 'bg-blue-100 text-blue-700' : 'hover:text-gray-900 dark:hover:text-white']">
            Quantidade
            <i v-if="sortBy === 'count'" class="fas fa-chevron-up"></i>
            <i v-else-if="sortBy === 'count-desc'" class="fas fa-chevron-down"></i>
          </button>
          <button @click="sortBy = sortBy === 'value' ? 'value-desc' : 'value'"
            :class="['px-3 py-1 rounded-md text-sm font-medium transition-colors', sortBy.includes('value') ? 'bg-blue-100 text-blue-700' : 'hover:text-gray-900 dark:hover:text-white']">
            Valor
            <i v-if="sortBy === 'value'" class="fas fa-chevron-up"></i>
            <i v-else-if="sortBy === 'value-desc'" class="fas fa-chevron-down"></i>
          </button>

          <button class="text-2xl ps-2" v-tippy="'Exportar Dados'" @click="open = true"><i class="fas fa-download"></i></button>
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
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Empreendimento</th>
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
          <tr
            v-for="(enterprise, index) in sortedData"
            :key="enterprise.key"
            :class="enterprise.onlyProjectionRow
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
                  <!-- indicador sutil quando há projeção vinculada -->
                  <div v-if="!enterprise.onlyProjectionRow && enterprise.proj_count > 0"
                       class="w-2 h-2 rounded-full ml-2 my-auto cursor-pointer bg-emerald-400 animate-pulse"
                       v-tippy="'Projeção vinculada'"/>
                </div>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm font-semibold relative">
                {{ enterprise.count }}
                <span v-if="!enterprise.onlyProjectionRow && enterprise.proj_count"
                      class="font-bold text-emerald-600 absolute -top-3"> +{{ enterprise.proj_count }}</span>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm font-semibold text-green-600">
                {{ formatCurrency(baseValue(enterprise)) }}
                <span v-if="!enterprise.onlyProjectionRow && appendedValue(enterprise) > 0"
                      class="text-emerald-600 font-semibold text-xs"> <br>+{{ formatCurrency(appendedValue(enterprise)) }}</span>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm">
                {{ formatCurrency(ticketMedio(enterprise)) }}
              </div>
            </td>

            <td class="w-fit">
              <div class="flex gap-1 pe-2 justify-center items-center">
                <button @click="openSingle(enterprise, 'list')" class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors
                   text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                  v-tippy="'Relatório de Vendas'">
                  <i class="fas fa-eye"></i>
                </button>
                <button @click="openSingle(enterprise, 'pie')" class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors
                   text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                  v-tippy="'Relatório de Pizza por imobiliária'">
                  <i class="fas fa-chart-pie"></i>
                </button>
                <button @click="openSingle(enterprise, 'bar')" class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors
                   text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                  v-tippy="'Relatório de Barra por imobiliária'">
                  <i class="fas fa-chart-bar"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Export
      v-model="open"
      :source="sortedData"
      title="Exportação de vendas"
      filename="Relatório de Faturamento"
      initial-delimiter=";"
      initial-array-mode="join"
      :preselect="[]" />

    <EnterpriseDetailModal
      v-if="showModal"
      :enterprise="{ name: modalTitle }"
      :sales="modalSales"
      :initial-mode="initialMode"
      @close="closeModal" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import EnterpriseDetailModal from './EnterpriseDetailModal.vue'
import Export from '@/components/config/Export.vue'

const props = defineProps({ data: { type: Array, required: true } })

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

const valueModeLabel = computed(() => contractsStore.valueModeLabel)
const valOf = (item) => contractsStore.valuePicker(item)

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1']

// helpers de valor base/apêndice para cada linha
const baseValue = (e) => {
  if (e.onlyProjectionRow) {
    return contractsStore.isNet ? (e.total_value_net || 0) : (e.total_value_gross || 0)
  }
  return contractsStore.valuePicker(e)
}

const appendedValue = (e) => {
  if (e.onlyProjectionRow) return 0
  return contractsStore.valueMode === 'net' ? (e.proj_value_net || 0) : (e.proj_value_gross || 0)
}

const totalCombined = (e) => baseValue(e) + appendedValue(e)

const ticketMedio = (e) => {
  // ticket médio pela base real (mantém compat), sem considerar apêndice
  const denom = e.count || 1
  return baseValue(e) / denom
}

const sortedData = computed(() => {
  const data = [...props.data]
  switch (sortBy.value) {
    case 'count': return data.sort((a, b) => (a.count + (a.onlyProjectionRow ? 0 : a.proj_count)) - (b.count + (b.onlyProjectionRow ? 0 : b.proj_count)))
    case 'count-desc': return data.sort((a, b) => (b.count + (b.onlyProjectionRow ? 0 : b.proj_count)) - (a.count + (a.onlyProjectionRow ? 0 : a.proj_count)))
    case 'value': return data.sort((a, b) => totalCombined(a) - totalCombined(b))
    case 'value-desc':
    default: return data.sort((a, b) => totalCombined(b) - totalCombined(a))
  }
})

const getColor = (i) => colors[i % colors.length]
const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0)

/* seleção */
const visibleKeys = computed(() => sortedData.value.map(e => e.key))
const allVisibleChecked = computed(() => visibleKeys.value.every(k => selectedKeys.value.has(k)) && visibleKeys.value.length > 0)
const disabledOpen = computed(() => props.data.length === 0)

const toggleAllVisible = (evt) => {
  const next = new Set(selectedKeys.value)
  if (evt.target.checked) visibleKeys.value.forEach(k => next.add(k))
  else visibleKeys.value.forEach(k => next.delete(k))
  selectedKeys.value = next
}
const toggleOne = (key, evt) => {
  const next = new Set(selectedKeys.value)
  evt.target.checked ? next.add(key) : next.delete(key)
  selectedKeys.value = next
}

/* filtro de sales para 1..N linhas */
const salesForRow = (row) => {
  const isProjOnly = !!row.onlyProjectionRow
  // enterprise_id preferencial; fallback por nome quando id ausente
  const id = row.id ?? null
  const name = row.name

  return contractsStore.uniqueSales.filter(sale => {
    const contracts = sale.contracts || []
    const first = contracts[0] || {}
    const sameEnterprise =
      (id !== null && first.enterprise_id === id) ||
      (id === null && (first.enterprise_name || sale.enterprise_name) === name)

    if (!sameEnterprise) return false

    if (isProjOnly) {
      // apenas linhas 100% projeção
      return contracts.every(c => c._projection)
    }
    // linha base: inclui vendas REAIS e também projeções vinculadas
    return contracts.some(c => !c._projection) || contracts.every(c => c._projection)
  })
}

/* abrir modal de UMA linha */
const openSingle = (enterprise, mode = 'list') => {
  modalSales.value = salesForRow(enterprise)
  modalTitle.value = enterprise.name + (enterprise.onlyProjectionRow ? ' • Projeções' : '')
  initialMode.value = mode
  showModal.value = true
}

/* abrir modal p/ seleção (se nada marcado, usa todos) */
const openGroup = (mode = 'list') => {
  const keysSet = selectedKeys.value.size > 0
    ? new Set(selectedKeys.value)
    : new Set(props.data.map(e => e.key))

  const rows = props.data.filter(r => keysSet.has(r.key))
  modalSales.value = rows.flatMap(r => salesForRow(r))

  const count = rows.length
  modalTitle.value = count === 1 ? rows[0].name : `Conjunto de ${count} empreendimentos`
  initialMode.value = mode
  showModal.value = true
}

const closeModal = () => { showModal.value = false }
</script>
