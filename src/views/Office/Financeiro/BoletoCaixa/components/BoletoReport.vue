<script setup>
// Relatório de evolução dos boletos pagos (visão geral, não só a lista).
// Série temporal por mês/dia: valor pago por período (barras) + valor emitido
// como comparação + quantidade de pagos (linha no eixo secundário).
import { ref, computed, onMounted } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';

import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  TooltipComponent, LegendComponent, GridComponent, DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import Surface from '@/components/UI/Surface.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

echarts.use([
  BarChart, LineChart,
  TooltipComponent, LegendComponent, GridComponent, DataZoomComponent,
  CanvasRenderer,
]);

const store = useBoletoStore();

// ── Datas ────────────────────────────────────────────────────────────────────
function toIsoDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const today = new Date();
const oneYearAgo = new Date();
oneYearAgo.setFullYear(today.getFullYear() - 1);

const filters = ref({
  granularity: 'month',
  dateFrom: toIsoDateLocal(oneYearAgo),
  dateTo: toIsoDateLocal(today),
  empreendimento: [],
});

const GRANULARITY_OPTIONS = [
  { value: 'month', label: 'Mês' },
  { value: 'day',   label: 'Dia' },
];

const empreendimentosOptions = computed(() =>
  (store.facets?.empreendimentos || []).map(e => e.name)
);

// ── Carga ────────────────────────────────────────────────────────────────────
function apply() {
  store.fetchTimeseries({ ...filters.value });
}

onMounted(async () => {
  if (!store.facets?.empreendimentos?.length) await store.fetchFacets();
  apply();
});

// ── Formatação ───────────────────────────────────────────────────────────────
const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function formatCurrency(v) { return moneyFmt.format(Number(v) || 0); }

function localDate(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function periodLabel(period) {
  // 'YYYY-MM' (mês) ou 'YYYY-MM-DD' (dia)
  if (filters.value.granularity === 'day') {
    try { return localDate(period).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
    catch { return period; }
  }
  try {
    return localDate(`${period}-01`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  } catch { return period; }
}

// ── KPIs ─────────────────────────────────────────────────────────────────────
const totals = computed(() => store.timeseries?.totals || null);
const kpiCards = computed(() => {
  const t = totals.value;
  if (!t) return [];
  const ticket = t.pagos_qty > 0 ? t.pagos_valor / t.pagos_qty : 0;
  const conv = t.emitidos_qty > 0 ? (t.pagos_qty / t.emitidos_qty) * 100 : 0;
  return [
    {
      label: 'Total pago', value: formatCurrency(t.pagos_valor),
      sub: `${t.pagos_qty} boleto${t.pagos_qty === 1 ? '' : 's'}`,
      icon: 'fas fa-sack-dollar',
      iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      label: 'Ticket médio', value: formatCurrency(ticket),
      sub: 'por boleto pago',
      icon: 'fas fa-receipt',
      iconClass: 'bg-accent-soft text-accent border-accent/20',
    },
    {
      label: 'Total emitido', value: formatCurrency(t.emitidos_valor),
      sub: `${t.emitidos_qty} boleto${t.emitidos_qty === 1 ? '' : 's'}`,
      icon: 'fas fa-barcode',
      iconClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      label: 'Conversão', value: `${conv.toFixed(1)}%`,
      sub: 'pagos / emitidos no período',
      icon: 'fas fa-arrow-trend-up',
      iconClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
  ];
});

// ── Opção do gráfico ─────────────────────────────────────────────────────────
const hasData = computed(() => (store.timeseries?.periods || []).length > 0);

const option = computed(() => {
  const periods = store.timeseries?.periods || [];
  const labels = periods.map(p => periodLabel(p.period));
  const pagoValor = periods.map(p => Number(p.pagos_valor) || 0);
  const emitidoValor = periods.map(p => Number(p.emitidos_valor) || 0);
  const pagoQty = periods.map(p => Number(p.pagos_qty) || 0);

  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'inherit' },
    legend: {
      top: 4,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 12, itemHeight: 8,
      data: ['Valor pago', 'Valor emitido', 'Qtd pagos'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9', fontSize: 12 },
      formatter(params) {
        if (!params?.length) return '';
        const lines = [`<b>${params[0].axisValue}</b>`];
        for (const p of params) {
          const isMoney = p.seriesName !== 'Qtd pagos';
          const val = isMoney ? formatCurrency(p.value) : new Intl.NumberFormat('pt-BR').format(p.value);
          lines.push(`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: <b>${val}</b>`);
        }
        return lines.join('<br>');
      },
    },
    grid: { left: 56, right: 48, top: 40, bottom: periods.length > 14 ? 52 : 34 },
    dataZoom: periods.length > 14
      ? [{ type: 'slider', height: 16, bottom: 12, start: 0, end: 100 }]
      : [],
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: '#94a3b8', fontSize: 10, hideOverlap: true },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: [
      {
        type: 'value', name: 'R$', position: 'left',
        nameTextStyle: { color: '#34d399', fontSize: 10 },
        axisLabel: {
          color: '#94a3b8', fontSize: 10,
          formatter: v => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`,
        },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
      },
      {
        type: 'value', name: 'Qtd', position: 'right',
        nameTextStyle: { color: '#a78bfa', fontSize: 10 },
        minInterval: 1,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Valor pago', type: 'bar', yAxisIndex: 0, data: pagoValor,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#34d399' },
            { offset: 1, color: '#059669' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 28,
      },
      {
        name: 'Valor emitido', type: 'bar', yAxisIndex: 0, data: emitidoValor,
        itemStyle: { color: 'rgba(96, 165, 250, 0.35)', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 28,
      },
      {
        name: 'Qtd pagos', type: 'line', yAxisIndex: 1, data: pagoQty,
        smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#a78bfa', width: 2 },
        itemStyle: { color: '#a78bfa' },
      },
    ],
  };
});
</script>

<template>
  <div class="space-y-4">
    <!-- Filtros do relatório -->
    <Surface variant="raised" padding="md" class="surface-gradient">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-layer-group text-[10px] mr-1 text-ink-subtle"></i>Agrupar por
          </label>
          <div class="inline-flex rounded-lg border border-line bg-surface-sunken p-0.5 w-full">
            <button v-for="opt in GRANULARITY_OPTIONS" :key="opt.value" type="button"
              @click="filters.granularity = opt.value"
              class="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              :class="filters.granularity === opt.value
                ? 'bg-accent text-white shadow-sm'
                : 'text-ink-muted hover:text-ink'">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <Input v-model="filters.dateFrom" type="date" label="De" />
        <Input v-model="filters.dateTo" type="date" label="Até" />

        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
          </label>
          <MultiSelector :model-value="filters.empreendimento"
            @update:modelValue="v => filters.empreendimento = Array.isArray(v) ? v : []"
            :options="empreendimentosOptions" placeholder="Todos"
            :page-size="200" :select-all="true" />
        </div>
      </div>

      <div class="flex justify-end mt-3">
        <Button size="sm" icon="fas fa-magnifying-glass" @click="apply">Atualizar</Button>
      </div>
    </Surface>

    <!-- KPIs -->
    <div v-if="totals" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Surface v-for="kpi in kpiCards" :key="kpi.label"
        variant="raised" padding="sm" class="surface-gradient">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">{{ kpi.label }}</p>
            <p class="mt-1 text-xl font-semibold text-ink tabular-nums leading-tight truncate" :title="kpi.value">
              {{ kpi.value }}
            </p>
            <p class="mt-0.5 text-[11px] text-ink-muted truncate">{{ kpi.sub }}</p>
          </div>
          <div class="h-8 w-8 rounded-lg grid place-items-center border shrink-0" :class="kpi.iconClass">
            <i :class="kpi.icon" class="text-xs"></i>
          </div>
        </div>
      </Surface>
    </div>

    <!-- Gráfico -->
    <Surface variant="raised" padding="md" class="surface-gradient">
      <div class="flex items-center gap-2 mb-2">
        <i class="fas fa-chart-line text-accent"></i>
        <h2 class="font-semibold text-ink text-sm">Evolução dos boletos pagos</h2>
      </div>

      <div v-if="store.timeseriesLoading" class="flex items-center justify-center py-16 text-ink-muted">
        <i class="fas fa-spinner fa-spin text-2xl mr-3"></i>
        <span>Carregando relatório...</span>
      </div>

      <div v-else-if="store.timeseriesError"
        class="py-10 text-center text-sm text-red-600 dark:text-red-400">
        <i class="fas fa-circle-exclamation mr-1"></i>{{ store.timeseriesError }}
      </div>

      <VChart v-else-if="hasData" :option="option" class="w-full" style="height: 360px" autoresize />

      <EmptyState v-else icon="fas fa-chart-line" title="Sem dados no período"
        description="Nenhum boleto pago ou emitido dentro do intervalo selecionado." />
    </Surface>
  </div>
</template>
