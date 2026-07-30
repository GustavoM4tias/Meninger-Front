<script setup>
import { onMounted, ref, computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore';
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore';
import { useEnterpriseValueRulesStore } from '@/stores/Comercial/Contracts/enterpriseValueRulesStore';
import { useTrSatelliteStore } from '@/stores/Comercial/Contracts/trSatelliteStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Button from '@/components/UI/Button.vue';

import DashboardFilters from './components/DashboardFilters.vue';
import MetricsCards from './components/MetricsCards.vue';
import EnterprisesSalesTable from './components/EnterprisesSalesTable.vue';
import LandSyncConfigModal from './components/LandSyncConfigModal.vue';
import ClosingModal from './components/ClosingModal.vue';

const contractsStore = useContractsStore();
const hiddenStore = useHiddenEnterprisesStore();
const stageCommissionRulesStore = useStageCommissionRulesStore();
const valueRulesStore = useEnterpriseValueRulesStore();
const trSatelliteStore = useTrSatelliteStore();
const isLandSyncModalOpen = ref(false);
const isClosingModalOpen = ref(false);
const selectionMetrics = ref(null);
const loading = ref(false);

const isAdmin = computed(() => {
  try { return localStorage.getItem('role') === 'admin'; } catch { return false; }
});

const metricsToShow = computed(() => selectionMetrics.value || contractsStore.metrics);

const loadData = async () => {
  loading.value = true;
  // As regras de valor precisam estar carregadas ANTES do primeiro cálculo:
  // elas definem como o VGV de cada empreendimento é somado.
  await Promise.all([
    valueRulesStore.fetchAll(),
    stageCommissionRulesStore.fetchAll(),
    trSatelliteStore.fetchAll(),
    hiddenStore.fetchAll(),
  ]);
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

onMounted(loadData);
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
        <template #actions>
          <PageHelp
            storage-key="faturamento"
            title="Como usar o Dashboard de vendas"
            intro="Esta tela mostra quanto foi vendido no período, somando os contratos do Sienge e as reservas/repasses do CV."
            :steps="[
              'Nos filtros acima, escolha o período e, se quiser, as empresas. Clique em Filtrar para aplicar.',
              { title: 'Escolha o corte', text: 'No topo da tabela, alterne entre ver por Empresa ou por Empreendimento.' },
              { title: 'Entenda o valor', text: 'VGV é o valor da venda sem os descontos da construtora. VGV+DC soma esses descontos de volta. Os cartões e a tabela seguem o modo escolhido.' },
              { title: 'Abra o detalhe', text: 'Clique na linha para ver venda a venda: cliente, unidade, imobiliária e as condições de pagamento.' },
              { title: 'Compare', text: 'Marque as caixas de seleção para recalcular os cartões só com as linhas escolhidas.' },
            ]"
            :tips="[
              'O número verde com + são projeções de reservas/repasses ainda não contratados, somadas à parte.',
              'O marcador âmbar são vendas distratadas depois — elas continuam contando no período, porque na época foram venda.',
              'Exportar gera uma planilha com exatamente o que está na tela.',
            ]"
          />
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
          @open-land-sync="isLandSyncModalOpen = true"
          @open-closing="isClosingModalOpen = true" />
      </div>
    </PageContainer>

    <!-- Modal terreno externo -->
    <LandSyncConfigModal :open="isLandSyncModalOpen" @close="isLandSyncModalOpen = false" />

    <!-- Modal de consolidação (fechamento mensal) — admin -->
    <ClosingModal :open="isClosingModalOpen" @close="isClosingModalOpen = false" />
  </div>
</template>
