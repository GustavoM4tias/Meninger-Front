<script setup>
// "Entradas de leads" — série diária do período, em área suave.
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { dailySeries } from '@/utils/Leads/series';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  leads: { type: Array, default: () => [] },
  from:  { type: String, default: '' },
  to:    { type: String, default: '' },
  isDark: { type: Boolean, default: false },
});

const points = computed(() => dailySeries(props.leads, props.from, props.to));
const total  = computed(() => points.value.reduce((a, p) => a + p.count, 0));
const dias   = computed(() => points.value.length);
const media  = computed(() => (dias.value ? Math.round(total.value / dias.value) : 0));

const sub  = computed(() => (props.isDark ? '#94a3b8' : '#64748b'));
const grid = computed(() => (props.isDark ? '#334155' : '#e2e8f0'));

const option = computed(() => ({
  grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
  tooltip: {
    trigger: 'axis',
    formatter: (ps) => {
      const p = ps?.[0];
      return p ? `${p.axisValue}<br/><b>${p.data}</b> lead(s)` : '';
    },
  },
  xAxis: {
    type: 'category',
    data: points.value.map(p => p.label),
    boundaryGap: false,
    axisLabel: { color: sub.value, fontSize: 10, hideOverlap: true },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: grid.value } },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: sub.value, fontSize: 10 },
    splitLine: { lineStyle: { color: grid.value, type: 'dashed' } },
    axisLine: { show: false },
  },
  series: [{
    type: 'line',
    smooth: 0.4,
    showSymbol: false,
    data: points.value.map(p => p.count),
    lineStyle: { color: '#3b82f6', width: 2.5 },
    itemStyle: { color: '#3b82f6' },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(59,130,246,0.35)' },
          { offset: 1, color: 'rgba(59,130,246,0.02)' },
        ],
      },
    },
  }],
}));

const intFmt = new Intl.NumberFormat('pt-BR');
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4 flex flex-col">
    <div class="flex items-start justify-between gap-3 mb-2 flex-wrap">
      <div>
        <h2 class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
          <i class="fas fa-chart-area text-accent"></i>Entradas de leads
        </h2>
        <p class="mt-1">
          <span class="text-2xl font-bold text-ink tabular-nums">{{ intFmt.format(total) }}</span>
          <span class="text-xs text-ink-muted ml-2">no período · média {{ intFmt.format(media) }}/dia</span>
        </p>
      </div>
      <span class="text-[11px] text-ink-subtle font-mono px-2 py-1 rounded-md bg-surface-sunken border border-line shrink-0">
        {{ dias }} dia{{ dias === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="flex-1 min-h-[220px]">
      <VChart v-if="dias" :option="option" autoresize class="h-[220px] w-full" />
      <div v-else class="h-[220px] grid place-items-center text-sm text-ink-subtle">
        Sem dados no período
      </div>
    </div>
  </section>
</template>
