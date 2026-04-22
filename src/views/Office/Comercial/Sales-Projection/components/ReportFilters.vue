<template>
  <div class="p-4 rounded-lg shadow bg-white dark:bg-gray-900">
    <div class="flex flex-wrap items-end gap-4">

      <!-- Mês Início -->
      <div class="flex-1 lg:flex-initial lg:min-w-40">
        <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
          <i class="fas fa-calendar-day mr-1"></i>Mês Início
        </label>
        <input v-model="localStart" type="month"
          class="w-full px-2 py-2 border rounded-md text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 dark:bg-gray-900/60 text-center" />
      </div>

      <!-- Mês Fim -->
      <div class="flex-1 lg:flex-initial lg:min-w-40">
        <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
          <i class="fas fa-calendar-check mr-1"></i>Mês Fim
        </label>
        <input v-model="localEnd" type="month" :min="localStart || undefined"
          class="w-full px-2 py-2 border rounded-md text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 dark:bg-gray-900/60 text-center" />
      </div>

      <!-- Grupos Workflow -->
      <div v-if="groupsOptions.length" class="flex-1 max-w-full">
        <label class="block text-xs font-medium truncate mb-1 text-gray-700 dark:text-gray-300">
          Grupos Workflow (Projeção)
        </label>
        <MultiSelector
          :model-value="localGroupIds"
          @update:modelValue="v => localGroupIds = Array.isArray(v) ? v : []"
          :options="groupsOptions"
          placeholder="Selecione grupos"
          :page-size="200" />
      </div>

      <!-- Empresas (company-based, igual ao Faturamento) -->
      <div class="flex-1 max-w-96">
        <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
          <i class="fas fa-city mr-1"></i>Empresa(s)
        </label>
        <MultiSelector
          :model-value="localCompanyNames"
          @update:modelValue="v => localCompanyNames = Array.isArray(v) ? v : []"
          :options="companiesOptions"
          placeholder="Empresas"
          :page-size="150"
          :select-all="true" />
      </div>

      <!-- Botões -->
      <div class="flex flex-1 gap-4 min-w-[200px]">
        <button @click="clearFilters"
          class="flex w-full px-4 py-2 text-lg font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none">
          <i class="fas fa-broom pe-1 my-auto"></i>
          <span class="text-center w-full">Limpar</span>
        </button>
        <button @click="applyFilters" :disabled="!isValid"
          class="flex w-full px-4 py-2 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none disabled:opacity-50">
          <i class="fas fa-filter pe-1 my-auto"></i>
          <span class="text-center w-full">Filtrar</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import MultiSelector from '@/components/UI/MultiSelector.vue'

const emit = defineEmits(['filter-changed'])
const contractsStore = useContractsStore()

const localStart        = ref(dayjs().format('YYYY-MM'))
const localEnd          = ref(dayjs().format('YYYY-MM'))
const localCompanyNames = ref([])
const localGroupIds     = ref([])

/* ── Companies (same as DashboardFilters in Faturamento) ────────────────── */
const companiesOptions = computed(() =>
  (contractsStore.companies || []).map(c => c.name)
)

const companyIdByName = computed(() => {
  const m = new Map()
  for (const c of contractsStore.companies || []) {
    m.set(c.name, Number(c.id))
  }
  return m
})

/* ── Workflow groups ─────────────────────────────────────────────────────── */
const groupLabelOf = (g) => `${g.tipo === 'reservas' ? 'Reserva' : 'Repasse'} • ${g.nome}`

const groupsOptions = computed(() =>
  (contractsStore.workflowGroups || []).map(groupLabelOf)
)

const groupIdByLabel = computed(() => {
  const m = new Map()
  for (const g of contractsStore.workflowGroups || []) {
    m.set(groupLabelOf(g), Number(g.idgroup))
  }
  return m
})

const isValid = computed(() =>
  !!localStart.value && !!localEnd.value && localStart.value <= localEnd.value
)

function applyFilters() {
  if (!isValid.value) return

  const companyIds = localCompanyNames.value
    .map(n => companyIdByName.value.get(n))
    .filter(id => Number.isFinite(id))

  const groupIds = localGroupIds.value
    .map(lbl => groupIdByLabel.value.get(lbl))
    .filter(n => Number.isFinite(n))

  contractsStore.setSelectedGroups(groupIds)

  const startDate = dayjs(localStart.value + '-01').startOf('month').format('YYYY-MM-DD')
  const endDate   = dayjs(localEnd.value   + '-01').endOf('month').format('YYYY-MM-DD')

  emit('filter-changed', {
    startDate,
    endDate,
    companyIds,
  })
}

function clearFilters() {
  localStart.value        = dayjs().format('YYYY-MM')
  localEnd.value          = dayjs().format('YYYY-MM')
  localCompanyNames.value = []
  localGroupIds.value     = []
  contractsStore.clearFilters()
  contractsStore.setSelectedGroups([])

  emit('filter-changed', {
    startDate:  dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate:    dayjs().endOf('month').format('YYYY-MM-DD'),
    companyIds: [],
  })
}

onMounted(async () => {
  await Promise.all([
    contractsStore.fetchCompanies(),
    contractsStore.fetchWorkflowGroups(),
  ])
})
</script>
