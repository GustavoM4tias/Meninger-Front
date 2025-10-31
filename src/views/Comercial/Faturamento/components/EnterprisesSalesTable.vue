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

          <!-- NOVO: Ações de visualização para 1..N empreendimentos -->
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

          <!-- 
              <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
                <button type="button" @click="viewMode = 'list'"
                  :class="['px-3 py-1 text-sm font-medium', viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">
                  Listagem
                </button>
                <button type="button" @click="viewMode = 'pie'"
                  :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', viewMode === 'pie' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">
                  Pizza
                </button>
                <button type="button" @click="viewMode = 'bar'"
                  :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', viewMode === 'bar' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">
                  Colunas
                </button>
              </div> -->

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

          <button class="text-2xl ps-2" v-tippy="'Exportar Dados'" @click="open = true"><i
              class="fas fa-download"></i></button>

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
          <tr v-for="(enterprise, index) in sortedData" :key="enterprise.name"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
            <td class="px-6 py-4">
              <input type="checkbox" :checked="selectedNames.has(enterprise.name)"
                @change="toggleOne(enterprise.name, $event)" />
            </td>

            <td class="px-6 py-4">
              <div class="flex items-center">
                <div :style="{ backgroundColor: getColor(index) }" class="w-3 h-3 rounded-full mr-3"></div>
                <div class="text-sm font-medium line-clamp-2">{{ enterprise.name }}</div>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm font-semibold">{{ enterprise.count }}</div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm font-semibold text-green-600">{{ formatCurrency(displayTotal(enterprise)) }}</div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm">{{ formatCurrency(displayTotal(enterprise) / (enterprise.count || 1)) }}</div>
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

    <Export v-model="open" :source="sortedData" title="Exportação de vendas" filename="Relatório de Faturamento"
      initial-delimiter=";" initial-array-mode="join" :preselect="[]" />

    <!-- Modal único: recebe sales já agregadas e enterprise sintético -->
    <EnterpriseDetailModal v-if="showModal" :enterprise="{ name: modalTitle }" :sales="modalSales"
      :initial-mode="initialMode" @close="closeModal" />
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

// --- EXPORT modal state  handler ---
const open = ref(false)

/* seleção multi */
const selectedNames = ref(new Set())

/* modal control */
const showModal = ref(false)
const modalSales = ref([])      // array de sales filtradas para 1..N empreendimentos
const modalTitle = ref('')      // título sintético
const initialMode = ref('list') // 'list' | 'pie' | 'bar'

const valueModeLabel = computed(() => contractsStore.valueModeLabel)
const valOf = (item) => contractsStore.valuePicker(item)

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1']

const sortedData = computed(() => {
  const data = [...props.data]
  switch (sortBy.value) {
    case 'count': return data.sort((a, b) => a.count - b.count)
    case 'count-desc': return data.sort((a, b) => b.count - a.count)
    case 'value': return data.sort((a, b) => valOf(a) - valOf(b))
    case 'value-desc':
    default: return data.sort((a, b) => valOf(b) - valOf(a))
  }
})

const totalValue = computed(() => props.data.reduce((sum, item) => sum + valOf(item), 0))
const displayTotal = (item) => valOf(item)
const getColor = (i) => colors[i % colors.length]
const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0) 

/* helpers de seleção */
const visibleNames = computed(() => sortedData.value.map(e => e.name))
const allVisibleChecked = computed(() => visibleNames.value.every(n => selectedNames.value.has(n)) && visibleNames.value.length > 0)
const disabledOpen = computed(() => props.data.length === 0) // só desabilita se não houver dados

const toggleAllVisible = (evt) => {
  const next = new Set(selectedNames.value)
  if (evt.target.checked) {
    visibleNames.value.forEach(n => next.add(n))
  } else {
    visibleNames.value.forEach(n => next.delete(n))
  }
  selectedNames.value = next
}
const toggleOne = (name, evt) => {
  const next = new Set(selectedNames.value)
  evt.target.checked ? next.add(name) : next.delete(name)
  selectedNames.value = next
}

/* filtro de sales para 1..N nomes */
const salesForNames = (names) =>
  contractsStore.uniqueSales.filter(sale => names.has(sale.enterprise_name))

/* abrir modal para UMA linha (continua compatível) */
const openSingle = (enterprise, mode = 'list') => {
  const names = new Set([enterprise.name])
  modalSales.value = salesForNames(names)
  modalTitle.value = enterprise.name
  initialMode.value = mode
  showModal.value = true
}

/* abrir modal a partir do cabeçalho para seleção 1..N
   - se nada selecionado, usa TODOS os empreendimentos (conjunto completo) */
const openGroup = (mode = 'list') => {
  const namesSet = selectedNames.value.size > 0
    ? new Set(selectedNames.value)
    : new Set(props.data.map(e => e.name))

  modalSales.value = salesForNames(namesSet)

  const count = namesSet.size
  modalTitle.value = count === 1
    ? [...namesSet][0]
    : `Conjunto de ${count} empreendimentos`

  initialMode.value = mode
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  // mantém seleção após fechar; se quiser limpar, descomente a linha abaixo:
  // selectedNames.value = new Set()
}
</script>
 