<script setup>
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, FunnelChart, PieChart, HeatmapChart } from 'echarts/charts'
import {
    TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent, VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
    LineChart, BarChart, FunnelChart, PieChart, HeatmapChart,
    TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent, VisualMapComponent,
    CanvasRenderer
])

const props = defineProps({
    leads: { type: Array, default: () => [] },
    leadsByEnterprise: { type: Array, default: () => [] }, // [{ name, count, leads }]
})

const emit = defineEmits(['abrirModal', 'filtrarSituacao'])

/** ================= THEME ================= */
const isDark = computed(() => document.documentElement.classList.contains('dark'))
const txt = computed(() => (isDark.value ? '#E5E7EB' : '#111827'))
const sub = computed(() => (isDark.value ? '#9CA3AF' : '#6B7280'))
const gridLine = computed(() => (isDark.value ? '#374151' : '#E5E7EB'))

const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1']

const baseCardClass =
    'bg-white/80 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700 rounded-2xl shadow-sm'
const headerClass =
    'flex items-center justify-between gap-2 mb-2'

/** ================= HELPERS ================= */
const safeStr = (v, fallback = '—') => (v == null || String(v).trim() === '' ? fallback : String(v).trim())
const parseDate = (d) => {
    const dt = new Date(d)
    return isNaN(dt) ? null : dt
}
const dateKey = (d) => {
    const dt = parseDate(d)
    if (!dt) return null
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
const weekKey = (d) => {
    const dt = parseDate(d)
    if (!dt) return null
    // ISO-ish week bucket: YYYY-W##
    const tmp = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
    const dayNum = tmp.getUTCDay() || 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
const getEnterpriseNames = (l) => {
    const arr = Array.isArray(l?.empreendimento) ? l.empreendimento : []
    if (!arr.length) return ['Sem Empreendimento']
    const names = arr.map(e => safeStr(e?.nome, 'Sem Empreendimento'))
    return names.length ? names : ['Sem Empreendimento']
}
const getHour = (d) => {
    const dt = parseDate(d)
    if (!dt) return null
    return dt.getHours()
}
const getDow = (d) => {
    const dt = parseDate(d)
    if (!dt) return null
    // 0=Dom..6=Sáb
    return dt.getDay()
}

/** ================= UI CONTROLS ================= */
const trendBucket = ref('day') // 'day' | 'week'
const topN = ref(10) // para rankings + "Outros"
const showOthers = ref(true)

/** ================== DERIVED GROUPS ================== */
// Status
const statusCounts = computed(() => {
    const m = new Map()
    for (const l of props.leads || []) {
        const s = safeStr(l?.situacao_nome, 'Sem Situação')
        m.set(s, (m.get(s) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
})

// Trend (dia/semana)
const trend = computed(() => {
    const m = new Map()
    const keyFn = trendBucket.value === 'week' ? weekKey : dateKey
    for (const l of props.leads || []) {
        const k = keyFn(l?.data_cad)
        if (!k) continue
        m.set(k, (m.get(k) || 0) + 1)
    }
    const keys = [...m.keys()].sort()
    return { keys, values: keys.map(k => m.get(k) || 0) }
})

// Empreendimento (top N + outros)
const enterpriseCounts = computed(() => {
    const m = new Map()
    for (const l of props.leads || []) {
        for (const name of getEnterpriseNames(l)) m.set(name, (m.get(name) || 0) + 1)
    }
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1])
    if (!sorted.length) return []
    const top = sorted.slice(0, topN.value)
    const rest = sorted.slice(topN.value)
    if (showOthers.value && rest.length) {
        const others = rest.reduce((acc, [, v]) => acc + v, 0)
        top.push(['Outros', others])
    }
    return top
})

// Origem e Mídia (top N + outros)
const originCounts = computed(() => {
    const m = new Map()
    for (const l of props.leads || []) {
        const k = safeStr(l?.origem, 'Sem Origem')
        m.set(k, (m.get(k) || 0) + 1)
    }
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, topN.value)
    const rest = sorted.slice(topN.value)
    if (showOthers.value && rest.length) top.push(['Outros', rest.reduce((a, [, v]) => a + v, 0)])
    return top
})

const mediaCounts = computed(() => {
    const m = new Map()
    for (const l of props.leads || []) {
        const k = safeStr(l?.midia_principal, 'Sem Mídia')
        m.set(k, (m.get(k) || 0) + 1)
    }
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, topN.value)
    const rest = sorted.slice(topN.value)
    if (showOthers.value && rest.length) top.push(['Outros', rest.reduce((a, [, v]) => a + v, 0)])
    return top
})

// Stacked (eixo X = empreendimentos topN, stack = status)
const stackedByEnterprise = computed(() => {
    const x = enterpriseCounts.value.map(([name]) => name).filter(n => n !== 'Outros')
    const statusList = statusCounts.value.map(([s]) => s).slice(0, 8) // limita pra ficar legível
    const matrix = new Map() // enterprise -> status -> count

    for (const l of props.leads || []) {
        const s = safeStr(l?.situacao_nome, 'Sem Situação')
        if (!statusList.includes(s)) continue
        for (const e of getEnterpriseNames(l)) {
            if (!x.includes(e)) continue
            const mm = matrix.get(e) || new Map()
            mm.set(s, (mm.get(s) || 0) + 1)
            matrix.set(e, mm)
        }
    }

    const series = statusList.map((s, i) => ({
        name: s,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: x.map(e => matrix.get(e)?.get(s) || 0),
    }))

    return { x, series }
})

// Heatmap dia da semana x hora
const heatmap = computed(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + 'h')
    const map = new Map() // `${dow}-${hour}` -> count
    let max = 0

    for (const l of props.leads || []) {
        const dow = getDow(l?.data_cad)
        const h = getHour(l?.data_cad)
        if (dow == null || h == null) continue
        const key = `${dow}-${h}`
        const v = (map.get(key) || 0) + 1
        map.set(key, v)
        if (v > max) max = v
    }

    const data = []
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            data.push([h, d, map.get(`${d}-${h}`) || 0])
        }
    }

    return { days, hours, data, max }
})

/** ================== OPTIONS ================== */
const optionTrend = computed(() => ({
    color: palette,
    title: { text: 'Tendência', subtext: trendBucket.value === 'week' ? 'Leads por semana' : 'Leads por dia', left: 12, top: 10, textStyle: { color: txt.value, fontSize: 14 }, subtextStyle: { color: sub.value } },
    tooltip: { trigger: 'axis', confine: true },
    grid: { left: 36, right: 18, top: 56, bottom: 36, containLabel: true },
    dataZoom: trend.value.keys.length > 25 ? [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 10 }] : [],
    xAxis: { type: 'category', data: trend.value.keys, axisLabel: { color: sub.value, fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { color: sub.value, fontSize: 11 }, splitLine: { lineStyle: { color: gridLine.value } } },
    series: [{
        name: 'Leads',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: trend.value.values,
        areaStyle: { opacity: 0.10 }
    }]
}))

const optionFunnel = computed(() => ({
    color: palette,
    title: { text: 'Funil por Situação', subtext: 'Clique para filtrar', left: 12, top: 10, textStyle: { color: txt.value, fontSize: 14 }, subtextStyle: { color: sub.value } },
    tooltip: { trigger: 'item', confine: true },
    series: [{
        type: 'funnel',
        left: '10%', right: '10%',
        top: 56, bottom: 12,
        sort: 'descending',
        gap: 2,
        minSize: '10%',
        maxSize: '90%',
        label: { color: txt.value, fontSize: 12, formatter: '{b}: {c}' },
        itemStyle: { borderColor: 'transparent', borderRadius: 10 },
        data: statusCounts.value.map(([name, value]) => ({ name, value }))
    }]
}))

const optionDonutEnterprise = computed(() => ({
    color: palette,
    title: { text: 'Empreendimentos', subtext: `Top ${topN.value}${showOthers.value ? ' + Outros' : ''} (clique para abrir)`, left: 12, top: 10, textStyle: { color: txt.value, fontSize: 14 }, subtextStyle: { color: sub.value } },
    tooltip: { trigger: 'item', confine: true },
    legend: { type: 'scroll', orient: 'vertical', left: 'left', top: 56, bottom: 12, textStyle: { color: sub.value, fontSize: 11 } },
    series: [{
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['68%', '55%'],
        padAngle: 1,
        label: { show: false },
        emphasis: { label: { show: true, color: txt.value, fontWeight: 'bold' } },
        data: enterpriseCounts.value.map(([name, value]) => ({ name, value }))
    }]
}))

const optionTopEnterpriseBars = computed(() => {
    const x = enterpriseCounts.value.map(([n]) => n)
    const y = enterpriseCounts.value.map(([, v]) => v)
    return {
        color: palette,
        title: { text: 'Ranking de Empreendimentos', subtext: 'Clique para abrir', left: 12, top: 10, textStyle: { color: txt.value, fontSize: 14 }, subtextStyle: { color: sub.value } },
        tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' } },
        grid: { left: 120, right: 18, top: 56, bottom: 24, containLabel: true },
        xAxis: { type: 'value', axisLabel: { color: sub.value }, splitLine: { lineStyle: { color: gridLine.value } } },
        yAxis: { type: 'category', data: x, axisLabel: { color: sub.value, fontSize: 11 }, inverse: true },
        series: [{ name: 'Leads', type: 'bar', data: y, barWidth: 14, itemStyle: { borderRadius: [8, 8, 8, 8] } }]
    }
})

const optionStackedStatusByEnterprise = computed(() => ({
    color: palette,
    title: { text: 'Status por Empreendimento', subtext: 'Top empreendimentos × Top status', left: 12, top: 10, textStyle: { color: txt.value, fontSize: 14 }, subtextStyle: { color: sub.value } },
    tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' } },
    legend: { type: 'scroll', top: 52, textStyle: { color: sub.value, fontSize: 11 } },
    grid: { left: 32, right: 18, top: 84, bottom: 52, containLabel: true },
    dataZoom: stackedByEnterprise.value.x.length > 10 ? [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 18 }] : [],
    xAxis: { type: 'category', data: stackedByEnterprise.value.x, axisLabel: { color: sub.value, rotate: 18, fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { color: sub.value }, splitLine: { lineStyle: { color: gridLine.value } } },
    series: stackedByEnterprise.value.series
}))

const optionHeatmap = computed(() => ({
    title: { text: 'Horários de Maior Entrada', subtext: 'Dia da semana × Hora', left: 12, top: 10, textStyle: { color: txt.value, fontSize: 14 }, subtextStyle: { color: sub.value } },
    tooltip: { position: 'top', confine: true, formatter: (p) => `${heatmap.value.days[p.value[1]]} • ${heatmap.value.hours[p.value[0]]}<br/><b>${p.value[2]}</b> lead(s)` },
    grid: { left: 56, right: 18, top: 56, bottom: 28, containLabel: true },
    xAxis: { type: 'category', data: heatmap.value.hours, axisLabel: { color: sub.value, fontSize: 10, interval: 1 } },
    yAxis: { type: 'category', data: heatmap.value.days, axisLabel: { color: sub.value, fontSize: 11 } },
    visualMap: {
        min: 0,
        max: Math.max(1, heatmap.value.max),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        textStyle: { color: sub.value }
    },
    series: [{
        name: 'Leads',
        type: 'heatmap',
        data: heatmap.value.data,
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.25)' } }
    }]
}))

const optionOrigins = computed(() => ({
    color: palette,
    title: { text: 'Origens', subtext: 'Clique para abrir', left: 12, top: 10, textStyle: { color: txt.value, fontSize: 14 }, subtextStyle: { color: sub.value } },
    tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' } },
    grid: { left: 140, right: 18, top: 56, bottom: 24, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: sub.value }, splitLine: { lineStyle: { color: gridLine.value } } },
    yAxis: { type: 'category', data: originCounts.value.map(([n]) => n), axisLabel: { color: sub.value, fontSize: 11 }, inverse: true },
    series: [{ name: 'Leads', type: 'bar', data: originCounts.value.map(([, v]) => v), barWidth: 14, itemStyle: { borderRadius: 8 } }]
}))

const optionMedia = computed(() => ({
    color: palette,
    title: { text: 'Mídias', subtext: 'Clique para abrir', left: 12, top: 10, textStyle: { color: txt.value, fontSize: 14 }, subtextStyle: { color: sub.value } },
    tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' } },
    grid: { left: 140, right: 18, top: 56, bottom: 24, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: sub.value }, splitLine: { lineStyle: { color: gridLine.value } } },
    yAxis: { type: 'category', data: mediaCounts.value.map(([n]) => n), axisLabel: { color: sub.value, fontSize: 11 }, inverse: true },
    series: [{ name: 'Leads', type: 'bar', data: mediaCounts.value.map(([, v]) => v), barWidth: 14, itemStyle: { borderRadius: 8 } }]
}))

/** ================== CLICK ACTIONS ================== */
function openByStatus(status) {
    emit('filtrarSituacao', status)
    // opcional: também abre modal com o recorte
    const leads = (props.leads || []).filter(l => safeStr(l?.situacao_nome, 'Sem Situação') === status)
    emit('abrirModal', [leads, 'list'])
}

function openByEnterprise(name) {
    if (name === 'Outros') return
    const found = (props.leadsByEnterprise || []).find(e => e.name === name)
    if (found?.leads?.length) return emit('abrirModal', [found.leads, 'list'])
    // fallback (se leadsByEnterprise não tiver leads completos)
    const leads = (props.leads || []).filter(l => getEnterpriseNames(l).includes(name))
    emit('abrirModal', [leads, 'list'])
}

function openByOrigin(name) {
    if (name === 'Outros') return
    const leads = (props.leads || []).filter(l => safeStr(l?.origem, 'Sem Origem') === name)
    emit('abrirModal', [leads, 'list'])
}

function openByMedia(name) {
    if (name === 'Outros') return
    const leads = (props.leads || []).filter(l => safeStr(l?.midia_principal, 'Sem Mídia') === name)
    emit('abrirModal', [leads, 'list'])
}

function onChartClick(kind, params) {
    const name = params?.name
    if (!name) return
    if (kind === 'funnel') return openByStatus(name)
    if (kind === 'donutEnterprise') return openByEnterprise(name)
    if (kind === 'topEnterprise') return openByEnterprise(name)
    if (kind === 'origins') return openByOrigin(name)
    if (kind === 'media') return openByMedia(name)
}
</script>

<template>
    <!-- Controls -->
    <div class="mb-4 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <div class="flex items-center gap-2">
            <div class="text-sm font-semibold text-gray-800 dark:text-gray-100">Dashboard</div>
            <div class="text-xs text-gray-500 dark:text-gray-300">
                {{ leads?.length || 0 }} lead(s)
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <div class="inline-flex rounded-lg border dark:border-gray-700 overflow-hidden">
                <button class="px-3 py-1 text-sm"
                    :class="trendBucket === 'day' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'"
                    @click="trendBucket = 'day'">
                    Dia
                </button>
                <button class="px-3 py-1 text-sm border-l dark:border-gray-700"
                    :class="trendBucket === 'week' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'"
                    @click="trendBucket = 'week'">
                    Semana
                </button>
            </div>

            <div class="inline-flex rounded-lg border dark:border-gray-700 overflow-hidden">
                <button class="px-3 py-1 text-sm"
                    :class="showOthers ? 'bg-gray-900 text-white dark:bg-gray-700' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'"
                    @click="showOthers = !showOthers">
                    {{ showOthers ? 'Com Outros' : 'Sem Outros' }}
                </button>
            </div>

            <div
                class="inline-flex items-center gap-2 rounded-lg border dark:border-gray-700 px-3 py-1 bg-white/70 dark:bg-gray-900/30">
                <span class="text-xs text-gray-600 dark:text-gray-300">Top</span>
                <select v-model.number="topN"
                    class="text-sm bg-transparent outline-none text-gray-800 dark:text-gray-100">
                    <option :value="6">6</option>
                    <option :value="8">8</option>
                    <option :value="10">10</option>
                    <option :value="12">12</option>
                </select>
            </div>
        </div>
    </div>

    <!-- Row 1 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-6 p-3 sm:p-4" :class="baseCardClass">
            <div :class="headerClass">
                <div>
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Tendência</div>
                    <div class="text-xs text-gray-500 dark:text-gray-300">Volume ao longo do tempo</div>
                </div>
            </div>
            <VChart :option="optionTrend" autoresize style="height: 320px; width: 100%;" />
        </div>

        <div class="lg:col-span-3 p-3 sm:p-4" :class="baseCardClass">
            <div :class="headerClass">
                <div>
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Funil</div>
                    <div class="text-xs text-gray-500 dark:text-gray-300">Clique no status</div>
                </div>
            </div>
            <VChart :option="optionFunnel" autoresize style="height: 320px; width: 100%;"
                @click="p => onChartClick('funnel', p)" />
        </div>

        <div class="lg:col-span-3 p-3 sm:p-4" :class="baseCardClass">
            <div :class="headerClass">
                <div>
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Empreendimentos</div>
                    <div class="text-xs text-gray-500 dark:text-gray-300">Distribuição</div>
                </div>
            </div>
            <VChart :option="optionDonutEnterprise" autoresize style="height: 320px; width: 100%;"
                @click="p => onChartClick('donutEnterprise', p)" />
        </div>
    </div>

    <!-- Row 2 -->
    <div class="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-6 p-3 sm:p-4" :class="baseCardClass">
            <div :class="headerClass">
                <div>
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Status × Empreendimento</div>
                    <div class="text-xs text-gray-500 dark:text-gray-300">Comparação por status</div>
                </div>
            </div>
            <VChart :option="optionStackedStatusByEnterprise" autoresize style="height: 360px; width: 100%;" />
        </div>

        <div class="lg:col-span-6 p-3 sm:p-4" :class="baseCardClass">
            <div :class="headerClass">
                <div>
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Heatmap</div>
                    <div class="text-xs text-gray-500 dark:text-gray-300">Melhores horários</div>
                </div>
            </div>
            <VChart :option="optionHeatmap" autoresize style="height: 360px; width: 100%;" />
        </div>
    </div>

    <!-- Row 3 -->
    <div class="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-4 p-3 sm:p-4" :class="baseCardClass">
            <VChart :option="optionTopEnterpriseBars" autoresize style="height: 340px; width: 100%;"
                @click="p => onChartClick('topEnterprise', p)" />
        </div>

        <div class="lg:col-span-4 p-3 sm:p-4" :class="baseCardClass">
            <VChart :option="optionOrigins" autoresize style="height: 340px; width: 100%;"
                @click="p => onChartClick('origins', p)" />
        </div>

        <div class="lg:col-span-4 p-3 sm:p-4" :class="baseCardClass">
            <VChart :option="optionMedia" autoresize style="height: 340px; width: 100%;"
                @click="p => onChartClick('media', p)" />
        </div>
    </div>
</template>