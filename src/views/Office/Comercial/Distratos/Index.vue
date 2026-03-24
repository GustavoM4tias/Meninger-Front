<template>
    <div class="h-full overflow-hidden">

        <!-- ── Header ─────────────────────────────────────────────────────── -->
        <div class="px-6 pt-6">
            <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Distratos</h1>
                <Favorite class="m-auto ms-0" :router="'/comercial/distratos'" :section="'Distratos'" />
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Análise analítica de rescisões de contratos · sincronizado via cron horário com Sienge
            </p>
        </div>

        <!-- ── Filters ─────────────────────────────────────────────────────── -->
        <div class="px-6 py-4">
            <DistratoFilters @filter-changed="handleFilterChange" />
        </div>

        <!-- ── Error ───────────────────────────────────────────────────────── -->
        <div v-if="store.error" class="px-6 pb-4">
            <div
                class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                <i class="fas fa-triangle-exclamation text-red-500"></i>
                <p class="text-red-800 dark:text-red-300 text-sm flex-1">Erro ao carregar dados: {{ store.error }}</p>
                <button @click="handleFilterChange"
                    class="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                    Tentar novamente
                </button>
            </div>
        </div>

        <!-- ── Loading ─────────────────────────────────────────────────────── -->
        <div v-if="store.loading" class="px-6 pb-6 space-y-6">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div v-for="n in 5" :key="n" class="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div v-for="n in 4" :key="n" class="h-72 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
        </div>

        <!-- ── Content ─────────────────────────────────────────────────────── -->
        <div v-else-if="!store.error" class="px-6 pb-8 space-y-6">

            <!-- Empty -->
            <div v-if="store.distratos.length === 0"
                class="flex flex-col items-center justify-center py-20 text-center">
                <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <i class="fas fa-file-circle-check text-gray-300 dark:text-gray-600 text-2xl"></i>
                </div>
                <p class="font-medium text-gray-500 dark:text-gray-400">Nenhum distrato encontrado no período</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Ajuste os filtros ou selecione um intervalo
                    maior</p>
            </div>

            <template v-else>

                <!-- ── KPI Strip ────────────────────────────────────────────── -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div v-for="kpi in kpiCards" :key="kpi.label"
                        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{{ kpi.label
                                }}</span>
                            <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                                :style="`background:${kpi.color}1a`">
                                <i :class="kpi.icon" class="text-xs" :style="`color:${kpi.color}`"></i>
                            </div>
                        </div>
                        <p class="text-xl font-bold text-gray-900 dark:text-white truncate">{{ kpi.value }}</p>
                        <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate" :title="kpi.sub">{{
                            kpi.sub }}</p>
                    </div>
                </div>

                <!-- ── Alert Banner ─────────────────────────────────────────── -->
                <div v-if="store.kpis.alertCount > 0"
                    class="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4">
                    <div class="flex items-start gap-3">
                        <div
                            class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <i class="fas fa-triangle-exclamation text-amber-500 text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                {{ store.kpis.alertCount }} empreendimento{{ store.kpis.alertCount > 1 ? 's' : '' }} com
                                taxa de distrato acima da média
                            </p>
                            <div class="flex flex-wrap gap-2 mt-2">
                                <span v-for="ent in store.kpis.alerts" :key="ent.name"
                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium">
                                    <i class="fas fa-building text-[9px]"></i>
                                    {{ ent.name }}
                                    <span class="bg-amber-200 dark:bg-amber-800 px-1.5 rounded text-[10px] font-bold">{{
                                        ent.count }}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ── Charts Grid ─────────────────────────────────────────── -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    <!-- Tendência Mensal -->
                    <div
                        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Tendência Mensal</h3>
                                <p class="text-xs text-gray-400 mt-0.5">Distratos por mês · data de cancelamento</p>
                            </div>
                            <ChartActions chart-id="chart-trend" />
                        </div>
                        <VChart id="chart-trend" :option="optionTrend" style="height:230px" autoresize />
                    </div>

                    <!-- Motivos -->
                    <div
                        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Motivos de Distrato</h3>
                                <p class="text-xs text-gray-400 mt-0.5">Distribuição por razão de cancelamento</p>
                            </div>
                            <ChartActions chart-id="chart-reasons" />
                        </div>
                        <div v-if="allUnknownReasons"
                            class="flex flex-col items-center justify-center h-[230px] text-gray-400 dark:text-gray-600 gap-2">
                            <i class="fas fa-circle-info text-2xl"></i>
                            <p class="text-xs text-center">Motivos não informados no Sienge para este período</p>
                        </div>
                        <VChart v-else id="chart-reasons" :option="optionReasons" style="height:230px" autoresize />
                    </div>

                    <!-- Por empreendimento -->
                    <div
                        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Por Empreendimento</h3>
                                <p class="text-xs text-gray-400 mt-0.5">Quantidade de distratos · amarelo = alerta</p>
                            </div>
                            <ChartActions chart-id="chart-ent-count" />
                        </div>
                        <VChart id="chart-ent-count" :option="optionEntCount" style="height:230px" autoresize />
                    </div>

                    <!-- Valor por empreendimento -->
                    <div
                        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Valor Médio de Distrato
                                </h3>
                                <p class="text-xs text-gray-400 mt-0.5">Valor médio pago por rescisão (R$)</p>
                            </div>
                            <ChartActions chart-id="chart-ent-avg" />
                        </div>
                        <div v-if="noAmounts"
                            class="flex flex-col items-center justify-center h-[230px] text-gray-400 dark:text-gray-600 gap-2">
                            <i class="fas fa-circle-info text-2xl"></i>
                            <p class="text-xs">Valores de rescisão não informados no Sienge</p>
                        </div>
                        <VChart v-else id="chart-ent-avg" :option="optionEntAvg" style="height:230px" autoresize />
                    </div>
                </div>

                <!-- ── Table ────────────────────────────────────────────────── -->
                <div
                    class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div
                        class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                        <div>
                            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Detalhamento</h3>
                            <p class="text-xs text-gray-400 mt-0.5">
                                {{ filteredRows.length }} distrato{{ filteredRows.length !== 1 ? 's' : '' }}
                                <span v-if="tableSearch" class="text-gray-300 dark:text-gray-600"> · filtrado</span>
                            </p>
                        </div>
                        <div class="relative">
                            <i class="fas fa-magnifying-glass absolute left-2.5 top-2 text-gray-400 text-xs"></i>
                            <input v-model="tableSearch" type="text" placeholder="Buscar..."
                                class="pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-red-400 w-44" />
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-xs">
                            <thead>
                                <tr
                                    class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                    <th v-for="col in tableCols" :key="col.key"
                                        class="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none transition-colors"
                                        @click="sortBy(col.key)">
                                        {{ col.label }}
                                        <i class="fas ml-1 text-[9px]" :class="sortCol === col.key
                                            ? (sortAsc ? 'fa-sort-up text-red-400' : 'fa-sort-down text-red-400')
                                            : 'fa-sort opacity-25'" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in paginatedRows" :key="row.id"
                                    class="border-b border-gray-50 dark:border-gray-800/50 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors">
                                    <td
                                        class="px-4 py-2.5 font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                        {{ row.number || row.id || '—' }}
                                    </td>
                                    <td class="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 max-w-[200px] truncate"
                                        :title="row.enterprise">
                                        {{ row.enterprise }}
                                    </td>
                                    <td class="px-4 py-2.5 text-gray-600 dark:text-gray-300 max-w-[160px] truncate"
                                        :title="row.customer">
                                        {{ row.customer }}
                                    </td>
                                    <td class="px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-[120px] truncate"
                                        :title="row.unit">
                                        {{ row.unit }}
                                    </td>
                                    <td class="px-4 py-2.5 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                        {{ fmtDate(row.cancelDate) }}
                                    </td>
                                    <td class="px-4 py-2.5 max-w-[200px]">
                                        <span
                                            class="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 truncate max-w-[190px]"
                                            :title="row.reason">
                                            {{ row.reason }}
                                        </span>
                                    </td>
                                    <td
                                        class="px-4 py-2.5 text-right whitespace-nowrap text-gray-500 dark:text-gray-400">
                                        {{ row.originalValue ? fmtCurrency(row.originalValue) : '—' }}
                                    </td>
                                    <td class="px-4 py-2.5 text-right whitespace-nowrap font-semibold"
                                        :class="row.cancelAmount ? 'text-red-600 dark:text-red-400' : 'text-gray-400'">
                                        {{ row.cancelAmount ? fmtCurrency(row.cancelAmount) : '—' }}
                                    </td>
                                </tr>
                                <tr v-if="filteredRows.length === 0">
                                    <td colspan="8" class="px-4 py-10 text-center text-gray-400 text-xs">Nenhum
                                        resultado encontrado</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div v-if="totalPages > 1"
                        class="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                        <span class="text-xs text-gray-400">
                            Exibindo {{ (tablePage - 1) * TABLE_LIMIT + 1 }}–{{ Math.min(tablePage * TABLE_LIMIT,
                                filteredRows.length) }}
                            de {{ filteredRows.length }}
                        </span>
                        <div class="flex gap-1">
                            <button @click="tablePage = Math.max(1, tablePage - 1)" :disabled="tablePage === 1"
                                class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <i class="fas fa-chevron-left text-[9px]"></i>
                            </button>
                            <span class="w-7 h-7 flex items-center justify-center text-xs text-gray-500">{{ tablePage
                                }}</span>
                            <button @click="tablePage = Math.min(totalPages, tablePage + 1)"
                                :disabled="tablePage === totalPages"
                                class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <i class="fas fa-chevron-right text-[9px]"></i>
                            </button>
                        </div>
                    </div>
                </div>

            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDistratosStore } from '@/stores/Comercial/Distratos/distratosStore'
import Favorite from '@/components/config/Favorite.vue'
import ChartActions from '@/components/config/ChartActions.vue'
import DistratoFilters from './components/DistratoFilters.vue'

import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
    TooltipComponent, LegendComponent, GridComponent,
    DataZoomComponent, MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
    LineChart, BarChart, PieChart,
    TooltipComponent, LegendComponent, GridComponent,
    DataZoomComponent, MarkLineComponent,
    CanvasRenderer,
])

// ── Store ──────────────────────────────────────────────────────────────────
const store = useDistratosStore()

async function handleFilterChange() {
    await store.fetchDistratos()
}

onMounted(async () => {
    await store.fetchDistratos()
})

// ── Formatters ─────────────────────────────────────────────────────────────
const brlFull = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlShort = (v) => {
    if (!v) return 'R$ —'
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
    return brlFull.format(v)
}
const fmtCurrency = (v) => v ? brlFull.format(v) : 'R$ —'
const fmtDate = (d) => {
    if (!d) return '—'
    const [y, m, day] = String(d).slice(0, 10).split('-')
    return `${day}/${m}/${y}`
}

// ── KPI Cards ──────────────────────────────────────────────────────────────
const kpiCards = computed(() => {
    const k = store.kpis
    return [
        {
            label: 'Total Distratos',
            value: k.total.toLocaleString('pt-BR'),
            sub: 'rescisões no período',
            icon: 'fas fa-file-circle-xmark',
            color: '#EF4444',
        },
        {
            label: 'VGV Cancelado',
            value: brlShort(k.totalOriginal),
            sub: 'valor original dos contratos',
            icon: 'fas fa-building-circle-xmark',
            color: '#F97316',
        },
        {
            label: 'Valor Rescisão',
            value: brlShort(k.totalAmount),
            sub: 'total pago em rescisões',
            icon: 'fas fa-money-bill-wave',
            color: '#EAB308',
        },
        {
            label: 'Ticket Médio',
            value: brlShort(k.avgAmount),
            sub: 'rescisão média por contrato',
            icon: 'fas fa-receipt',
            color: '#A855F7',
        },
        {
            label: 'Alertas',
            value: k.alertCount,
            sub: k.alertCount > 0
                ? `${k.topEnt ? '' + k.topEnt.name : ''}`
                : 'tudo dentro do normal',
            icon: k.alertCount > 0 ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check',
            color: k.alertCount > 0 ? '#F59E0B' : '#22C55E',
        },
    ]
})

// ── ECharts helpers ────────────────────────────────────────────────────────
const isDark = () => document.documentElement.classList.contains('dark')
const txt = computed(() => isDark() ? '#CBD5E1' : '#374151')
const sub_c = computed(() => isDark() ? '#475569' : '#9CA3AF')
const dim_c = computed(() => isDark() ? '#334155' : '#E5E7EB')

const TT = `
  background: rgba(2, 6, 23, 0.96);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 12px;
  font-size: 12px;
  color: #E2E8F0;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  padding: 10px 14px;
  max-width: 250px; /* Adicione isso para evitar tooltips gigantes */
  white-space: normal; /* Permite quebra de linha se o texto for muito longo */
`;

const palette = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
    '#A855F7', '#EC4899', '#14B8A6', '#6366F1', '#84CC16',
]

// ── Chart: Tendência ───────────────────────────────────────────────────────
const optionTrend = computed(() => {
    const { labels, counts } = store.byMonth
    const avg = counts.length
        ? Math.round(counts.reduce((s, v) => s + v, 0) / counts.length)
        : 0
    return {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis', confine: true, appendToBody: true, extraCssText: TT,
            formatter: ps => `<span style="color:${sub_c.value}">${ps[0].name}</span><br/>` +
                `<span style="color:#EF4444;font-weight:600;font-size:14px">${ps[0].value}</span> distrato${ps[0].value !== 1 ? 's' : ''}`,
        },
        grid: { left: 8, right: 16, top: 12, bottom: labels.length > 10 ? 52 : 32, containLabel: true },
        dataZoom: labels.length > 14
            ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 6, borderColor: 'transparent', fillerColor: 'rgba(239,68,68,0.15)', handleStyle: { color: '#EF4444' }, textStyle: { color: sub_c.value } }]
            : [],
        xAxis: {
            type: 'category', data: labels, boundaryGap: false,
            axisLabel: { color: sub_c.value, fontSize: 11, rotate: labels.length > 10 ? 30 : 0 },
            axisLine: { lineStyle: { color: dim_c.value } }, axisTick: { show: false }, splitLine: { show: false },
        },
        yAxis: {
            type: 'value', minInterval: 1,
            axisLabel: { color: sub_c.value, fontSize: 11 },
            splitLine: { lineStyle: { color: dim_c.value, type: 'dashed' } }, axisLine: { show: false },
        },
        series: [{
            name: 'Distratos', type: 'line', smooth: 0.4,
            symbolSize: 6, symbol: 'circle',
            data: counts,
            lineStyle: { color: '#EF4444', width: 2.5, shadowColor: 'rgba(239,68,68,0.4)', shadowBlur: 8 },
            itemStyle: { color: '#EF4444', borderWidth: 2, borderColor: isDark() ? '#0F172A' : '#fff' },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(239,68,68,0.3)' }, { offset: 1, color: 'rgba(239,68,68,0.01)' }] } },
            markLine: avg > 0
                ? { silent: true, lineStyle: { color: 'rgba(239,68,68,0.45)', type: 'dashed', width: 1.5 }, data: [{ type: 'average', label: { color: sub_c.value, fontSize: 10, formatter: `μ ${avg}` } }] }
                : undefined,
        }],
    }
})

// ── Chart: Motivos ─────────────────────────────────────────────────────────
const allUnknownReasons = computed(() =>
    store.byReason.length === 0 ||
    store.byReason.every(r => r.name === 'Motivo não informado')
)

const optionReasons = computed(() => {
    const data = store.byReason.filter(r => r.name !== 'Motivo não informado').slice(0, 10)
    const total = data.reduce((s, d) => s + d.count, 0) + (store.byReason.find(r => r.name === 'Motivo não informado')?.count || 0)
    const full = [...data]
    const unknown = store.byReason.find(r => r.name === 'Motivo não informado')
    if (unknown && unknown.count > 0) full.push(unknown)
    return {
        backgroundColor: 'transparent',
        color: palette,
        tooltip: {
            trigger: 'item', confine: true, appendToBody: true, extraCssText: TT,
            formatter: p => `<b>${p.name}</b><br/>${p.value} distrato${p.value !== 1 ? 's' : ''} · <span style="color:${sub_c.value}">${total ? ((p.value / total) * 100).toFixed(1) : 0}%</span>`,
        },
        legend: {
            type: 'scroll', orient: 'vertical', left: 4, top: 'middle', width: 150,
            textStyle: { color: sub_c.value, fontSize: 10, width: 160, overflow: 'truncate', }, icon: 'circle', itemWidth: 7, itemHeight: 7, itemGap: 6,
            tooltip: {
                show: true
            }, icon: 'circle',
            itemWidth: 7,
            itemHeight: 7,
            itemGap: 6,
            formatter: function (name) {
                return name;
            }
        },
        graphic: [
            { type: 'text', left: '68%', top: '44%', style: { text: `${total}`, fill: txt.value, fontSize: 18, fontWeight: 'bold', textAlign: 'center' } },
            { type: 'text', left: '68%', top: '58%', style: { text: 'distratos', fill: sub_c.value, fontSize: 10, textAlign: 'center' } },
        ],
        series: [{
            type: 'pie', radius: ['45%', '70%'], center: ['68%', '50%'],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 8, fontWeight: 'bold', color: txt.value } },
            itemStyle: { borderRadius: 6, borderColor: isDark() ? '#111827' : '#fff', borderWidth: 2 },
            data: full.map(d => ({ name: d.name, value: d.count })),
        }],
    }
})

// ── Chart: Por empreendimento (count) ─────────────────────────────────────
const optionEntCount = computed(() => {
    const data = store.byEnterprise.slice(0, 12)
    const names = data.map(e => e.name.length > 32 ? e.name.slice(0, 32) + '…' : e.name)
    const avgCount = data.length ? data.reduce((s, e) => s + e.count, 0) / data.length : 0
    const alertNames = new Set(store.kpis.alerts.map(a => a.name))
    return {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis', confine: true, appendToBody: true, extraCssText: TT, axisPointer: { type: 'shadow' },
            formatter: ps => {
                const ent = data[ps[0].dataIndex]
                return `<b>${ent?.name}</b><br/>` +
                    `<span style="color:#EF4444;font-weight:600">${ps[0].value}</span> distrato${ps[0].value !== 1 ? 's' : ''}<br/>` +
                    `Valor rescisão: ${brlShort(ent?.amount)}`
            },
        },
        grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: 'value', minInterval: 1, axisLabel: { color: sub_c.value, fontSize: 10 }, splitLine: { lineStyle: { color: dim_c.value, type: 'dashed' } }, axisLine: { show: false } },
        yAxis: { type: 'category', data: names.slice().reverse(), axisLabel: { color: sub_c.value, fontSize: 10 }, axisTick: { show: false } },
        series: [{
            type: 'bar', barMaxWidth: 22,
            data: data.map(e => e.count).reverse(),
            itemStyle: {
                borderRadius: [0, 6, 6, 0],
                color: (p) => alertNames.has(data.slice().reverse()[p.dataIndex]?.name) ? '#F59E0B' : '#EF4444',
            },
            markLine: avgCount > 0
                ? { silent: true, lineStyle: { color: 'rgba(239,68,68,0.5)', type: 'dashed' }, data: [{ xAxis: avgCount, label: { color: sub_c.value, fontSize: 10, formatter: `μ ${avgCount.toFixed(1)}` } }] }
                : undefined,
        }],
    }
})

// ── Chart: Valor médio por empreendimento ─────────────────────────────────
const noAmounts = computed(() =>
    store.byEnterprise.every(e => e.avgAmount === 0)
)

const optionEntAvg = computed(() => {
    const data = store.byEnterprise.filter(e => e.avgAmount > 0).slice(0, 10)
    const names = data.map(e => e.name.length > 22 ? e.name.slice(0, 22) + '…' : e.name)
    return {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis', confine: true, appendToBody: true, extraCssText: TT, axisPointer: { type: 'shadow' },
            formatter: ps => {
                const ent = data[ps[0].dataIndex]
                return `<b>${ent?.name}</b><br/>` +
                    `Média: <span style="color:#F97316;font-weight:600">${fmtCurrency(ent?.avgAmount)}</span><br/>` +
                    `Total rescisão: ${fmtCurrency(ent?.amount)}<br/>` +
                    `VGV original: ${fmtCurrency(ent?.originalTotal)}`
            },
        },
        grid: { left: 8, right: 16, top: 12, bottom: names.length > 5 ? 48 : 32, containLabel: true },
        xAxis: {
            type: 'category', data: names,
            axisLabel: { color: sub_c.value, fontSize: 10, rotate: names.length > 5 ? 25 : 0, interval: 0 },
            axisLine: { lineStyle: { color: dim_c.value } }, axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: sub_c.value, fontSize: 10,
                formatter: v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : v,
            },
            splitLine: { lineStyle: { color: dim_c.value, type: 'dashed' } }, axisLine: { show: false },
        },
        series: [{
            type: 'bar', barMaxWidth: 36,
            data: data.map(e => e.avgAmount),
            itemStyle: {
                borderRadius: [6, 6, 0, 0],
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#F97316' }, { offset: 1, color: 'rgba(249,115,22,0.25)' }] },
            },
            label: {
                show: data.length <= 6,
                position: 'top',
                color: sub_c.value,
                fontSize: 9,
                formatter: p => brlShort(p.value),
            },
        }],
    }
})

// ── Table ──────────────────────────────────────────────────────────────────
const TABLE_LIMIT = 15
const tableSearch = ref('')
const tablePage = ref(1)
const sortCol = ref('cancelDate')
const sortAsc = ref(false)

const tableCols = [
    { key: 'number', label: 'Nº Contrato' },
    { key: 'enterprise', label: 'Empreendimento' },
    { key: 'customer', label: 'Cliente' },
    { key: 'unit', label: 'Unidade' },
    { key: 'cancelDate', label: 'Data Distrato' },
    { key: 'reason', label: 'Motivo' },
    { key: 'originalValue', label: 'VGV' },
    { key: 'cancelAmount', label: 'Valor Rescisão' },
]

function sortBy(col) {
    if (sortCol.value === col) sortAsc.value = !sortAsc.value
    else { sortCol.value = col; sortAsc.value = false }
}

const filteredRows = computed(() => {
    const q = tableSearch.value.toLowerCase().trim()
    let rows = q
        ? store.tableRows.filter(r =>
            r.enterprise?.toLowerCase().includes(q) ||
            r.customer?.toLowerCase().includes(q) ||
            r.reason?.toLowerCase().includes(q) ||
            String(r.number ?? '').includes(q)
        )
        : [...store.tableRows]

    rows.sort((a, b) => {
        const va = a[sortCol.value], vb = b[sortCol.value]
        const cmp = typeof va === 'number'
            ? (va || 0) - (vb || 0)
            : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR')
        return sortAsc.value ? cmp : -cmp
    })
    return rows
})

watch(filteredRows, () => { tablePage.value = 1 })

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / TABLE_LIMIT)))
const paginatedRows = computed(() => {
    const s = (tablePage.value - 1) * TABLE_LIMIT
    return filteredRows.value.slice(s, s + TABLE_LIMIT)
})
</script>
