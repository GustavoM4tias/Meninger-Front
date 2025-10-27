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
                    <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">Validações
                    </p>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 md:text-lg leading-tight">
                        {{ totals.aprovados + totals.reprovados }}
                    </p>
                    <p class="font-light text-[11px] leading-tight"
                        :class="delta.validacoes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{ delta.validacoes >= 0 ? '+' : '' }}{{ delta.validacoes.toFixed(1) }}%
                    </p>
                </div>

                <div class="rounded-lg px-3 py-2 bg-white/60 dark:bg-gray-900/40 border-l-4 border-emerald-500">
                    <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">Aprovação
                    </p>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 md:text-lg leading-tight">
                        {{ approvalRate }}%
                    </p>
                    <p class="font-light text-[11px] leading-tight"
                        :class="delta.aprovacao >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{ delta.aprovacao >= 0 ? '+' : '' }}{{ delta.aprovacao.toFixed(1) }}%
                    </p>
                </div>
                <!-- <div class="rounded-lg px-3 py-2 bg-white/60 dark:bg-gray-900/40 border-l-4 border-rose-700">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">Reprovados
                    </p>
                    <p class="font-semibold text-rose-600 dark:text-red-400 leading-tight">
                        {{ totals.reprovados }}
                    </p>
                </div> -->
            </div>

        </div>

        <!-- Chart --> 
        <div class="flex-1 min-h-60 p-3 md:p-4">
            <!-- wrapper relativo define a área fixa do chart -->
            <div ref="chartWrap" class="relative w-full h-full min-h-[200px]">
                <!-- chart ocupa toda a área -->
                <VChart v-if="!loading" :option="chartOption" autoresize class="absolute inset-0 h-full w-full" />

                <!-- skeleton ocupa a MESMA área, sem quebrar layout -->
                <div v-else role="status" class="absolute inset-0 overflow-hidden p-4 md:p-6 animate-pulse">
                    <!-- barras “grudadas” no rodapé -->
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

            <!-- <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <input type="checkbox" v-model="groupMonthly"
                    class="rounded border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-900/40">
                Agrupar por mês
            </label> -->
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
    { value: 'mtd', label: 'Este mês (MTD)' },
    { value: 'prev-month', label: 'Mês passado' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: '12m', label: 'Últimos 12 meses' },
]
const selectedPeriod = ref('7d')
const groupMonthly = ref(false)

/** Utils de data */
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const keyOfDate = (d) => new Date(d).toISOString().slice(0, 10)
const labelOfDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const keyOfMonth = (d) => {
    const x = new Date(d); const y = x.getFullYear(); const m = String(x.getMonth() + 1).padStart(2, '0'); return `${y}-${m}`
}
const labelOfMonth = (d) => new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

/** Normalização do retorno da store */
const norm = (raw) => Array.isArray(raw) ? raw : (raw?.results || raw?.items || [])

/** Range atual e anterior (mesma duração) */
const currentRange = computed(() => {
    const now = new Date()
    const todayStart = startOfDay(now)

    const map = {
        '7d': { start: new Date(todayStart.getTime() - 6 * 864e5), end: endOfDay(now), group: 'day' },
        '30d': { start: new Date(todayStart.getTime() - 29 * 864e5), end: endOfDay(now), group: 'day' },
        '90d': { start: new Date(todayStart.getTime() - 89 * 864e5), end: endOfDay(now), group: 'day' },
        '12m': { start: new Date(now.getFullYear(), now.getMonth() - 11, 1), end: endOfDay(now), group: 'month' },
        'mtd': { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now), group: 'day' },
        'prev-month': {
            start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
            group: 'day'
        },
    }
    const r = map[selectedPeriod.value] ?? map['7d']
    // se a pessoa marcar "Agrupar por mês", força agrupamento mensal
    const group = groupMonthly.value ? 'month' : r.group
    return { ...r, group }
})

const previousRange = computed(() => {
    const r = currentRange.value
    // duração em dias (inteiros)
    const days = Math.max(1, Math.round((endOfDay(r.end) - startOfDay(r.start)) / 864e5) + 1)

    // MTD -> mesmo nº de dias do mês anterior
    if (selectedPeriod.value === 'mtd') {
        const ref = new Date(r.start); ref.setMonth(ref.getMonth() - 1)
        const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
        const end = endOfDay(new Date(ref.getFullYear(), ref.getMonth(), Math.min(days, 31)))
        end.setDate(start.getDate() + (days - 1))
        return { start, end, group: r.group }
    }

    // Prev-month -> mês imediatamente anterior ao mês anterior (para comparação)
    if (selectedPeriod.value === 'prev-month') {
        const cur = r.start
        const start = new Date(cur.getFullYear(), cur.getMonth() - 1, 1)
        const end = endOfDay(new Date(cur.getFullYear(), cur.getMonth(), 0))
        return { start, end, group: r.group }
    }

    // demais: período imediatamente anterior com a mesma duração
    const start = new Date(startOfDay(r.start).getTime() - days * 864e5)
    const end = endOfDay(new Date(start.getTime() + (days - 1) * 864e5))
    return { start, end, group: r.group }
})

/** Filtra os registros por range */
const filteredRows = (range) => {
    const rows = norm(ai.validatorHistory)
    const s = range.start.getTime(), e = range.end.getTime()
    return rows.filter(r => {
        const d = new Date(r.createdAt || r.updatedAt || Date.now()).getTime()
        return d >= s && d <= e
    })
}

/** Agregações: por dia ou mês + top empreendimentos */
const makeSeries = (range) => {
    const by = new Map()
    const rows = filteredRows(range)
    for (const r of rows) {
        const k = range.group === 'month'
            ? keyOfMonth(r.createdAt || r.updatedAt || Date.now())
            : keyOfDate(r.createdAt || r.updatedAt || Date.now())
        if (!by.has(k)) by.set(k, { a: 0, r: 0, emp: new Map(), date: new Date(r.createdAt || r.updatedAt || Date.now()) })
        const b = by.get(k)
        const ok = String(r.status || '').toUpperCase() === 'APROVADO'
        ok ? b.a++ : b.r++
        const emp = String(r.empreendimento || '—')
        b.emp.set(emp, (b.emp.get(emp) || 0) + 1)
    }

    // preencher buracos do range
    const out = []
    if (range.group === 'month') {
        const start = new Date(range.start.getFullYear(), range.start.getMonth(), 1)
        const end = range.end
        const cursor = new Date(start)
        while (cursor <= end) {
            const k = keyOfMonth(cursor)
            const b = by.get(k) || { a: 0, r: 0, emp: new Map(), date: new Date(cursor) }
            const topEmp = [...b.emp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome, qtd]) => ({ nome, qtd }))
            out.push({ key: k, label: labelOfMonth(cursor), aprovados: b.a, reprovados: b.r, topEmp })
            cursor.setMonth(cursor.getMonth() + 1)
        }
    } else {
        const days = Math.max(1, Math.round((endOfDay(range.end) - startOfDay(range.start)) / 864e5) + 1)
        for (let i = 0; i < days; i++) {
            const d = new Date(startOfDay(range.start).getTime() + i * 864e5)
            const k = keyOfDate(d)
            const b = by.get(k) || { a: 0, r: 0, emp: new Map(), date: d }
            const topEmp = [...b.emp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome, qtd]) => ({ nome, qtd }))
            out.push({ key: k, label: labelOfDate(d), aprovados: b.a, reprovados: b.r, topEmp })
        }
    }
    return out
}

const days = computed(() => makeSeries(currentRange.value))
const prevDays = computed(() => makeSeries(previousRange.value))

/** Totais e comparação */
const totals = computed(() =>
    days.value.reduce((acc, d) => ({ aprovados: acc.aprovados + d.aprovados, reprovados: acc.reprovados + d.reprovados }),
        { aprovados: 0, reprovados: 0 })
)
const totalsPrev = computed(() =>
    prevDays.value.reduce((acc, d) => ({ aprovados: acc.aprovados + d.aprovados, reprovados: acc.reprovados + d.reprovados }),
        { aprovados: 0, reprovados: 0 })
)

const approvalRate = computed(() => {
    const t = totals.value.aprovados + totals.value.reprovados
    return t ? Math.round((totals.value.aprovados / t) * 100) : 0
})
// Razões (0–1) de aprovação: atual e anterior
const approvalRateNow = computed(() => {
    const t = totals.value.aprovados + totals.value.reprovados
    return t ? (totals.value.aprovados / t) : 0
})
const approvalRatePrev = computed(() => {
    const t = totalsPrev.value.aprovados + totalsPrev.value.reprovados
    return t ? (totalsPrev.value.aprovados / t) : 0
})

// Delta do % de aprovação vs período anterior (em %)
const approvalRateDelta = computed(() => {
    const prev = approvalRatePrev.value
    // se não houver base anterior, evita NaN/∞
    return prev ? ((approvalRateNow.value - prev) / prev) * 100 : 0
})

const delta = computed(() => {
    const cur = totals.value.aprovados + totals.value.reprovados
    const prev = totalsPrev.value.aprovados + totalsPrev.value.reprovados
    const validacoesPct = prev ? ((cur - prev) / prev) * 100 : 0
    return {
        validacoes: validacoesPct,
        aprovacao: approvalRateDelta.value, // << aqui entra o novo delta
    }
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
