<script setup>
// "Volume por dia" — quantos e-mails chegaram em cada dia da semana.
//
// Era um gráfico de barras feito à mão com div e altura em porcentagem. Isso
// não segue o padrão do Office: sem eixo declarado, sem tooltip, sem tema de
// escuro, e a altura relativa ao maior dia fazia um dia de 3 e-mails parecer
// metade de um dia de 6. Agora é ECharts com o useChartTheme, igual ao resto do
// Office - a cor da barra é ÁREA (`t.fill`), o eixo tem escala de verdade e o
// escuro vem de graça.
//
// A barra é CLICÁVEL: escolher um dia recorta a lista de e-mails daquele dia,
// que é a pergunta que o gráfico levanta ("o que chegou na terça?").

import { computed, ref } from 'vue';
import { useChartTheme } from '@/composables/useChartTheme';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, TooltipComponent, GridComponent, CanvasRenderer]);

const props = defineProps({
  // [{ dia, data, valor }]
  barras: { type: Array, default: () => [] },
});

const emit = defineEmits(['dia']);

const t = useChartTheme();
const selecionado = ref(null);

const rotulos = computed(() => props.barras.map(b => b.dia));
const valores = computed(() => props.barras.map(b => Number(b.valor) || 0));
const total = computed(() => valores.value.reduce((a, b) => a + b, 0));
const media = computed(() => (props.barras.length ? Math.round(total.value / props.barras.length) : 0));

const maisMovimentado = computed(() => {
  if (!props.barras.length) return null;
  return props.barras.reduce((a, b) => (Number(b.valor) > Number(a.valor) ? b : a));
});

function dataLonga(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

const option = computed(() => ({
  ...t.base.value,
  grid: { ...t.grid.value, top: 16, bottom: 24, left: 34, right: 8 },
  tooltip: {
    ...t.tooltip.value,
    formatter: (p) => {
      const item = p[0];
      const b = props.barras[item.dataIndex];
      const n = item.value;
      return `<b>${dataLonga(b?.data)}</b><br>${n} e-mail${n === 1 ? '' : 's'} recebido${n === 1 ? '' : 's'}`
        + '<br><span style="opacity:.6">clique para ver quais</span>';
    },
  },
  xAxis: { type: 'category', data: rotulos.value, ...t.axisCategory.value },
  yAxis: { type: 'value', minInterval: 1, ...t.axisValue.value },
  series: [
    t.bar(1, {
      name: 'Recebidos',
      data: valores.value.map((v, i) => ({
        value: v,
        // O dia escolhido usa a MARCA (mais forte) para se destacar dos outros,
        // que ficam na ÁREA. Cor sozinha não conta a história: o cabeçalho
        // acima também diz qual dia está selecionado.
        itemStyle: selecionado.value === i ? { color: t.color(1) } : undefined,
      })),
    }),
  ],
}));

function clicou(e) {
  const i = e?.dataIndex;
  if (i === undefined || i === null) return;
  selecionado.value = selecionado.value === i ? null : i;
  emit('dia', selecionado.value === null ? null : props.barras[i]);
}

function limpar() {
  selecionado.value = null;
  emit('dia', null);
}

defineExpose({ limpar });
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
      <div class="flex items-baseline gap-2">
        <h3 class="text-sm font-semibold text-ink">Volume por dia</h3>
        <span v-if="maisMovimentado" class="text-micro text-ink-subtle">
          média de {{ media }}/dia · pico {{ maisMovimentado.dia }}
        </span>
      </div>
      <button v-if="selecionado !== null" type="button"
        class="text-micro text-accent hover:underline animate-fade-in" @click="limpar">
        ver a semana toda
      </button>
    </div>

    <p class="text-micro text-ink-subtle mb-2">Clique num dia para ver os e-mails dele.</p>

    <VChart :option="option" autoresize class="h-48 w-full" @click="clicou" />
  </div>
</template>
