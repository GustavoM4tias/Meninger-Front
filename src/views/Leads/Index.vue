<script setup>
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useLeadsStore } from '@/stores/Reports/Lead/leadsStore'

import Favorite from '@/components/config/Favorite.vue'
import Filas from './components/Filas.vue'
import SummaryCards from './components/SummaryCards.vue'
import FiltersBar from './components/FiltersBar.vue'
import LeadsTable from './components/LeadsTable.vue'
import LeadModal from './components/LeadModal.vue'

const store = useLeadsStore()
const { leads, periodo, filas, error, filtros, kpiSituacoes, leadsByEnterprise } = storeToRefs(store)

const modalVisivel = ref(false)
const modalLeads = ref([])
const modalMode = ref('list')

function abrirModal([list, mode]) {
  modalLeads.value = list || []
  modalMode.value = mode || 'list'
  modalVisivel.value = true
}
function buscar() { store.fetchLeads() }

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

onMounted(async () => { await store.fetchFilas(); await store.fetchLeads() })
</script>

<template>
  <div class="h-full relative overflow-hidden">
    <div class="px-6 pt-6">
      <div class="flex">
        <h1 class="text-2xl md:text-2xl font-bold">Relatório de Leads</h1>
        <Favorite class="m-auto" :router="'/comercial/leads'" :section="'Leads'" />
      </div>
      <p class="mt-1">Acompanhe o desempenho dos Leads</p>
    </div>

    <div class="px-6 py-4">
      <FiltersBar v-model:filtros="filtros" :empreendimentos-options="store.empreendimentosOptions"
        :origens-options="store.origensOptions" :situacoes-options="store.situacoesOptions"
        :midias-options="store.midiasOptions" :imobiliarias-options="store.imobiliariasOptions"
        :corretores-options="store.corretoresOptions" @buscar="buscar" @limpar="limpar" />
    </div>

    <div class="px-6 pb-6 space-y-4">
      <!-- KPI dinâmico por situação -->
      <SummaryCards :periodo="periodo" :kpi="kpiSituacoes" @filtrarSituacao="onFiltrarSituacao" />
    </div>

    <div v-if="error" class="px-6 py-4">
      <div class="my-3 p-3 bg-red-500/20 text-red-200 rounded-lg"><i class="fas fa-exclamation-triangle mr-2"></i>{{
        error }}</div>
    </div>

    <div v-else class="px-6 pb-6 space-y-6">
      <!-- Tabela agregada por empreendimento -->
      <LeadsTable :data="leadsByEnterprise" @abrirModal="abrirModal" />
    </div>

    <LeadModal :leads="modalLeads" :visivel="modalVisivel" :initial-mode="modalMode" @fechar="modalVisivel = false" />
    <Filas :filas="filas" class="mt-6" />
  </div>
</template>