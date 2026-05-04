<script setup>
import { onMounted, ref, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReservasStore } from '@/stores/Comercial/Reservas/reservasStore'

import Favorite from '@/components/config/Favorite.vue'
import SummaryCards from './components/SummaryCards.vue'
import FiltersBar from './components/FiltersBar.vue'
import ReservasTable from './components/ReservasTable.vue'
import ReservaModal from './components/ReservaModal.vue'
import { STAGE_GROUPS } from './stages.js'

const store = useReservasStore()
const route = useRoute()
const router = useRouter()

const reservas         = toRef(store, 'reservas')
const periodo          = toRef(store, 'periodo')
const error            = toRef(store, 'error')
const filtros          = toRef(store, 'filtros')
const kpiSituacoes     = toRef(store, 'kpiSituacoes')
const porEmpreendimento = toRef(store, 'porEmpreendimento')

const ARRAY_FIELDS = ['empreendimento', 'etapa', 'bloco', 'unidade', 'situacao', 'status_repasse', 'tipovenda', 'imobiliaria', 'corretor', 'empresa_correspondente', 'lead_origem']
const STR_FIELDS   = ['nome', 'documento', 'data_inicio', 'data_fim']
const BOOL_FIELDS  = ['only_active', 'only_vendida', 'with_lead', 'excluir_painel']

function syncFiltersFromUrl() {
    const q = route.query
    if (!Object.keys(q).length) return
    const next = { ...filtros.value }
    for (const k of ARRAY_FIELDS) next[k] = q[k] ? String(q[k]).split(',').filter(Boolean) : []
    for (const k of STR_FIELDS)   next[k] = q[k] ? String(q[k]) : ''
    for (const k of BOOL_FIELDS)  next[k] = String(q[k]) === 'true'
    Object.assign(filtros.value, next)
}
function syncUrlFromFilters() {
    const q = {}
    Object.entries(filtros.value).forEach(([k, v]) => {
        if (Array.isArray(v)) { if (v.length) q[k] = v.join(',') }
        else if (typeof v === 'boolean') { if (v) q[k] = 'true' }
        else if (v && String(v).trim()) q[k] = String(v).trim()
    })
    router.replace({ query: q })
}

const loading = ref(false)
const modalVisivel = ref(false)
const modalLista = ref([])
const modalMode = ref('list')

function abrirModal([list, mode]) {
    modalLista.value = list || []
    modalMode.value = mode || 'list'
    modalVisivel.value = true
}

async function buscar() {
    syncUrlFromFilters()
    loading.value = true
    try { await store.fetchReservas(true) }
    finally { loading.value = false }
}

function limpar() {
    Object.assign(filtros.value, {
        nome: '', documento: '',
        empreendimento: [], etapa: [], bloco: [], unidade: [],
        situacao: [], status_repasse: [], tipovenda: [],
        imobiliaria: [], corretor: [],
        empresa_correspondente: [],
        lead_origem: [],
        only_active: false, only_vendida: false, with_lead: false, excluir_painel: false,
        data_inicio: '', data_fim: '',
    })
    router.replace({ query: {} })
    buscar()
}

function onFiltrarSituacao(sit) {
    const set = new Set(filtros.value.situacao || [])
    if (sit && !set.has(sit)) set.add(sit)
    filtros.value.situacao = Array.from(set)
    buscar()
}

function onFiltrarGrupo(g) {
    const items = (kpiSituacoes.value?.items || [])
    const sitsDoGrupo = items.filter(it => {
        // bucketOf usa o objeto reserva — aqui só temos a etapa, então finja um obj
        const bucket = STAGE_GROUPS.find(b => b.match({ situacao: { nome: it.key } }))
        return bucket?.key === g.key
    }).map(it => it.key)
    filtros.value.situacao = sitsDoGrupo
    buscar()
}

onMounted(async () => {
    syncFiltersFromUrl()
    loading.value = true
    try { await store.fetchReservas(true) }
    finally { loading.value = false }
})
</script>

<template>
    <div class="h-full overflow-y-auto">
        <!-- Header -->
        <div class="px-6 pt-6">
            <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reservas</h1>
                <Favorite class="m-auto ml-0" :router="'/comercial/reservas-report'" :section="'Reservas'" />
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Funil pós pré-cadastro — etapas do CRM (reservada, em contrato, em repasse, vendida, cancelada).
                <span class="text-xs text-gray-400">Período pela <b>data de cadastro da reserva</b>. "Vendida" aqui é etapa do CRM, não venda concretizada (ver Faturamento).</span>
            </p>
        </div>

        <!-- Filtros -->
        <div class="px-6 py-4">
            <FiltersBar v-model:filtros="filtros"
                :enterprises-options="store.empreendimentosOptions"
                :situacoes-options="store.situacoesOptions"
                :status-repasse-options="store.statusRepasseOptions"
                :tipo-venda-options="store.tipoVendaOptions"
                :imobiliarias-options="store.imobiliariasOptions"
                :corretores-options="store.corretoresOptions"
                :empresas-correspondentes-options="store.empresasCorrespondentesOptions"
                :lead-origens-options="store.leadOrigensOptions"
                @buscar="buscar" @limpar="limpar" />
        </div>

        <!-- Erro -->
        <div v-if="error" class="px-6 pb-6">
            <div class="rounded-2xl border border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 p-6 text-center space-y-3">
                <p class="text-red-600 dark:text-red-400 font-semibold">{{ error }}</p>
                <button @click="buscar()"
                    class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">
                    Tentar novamente
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-else-if="loading" class="px-6 pb-8 space-y-4 fa-fade [--fa-animation-duration:2s] opacity-75">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div v-for="i in 4" :key="i" class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-28"></div>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div v-for="i in 5" :key="i" class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-700 h-28"></div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 h-[60vh]"></div>
        </div>

        <!-- Conteúdo -->
        <template v-else>
            <div class="px-6 pb-6 space-y-4">
                <SummaryCards :periodo="periodo" :kpi="kpiSituacoes"
                    :tempo-medio="store.tempoMedioReservaDias"
                    :tempo-medio-finalizar="store.tempoMedioFinalizar"
                    :outcome="store.outcomeBreakdown"
                    :taxa-conversao="store.taxaConversao"
                    :bucket-counts="store.bucketCounts"
                    @filtrarSituacao="onFiltrarSituacao"
                    @filtrarGrupo="onFiltrarGrupo" />
            </div>
            <div class="px-6 pb-6 space-y-6">
                <ReservasTable :data="porEmpreendimento" @abrirModal="abrirModal" />
            </div>
        </template>

        <ReservaModal :reservas="modalLista" :visivel="modalVisivel"
            :initial-mode="modalMode" @fechar="modalVisivel = false" />
    </div>
</template>
