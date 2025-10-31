<template>
    <div class="p-4 rounded-lg shadow bg-white dark:bg-gray-800">
        <div class="flex flex-wrap items-end gap-4">
            <!-- Data Inicial -->
            <div class="flex-1 min-w-32">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-day mr-1"></i>Data Início
                </label>
                <input v-model="localFilters.startDate" type="date"
                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-600 text-center" />
            </div>

            <!-- Data Final -->
            <div class="flex-1 min-w-32">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-check mr-1"></i>Data Fim
                </label>
                <input v-model="localFilters.endDate" type="date"
                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-600 text-center" />
            </div>

            <!-- Situação -->
            <div class="flex-1 min-w-32">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-chart-pie mr-1"></i>Situação
                </label>
                <select v-model="localFilters.situation"
                    class="w-full px-2 py-2 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-600 text-center">
                    <option class="text-gray-600" value="">Todas</option>
                    <option class="text-gray-600" value="Emitido">Emitido</option>
                    <option class="text-gray-600" value="Autorizado">Autorizado</option>
                    <option class="text-gray-600" value="Cancelado">Cancelado</option>
                </select>
            </div>

            <!-- Empreendimentos com seu MultiSelector -->
            <div class="flex-1 max-w-full">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-city mr-1"></i>Empreendimento(s)
                </label>

                <!-- O MultiSelector trabalha com modelValue e update:modelValue -->
                <MultiSelector :model-value="localFilters.enterpriseName"
                    @update:modelValue="v => localFilters.enterpriseName = Array.isArray(v) ? v : []"
                    :options="enterprisesOptions" placeholder="Selecione empreendimentos" :page-size="150"
                    :select-all="true" />
            </div>

            <!-- Botões -->
            <div class="flex flex-1 gap-4">
                <button @click="clearFilters"
                    class="flex w-full px-4 py-2 text-lg font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none">
                    <i class="fas fa-broom pe-1 my-auto"></i> Limpar
                </button>
                <button @click="applyFilters"
                    class="flex w-full px-4 py-2 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                    <i class="fas fa-filter pe-1 my-auto"></i> Filtrar
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import MultiSelector from '@/components/UI/MultiSelector.vue'

const emit = defineEmits(['filter-changed'])
const contractsStore = useContractsStore()

const localFilters = ref({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    situation: '',
    enterpriseName: [] // agora será um array de strings (nomes)
})

// ✅ passe apenas strings para evitar render JSON
const enterprisesOptions = computed(() =>
    (contractsStore.enterprises || []).map(e => e.name)
)

const isActive = v => Array.isArray(v) ? v.length > 0 : (v !== '' && v != null)
const hasActiveFilters = computed(() =>
    Object.values(localFilters.value).some(isActive)
)

const applyFilters = () => {
    // enterpriseName já é string[]
    contractsStore.setFilters({ ...localFilters.value })
    emit('filter-changed')
}

const clearFilters = () => {
    localFilters.value = {
        startDate: '',
        endDate: '',
        situation: '',
        enterpriseName: []
    }
    contractsStore.clearFilters()
    emit('filter-changed')
}

watch(localFilters, () => {
    if (hasActiveFilters.value) {
        contractsStore.setFilters({ ...localFilters.value })
    }
}, { deep: true })

onMounted(async () => {
    await contractsStore.fetchEnterprises()
})
</script>
