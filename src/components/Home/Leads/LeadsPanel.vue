<template>
    <div
        class="h-full w-full flex flex-col rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60">
        <!-- Header -->
        <div
            class="px-4 py-3 md:px-6 md:h-24 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center gap-3">
            <div class="min-w-0 my-auto">
                <RouterLink to="/marketing/leads?section=Leads"
                    class="text-base md:text-xl font-semibold truncate inline-flex items-center gap-2">
                    <i class="fas fa-user-plus" />
                    Leads
                </RouterLink>
                <Favorite class="m-auto" :router="'/marketing/leads'" :section="'Leads'" />
                <p class="text-[8px] md:text-xs text-gray-500 dark:text-gray-400">
                    {{ rangeLabels.this }} | {{ rangeLabels.prev }}
                </p>
            </div>

            <!-- KPIs -->
            <div class="flex-1 grid grid-cols-2 gap-2 ps-2 md:ps-4">
                <div class="rounded-lg my-auto ps-3 p-1.5 bg-white/60 dark:bg-gray-900/40 border-l-4 border-indigo-500">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
                        {{ legend.this }}
                    </p>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 md:text-lg leading-tight">
                        {{ kpis.cur }}
                    </p>
                    <p class="font-light text-[11px] leading-tight"
                        :class="kpis.deltaPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{ kpis.deltaPct >= 0 ? '+' : '' }}{{ kpis.deltaPct.toFixed(1) }}%
                    </p>
                </div>

                <div class="rounded-lg px-3 py-2 bg-white/60 dark:bg-gray-900/40 border-l-4"
                    :class="kpis.deltaPct >= 0 ? 'border-emerald-500' : 'border-rose-600'">
                    <p class="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
                        {{ legend.prev }}
                    </p>
                    <p class="font-semibold text-gray-800 dark:text-gray-100 md:text-lg leading-tight">
                        {{ kpis.prv }}
                    </p>
                    <p v-if="mode === 'day'"
                        class="text-[8px] md:text-[9px] truncate text-gray-500 dark:text-gray-400 mt-0.5">
                        Até {{ nowHour }}h: {{ progressPct.toFixed(1) }}% do dia anterior
                    </p>
                </div>
            </div>
        </div>

        <!-- Chart -->
        <div class="flex-1 min-h-60 p-3 md:p-4">
            <div class="relative w-full h-full min-h-[220px]">
                <VChart v-if="!loading" :option="chartOption" autoresize class="absolute inset-0 h-full w-full" />
                <div v-else role="status" class="absolute inset-0 overflow-hidden p-4 md:p-6 animate-pulse">
                    <div class="flex h-full items-end gap-3">
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-32" />
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-48" />
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-28" />
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-44" />
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-36" />
                        <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg h-40" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Controles -->
        <div class="w-full flex items-center gap-2 px-4 pb-4 -mt-2">
            <select v-model="mode"
                class="h-9 rounded-md bg-white/70 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 text-xs">
                <option value="day">Dia × Dia</option>
                <option value="rolling7">Últimos 7 dias</option>
                <option value="week">Semana × Semana</option>
                <option value="month">Mês × Mês</option>
            </select>
        </div>
    </div>
</template>

<script setup>
import { onMounted, watch, computed, ref } from 'vue'
import { useLeadsStore } from '@/stores/Reports/Lead/leadsStore'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import Favorite from '@/components/config/Favorite.vue'

echarts.use([BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

// Store & loading
const leadsStore = useLeadsStore()
const loading = ref(true)

// ================== MODO & HELPERS ==================
const mode = ref('rolling7') // visual; a janela da API é dinâmica

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x }
const startOfWeekMon = (d = new Date()) => { const x = startOfDay(d); const dow = x.getDay() || 7; x.setDate(x.getDate() - (dow - 1)); return x }
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonthIncl = (d = new Date()) => endOfDay(new Date(addMonths(startOfMonth(d), 1) - 1))

const iso = (d) => new Date(d).toISOString().slice(0, 10)
const fmtLabel = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const fmtMonthLabel = (d) => new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
const nowHour = new Date().getHours()
const wd = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// ✅ ADD — helpers consistentes com sua store
const leadDate = (l) => new Date(l.createdAt || l.created_at || l.data_criacao || l.data || l.updatedAt || Date.now())
const empName = (l) => String(l?.empreendimento?.[0]?.nome ?? '—').trim()

// dentro do range atual?
const inThisRange = (d) => {
    const r = ranges.value.this
    const t = d.getTime()
    return t >= r.start.getTime() && t <= r.end.getTime()
}

// top-N utilitário
const topNFrom = (arr, n = 3) => {
    const m = new Map()
    for (const l of arr) {
        const k = empName(l)
        m.set(k, (m.get(k) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([nome, qtd]) => ({ nome, qtd }))
}
// ✅ ADD — pega a janela exata (start/end) correspondente ao índice "i" do eixo X para o bucket atual
const bucketWindowAt = (i) => {
    const r = ranges.value
    if (r.bucket === 'hour') {
        // Hoje, hora = i
        const d = new Date(r.this.start)
        const now = new Date()
        d.setHours(0, 0, 0, 0)
        const start = new Date(d); start.setHours(i, 0, 0, 0)
        const end = new Date(d); end.setHours(i, 59, 59, 999)
        // clampa no range this
        return {
            start: start < r.this.start ? r.this.start : start,
            end: end > r.this.end ? r.this.end : end
        }
    }

    if (r.bucket === 'weekday') {
        // Semana: i = 0..6 (Seg..Dom). Filtra somente o dia da semana "i" dentro de this.
        // Em vez de retornar uma única janela, retornamos um predicate.
        return {
            predicate: (d) => {
                if (!inThisRange(d)) return false
                let idx = d.getDay() - 1; if (idx < 0) idx = 6
                return idx === i
            }
        }
    }

    // bucket 'day' (rolling7, week, month)
    // índice i = i-ésimo dia do range "this"
    const dayAt = (base, i) => {
        const d = new Date(base); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d
    }

    // categorias já foram geradas do start..end do range 'this'
    const start = dayAt(r.this.start, i)
    const end = new Date(start); end.setHours(23, 59, 59, 999)

    // no modo 'month', o array pode ser maior que os dias reais; clamp natural resolve.
    return {
        start: start < r.this.start ? r.this.start : start,
        end: end > r.this.end ? r.this.end : end
    }
}

// ✅ ADD — devolve os TOP empreendimentos naquele índice do eixo X
const topByIndex = computed(() => {
    const bucket = ranges.value.bucket
    const list = leadsStore.leads || []

    return categories.value.map((_, i) => {
        if (bucket === 'weekday') {
            // usa predicate por weekday dentro do range this
            const pred = bucketWindowAt(i).predicate
            const arr = pred ? list.filter(l => pred(leadDate(l))) : []
            return topNFrom(arr, 3)
        } else if (bucket === 'hour') {
            const { start, end } = bucketWindowAt(i)
            const s = start.getTime(), e = end.getTime()
            const arr = list.filter(l => {
                const d = leadDate(l).getTime()
                return d >= s && d <= e
            })
            return topNFrom(arr, 3)
        } else {
            // 'day'
            const { start, end } = bucketWindowAt(i)
            const s = start.getTime(), e = end.getTime()
            const arr = list.filter(l => {
                const d = leadDate(l).getTime()
                return d >= s && d <= e
            })
            return topNFrom(arr, 3)
        }
    })
})

// ================== RANGE PARA A API (BUSCA SOB DEMANDA) ==================
/**
 * Regras:
 * - Default (day/week/rolling7): últimos 15 dias (hoje-14 .. hoje)
 * - Month: mês anterior inteiro + mês atual inteiro
 */
// Janela necessária por modo (API)
function neededWindowFor(m) {
    const now = new Date()
    if (m === 'day') {
        return { start: startOfDay(addDays(now, -1)), end: endOfDay(now) }
    }
    if (m === 'rolling7') {
        return { start: startOfDay(addDays(now, -14)), end: endOfDay(now) }
    }
    if (m === 'week') {
        const s1 = startOfWeekMon(now)
        const s0 = startOfDay(addDays(s1, -7))
        // corte até "ontem" na semana atual e no mesmo offset da semana anterior
        const yesterday = addDays(now, -1)
        const offset = ((yesterday.getDay() || 7) - 1) // seg=0..dom=6
        const e1 = endOfDay(addDays(s1, offset))
        const e0 = endOfDay(addDays(s0, offset))
        return { start: s0, end: e1 > e0 ? e1 : e0 } // janela cobre ambas as metades
    }
    // month
    const sCur = startOfMonth(now)
    const sPrev = startOfMonth(addMonths(sCur, -1))
    const eCur = endOfMonthIncl(now)
    return { start: sPrev, end: eCur }
}

// Verifica se a janela existente cobre a janela necessária
function windowCovers(existing, needed) {
    if (!existing?.data_inicio || !existing?.data_fim) return false
    const eStart = new Date(existing.data_inicio + 'T00:00:00')
    const eEnd = new Date(existing.data_fim + 'T23:59:59')
    return eStart.getTime() <= needed.start.getTime() && eEnd.getTime() >= needed.end.getTime()
}

// Aplica janela na store
function applyApiWindowFor(m) {
    const { start, end } = neededWindowFor(m)
    leadsStore.filtros.data_inicio = iso(start)
    leadsStore.filtros.data_fim = iso(end)
}

let inFlight = 0
async function fetchWithWindow(m = mode.value) {
    // só busca se a janela necessária NÃO estiver coberta
    const needed = neededWindowFor(m)
    if (windowCovers(leadsStore.periodo, needed)) return

    applyApiWindowFor(m)
    const ticket = ++inFlight
    loading.value = true
    try {
        await leadsStore.fetchLeads(false)
    } finally {
        if (ticket === inFlight) loading.value = false
    }
}

// Boot idempotente: carrega Mês×Mês só uma vez (mesmo com remount)
async function bootOnceMonth() {
    // assinatura dos filtros não-data atuais (ex.: origem, situação...)
    const { data_inicio, data_fim, ...rest } = leadsStore.filtros || {}
    const nonDateSig = JSON.stringify(rest || {})

    // janela necessária para mês
    const needed = neededWindowFor('month')

    // se já cobriu a janela e a assinatura é igual, não refaz
    if (windowCovers(leadsStore.periodo, needed) && leadsStore.__bootSig === nonDateSig) {
        return
    }

    // dedupe entre mounts rápidos
    if (!leadsStore.__bootPromise) {
        leadsStore.__bootPromise = (async () => {
            await fetchWithWindow('month')
            leadsStore.__bootSig = nonDateSig
        })().finally(() => {
            // solta a promise pra futuros boots com filtros diferentes
            leadsStore.__bootPromise = null
        })
    }
    await leadsStore.__bootPromise
}

onMounted(() => bootOnceMonth())

// Troca de modo → NÃO busca de novo.
// O select só muda a exibição (ranges, categorias e séries) com base nos dados já carregados.
// Se precisar reforçar isso, deixe um no-op explícito:
watch(mode, () => {
    // no-op: não chamamos fetch aqui
})

// Filtros NÃO relacionados a data → refetch (mesma janela)
const nonDateFiltersKey = computed(() => {
    const { data_inicio, data_fim, ...rest } = leadsStore.filtros
    return JSON.stringify(rest)
})
watch(nonDateFiltersKey, async () => {
    const ticket = ++inFlight
    loading.value = true
    try {
        await leadsStore.fetchLeads()
    } finally {
        if (ticket === inFlight) loading.value = false
    }
})

watch(nonDateFiltersKey, async () => {
    const ticket = ++inFlight
    loading.value = true
    try {
        await leadsStore.fetchLeads()
    } finally {
        if (ticket === inFlight) loading.value = false
    }
})

// ================== Ranges e agregações para EXIBIÇÃO (não API) ==================
const ranges = computed(() => {
    const now = new Date()
    const clampEnd = (d) => {
        const todayEnd = endOfDay(new Date())
        return d > todayEnd ? todayEnd : d
    }

    if (mode.value === 'day') {
        const s1 = startOfDay(now), e1 = clampEnd(endOfDay(now))
        const s0 = startOfDay(addDays(now, -1)), e0 = clampEnd(endOfDay(addDays(now, -1)))
        return { this: { start: s1, end: e1 }, prev: { start: s0, end: e0 }, bucket: 'hour' }
    }

    if (mode.value === 'rolling7') {
        const e1 = clampEnd(endOfDay(now))
        const s1 = startOfDay(addDays(now, -6))
        const e0 = clampEnd(endOfDay(addDays(s1, -1)))
        const s0 = startOfDay(addDays(s1, -7))
        return { this: { start: s1, end: e1 }, prev: { start: s0, end: e0 }, bucket: 'day' }
    }

    if (mode.value === 'week') {
        const s1 = startOfWeekMon(now)
        const s0 = startOfDay(addDays(s1, -7))
        const yesterday = addDays(now, -1)
        const offset = ((yesterday.getDay() || 7) - 1) // seg=0..dom=6
        const e1 = endOfDay(addDays(s1, offset))
        const e0 = endOfDay(addDays(s0, offset))
        return { this: { start: s1, end: e1 }, prev: { start: s0, end: e0 }, bucket: 'weekday' }
    }

    // month (visualização completa do mês atual e anterior)
    const s1 = startOfMonth(now)
    const e1 = endOfMonthIncl(now) // para categorias completas
    const s0 = startOfMonth(addMonths(s1, -1))
    const e0 = endOfMonthIncl(addMonths(s1, -1))
    return { this: { start: s1, end: e1 }, prev: { start: s0, end: e0 }, bucket: 'day' }
})

/* Labels de exibição */
const rangeLabels = computed(() => {
    const r = ranges.value
    return {
        this: r.bucket === 'month'
            ? `${fmtMonthLabel(r.this.start)} - ${fmtMonthLabel(r.this.end)}`
            : `${fmtLabel(r.this.start)} - ${fmtLabel(r.this.end)}`,
        prev: r.bucket === 'month'
            ? `${fmtMonthLabel(r.prev.start)} - ${fmtMonthLabel(r.prev.end)}`
            : `${fmtLabel(r.prev.start)} - ${fmtLabel(r.prev.end)}`
    }
})

const legend = computed(() => ({
    this: mode.value === 'day'
        ? 'Hoje'
        : mode.value === 'rolling7'
            ? 'Últimos 7 dias'
            : mode.value === 'week'
                ? 'Semana atual'
                : 'Mês atual',
    prev: mode.value === 'day'
        ? 'Ontem'
        : mode.value === 'rolling7'
            ? '7 dias anteriores'
            : mode.value === 'week'
                ? 'Semana anterior'
                : 'Mês anterior'
}))

/* Filtro por range (para montar as séries de exibição) */
const filterRange = (list, range) => {
    const s = range.start.getTime(), e = range.end.getTime()
    return (list || []).filter(l => {
        const t = leadDate(l).getTime()
        return t >= s && t <= e
    })
}

/* Séries por bucket (inclui lógica especial para Mês × Mês) */
const seriesData = (list, range, bucket, context) => {
    // helper robusto contra DST para iterar dias
    const eachDay = (start, end, fn) => {
        const d = new Date(start)
        while (d <= end) { fn(new Date(d)); d.setDate(d.getDate() + 1) }
    }

    if (bucket === 'hour') {
        const arr = Array(24).fill(0)
        for (const l of filterRange(list, range)) arr[leadDate(l).getHours()]++
        return arr
    }

    if (bucket === 'weekday') {
        const arr = Array(7).fill(0)
        for (const l of filterRange(list, range)) { let i = leadDate(l).getDay() - 1; if (i < 0) i = 6; arr[i]++ }
        return arr
    }

    // ====== MÊS x MÊS: categorias por dia-do-mês (01..maxLen), this até hoje; prev mês inteiro ======
    if (mode.value === 'month' && bucket === 'day') {
        const thisMonthStart = new Date(ranges.value.this.start)
        const prevMonthStart = new Date(ranges.value.prev.start)
        const thisMonthDays = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 0).getDate()
        const prevMonthDays = new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth() + 1, 0).getDate()
        const maxLen = Math.max(thisMonthDays, prevMonthDays)

        const today = new Date()
        const isThis = context === 'this'

        const out = Array(maxLen).fill(0)
        for (let day = 1; day <= maxLen; day++) {
            let s, e
            if (isThis) {
                // dia do mês atual
                const cur = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth(), day)
                s = startOfDay(cur); e = endOfDay(cur)
                // zera dias futuros do mês atual
                if (cur > today) { out[day - 1] = 0; continue }
            } else {
                // dia do mês anterior
                const cur = new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth(), day)
                s = startOfDay(cur); e = endOfDay(cur)
                // para dias acima do último dia real do mês anterior, fica 0
                if (day > prevMonthDays) { out[day - 1] = 0; continue }
            }

            const n = (list || []).reduce((acc, l) => {
                const t = leadDate(l).getTime()
                return acc + (t >= s.getTime() && t <= e.getTime() ? 1 : 0)
            }, 0)
            out[day - 1] = n
        }
        return out
    }

    // ====== Demais casos dia-a-dia ======
    const out = []
    eachDay(startOfDay(range.start), endOfDay(range.end), (d) => {
        const s = startOfDay(d).getTime(), e = endOfDay(d).getTime()
        const n = (list || []).reduce((acc, l) => {
            const t = leadDate(l).getTime()
            return acc + (t >= s && t <= e ? 1 : 0)
        }, 0)
        out.push(n)
    })
    return out
}

/* Categorias do eixo X */
const categories = computed(() => {
    const r = ranges.value
    if (r.bucket === 'hour') return Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`)
    if (r.bucket === 'weekday') return wd
    if (mode.value === 'month' && r.bucket === 'day') {
        const thisMonthStart = new Date(r.this.start)
        const prevMonthStart = new Date(r.prev.start)
        const thisMonthDays = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 0).getDate()
        const prevMonthDays = new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth() + 1, 0).getDate()
        const maxLen = Math.max(thisMonthDays, prevMonthDays)
        return Array.from({ length: maxLen }, (_, i) => String(i + 1).padStart(2, '0'))
    }
    // categorias por data (fora do modo mês)
    const labels = []
    const d = new Date(r.this.start)
    while (d <= r.this.end) { labels.push(fmtLabel(d)); d.setDate(d.getDate() + 1) }
    return labels
})

/* Séries e KPIs */
const leadsThis = computed(() => seriesData(leadsStore.leads || [], ranges.value.this, ranges.value.bucket, 'this'))
const leadsPrev = computed(() => seriesData(leadsStore.leads || [], ranges.value.prev, ranges.value.bucket, 'prev'))

const kpis = computed(() => {
    const sum = (arr) => arr.reduce((a, b) => a + b, 0)

    if (mode.value === 'month') {
        // MTD atual × mesmo recorte do mês anterior
        const today = new Date().getDate() // dia do mês (1..)
        const thisMonthLen = leadsThis.value.length
        const cut = Math.min(today, thisMonthLen) // index até hoje
        const curMTD = sum(leadsThis.value.slice(0, cut))
        const prevSameDays = sum(leadsPrev.value.slice(0, cut))
        const deltaPct = prevSameDays ? ((curMTD - prevSameDays) / prevSameDays) * 100 : 0
        return { cur: curMTD, prv: prevSameDays, deltaPct }
    }

    if (mode.value === 'week') {
        // até ontem (mesmo offset nas duas semanas)
        const yesterday = addDays(new Date(), -1)
        const offset = ((yesterday.getDay() || 7) - 1) // 0..6
        const cut = Math.min(offset + 1, leadsThis.value.length, leadsPrev.value.length)
        const cur = sum(leadsThis.value.slice(0, cut))
        const prv = sum(leadsPrev.value.slice(0, cut))
        const deltaPct = prv ? ((cur - prv) / prv) * 100 : 0
        return { cur, prv, deltaPct }
    }

    // day / rolling7
    const cur = sum(leadsThis.value)
    const prv = sum(leadsPrev.value)
    const deltaPct = prv ? ((cur - prv) / prv) * 100 : 0
    return { cur, prv, deltaPct }
})

const progressPct = computed(() => {
    if (mode.value !== 'day') return 0
    const cur = leadsThis.value.slice(0, nowHour + 1).reduce((a, b) => a + b, 0)
    const prv = leadsPrev.value.slice(0, nowHour + 1).reduce((a, b) => a + b, 0)
    return prv ? (cur / prv) * 100 : 0
})

// ================== ECharts (estilo consistente) ==================
const chartOption = computed(() => {
    const primaryColor = '#6366F1'
    const secondaryColor = '#24295F'

    return {
        animationDuration: 400,
        grid: { left: 6, right: 8, top: 24, bottom: 8, containLabel: true },
        legend: { top: 0, textStyle: { color: '#9CA3AF', fontSize: 10 } },
        // 🔁 CHANGE — apenas o formatter do tooltip
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: '#111827',
            borderWidth: 0,
            textStyle: { color: '#f4f4f4' },
            formatter: (params) => {
                const idx = params?.[0]?.dataIndex ?? 0
                const head = `<div style="font-weight:700;margin-bottom:4px">${params?.[0]?.axisValueLabel ?? ''}</div>`
                const lines = params.map(p =>
                    `<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px;"></span>${p.seriesName}: <b>${p.value}</b></div>`
                ).join('')

                const emp = topByIndex.value?.[idx] || []
                const empHtml = emp.length
                    ? `<div style="margin-top:6px;opacity:.9">${emp.map(e => `<div>• ${e.nome} (${e.qtd})</div>`).join('')}</div>`
                    : ''

                return head + lines + empHtml
            }
        },

        xAxis: {
            type: 'category',
            data: categories.value,
            axisLabel: { color: '#9CA3AF', fontSize: 10 },
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
            { name: legend.value.this, type: 'bar', data: leadsThis.value, barMaxWidth: 42, itemStyle: { color: primaryColor, borderRadius: [4, 4, 0, 0] }, emphasis: { focus: 'series' } },
            { name: legend.value.prev, type: 'bar', data: leadsPrev.value, barMaxWidth: 42, itemStyle: { color: secondaryColor, borderRadius: [4, 4, 0, 0] }, emphasis: { focus: 'series' } }
        ],
        media: [
            { query: { maxWidth: 480 }, option: { grid: { left: 2, right: 2, top: 24, bottom: 6, containLabel: true }, xAxis: { axisLabel: { fontSize: 9, rotate: 30, margin: 3 } }, yAxis: { axisLabel: { fontSize: 9 } }, series: [{ barMaxWidth: 30 }, { barMaxWidth: 30 }] } },
            { query: { maxWidth: 768 }, option: { grid: { left: 4, right: 4, top: 24, bottom: 8, containLabel: true }, xAxis: { axisLabel: { fontSize: 9, rotate: 20 } }, series: [{ barMaxWidth: 36 }, { barMaxWidth: 36 }] } }
        ]
    }
})
</script>
