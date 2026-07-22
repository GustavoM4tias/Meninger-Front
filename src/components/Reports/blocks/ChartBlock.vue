<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { formatValue } from '../format.js'

echarts.use([BarChart, PieChart, LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer])

const PALETTE = ['#6366f1', '#22d3ee', '#34d399', '#f59e0b', '#f43f5e', '#a78bfa', '#fb923c', '#38bdf8', '#4ade80', '#e879f9']

const props = defineProps({
  blockType: { type: String, default: 'chart-bar' }, // chart-bar | chart-line | chart-donut
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  labels: { type: Array, default: () => [] },
  // series: [{ name, data: [] }] - multi-série; para série única pode vir só data
  series: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
  format: { type: String, default: 'number' },
  stacked: { type: Boolean, default: false },
  horizontal: { type: Boolean, default: false },
  goal: { type: Number, default: null }, // linha de meta (bar/line)
  height: { type: Number, default: 260 },
  caption: { type: String, default: '' },
})

const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
let observer
onMounted(() => {
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => observer?.disconnect())

const kind = computed(() => props.blockType.replace('chart-', ''))
const allSeries = computed(() =>
  props.series.length ? props.series : [{ name: props.title || 'Total', data: props.data }]
)
const fmt = (v) => formatValue(v, props.format)

const option = computed(() => {
  const dark = isDark.value
  const tooltip = {
    backgroundColor: dark ? '#1e293b' : '#ffffff',
    borderColor: dark ? '#334155' : '#e5e7eb',
    textStyle: { color: dark ? '#e2e8f0' : '#1f2937', fontSize: 12 },
    valueFormatter: (v) => fmt(v),
  }
  const labelClr = dark ? '#94a3b8' : '#6b7280'
  const axisClr = dark ? '#64748b' : '#9ca3af'
  const gridClr = dark ? '#1e293b' : '#f3f4f6'
  const axisLineClr = dark ? '#1e293b' : '#e5e7eb'

  if (kind.value === 'donut') {
    return {
      backgroundColor: 'transparent',
      color: PALETTE,
      tooltip: { trigger: 'item', ...tooltip },
      legend: {
        orient: 'horizontal', bottom: 0,
        textStyle: { color: labelClr, fontSize: 11 }, itemWidth: 10, itemHeight: 10,
      },
      series: [{
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '44%'],
        data: props.labels.map((l, i) => ({
          name: l ?? '-', value: allSeries.value[0]?.data?.[i] ?? 0,
          itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: 4 },
        })),
        label: { show: false },
        emphasis: { scale: true, scaleSize: 6 },
      }],
    }
  }

  const isLine = kind.value === 'line'
  const catAxis = {
    type: 'category',
    data: props.labels,
    axisLabel: { color: axisClr, fontSize: 10, interval: 0, overflow: 'truncate', width: 90, rotate: !props.horizontal && props.labels.length > 7 ? 35 : 0 },
    axisLine: { lineStyle: { color: axisLineClr } },
    axisTick: { show: false },
  }
  const valAxis = {
    type: 'value',
    axisLabel: { color: axisClr, fontSize: 10, formatter: (v) => fmt(v) },
    splitLine: { lineStyle: { color: gridClr, type: 'dashed' } },
    axisLine: { show: false },
    axisTick: { show: false },
  }

  return {
    backgroundColor: 'transparent',
    color: PALETTE,
    tooltip: { trigger: 'axis', ...tooltip },
    legend: allSeries.value.length > 1
      ? { top: 0, right: 0, textStyle: { color: labelClr, fontSize: 11 }, itemWidth: 10, itemHeight: 10 }
      : undefined,
    grid: { left: 4, right: 8, bottom: 8, top: allSeries.value.length > 1 ? 30 : 16, containLabel: true },
    xAxis: props.horizontal ? valAxis : catAxis,
    yAxis: props.horizontal ? catAxis : valAxis,
    series: allSeries.value.map((s, si) => ({
      name: s.name,
      type: isLine ? 'line' : 'bar',
      stack: props.stacked ? 'total' : undefined,
      smooth: isLine,
      symbolSize: 6,
      areaStyle: isLine && allSeries.value.length === 1
        ? { opacity: 0.12 }
        : undefined,
      data: s.data,
      barMaxWidth: 42,
      itemStyle: isLine ? undefined : { borderRadius: props.horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0], color: PALETTE[si % PALETTE.length] },
      label: allSeries.value.length === 1 && (s.data?.length ?? 0) <= 12 && !isLine
        ? { show: true, position: props.horizontal ? 'right' : 'top', color: labelClr, fontSize: 10, formatter: (p) => fmt(p.value) }
        : undefined,
      markLine: si === 0 && props.goal != null
        ? {
            symbol: 'none',
            lineStyle: { color: '#f59e0b', type: 'dashed' },
            label: { color: '#f59e0b', fontSize: 10, formatter: () => `Meta ${fmt(props.goal)}` },
            data: [props.horizontal ? { xAxis: props.goal } : { yAxis: props.goal }],
          }
        : undefined,
    })),
  }
})
</script>

<template>
  <figure class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
    <figcaption v-if="title || subtitle" class="px-4 pt-3.5 pb-1">
      <p class="text-sm font-medium text-ink">{{ title }}</p>
      <p v-if="subtitle" class="text-xs text-ink-subtle mt-0.5">{{ subtitle }}</p>
    </figcaption>
    <VChart :option="option" autoresize class="w-full px-2" :style="{ height: height + 'px' }" />
    <p v-if="caption" class="px-4 pb-3 text-xs text-ink-subtle">{{ caption }}</p>
  </figure>
</template>
