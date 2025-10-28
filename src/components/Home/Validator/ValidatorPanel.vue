<template>
    <div
        class="h-full w-full flex flex-col rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60">

        <!-- Header -->
        <div
            class="px-4 py-3 md:px-6 md:h-24 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center gap-3">
            <div class="min-w-0 flex">
                <RouterLink to="/tools/validator?section=Validador"
                    class="text-base md:text-xl font-semibold inline-flex items-center gap-2">
                    <i class="fas fa-check-double"></i>
                    Validador<span class="md:hidden xl:block"> Contratos</span>
                </RouterLink>
                <Favorite class="m-auto" :router="'/tools/validator'" :section="'Validador'" />
            </div>

            <!-- KPIs -->
            <div class="flex-1 grid grid-cols-2 gap-2 ps-2 md:ps-4">
                <div class="rounded-lg my-auto ps-3 p-1.5 bg-white/60 dark:bg-gray-900/40 border-l-4 border-indigo-500">
                    <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">Validações</p>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 md:text-lg leading-tight">
                        {{ totals.aprovados + totals.reprovados }}
                    </p>
                    <p class="font-light text-[11px] leading-tight"
                        :class="delta.validacoes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{ delta.validacoes >= 0 ? '+' : '' }}{{ delta.validacoes.toFixed(1) }}%
                    </p>
                </div>

                <div class="rounded-lg px-3 py-2 bg-white/60 dark:bg-gray-900/40 border-l-4 border-emerald-500">
                    <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">Aprovação</p>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 md:text-lg leading-tight">
                        {{ approvalRate }}%
                    </p>
                    <p class="font-light text-[11px] leading-tight"
                        :class="delta.aprovacao >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{ delta.aprovacao >= 0 ? '+' : '' }}{{ delta.aprovacao.toFixed(1) }}%
                    </p>
                </div>
            </div>
        </div>

        <!-- Chart -->
        <div class="flex-1 min-h-60 p-3 md:p-4">
            <div ref="chartWrap" class="relative w-full h-full min-h-[200px]">
                <VChart v-if="!loading" :option="chartOption" autoresize class="absolute inset-0 h-full w-full" />
                <div v-else role="status" class="absolute inset-0 overflow-hidden p-4 md:p-6 animate-pulse">
                    <div class="flex h-full items-end gap-3">
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-24"></div>
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-48"></div>
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-28"></div>
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-52"></div>
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-20"></div>
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-36"></div>
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-40"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Controles -->
        <div class="w-full flex items-center justify-start gap-2 p-4 pt-0 -mt-3">
            <select v-model="selectedPeriod"
                class="h-9 rounded-md bg-white/70 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 text-xs">
                <option v-for="o in periodOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAIStore } from '@/stores/Config/aiStore'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])
import Favorite from '@/components/config/Favorite.vue'

/* ======== dayjs (local do usuário) ======== */
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
dayjs.locale('pt-br')

const ai = useAIStore()
const loading = ref(true)

/** === Carregar dados === */
onMounted(async () => {
    loading.value = true
    try { await ai.fetchValidatorHistory(true) } finally { loading.value = false }
})

/** === Períodos & agrupamento === */
const periodOptions = [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: 'mtd', label: 'Este mês' },
    { value: 'prev-month', label: 'Mês passado' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: '12m', label: 'Últimos 12 meses' },
]
const selectedPeriod = ref('7d')
const groupMonthly = ref(false)
 
const keyOfDate = (d) => dayjs(d).format('YYYY-MM-DD')
const labelOfDate = (d) => dayjs(d).format('DD/MM')

const keyOfMonth = (d) => dayjs(d).format('YYYY-MM')
const labelOfMonth = (d) => dayjs(d).format('MMM YY')

/** Normalização do retorno da store */
const norm = (raw) => Array.isArray(raw) ? raw : (raw?.results || raw?.items || [])

/** Range atual (mesma duração) — SEM fixar fuso, usa local do usuário */
const currentRange = computed(() => {
    const now = dayjs()
    const todayStart = now.startOf('day')

    const map = {
        '7d': { start: todayStart.subtract(6, 'day').toDate(), end: now.endOf('day').toDate(), group: 'day' },
        '30d': { start: todayStart.subtract(29, 'day').toDate(), end: now.endOf('day').toDate(), group: 'day' },
        '90d': { start: todayStart.subtract(89, 'day').toDate(), end: now.endOf('day').toDate(), group: 'day' },
        '12m': { start: now.startOf('month').subtract(11, 'month').toDate(), end: now.endOf('day').toDate(), group: 'month' },
        'mtd': { start: now.startOf('month').toDate(), end: now.endOf('day').toDate(), group: 'day' },
        'prev-month': {
            start: now.subtract(1, 'month').startOf('month').toDate(),
            end: now.subtract(1, 'month').endOf('month').toDate(),
            group: 'day'
        },
    }
    const r = map[selectedPeriod.value] ?? map['7d']
    const group = groupMonthly.value ? 'month' : r.group
    return { ...r, group }
})

/** Range anterior (mesma duração do atual) */
const previousRange = computed(() => {
    const r = currentRange.value
    const start = dayjs(r.start)
    const end = dayjs(r.end)
    const days = Math.max(1, end.endOf('day').diff(start.startOf('day'), 'day') + 1)

    if (selectedPeriod.value === 'mtd') {
        const ref = start.subtract(1, 'month')
        const s = ref.startOf('month')
        const e = s.add(days - 1, 'day').endOf('day')
        return { start: s.toDate(), end: e.toDate(), group: r.group }
    }

    if (selectedPeriod.value === 'prev-month') {
        const cur = dayjs(r.start)
        const s = cur.subtract(1, 'month').startOf('month')
        const e = cur.subtract(1, 'month').endOf('month')
        return { start: s.toDate(), end: e.toDate(), group: r.group }
    }

    const s = start.subtract(days, 'day').startOf('day')
    const e = s.add(days - 1, 'day').endOf('day')
    return { start: s.toDate(), end: e.toDate(), group: r.group }
})

/** Filtra os registros por range (local) */
const filteredRows = (range) => {
    const rows = norm(ai.validatorHistory)
    const s = range.start.getTime(), e = range.end.getTime()
    return rows.filter(r => {
        const d = dayjs(r.createdAt || r.updatedAt || Date.now()).toDate().getTime()
        return d >= s && d <= e
    })
}

/** Agregações: por dia ou mês + top empreendimentos (local) */
const makeSeries = (range) => {
    const by = new Map()
    const rows = filteredRows(range)

    for (const r of rows) {
        const baseDate = r.createdAt || r.updatedAt || Date.now()
        const k = range.group === 'month' ? keyOfMonth(baseDate) : keyOfDate(baseDate)

        if (!by.has(k)) by.set(k, { a: 0, r: 0, emp: new Map(), date: dayjs(baseDate).toDate() })
        const b = by.get(k)

        const ok = String(r.status || '').toUpperCase() === 'APROVADO'
        ok ? b.a++ : b.r++

        const emp = String(r.empreendimento || '—')
        b.emp.set(emp, (b.emp.get(emp) || 0) + 1)
    }

    // preencher buracos do range
    const out = []
    if (range.group === 'month') {
        const start = dayjs(range.start).startOf('month')
        const end = dayjs(range.end)
        let cursor = start
        while (cursor.isBefore(end) || cursor.isSame(end, 'month')) {
            const k = keyOfMonth(cursor)
            const b = by.get(k) || { a: 0, r: 0, emp: new Map(), date: cursor.toDate() }
            const topEmp = [...b.emp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome, qtd]) => ({ nome, qtd }))
            out.push({ key: k, label: labelOfMonth(cursor), aprovados: b.a, reprovados: b.r, topEmp })
            cursor = cursor.add(1, 'month')
        }
    } else {
        const totalDays = Math.max(1, dayjs(range.end).endOf('day').diff(dayjs(range.start).startOf('day'), 'day') + 1)
        for (let i = 0; i < totalDays; i++) {
            const dd = dayjs(range.start).startOf('day').add(i, 'day')
            const k = keyOfDate(dd)
            const b = by.get(k) || { a: 0, r: 0, emp: new Map(), date: dd.toDate() }
            const topEmp = [...b.emp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome, qtd]) => ({ nome, qtd }))
            out.push({ key: k, label: labelOfDate(dd), aprovados: b.a, reprovados: b.r, topEmp })
        }
    }
    return out
}

const days = computed(() => makeSeries(currentRange.value))
const prevDays = computed(() => makeSeries(previousRange.value))

/** Totais e comparação */
const totals = computed(() =>
    days.value.reduce((acc, d) =>
        ({ aprovados: acc.aprovados + d.aprovados, reprovados: acc.reprovados + d.reprovados }),
        { aprovados: 0, reprovados: 0 })
)
const totalsPrev = computed(() =>
    prevDays.value.reduce((acc, d) =>
        ({ aprovados: acc.aprovados + d.aprovados, reprovados: acc.reprovados + d.reprovados }),
        { aprovados: 0, reprovados: 0 })
)

const approvalRate = computed(() => {
    const t = totals.value.aprovados + totals.value.reprovados
    return t ? Math.round((totals.value.aprovados / t) * 100) : 0
})
const approvalRateNow = computed(() => {
    const t = totals.value.aprovados + totals.value.reprovados
    return t ? (totals.value.aprovados / t) : 0
})
const approvalRatePrev = computed(() => {
    const t = totalsPrev.value.aprovados + totalsPrev.value.reprovados
    return t ? (totalsPrev.value.aprovados / t) : 0
})
const approvalRateDelta = computed(() => {
    const prev = approvalRatePrev.value
    return prev ? ((approvalRateNow.value - prev) / prev) * 100 : 0
})
const delta = computed(() => {
    const cur = totals.value.aprovados + totals.value.reprovados
    const prev = totalsPrev.value.aprovados + totalsPrev.value.reprovados
    const validacoesPct = prev ? ((cur - prev) / prev) * 100 : 0
    return { validacoes: validacoesPct, aprovacao: approvalRateDelta.value }
})

/** === ECharts (cores mantidas) === */
const chartOption = computed(() => {
    const labels = days.value.map(d => d.label)
    const aprov = days.value.map(d => d.aprovados)
    const reprov = days.value.map(d => d.reprovados)
    const tipByIndex = days.value.map(d => d.topEmp)

    const primaryColor = '#6366F1'
    const secondaryColor = '#24295F'

    return {
        animationDuration: 400,
        grid: { left: 6, right: 8, top: 24, bottom: 8, containLabel: true },
        legend: { top: 0, textStyle: { color: '#9CA3AF', fontSize: 10 } },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: '#111827',
            borderWidth: 0,
            textStyle: { color: '#f4f4f4' },
            formatter: (params) => {
                const idx = params?.[0]?.dataIndex ?? 0
                const emp = tipByIndex[idx] || []
                const head = `<div style="font-weight:700;margin-bottom:4px">${labels[idx]}</div>`
                const lines = params.map(p =>
                    `<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px;"></span>${p.seriesName}: <b>${p.value}</b></div>`
                ).join('')
                const empHtml = emp.length ? `<div style="margin-top:6px;opacity:.9">${emp.map(e => `<div>• ${e.nome} (${e.qtd})</div>`).join('')}</div>` : ''
                return head + lines + empHtml
            }
        },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: {
                color: '#9CA3AF', fontSize: 10, interval: 0,
                rotate: labels.length > 8 ? 28 : 0, hideOverlap: true, margin: 8
            },
            axisLine: { lineStyle: { color: '#212121' } },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#9CA3AF', fontSize: 10 },
            splitLine: { lineStyle: { color: '#212121' } },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: [
            {
                name: 'Aprovados', type: 'bar', stack: 'v', barMaxWidth: 42, barCategoryGap: '30%',
                itemStyle: { color: primaryColor, borderRadius: [0, 0, 0, 0] }, emphasis: { focus: 'series' }, data: aprov
            },
            {
                name: 'Reprovados', type: 'bar', stack: 'v', barMaxWidth: 42, barCategoryGap: '30%',
                itemStyle: { color: secondaryColor, borderRadius: [6, 6, 0, 0] }, emphasis: { focus: 'series' }, data: reprov
            }
        ],
        media: [
            {
                query: { maxWidth: 480 }, option: {
                    grid: { left: 2, right: 2, top: 24, bottom: 6, containLabel: true },
                    xAxis: { axisLabel: { fontSize: 9, rotate: 30, margin: 3 } },
                    yAxis: { axisLabel: { fontSize: 9 } },
                    series: [{ barMaxWidth: 30, barCategoryGap: '28%' }, { barMaxWidth: 30, barCategoryGap: '28%' }]
                }
            },
            {
                query: { maxWidth: 768 }, option: {
                    grid: { left: 4, right: 4, top: 24, bottom: 8, containLabel: true },
                    xAxis: { axisLabel: { fontSize: 9, rotate: 20 } },
                    series: [{ barMaxWidth: 36, barCategoryGap: '26%' }, { barMaxWidth: 36, barCategoryGap: '26%' }]
                }
            }
        ]
    }
})
</script>
