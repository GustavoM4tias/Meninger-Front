<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useDistratosStore } from '@/stores/Comercial/Distratos/distratosStore';

import Favorite from '@/components/config/Favorite.vue';
import ChartActions from '@/components/config/ChartActions.vue';
import DistratoFilters from './components/DistratoFilters.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Input from '@/components/UI/Input.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Badge from '@/components/UI/Badge.vue';

import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import {
  TooltipComponent, LegendComponent, GridComponent,
  DataZoomComponent, MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart, BarChart, PieChart,
  TooltipComponent, LegendComponent, GridComponent,
  DataZoomComponent, MarkLineComponent,
  CanvasRenderer,
]);

const store = useDistratosStore();

async function handleFilterChange() { await store.fetchDistratos(); }

onMounted(async () => { await store.fetchDistratos(); });

// ── Tema reativo ─────────────────────────────────────
const isDark = computed(() => document.documentElement.classList.contains('dark'));
const txt = computed(() => isDark.value ? '#E2E8F0' : '#0F172A');
const sub_c = computed(() => isDark.value ? '#94A3B8' : '#64748B');
const dim_c = computed(() => isDark.value ? '#334155' : '#E2E8F0');
const surface = computed(() => isDark.value ? '#0F172A' : '#FFFFFF');

const TT = computed(() =>
  isDark.value
    ? `background:rgba(2,6,23,0.96);border:1px solid rgba(239,68,68,0.25);border-radius:12px;font-size:12px;color:#E2E8F0;box-shadow:0 8px 32px rgba(0,0,0,0.5);padding:10px 14px;max-width:250px;white-space:normal;`
    : `background:rgba(255,255,255,0.98);border:1px solid rgba(239,68,68,0.2);border-radius:12px;font-size:12px;color:#0F172A;box-shadow:0 8px 32px rgba(15,23,42,0.12);padding:10px 14px;max-width:250px;white-space:normal;`
);

const palette = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
  '#A855F7', '#EC4899', '#14B8A6', '#6366F1', '#84CC16',
];

// ── Formatters ─────────────────────────────────────────
const brlFull = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlShort = (v) => {
  if (!v) return 'R$ —';
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return brlFull.format(v);
};
const fmtCurrency = (v) => v ? brlFull.format(v) : 'R$ —';
const fmtDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

// ── KPIs ──────────────────────────────────────────────
const kpiCards = computed(() => {
  const k = store.kpis;
  const comValor = store.tableRows.filter(r => r.cancelAmount > 0).length;
  const semValor = store.tableRows.filter(r => !r.cancelAmount).length;
  const pctVgv = k.totalOriginal > 0
    ? ((k.totalAmount / k.totalOriginal) * 100).toFixed(1) + '%'
    : '—';

  return [
    {
      label: 'Total distratos',
      value: k.total.toLocaleString('pt-BR'),
      sub: 'rescisões no período',
      icon: 'fas fa-file-circle-xmark',
      accent: 'text-red-500 bg-red-500/10',
    },
    {
      label: 'VGV cancelado',
      value: brlShort(k.totalOriginal),
      sub: 'valor original dos contratos',
      icon: 'fas fa-building-circle-xmark',
      accent: 'text-orange-500 bg-orange-500/10',
    },
    {
      label: 'Valor rescisão',
      value: brlShort(k.totalAmount),
      sub: `${pctVgv} do VGV · ${comValor} c/ valor`,
      icon: 'fas fa-money-bill-wave',
      accent: 'text-yellow-500 bg-yellow-500/10',
      tooltip: 'Soma de valor devolvido + a devolver (totalCancellationAmount do Sienge)',
    },
    {
      label: 'Ticket médio',
      value: brlShort(k.avgAmount),
      sub: 'rescisão média por contrato',
      icon: 'fas fa-receipt',
      accent: 'text-purple-500 bg-purple-500/10',
    },
    {
      label: 'Sem valor',
      value: semValor,
      sub: semValor > 0
        ? `${semValor} aguardando definição`
        : 'todos com valor definido',
      icon: semValor > 0 ? 'fas fa-hourglass-half' : 'fas fa-circle-check',
      accent: semValor > 0 ? 'text-indigo-500 bg-indigo-500/10' : 'text-emerald-500 bg-emerald-500/10',
    },
  ];
});

// ── Charts ─────────────────────────────────────────────
const optionTrend = computed(() => {
  const { labels, counts } = store.byMonth;
  const avg = counts.length ? Math.round(counts.reduce((s, v) => s + v, 0) / counts.length) : 0;
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', confine: true, appendToBody: true, extraCssText: TT.value,
      formatter: ps => `<span style="color:${sub_c.value}">${ps[0].name}</span><br/>` +
        `<span style="color:#EF4444;font-weight:600;font-size:14px">${ps[0].value}</span> distrato${ps[0].value !== 1 ? 's' : ''}`,
    },
    grid: { left: 8, right: 16, top: 12, bottom: labels.length > 10 ? 52 : 32, containLabel: true },
    dataZoom: labels.length > 14
      ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 6, borderColor: 'transparent', fillerColor: 'rgba(239,68,68,0.15)', handleStyle: { color: '#EF4444' }, textStyle: { color: sub_c.value } }]
      : [],
    xAxis: {
      type: 'category', data: labels, boundaryGap: false,
      axisLabel: { color: sub_c.value, fontSize: 11, rotate: labels.length > 10 ? 30 : 0 },
      axisLine: { lineStyle: { color: dim_c.value } }, axisTick: { show: false }, splitLine: { show: false },
    },
    yAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: sub_c.value, fontSize: 11 },
      splitLine: { lineStyle: { color: dim_c.value, type: 'dashed' } }, axisLine: { show: false },
    },
    series: [{
      name: 'Distratos', type: 'line', smooth: 0.4,
      symbolSize: 6, symbol: 'circle',
      data: counts,
      lineStyle: { color: '#EF4444', width: 2.5, shadowColor: 'rgba(239,68,68,0.4)', shadowBlur: 8 },
      itemStyle: { color: '#EF4444', borderWidth: 2, borderColor: surface.value },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(239,68,68,0.3)' }, { offset: 1, color: 'rgba(239,68,68,0.01)' }] } },
      markLine: avg > 0
        ? { silent: true, lineStyle: { color: 'rgba(239,68,68,0.45)', type: 'dashed', width: 1.5 }, data: [{ type: 'average', label: { color: sub_c.value, fontSize: 10, formatter: `μ ${avg}` } }] }
        : undefined,
    }],
  };
});

const allUnknownReasons = computed(() =>
  store.byReason.length === 0 || store.byReason.every(r => r.name === 'Motivo não informado')
);

const optionReasons = computed(() => {
  const data = store.byReason.filter(r => r.name !== 'Motivo não informado').slice(0, 10);
  const total = data.reduce((s, d) => s + d.count, 0) + (store.byReason.find(r => r.name === 'Motivo não informado')?.count || 0);
  const full = [...data];
  const unknown = store.byReason.find(r => r.name === 'Motivo não informado');
  if (unknown && unknown.count > 0) full.push(unknown);
  return {
    backgroundColor: 'transparent',
    color: palette,
    tooltip: {
      trigger: 'item', confine: true, appendToBody: true, extraCssText: TT.value,
      formatter: p => `<b>${p.name}</b><br/>${p.value} distrato${p.value !== 1 ? 's' : ''} · <span style="color:${sub_c.value}">${total ? ((p.value / total) * 100).toFixed(1) : 0}%</span>`,
    },
    legend: {
      type: 'scroll', orient: 'vertical', left: 4, top: 'middle', width: 150,
      textStyle: { color: sub_c.value, fontSize: 10, width: 160, overflow: 'truncate' },
      icon: 'circle', itemWidth: 7, itemHeight: 7, itemGap: 6,
    },
    graphic: [
      { type: 'text', left: '68%', top: '44%', style: { text: `${total}`, fill: txt.value, fontSize: 18, fontWeight: 'bold', textAlign: 'center' } },
      { type: 'text', left: '68%', top: '58%', style: { text: 'distratos', fill: sub_c.value, fontSize: 10, textAlign: 'center' } },
    ],
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['68%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 8, fontWeight: 'bold', color: txt.value } },
      itemStyle: { borderRadius: 6, borderColor: surface.value, borderWidth: 2 },
      data: full.map(d => ({ name: d.name, value: d.count })),
    }],
  };
});

const optionEntCount = computed(() => {
  const data = store.byEnterprise.slice(0, 20);
  const reversed = data.slice().reverse();
  const names = reversed.map(e => e.name.length > 32 ? e.name.slice(0, 32) + '…' : e.name);
  const avgCount = data.length ? data.reduce((s, e) => s + e.count, 0) / data.length : 0;
  const alertNames = new Set(store.kpis.alerts.map(a => a.name));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', confine: true, appendToBody: true, extraCssText: TT.value, axisPointer: { type: 'shadow' },
      formatter: ps => {
        const ent = reversed[ps[0].dataIndex];
        return `<b>${ent?.name}</b><br/>` +
          `<span style="color:#EF4444;font-weight:600">${ps[0].value}</span> distrato${ps[0].value !== 1 ? 's' : ''}<br/>` +
          `Valor rescisão: ${brlShort(ent?.amount)}`;
      },
    },
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, axisLabel: { color: sub_c.value, fontSize: 10 }, splitLine: { lineStyle: { color: dim_c.value, type: 'dashed' } }, axisLine: { show: false } },
    yAxis: { type: 'category', data: names, axisLabel: { color: sub_c.value, fontSize: 10 }, axisTick: { show: false } },
    series: [{
      type: 'bar', barMaxWidth: 22,
      data: reversed.map(e => e.count),
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: (p) => alertNames.has(reversed[p.dataIndex]?.name) ? '#F59E0B' : '#EF4444',
      },
      markLine: avgCount > 0
        ? { silent: true, lineStyle: { color: 'rgba(239,68,68,0.5)', type: 'dashed' }, data: [{ xAxis: avgCount, label: { color: sub_c.value, fontSize: 10, formatter: `μ ${avgCount.toFixed(1)}` } }] }
        : undefined,
    }],
  };
});

const noAmounts = computed(() => store.byEnterprise.every(e => e.avgAmount === 0));

const optionEntAvg = computed(() => {
  const data = store.byEnterprise.filter(e => e.avgAmount > 0).slice(0, 10);
  const names = data.map(e => e.name.length > 22 ? e.name.slice(0, 22) + '…' : e.name);
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', confine: true, appendToBody: true, extraCssText: TT.value, axisPointer: { type: 'shadow' },
      formatter: ps => {
        const ent = data[ps[0].dataIndex];
        return `<b>${ent?.name}</b><br/>` +
          `Média: <span style="color:#F97316;font-weight:600">${fmtCurrency(ent?.avgAmount)}</span><br/>` +
          `Total rescisão: ${fmtCurrency(ent?.amount)}<br/>` +
          `VGV original: ${fmtCurrency(ent?.originalTotal)}`;
      },
    },
    grid: { left: 8, right: 16, top: 12, bottom: names.length > 5 ? 48 : 32, containLabel: true },
    xAxis: {
      type: 'category', data: names,
      axisLabel: { color: sub_c.value, fontSize: 10, rotate: names.length > 5 ? 25 : 0, interval: 0 },
      axisLine: { lineStyle: { color: dim_c.value } }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: sub_c.value, fontSize: 10,
        formatter: v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : v,
      },
      splitLine: { lineStyle: { color: dim_c.value, type: 'dashed' } }, axisLine: { show: false },
    },
    series: [{
      type: 'bar', barMaxWidth: 36,
      data: data.map(e => e.avgAmount),
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#F97316' }, { offset: 1, color: 'rgba(249,115,22,0.25)' }] },
      },
      label: {
        show: data.length <= 6,
        position: 'top',
        color: sub_c.value, fontSize: 9,
        formatter: p => brlShort(p.value),
      },
    }],
  };
});

// ── Tabela ────────────────────────────────────────────
const TABLE_LIMIT = 15;
const tableSearch = ref('');
const tablePage = ref(1);
const sortCol = ref('cancelDate');
const sortAsc = ref(false);

const tableCols = [
  { key: 'number',                  label: 'Nº Contrato' },
  { key: 'enterprise',              label: 'Empreendimento' },
  { key: 'customer',                label: 'Cliente' },
  { key: 'unit',                    label: 'Unidade' },
  { key: 'financialInstitutionDate', label: 'Dt. Inst. Financeira' },
  { key: 'cancelDate',              label: 'Data distrato' },
  { key: 'reason',                  label: 'Motivo' },
  { key: 'originalValue',           label: 'VGV' },
  { key: 'cancelAmount',            label: 'Rescisão' },
];

function sortBy(col) {
  if (sortCol.value === col) sortAsc.value = !sortAsc.value;
  else { sortCol.value = col; sortAsc.value = false; }
}

const filteredRows = computed(() => {
  const q = tableSearch.value.toLowerCase().trim();
  let rows = q
    ? store.tableRows.filter(r =>
      r.enterprise?.toLowerCase().includes(q) ||
      r.customer?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q) ||
      String(r.number ?? '').includes(q)
    )
    : [...store.tableRows];

  rows.sort((a, b) => {
    const va = a[sortCol.value], vb = b[sortCol.value];
    const cmp = typeof va === 'number'
      ? (va || 0) - (vb || 0)
      : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR');
    return sortAsc.value ? cmp : -cmp;
  });
  return rows;
});

watch(filteredRows, () => { tablePage.value = 1; });

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / TABLE_LIMIT)));
const paginatedRows = computed(() => {
  const s = (tablePage.value - 1) * TABLE_LIMIT;
  return filteredRows.value.slice(s, s + TABLE_LIMIT);
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader
        subtitle="Análise analítica de rescisões de contratos · sincronizado via cron horário com Sienge"
        icon="fas fa-file-circle-xmark">
        <template #title>
          <span>Gestão de Distratos</span>
          <Favorite :router="'/comercial/distratos'" :section="'Distratos'" />
        </template>
      </PageHeader>

      <!-- Filtros -->
      <div class="mb-4">
        <DistratoFilters @filter-changed="handleFilterChange" />
      </div>

      <!-- Erro -->
      <div v-if="store.error"
        class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>{{ store.error }}
        </div>
        <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="handleFilterChange">
          Tentar novamente
        </Button>
      </div>

      <!-- Loading -->
      <div v-else-if="store.loading" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando distratos...</p>
      </div>

      <!-- Conteúdo -->
      <template v-else>
        <!-- Empty -->
        <EmptyState v-if="store.distratos.length === 0"
          size="lg" icon="fas fa-file-circle-check"
          title="Nenhum distrato encontrado no período"
          description="Ajuste os filtros ou selecione um intervalo maior." />

        <template v-else>
          <div class="space-y-4">

            <!-- KPI Strip -->
            <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
              <div class="flex sm:grid gap-2.5 sm:gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 min-w-max sm:min-w-0">
                <div v-for="k in kpiCards" :key="k.label" v-tippy="k.tooltip"
                  class="flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised
                         shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
                         transition-all duration-200 ease-out-expo
                         w-44 sm:w-auto shrink-0 surface-gradient">
                  <div class="flex items-center justify-between gap-2">
                    <span class="h-7 w-7 rounded-lg grid place-items-center text-xs" :class="k.accent">
                      <i :class="k.icon"></i>
                    </span>
                    <span class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">{{ k.label }}</span>
                  </div>
                  <span class="text-xl font-semibold text-ink tabular-nums tracking-tight leading-none mt-1">{{ k.value }}</span>
                  <span class="text-[11px] text-ink-muted truncate" :title="k.sub">{{ k.sub }}</span>
                </div>
              </div>
            </div>

            <!-- Alert Banner -->
            <div v-if="store.kpis.alertCount > 0"
              class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 surface-gradient">
              <div class="flex items-start gap-3">
                <div class="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <i class="fas fa-triangle-exclamation text-amber-500"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {{ store.kpis.alertCount }} empreendimento{{ store.kpis.alertCount > 1 ? 's' : '' }}
                    com taxa de distrato acima da média
                  </p>
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <span v-for="ent in store.kpis.alerts" :key="ent.name"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium border border-amber-500/20">
                      <i class="fas fa-building text-[9px]"></i>
                      {{ ent.name }}
                      <span class="bg-amber-500/30 px-1.5 rounded text-[10px] font-bold tabular-nums">{{ ent.count }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

              <!-- Tendência -->
              <section class="rounded-xl border border-line bg-surface-raised shadow-soft p-5 surface-gradient">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">Tendência mensal</h3>
                    <p class="text-xs text-ink-subtle mt-0.5">Distratos por mês · data de cancelamento</p>
                  </div>
                  <ChartActions chart-id="chart-trend" />
                </div>
                <VChart id="chart-trend" :option="optionTrend" style="height:280px" autoresize />
              </section>

              <!-- Por empreendimento -->
              <section class="rounded-xl border border-line bg-surface-raised shadow-soft p-5 surface-gradient">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">Por empreendimento</h3>
                    <p class="text-xs text-ink-subtle mt-0.5">Quantidade de distratos · amarelo = alerta</p>
                  </div>
                  <ChartActions chart-id="chart-ent-count" />
                </div>
                <VChart id="chart-ent-count" :option="optionEntCount" style="height:280px" autoresize />
              </section>

              <!-- Valor médio -->
              <section class="rounded-xl border border-line bg-surface-raised shadow-soft p-5 surface-gradient">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">Valor médio de distrato</h3>
                    <p class="text-xs text-ink-subtle mt-0.5">Valor médio pago por rescisão (R$)</p>
                  </div>
                  <ChartActions chart-id="chart-ent-avg" />
                </div>
                <div v-if="noAmounts" class="h-[280px] flex flex-col items-center justify-center gap-2 text-ink-subtle">
                  <i class="fas fa-circle-info text-2xl"></i>
                  <p class="text-xs">Valores de rescisão não informados no Sienge</p>
                </div>
                <VChart v-else id="chart-ent-avg" :option="optionEntAvg" style="height:280px" autoresize />
              </section>

              <!-- Motivos -->
              <section class="rounded-xl border border-line bg-surface-raised shadow-soft p-5 surface-gradient">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">Motivos de distrato</h3>
                    <p class="text-xs text-ink-subtle mt-0.5">Distribuição por razão de cancelamento</p>
                  </div>
                  <ChartActions chart-id="chart-reasons" />
                </div>
                <div v-if="allUnknownReasons" class="h-[280px] flex flex-col items-center justify-center gap-2 text-ink-subtle">
                  <i class="fas fa-circle-info text-2xl"></i>
                  <p class="text-xs text-center">Motivos não informados no Sienge para este período</p>
                </div>
                <VChart v-else id="chart-reasons" :option="optionReasons" style="height:280px" autoresize />
              </section>
            </div>

            <!-- Tabela -->
            <section class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden surface-gradient">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-line">
                <div>
                  <h3 class="text-sm font-semibold text-ink">Detalhamento</h3>
                  <p class="text-xs text-ink-muted mt-0.5">
                    <span class="font-mono text-ink">{{ filteredRows.length }}</span>
                    distrato{{ filteredRows.length !== 1 ? 's' : '' }}
                    <span v-if="tableSearch" class="text-ink-subtle"> · filtrado</span>
                  </p>
                </div>
                <div class="w-full sm:w-64">
                  <Input v-model="tableSearch" placeholder="Buscar..." size="sm"
                    iconLeft="fas fa-magnifying-glass" />
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead class="bg-surface-sunken/40 border-b border-line">
                    <tr>
                      <th v-for="col in tableCols" :key="col.key"
                        class="px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle whitespace-nowrap cursor-pointer hover:text-ink transition-colors select-none"
                        @click="sortBy(col.key)">
                        {{ col.label }}
                        <i class="fas ml-1 text-[9px]"
                          :class="sortCol === col.key
                            ? (sortAsc ? 'fa-sort-up text-accent' : 'fa-sort-down text-accent')
                            : 'fa-sort opacity-25'"></i>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-line">
                    <tr v-for="row in paginatedRows" :key="row.id"
                      class="hover:bg-surface-sunken/40 transition-colors">
                      <td class="px-4 py-2.5 font-mono text-ink-subtle whitespace-nowrap">
                        {{ row.number || row.id || '—' }}
                      </td>
                      <td class="px-4 py-2.5 font-medium text-ink max-w-[200px] truncate" :title="row.enterprise">
                        {{ row.enterprise }}
                      </td>
                      <td class="px-4 py-2.5 text-ink-muted max-w-[160px] truncate" :title="row.customer">
                        {{ row.customer }}
                      </td>
                      <td class="px-4 py-2.5 text-ink-subtle max-w-[120px] truncate" :title="row.unit">
                        {{ row.unit }}
                      </td>
                      <td class="px-4 py-2.5 whitespace-nowrap text-ink-subtle font-mono">
                        {{ fmtDate(row.financialInstitutionDate) }}
                      </td>
                      <td class="px-4 py-2.5 whitespace-nowrap text-ink-muted font-mono">
                        {{ fmtDate(row.cancelDate) }}
                        <span v-if="row.cancelDate && !row.hasCancelDate"
                          v-tippy="'Data estimada — cancellation_date não preenchido no Sienge'"
                          class="ml-1 text-[9px] text-amber-500 font-medium">est.</span>
                      </td>
                      <td class="px-4 py-2.5 max-w-[200px]">
                        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-surface-sunken text-ink-muted truncate max-w-[190px] border border-line"
                          :title="row.reason">
                          {{ row.reason }}
                        </span>
                      </td>
                      <td class="px-4 py-2.5 text-right whitespace-nowrap text-ink-subtle font-mono tabular-nums">
                        {{ row.originalValue ? fmtCurrency(row.originalValue) : '—' }}
                      </td>
                      <td class="px-4 py-2.5 text-right whitespace-nowrap font-semibold tabular-nums"
                        :class="row.cancelAmount ? 'text-red-500' : 'text-ink-subtle'">
                        {{ row.cancelAmount ? fmtCurrency(row.cancelAmount) : '—' }}
                      </td>
                    </tr>
                    <tr v-if="filteredRows.length === 0">
                      <td colspan="9" class="px-4 py-10 text-center text-ink-subtle text-xs">
                        Nenhum resultado encontrado
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Paginação -->
              <div v-if="totalPages > 1"
                class="px-5 py-3 border-t border-line bg-surface-sunken/40 flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs text-ink-muted font-mono">
                  {{ (tablePage - 1) * TABLE_LIMIT + 1 }}–{{ Math.min(tablePage * TABLE_LIMIT, filteredRows.length) }}
                  de {{ filteredRows.length }}
                </span>
                <div class="flex items-center gap-1">
                  <IconButton icon="fas fa-chevron-left" size="sm" label="Anterior"
                    :disabled="tablePage === 1" @click="tablePage = Math.max(1, tablePage - 1)" />
                  <span class="min-w-[32px] h-8 px-2 grid place-items-center rounded-md text-xs font-mono bg-accent text-white">
                    {{ tablePage }}
                  </span>
                  <IconButton icon="fas fa-chevron-right" size="sm" label="Próxima"
                    :disabled="tablePage === totalPages" @click="tablePage = Math.min(totalPages, tablePage + 1)" />
                </div>
              </div>
            </section>
          </div>
        </template>
      </template>
    </PageContainer>
  </div>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
