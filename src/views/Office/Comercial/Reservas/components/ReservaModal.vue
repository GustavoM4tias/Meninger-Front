<template>
    <div v-if="visivel" class="fixed inset-0 z-50 overflow-y-auto" @click="emit('fechar')">
        <div class="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div class="fixed inset-0 bg-gray-900/60 transition-opacity"></div>

            <div class="relative inline-block w-full max-w-7xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-50 dark:bg-gray-800 shadow-xl rounded-2xl"
                @click.stop>

                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-xl font-bold">Reservas</h3>
                            <p class="text-sm text-gray-500">{{ kpis.total }} reserva(s) — {{ kpis.empreendimentos }} empreendimento(s) — {{ kpis.clientes }} cliente(s)</p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
                                <button v-for="m in viewModes" :key="m.k" type="button" @click="viewMode = m.k"
                                    :class="['px-3 py-1 text-sm font-medium', viewMode === m.k ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600', m.border ? 'border-l border-gray-300 dark:border-gray-700' : '']">
                                    {{ m.label }}
                                </button>
                            </div>
                            <button class="text-2xl ps-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                v-tippy="'Exportar'" @click="exportOpen = true">
                                <i class="fas fa-download"></i>
                            </button>
                            <button type="button" @click="emit('fechar')"
                                class="text-dark hover:text-gray-700 ps-3 pt-1 dark:text-white dark:hover:text-blue-100 text-2xl">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="max-h-[80vh] overflow-y-auto bg-gray-50 dark:bg-gray-900/40">

                    <!-- KPI Cards (4 cards) -->
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm border-blue-500">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">Total</p>
                                        <p class="text-2xl font-bold text-blue-400">{{ kpis.total }}</p>
                                        <p class="text-xs text-gray-500">Em curso: <b>{{ kpis.ativas }}</b></p>
                                    </div>
                                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-bookmark text-blue-600"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm border-amber-500">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">Tempo até finalizar</p>
                                        <p class="text-lg font-bold text-amber-400">{{ kpis.tempoMedioFin.toFixed(1) }}<span class="text-sm font-normal"> dias</span></p>
                                        <p class="text-xs text-gray-500">{{ kpis.totalFin }} finalizada(s)</p>
                                    </div>
                                    <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-stopwatch text-amber-600"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm border-emerald-500"
                                v-tippy="'% das reservas na etapa &quot;Vendida&quot; do CRM. NÃO é venda concretizada (ver Faturamento).'">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">% Vendida (CRM)</p>
                                        <p class="text-2xl font-bold text-emerald-500">{{ pctStr(kpis.pctVendidas) }}</p>
                                        <p class="text-xs text-gray-500">{{ kpis.vendidas }} de {{ kpis.total }}</p>
                                    </div>
                                    <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-flag-checkered text-emerald-600"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm border-red-500">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">% Canceladas</p>
                                        <p class="text-2xl font-bold text-red-500">{{ pctStr(kpis.pctCanceladas) }}</p>
                                        <p class="text-xs text-gray-500">{{ kpis.canceladas }} de {{ kpis.total }}</p>
                                    </div>
                                    <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-ban text-red-600"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filtros draft -->
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40">
                        <div class="flex flex-wrap gap-3 items-end">
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1">Empreendimento</label>
                                <MultiSelector v-model="draftEmpreendimentoArr" :options="opcoesEmpreendimento" placeholder="..." :page-size="200" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1">Situação</label>
                                <MultiSelector v-model="draftSituacaoArr" :options="opcoesSituacao" placeholder="..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1">Status Repasse</label>
                                <MultiSelector v-model="draftStatusRepArr" :options="opcoesStatusRep" placeholder="..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1">Imobiliária</label>
                                <MultiSelector v-model="draftImobArr" :options="opcoesImob" placeholder="..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1">Corretor</label>
                                <MultiSelector v-model="draftCorretorArr" :options="opcoesCorretor" placeholder="..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex gap-2">
                                <button @click="onLimparModal"
                                    class="flex items-center px-3 py-2 text-sm font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                                    <i class="fas fa-broom pe-1 my-auto"></i> Limpar
                                </button>
                                <button @click="onAplicarModal"
                                    class="flex items-center px-3 py-2 text-sm font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600">
                                    <i class="fas fa-filter pe-1 my-auto"></i> Filtrar
                                </button>
                            </div>
                        </div>
                        <div v-if="hasFiltrosAplicados" class="mt-2 text-xs text-purple-600 dark:text-purple-300">
                            <i class="fas fa-info-circle mr-1"></i>{{ activeFiltrosCount }} filtro(s) aplicado(s) — {{ reservasFiltradas.length }} de {{ reservas.length }} reserva(s)
                        </div>
                    </div>

                    <!-- Busca + paginação -->
                    <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
                        <div class="flex flex-wrap gap-4 items-end justify-between">
                            <div class="flex-1">
                                <label class="block text-sm font-medium mb-2">Cliente | CPF | Empreendimento | Situação | Unidade</label>
                                <div class="relative">
                                    <input v-model="search" type="text" placeholder="Digite para buscar..."
                                        class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-start" />
                                    <button v-if="search" @click="search = ''"
                                        class="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                                        <i class="fas fa-times-circle"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="flex-none">
                                <label class="block text-sm font-medium mb-2">Itens por página</label>
                                <select v-model="itemsPerPage"
                                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-center">
                                    <option :value="10">10</option>
                                    <option :value="25">25</option>
                                    <option :value="50">50</option>
                                    <option :value="100">100</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Charts -->
                    <div v-if="viewMode !== 'list'"
                        class="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center mb-4">
                            <div class="text-sm text-gray-500">
                                <span v-if="search" class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    Filtro ativo: {{ search }}
                                    <button @click="search = ''" class="ml-1 hover:text-blue-900 font-bold">x</button>
                                </span>
                                <span v-else>Clique no gráfico para filtrar a lista abaixo.</span>
                            </div>
                            <select v-model="chartGroup"
                                class="px-2 py-1 text-xs border rounded bg-white dark:bg-gray-700 dark:border-gray-600">
                                <option value="empreendimento">Por Empreendimento</option>
                                <option value="situacao">Por Situação</option>
                                <option value="status_repasse">Por Status Repasse</option>
                                <option value="imobiliaria">Por Imobiliária</option>
                                <option value="corretor">Por Corretor</option>
                                <option value="bucket">Por Grupo (Funil)</option>
                            </select>
                        </div>
                        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <VChart :option="chartOption" autoresize style="height: 400px; width: 100%;" @click="onChartClick" />
                        </div>
                    </div>

                    <!-- Tabela -->
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium uppercase">Cliente</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">CPF</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Empreendimento / Unidade</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Situação</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Repasse</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Dias</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Reserva</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-700/40 dark:divide-gray-700">
                                <template v-for="r in paginated" :key="r.idreserva">
                                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                        @click="toggleExpand(r)" :class="r.vendida === 'S' ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : ''">
                                        <td class="px-3 py-3">
                                            <div class="text-sm font-medium">{{ r.titular?.nome || '—' }}</div>
                                            <div class="text-gray-400 text-xs">#{{ r.idreserva }}</div>
                                        </td>
                                        <td class="px-3 py-3 text-center text-xs font-mono">{{ r.documento || '—' }}</td>
                                        <td class="px-3 py-3 text-center">
                                            <div class="text-sm truncate max-w-40">{{ r.empreendimento || '—' }}</div>
                                            <div class="text-[10px] text-gray-400 truncate max-w-40">{{ [r.bloco, r.unidade].filter(Boolean).join(' / ') }}</div>
                                        </td>
                                        <td class="px-3 py-3 text-center">
                                            <span :class="['px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1', clsForStage(r.situacao?.nome)]">
                                                <i :class="iconForStage(r.situacao?.nome)"></i>
                                                <span class="truncate max-w-32">{{ r.situacao?.nome || '—' }}</span>
                                            </span>
                                        </td>
                                        <td class="px-3 py-3 text-center text-xs">{{ r.status_repasse || '—' }}</td>
                                        <td class="px-3 py-3 text-center text-sm tabular-nums">{{ Number(r.dias_em_reserva || 0).toFixed(0) }}</td>
                                        <td class="px-3 py-3 text-center text-xs">{{ fmtDate(r.data_reserva) }}</td>
                                        <td class="px-3 py-3 text-center">
                                            <a v-if="cvLink(r)" :href="cvLink(r)" target="_blank" rel="noopener" @click.stop
                                                v-tippy="'Abrir no CV CRM'"
                                                class="inline-block group">
                                                <img src="/CVLogo.png" alt="CV CRM" class="w-5 inline grayscale group-hover:grayscale-0" />
                                            </a>
                                            <button @click.stop="abrirDetalhe(r)"
                                                class="ml-2 text-sm font-medium text-blue-600 hover:text-blue-900 dark:hover:text-blue-400">
                                                Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                    <tr v-show="expanded.has(r.idreserva)" class="bg-gray-50 dark:bg-gray-900/60">
                                        <td colspan="8">
                                            <div class="p-4 space-y-3">
                                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                                                    <div><span class="text-xs text-gray-500">Vendida</span><div :class="r.vendida === 'S' ? 'text-emerald-600 font-bold' : ''">{{ r.vendida === 'S' ? 'Sim' : 'Não' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Tipo Venda</span><div>{{ r.tipovenda || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Imobiliária</span><div>{{ r.imobiliaria?.nome || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Corretor</span><div>{{ r.corretor?.nome || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Empresa Corresp.</span><div>{{ r.empresa_correspondente?.nome || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Pré-cadastro #</span><div>{{ r.idprecadastro || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Data Reserva</span><div>{{ fmtDateTime(r.data_reserva) }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Data Contrato</span><div>{{ fmtDateTime(r.data_contrato) }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Data Venda</span><div>{{ fmtDateTime(r.data_venda) }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Etapa / Bloco / Unidade</span><div>{{ [r.etapa, r.bloco, r.unidade].filter(Boolean).join(' / ') || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Última msg</span><div class="text-xs">{{ r.ultima_mensagem || '—' }}</div></div>
                                                </div>
                                                <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <button @click.stop="abrirDetalhe(r)"
                                                        class="px-3 py-1.5 rounded text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white">
                                                        <i class="fas fa-list-check mr-1"></i>Contratos / Histórico / Leads
                                                    </button>
                                                    <a v-if="cvLink(r)" :href="cvLink(r)" target="_blank" rel="noopener"
                                                        class="px-3 py-1.5 rounded text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white">
                                                        <i class="fas fa-arrow-up-right-from-square mr-1"></i>Administrar no CV
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                                <tr v-if="!paginated.length">
                                    <td colspan="8" class="text-center py-12 text-gray-400">
                                        <i class="fas fa-inbox text-4xl mb-2"></i>
                                        <p>Nenhuma reserva encontrada</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="totalPages > 1" class="m-4 flex items-center justify-between">
                        <div class="text-sm text-gray-500">
                            Mostrando {{ startItem }} a {{ endItem }} de {{ filtered.length }} reserva(s)
                        </div>
                        <div class="flex items-center gap-2">
                            <button @click="currentPage = 1" :disabled="currentPage === 1"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50">
                                Primeira
                            </button>
                            <button @click="currentPage--" :disabled="currentPage === 1"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <div class="flex gap-1">
                                <button v-for="page in visiblePages" :key="page" @click="currentPage = page"
                                    :class="['px-3 py-1 text-sm border rounded-md', page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900']">
                                    {{ page }}
                                </button>
                            </div>
                            <button @click="currentPage++" :disabled="currentPage === totalPages"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button @click="currentPage = totalPages" :disabled="currentPage === totalPages"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50">
                                Última
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <Export v-model="exportOpen" :source="filtered" title="Exportação de Reservas"
        filename="reservas" initial-delimiter=";" initial-array-mode="join"
        :preselect="[
            'idreserva', 'documento', 'titular.nome',
            'empreendimento', 'etapa', 'bloco', 'unidade',
            'situacao.nome', 'status_repasse', 'tipovenda',
            'vendida', 'data_reserva', 'data_contrato', 'data_venda',
            'imobiliaria.nome', 'corretor.nome', 'empresa_correspondente.nome',
            'dias_em_reserva', 'idprecadastro'
        ]" />

    <ReservaDetailModal :reserva="detailItem" :visivel="detailVisible" @fechar="detailVisible = false" />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { PieChart, BarChart, FunnelChart } from 'echarts/charts'
import {
    TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import Export from '@/components/config/Export.vue'
import MultiSelector from '@/components/UI/MultiSelector.vue'
import ReservaDetailModal from './ReservaDetailModal.vue'
import { iconForStage, clsForStage, bucketOf, STAGE_GROUPS } from '../stages.js'

echarts.use([PieChart, BarChart, FunnelChart, TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent, CanvasRenderer])

const props = defineProps({
    reservas: { type: Array, default: () => [] },
    visivel: { type: Boolean, default: false },
    initialMode: { type: String, default: 'list' },
})
const emit = defineEmits(['fechar'])

const viewModes = [
    { k: 'list',   label: 'Listagem', border: false },
    { k: 'pie',    label: 'Pizza',    border: true },
    { k: 'bar',    label: 'Colunas',  border: true },
    { k: 'funnel', label: 'Funil',    border: true },
]
const normalizeMode = (m) => ['list','pie','bar','funnel'].includes(m) ? m : 'list'
const viewMode = ref(normalizeMode(props.initialMode))
const chartGroup = ref('empreendimento')

watch(() => props.initialMode, (m) => { viewMode.value = normalizeMode(m) })
watch(() => props.visivel, (v) => { if (v) viewMode.value = normalizeMode(props.initialMode) })

const search = ref('')
const itemsPerPage = ref(25)
const currentPage = ref(1)
const expanded = ref(new Set())
const exportOpen = ref(false)
const detailVisible = ref(false)
const detailItem = ref(null)

// ── Filtros draft (estilo LeadModal) ─────────────────────────────────────
const draftEmpreendimento = ref(new Set())
const draftSituacao       = ref(new Set())
const draftStatusRep      = ref(new Set())
const draftImob           = ref(new Set())
const draftCorretor       = ref(new Set())
const aplEmpreendimento   = ref(new Set())
const aplSituacao         = ref(new Set())
const aplStatusRep        = ref(new Set())
const aplImob             = ref(new Set())
const aplCorretor         = ref(new Set())

const setSet = (r, arr) => { r.value = new Set(Array.isArray(arr) ? arr : []) }
const toArr  = (r) => ({ get: () => Array.from(r.value), set: (v) => setSet(r, v) })
const draftEmpreendimentoArr = computed(toArr(draftEmpreendimento))
const draftSituacaoArr       = computed(toArr(draftSituacao))
const draftStatusRepArr      = computed(toArr(draftStatusRep))
const draftImobArr           = computed(toArr(draftImob))
const draftCorretorArr       = computed(toArr(draftCorretor))

const _extract = (list, accessor) => {
    const set = new Set()
    for (const r of (list || [])) {
        const v = accessor(r)
        if (v) set.add(String(v).trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
const opcoesEmpreendimento = computed(() => _extract(props.reservas, r => r?.empreendimento))
const opcoesSituacao       = computed(() => _extract(props.reservas, r => r?.situacao?.nome))
const opcoesStatusRep      = computed(() => _extract(props.reservas, r => r?.status_repasse))
const opcoesImob           = computed(() => _extract(props.reservas, r => r?.imobiliaria?.nome))
const opcoesCorretor       = computed(() => _extract(props.reservas, r => r?.corretor?.nome))

const hasFiltrosAplicados = computed(() =>
    aplEmpreendimento.value.size + aplSituacao.value.size + aplStatusRep.value.size +
    aplImob.value.size + aplCorretor.value.size > 0
)
const activeFiltrosCount = computed(() =>
    [aplEmpreendimento, aplSituacao, aplStatusRep, aplImob, aplCorretor]
        .filter(r => r.value.size > 0).length
)

const reservasFiltradas = computed(() => {
    return (props.reservas || []).filter(r => {
        if (aplEmpreendimento.value.size && !aplEmpreendimento.value.has(String(r?.empreendimento || '').trim())) return false
        if (aplSituacao.value.size       && !aplSituacao.value.has(String(r?.situacao?.nome || '').trim())) return false
        if (aplStatusRep.value.size      && !aplStatusRep.value.has(String(r?.status_repasse || '').trim())) return false
        if (aplImob.value.size           && !aplImob.value.has(String(r?.imobiliaria?.nome || '').trim())) return false
        if (aplCorretor.value.size       && !aplCorretor.value.has(String(r?.corretor?.nome || '').trim())) return false
        return true
    })
})

function onAplicarModal() {
    aplEmpreendimento.value = new Set(draftEmpreendimento.value)
    aplSituacao.value       = new Set(draftSituacao.value)
    aplStatusRep.value      = new Set(draftStatusRep.value)
    aplImob.value           = new Set(draftImob.value)
    aplCorretor.value       = new Set(draftCorretor.value)
    currentPage.value = 1
}
function onLimparModal() {
    [draftEmpreendimento, draftSituacao, draftStatusRep, draftImob, draftCorretor,
     aplEmpreendimento, aplSituacao, aplStatusRep, aplImob, aplCorretor].forEach(r => r.value = new Set())
    currentPage.value = 1
}

watch(() => props.visivel, v => {
    if (!v) { search.value = ''; currentPage.value = 1; expanded.value = new Set(); onLimparModal() }
})
watch(search,        () => { currentPage.value = 1 })
watch(itemsPerPage,  () => { currentPage.value = 1 })
watch(reservasFiltradas, () => { currentPage.value = 1 })

const filtered = computed(() => {
    const term = search.value.trim().toLowerCase()
    const base = reservasFiltradas.value
    if (!term) return base
    return base.filter(r =>
        String(r.idreserva).includes(term) ||
        (r.titular?.nome || '').toLowerCase().includes(term) ||
        (r.documento || '').toLowerCase().includes(term) ||
        (r.empreendimento || '').toLowerCase().includes(term) ||
        (r.situacao?.nome || '').toLowerCase().includes(term) ||
        (r.unidade || '').toLowerCase().includes(term)
    )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / Number(itemsPerPage.value))))
const startItem  = computed(() => (currentPage.value - 1) * Number(itemsPerPage.value) + 1)
const endItem    = computed(() => Math.min(currentPage.value * Number(itemsPerPage.value), filtered.value.length))
const paginated  = computed(() => {
    const ipp = Number(itemsPerPage.value)
    const start = (currentPage.value - 1) * ipp
    return filtered.value.slice(start, start + ipp)
})
const visiblePages = computed(() => {
    const tp = totalPages.value, cp = currentPage.value, pages = [], show = 5
    let start = Math.max(1, cp - Math.floor(show / 2))
    let end = Math.min(tp, start + show - 1)
    if (end - start + 1 < show) start = Math.max(1, end - show + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
})

// KPIs
const kpis = computed(() => {
    const list = reservasFiltradas.value || []
    let vendidas = 0, canceladas = 0, ativas = 0, qtdFin = 0, somaDias = 0
    const empreendimentos = new Set(), clientes = new Set()
    for (const r of list) {
        const isV = r?.vendida === 'S' || /vendid/i.test(r?.situacao?.nome || '')
        const isC = /cancelad|distrato/i.test(r?.situacao?.nome || '') || /cancelad|distrato/i.test(r?.status_repasse || '')
        if (isV) vendidas++
        else if (isC) canceladas++
        else ativas++
        if (r?.data_venda || r?.data_contrato || isV) {
            const d = Number(r?.dias_em_reserva)
            if (Number.isFinite(d)) { somaDias += d; qtdFin++ }
        }
        if (r?.empreendimento) empreendimentos.add(r.empreendimento)
        if (r?.documento) clientes.add(r.documento)
    }
    const total = list.length
    return {
        total, ativas, vendidas, canceladas,
        totalFin: vendidas + canceladas,
        pctVendidas:    total ? vendidas   / total : 0,
        pctCanceladas:  total ? canceladas / total : 0,
        pctAtivas:      total ? ativas     / total : 0,
        tempoMedioFin: qtdFin ? somaDias / qtdFin : 0,
        empreendimentos: empreendimentos.size,
        clientes: clientes.size,
    }
})

// Charts
const palette = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1']
const baseTooltip = { confine: true, extraCssText: 'max-width:320px; white-space:normal; font-size:12px; padding:6px 8px;' }

function groupByKey(list) {
    const map = new Map()
    for (const r of list) {
        let key
        if (chartGroup.value === 'empreendimento')   key = r?.empreendimento || 'Sem empreendimento'
        else if (chartGroup.value === 'situacao')    key = r?.situacao?.nome || 'Sem situação'
        else if (chartGroup.value === 'status_repasse') key = r?.status_repasse || 'Sem repasse'
        else if (chartGroup.value === 'imobiliaria') key = r?.imobiliaria?.nome || 'Sem imobiliária'
        else if (chartGroup.value === 'corretor')    key = r?.corretor?.nome || 'Sem corretor'
        else if (chartGroup.value === 'bucket')      key = bucketOf(r).label
        const cur = map.get(key) || { name: key, value: 0 }
        cur.value++
        map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
}
const chartData = computed(() => groupByKey(reservasFiltradas.value))

const chartOption = computed(() => {
    if (viewMode.value === 'pie') {
        return {
            color: palette,
            tooltip: { ...baseTooltip, trigger: 'item', formatter: p => `${p.name}<br/><b>${p.value}</b> (${p.percent}%)` },
            legend: { type: 'scroll', orient: 'vertical', left: 'left', top: 'middle', textStyle: { fontSize: 11 } },
            series: [{
                type: 'pie', radius: ['40%', '70%'], padAngle: 1,
                itemStyle: { borderRadius: 6 }, label: { show: false },
                emphasis: { label: { show: true, fontWeight: 'bold' } },
                data: chartData.value,
            }],
        }
    }
    if (viewMode.value === 'funnel') {
        const data = STAGE_GROUPS.filter(g => g.key !== 'outros').map(g => ({
            name: g.label,
            value: reservasFiltradas.value.filter(r => bucketOf(r).key === g.key).length,
        })).filter(d => d.value > 0)
        return {
            color: palette,
            tooltip: { ...baseTooltip, trigger: 'item', formatter: '{b}: <b>{c}</b>' },
            series: [{
                type: 'funnel', left: '10%', width: '80%', sort: 'descending',
                label: { color: '#888', formatter: '{b}: {c}' },
                data,
            }],
        }
    }
    return {
        color: palette,
        tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 32, right: 32, top: 30, bottom: 80, containLabel: true },
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 20 }],
        xAxis: {
            type: 'category', data: chartData.value.map(r => r.name),
            axisLabel: { interval: 0, rotate: 25, fontSize: 10, formatter: v => v.length > 18 ? v.slice(0, 18) + '…' : v },
        },
        yAxis: { type: 'value' },
        series: [{
            name: 'Quantidade', type: 'bar', barWidth: '60%',
            data: chartData.value.map(r => r.value),
            itemStyle: { borderRadius: [6, 6, 0, 0] },
            label: { show: true, position: 'top', fontSize: 10 },
        }],
    }
})

function onChartClick(params) { if (params && params.name) search.value = params.name }

function toggleExpand(r) {
    const next = new Set(expanded.value)
    if (next.has(r.idreserva)) next.delete(r.idreserva); else next.add(r.idreserva)
    expanded.value = next
}
function abrirDetalhe(r) { detailItem.value = r; detailVisible.value = true }

function cvLink(r) {
    if (!r?.idreserva) return null
    return `https://menin.cvcrm.com.br/gestor/comercial/reservas/${r.idreserva}/administrar`
}

const fmtDate = (d) => {
    if (!d) return '—'
    const dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR')
}
const fmtDateTime = (d) => {
    if (!d) return '—'
    const dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleString('pt-BR')
}
const pctStr = (v) => `${(v * 100).toFixed(1)}%`
</script>
