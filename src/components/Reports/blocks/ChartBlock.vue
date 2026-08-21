<script setup>
import { computed, inject } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { formatValue } from '../format.js'
import { themePalette, seriesColor, seriesFill } from '../themes.js'
import { inlineMd } from '../mdInline.js'
import BlockEmpty from './BlockEmpty.vue'
import { useChartTheme } from '@/composables/useChartTheme'

echarts.use([BarChart, PieChart, LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer])

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
  // Relatório interativo (injetados pelo ReportRenderer): clicar num item
  // abre a lista dos registros por trás dele
  blockId: { type: String, default: null },
  clickable: { type: Boolean, default: false },
})

// Canal de drill do renderer (null fora do modo interativo)
const reportDrill = inject('reportDrill', null)
function onChartClick(params) {
  if (!props.clickable || !reportDrill || !params?.name) return
  reportDrill({ kind: 'category', blockId: props.blockId, label: String(params.name) })
}

// Tema injetado pelo ReportRenderer (fallback: clássico, se usado solto)
const reportTheme = inject('reportTheme', computed(() => 'classic'))

const t = useChartTheme()
const isDark = t.isDark

// Paleta do tema, trocando para as variantes claras no dark mode.
const PALETTE = computed(() => themePalette(reportTheme.value, isDark.value))
// A mesma paleta um passo adiante, para o que preenche (ver seriesFill).
const FILLS = computed(() => themePalette(reportTheme.value, !isDark.value))

// Cor de cada série: `tone` semântico ('success'/'danger'/...) tem prioridade
// sobre a paleta do tema. É o que permite a cor carregar INTENÇÃO — verde para
// quem pagou antes do vencimento, vermelho para quem pagou depois — em vez de
// só diferenciar séries entre si.
// Cor de PREENCHIMENTO (barra, fatia). Ver `seriesFill` em themes.js: é o
// passo vizinho da mesma matiz, e é o que tira o peso do tema claro.
const seriesFills = computed(() =>
  allSeries.value.map((s, i) => seriesFill({
    tone: s.tone,
    index: i,
    themeKey: reportTheme.value,
    dark: isDark.value,
  }))
)

const seriesColors = computed(() =>
  allSeries.value.map((s, i) => seriesColor({
    tone: s.tone,
    index: i,
    themeKey: reportTheme.value,
    dark: isDark.value,
  }))
)
const kind = computed(() => props.blockType.replace('chart-', ''))
const allSeries = computed(() =>
  props.series.length ? props.series : [{ name: props.title || 'Total', data: props.data }]
)
const fmt = (v) => formatValue(v, props.format)

const captionHtml = computed(() => inlineMd(props.caption))
// Grafico sem categoria ou sem nenhum ponto renderizava uma moldura com area
// cinza no meio do relatorio - o classico 'componente vazio'.
const semDados = computed(() => {
  if (!props.labels.length) return true
  return !allSeries.value.some((s) => (s?.data || []).some((v) => v !== null && v !== undefined && v !== ''))
})

const option = computed(() => {
  // Tooltip, eixo e grade seguem o design system (o tema do relatório manda na
  // COR DOS DADOS, não no cromo). Antes a grade saía quase preta no claro.
  const tooltip = { ...t.tooltip.value, valueFormatter: (v) => fmt(v) }
  const labelClr = t.inkMuted.value
  const axisClr = t.inkSubtle.value

  if (kind.value === 'donut') {
    return {
      backgroundColor: 'transparent',
      color: FILLS.value,
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
          itemStyle: { color: FILLS.value[i % FILLS.value.length], borderRadius: 4 },
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
    ...t.axisCategory.value,
    axisLabel: { ...t.axisCategory.value.axisLabel, interval: 0, overflow: 'truncate', width: 90, rotate: !props.horizontal && props.labels.length > 7 ? 35 : 0 },
  }
  const valAxis = {
    type: 'value',
    ...t.axisValue.value,
    axisLabel: { ...t.axisValue.value.axisLabel, formatter: (v) => fmt(v) },
  }

  // Em barra empilhada por faixa (uma série por categoria, zeros no resto), o
  // tooltip padrão listava TODAS as séries — inclusive as zeradas. Aqui só
  // entram as que têm valor naquele ponto.
  const axisTooltip = {
    trigger: 'axis',
    ...tooltip,
    formatter: (params) => {
      const arr = Array.isArray(params) ? params : [params]
      const vivos = arr.filter((p) => Number(p.value) > 0)
      const linhas = (vivos.length ? vivos : arr)
        .map((p) => `${p.marker} ${p.seriesName}: <b>${fmt(p.value)}</b>`)
        .join('<br/>')
      return `${arr[0]?.axisValueLabel ?? ''}<br/>${linhas}`
    },
  }

  return {
    backgroundColor: 'transparent',
    color: PALETTE.value,
    tooltip: axisTooltip,
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
      // Linha é marca (traço fino, tom forte); barra é área (tom vizinho).
      itemStyle: isLine
        ? { color: seriesColors.value[si] }
        : { borderRadius: props.horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0], color: seriesFills.value[si] },
      emphasis: isLine ? undefined : { focus: 'series', itemStyle: { color: seriesColors.value[si] } },
      lineStyle: isLine ? { color: seriesColors.value[si] } : undefined,
      label: allSeries.value.length === 1 && (s.data?.length ?? 0) <= 12 && !isLine
        ? { show: true, position: props.horizontal ? 'right' : 'top', color: labelClr, fontSize: 10, formatter: (p) => fmt(p.value) }
        : undefined,
      markLine: si === 0 && props.goal != null
        ? {
            symbol: 'none',
            lineStyle: { color: t.warn.value, type: 'dashed' },
            label: { color: t.warn.value, fontSize: 10, formatter: () => `Meta ${fmt(props.goal)}` },
            data: [props.horizontal ? { xAxis: props.goal } : { yAxis: props.goal }],
          }
        : undefined,
    })),
  }
})
</script>

<template>
  <BlockEmpty
    v-if="semDados"
    :label="title || 'Gráfico'"
    hint="A consulta não retornou séries para este recorte."
    icon="fas fa-chart-column"
  />
  <figure v-else class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
    <figcaption v-if="title || subtitle" class="px-4 pt-3.5 pb-1">
      <p class="text-sm font-medium text-ink">{{ title }}</p>
      <p v-if="subtitle" class="text-xs text-ink-subtle mt-0.5">{{ subtitle }}</p>
    </figcaption>
    <VChart :option="option" autoresize class="w-full px-2" :style="{ height: height + 'px' }" @click="onChartClick" />
    <p v-if="captionHtml" class="px-4 pb-3 text-xs text-ink-subtle" v-html="captionHtml" />
    <p v-if="clickable" class="px-4 pb-3 -mt-1 text-micro text-ink-subtle flex items-center gap-1">
      <i class="fas fa-hand-pointer" aria-hidden="true" />Toque num item para ver os registros
    </p>
  </figure>
</template>
