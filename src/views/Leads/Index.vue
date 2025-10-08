<script setup>
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useLeadsStore } from '@/stores/Reports/Lead/leadsStore';

import Favorite from '@/components/config/Favorite.vue';
import Filas from './components/Filas.vue';
import SummaryCards from './components/SummaryCards.vue';
import FiltersBar from './components/FiltersBar.vue';
import LeadsTable from './components/LeadsTable.vue';
import LeadModal from './components/LeadModal.vue';

const store = useLeadsStore();
const {
  leads, count, periodo, filas, carregando, error, filtros,
  kpiTotais, hasFilters,
  empreendimentosOptions, origensOptions, situacoesOptions, midiasOptions,
  imobiliariasOptions, corretoresOptions,
} = storeToRefs(store);

const modalVisivel = ref(false);
const modalLeads = ref([]);

function abrirModal(list) {
  modalLeads.value = list || [];
  modalVisivel.value = true;
}
function buscar() { store.fetchLeads(); }
function limpar() {
  Object.assign(filtros.value, {
    nome: '', email: '', telefone: '',
    imobiliaria: [], corretor: [],
    situacao_nome: [], midia_principal: [], origem: [], empreendimento: [],
    data_inicio: '', data_fim: ''
  });
  store.fetchLeads();
}
function onFiltrarSituacao(situacao) {
  const set = new Set(filtros.value.situacao_nome || []);
  if (situacao && !set.has(situacao)) set.add(situacao);
  filtros.value.situacao_nome = Array.from(set);
  store.fetchLeads();
}

onMounted(async () => {
  await store.fetchFilas();
  await store.fetchLeads();
});
</script>

<template>
  <div class="px-4 py-4 relative overflow-hidden">
    <div class="flex items-center pb-3">
      <h1 class="text-2xl md:text-3xl font-bold">Relatório de Leads</h1>
      <Favorite :router="'/comercial/leads'" :section="'Leads'" />
    </div>

    <SummaryCards :periodo="periodo" :kpi="kpiTotais" @filtrarSituacao="onFiltrarSituacao" />

    <section class="relative bg-gray-300 dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full mx-auto">
      <!-- overlay de loading (evita “pula-pula”) -->
      <div v-show="carregando"
        class="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-10">
        <i class="fas fa-spinner fa-spin text-xl"></i>
      </div>

      <FiltersBar v-model:filtros="filtros" :carregando="carregando" :empreendimentos-options="empreendimentosOptions"
        :origens-options="origensOptions" :situacoes-options="situacoesOptions" :midias-options="midiasOptions"
        :imobiliarias-options="imobiliariasOptions" :corretores-options="corretoresOptions" @buscar="buscar"
        @limpar="limpar" />

      <div class="flex justify-between items-center py-3 border-b border-gray-400/20">
        <div class="flex items-center gap-4">
          <p class="text-sm font-medium">
            Total: <span class="font-bold text-lg">{{ count }}</span> leads
          </p>
          <span v-if="hasFilters" class="text-xs text-gray-200 bg-blue-600 px-2 py-1 rounded">
            Filtros aplicados
          </span>
        </div>
        <button class="text-blue-200 hover:text-blue-100 underline flex items-center gap-2 transition-colors"
          @click="abrirModal(leads)">
          <i class="fas fa-chart-bar"></i> Ver relatório detalhado
        </button>
      </div>

      <!-- reserva de altura para evitar jumps -->
      <div class="min-h-[420px] mt-3">
        <div v-show="!!error" class="my-3 p-3 bg-red-500/20 text-red-200 rounded-lg">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          {{ error }}
        </div>

        <LeadsTable v-show="!error" :leads="leads" @abrirModal="abrirModal" />
      </div>

      <LeadModal :leads="modalLeads" :visivel="modalVisivel" @fechar="modalVisivel = false" />

    </section>
    <Filas :filas="filas" class="mt-6" />
  </div>
</template>

<style scoped>
.group:hover {
  transform: translateX(-18rem);
}
</style>
