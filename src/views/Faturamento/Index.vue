<template>
    <div class="h-full">
        <!-- Header -->
        <div class="px-6 pt-6">
            <div class="flex">
                <h1 class="text-2xl font-bold">Dashboard de Vendas</h1>
                <Favorite class="m-auto" :router="'/comercial/faturamento'" :section="'Faturamento'" />
            </div>
            <p class="mt-1">Acompanhe o desempenho dos empreendimentos</p>
        </div>

        <!-- Filtros -->
        <div class="px-6 py-4">
            <DashboardFilters @filter-changed="handleFilterChange" />
        </div>

        <!-- Error State -->
        <div v-if="contractsStore.error" class="px-6 py-4">
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-800">Erro ao carregar dados: {{ contractsStore.error }}</p>
                <button @click="loadData"
                    class="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Tentar Novamente
                </button>
            </div>
        </div>

        <!-- Dashboard Content -->
        <div v-else class="px-6 pb-6 space-y-6">
            <!-- Métricas Principais -->
            <MetricsCards :metrics="contractsStore.metrics" />

            <!-- Tabela de Empreendimentos com Modal -->
            <EnterprisesSalesTable :data="contractsStore.salesByEnterprise" />
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import Favorite from "@/components/config/Favorite.vue";

// Components
import DashboardFilters from './components/DashboardFilters.vue'
import MetricsCards from './components/MetricsCards.vue'
import EnterprisesSalesTable from './components/EnterprisesSalesTable.vue'

const contractsStore = useContractsStore()

const loadData = async () => {
    await Promise.all([
        contractsStore.fetchContracts(),
        contractsStore.fetchEnterprises()
    ])
}

const handleFilterChange = async () => {
    await contractsStore.fetchContracts()
}

onMounted(() => {
    loadData()
})
</script>