<template>
    <Transition name="modal">
        <div v-if="visivel" class="fixed inset-0 z-50 overflow-y-auto" @click="$emit('fechar')">
            <div class="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
                <!-- Overlay -->
                <div class="fixed inset-0 bg-gray-900/60 transition-opacity"></div>

                <!-- Modal -->
                <div class="relative inline-block w-full max-w-7xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-50 dark:bg-gray-800 shadow-xl rounded-2xl"
                    @click.stop>
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="fas fa-chart-line text-2xl text-blue-500"></i>
                                <div>
                                    <h3 class="text-xl font-bold">Relatório Detalhado de Leads</h3>
                                    <p class="text-sm text-gray-500">{{ leads.length }} lead(s) neste relatório</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <!-- Visualização -->
                                <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
                                    <button type="button" @click="viewMode = 'list'"
                                        :class="['px-3 py-1 text-sm font-medium', viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">Listagem</button>
                                    <button type="button" @click="viewMode = 'funnel'"
                                        :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', viewMode === 'funnel' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">Funil</button>
                                    <button type="button" @click="viewMode = 'stacked'"
                                        :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', viewMode === 'stacked' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">Barras</button>
                                    <button type="button" @click="viewMode = 'pie'"
                                        :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', viewMode === 'pie' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">Pizza</button>
                                </div>

                                <!-- Agrupar (para Barras) -->
                                <div v-if="viewMode === 'stacked'"
                                    class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden ml-2">
                                    <button type="button" @click="groupBy = 'date'"
                                        :class="['px-3 py-1 text-sm font-medium', groupBy === 'date' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600']">Data</button>
                                    <button type="button" @click="groupBy = 'enterprise'"
                                        :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', groupBy === 'enterprise' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600']">Empreendimento</button>
                                </div>

                                <!-- Export -->
                                <button class="text-2xl ps-2" v-tippy="'Exportar Dados'" @click="open = true">
                                    <i class="fas fa-download"></i>
                                </button>

                                <!-- Close -->
                                <button type="button" @click="$emit('fechar')"
                                    class="text-dark hover:text-gray-700 ps-3 pt-1 dark:text-white dark:hover:text-blue-100 text-2xl transition-colors">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Filtros rápidos (com drafts + aplicar no botão Filtrar) -->
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40">
                        <div class="flex p-6">
                            <div class="w-full grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label class="block text-xs font-medium mb-1">Empreendimento(s)</label>
                                    <MultiSelector v-model="draftEnterpriseArr" :options="enterpriseOptions"
                                        placeholder="Selecione..." :page-size="200" :select-all="true"
                                        :close-on-outside="true" />
                                </div>

                                <div>
                                    <label class="block text-xs font-medium mb-1">Imobiliária(s)</label>
                                    <MultiSelector v-model="draftBrokerArr" :options="brokerOptions"
                                        placeholder="Selecione..." :page-size="200" :select-all="true"
                                        :close-on-outside="true" />
                                </div>

                                <div>
                                    <label class="block text-xs font-medium mb-1">Corretor(es)</label>
                                    <MultiSelector v-model="draftAgentArr" :options="agentOptions"
                                        placeholder="Selecione..." :page-size="200" :select-all="true"
                                        :close-on-outside="true" />
                                </div>

                                <div>
                                    <label class="block text-xs font-medium mb-1">Situação(ões)</label>
                                    <MultiSelector v-model="draftStatusArr" :options="statusOptions"
                                        placeholder="Selecione..." :page-size="200" :select-all="true"
                                        :close-on-outside="true" />
                                </div>
                            </div>

                            <div class="my-auto mb-0 ps-4 flex gap-2">
                                <button @click="onLimpar"
                                    class="flex w-32 px-4 py-2 text-lg font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none">
                                    <i class="fas fa-broom pe-2 my-auto"></i> Limpar
                                </button>
                                <button @click="onBuscar"
                                    class="flex w-32 px-4 py-2 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                                    <i class="fas fa-filter pe-2 my-auto"></i> Filtrar
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Ações (download/captura) -->
                    <div v-if="viewMode !== 'list'" class="ml-2">
                        <Export v-model="open" :source="leadsFiltrados" title="Exportação de Leads"
                            filename="Relatório de Leads" initial-delimiter=";" initial-array-mode="join" :preselect="[
                                'idlead',
                                'nome',
                                'email',
                                'telefone',
                                'situacao_nome',
                                'midia_principal',
                                'origem',
                                'empreendimento.0.nome',
                                'corretor.nome',
                                'imobiliaria.nome',
                                'data_cad'
                            ]" />
                    </div>

                    <!-- Content -->
                    <div class="max-h=[80vh] overflow-y-auto">
                        <!-- CHART -->
                        <template v-if="viewMode !== 'list'">
                            <div class="p-6">
                                <div class="flex justify-end mt-2">
                                    <ChartActions :filename="`leads-${viewMode}-${groupBy}`" />
                                </div>
                                <div class="min-h-[360px] py-4">
                                    <VChart ref="chartRef" :option="chartOption" autoresize
                                        style="height: 360px; width: 100%;" @click="onChartClick" />
                                </div>
                            </div>
                        </template>

                        <!-- LISTAGEM (compacta) -->
                        <div class="px-6 pb-6">
                            <div v-if="leadsFiltrados.length === 0" class="p-12 text-center">
                                <i class="fas fa-inbox text-5xl text-gray-400"></i>
                                <p class="mt-2">Nenhum lead encontrado</p>
                            </div>

                            <div v-else class="space-y-2">
                                <div v-for="l in leadsFiltrados" :key="l.idlead"
                                    class="bg-white dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700 rounded-lg px-3 py-2 hover:shadow transition-shadow">
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-2">
                                                <h4 class="font-semibold text-sm truncate">{{ l.nome }}</h4>
                                                <span
                                                    :class="['px-2 py-0.5 rounded-full text-[10px] font-medium', getStatusPill(l.situacao_nome)]">
                                                    {{ l.situacao_nome || 'Sem situação' }}
                                                </span>
                                            </div>
                                            <div
                                                class="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-300">
                                                <div class="truncate">
                                                    <i class="fas fa-building mr-1 text-indigo-500"></i>
                                                    <span class="font-medium">Imobiliária: </span>{{ brokerOf(l) }}
                                                </div>
                                                <div class="truncate">
                                                    <i class="fas fa-user mr-1 text-orange-500"></i>
                                                    <span class="font-medium">Corretor: </span>{{ l.corretor?.nome ||
                                                    '—' }}
                                                </div>
                                                <div class="truncate">
                                                    <i class="fas fa-bullhorn mr-1 text-pink-500"></i>
                                                    <span class="font-medium">Mídia: </span>{{ l.midia_principal || '—'
                                                    }}
                                                </div>
                                            </div>
                                            <div v-if="Array.isArray(l.empreendimento) && l.empreendimento.length"
                                                class="mt-1 flex flex-wrap gap-1">
                                                <span v-for="(emp, idx) in l.empreendimento" :key="idx"
                                                    class="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded text-[10px]">
                                                    {{ emp?.nome }}
                                                </span>
                                            </div>
                                        </div>

                                        <div class="flex flex-col items-end gap-1 shrink-0">
                                            <span class="text-[11px] text-gray-500">{{ formatDateHour(l.data_cad)
                                                }}</span>
                                            <div class="flex gap-2">
                                                <a :href="`https://menin.cvcrm.com.br/gestor/comercial/leads/${l.idlead}/administrar?lido=true`"
                                                    target="_blank" class="hover:opacity-80 transition-opacity"
                                                    v-tippy="'Abrir no CV CRM'">
                                                    <img src="/CVLogo.png" alt="CV CRM" class="h-5" />
                                                </a>
                                                <a v-if="l.link_rdstation" :href="l.link_rdstation" target="_blank"
                                                    class="hover:opacity-80 transition-opacity"
                                                    v-tippy="'Abrir no RD Station'">
                                                    <img src="/RDLogo.png" alt="RD Station" class="h-5" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Rodapé simples -->
                                <div class="pt-2 text-sm text-gray-500">
                                    <i class="fas fa-calendar mr-1 text-green-500"></i>
                                    {{ periodoTexto }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- /content -->
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import Export from '@/components/config/Export.vue'
import ChartActions from '@/components/config/ChartActions.vue'
import MultiSelector from '@/components/UI/MultiSelector.vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { FunnelChart, PieChart, BarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, TitleComponent, ToolboxComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([FunnelChart, PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, TitleComponent, ToolboxComponent, CanvasRenderer])

// Props
const props = defineProps({
    leads: { type: Array, required: true },
    visivel: { type: Boolean, required: true },
    initialMode: { type: String, default: 'list' } // 'list' | 'funnel' | 'stacked' | 'pie'
})

const emit = defineEmits(['fechar', 'buscar', 'limpar'])

// --- tema / paletas / helpers de cor
const isDark = computed(() => document.documentElement.classList.contains('dark'))
const txt = computed(() => (isDark.value ? '#E5E7EB' : '#374151'))
const sub = computed(() => (isDark.value ? '#9CA3AF' : '#6B7280'))
const gridLine = computed(() => (isDark.value ? '#374151' : '#E5EEB')) // nota: typo proposital? mantendo seu comportamento
const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1']

// State
const viewMode = ref(['list', 'funnel', 'stacked', 'pie'].includes(props.initialMode) ? props.initialMode : 'list')
const open = ref(false)
const groupBy = ref('date')
const chartRef = ref(null)
const normalizeMode = (m) => (['list', 'funnel', 'stacked', 'pie'].includes(m) ? m : 'list')

// quando o pai trocar initialMode, atualiza o viewMode
watch(() => props.initialMode, (m) => {
    viewMode.value = normalizeMode(m)
})

// toda vez que o modal ficar visível, abra no modo pedido + sincroniza drafts com aplicados
watch(() => props.visivel, (v) => {
    if (v) viewMode.value = normalizeMode(props.initialMode)
    if (v) {
        draftEnterprise.value = new Set(filtroEnterprise.value)
        draftBroker.value = new Set(filtroBroker.value)
        draftAgent.value = new Set(filtroAgent.value)
        draftStatus.value = new Set(filtroStatus.value)
        console.log('[RelatórioLeads] modal aberto → draft sincronizado', {
            empreendimento: Array.from(draftEnterprise.value),
            imobiliaria: Array.from(draftBroker.value),
            corretor: Array.from(draftAgent.value),
            situacao_nome: Array.from(draftStatus.value)
        })
    }
})

// Formatters
const formatDateHour = (d) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleString('pt-BR') } catch { return String(d) }
}
const dateKey = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
const getStatusPill = (status) => {
    const map = {
        'Aguardando Atendimento Corretor': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'Em Atendimento': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Lead Qualificado': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        'Em Negociação': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        'Em Análise de Crédito': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        'Com Reserva': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'Venda Realizada': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Descartado': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        'Novo Lead': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        '1ª Tentativa de Contato': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
        'Atendimento Externo': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    }
    return map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

// helpers
const normalizeOpt = (v) => {
    if (v == null) return ''
    if (typeof v === 'string') return v.trim()
    if (typeof v === 'number') return String(v)
    const candidate = v.value ?? v.label ?? v.nome ?? v.name
    return candidate != null ? String(candidate).trim() : String(v).trim()
}
const setSet = (bagRef, arr) => {
    const next = new Set((Array.isArray(arr) ? arr : []).map(normalizeOpt))
    bagRef.value = next
}

// brokerOf sempre string "limpa"
const brokerOf = (l) => {
    const raw =
        l?.corretor?.imobiliaria?.nome ||
        l?.imobiliaria?.nome ||
        l?.imobiliaria?.nomefantasia ||
        l?.imobiliaria?.razaosocial ||
        l?.imobiliaria?.email ||
        l?.imobiliaria?.cnpj
    return raw ? String(raw).trim() : 'Não informado'
}

/** ========================== ESTADO DE FILTROS ========================== **/

// Aplicados (usados no filtro real)
const filtroStatus = ref(new Set())
const filtroEnterprise = ref(new Set())
const filtroBroker = ref(new Set())
const filtroAgent = ref(new Set())

// Drafts (UI)
const draftStatus = ref(new Set())
const draftEnterprise = ref(new Set())
const draftBroker = ref(new Set())
const draftAgent = ref(new Set())

// PROXIES (Array) para os MultiSelector (v-model)
const draftEnterpriseArr = computed({
    get: () => Array.from(draftEnterprise.value),
    set: (v) => { console.log('[RelatórioLeads] draftEnterpriseArr <-', v); setSet(draftEnterprise, v) }
})
const draftBrokerArr = computed({
    get: () => Array.from(draftBroker.value),
    set: (v) => { console.log('[RelatórioLeads] draftBrokerArr <-', v); setSet(draftBroker, v) }
})
const draftAgentArr = computed({
    get: () => Array.from(draftAgent.value),
    set: (v) => { console.log('[RelatórioLeads] draftAgentArr <-', v); setSet(draftAgent, v) }
})
const draftStatusArr = computed({
    get: () => Array.from(draftStatus.value),
    set: (v) => { console.log('[RelatórioLeads] draftStatusArr <-', v); setSet(draftStatus, v) }
})

const statusOptions = computed(() => {
    const s = new Set((props.leads || []).map(l => (l.situacao_nome || 'Sem Situação')).map(normalizeOpt))
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})
const enterpriseOptions = computed(() => {
    const set = new Set()
    for (const l of props.leads || []) {
        const arr = Array.isArray(l.empreendimento) ? l.empreendimento : []
        if (arr.length) arr.forEach(e => e?.nome && set.add(normalizeOpt(e.nome)))
        else set.add('Sem Empreendimento')
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})
const brokerOptions = computed(() => {
    const set = new Set()
    for (const l of props.leads || []) set.add(normalizeOpt(brokerOf(l)))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})
const agentOptions = computed(() => {
    const set = new Set()
    for (const l of props.leads || []) set.add(normalizeOpt(l?.corretor?.nome || 'Sem Corretor'))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const clearAllFilters = () => {
    // limpa aplicados
    filtroStatus.value = new Set()
    filtroEnterprise.value = new Set()
    filtroBroker.value = new Set()
    filtroAgent.value = new Set()
    // limpa drafts
    draftStatus.value = new Set()
    draftEnterprise.value = new Set()
    draftBroker.value = new Set()
    draftAgent.value = new Set()
    console.log('[RelatórioLeads] clearAllFilters() → tudo limpo')
}

/** ======================== APLICAÇÃO E EXIBIÇÃO ======================== **/

// Aplicação de filtros (usam SOMENTE os filtros aplicados)
const leadsFiltrados = computed(() => {
    return (props.leads || []).filter(l => {
        // status
        if (filtroStatus.value.size && !filtroStatus.value.has(l.situacao_nome || 'Sem Situação')) return false
        // enterprise
        if (filtroEnterprise.value.size) {
            const arr = Array.isArray(l.empreendimento) ? l.empreendimento : []
            const names = arr.length ? arr.map(e => e?.nome?.trim() || 'Sem Empreendimento') : ['Sem Empreendimento']
            if (!names.some(n => filtroEnterprise.value.has(n))) return false
        }
        // broker
        if (filtroBroker.value.size && !filtroBroker.value.has(brokerOf(l))) return false
        // agent
        if (filtroAgent.value.size && !filtroAgent.value.has(l?.corretor?.nome || 'Sem Corretor')) return false
        return true
    })
})

// período textual
const periodoTexto = computed(() => {
    if (!props.leads.length) return '—'
    const arr = props.leads.map(l => new Date(l.data_cad)).filter(d => !isNaN(d)).sort((a, b) => a - b)
    if (!arr.length) return '—'
    const ini = arr[0].toLocaleDateString('pt-BR')
    const fim = arr[arr.length - 1].toLocaleDateString('pt-BR')
    return ini === fim ? ini : `${ini} - ${fim}`
})

// Funil
const countsByStatus = computed(() => {
    const m = new Map()
    for (const l of leadsFiltrados.value) {
        const s = (l.situacao_nome || 'Sem Situação').trim()
        m.set(s, (m.get(s) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
})

// Barras empilhadas – groupBy = 'date'
const allDatesSorted = computed(() => {
    const set = new Set()
    for (const l of leadsFiltrados.value) set.add(dateKey(l.data_cad))
    return Array.from(set).sort()
})

// Barras empilhadas – groupBy = 'enterprise'
const allEnterprisesSorted = computed(() => {
    const set = new Set()
    for (const l of leadsFiltrados.value) {
        const arr = Array.isArray(l.empreendimento) ? l.empreendimento : []
        if (arr.length) arr.forEach(e => e?.nome && set.add(String(e.nome).trim()))
        else set.add('Sem Empreendimento')
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

// ordem de situações (mais frequentes primeiro)
const statusesSorted = computed(() => countsByStatus.value.map(([s]) => s))

// matriz empilhada (genérica)
const makeStackedSeries = (xKeys, xExtractor) => {
    const map = new Map() // eixoX -> status -> count
    for (const l of leadsFiltrados.value) {
        const x = xExtractor(l)
        const s = (l.situacao_nome || 'Sem Situação').trim()
        const m = map.get(x) || new Map()
        m.set(s, (m.get(s) || 0) + 1)
        map.set(x, m)
    }
    return statusesSorted.value.map((status, i) => {
        const data = xKeys.map(x => (map.get(x)?.get(status) || 0))
        return { name: status, type: 'bar', stack: 'total', emphasis: { focus: 'series' }, data, itemStyle: { color: palette[i % palette.length] }, label: { show: false } }
    })
}

// Pizza “inteligente”
const pieLevel = computed(() => {
    const enterprises = allEnterprisesSorted.value
    if (enterprises.length > 1) return 'enterprise'
    const brokers = new Set(leadsFiltrados.value.map(brokerOf)).size
    if (enterprises.length === 1 && brokers > 1) return 'broker'
    return 'agent'
})

const pieData = computed(() => {
    const m = new Map()
    if (pieLevel.value === 'enterprise') {
        for (const l of leadsFiltrados.value) {
            const arr = Array.isArray(l.empreendimento) ? l.empreendimento : []
            const list = arr.length ? arr : [{ nome: 'Sem Empreendimento' }]
            for (const e of list) {
                const name = e?.nome?.trim() || 'Sem Empreendimento'
                m.set(name, (m.get(name) || 0) + 1)
            }
        }
    } else if (pieLevel.value === 'broker') {
        for (const l of leadsFiltrados.value) {
            const name = brokerOf(l)
            m.set(name, (m.get(name) || 0) + 1)
        }
    } else {
        for (const l of leadsFiltrados.value) {
            const name = l?.corretor?.nome || 'Sem Corretor'
            m.set(name, (m.get(name) || 0) + 1)
        }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
})

// ======= ECharts Options =======
const baseTooltip = computed(() => ({
    trigger: 'item',
    confine: true,
    appendToBody: true,
    extraCssText: 'max-width:260px; white-space:normal; font-size:12px; line-height:1.2; padding:6px 8px;'
}))

const chartOption = computed(() => {
    if (viewMode.value === 'funnel') {
        return {
            color: palette,
            tooltip: { ...baseTooltip.value, formatter: p => `${p.name}<br/><b>${p.value}</b> lead(s)` },
            legend: { show: false },
            series: [{
                name: 'Leads por Situação',
                type: 'funnel',
                left: '10%', right: '10%', top: 24, bottom: 12,
                minSize: '10%', maxSize: '80%',
                sort: 'descending',
                gap: 1,
                label: { formatter: '{b}: {c}', color: txt.value, fontSize: 12 },
                itemStyle: { borderColor: 'transparent', borderWidth: 0, borderRadius: 6 },
                data: countsByStatus.value.map(([name, value]) => ({ name, value }))
            }]
        }
    }

    if (viewMode.value === 'stacked') {
        const isEnterprise = groupBy.value === 'enterprise'
        const xKeys = isEnterprise ? allEnterprisesSorted.value : allDatesSorted.value
        const series = isEnterprise
            ? makeStackedSeries(xKeys, l => {
                const arr = Array.isArray(l.empreendimento) ? l.empreendimento : []
                const names = arr.length ? arr.map(e => e?.nome?.trim() || 'Sem Empreendimento') : ['Sem Empreendimento']
                return names[0]
            })
            : makeStackedSeries(xKeys, l => dateKey(l.data_cad))

        return {
            color: palette,
            tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' }, extraCssText: 'max-width:320px; white-space:normal; font-size:12px; line-height:1.2; padding:6px 8px;' },
            legend: { type: 'scroll', textStyle: { color: txt.value, fontSize: 11 } },
            grid: { left: 32, right: 24, top: 48, bottom: 64, containLabel: true },
            dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 20 }],
            xAxis: { type: 'category', data: xKeys, axisLabel: { rotate: 20, fontSize: 11, color: txt.value }, axisLine: { lineStyle: { color: sub.value } } },
            yAxis: { type: 'value', axisLabel: { fontSize: 11, color: txt.value }, splitLine: { lineStyle: { color: gridLine.value } } },
            series
        }
    }

    if (viewMode.value === 'pie') {
        const subtitle = pieLevel.value === 'enterprise' ? 'Comparação entre Empreendimentos'
            : pieLevel.value === 'broker' ? 'Comparação entre Imobiliárias'
                : 'Comparação entre Corretores'
        return {
            color: palette,
            title: { left: 'center', text: 'Distribuição de Leads', subtext: subtitle, textStyle: { fontSize: 14, color: txt.value }, subtextStyle: { color: sub.value } },
            tooltip: { ...baseTooltip.value, formatter: p => `${p.name}<br/><b>${p.value}</b> lead(s) (${p.percent}%)` },
            legend: { type: 'scroll', orient: 'vertical', left: 'left', top: 'middle', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: txt.value } },
            series: [{
                name: 'Leads', type: 'pie', radius: ['40%', '70%'], padAngle: 1,
                itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 0 },
                label: { show: false }, emphasis: { label: { show: true, fontWeight: 'bold', color: txt.value } },
                data: pieData.value
            }]
        }
    }

    return {}
})

// Drill-down via click (aplica e reflete nos drafts)
const onChartClick = (params) => {
    if (!params) return
    // FUNIL: filtra por situação
    if (viewMode.value === 'funnel' && params.name) {
        filtroStatus.value = new Set([params.name])
        draftStatus.value = new Set([params.name])
    }
    // PIE: enterprise/broker/agent
    if (viewMode.value === 'pie' && params.name) {
        if (pieLevel.value === 'enterprise') {
            filtroEnterprise.value = new Set([params.name]); draftEnterprise.value = new Set([params.name])
        } else if (pieLevel.value === 'broker') {
            filtroBroker.value = new Set([params.name]); draftBroker.value = new Set([params.name])
        } else {
            filtroAgent.value = new Set([params.name]); draftAgent.value = new Set([params.name])
        }
    }
    // BARRAS
    if (viewMode.value === 'stacked') {
        if (groupBy.value === 'enterprise' && params.axisValue) {
            filtroEnterprise.value = new Set([params.axisValue]); draftEnterprise.value = new Set([params.axisValue])
        } else if (groupBy.value === 'date' && params.seriesName) {
            filtroStatus.value = new Set([params.seriesName]); draftStatus.value = new Set([params.seriesName])
        }
    }
}

onMounted(() => {
    // opcional: re-render quando alternar tema
})

/** ========================== BOTÕES (emit + aplicar) ========================== **/

const filtroPayload = computed(() => ({
    empreendimento: Array.from(draftEnterprise.value),
    imobiliaria: Array.from(draftBroker.value),
    corretor: Array.from(draftAgent.value),
    situacao_nome: Array.from(draftStatus.value)
}))

const onBuscar = () => {
    console.log('[RelatórioLeads] onBuscar() → drafts atuais', {
        empreendimento: Array.from(draftEnterprise.value),
        imobiliaria: Array.from(draftBroker.value),
        corretor: Array.from(draftAgent.value),
        situacao_nome: Array.from(draftStatus.value)
    })
    // aplica o rascunho nos filtros reais
    filtroEnterprise.value = new Set(draftEnterprise.value)
    filtroBroker.value = new Set(draftBroker.value)
    filtroAgent.value = new Set(draftAgent.value)
    filtroStatus.value = new Set(draftStatus.value)
    console.log('[RelatórioLeads] onBuscar() → aplicando filtros', {
        empreendimento: Array.from(filtroEnterprise.value),
        imobiliaria: Array.from(filtroBroker.value),
        corretor: Array.from(filtroAgent.value),
        situacao_nome: Array.from(filtroStatus.value)
    })
    emit('buscar', filtroPayload.value) // pai pode re-buscar no backend se quiser
}

const onLimpar = () => {
    clearAllFilters()
    emit('limpar')
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
