<template>
    <div
        class="h-full w-full flex flex-col rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60">

        <!-- Header com KPIs -->
        <!-- Header com KPIs -->
        <div
            class="px-4 md:px-6 py-3 md:py-2 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center gap-3">
            <!-- Texto (ocupa ~40%) -->
            <div class="min-w-0 flex">
                <RouterLink to="/tools/validator?section=Validador"
                    class="text-base md:text-lg font-bold truncate inline-flex items-center gap-2">
                    <i class="fas fa-check-double"></i>
                    Validador
                </RouterLink>
            </div>

            <!-- KPIs (ocupa o restante) -->
            <div class="flex-1 grid grid-cols-3 gap-2">
                <div class="rounded-lg px-3 py-2 bg-white/60 dark:bg-gray-900/40 border-l-4 border-blue-800">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">Aprovados</p>
                    <p class="font-semibold text-blue-700 dark:text-blue-500 leading-tight">
                        {{ totals.aprovados }}
                    </p>
                </div>

                <div class="rounded-lg px-3 py-2 bg-white/60 dark:bg-gray-900/40 border-l-4 border-rose-700">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">Reprovados</p>
                    <p class="font-semibold text-rose-600 dark:text-red-400 leading-tight">
                        {{ totals.reprovados }}
                    </p>
                </div>

                <div class="rounded-lg px-3 py-2 bg-white/60 dark:bg-gray-900/40 border-l-4 border-indigo-500">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">Aprovação</p>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                        {{ approvalRate }}%
                    </p>
                </div>
            </div>
        </div>


        <div class="flex-1 min-h-0 p-3 md:p-4">
            <div ref="chartWrap" class="h-full w-full">
                <VChart v-if="!loading" :option="chartOption" autoresize
                    style="height: 100%; width: 100%; min-height: 160px;" />
                <div v-else class="h-full grid place-items-center text-sm text-gray-500 dark:text-gray-400">
                    Carregando…
                </div>
            </div>
        </div>
        
    </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAIStore } from '@/stores/Config/aiStore' // <-- caminho correto
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([BarChart, TooltipComponent, GridComponent, CanvasRenderer])

const ai = useAIStore()
const loading = ref(true)

onMounted(async () => {
    loading.value = true
    try { await ai.fetchValidatorHistory(true) } finally { loading.value = false }
})

/* === Helpers === */
const DAYS = 7
const norm = (raw) => Array.isArray(raw) ? raw : (raw?.results || raw?.items || [])
const keyOfDate = (d) => new Date(d).toISOString().slice(0, 10)
const labelOfDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

// série dia a dia + top empreendimentos
const days = computed(() => {
    const rows = norm(ai.validatorHistory)
    const byDay = new Map()
    for (const r of rows) {
        const k = keyOfDate(r.createdAt || r.updatedAt || Date.now())
        if (!byDay.has(k)) byDay.set(k, { a: 0, r: 0, emp: new Map() })
        const b = byDay.get(k)
        const ok = String(r.status || '').toUpperCase() === 'APROVADO'
        ok ? b.a++ : b.r++
        const emp = String(r.empreendimento || '—')
        b.emp.set(emp, (b.emp.get(emp) || 0) + 1)
    }

    const out = []
    for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const k = keyOfDate(d)
        const b = byDay.get(k) || { a: 0, r: 0, emp: new Map() }
        const topEmp = [...b.emp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome, qtd]) => ({ nome, qtd }))
        out.push({ key: k, label: labelOfDate(d), aprovados: b.a, reprovados: b.r, topEmp })
    }
    return out
})

const totals = computed(() => days.value.reduce((acc, d) => ({
    aprovados: acc.aprovados + d.aprovados,
    reprovados: acc.reprovados + d.reprovados
}), { aprovados: 0, reprovados: 0 }))

const approvalRate = computed(() => {
    const t = totals.value.aprovados + totals.value.reprovados
    return t ? Math.round((totals.value.aprovados / t) * 100) : 0
})

/* === ECharts: barras empilhadas, responsivo, cores menos vibrantes === */
const chartOption = computed(() => {
    const labels = days.value.map(d => d.label)
    const aprov = days.value.map(d => d.aprovados)
    const reprov = days.value.map(d => d.reprovados)
    const tipByIndex = days.value.map(d => d.topEmp)

    const royalBlue = '#1e40af' // azul mais sóbrio
    const softRed = '#be123c' // vermelho menos saturado

    return {
        animationDuration: 400,
        grid: { left: 4, right: 4, top: 4, bottom: 4, containLabel: true },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: '#111827',
            borderWidth: 0,
            textStyle: { color: '#fff' },
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
                rotate: labels.length > 6 ? 28 : 0, hideOverlap: true, margin: 8,
                formatter: (val) => (val.length > 5 ? val.slice(0, 5) : val)
            },
            axisLine: { lineStyle: { color: '#E5E7EB' } },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#9CA3AF', fontSize: 10 },
            splitLine: { lineStyle: { color: '#E5E7EB' } },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: [
            { name: 'Aprovados', type: 'bar', stack: 'v', barMaxWidth: 42, barCategoryGap: '30%', itemStyle: { color: royalBlue, borderRadius: [0, 0, 0, 0] }, emphasis: { focus: 'series' }, data: aprov },
            { name: 'Reprovados', type: 'bar', stack: 'v', barMaxWidth: 42, barCategoryGap: '30%', itemStyle: { color: softRed, borderRadius: [6, 6, 0, 0] }, emphasis: { focus: 'series' }, data: reprov }
        ],
        // Responsividade
        media: [
            {
                query: { maxWidth: 480 }, option: {
                    grid: { left: 2, right: 2, top: 6, bottom: 6, containLabel: true },
                    xAxis: { axisLabel: { fontSize: 9, rotate: 30, margin: 3, formatter: (v) => v } },
                    yAxis: { axisLabel: { fontSize: 9 } },
                    series: [{ barMaxWidth: 30, barCategoryGap: '28%' }, { barMaxWidth: 30, barCategoryGap: '28%' }]
                }
            },
            {
                query: { maxWidth: 768 }, option: {
                    grid: { left: 4, right: 4, top: 8, bottom: 8, containLabel: true },
                    xAxis: { axisLabel: { fontSize: 9, rotate: 20 } },
                    series: [{ barMaxWidth: 36, barCategoryGap: '26%' }, { barMaxWidth: 36, barCategoryGap: '26%' }]
                }
            }
        ]
    }
})
</script>
