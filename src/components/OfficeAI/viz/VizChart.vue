<script setup>
/**
 * VizChart - a família de gráficos da galeria, num componente só.
 * ─────────────────────────────────────────────────────────────────────────────
 * bar · column · line · area · pie/donut · heatmap · combo · comparison
 *
 * Um arquivo de propósito: o ECharts é carregado UMA vez, e as regras que o
 * design language fixa (fábricas `t.bar/t.line/t.area/t.donut`, paleta em
 * ordem fixa, "Outros" a partir do 9º, legenda só com 2+ séries, eixo único)
 * ficam num lugar em vez de nove. O `visual` diz qual desenho; o dataset diz
 * o dado. Nenhuma cor crua: tudo via `useChartTheme`.
 *
 * Todo gráfico tem a tabela equivalente a um clique (VizFrame > trocar
 * visual > Tabela) - é a forma acessível.
 */
import { ref, computed } from 'vue';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart, HeatmapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useChartTheme } from '@/composables/useChartTheme';
import { perfilDoDataset } from './emeBlock.js';
import { formatarValor, numeroDe } from './formatos.js';

echarts.use([BarChart, PieChart, LineChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, MarkLineComponent, CanvasRenderer]);

const props = defineProps({
  dataset: { type: Object, required: true },
  visual: { type: String, default: 'bar' },
  compact: { type: Boolean, default: false },
});

const t = useChartTheme();
const chartRef = ref(null);
const MAX_CATEGORIAS = 8;   // a 9ª vira "Outros" (regra da paleta)
const MAX_BARRAS = 15;

const p = computed(() => perfilDoDataset(props.dataset));
const rows = computed(() => props.dataset.rows || []);

/* Coluna categórica (eixo), temporal (eixo do tempo) e numéricas (séries). */
const catCol = computed(() => p.value.categoricas[0] || null);
const timeCol = computed(() => p.value.temporais[0] || null);
const numCols = computed(() => {
  const declaradas = p.value.series.filter((s) => s.key).map((s) => s.key);
  const nums = p.value.numericas;
  return declaradas.length ? nums.filter((c) => declaradas.includes(c.key)).concat(nums.filter((c) => !declaradas.includes(c.key))) : nums;
});
const metaKey = computed(() => p.value.series.find((s) => s.role === 'meta' || s.role === 'target')?.key || null);
const tipoValor = computed(() => numCols.value[0]?.type || 'number');
const fmt = (v, tipo = tipoValor.value) => formatarValor(v, tipo);
const fmtCurto = (v, tipo = tipoValor.value) => formatarValor(v, tipo, { compacto: true });

const eixoKey = computed(() => (timeCol.value || catCol.value)?.key || null);
const eixoTipo = computed(() => (timeCol.value || catCol.value)?.type || 'text');
const rotuloEixo = (v) => formatarValor(v, eixoTipo.value);

/* Categorias com teto: acima de MAX, agrega o resto em "Outros" (só quando a
   soma faz sentido - percentual e valor médio não somam). */
function categoriasComTeto(max) {
  const key = eixoKey.value;
  const vk = numCols.value[0]?.key;
  const somavel = tipoValor.value !== 'percent';
  const ordenadas = [...rows.value].sort((a, b) => (numeroDe(b[vk]) ?? 0) - (numeroDe(a[vk]) ?? 0));
  if (ordenadas.length <= max || !somavel) return ordenadas.slice(0, max);
  const top = ordenadas.slice(0, max - 1);
  const resto = ordenadas.slice(max - 1);
  const outros = { [key]: `Outros (${resto.length})` };
  for (const c of numCols.value) outros[c.key] = resto.reduce((s, r) => s + (numeroDe(r[c.key]) ?? 0), 0);
  return [...top, outros];
}

const tooltipItem = (nome, valor, cor, extra = '') => `
  <div style="display:flex;align-items:center;gap:6px">
    <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${cor}"></span>
    <span style="opacity:.8">${nome}</span>
    <b style="margin-left:auto;padding-left:12px">${valor}</b>${extra ? `<span style="opacity:.6;font-size:11px">${extra}</span>` : ''}
  </div>`;

/* ── bar (horizontal) / column (vertical) / comparison (agrupadas) ─────────── */
function optionBarras(horizontal) {
  const dados = categoriasComTeto(MAX_BARRAS);
  const cats = dados.map((r) => rotuloEixo(r[eixoKey.value]));
  const series = numCols.value.slice(0, 4).map((c, i) => t.bar(i + 1, {
    name: c.label || c.key,
    data: dados.map((r) => numeroDe(r[c.key]) ?? 0),
    label: numCols.value.length === 1 && dados.length <= 12 ? {
      show: true, position: horizontal ? 'right' : 'top', color: t.inkMuted.value, fontSize: 11,
      formatter: (x) => fmtCurto(x.value, c.type),
    } : { show: false },
  }));
  const catAxis = { type: 'category', data: cats, ...t.axisCategory.value };
  const valAxis = { type: 'value', ...t.axisValue.value, axisLabel: { ...t.axisValue.value.axisLabel, formatter: (v) => fmtCurto(v) } };
  return {
    ...t.base.value,
    tooltip: {
      ...t.tooltip.value, trigger: 'axis', axisPointer: t.axisPointerBand.value,
      formatter: (ps) => `<div style="opacity:.7;font-size:11px;margin-bottom:4px">${ps[0]?.axisValue}</div>`
        + ps.map((x) => tooltipItem(x.seriesName, fmt(x.value, numCols.value[x.seriesIndex]?.type), x.color)).join(''),
    },
    legend: numCols.value.length > 1 ? t.legend.value : { show: false },
    grid: { ...t.grid.value, bottom: numCols.value.length > 1 ? 28 : (horizontal ? 4 : (cats.length > 6 ? 36 : 8)), right: horizontal ? 48 : 12 },
    xAxis: horizontal ? valAxis : { ...catAxis, axisLabel: { ...catAxis.axisLabel, rotate: cats.length > 7 ? 35 : 0, interval: 0, overflow: 'truncate', width: 84 } },
    yAxis: horizontal ? { ...catAxis, inverse: true, axisLabel: { ...catAxis.axisLabel, overflow: 'truncate', width: 120 } } : valAxis,
    series,
  };
}

/* ── line / area / combo ───────────────────────────────────────────────────── */
function optionLinha(area, combo) {
  const dados = [...rows.value].sort((a, b) => String(a[eixoKey.value]).localeCompare(String(b[eixoKey.value])));
  const cats = dados.map((r) => rotuloEixo(r[eixoKey.value]));
  const series = [];
  numCols.value.slice(0, 4).forEach((c, i) => {
    const data = dados.map((r) => numeroDe(r[c.key]) ?? 0);
    if (combo && c.key === metaKey.value) {
      series.push(t.line(i + 1, { name: c.label || 'Meta', data, lineStyle: { type: 'dashed', width: 2, color: t.color(i + 1) } }));
    } else if (combo && i === 0) {
      series.push(t.bar(i + 1, { name: c.label || c.key, data }));
    } else {
      series.push((area && i === 0 ? t.area : t.line)(i + 1, { name: c.label || c.key, data }));
    }
  });
  return {
    ...t.base.value,
    tooltip: {
      ...t.tooltip.value, trigger: 'axis',
      formatter: (ps) => `<div style="opacity:.7;font-size:11px;margin-bottom:4px">${ps[0]?.axisValue}</div>`
        + ps.map((x) => tooltipItem(x.seriesName, fmt(x.value, numCols.value[x.seriesIndex]?.type), x.color)).join(''),
    },
    legend: numCols.value.length > 1 ? t.legend.value : { show: false },
    grid: { ...t.grid.value, bottom: numCols.value.length > 1 ? 28 : 8 },
    xAxis: { type: 'category', data: cats, boundaryGap: combo, ...t.axisCategory.value },
    yAxis: { type: 'value', ...t.axisValue.value, axisLabel: { ...t.axisValue.value.axisLabel, formatter: (v) => fmtCurto(v) } },
    series,
  };
}

/* ── pie / donut ───────────────────────────────────────────────────────────── */
function optionRosca(cheia) {
  const dados = categoriasComTeto(MAX_CATEGORIAS);
  const vk = numCols.value[0]?.key;
  const total = dados.reduce((s, r) => s + (numeroDe(r[vk]) ?? 0), 0);
  return {
    ...t.base.value,
    tooltip: {
      ...t.tooltip.value, trigger: 'item',
      formatter: (x) => tooltipItem(x.name, fmt(x.value), x.color, `${x.percent}%`),
    },
    legend: { ...t.legend.value, orient: props.compact ? 'horizontal' : 'vertical', right: props.compact ? undefined : '2%', top: props.compact ? undefined : 'center', left: props.compact ? 'center' : undefined, bottom: props.compact ? 0 : undefined },
    series: [t.donut({
      radius: cheia ? ['0%', '72%'] : ['52%', '76%'],
      center: props.compact ? ['50%', '44%'] : ['36%', '50%'],
      data: dados.map((r) => ({ name: rotuloEixo(r[eixoKey.value]), value: numeroDe(r[vk]) ?? 0 })),
      centerLabel: cheia ? undefined : () => fmtCurto(total),
    })],
  };
}

/* ── heatmap: linhas = categoria, colunas = período ────────────────────────── */
function optionHeatmap() {
  const tk = timeCol.value?.key, ck = catCol.value?.key, vk = numCols.value[0]?.key;
  const periodos = [...new Set(rows.value.map((r) => r[tk]))].sort();
  const cats = [...new Set(rows.value.map((r) => r[ck]))];
  const data = rows.value.map((r) => [periodos.indexOf(r[tk]), cats.indexOf(r[ck]), numeroDe(r[vk]) ?? 0]);
  const max = Math.max(...data.map((d) => d[2]), 1);
  return {
    ...t.base.value,
    tooltip: { ...t.tooltip.value, trigger: 'item', formatter: (x) => `<b>${cats[x.value[1]]}</b> · ${rotuloEixo(periodos[x.value[0]])}<br/>${fmt(x.value[2])}` },
    grid: { ...t.grid.value, top: 8, bottom: 40, right: 12 },
    xAxis: { type: 'category', data: periodos.map(rotuloEixo), ...t.axisCategory.value, splitArea: { show: false } },
    yAxis: { type: 'category', data: cats, ...t.axisCategory.value, axisLabel: { ...t.axisCategory.value.axisLabel, overflow: 'truncate', width: 110 } },
    visualMap: {
      min: 0, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
      itemWidth: 10, itemHeight: 90, textStyle: { color: t.inkSubtle.value, fontSize: 11 },
      inRange: { color: [t.token('--surface-sunken'), t.fill(1), t.color(1)] },
      formatter: (v) => fmtCurto(v),
    },
    series: [{
      type: 'heatmap', data,
      label: { show: cats.length * periodos.length <= 60, color: t.ink.value, fontSize: 11, formatter: (x) => fmtCurto(x.value[2]) },
      itemStyle: { borderColor: t.token('--surface-raised'), borderWidth: 2, borderRadius: 4 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(15,23,42,.18)' } },
    }],
  };
}

const option = computed(() => {
  if (!eixoKey.value || !numCols.value.length) return { ...t.base.value };
  switch (props.visual) {
    case 'column': return optionBarras(false);
    case 'comparison': return optionBarras(false);
    case 'line': return optionLinha(false, false);
    case 'area': return optionLinha(true, false);
    case 'combo': return optionLinha(false, true);
    case 'pie': return optionRosca(true);
    case 'donut': return optionRosca(false);
    case 'heatmap': return timeCol.value && catCol.value ? optionHeatmap() : optionBarras(true);
    default: return optionBarras(true);
  }
});

/* Altura pela forma: barras horizontais crescem com as linhas; o resto é fixo. */
const altura = computed(() => {
  if (props.visual === 'bar' || (props.visual === 'heatmap' && catCol.value)) {
    const n = Math.min(props.visual === 'bar' ? Math.min(rows.value.length, MAX_BARRAS) : new Set(rows.value.map((r) => r[catCol.value.key])).size, 20);
    return `${Math.max(220, 40 + n * 28)}px`;
  }
  return props.compact ? '240px' : '280px';
});

const copiado = ref(false);
async function copiarImagem() {
  const inst = chartRef.value?.chart;
  if (!inst) return;
  const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: t.token('--surface') });
  try {
    const blob = await (await fetch(url)).blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    copiado.value = true;
    setTimeout(() => { copiado.value = false; }, 1800);
  } catch {
    const a = document.createElement('a'); a.href = url; a.download = 'grafico.png'; a.click();
  }
}
defineExpose({ copiarImagem, copiado });
</script>

<template>
  <div class="px-2 pb-2 pt-1">
    <VChart ref="chartRef" :option="option" autoresize class="w-full" :style="{ height: altura }" />
  </div>
</template>
