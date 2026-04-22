<template>
    <div class="h-full">
        <!-- Header -->
        <div class="px-6 pt-6">
            <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold">Dashboard de Vendas</h1>
                <Favorite class="m-auto" :router="'/comercial/faturamento'" :section="'Faturamento'" />
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Acompanhe o desempenho dos empreendimentos.</p>
        </div>

        <!-- Filtros -->
        <div class="px-6 py-4">
            <DashboardFilters @filter-changed="handleFilterChange" />
        </div>

        <!-- Error State -->
        <div v-if="contractsStore.error" class="px-6 py-4">
            <div class="bg-red-500/60 border border-red-200 rounded-lg p-4">
                <p class="text-red-800">Erro ao carregar dados: {{ contractsStore.error }}</p>
                <button @click="loadData"
                    class="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Tentar Novamente
                </button>
            </div>
        </div>

        <div v-if="loading" class="px-6 pb-8 space-y-6 fa-fade [--fa-animation-duration:2s] opacity-75">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full">
                </div>
                <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full">
                </div>
                <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-32 w-full">
                </div>
            </div>

            <div
                class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden h-[80vh]">
            </div>
        </div>


        <!-- Dashboard Content -->
        <div v-else class="px-6 pb-6 space-y-6">
            <!-- Métricas Principais -->
            <MetricsCards :metrics="metricsToShow" />

            <!-- Tabela de Empreendimentos com Modal -->
            <EnterprisesSalesTable :data="contractsStore.salesDashboard" @selection-metrics="selectionMetrics = $event"
                @open-land-sync="isLandSyncModalOpen = true" />
        </div>

        <!-- Modal de configuração de terreno externo -->
        <LandSyncConfigModal :open="isLandSyncModalOpen" @close="isLandSyncModalOpen = false" />
    </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore'
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore'
import Favorite from "@/components/config/Favorite.vue";

// Components
import DashboardFilters from './components/DashboardFilters.vue'
import MetricsCards from './components/MetricsCards.vue'
import EnterprisesSalesTable from './components/EnterprisesSalesTable.vue'
import LandSyncConfigModal from './components/LandSyncConfigModal.vue'

const contractsStore = useContractsStore()
const hiddenStore = useHiddenEnterprisesStore()
const stageCommissionRulesStore = useStageCommissionRulesStore()
const isLandSyncModalOpen = ref(false)
const selectionMetrics = ref(null)
const loading = ref(false)

const isAdmin = computed(() => {
    try { return localStorage.getItem('role') === 'admin' } catch { return false }
})

const metricsToShow = computed(() => selectionMetrics.value || contractsStore.metrics)

const loadData = async () => {
    loading.value = true
    await Promise.all([
        contractsStore.fetchContracts(),
        contractsStore.fetchEnterprises(),
        contractsStore.fetchWorkflowGroups() // opcional
    ])
    loading.value = false
}

const handleFilterChange = async () => {
    await contractsStore.fetchContracts()
}

onMounted(() => {
    loadData()
    // Pre-load filters/rules needed for calculations
    if (isAdmin.value) hiddenStore.fetchAll()
    stageCommissionRulesStore.fetchAll()
})
</script>
