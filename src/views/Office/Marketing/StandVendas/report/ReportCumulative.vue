<script setup>
/**
 * Gasto acumulado por dia de pagamento, em degraus, com a inauguração marcada.
 * Mostra o ritmo: a escada sobe forte na montagem e vira rampa leve depois.
 * Cada ponto é um dia com pagamento; clicar abre o que foi pago naquele dia.
 */
import { computed } from 'vue';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useChartTheme } from '@/composables/useChartTheme';
import { fmtBRL, fmtDate } from '../standFormat';

echarts.use([LineChart, TooltipComponent, GridComponent, MarkLineComponent, CanvasRenderer]);

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const props = defineProps({
    items: { type: Array, default: () => [] },
    openedAt: { type: String, default: '' },
});
const emit = defineEmits(['pick']);
const t = useChartTheme();

// Um ponto por dia de pagamento (um lançamento pago em dois meses conta em cada dia).
const days = computed(() => {
    const map = new Map();
    for (const i of props.items) {
        for (const m of i.months || []) {
            const d = m.paidAt || i.paidAt;
            if (!d) continue;
            map.set(d, (map.get(d) || 0) + (Number(m.amount) || 0));
        }
    }
    let acc = 0;
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([d, v]) => { acc += v; return { d, v, acc }; });
});

const option = computed(() => {
    const opened = props.openedAt ? String(props.openedAt).slice(0, 10) : null;
    return {
        ...t.base.value,
        grid: { ...t.grid.value, top: 24, right: 16 },
        tooltip: {
            ...t.tooltip.value,
            trigger: 'item',
            formatter: (p) => {
                const ponto = days.value[p.dataIndex];
                if (!ponto) return '';
                return `<b>${fmtDate(ponto.d)}</b> · pago ${fmtBRL(ponto.v)}<br>acumulado <b>${fmtBRL(ponto.acc)}</b>`;
            },
        },
        // Um rótulo por mês, em português (o padrão do ECharts é inglês e
        // repete o mês quando a escala cai no meio dele).
        xAxis: {
            type: 'time', ...t.axisCategory.value,
            minInterval: 28 * 86400000,
            axisLabel: {
                ...t.axisCategory.value.axisLabel,
                formatter: (v) => {
                    const d = new Date(v);
                    return `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
                },
            },
        },
        yAxis: {
            type: 'value', ...t.axisValue.value,
            axisLabel: { ...t.axisValue.value.axisLabel, formatter: (v) => (v >= 1000 ? `${v / 1000} mil` : v) },
        },
        series: [t.area(1, {
            name: 'Acumulado',
            step: 'end',
            smooth: false,
            showSymbol: true,
            symbolSize: 7,
            cursor: 'pointer',
            data: days.value.map((p) => [p.d, Math.round(p.acc * 100) / 100]),
            animationDuration: 1100,
            markLine: opened ? {
                symbol: 'none', silent: true,
                lineStyle: { color: t.warn.value, type: 'dashed', width: 1.5 },
                label: { formatter: `inauguração ${fmtDate(opened)}`, color: t.warn.value, fontSize: 11, position: 'insideEndTop' },
                data: [{ xAxis: opened }],
            } : undefined,
        })],
    };
});

function onClick(p) {
    const ponto = days.value[p.dataIndex];
    if (p.componentType === 'series' && ponto) emit('pick', ponto.d);
}
</script>

<template>
    <VChart :option="option" autoresize class="h-[300px] w-full chart-enter" @click="onClick" />
</template>
