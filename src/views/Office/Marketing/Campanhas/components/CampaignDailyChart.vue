<script setup>
// "Desempenho diário" — investimento (barras) × leads Meta (linha), no padrão
// visual dos gráficos do sistema (LeadsTrendCard): card surface-raised com
// kicker + total no header, eixos tema-aware (claro/escuro), splitLine dashed.

import { computed } from 'vue';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, TooltipComponent, GridComponent, CanvasRenderer]);

const props = defineProps({
    daily: { type: Array, default: () => [] },           // [{ day, spend, meta_leads, ... }]
    currency: { type: String, default: 'BRL' },
});

const isDark = computed(() => document.documentElement.classList.contains('dark'));
const sub  = computed(() => (isDark.value ? '#94a3b8' : '#64748b'));
const grid = computed(() => (isDark.value ? '#334155' : '#e2e8f0'));

const moneyFmt = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', minimumFractionDigits: 2,
}));
const intFmt = new Intl.NumberFormat('pt-BR');

const totalSpend = computed(() => props.daily.reduce((a, d) => a + (Number(d.spend) || 0), 0));
const totalLeads = computed(() => props.daily.reduce((a, d) => a + (Number(d.meta_leads) || 0), 0));
const dias = computed(() => props.daily.length);

// Interpreta 'YYYY-MM-DD' como data LOCAL. `new Date('2026-07-01')` seria
// meia-noite UTC → em UTC-3 volta pra 30/06 e o rótulo aparece um dia antes.
function localDate(s) {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

const option = computed(() => ({
    grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
    tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter(params) {
            if (!params?.length) return '';
            let day;
            try { day = localDate(params[0].axisValue).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }); }
            catch { day = params[0].axisValue; }
            const lines = [`<b>${day}</b>`];
            for (const p of params) {
                const value = p.seriesName === 'Investimento'
                    ? moneyFmt.value.format(p.value)
                    : intFmt.format(p.value);
                lines.push(`${p.marker}${p.seriesName}: <b>${value}</b>`);
            }
            return lines.join('<br>');
        },
    },
    xAxis: {
        type: 'category',
        data: props.daily.map(d => d.day),
        axisLabel: {
            color: sub.value, fontSize: 10, hideOverlap: true,
            formatter(value) {
                try { return localDate(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
                catch { return value; }
            },
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: grid.value } },
    },
    yAxis: [
        {
            type: 'value',
            axisLabel: { color: sub.value, fontSize: 10, formatter: v => `R$ ${intFmt.format(Math.round(v))}` },
            splitLine: { lineStyle: { color: grid.value, type: 'dashed' } },
            axisLine: { show: false },
        },
        {
            type: 'value',
            axisLabel: { color: sub.value, fontSize: 10 },
            splitLine: { show: false },
            axisLine: { show: false },
        },
    ],
    series: [
        {
            name: 'Investimento',
            type: 'bar',
            yAxisIndex: 0,
            data: props.daily.map(d => Number(d.spend) || 0),
            itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0], opacity: 0.85 },
            barMaxWidth: 18,
        },
        {
            name: 'Leads Meta',
            type: 'line',
            yAxisIndex: 1,
            data: props.daily.map(d => Number(d.meta_leads) || 0),
            smooth: 0.4,
            showSymbol: false,
            lineStyle: { color: '#10b981', width: 2.5 },
            itemStyle: { color: '#10b981' },
        },
    ],
}));
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4 flex flex-col">
    <div class="flex items-start justify-between gap-3 mb-2 flex-wrap">
      <div>
        <h2 class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
          <i class="fas fa-chart-column text-accent"></i>Desempenho diário
        </h2>
        <p class="mt-1 flex items-baseline gap-3 flex-wrap">
          <span>
            <span class="inline-block w-2.5 h-2.5 rounded-[3px] bg-blue-500 mr-1.5"></span>
            <span class="text-lg font-bold text-ink tabular-nums">{{ moneyFmt.format(totalSpend) }}</span>
            <span class="text-xs text-ink-muted ml-1">investidos</span>
          </span>
          <span>
            <span class="inline-block w-2.5 h-[3px] rounded-full bg-emerald-500 mr-1.5 align-middle"></span>
            <span class="text-lg font-bold text-ink tabular-nums">{{ intFmt.format(totalLeads) }}</span>
            <span class="text-xs text-ink-muted ml-1">leads Meta</span>
          </span>
        </p>
      </div>
      <span class="text-[11px] text-ink-subtle font-mono px-2 py-1 rounded-md bg-surface-sunken border border-line shrink-0">
        {{ dias }} dia{{ dias === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="flex-1 min-h-[240px]">
      <VChart v-if="dias" :option="option" autoresize class="h-[240px] w-full" />
      <div v-else class="h-[240px] grid place-items-center text-sm text-ink-subtle">
        Sem dados no período
      </div>
    </div>
  </section>
</template>
