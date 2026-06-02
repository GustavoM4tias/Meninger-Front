<script setup>
// Gráfico Dia-a-dia da campanha — ECharts com:
//  - Barras de gasto/dia (eixo Y esquerdo, R$)
//  - Linha de leads Meta/dia (eixo Y direito)
//  - Linha de leads Office/dia (eixo Y direito)
//  - Tooltip rico com todas as métricas do dia

import { computed } from 'vue';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
    TooltipComponent, LegendComponent, GridComponent, DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    BarChart, LineChart,
    TooltipComponent, LegendComponent, GridComponent, DataZoomComponent,
    CanvasRenderer,
]);

const props = defineProps({
    daily: { type: Array, default: () => [] },           // [{ day, spend, meta_leads, office_leads, impressions, clicks }]
    currency: { type: String, default: 'BRL' },
});

const moneyFmt = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', minimumFractionDigits: 2,
}));

const option = computed(() => {
    const days = props.daily.map(d => d.day);
    const spend = props.daily.map(d => Number(d.spend) || 0);
    const metaLeads = props.daily.map(d => Number(d.meta_leads) || 0);
    const officeLeads = props.daily.map(d => Number(d.office_leads) || 0);

    return {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'inherit' },
        legend: {
            top: 6,
            textStyle: { color: '#94a3b8', fontSize: 11 },
            itemWidth: 12, itemHeight: 8,
            data: ['Gasto', 'Leads Meta', 'Leads Office'],
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#f1f5f9', fontSize: 12 },
            formatter(params) {
                if (!params?.length) return '';
                const dayIso = params[0].axisValue;
                let day;
                try { day = new Date(dayIso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }); }
                catch { day = dayIso; }

                const lines = [`<b>${day}</b>`];
                for (const p of params) {
                    const color = p.color;
                    const name = p.seriesName;
                    let value;
                    if (name === 'Gasto') value = moneyFmt.value.format(p.value);
                    else                  value = new Intl.NumberFormat('pt-BR').format(p.value);
                    lines.push(`<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;"></span>${name}: <b>${value}</b>`);
                }
                return lines.join('<br>');
            },
        },
        grid: { left: 50, right: 50, top: 38, bottom: 36 },
        xAxis: {
            type: 'category',
            data: days,
            axisLabel: {
                color: '#94a3b8', fontSize: 10,
                formatter(value) {
                    try { return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
                    catch { return value; }
                },
            },
            axisLine: { lineStyle: { color: '#334155' } },
        },
        yAxis: [
            {
                type: 'value',
                name: 'Gasto (R$)',
                position: 'left',
                nameTextStyle: { color: '#60a5fa', fontSize: 10 },
                axisLabel: {
                    color: '#94a3b8', fontSize: 10,
                    formatter: v => `R$ ${Math.round(v)}`,
                },
                splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
            },
            {
                type: 'value',
                name: 'Leads',
                position: 'right',
                nameTextStyle: { color: '#34d399', fontSize: 10 },
                axisLabel: { color: '#94a3b8', fontSize: 10 },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: 'Gasto',
                type: 'bar',
                yAxisIndex: 0,
                data: spend,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#3b82f6' },
                        { offset: 1, color: '#1d4ed8' },
                    ]),
                    borderRadius: [4, 4, 0, 0],
                },
                barMaxWidth: 24,
            },
            {
                name: 'Leads Meta',
                type: 'line',
                yAxisIndex: 1,
                data: metaLeads,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: '#10b981', width: 2 },
                itemStyle: { color: '#10b981' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
                        { offset: 1, color: 'rgba(16, 185, 129, 0)' },
                    ]),
                },
            },
            {
                name: 'Leads Office',
                type: 'line',
                yAxisIndex: 1,
                data: officeLeads,
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
                itemStyle: { color: '#f59e0b' },
            },
        ],
    };
});
</script>

<template>
  <div class="rounded-lg border border-line bg-surface-sunken/30 p-2">
    <VChart v-if="daily.length" :option="option" class="w-full" style="height: 320px" autoresize />
    <div v-else class="text-center py-12 text-ink-subtle">
      <i class="fas fa-chart-column text-3xl mb-2 block"></i>
      <p class="text-sm">Sem dados no período</p>
    </div>
  </div>
</template>
