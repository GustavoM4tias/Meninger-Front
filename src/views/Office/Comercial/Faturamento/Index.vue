<script setup>
import { ref, computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';

import DashboardFilters from './components/DashboardFilters.vue';
import MetricsCards from './components/MetricsCards.vue';
import EnterprisesSalesTable from './components/EnterprisesSalesTable.vue';
import LandSyncConfigModal from './components/LandSyncConfigModal.vue';
import ClosingModal from './components/ClosingModal.vue';

import Skeleton from '@/components/UI/Skeleton.vue';
// `embedded` = renderizada como guia do Relatório Comercial: esconde só o
// cabeçalho próprio. Nenhuma regra de cálculo muda.
defineProps({ embedded: { type: Boolean, default: false } });

const contractsStore = useContractsStore();
const isLandSyncModalOpen = ref(false);
const isClosingModalOpen = ref(false);
const selectionMetrics = ref(null);
// Nasce carregando: a busca só dispara no 'ready' dos filtros (uma volta de
// evento depois do mount), e com `false` a tela pintava os cartões zerados
// nesse intervalo - num dashboard de vendas, zero é um número que engana.
const loading = ref(true);

const metricsToShow = computed(() => selectionMetrics.value || contractsStore.metrics);

const loadData = async () => {
  loading.value = true;
  try {
    // As regras de valor continuam obrigatórias antes do primeiro cálculo, mas
    // quem garante isso é o `ensureRules()` awaitado DENTRO do fetchContracts.
    // Carregá-las aqui numa onda própria só empurrava a consulta pesada para
    // depois de quatro idas ao servidor - agora tudo sai junto.
    await Promise.all([
      contractsStore.fetchContracts(),
      contractsStore.fetchEnterprises(),
      contractsStore.fetchWorkflowGroups(),
    ]);
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = async () => {
  await contractsStore.fetchContracts();
};
</script>

<template>
  <div class="relative" :class="!embedded && 'min-h-[calc(100vh-3.5rem)]'">
    <PageContainer size="full" :class="embedded && '!pt-0'">

      <!-- Header — sai quando a tela roda dentro do Relatório Comercial, que
           já tem o seu próprio cabeçalho e a barra de guias. -->
      <PageHeader
        v-if="!embedded"
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
              'O marcador azul \'Ajustada\' são vendas com ajuste contábil: alguém corrigiu a data da instituição financeira ou uma série. O valor mostrado já é o corrigido; passe o mouse no selo para ver o que mudou e por quê.',
              'O selo \'Lead\' no detalhe marca o cliente que entrou por captação nossa, ou seja, o lead NÃO foi cadastrado nos painéis de gestor, corretor ou imobiliária. Passe o mouse para ver origem, mídia e campanha; clique para abrir o lead na tela de Leads.',
              'Exportar gera uma planilha com exatamente o que está na tela.',
            ]"
          />
        </template>
      </PageHeader>

      <!-- Filtros -->
      <div class="mb-4">
        <DashboardFilters @ready="loadData" @filter-changed="handleFilterChange" />
      </div>

      <!-- Erro -->
      <div v-if="contractsStore.error"
        class="mb-4 rounded-xl border border-data-neg/20 bg-data-neg/10 p-4 text-sm text-data-neg flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>
          <span>Erro ao carregar dados: {{ contractsStore.error }}</span>
        </div>
        <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="loadData">
          Tentar novamente
        </Button>
      </div>

      <!-- Loading -->
      <Skeleton v-if="loading" variant="stat" :lines="3" />

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
