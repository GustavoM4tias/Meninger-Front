<template>
    <div class="p-4 rounded-lg shadow bg-white dark:bg-gray-900">
        <div class="flex flex-wrap items-end gap-4">

            <!-- Data Inicial -->
            <div class="flex-1 lg:flex-initial lg:min-w-44">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-day mr-1"></i>Data Início
                </label>
                <input v-model="localFilters.startDate" type="date"
                    class="w-full px-2 py-2 border rounded-md text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 dark:bg-gray-900/60 text-center" />
            </div>

            <!-- Data Final -->
            <div class="flex-1 lg:flex-initial lg:min-w-44">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-check mr-1"></i>Data Fim
                </label>
                <input v-model="localFilters.endDate" type="date"
                    class="w-full px-2 py-2 border rounded-md text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 dark:bg-gray-900/60 text-center" />
            </div>

            <!-- Situação -->
            <!-- <div class="flex-1 min-w-32">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-chart-pie mr-1"></i>Situação
                </label>
                <select v-model="localFilters.situation"
                    class="w-full px-2 py-2 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-600 dark:bg-gray-900/60 text-center">
                    <option class="text-gray-600" value="">Todas</option>
                    <option class="text-gray-600" value="Emitido">Emitido</option>
                    <option class="text-gray-600" value="Autorizado">Autorizado</option>
                    <option class="text-gray-600" value="Cancelado">Cancelado</option>
                </select>
            </div> -->

            <!-- ✅ Grupos de Workflow (agora como strings) -->
            <div v-if="groupsOptions.length" class="flex-1 max-w-full">
                <label class="block text-xs font-medium truncate mb-1">Grupos Workflow (Projeção)</label>
                <MultiSelector class="" :model-value="localFilters.groupIds"
                    @update:modelValue="v => localFilters.groupIds = Array.isArray(v) ? v : []" :options="groupsOptions"
                    placeholder="Selecione grupos" :page-size="200" />
            </div>

            <!-- Empresas com seu MultiSelector -->
            <div class="flex-1 max-w-96">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-city mr-1"></i>Empresa(s)
                </label>

                <MultiSelector :model-value="localFilters.selectedCompanyNames"
                    @update:modelValue="v => localFilters.selectedCompanyNames = Array.isArray(v) ? v : []"
                    :options="companiesOptions" placeholder="Empresas" :page-size="150" :select-all="true" />
            </div>

            <!-- Botões -->
            <div class="flex flex-1 gap-4">
                <button @click="clearFilters"
                    class="flex w-full px-4 py-2 text-lg font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none">
                    <i class="fas fa-broom pe-1 my-auto"></i> <span class="text-center w-full">Limpar</span>
                </button>
                <button @click="applyFilters"
                    class="flex w-full px-4 py-2 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                    <i class="fas fa-filter pe-1 my-auto"></i> <span class="text-center w-full">Filtrar</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import MultiSelector from '@/components/UI/MultiSelector.vue'

const emit = defineEmits(['filter-changed'])
const contractsStore = useContractsStore()
const route = useRoute()
const router = useRouter()

const localFilters = ref({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    situation: '',
    selectedCompanyNames: [],
    // ⚠️ Aqui guardaremos os LABELS selecionados (string[])
    groupIds: []
})

/* Empresas (por company_id) */
const companiesOptions = computed(() =>
    (contractsStore.companies || []).map(c => c.name)
)

/* Mapa nome -> id para converter na hora de filtrar */
const companyIdByName = computed(() => {
    const m = new Map()
    for (const c of contractsStore.companies || []) {
        m.set(c.name, Number(c.id))
    }
    return m
})

/* ---------- GRUPOS: LABELS e MAPEAMENTOS ---------- */
const groupLabelOf = (g) =>
    `${g.tipo === 'reservas' ? 'Reserva' : 'Repasse'} • ${g.nome}`

// Options para o MultiSelector: SOMENTE strings (labels)
const groupsOptions = computed(() =>
    (contractsStore.workflowGroups || []).map(groupLabelOf)
)

// label -> id
const groupIdByLabel = computed(() => {
    const m = new Map()
    for (const g of contractsStore.workflowGroups || []) {
        m.set(groupLabelOf(g), Number(g.idgroup))
    }
    return m
})

/* ---------- URL SYNC ---------- */
function syncFiltersFromUrl() {
    const q = route.query
    if (!Object.keys(q).length) return
    const next = { ...localFilters.value }
    if (q.companyNames) next.selectedCompanyNames = String(q.companyNames).split(',').map(s => s.trim()).filter(Boolean)
    else next.selectedCompanyNames = []
    if (q.groupIds) next.groupIds = String(q.groupIds).split(',').map(s => s.trim()).filter(Boolean)
    else next.groupIds = []
    if (q.startDate) next.startDate = String(q.startDate)
    if (q.endDate) next.endDate = String(q.endDate)
    if (q.situation) next.situation = String(q.situation)
    localFilters.value = next
    emit('filter-changed')
}

function syncUrlFromFilters() {
    const q = {}
    if (localFilters.value.startDate) q.startDate = localFilters.value.startDate
    if (localFilters.value.endDate) q.endDate = localFilters.value.endDate
    if (localFilters.value.situation) q.situation = localFilters.value.situation
    if (localFilters.value.selectedCompanyNames?.length) q.companyNames = localFilters.value.selectedCompanyNames.join(',')
    if (localFilters.value.groupIds?.length) q.groupIds = localFilters.value.groupIds.join(',')
    router.replace({ query: q })
}

/* ---------- APPLY / WATCH: converte labels -> ids ---------- */
const applyFilters = () => {
    // Converte nomes de empresas selecionados em IDs numéricos
    const companyIds = (localFilters.value.selectedCompanyNames || [])
        .map(name => companyIdByName.value.get(name))
        .filter(id => Number.isFinite(id))

    contractsStore.setFilters({
        startDate: localFilters.value.startDate,
        endDate: localFilters.value.endDate,
        situation: localFilters.value.situation,
        companyIds
    })

    // Converte labels de grupos em ids numéricos
    const groupIds = (localFilters.value.groupIds || [])
        .map(lbl => groupIdByLabel.value.get(lbl))
        .filter(n => Number.isFinite(n))

    contractsStore.setSelectedGroups(groupIds)
    syncUrlFromFilters()
    emit('filter-changed')
}

const isActive = v => Array.isArray(v) ? v.length > 0 : (v !== '' && v != null)
const hasActiveFilters = computed(() =>
    Object.values(localFilters.value).some(isActive)
)

watch(localFilters, () => {
    if (!hasActiveFilters.value) return

    const companyIds = (localFilters.value.selectedCompanyNames || [])
        .map(name => companyIdByName.value.get(name))
        .filter(id => Number.isFinite(id))

    contractsStore.setFilters({
        startDate: localFilters.value.startDate,
        endDate: localFilters.value.endDate,
        situation: localFilters.value.situation,
        companyIds
    })

    const groupIds = (localFilters.value.groupIds || [])
        .map(lbl => groupIdByLabel.value.get(lbl))
        .filter(n => Number.isFinite(n))

    contractsStore.setSelectedGroups(groupIds)
}, { deep: true })

const clearFilters = () => {
    localFilters.value = {
        startDate: '',
        endDate: '',
        situation: '',
        selectedCompanyNames: [],
        groupIds: []
    }
    contractsStore.clearFilters()
    router.replace({ query: {} })
    emit('filter-changed')
}

onMounted(async () => {
    await Promise.all([
        contractsStore.fetchCompanies(),
        contractsStore.fetchWorkflowGroups()
    ])
    syncFiltersFromUrl()
    console.log('Contracts Store Value Mode:', contractsStore.valueMode)
})
</script>
