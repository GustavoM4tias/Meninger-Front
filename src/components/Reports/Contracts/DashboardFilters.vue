<template>
    <div class="p-4 rounded-lg shadow bg-white dark:bg-gray-800">
        <div class="flex flex-wrap items-end gap-4">
            <!-- Data Inicial -->
            <div class="flex-1 min-w-32">
                <label class="block text-sm font-medium mb-2">
                    Data Inicial
                </label>
                <input v-model="localFilters.startDate" type="date"
                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-center" />
            </div>

            <!-- Data Final -->
            <div class="flex-1 min-w-32">
                <label class="block text-sm font-medium mb-2">
                    Data Final
                </label>
                <input v-model="localFilters.endDate" type="date"
                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-center" />
            </div>

            <!-- Situação -->
            <div class="flex-1 min-w-32">
                <label class="block text-sm font-medium mb-2">
                    Situação
                </label>
                <select v-model="localFilters.situation"
                    class="w-full px-2 py-2 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-center">
                    <option class="text-gray-600" value="">Todas</option>
                    <option class="text-gray-600" value="Emitido">Emitido</option>
                    <option class="text-gray-600" value="Autorizado">Autorizado</option>
                    <option class="text-gray-600" value="Cancelado">Cancelado</option>
                </select>
            </div>

            <!-- Empreendimentos com PrimeVue MultiSelect -->
            <div class="flex-1 max-w-full">
                <label class="block text-sm font-medium mb-2">
                    Empreendimentos
                </label>
                <MultiSelect v-model="localFilters.enterpriseName" :options="contractsStore.enterprises"
                    optionLabel="name" dataKey="id" filter display="chip" placeholder="Selecione empreendimentos"
                    multiple
                    class="w-full md:w-80 !bg-white dark:!bg-gray-800 !text-gray-600 !rounded-lg !border !border-gray-200 dark:!border-gray-500" />
            </div>

            <!-- Botões -->
            <div class="flex flex-1 gap-4">
                <button @click="applyFilters"
                    class="flex w-full px-4 py-2 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                    <i class="fas fa-filter pe-1 my-auto"></i> Filtrar
                </button>

                <button @click="clearFilters"
                    class="flex w-full px-4 py-2 text-lg font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none">
                    <i class="fas fa-broom pe-1 my-auto"></i> Limpar
                </button>
            </div>
        </div>

    </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import dayjs from 'dayjs';
import { useContractsStore } from '@/stores/Reports/Contracts/contractsStore'
import MultiSelect from 'primevue/multiselect'

const emit = defineEmits(['filter-changed'])
const contractsStore = useContractsStore()

const localFilters = ref({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    situation: '',
    enterpriseName: [] // ← agora é array
})

const hasActiveFilters = computed(() =>
    Object.values(localFilters.value).some(value => value !== '')
)

const applyFilters = () => {
    // Pega só os ids do array de objetos enterpriseName
    const filterData = {
        ...localFilters.value,
        enterpriseName: localFilters.value.enterpriseName.map(e => e.name)
    }

    contractsStore.setFilters(filterData)
    emit('filter-changed')
}

const clearFilters = () => {
    localFilters.value = {
        startDate: '',
        endDate: '',
        situation: '',
        enterpriseName: [] // ← aqui estava incorreto
    }
    contractsStore.clearFilters()
    emit('filter-changed')
}

watch(localFilters, () => {
    if (hasActiveFilters.value) {
        const filterData = {
            ...localFilters.value,
            enterpriseName: localFilters.value.enterpriseName.map(e => e.name)
        }
        contractsStore.setFilters(filterData)
    }
}, { deep: true })


// 🔽 Aqui busca os empreendimentos ao montar
onMounted(async () => {
    await contractsStore.fetchEnterprises()
})

</script>
