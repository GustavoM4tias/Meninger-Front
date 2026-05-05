<script setup>
import { onMounted, ref, computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore';
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Button from '@/components/UI/Button.vue';

import DashboardFilters from './components/DashboardFilters.vue';
import MetricsCards from './components/MetricsCards.vue';
import EnterprisesSalesTable from './components/EnterprisesSalesTable.vue';
import LandSyncConfigModal from './components/LandSyncConfigModal.vue';

const contractsStore = useContractsStore();
const hiddenStore = useHiddenEnterprisesStore();
const stageCommissionRulesStore = useStageCommissionRulesStore();
const isLandSyncModalOpen = ref(false);
const selectionMetrics = ref(null);
const loading = ref(false);

const isAdmin = computed(() => {
  try { return localStorage.getItem('role') === 'admin'; } catch { return false; }
});

const metricsToShow = computed(() => selectionMetrics.value || contractsStore.metrics);

const loadData = async () => {
  loading.value = true;
  await Promise.all([
    contractsStore.fetchContracts(),
    contractsStore.fetchEnterprises(),
    contractsStore.fetchWorkflowGroups(),
  ]);
  loading.value = false;
};

const handleFilterChange = async () => {
  await contractsStore.fetchContracts();
};

onMounted(() => {
  loadData();
  if (isAdmin.value) hiddenStore.fetchAll();
  stageCommissionRulesStore.fetchAll();
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader
        subtitle="Acompanhe o desempenho dos empreendimentos."
        icon="fas fa-sack-dollar">
        <template #title>
          <span>Dashboard de vendas</span>
          <Favorite :router="'/comercial/faturamento'" :section="'Faturamento'" />
        </template>
      </PageHeader>

      <!-- Filtros -->
      <div class="mb-4">
        <DashboardFilters @filter-changed="handleFilterChange" />
      </div>

      <!-- Erro -->
      <div v-if="contractsStore.error"
        class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>
          <span>Erro ao carregar dados: {{ contractsStore.error }}</span>
        </div>
        <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="loadData">
          Tentar novamente
        </Button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando dados de vendas...</p>
      </div>

      <!-- Conteúdo -->
      <div v-else class="space-y-4">
        <MetricsCards :metrics="metricsToShow" />
        <EnterprisesSalesTable
          :data="contractsStore.salesDashboard"
          @selection-metrics="selectionMetrics = $event"
          @open-land-sync="isLandSyncModalOpen = true" />
      </div>
    </PageContainer>

    <!-- Modal terreno externo -->
    <LandSyncConfigModal :open="isLandSyncModalOpen" @close="isLandSyncModalOpen = false" />
  </div>
</template>
