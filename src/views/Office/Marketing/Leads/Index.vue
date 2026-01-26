<script setup>
import { onMounted, ref, toRef } from 'vue'
import { useLeadsStore } from '@/stores/Marketing/Lead/leadsStore'

import Favorite from '@/components/config/Favorite.vue'
import Filas from './components/Filas.vue'
import SummaryCards from './components/SummaryCards.vue'
import FiltersBar from './components/FiltersBar.vue'
import LeadsTable from './components/LeadsTable.vue'
import LeadModal from './components/LeadModal.vue'

const store = useLeadsStore()

// ✅ Em vez de storeToRefs: faça refs diretas do state
const leads    = toRef(store, 'leads')
const periodo  = toRef(store, 'periodo')
const filas    = toRef(store, 'filas')
const error    = toRef(store, 'error')
const filtros  = toRef(store, 'filtros')

// ✅ Getters como *refs* estáveis (mesma API esperada pelos filhos)
const kpiSituacoes      = toRef(store, 'kpiSituacoes')
const leadsByEnterprise = toRef(store, 'leadsByEnterprise')

const modalVisivel = ref(false)
const modalLeads = ref([])
const modalMode = ref('list')

function abrirModal([list, mode]) {
  modalLeads.value = list || []
  modalMode.value = mode || 'list'
  modalVisivel.value = true
}

function buscar() { store.fetchLeads(true) }

function limpar() {
  Object.assign(filtros.value, {
    nome: '', email: '', telefone: '',
    imobiliaria: [], corretor: [],
    situacao_nome: [], midia_principal: [], origem: [], empreendimento: [],
    data_inicio: '', data_fim: ''
  })
  store.fetchLeads(true)
}
function onFiltrarSituacao(situacao) {
  const set = new Set(filtros.value.situacao_nome || [])
  if (situacao && !set.has(situacao)) set.add(situacao)
  filtros.value.situacao_nome = Array.from(set)
  store.fetchLeads(true)
}

onMounted(async () => {
  await store.fetchFilas()
  await store.fetchLeads(true)
})
</script>

<template>
  <div class="h-full relative overflow-hidden">
    <div class="px-6 pt-6">
      <div class="flex">
        <h1 class="text-2xl md:text-2xl font-bold">Relatório de Leads</h1>
        <Favorite class="m-auto" :router="'/marketing/leads'" :section="'Leads'" />
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

<style scoped>
.group:hover {
  transform: translateX(-18rem);
}
</style>