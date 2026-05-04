<script setup>
import { onMounted, ref, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePrecadastrosStore } from '@/stores/Comercial/Precadastros/precadastrosStore'

import Favorite from '@/components/config/Favorite.vue'
import SummaryCards from './components/SummaryCards.vue'
import DashboardCharts from './components/DashboardCharts.vue'
import FiltersBar from './components/FiltersBar.vue'
import PrecadastrosTable from './components/PrecadastrosTable.vue'
import PrecadastroModal from './components/PrecadastroModal.vue'
import { STAGE_GROUPS } from './stages.js'

const store = usePrecadastrosStore()
const route = useRoute()
const router = useRouter()

const precadastros = toRef(store, 'precadastros')
const periodo      = toRef(store, 'periodo')
const error        = toRef(store, 'error')
const filtros      = toRef(store, 'filtros')

const kpiSituacoes = toRef(store, 'kpiSituacoes')
const porEmpreendimento = toRef(store, 'porEmpreendimento')

const ARRAY_FIELDS = ['empresa', 'empreendimento', 'situacao_nome', 'imobiliaria', 'corretor', 'correspondente', 'empresa_correspondente', 'intencao_compra', 'lead_origem']
const STR_FIELDS   = ['nome', 'documento', 'data_inicio', 'data_fim']
const BOOL_FIELDS  = ['only_active', 'with_lead', 'excluir_painel']

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

const showCharts = ref(false)
const loading    = ref(false)
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
    try { await store.fetchPrecadastros(true) }
    finally { loading.value = false }
}

function limpar() {
    Object.assign(filtros.value, {
        nome: '', documento: '',
        empresa: [],
        empreendimento: [], situacao_nome: [],
        imobiliaria: [], corretor: [],
        correspondente: [], empresa_correspondente: [],
        intencao_compra: [],
        lead_origem: [],
        only_active: false, with_lead: false, excluir_painel: false,
        data_inicio: '', data_fim: '',
    })
    router.replace({ query: {} })
    buscar()
}

function onFiltrarSituacao(sit) {
    const set = new Set(filtros.value.situacao_nome || [])
    if (sit && !set.has(sit)) set.add(sit)
    filtros.value.situacao_nome = Array.from(set)
    buscar()
}

function onFiltrarGrupo(g) {
    const items = (kpiSituacoes.value?.items || [])
    const sitsDoGrupo = items.filter(it => {
        const bucket = STAGE_GROUPS.find(b => b.match(it.key))
        return bucket?.key === g.key
    }).map(it => it.key)
    filtros.value.situacao_nome = sitsDoGrupo
    buscar()
}

onMounted(async () => {
    syncFiltersFromUrl()
    loading.value = true
    try {
        await store.fetchPrecadastros(true)
    } finally { loading.value = false }
})
</script>

<template>
    <div class="h-full overflow-y-auto">
        <!-- Header -->
        <div class="px-6 pt-6">
            <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pré-Cadastros</h1>
                <Favorite class="m-auto ml-0" :router="'/comercial/precadastros'" :section="'Pré-Cadastros'" />
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Análise de crédito do funil comercial — etapas, tempo médio, taxa de aprovação por CCA's e produtividade.
            </p>
        </div>

        <!-- Filtros -->
        <div class="px-6 py-4">
            <FiltersBar v-model:filtros="filtros"
                :enterprises-options="store.empreendimentosOptions"
                :situacoes-options="store.situacoesOptions"
                :imobiliarias-options="store.imobiliariasOptions"
                :corretores-options="store.corretoresOptions"
                :correspondentes-options="store.correspondentesOptions"
                :empresas-correspondentes-options="store.empresasCorrespondentesOptions"
                :lead-origens-options="store.leadOrigensOptions"
                @buscar="buscar" @limpar="limpar">
                <template #extra-actions>
                    <button @click="showCharts = !showCharts"
                        v-tippy="showCharts ? 'Voltar para visão geral' : 'Ver dashboard analítico'"
                        :class="['px-4 py-2 rounded-lg font-semibold text-base flex items-center gap-2 transition-all border', showCharts
                            ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:text-purple-600']">
                        <i :class="showCharts ? 'fas fa-table-cells' : 'fas fa-chart-area'"></i>
                        <span class="hidden sm:inline">{{ showCharts ? 'Geral' : 'Dashboard' }}</span>
                    </button>
                </template>
            </FiltersBar>
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

        <!-- Loading skeleton -->
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
            <template v-if="!showCharts">
                <div class="px-6 pb-6 space-y-4">
                    <SummaryCards :periodo="periodo" :kpi="kpiSituacoes"
                        :tempo-medio="store.tempoMedioAnaliseDias"
                        :tempo-medio-finalizar="store.tempoMedioFinalizar"
                        :outcome="store.outcomeBreakdown"
                        @filtrarSituacao="onFiltrarSituacao"
                        @filtrarGrupo="onFiltrarGrupo" />
                </div>
                <div class="px-6 pb-6 space-y-6">
                    <PrecadastrosTable :data="porEmpreendimento" @abrirModal="abrirModal" />
                </div>
            </template>

            <div v-else class="px-6 pb-6">
                <DashboardCharts :precadastros="precadastros"
                    :por-empreendimento="store.porEmpreendimento"
                    :por-empresa-correspondente="store.porEmpresaCorrespondente"
                    :por-mes="store.porMes"
                    @abrirModal="abrirModal" @filtrarSituacao="onFiltrarSituacao" />
            </div>
        </template>

        <PrecadastroModal :precadastros="modalLista" :visivel="modalVisivel"
            :initial-mode="modalMode" @fechar="modalVisivel = false" />
    </div>
</template>
