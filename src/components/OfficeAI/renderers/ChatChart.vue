<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart, PieChart, LineChart,
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent,
  CanvasRenderer,
])

const PALETTE = [
  '#6366f1', '#22d3ee', '#34d399', '#f59e0b',
  '#f43f5e', '#a78bfa', '#fb923c', '#38bdf8',
  '#4ade80', '#e879f9',
]

const props = defineProps({
  chartType:    { type: String, default: 'bar' },
  title:        { type: String, default: '' },
  subtitle:     { type: String, default: '' },
  labels:       { type: Array,  default: () => [] },
  data:         { type: Array,  default: () => [] },
  total:        { type: [Number, null], default: null },
  topBreakdown: { type: Array,  default: () => [] },
})

const fmtNumber = (v) => v == null ? '—' : new Intl.NumberFormat('pt-BR').format(v)

const chartRef   = ref(null)
const loading    = ref(props.data.length === 0)
const copied     = ref(false)
const activeType = ref(props.chartType)
const isDark     = ref(document.documentElement.classList.contains('dark'))

const canToggle = computed(() =>
  props.labels.length > 0 && props.labels.length <= 12
)

// Detecta mudança de tema
let observer
onMounted(() => {
  if (loading.value) setTimeout(() => { loading.value = false }, 300)
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => observer?.disconnect())

function makeGradient(hex) {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0,   color: hex },
    { offset: 0.8, color: hex + '55' },
    { offset: 1,   color: hex + '11' },
  ])
}

const option = computed(() => {
  const colors    = props.labels.map((_, i) => PALETTE[i % PALETTE.length])
  const dark      = isDark.value
  const tooltipBg = dark ? '#1e293b' : '#ffffff'
  const tooltipBd = dark ? '#334155' : '#e5e7eb'
  const tooltipTx = dark ? '#e2e8f0' : '#1f2937'
  const labelClr  = dark ? '#94a3b8' : '#6b7280'
  const axisClr   = dark ? '#64748b' : '#9ca3af'
  const gridClr   = dark ? '#1e293b' : '#f3f4f6'
  const axisLineClr = dark ? '#1e293b' : '#e5e7eb'

  if (activeType.value === 'pie') {
    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      animationType: 'expansion',
      color: PALETTE,
      tooltip: {
        trigger: 'item',
        backgroundColor: tooltipBg,
        borderColor: tooltipBd,
        textStyle: { color: tooltipTx, fontSize: 12 },
        formatter: (p) => `
          <div class="flex items-center gap-2">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <b>${p.name}</b>: ${Number(p.value).toLocaleString('pt-BR')}
            <span style="color:#94a3b8">(${p.percent}%)</span>
          </div>`,
      },
      legend: {
        orient: 'vertical',
        right: '2%',
        top: 'center',
        textStyle: { color: labelClr, fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [{
        type: 'pie',
        radius: ['38%', '68%'],
        center: ['40%', '50%'],
        data: props.labels.map((l, i) => ({
          name: l ?? '—',
          value: props.data[i] ?? 0,
          itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: 4 },
        })),
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(99,102,241,0.4)' },
        },
      }],
    }
  }

  // Bar
  const max = Math.max(...props.data, 0)
  return {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 700,
    animationEasing: 'cubicOut',
    color: PALETTE,
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBd,
      textStyle: { color: tooltipTx, fontSize: 12 },
      formatter: (params) => {
        const p = params[0]
        const pct = max ? ((p.value / max) * 100).toFixed(0) : 0
        return `<div style="padding:2px 0">
          <div style="color:${axisClr};font-size:11px;margin-bottom:4px">${p.axisValue}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.color}"></span>
            <b style="font-size:14px;color:${tooltipTx}">${Number(p.value).toLocaleString('pt-BR')}</b>
            <span style="color:${axisClr};font-size:11px">${pct}% do maior</span>
          </div>
        </div>`
      },
    },
    grid: { left: 4, right: 4, bottom: props.labels.length > 6 ? 36 : 12, top: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: props.labels,
      axisLabel: {
        color: axisClr, fontSize: 10,
        rotate: props.labels.length > 7 ? 35 : 0,
        interval: 0,
        overflow: 'truncate',
        width: 80,
      },
      axisLine: { lineStyle: { color: axisLineClr } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: axisClr, fontSize: 10 },
      splitLine: { lineStyle: { color: gridClr, type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: props.data.map((v, i) => ({
        value: v,
        itemStyle: {
          color: makeGradient(colors[i % colors.length]),
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: colors[i % colors.length],
            shadowBlur: 16,
            shadowColor: colors[i % colors.length] + '66',
          },
        },
      })),
      barMaxWidth: 48,
      barMinWidth: 12,
      label: {
        show: props.data.length <= 12,
        position: 'top',
        color: labelClr,
        fontSize: 10,
        formatter: (p) => Number(p.value).toLocaleString('pt-BR'),
      },
    }],
  }
})

async function copyImage() {
  const instance = chartRef.value?.chart
  if (!instance) return
  const bg = isDark.value ? '#0f172a' : '#ffffff'
  const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: bg })
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback: download the image
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.title || 'grafico'}.png`
    a.click()
  }
}

function downloadCSV() {
  const lines = ['Categoria,Total']
  props.labels.forEach((l, i) =>
    lines.push(`"${String(l ?? '').replace(/"/g, '""')}",${props.data[i] ?? 0}`)
  )
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.title || 'grafico'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 mt-2 shadow">
    <!-- Header -->
    <div class="px-4 py-3 bg-slate-300/20 dark:bg-slate-800/60 flex items-center justify-between gap-2 border-b border-white/5">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-1.5 h-5 rounded-full bg-indigo-500 flex-shrink-0" />
        <div class="min-w-0">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-medium dark:text-gray-200 truncate">{{ title || 'Gráfico' }}</span>
            <span v-if="total != null" class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums whitespace-nowrap">
              Total: {{ fmtNumber(total) }}
            </span>
          </div>
          <p v-if="subtitle" class="text-[11px] text-gray-500 dark:text-slate-500 truncate mt-0.5">{{ subtitle }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <!-- Toggle bar/pie -->
        <div v-if="canToggle" class="flex bg-white hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 shadow-sm hover:shadow rounded-lg p-0.5 mr-1">
          <button
            @click="activeType = 'bar'"
            class="px-2 py-0.5 rounded-md text-xs transition"
            :class="activeType === 'bar' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
          >
            <i class="fas fa-chart-bar" />
          </button>
          <button
            @click="activeType = 'pie'"
            class="px-2 py-0.5 rounded-md text-xs transition"
            :class="activeType === 'pie' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
          >
            <i class="fas fa-chart-pie" />
          </button>
        </div>

        <button
          @click="copyImage"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-sm hover:shadow duration-300 bg-white hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs transition"
          title="Copiar imagem para a área de transferência"
        >
          <i :class="copied ? 'fas fa-check text-green-400' : 'far fa-copy'" />
          <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
        </button>
        <button
          @click="downloadCSV"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-sm hover:shadow duration-300 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 hover:text-emerald-600 dark:bg-emerald-400/20 dark:hover:bg-emerald-400/40 dark:text-emerald-100 dark:hover:text-emerald-200 text-xs transition"
          title="Exportar dados como CSV"
        >
          <i class="fas fa-file-csv" />
          <span>CSV</span>
        </button>
      </div>
    </div>

    <!-- Top breakdown (chips com top 3 categorias) -->
    <div
      v-if="topBreakdown.length"
      class="px-4 py-2 flex flex-wrap gap-1.5 border-b border-white/5 bg-slate-50/50 dark:bg-slate-800/30"
    >
      <span
        v-for="(t, i) in topBreakdown"
        :key="i"
        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] bg-white dark:bg-slate-700/60 ring-1 ring-slate-200 dark:ring-slate-600/40"
      >
        <span class="font-medium text-gray-700 dark:text-gray-200">{{ t.label }}</span>
        <span class="tabular-nums text-indigo-600 dark:text-indigo-400">{{ fmtNumber(t.value) }}</span>
        <span v-if="t.percent != null" class="tabular-nums text-gray-400 dark:text-slate-500">{{ t.percent }}%</span>
      </span>
    </div>

    <!-- Chart / Skeleton -->
    <div class="relative px-2 pb-2 pt-1">
      <!-- Loading skeleton -->
      <Transition name="fade">
        <div v-if="loading" class="h-52 flex items-end gap-2 px-4 py-4 animate-pulse">
          <div v-for="i in 7" :key="i"
            class="flex-1 rounded-t-lg bg-slate-700/60"
            :style="{ height: (30 + Math.random() * 70) + '%' }"
          />
        </div>
        <VChart
          v-else
          ref="chartRef"
          :option="option"
          autoresize
          class="h-56 w-full px-2c -mb-4 pt-2"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
