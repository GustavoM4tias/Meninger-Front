<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import ChartCard from './ChartCard.vue'
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

// ═══════════════════════ THEME (reactive light/dark) ═══════════════════════
const isDark = ref(false)
let themeObserver = null

onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark')
    themeObserver = new MutationObserver(() => {
        isDark.value = document.documentElement.classList.contains('dark')
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => themeObserver?.disconnect())

// Tokens reativos
const txt     = computed(() => isDark.value ? '#E2E8F0' : '#0F172A')   // textos primários
const sub     = computed(() => isDark.value ? '#94A3B8' : '#64748B')   // textos secundários
const dim     = computed(() => isDark.value ? '#334155' : '#E2E8F0')   // gridlines
const muted   = computed(() => isDark.value ? '#1E293B' : '#F1F5F9')   // bg de barras
const surface = computed(() => isDark.value ? '#0F172A' : '#FFFFFF')   // bg da carta (borda de fatias/heatmap)
const sliceBd = computed(() => isDark.value ? '#0F172A' : '#FFFFFF')   // borda entre fatias

const palette = [
    '#6366F1', // indigo
    '#06B6D4', // cyan
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#F97316', // orange
    '#3B82F6', // blue
    '#22C55E', // green
]

// tooltip style – reativo
const TT = computed(() =>
    isDark.value
        ? `background:rgba(2,6,23,0.96);border:1px solid rgba(99,102,241,0.25);border-radius:12px;font-size:12px;color:#E2E8F0;box-shadow:0 8px 32px rgba(0,0,0,0.5);padding:10px 14px;`
        : `background:rgba(255,255,255,0.98);border:1px solid rgba(99,102,241,0.2);border-radius:12px;font-size:12px;color:#0F172A;box-shadow:0 8px 32px rgba(15,23,42,0.12);padding:10px 14px;`
)

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
        { label: 'Total de Leads',   value: total,      sub: 'no período',   icon: 'fas fa-users',    color: '#6366F1' },
        { label: 'Top Status',       value: topSt[1],   sub: topSt[0],       icon: 'fas fa-chart-pie',color: '#06B6D4' },
        { label: 'Top Empreend.',    value: topEmp[1],  sub: topEmp[0],      icon: 'fas fa-city',     color: '#10B981' },
        { label: 'Top Mídia',        value: topMid[1],  sub: topMid[0],      icon: 'fas fa-bullhorn', color: '#F59E0B' },
        { label: 'Top Origem',       value: topOri[1],  sub: topOri[0],      icon: 'fas fa-compass',  color: '#EC4899' },
    ]
})

// ═══════════════════════ CHART OPTIONS ═══════════════════════

const optionTrend = computed(() => {
    const avg = trend.value.values.length
        ? Math.round(trend.value.values.reduce((s,v) => s+v,0) / trend.value.values.length)
        : 0
    return {
        backgroundColor: 'transparent',
        tooltip: { trigger:'axis', confine:true, appendToBody:true, extraCssText: TT.value,
            formatter: ps => `<span style="color:${sub.value}">${ps[0].name}</span><br/><span style="color:#6366F1;font-weight:600;font-size:14px">${ps[0].value}</span> leads` },
        grid: { left:8, right:16, top:12, bottom: trend.value.keys.length>25 ? 52:32, containLabel:true },
        dataZoom: trend.value.keys.length > 25
            ? [{ type:'inside' },{ type:'slider', height:18, bottom:6, borderColor:'transparent', fillerColor:'rgba(99,102,241,0.15)', handleStyle:{color:'#6366F1'}, textStyle:{color:sub.value} }]
            : [],
        xAxis: { type:'category', data:trend.value.keys, boundaryGap:false,
            axisLabel:{ color:sub.value, fontSize:11, rotate: trend.value.keys.length>20?30:0 },
            axisLine:{ lineStyle:{color:dim.value} }, axisTick:{show:false}, splitLine:{show:false} },
        yAxis: { type:'value', axisLabel:{color:sub.value,fontSize:11}, splitLine:{lineStyle:{color:dim.value,type:'dashed'}}, axisLine:{show:false} },
        series: [{
            name:'Leads', type:'line', smooth:0.45,
            symbolSize:6, symbol:'circle',
            data: trend.value.values,
            lineStyle:{ color:'#6366F1', width:2.5, shadowColor:'rgba(99,102,241,0.4)', shadowBlur:8 },
            itemStyle:{ color:'#6366F1', borderWidth:2, borderColor:surface.value },
            areaStyle:{ color:{ type:'linear',x:0,y:0,x2:0,y2:1,
                colorStops:[{offset:0,color:'rgba(99,102,241,0.35)'},{offset:1,color:'rgba(99,102,241,0.01)'}] } },
            markLine:{ silent:true, lineStyle:{color:'rgba(99,102,241,0.4)',type:'dashed',width:1.5},
                data:[{ type:'average', label:{color:sub.value,fontSize:10,formatter:`μ ${avg}`} }] }
        }]
    }
})

const optionFunnel = computed(() => {
    const total = statusCounts.value.reduce((s,[,v]) => s+v, 0)
    return {
        backgroundColor: 'transparent',
        color: palette,
        tooltip: { trigger:'item', confine:true, appendToBody:true, extraCssText:TT.value,
            formatter: p => `<b style="color:${palette[0]}">${p.name}</b><br/>${p.value} leads · <span style="color:${sub.value}">${total?((p.value/total)*100).toFixed(1):0}%</span>` },
        series: [{
            type:'funnel', left:'8%', right:'8%', top:8, bottom:8,
            sort:'descending', gap:4, minSize:'6%', maxSize:'96%',
            label:{ position:'inside', color:'#FFFFFF', fontSize:11, fontWeight:600,
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
        tooltip: { trigger:'item', confine:true, appendToBody:true, extraCssText:TT.value,
            formatter: p => `<b>${p.name}</b><br/>${p.value} leads · <span style="color:${sub.value}">${total?((p.value/total)*100).toFixed(1):0}%</span>` },
        legend:{ type:'scroll', orient:'vertical', left:4, top:'middle',
            textStyle:{color:sub.value,fontSize:10}, icon:'circle', itemWidth:7, itemHeight:7, itemGap:6 },
        graphic:[{
            type:'text', left:'69%', top:'46%', style:{
                text:`${total}`, fill:txt.value, fontSize:20, fontWeight:'bold', textAlign:'center'
            }
        },{
            type:'text', left:'69%', top:'55%', style:{
                text:'leads', fill:sub.value, fontSize:11, textAlign:'center'
            }
        }],
        series:[{
            type:'pie', radius:['44%','68%'], center:['70%','50%'], padAngle:2,
            label:{show:false}, labelLine:{show:false},
            emphasis:{ scale:true, scaleSize:6, label:{show:false} },
            itemStyle:{ borderColor:sliceBd.value, borderWidth:2 },
            data: enterpriseCounts.value.map(([name,value]) => ({name,value}))
        }]
    }
})

const optionTopEnterpriseBars = computed(() => {
    const entries = enterpriseCounts.value
    return {
        backgroundColor: 'transparent',
        tooltip:{ trigger:'axis', confine:true, appendToBody:true, extraCssText:TT.value, axisPointer:{type:'none'},
            formatter: ps => `<b>${ps[0].name}</b><br/><span style="color:${palette[0]};font-size:14px;font-weight:600">${ps[0].value}</span> leads` },
        grid:{ left:8, right:52, top:8, bottom:8, containLabel:true },
        xAxis:{ type:'value', axisLabel:{show:false}, splitLine:{lineStyle:{color:dim.value,type:'dashed'}}, axisLine:{show:false} },
        yAxis:{ type:'category', data:entries.map(([n])=>n), inverse:true,
            axisLabel:{color:sub.value,fontSize:11,width:130,overflow:'truncate'},
            axisLine:{show:false}, axisTick:{show:false} },
        series:[{
            name:'Leads', type:'bar', barWidth:14,
            showBackground:true, backgroundStyle:{color:muted.value,borderRadius:[0,8,8,0]},
            label:{ show:true, position:'right', color:sub.value, fontSize:11 },
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
    tooltip:{ trigger:'axis', confine:true, appendToBody:true, extraCssText:TT.value, axisPointer:{type:'shadow'} },
    legend:{ type:'scroll', top:4, textStyle:{color:sub.value,fontSize:10}, icon:'circle', itemWidth:7, itemHeight:7, itemGap:6 },
    grid:{ left:8, right:12, top:48, bottom: stackedByEnterprise.value.x.length>8?52:32, containLabel:true },
    dataZoom: stackedByEnterprise.value.x.length > 8
        ? [{type:'inside'},{type:'slider',height:16,bottom:10,borderColor:'transparent',fillerColor:'rgba(99,102,241,0.15)',handleStyle:{color:'#6366F1'},textStyle:{color:sub.value}}]
        : [],
    xAxis:{ type:'category', data:stackedByEnterprise.value.x,
        axisLabel:{color:sub.value,rotate:18,fontSize:10,width:80,overflow:'truncate'},
        axisLine:{lineStyle:{color:dim.value}}, axisTick:{show:false} },
    yAxis:{ type:'value', axisLabel:{color:sub.value,fontSize:11},
        splitLine:{lineStyle:{color:dim.value,type:'dashed'}}, axisLine:{show:false} },
    series: stackedByEnterprise.value.series
}))

const optionHeatmap = computed(() => ({
    backgroundColor: 'transparent',
    tooltip:{ position:'top', confine:true, appendToBody:true, extraCssText:TT.value,
        formatter: p => `<b style="color:${txt.value}">${heatmap.value.days[p.value[1]]}</b> · ${heatmap.value.hours[p.value[0]]}<br/><span style="color:#06B6D4;font-size:15px;font-weight:700">${p.value[2]}</span> lead(s)` },
    grid:{ left:36, right:8, top:8, bottom:60, containLabel:true },
    xAxis:{ type:'category', data:heatmap.value.hours,
        axisLabel:{color:sub.value,fontSize:9}, axisLine:{show:false}, axisTick:{show:false}, splitLine:{show:false} },
    yAxis:{ type:'category', data:heatmap.value.days,
        axisLabel:{color:sub.value,fontSize:11}, axisLine:{show:false}, axisTick:{show:false} },
    visualMap:{ min:0, max:Math.max(1,heatmap.value.max),
        calculable:true, orient:'horizontal', left:'center', bottom:4,
        textStyle:{color:sub.value,fontSize:10},
        inRange:{
            color: isDark.value
                ? ['#0F172A','#164E63','#06B6D4','#A5F3FC']
                : ['#F1F5F9','#A5F3FC','#06B6D4','#0E7490']
        } },
    series:[{
        type:'heatmap', data:heatmap.value.data,
        itemStyle:{ borderRadius:4, borderWidth:3, borderColor:surface.value },
        emphasis:{ itemStyle:{ shadowBlur:10, shadowColor:'rgba(6,182,212,0.6)' } }
    }]
}))

const optionOrigins = computed(() => {
    const entries = originCounts.value
    return {
        backgroundColor:'transparent',
        tooltip:{ trigger:'axis', confine:true, appendToBody:true, extraCssText:TT.value, axisPointer:{type:'none'},
            formatter: ps => `<b>${ps[0].name}</b><br/><span style="color:${palette[2]};font-size:14px;font-weight:600">${ps[0].value}</span> leads` },
        grid:{ left:8, right:52, top:8, bottom:8, containLabel:true },
        xAxis:{ type:'value', axisLabel:{show:false}, splitLine:{lineStyle:{color:dim.value,type:'dashed'}}, axisLine:{show:false} },
        yAxis:{ type:'category', data:entries.map(([n])=>n), inverse:true,
            axisLabel:{color:sub.value,fontSize:11,width:130,overflow:'truncate'},
            axisLine:{show:false}, axisTick:{show:false} },
        series:[{
            name:'Leads', type:'bar', barWidth:14,
            showBackground:true, backgroundStyle:{color:muted.value,borderRadius:[0,8,8,0]},
            label:{show:true,position:'right',color:sub.value,fontSize:11},
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
        tooltip:{ trigger:'axis', confine:true, appendToBody:true, extraCssText:TT.value, axisPointer:{type:'none'},
            formatter: ps => `<b>${ps[0].name}</b><br/><span style="color:${palette[1]};font-size:14px;font-weight:600">${ps[0].value}</span> leads` },
        grid:{ left:8, right:52, top:8, bottom:8, containLabel:true },
        xAxis:{ type:'value', axisLabel:{show:false}, splitLine:{lineStyle:{color:dim.value,type:'dashed'}}, axisLine:{show:false} },
        yAxis:{ type:'category', data:entries.map(([n])=>n), inverse:true,
            axisLabel:{color:sub.value,fontSize:11,width:130,overflow:'truncate'},
            axisLine:{show:false}, axisTick:{show:false} },
        series:[{
            name:'Leads', type:'bar', barWidth:14,
            showBackground:true, backgroundStyle:{color:muted.value,borderRadius:[0,8,8,0]},
            label:{show:true,position:'right',color:sub.value,fontSize:11},
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
    <!-- Wrapper com tokens semânticos (claro/escuro) -->
    <div class="bg-surface-raised rounded-2xl p-5 space-y-5 border border-line">

        <!-- ── Header bar ── -->
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
                <!-- Pulse dot -->
                <span class="relative flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                </span>
                <div>
                    <p class="font-bold text-ink tracking-tight leading-none">Dashboard Analítico</p>
                    <p class="text-xs text-ink-subtle mt-0.5">
                        <span class="text-accent font-semibold">{{ leads?.length || 0 }}</span> leads no período selecionado
                    </p>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
                <!-- Trend bucket -->
                <div class="inline-flex rounded-lg overflow-hidden border border-line text-xs font-medium">
                    <button class="px-3 py-1.5 transition-colors"
                        :class="trendBucket==='day'
                            ? 'bg-accent text-white'
                            : 'bg-surface-sunken text-ink-muted hover:bg-surface-hover'"
                        @click="trendBucket='day'">Diário</button>
                    <button class="px-3 py-1.5 border-l border-line transition-colors"
                        :class="trendBucket==='week'
                            ? 'bg-accent text-white'
                            : 'bg-surface-sunken text-ink-muted hover:bg-surface-hover'"
                        @click="trendBucket='week'">Semanal</button>
                </div>

                <!-- Others toggle -->
                <button class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                    :class="showOthers
                        ? 'bg-accent-soft border-accent/30 text-accent'
                        : 'bg-surface-sunken border-line text-ink-subtle hover:text-ink-muted'"
                    @click="showOthers=!showOthers">
                    + Outros
                </button>
            </div>
        </div>

        <!-- ── KPI Strip ── -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <div v-for="k in kpiCards" :key="k.label"
                class="relative rounded-xl border border-line bg-surface-sunken p-4 overflow-hidden">
                <!-- glow -->
                <div class="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-30"
                    :style="{ backgroundColor: k.color }"></div>
                <div class="relative">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-semibold uppercase tracking-widest text-ink-subtle">{{ k.label }}</span>
                        <i :class="k.icon" class="text-xs" :style="{ color: k.color }"></i>
                    </div>
                    <p class="text-2xl font-bold text-ink leading-none tabular-nums">{{ k.value ?? '—' }}</p>
                    <p class="mt-1 text-[11px] text-ink-subtle truncate">{{ k.sub }}</p>
                </div>
            </div>
        </div>

        <!-- ── Row 1: Trend + Funnel ── -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <ChartCard class="lg:col-span-8"
                title="Tendência de Entradas"
                :subtitle="trendBucket==='week' ? 'Agrupado por semana' : 'Agrupado por dia'"
                accent="from-indigo-500 to-violet-500"
                :badge="`${trend.keys.length} períodos`"
                filename="trend-leads" height="240px">
                <VChart :option="optionTrend" autoresize style="height:100%;width:100%;" />
            </ChartCard>

            <ChartCard class="lg:col-span-4"
                title="Funil de Situações" subtitle="Clique para filtrar"
                accent="from-cyan-500 to-blue-500"
                :badge="`${statusCounts.length} status`"
                filename="funil-situacoes" height="240px">
                <VChart :option="optionFunnel" autoresize style="height:100%;width:100%;"
                    @click="p => onChartClick('funnel', p)" />
            </ChartCard>
        </div>

        <!-- ── Row 2: Stacked + Donut ── -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <ChartCard class="lg:col-span-7"
                title="Status por Empreendimento" subtitle="top 8 status"
                accent="from-amber-500 to-orange-500"
                filename="status-empreendimento" height="300px">
                <VChart :option="optionStackedStatusByEnterprise" autoresize style="height:100%;width:100%;" />
            </ChartCard>

            <ChartCard class="lg:col-span-5"
                title="Distribuição — Empreendimentos" subtitle="Clique para abrir"
                accent="from-emerald-500 to-teal-500"
                filename="distribuicao-empreendimentos" height="300px">
                <VChart :option="optionDonutEnterprise" autoresize style="height:100%;width:100%;"
                    @click="p => onChartClick('donut', p)" />
            </ChartCard>
        </div>

        <!-- ── Row 3: Heatmap ── -->
        <ChartCard
            title="Mapa de Calor — Horários de Entrada"
            subtitle="Dia da semana × hora do dia"
            accent="from-cyan-600 via-sky-400 to-cyan-300"
            badge="heatmap"
            filename="heatmap-horarios" height="260px">
            <VChart :option="optionHeatmap" autoresize style="height:100%;width:100%;" />
        </ChartCard>

        <!-- ── Row 4: Ranking + Origens + Mídias ── -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard
                title="Ranking Empreendimentos" subtitle="Clique para abrir leads"
                accent="from-indigo-500 to-purple-500"
                filename="ranking-empreendimentos" height="300px">
                <VChart :option="optionTopEnterpriseBars" autoresize style="height:100%;width:100%;"
                    @click="p => onChartClick('rankEnterprise', p)" />
            </ChartCard>

            <ChartCard
                title="Origens" subtitle="Clique para abrir leads"
                accent="from-emerald-500 to-green-400"
                filename="origens-leads" height="300px">
                <VChart :option="optionOrigins" autoresize style="height:100%;width:100%;"
                    @click="p => onChartClick('origins', p)" />
            </ChartCard>

            <ChartCard
                title="Mídias" subtitle="Clique para abrir leads"
                accent="from-pink-500 to-rose-400"
                filename="midias-leads" height="300px">
                <VChart :option="optionMedia" autoresize style="height:100%;width:100%;"
                    @click="p => onChartClick('media', p)" />
            </ChartCard>
        </div>
    </div>
</template>
