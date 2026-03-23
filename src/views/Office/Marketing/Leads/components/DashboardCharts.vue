<script setup>
import { computed, ref } from 'vue'
import ChartActions from '@/components/config/ChartActions.vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, FunnelChart, PieChart, HeatmapChart } from 'echarts/charts'
import {
    TooltipComponent, LegendComponent, GridComponent, TitleComponent,
    DataZoomComponent, VisualMapComponent, MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
    LineChart, BarChart, FunnelChart, PieChart, HeatmapChart,
    TooltipComponent, LegendComponent, GridComponent, TitleComponent,
    DataZoomComponent, VisualMapComponent, MarkLineComponent,
    CanvasRenderer
])

const props = defineProps({
    leads: { type: Array, default: () => [] },
    leadsByEnterprise: { type: Array, default: () => [] },
})

const emit = defineEmits(['abrirModal', 'filtrarSituacao'])

// ═══════════════════════ THEME (always dark) ═══════════════════════
const txt   = '#CBD5E1'   // slate-300
const sub   = '#475569'   // slate-600
const dim   = '#334155'   // slate-700 – gridlines
const muted = '#1E293B'   // slate-800 – bg strips

const palette = [
    '#818CF8', // indigo
    '#22D3EE', // cyan
    '#34D399', // emerald
    '#FBBF24', // amber
    '#F87171', // red
    '#A78BFA', // violet
    '#F472B6', // pink
    '#FB923C', // orange
    '#60A5FA', // blue
    '#4ADE80', // green
]

// tooltip style – dark glass
const TT = `background:rgba(2,6,23,0.96);border:1px solid rgba(129,140,248,0.25);border-radius:12px;font-size:12px;color:#E2E8F0;box-shadow:0 8px 32px rgba(0,0,0,0.5);padding:10px 14px;`

// ═══════════════════════ HELPERS ═══════════════════════
const safeStr  = (v, fb = '—') => (v == null || String(v).trim() === '' ? fb : String(v).trim())
const parseDate = d => { const dt = new Date(d); return isNaN(dt) ? null : dt }
const dateKey  = d => { const dt = parseDate(d); if (!dt) return null; return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` }
const weekKey  = d => {
    const dt = parseDate(d); if (!dt) return null
    const tmp = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
    const day = tmp.getUTCDay() || 7; tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
    const ys  = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const wk  = Math.ceil((((tmp - ys) / 86400000) + 1) / 7)
    return `${tmp.getUTCFullYear()}-W${String(wk).padStart(2,'0')}`
}
const getEnterpriseNames = l => {
    const arr = Array.isArray(l?.empreendimento) ? l.empreendimento : []
    if (!arr.length) return ['Sem Empreendimento']
    return arr.map(e => safeStr(e?.nome, 'Sem Empreendimento'))
}
const getHour = d => { const dt = parseDate(d); return dt ? dt.getHours() : null }
const getDow  = d => { const dt = parseDate(d); return dt ? dt.getDay()   : null }

// ═══════════════════════ UI CONTROLS ═══════════════════════
const trendBucket = ref('day')
const topN        = ref(10)
const showOthers  = ref(true)

// ═══════════════════════ DERIVED GROUPS ═══════════════════════
const statusCounts = computed(() => {
    const m = new Map()
    for (const l of props.leads || []) { const s = safeStr(l?.situacao_nome,'Sem Situação'); m.set(s,(m.get(s)||0)+1) }
    return [...m.entries()].sort((a,b) => b[1]-a[1])
})

const trend = computed(() => {
    const m = new Map()
    const fn = trendBucket.value === 'week' ? weekKey : dateKey
    for (const l of props.leads || []) { const k = fn(l?.data_cad); if (k) m.set(k,(m.get(k)||0)+1) }
    const keys = [...m.keys()].sort()
    return { keys, values: keys.map(k => m.get(k)||0) }
})

const enterpriseCounts = computed(() => {
    const m = new Map()
    for (const l of props.leads || []) for (const n of getEnterpriseNames(l)) m.set(n,(m.get(n)||0)+1)
    const sorted = [...m.entries()].sort((a,b) => b[1]-a[1])
    if (!sorted.length) return []
    const top  = sorted.slice(0, topN.value)
    const rest = sorted.slice(topN.value)
    if (showOthers.value && rest.length) top.push(['Outros', rest.reduce((s,[,v]) => s+v, 0)])
    return top
})

const originCounts = computed(() => {
    const m = new Map()
    for (const l of props.leads || []) { const k=safeStr(l?.origem,'Sem Origem'); m.set(k,(m.get(k)||0)+1) }
    const sorted = [...m.entries()].sort((a,b) => b[1]-a[1])
    const top = sorted.slice(0, topN.value)
    const rest = sorted.slice(topN.value)
    if (showOthers.value && rest.length) top.push(['Outros', rest.reduce((s,[,v]) => s+v, 0)])
    return top
})

const mediaCounts = computed(() => {
    const m = new Map()
    for (const l of props.leads || []) { const k=safeStr(l?.midia_principal,'Sem Mídia'); m.set(k,(m.get(k)||0)+1) }
    const sorted = [...m.entries()].sort((a,b) => b[1]-a[1])
    const top = sorted.slice(0, topN.value)
    const rest = sorted.slice(topN.value)
    if (showOthers.value && rest.length) top.push(['Outros', rest.reduce((s,[,v]) => s+v, 0)])
    return top
})

const stackedByEnterprise = computed(() => {
    const x = enterpriseCounts.value.map(([n]) => n).filter(n => n !== 'Outros')
    const statusList = statusCounts.value.map(([s]) => s).slice(0, 8)
    const matrix = new Map()
    for (const l of props.leads || []) {
        const s = safeStr(l?.situacao_nome,'Sem Situação')
        if (!statusList.includes(s)) continue
        for (const e of getEnterpriseNames(l)) {
            if (!x.includes(e)) continue
            const mm = matrix.get(e) || new Map()
            mm.set(s,(mm.get(s)||0)+1); matrix.set(e,mm)
        }
    }
    const series = statusList.map((s,i) => ({
        name: s, type: 'bar', stack: 'total',
        emphasis: { focus: 'series' },
        barMaxWidth: 32,
        itemStyle: { color: palette[i % palette.length] },
        data: x.map(e => matrix.get(e)?.get(s)||0)
    }))
    return { x, series }
})

const heatmap = computed(() => {
    const days  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    const hours = Array.from({length:24},(_,i) => String(i).padStart(2,'0')+'h')
    const map = new Map(); let max = 0
    for (const l of props.leads || []) {
        const dow = getDow(l?.data_cad), h = getHour(l?.data_cad)
        if (dow==null||h==null) continue
        const key = `${dow}-${h}`, v = (map.get(key)||0)+1
        map.set(key,v); if (v>max) max=v
    }
    const data = []
    for (let d=0;d<7;d++) for (let h=0;h<24;h++) data.push([h,d,map.get(`${d}-${h}`)||0])
    return { days, hours, data, max }
})

// ═══════════════════════ KPI STRIP ═══════════════════════
const kpiCards = computed(() => {
    const total  = (props.leads||[]).length
    const topSt  = statusCounts.value[0]  || ['—', 0]
    const topEmp = enterpriseCounts.value.filter(([n]) => n !== 'Outros')[0] || ['—', 0]
    const topMid = mediaCounts.value.filter(([n]) => n !== 'Outros')[0]       || ['—', 0]
    const topOri = originCounts.value.filter(([n]) => n !== 'Outros')[0]      || ['—', 0]
    return [
        { label: 'Total de Leads',   value: total,      sub: 'no período',   icon: 'fas fa-users',    color: '#818CF8', glow: 'rgba(129,140,248,0.35)' },
        { label: 'Top Status',       value: topSt[1],   sub: topSt[0],       icon: 'fas fa-chart-pie',color: '#22D3EE', glow: 'rgba(34,211,238,0.35)'  },
        { label: 'Top Empreend.',    value: topEmp[1],  sub: topEmp[0],      icon: 'fas fa-city',     color: '#34D399', glow: 'rgba(52,211,153,0.35)'  },
        { label: 'Top Mídia',        value: topMid[1],  sub: topMid[0],      icon: 'fas fa-bullhorn', color: '#FBBF24', glow: 'rgba(251,191,36,0.35)'  },
        { label: 'Top Origem',       value: topOri[1],  sub: topOri[0],      icon: 'fas fa-compass',  color: '#F472B6', glow: 'rgba(244,114,182,0.35)' },
    ]
})

// ═══════════════════════ CHART OPTIONS ═══════════════════════

const optionTrend = computed(() => {
    const avg = trend.value.values.length
        ? Math.round(trend.value.values.reduce((s,v) => s+v,0) / trend.value.values.length)
        : 0
    return {
        backgroundColor: 'transparent',
        tooltip: { trigger:'axis', confine:true, appendToBody:true, extraCssText: TT,
            formatter: ps => `<span style="color:${sub}">${ps[0].name}</span><br/><span style="color:#818CF8;font-weight:600;font-size:14px">${ps[0].value}</span> leads` },
        grid: { left:8, right:16, top:12, bottom: trend.value.keys.length>25 ? 52:32, containLabel:true },
        dataZoom: trend.value.keys.length > 25
            ? [{ type:'inside' },{ type:'slider', height:18, bottom:6, borderColor:'transparent', fillerColor:'rgba(129,140,248,0.15)', handleStyle:{color:'#818CF8'}, textStyle:{color:sub} }]
            : [],
        xAxis: { type:'category', data:trend.value.keys, boundaryGap:false,
            axisLabel:{ color:sub, fontSize:11, rotate: trend.value.keys.length>20?30:0 },
            axisLine:{ lineStyle:{color:dim} }, axisTick:{show:false}, splitLine:{show:false} },
        yAxis: { type:'value', axisLabel:{color:sub,fontSize:11}, splitLine:{lineStyle:{color:dim,type:'dashed'}}, axisLine:{show:false} },
        series: [{
            name:'Leads', type:'line', smooth:0.45,
            symbolSize:6, symbol:'circle',
            data: trend.value.values,
            lineStyle:{ color:'#818CF8', width:2.5, shadowColor:'rgba(129,140,248,0.4)', shadowBlur:8 },
            itemStyle:{ color:'#818CF8', borderWidth:2, borderColor:'#0F172A' },
            areaStyle:{ color:{ type:'linear',x:0,y:0,x2:0,y2:1,
                colorStops:[{offset:0,color:'rgba(129,140,248,0.35)'},{offset:1,color:'rgba(129,140,248,0.01)'}] } },
            markLine:{ silent:true, lineStyle:{color:'rgba(129,140,248,0.4)',type:'dashed',width:1.5},
                data:[{ type:'average', label:{color:sub,fontSize:10,formatter:`μ ${avg}`} }] }
        }]
    }
})

const optionFunnel = computed(() => {
    const total = statusCounts.value.reduce((s,[,v]) => s+v, 0)
    return {
        backgroundColor: 'transparent',
        color: palette,
        tooltip: { trigger:'item', confine:true, appendToBody:true, extraCssText:TT,
            formatter: p => `<b style="color:${palette[0]}">${p.name}</b><br/>${p.value} leads · <span style="color:${sub}">${total?((p.value/total)*100).toFixed(1):0}%</span>` },
        series: [{
            type:'funnel', left:'8%', right:'8%', top:8, bottom:8,
            sort:'descending', gap:4, minSize:'6%', maxSize:'96%',
            label:{ position:'inside', color:'#0F172A', fontSize:11, fontWeight:600,
                formatter: p => `${p.name}\n${p.value}` },
            labelLine:{show:false},
            itemStyle:{ borderColor:'transparent', borderRadius:8 },
            emphasis:{ label:{fontSize:13,fontWeight:'bold'}, itemStyle:{opacity:0.85} },
            data: statusCounts.value.map(([name,value]) => ({name,value}))
        }]
    }
})

const optionDonutEnterprise = computed(() => {
    const total = enterpriseCounts.value.reduce((s,[,v]) => s+v, 0)
    return {
        backgroundColor: 'transparent',
        color: palette,
        tooltip: { trigger:'item', confine:true, appendToBody:true, extraCssText:TT,
            formatter: p => `<b>${p.name}</b><br/>${p.value} leads · <span style="color:${sub}">${total?((p.value/total)*100).toFixed(1):0}%</span>` },
        legend:{ type:'scroll', orient:'vertical', left:4, top:'middle',
            textStyle:{color:sub,fontSize:10}, icon:'circle', itemWidth:7, itemHeight:7, itemGap:6 },
        graphic:[{
            type:'text', left:'69%', top:'46%', style:{
                text:`${total}`, fill:txt, fontSize:20, fontWeight:'bold', textAlign:'center'
            }
        },{
            type:'text', left:'69%', top:'55%', style:{
                text:'leads', fill:sub, fontSize:11, textAlign:'center'
            }
        }],
        series:[{
            type:'pie', radius:['44%','68%'], center:['70%','50%'], padAngle:2,
            label:{show:false}, labelLine:{show:false},
            emphasis:{ scale:true, scaleSize:6, label:{show:false} },
            itemStyle:{ borderColor:'#0F172A', borderWidth:2 },
            data: enterpriseCounts.value.map(([name,value]) => ({name,value}))
        }]
    }
})

const optionTopEnterpriseBars = computed(() => {
    const entries = enterpriseCounts.value
    return {
        backgroundColor: 'transparent',
        tooltip:{ trigger:'axis', confine:true, appendToBody:true, extraCssText:TT, axisPointer:{type:'none'},
            formatter: ps => `<b>${ps[0].name}</b><br/><span style="color:${palette[0]};font-size:14px;font-weight:600">${ps[0].value}</span> leads` },
        grid:{ left:8, right:52, top:8, bottom:8, containLabel:true },
        xAxis:{ type:'value', axisLabel:{show:false}, splitLine:{lineStyle:{color:dim,type:'dashed'}}, axisLine:{show:false} },
        yAxis:{ type:'category', data:entries.map(([n])=>n), inverse:true,
            axisLabel:{color:sub,fontSize:11,width:130,overflow:'truncate'},
            axisLine:{show:false}, axisTick:{show:false} },
        series:[{
            name:'Leads', type:'bar', barWidth:14,
            showBackground:true, backgroundStyle:{color:muted,borderRadius:[0,8,8,0]},
            label:{ show:true, position:'right', color:sub, fontSize:11 },
            data: entries.map(([,v],i) => ({
                value: v,
                itemStyle:{ borderRadius:[0,8,8,0],
                    color:{ type:'linear',x:0,y:0,x2:1,y2:0,
                        colorStops:[{offset:0,color:palette[i%palette.length]+'CC'},{offset:1,color:palette[i%palette.length]}] } }
            }))
        }]
    }
})

const optionStackedStatusByEnterprise = computed(() => ({
    backgroundColor: 'transparent',
    color: palette,
    tooltip:{ trigger:'axis', confine:true, appendToBody:true, extraCssText:TT, axisPointer:{type:'shadow'} },
    legend:{ type:'scroll', top:4, textStyle:{color:sub,fontSize:10}, icon:'circle', itemWidth:7, itemHeight:7, itemGap:6 },
    grid:{ left:8, right:12, top:48, bottom: stackedByEnterprise.value.x.length>8?52:32, containLabel:true },
    dataZoom: stackedByEnterprise.value.x.length > 8
        ? [{type:'inside'},{type:'slider',height:16,bottom:10,borderColor:'transparent',fillerColor:'rgba(129,140,248,0.15)',handleStyle:{color:'#818CF8'},textStyle:{color:sub}}]
        : [],
    xAxis:{ type:'category', data:stackedByEnterprise.value.x,
        axisLabel:{color:sub,rotate:18,fontSize:10,width:80,overflow:'truncate'},
        axisLine:{lineStyle:{color:dim}}, axisTick:{show:false} },
    yAxis:{ type:'value', axisLabel:{color:sub,fontSize:11},
        splitLine:{lineStyle:{color:dim,type:'dashed'}}, axisLine:{show:false} },
    series: stackedByEnterprise.value.series
}))

const optionHeatmap = computed(() => ({
    backgroundColor: 'transparent',
    tooltip:{ position:'top', confine:true, appendToBody:true, extraCssText:TT,
        formatter: p => `<b style="color:${txt}">${heatmap.value.days[p.value[1]]}</b> · ${heatmap.value.hours[p.value[0]]}<br/><span style="color:#22D3EE;font-size:15px;font-weight:700">${p.value[2]}</span> lead(s)` },
    grid:{ left:36, right:8, top:8, bottom:60, containLabel:true },
    xAxis:{ type:'category', data:heatmap.value.hours,
        axisLabel:{color:sub,fontSize:9}, axisLine:{show:false}, axisTick:{show:false}, splitLine:{show:false} },
    yAxis:{ type:'category', data:heatmap.value.days,
        axisLabel:{color:sub,fontSize:11}, axisLine:{show:false}, axisTick:{show:false} },
    visualMap:{ min:0, max:Math.max(1,heatmap.value.max),
        calculable:true, orient:'horizontal', left:'center', bottom:4,
        textStyle:{color:sub,fontSize:10},
        inRange:{ color:['#0F172A','#164E63','#22D3EE','#A5F3FC'] } },
    series:[{
        type:'heatmap', data:heatmap.value.data,
        itemStyle:{ borderRadius:4, borderWidth:3, borderColor:'#0F172A' },
        emphasis:{ itemStyle:{ shadowBlur:10, shadowColor:'rgba(34,211,238,0.6)' } }
    }]
}))

const optionOrigins = computed(() => {
    const entries = originCounts.value
    return {
        backgroundColor:'transparent',
        tooltip:{ trigger:'axis', confine:true, appendToBody:true, extraCssText:TT, axisPointer:{type:'none'},
            formatter: ps => `<b>${ps[0].name}</b><br/><span style="color:${palette[2]};font-size:14px;font-weight:600">${ps[0].value}</span> leads` },
        grid:{ left:8, right:52, top:8, bottom:8, containLabel:true },
        xAxis:{ type:'value', axisLabel:{show:false}, splitLine:{lineStyle:{color:dim,type:'dashed'}}, axisLine:{show:false} },
        yAxis:{ type:'category', data:entries.map(([n])=>n), inverse:true,
            axisLabel:{color:sub,fontSize:11,width:130,overflow:'truncate'},
            axisLine:{show:false}, axisTick:{show:false} },
        series:[{
            name:'Leads', type:'bar', barWidth:14,
            showBackground:true, backgroundStyle:{color:muted,borderRadius:[0,8,8,0]},
            label:{show:true,position:'right',color:sub,fontSize:11},
            data: entries.map(([,v],i) => ({
                value:v,
                itemStyle:{ borderRadius:[0,8,8,0], color:palette[(i+2)%palette.length] }
            }))
        }]
    }
})

const optionMedia = computed(() => {
    const entries = mediaCounts.value
    return {
        backgroundColor:'transparent',
        tooltip:{ trigger:'axis', confine:true, appendToBody:true, extraCssText:TT, axisPointer:{type:'none'},
            formatter: ps => `<b>${ps[0].name}</b><br/><span style="color:${palette[1]};font-size:14px;font-weight:600">${ps[0].value}</span> leads` },
        grid:{ left:8, right:52, top:8, bottom:8, containLabel:true },
        xAxis:{ type:'value', axisLabel:{show:false}, splitLine:{lineStyle:{color:dim,type:'dashed'}}, axisLine:{show:false} },
        yAxis:{ type:'category', data:entries.map(([n])=>n), inverse:true,
            axisLabel:{color:sub,fontSize:11,width:130,overflow:'truncate'},
            axisLine:{show:false}, axisTick:{show:false} },
        series:[{
            name:'Leads', type:'bar', barWidth:14,
            showBackground:true, backgroundStyle:{color:muted,borderRadius:[0,8,8,0]},
            label:{show:true,position:'right',color:sub,fontSize:11},
            data: entries.map(([,v],i) => ({
                value:v,
                itemStyle:{ borderRadius:[0,8,8,0], color:palette[(i+5)%palette.length] }
            }))
        }]
    }
})

// ═══════════════════════ CLICK HANDLERS ═══════════════════════
function openByStatus(s) {
    emit('filtrarSituacao', s)
    const leads = (props.leads||[]).filter(l => safeStr(l?.situacao_nome,'Sem Situação') === s)
    emit('abrirModal', [leads, 'list'])
}
function openByEnterprise(name) {
    if (name === 'Outros') return
    const found = (props.leadsByEnterprise||[]).find(e => e.name === name)
    if (found?.leads?.length) return emit('abrirModal', [found.leads, 'list'])
    const leads = (props.leads||[]).filter(l => getEnterpriseNames(l).includes(name))
    emit('abrirModal', [leads, 'list'])
}
function openByOrigin(name) {
    if (name === 'Outros') return
    const leads = (props.leads||[]).filter(l => safeStr(l?.origem,'Sem Origem') === name)
    emit('abrirModal', [leads, 'list'])
}
function openByMedia(name) {
    if (name === 'Outros') return
    const leads = (props.leads||[]).filter(l => safeStr(l?.midia_principal,'Sem Mídia') === name)
    emit('abrirModal', [leads, 'list'])
}
function onChartClick(kind, params) {
    const name = params?.name; if (!name) return
    if (kind === 'funnel')          return openByStatus(name)
    if (kind === 'donut')           return openByEnterprise(name)
    if (kind === 'rankEnterprise')  return openByEnterprise(name)
    if (kind === 'origins')         return openByOrigin(name)
    if (kind === 'media')           return openByMedia(name)
}
</script>

<template>
    <!-- Dark tech wrapper -->
    <div class="bg-slate-950 rounded-2xl p-5 space-y-5 border border-slate-800/60">

        <!-- ── Header bar ── -->
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
                <!-- Pulse dot -->
                <span class="relative flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-50"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <div>
                    <p class="font-bold text-slate-100 tracking-tight leading-none">Dashboard Analítico</p>
                    <p class="text-xs text-slate-500 mt-0.5">
                        <span class="text-indigo-400 font-semibold">{{ leads?.length || 0 }}</span> leads no período selecionado
                    </p>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
                <!-- Trend bucket -->
                <div class="inline-flex rounded-lg overflow-hidden border border-slate-700 text-xs font-medium">
                    <button class="px-3 py-1.5 transition-colors"
                        :class="trendBucket==='day' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'"
                        @click="trendBucket='day'">Diário</button>
                    <button class="px-3 py-1.5 border-l border-slate-700 transition-colors"
                        :class="trendBucket==='week' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'"
                        @click="trendBucket='week'">Semanal</button>
                </div>

                <!-- Others toggle -->
                <button class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                    :class="showOthers ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-900 border-slate-700 text-slate-500'"
                    @click="showOthers=!showOthers">
                    + Outros
                </button>

            </div>
        </div>

        <!-- ── KPI Strip ── -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <div v-for="k in kpiCards" :key="k.label"
                class="relative rounded-xl border border-slate-800 bg-slate-900 p-4 overflow-hidden">
                <!-- glow -->
                <div class="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-30"
                    :style="{ backgroundColor: k.color }"></div>
                <div class="relative">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{{ k.label }}</span>
                        <i :class="k.icon" class="text-xs" :style="{ color: k.color }"></i>
                    </div>
                    <p class="text-2xl font-bold text-slate-100 leading-none tabular-nums">{{ k.value ?? '—' }}</p>
                    <p class="mt-1 text-[11px] text-slate-500 truncate">{{ k.sub }}</p>
                </div>
            </div>
        </div>

        <!-- ── Row 1: Trend + Funnel ── -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <!-- Trend -->
            <div class="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div class="h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
                <div class="px-5 py-4 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-slate-200">Tendência de Entradas</p>
                        <p class="text-xs text-slate-500">{{ trendBucket==='week' ? 'Agrupado por semana' : 'Agrupado por dia' }}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">{{ trend.keys.length }} períodos</span>
                        <div class="[&_button]:border-slate-700 [&_button]:text-slate-500 [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200 [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1"><ChartActions filename="trend-leads" bg="#0F172A" /></div>
                    </div>
                </div>
                <VChart :option="optionTrend" autoresize style="height:240px;width:100%;" />
            </div>

            <!-- Funnel -->
            <div class="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div class="h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                <div class="px-5 py-4 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-slate-200">Funil de Situações</p>
                        <p class="text-xs text-slate-500">Clique para filtrar</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md">{{ statusCounts.length }} status</span>
                        <div class="[&_button]:border-slate-700 [&_button]:text-slate-500 [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200 [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1"><ChartActions filename="funil-situacoes" bg="#0F172A" /></div>
                    </div>
                </div>
                <VChart :option="optionFunnel" autoresize style="height:240px;width:100%;"
                    @click="p => onChartClick('funnel', p)" />
            </div>
        </div>

        <!-- ── Row 2: Stacked + Donut ── -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <!-- Stacked bars -->
            <div class="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div class="h-0.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                <div class="px-5 py-4 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-slate-200">Status por Empreendimento</p>
                        <p class="text-xs text-slate-500">top 8 status</p>
                    </div>
                    <div class="[&_button]:border-slate-700 [&_button]:text-slate-500 [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200 [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1"><ChartActions filename="status-empreendimento" bg="#0F172A" /></div>
                </div>
                <VChart :option="optionStackedStatusByEnterprise" autoresize style="height:300px;width:100%;" />
            </div>

            <!-- Donut -->
            <div class="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div class="h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <div class="px-5 py-4 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-slate-200">Distribuição — Empreendimentos</p>
                        <p class="text-xs text-slate-500">Clique para abrir</p>
                    </div>
                    <div class="[&_button]:border-slate-700 [&_button]:text-slate-500 [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200 [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1"><ChartActions filename="distribuicao-empreendimentos" bg="#0F172A" /></div>
                </div>
                <VChart :option="optionDonutEnterprise" autoresize style="height:300px;width:100%;"
                    @click="p => onChartClick('donut', p)" />
            </div>
        </div>

        <!-- ── Row 3: Heatmap (full) ── -->
        <div class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div class="h-0.5 bg-gradient-to-r from-cyan-600 via-sky-400 to-cyan-300"></div>
            <div class="px-5 py-4 flex items-center justify-between">
                <div>
                    <p class="text-sm font-semibold text-slate-200">Mapa de Calor — Horários de Entrada</p>
                    <p class="text-xs text-slate-500">Dia da semana × hora do dia</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md font-mono">heatmap</span>
                    <div class="[&_button]:border-slate-700 [&_button]:text-slate-500 [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200 [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1"><ChartActions filename="heatmap-horarios" bg="#0F172A" /></div>
                </div>
            </div>
            <VChart :option="optionHeatmap" autoresize style="height:260px;width:100%;" />
        </div>

        <!-- ── Row 4: Ranking + Origens + Mídias ── -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Ranking -->
            <div class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div class="h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <div class="px-5 py-4 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-slate-200">Ranking Empreendimentos</p>
                        <p class="text-xs text-slate-500">Clique para abrir leads</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="fas fa-city text-indigo-400 text-xs"></i>
                        <div class="[&_button]:border-slate-700 [&_button]:text-slate-500 [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200 [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1"><ChartActions filename="ranking-empreendimentos" bg="#0F172A" /></div>
                    </div>
                </div>
                <VChart :option="optionTopEnterpriseBars" autoresize style="height:300px;width:100%;"
                    @click="p => onChartClick('rankEnterprise', p)" />
            </div>

            <!-- Origens -->
            <div class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div class="h-0.5 bg-gradient-to-r from-emerald-500 to-green-400"></div>
                <div class="px-5 py-4 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-slate-200">Origens</p>
                        <p class="text-xs text-slate-500">Clique para abrir leads</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="fas fa-compass text-emerald-400 text-xs"></i>
                        <div class="[&_button]:border-slate-700 [&_button]:text-slate-500 [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200 [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1"><ChartActions filename="origens-leads" bg="#0F172A" /></div>
                    </div>
                </div>
                <VChart :option="optionOrigins" autoresize style="height:300px;width:100%;"
                    @click="p => onChartClick('origins', p)" />
            </div>

            <!-- Mídias -->
            <div class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div class="h-0.5 bg-gradient-to-r from-pink-500 to-rose-400"></div>
                <div class="px-5 py-4 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-semibold text-slate-200">Mídias</p>
                        <p class="text-xs text-slate-500">Clique para abrir leads</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="fas fa-bullhorn text-pink-400 text-xs"></i>
                        <div class="[&_button]:border-slate-700 [&_button]:text-slate-500 [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200 [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1"><ChartActions filename="midias-leads" bg="#0F172A" /></div>
                    </div>
                </div>
                <VChart :option="optionMedia" autoresize style="height:300px;width:100%;"
                    @click="p => onChartClick('media', p)" />
            </div>
        </div>
    </div>
</template>
