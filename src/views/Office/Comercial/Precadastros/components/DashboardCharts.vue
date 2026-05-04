<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, FunnelChart, PieChart, ScatterChart } from 'echarts/charts'
import {
    TooltipComponent, LegendComponent, GridComponent, TitleComponent,
    DataZoomComponent, MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
    LineChart, BarChart, FunnelChart, PieChart, ScatterChart,
    TooltipComponent, LegendComponent, GridComponent, TitleComponent,
    DataZoomComponent, MarkLineComponent, CanvasRenderer
])

const props = defineProps({
    precadastros: { type: Array, default: () => [] },
    porEmpreendimento: { type: Array, default: () => [] },
    porEmpresaCorrespondente: { type: Array, default: () => [] },
    porMes: { type: Array, default: () => [] },
})
const emit = defineEmits(['abrirModal', 'filtrarSituacao'])

const txt = '#CBD5E1'
const dim = '#334155'
const palette = ['#818CF8', '#22D3EE', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#FB923C', '#60A5FA', '#4ADE80']
const TT = `background:rgba(2,6,23,0.96);border:1px solid rgba(129,140,248,0.25);border-radius:12px;font-size:12px;color:#E2E8F0;box-shadow:0 8px 32px rgba(0,0,0,0.5);padding:10px 14px;`

// ─────────── Funil: Total → Em análise → Aprovado → Reservado/Vendido ───────────
const funnelOption = computed(() => {
    const total = props.precadastros.length
    const emAnalise = props.precadastros.filter(p => !p.data_fim && !p.data_cancelamento).length
    const aprovados = props.precadastros.filter(p => /aprovad/i.test(p.situacao_nome || '')).length
    const reservados = props.precadastros.filter(p => /reserva/i.test(p.situacao_nome || '')).length
    const vendidos = props.precadastros.filter(p => /vendid/i.test(p.situacao_nome || '')).length

    return {
        tooltip: { trigger: 'item', extraCssText: TT, formatter: '{b}: <b>{c}</b>' },
        series: [{
            type: 'funnel', left: '10%', width: '80%', label: { color: txt, formatter: '{b}: {c}' },
            data: [
                { value: total, name: 'Total' },
                { value: emAnalise, name: 'Em análise' },
                { value: aprovados, name: 'Aprovados' },
                { value: reservados, name: 'Em reserva' },
                { value: vendidos, name: 'Vendidos' },
            ].filter(d => d.value > 0),
            color: palette,
        }],
    }
})

// ─────────── Pizza por situação ───────────
const pieSituacaoOption = computed(() => {
    const map = new Map()
    for (const p of props.precadastros) {
        const k = p.situacao_nome || 'Sem Situação'
        map.set(k, (map.get(k) || 0) + 1)
    }
    return {
        tooltip: { trigger: 'item', extraCssText: TT, formatter: '{b}: <b>{c}</b> ({d}%)' },
        legend: { textStyle: { color: txt }, type: 'scroll', bottom: 0 },
        series: [{
            type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
            label: { color: txt, formatter: '{b}\n{d}%' },
            data: Array.from(map.entries()).map(([n, v]) => ({ name: n, value: v })),
            color: palette,
        }],
    }
})

// ─────────── Top 10 empreendimentos (barras horizontais empilhadas) ───────────
const topEmpreendimentos = computed(() => {
    return [...props.porEmpreendimento].slice(0, 10).reverse() // reverse p/ exibir maior em cima
})
const empreendimentoOption = computed(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, extraCssText: TT },
    legend: { textStyle: { color: txt }, top: 0 },
    grid: { left: 200, right: 30, top: 30, bottom: 30 },
    xAxis: { type: 'value', axisLabel: { color: txt }, splitLine: { lineStyle: { color: dim } } },
    yAxis: { type: 'category', axisLabel: { color: txt, width: 180, overflow: 'truncate' }, data: topEmpreendimentos.value.map(e => e.name) },
    series: [
        { name: 'Em análise', type: 'bar', stack: 'total', data: topEmpreendimentos.value.map(e => e.em_analise), color: '#A78BFA' },
        { name: 'Aprovados', type: 'bar', stack: 'total', data: topEmpreendimentos.value.map(e => e.aprovados), color: '#34D399' },
        { name: 'Cancelados', type: 'bar', stack: 'total', data: topEmpreendimentos.value.map(e => e.cancelados), color: '#F87171' },
    ],
}))

// ─────────── Banco: tempo médio em análise ───────────
const top10Bancos = computed(() => [...props.porEmpresaCorrespondente].slice(0, 10))

const bancoTempoOption = computed(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, extraCssText: TT, formatter: p => `${p[0].axisValue}<br/><b>${p[0].value.toFixed(1)} dias</b>` },
    grid: { left: 30, right: 30, top: 30, bottom: 80 },
    xAxis: { type: 'category', axisLabel: { color: txt, rotate: 30, interval: 0, width: 120, overflow: 'truncate' }, data: top10Bancos.value.map(b => b.name) },
    yAxis: { type: 'value', name: 'dias', nameTextStyle: { color: txt }, axisLabel: { color: txt }, splitLine: { lineStyle: { color: dim } } },
    series: [{
        type: 'bar',
        data: top10Bancos.value.map(b => b.tempo_medio_dias),
        itemStyle: { color: '#FBBF24' },
        label: { show: true, position: 'top', color: txt, formatter: v => v.value.toFixed(1) },
    }],
}))

// ─────────── Banco: taxa de aprovação ───────────
const bancoTaxaOption = computed(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, extraCssText: TT, formatter: p => `${p[0].axisValue}<br/><b>${(p[0].value * 100).toFixed(1)}%</b>` },
    grid: { left: 30, right: 30, top: 30, bottom: 80 },
    xAxis: { type: 'category', axisLabel: { color: txt, rotate: 30, interval: 0, width: 120, overflow: 'truncate' }, data: top10Bancos.value.map(b => b.name) },
    yAxis: { type: 'value', max: 1, name: '%', nameTextStyle: { color: txt }, axisLabel: { color: txt, formatter: v => `${(v * 100).toFixed(0)}%` }, splitLine: { lineStyle: { color: dim } } },
    series: [{
        type: 'bar',
        data: top10Bancos.value.map(b => b.taxa_aprovacao),
        itemStyle: { color: '#34D399' },
        label: { show: true, position: 'top', color: txt, formatter: v => `${(v.value * 100).toFixed(0)}%` },
    }],
}))

// ─────────── Banco: volume (Total | Em análise | Aprovados) empilhado ───────────
const bancoVolumeOption = computed(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, extraCssText: TT },
    legend: { textStyle: { color: txt }, top: 0 },
    grid: { left: 30, right: 30, top: 40, bottom: 80 },
    xAxis: { type: 'category', axisLabel: { color: txt, rotate: 30, interval: 0, width: 120, overflow: 'truncate' }, data: top10Bancos.value.map(b => b.name) },
    yAxis: { type: 'value', axisLabel: { color: txt }, splitLine: { lineStyle: { color: dim } } },
    series: [
        { name: 'Em análise', type: 'bar', stack: 'tot', data: top10Bancos.value.map(b => b.em_analise), color: '#A78BFA' },
        { name: 'Aprovados', type: 'bar', stack: 'tot', data: top10Bancos.value.map(b => b.aprovados), color: '#34D399' },
        { name: 'Reprovados', type: 'bar', stack: 'tot', data: top10Bancos.value.map(b => b.reprovados), color: '#F87171' },
    ],
}))

// ─────────── Volume mensal ───────────
const mensalOption = computed(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, extraCssText: TT },
    legend: { textStyle: { color: txt }, top: 0 },
    grid: { left: 40, right: 30, top: 40, bottom: 50 },
    xAxis: { type: 'category', data: props.porMes.map(m => m.mes), axisLabel: { color: txt } },
    yAxis: { type: 'value', axisLabel: { color: txt }, splitLine: { lineStyle: { color: dim } } },
    series: [
        { name: 'Total', type: 'line', smooth: true, data: props.porMes.map(m => m.total), itemStyle: { color: '#818CF8' } },
        { name: 'Aprovados', type: 'line', smooth: true, data: props.porMes.map(m => m.aprovados), itemStyle: { color: '#34D399' } },
        { name: 'Em análise', type: 'line', smooth: true, data: props.porMes.map(m => m.em_analise), itemStyle: { color: '#A78BFA' } },
        { name: 'Cancelados', type: 'line', smooth: true, data: props.porMes.map(m => m.cancelados), itemStyle: { color: '#F87171' } },
    ],
}))

// ─────────── Distribuição de tempo em análise (histograma) ───────────
const histTempoOption = computed(() => {
    const buckets = [
        { lbl: '0-3d',  min: 0,  max: 3 },
        { lbl: '3-7d',  min: 3,  max: 7 },
        { lbl: '7-15d', min: 7,  max: 15 },
        { lbl: '15-30d',min: 15, max: 30 },
        { lbl: '30-60d',min: 30, max: 60 },
        { lbl: '60-90d',min: 60, max: 90 },
        { lbl: '90+',   min: 90, max: Infinity },
    ]
    const counts = buckets.map(() => 0)
    for (const p of props.precadastros) {
        const d = Number(p.dias_em_analise)
        if (!Number.isFinite(d)) continue
        const i = buckets.findIndex(b => d >= b.min && d < b.max)
        if (i >= 0) counts[i]++
    }
    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, extraCssText: TT },
        grid: { left: 40, right: 20, top: 30, bottom: 40 },
        xAxis: { type: 'category', data: buckets.map(b => b.lbl), axisLabel: { color: txt } },
        yAxis: { type: 'value', axisLabel: { color: txt }, splitLine: { lineStyle: { color: dim } } },
        series: [{ type: 'bar', data: counts, itemStyle: { color: '#22D3EE' }, label: { show: true, position: 'top', color: txt } }],
    }
})

// ─────────── Origem (com lead vs. sem lead) ───────────
const origemLeadOption = computed(() => {
    let comLead = 0, semLead = 0
    for (const p of props.precadastros) {
        const n = Number(p.qtd_leads_associados ?? (p.leads_associados?.length || 0))
        if (n > 0) comLead++
        else semLead++
    }
    return {
        tooltip: { trigger: 'item', extraCssText: TT, formatter: '{b}: <b>{c}</b> ({d}%)' },
        legend: { textStyle: { color: txt }, bottom: 0 },
        series: [{
            type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
            label: { color: txt, formatter: '{b}\n{d}%' },
            data: [
                { name: 'Veio de Lead', value: comLead, itemStyle: { color: '#34D399' } },
                { name: 'Sem Lead', value: semLead, itemStyle: { color: '#F87171' } },
            ],
        }],
    }
})

// ─────────── Tentativas por cliente ───────────
const tentativasPorClienteOption = computed(() => {
    const map = new Map()
    for (const p of props.precadastros) {
        const doc = p.documento || p.cliente?.documento
        if (!doc) continue
        if (!map.has(doc)) map.set(doc, { tentativas: 0, aprovou: false, ultima_situacao: '' })
        const e = map.get(doc)
        e.tentativas++
        if (/aprovad/i.test(p.situacao_nome || '')) e.aprovou = true
        e.ultima_situacao = p.situacao_nome
    }
    const distribuicao = new Map()
    for (const e of map.values()) {
        const k = `${e.tentativas}x`
        if (!distribuicao.has(k)) distribuicao.set(k, { aprovou: 0, nao_aprovou: 0 })
        const d = distribuicao.get(k)
        if (e.aprovou) d.aprovou++; else d.nao_aprovou++
    }
    const ordered = Array.from(distribuicao.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, extraCssText: TT },
        legend: { textStyle: { color: txt }, top: 0 },
        grid: { left: 40, right: 20, top: 40, bottom: 40 },
        xAxis: { type: 'category', data: ordered.map(([k]) => k), axisLabel: { color: txt }, name: 'Tentativas/cliente', nameTextStyle: { color: txt } },
        yAxis: { type: 'value', axisLabel: { color: txt }, splitLine: { lineStyle: { color: dim } } },
        series: [
            { name: 'Cliente aprovado', type: 'bar', stack: 'tot', data: ordered.map(([_, v]) => v.aprovou), color: '#34D399' },
            { name: 'Não aprovado ainda', type: 'bar', stack: 'tot', data: ordered.map(([_, v]) => v.nao_aprovou), color: '#F87171' },
        ],
    }
})
</script>

<template>
    <div class="space-y-6">
        <!-- Linha 1: Funil + Pizza Situação + Origem -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h3 class="text-base font-semibold mb-2"><i class="fas fa-filter mr-2 text-purple-400" />Funil de Conversão</h3>
                <VChart :option="funnelOption" autoresize style="height: 320px;" />
            </div>
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h3 class="text-base font-semibold mb-2"><i class="fas fa-chart-pie mr-2 text-cyan-400" />Distribuição por Situação</h3>
                <VChart :option="pieSituacaoOption" autoresize style="height: 320px;" />
            </div>
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h3 class="text-base font-semibold mb-2"><i class="fas fa-arrow-right-arrow-left mr-2 text-emerald-400" />Origem do Pré-Cadastro</h3>
                <VChart :option="origemLeadOption" autoresize style="height: 320px;" />
            </div>
        </div>

        <!-- Linha 2: Volume mensal -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
            <h3 class="text-base font-semibold mb-2"><i class="fas fa-chart-line mr-2 text-indigo-400" />Volume Mensal por Estado</h3>
            <VChart :option="mensalOption" autoresize style="height: 360px;" />
        </div>

        <!-- Linha 3: Top empreendimentos + Histograma de tempo -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h3 class="text-base font-semibold mb-2"><i class="fas fa-city mr-2 text-violet-400" />Top 10 Empreendimentos</h3>
                <VChart :option="empreendimentoOption" autoresize style="height: 420px;" />
            </div>
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h3 class="text-base font-semibold mb-2"><i class="fas fa-stopwatch mr-2 text-amber-400" />Distribuição de Tempo em Análise</h3>
                <VChart :option="histTempoOption" autoresize style="height: 420px;" />
            </div>
        </div>

        <!-- Linha 4: Bancos (3 gráficos) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h3 class="text-base font-semibold mb-2"><i class="fas fa-piggy-bank mr-2 text-amber-400" />Velocidade por Banco (dias)</h3>
                <VChart :option="bancoTempoOption" autoresize style="height: 360px;" />
            </div>
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h3 class="text-base font-semibold mb-2"><i class="fas fa-percentage mr-2 text-emerald-400" />Taxa de Aprovação por Banco</h3>
                <VChart :option="bancoTaxaOption" autoresize style="height: 360px;" />
            </div>
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h3 class="text-base font-semibold mb-2"><i class="fas fa-chart-column mr-2 text-purple-400" />Volume por Banco</h3>
                <VChart :option="bancoVolumeOption" autoresize style="height: 360px;" />
            </div>
        </div>

        <!-- Linha 5: Tentativas por cliente -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
            <h3 class="text-base font-semibold mb-2"><i class="fas fa-arrows-rotate mr-2 text-pink-400" />Tentativas por Cliente até Aprovação</h3>
            <VChart :option="tentativasPorClienteOption" autoresize style="height: 320px;" />
        </div>
    </div>
</template>
