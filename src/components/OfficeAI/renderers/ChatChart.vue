<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useChartTheme } from '@/composables/useChartTheme'

echarts.use([
  BarChart, PieChart, LineChart,
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent,
  CanvasRenderer,
])


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
const t = useChartTheme()
const isDark = t.isDark

const canToggle = computed(() =>
  props.labels.length > 0 && props.labels.length <= 12
)

onMounted(() => {
  if (loading.value) setTimeout(() => { loading.value = false }, 300)
})

const option = computed(() => {
  if (activeType.value === 'pie') {
    return {
      ...t.base.value,
      color: t.fillPalette.value,
      tooltip: {
        ...t.tooltip.value,
        trigger: 'item',
        formatter: (p) => `
          <div class="flex items-center gap-2">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <b>${p.name}</b>: ${Number(p.value).toLocaleString('pt-BR')}
            <span style="opacity:.7">(${p.percent}%)</span>
          </div>`,
      },
      legend: {
        ...t.legend.value,
        orient: 'vertical', right: '2%', top: 'center', left: undefined,
      },
      series: [{
        ...t.donut(),
        radius: ['38%', '68%'],
        center: ['40%', '50%'],
        data: props.labels.map((l, i) => ({
          name: l ?? '—',
          value: props.data[i] ?? 0,
          itemStyle: { color: t.fillPalette.value[i % 8] },
        })),
        label: { show: false },
      }],
    }
  }

  // Bar
  const max = Math.max(...props.data, 0)
  return {
    ...t.base.value,
    tooltip: {
      ...t.tooltip.value,
      trigger: 'axis',
      axisPointer: t.axisPointerBand.value,
      formatter: (params) => {
        const p = params[0]
        const pct = max ? ((p.value / max) * 100).toFixed(0) : 0
        return `<div style="padding:2px 0">
          <div style="opacity:.7;font-size:11px;margin-bottom:4px">${p.axisValue}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.color}"></span>
            <b style="font-size:14px">${Number(p.value).toLocaleString('pt-BR')}</b>
            <span style="opacity:.7;font-size:11px">${pct}% do maior</span>
          </div>
        </div>`
      },
    },
    grid: { ...t.grid.value, bottom: props.labels.length > 6 ? 36 : 12, top: 16 },
    xAxis: {
      type: 'category',
      data: props.labels,
      ...t.axisCategory.value,
      axisLabel: {
        ...t.axisCategory.value.axisLabel,
        rotate: props.labels.length > 7 ? 35 : 0,
        interval: 0, overflow: 'truncate', width: 80,
      },
    },
    yAxis: { type: 'value', ...t.axisValue.value },
    // UMA série, UMA cor. Antes cada barra saía de um matiz diferente da
    // paleta: além de encher a tela de cor, isso diz "são dez medidas" quando
    // é uma medida só, em dez categorias. A categoria já está no eixo X.
    series: [
      t.bar(1, {
        data: props.data,
        barMaxWidth: 48,
        barMinWidth: 12,
        label: {
          show: props.data.length <= 12,
          position: 'top',
          color: t.inkMuted.value,
          fontSize: 10,
          formatter: (p) => Number(p.value).toLocaleString('pt-BR'),
        },
      }),
    ],
  }
})

async function copyImage() {
  const instance = chartRef.value?.chart
  if (!instance) return
  const bg = t.token('--surface')   // o PNG sai com o fundo do tema atual
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
  <div class="rounded-2xl overflow-hidden bg-surface-raised mt-2 shadow">
    <!-- Header -->
    <div class="px-4 py-3 bg-slate-300/20 bg-surface-sunken flex items-center justify-between gap-2 border-b border-white/5">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-1.5 h-5 rounded-full bg-accent flex-shrink-0" />
        <div class="min-w-0">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-medium text-ink truncate">{{ title || 'Gráfico' }}</span>
            <span v-if="total != null" class="text-xs text-accent font-semibold tabular-nums whitespace-nowrap">
              Total: {{ fmtNumber(total) }}
            </span>
          </div>
          <p v-if="subtitle" class="text-micro text-ink-muted truncate mt-0.5">{{ subtitle }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <!-- Toggle bar/pie -->
        <div v-if="canToggle" class="flex bg-surface-raised hover:bg-surface-sunken shadow-sm hover:shadow rounded-lg p-0.5 mr-1">
          <button
            @click="activeType = 'bar'"
            class="px-2 py-0.5 rounded-md text-xs transition"
            :class="activeType === 'bar' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink-subtle dark:hover:text-ink'"
          >
            <i class="fas fa-chart-bar" />
          </button>
          <button
            @click="activeType = 'pie'"
            class="px-2 py-0.5 rounded-md text-xs transition"
            :class="activeType === 'pie' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink-subtle dark:hover:text-ink'"
          >
            <i class="fas fa-chart-pie" />
          </button>
        </div>

        <button
          @click="copyImage"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-sm hover:shadow duration-300 bg-surface-raised hover:bg-surface-sunken text-ink-muted hover:text-ink-subtle dark:hover:text-ink text-xs transition"
          title="Copiar imagem para a área de transferência"
        >
          <i :class="copied ? 'fas fa-check text-data-pos' : 'far fa-copy'" />
          <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
        </button>
        <button
          @click="downloadCSV"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-sm hover:shadow duration-300 bg-data-pos/10 hover:bg-data-pos/10/85 text-data-pos hover:text-data-pos     text-xs transition"
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
      class="px-4 py-2 flex flex-wrap gap-1.5 border-b border-white/5 bg-surface-sunken"
    >
      <span
        v-for="(t, i) in topBreakdown"
        :key="i"
        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro bg-surface-sunken ring-1 ring-slate-200 dark:ring-slate-600/40"
      >
        <span class="font-medium text-ink">{{ t.label }}</span>
        <span class="tabular-nums text-accent">{{ fmtNumber(t.value) }}</span>
        <span v-if="t.percent != null" class="tabular-nums text-ink-subtle">{{ t.percent }}%</span>
      </span>
    </div>

    <!-- Chart / Skeleton -->
    <div class="relative px-2 pb-2 pt-1">
      <!-- Loading skeleton -->
      <Transition name="fade">
        <div v-if="loading" class="h-52 flex items-end gap-2 px-4 py-4 animate-pulse">
          <div v-for="i in 7" :key="i"
            class="flex-1 rounded-t-lg bg-surface-sunken"
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
