<script setup>
/**
 * Gasto do stand mês a mês, empilhado por tipo (construção, esporádico,
 * recorrência, sem classificação). Clicar numa cor abre os lançamentos daquele
 * tipo no mês; o total de cada mês fica escrito em cima da barra.
 */
import { computed } from 'vue';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useChartTheme } from '@/composables/useChartTheme';
import { kindMeta } from '@/stores/Marketing/SalesStand/salesStandStore';
import { fmtYm, fmtBRL, fmtBRLShort } from '../standFormat';
import { KIND_ORDER, kindOf, amountIn, currentYm } from './reportModel';

echarts.use([BarChart, TooltipComponent, GridComponent, CanvasRenderer]);

const props = defineProps({
    items: { type: Array, default: () => [] },
    months: { type: Array, default: () => [] },
});
const emit = defineEmits(['pick']);
const t = useChartTheme();

// Cor fixa por tipo, a mesma dos selos da tela (series-1/2/3 e neutro).
const SLOT = { construcao: 1, recorrencia: 2, esporadica: 3, sem_classificacao: 0 };

const kinds = computed(() => KIND_ORDER.filter((k) => props.items.some((i) => kindOf(i) === k)));
const matrix = computed(() => kinds.value.map((k) => props.months.map((ym) =>
    Math.round(props.items.filter((i) => kindOf(i) === k).reduce((s, i) => s + amountIn(i, ym), 0) * 100) / 100)));
const totals = computed(() => props.months.map((_, j) => matrix.value.reduce((s, row) => s + row[j], 0)));

const option = computed(() => ({
    ...t.base.value,
    grid: { ...t.grid.value, top: 28 },
    tooltip: {
        ...t.tooltip.value,
        axisPointer: t.axisPointerBand.value,
        formatter: (ps) => {
            const j = ps[0]?.dataIndex ?? 0;
            const linhas = ps.filter((p) => p.seriesName && Number(p.value) > 0)
                .map((p) => `${p.marker} ${p.seriesName}: <b>${fmtBRL(p.value)}</b>`);
            return `<b>${fmtYm(props.months[j])}</b> · ${fmtBRL(totals.value[j])}<br>${linhas.join('<br>')}`;
        },
    },
    xAxis: {
        type: 'category', ...t.axisCategory.value,
        data: props.months.map((ym) => fmtYm(ym) + (ym === currentYm() ? '*' : '')),
    },
    yAxis: {
        type: 'value', ...t.axisValue.value,
        axisLabel: { ...t.axisValue.value.axisLabel, formatter: (v) => (v >= 1000 ? `${v / 1000} mil` : v) },
    },
    series: [
        ...kinds.value.map((k, idx) => t.bar(SLOT[k], {
            name: kindMeta(k).label, stacked: 'gasto', data: matrix.value[idx], cursor: 'pointer',
        })),
        // Total escrito no topo da pilha: barra vazia empilhada por último.
        {
            type: 'bar', stack: 'gasto', silent: true, tooltip: { show: false },
            data: props.months.map(() => 0), itemStyle: { color: 'transparent' },
            label: {
                show: true, position: 'top', color: t.ink.value, fontSize: 11, fontWeight: 600,
                formatter: (p) => (totals.value[p.dataIndex] ? fmtBRLShort(totals.value[p.dataIndex]).replace('R$ ', '') : ''),
            },
        },
    ],
}));

function onClick(p) {
    if (p.componentType !== 'series' || p.seriesIndex >= kinds.value.length) return;
    emit('pick', { ym: props.months[p.dataIndex], kind: kinds.value[p.seriesIndex] });
}
</script>

<template>
    <div class="flex flex-col gap-3 chart-enter">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <button v-for="k in kinds" :key="k" type="button"
                class="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors duration-120 min-h-[32px]"
                :title="`Ver todos os lançamentos de ${kindMeta(k).label.toLowerCase()}`"
                @click="emit('pick', { kind: k })">
                <span class="w-2.5 h-2.5 rounded-sm" :class="kindMeta(k).dot"></span>{{ kindMeta(k).label }}
            </button>
        </div>
        <VChart :option="option" autoresize class="h-[280px] w-full" @click="onClick" />
        <p class="text-micro text-ink-subtle">* mês em andamento. Clique numa cor para ver os lançamentos.</p>
    </div>
</template>
