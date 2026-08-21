<script setup>
// "Distribuição por empreendimento" — rosca + legenda com participação %.
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useChartTheme } from '@/composables/useChartTheme';

use([PieChart, TooltipComponent, CanvasRenderer]);

const t = useChartTheme();

const props = defineProps({
  data: { type: Array, default: () => [] },   // [{ name, count }] — leadsByEnterprise
  limit: { type: Number, default: 6 },        // fatias antes de agrupar em "Outros"
});


const total = computed(() => props.data.reduce((a, d) => a + (d.count || 0), 0));

// Top N + "Outros" agregado, para a rosca não virar confete.
const slices = computed(() => {
  const sorted = [...props.data].sort((a, b) => (b.count || 0) - (a.count || 0));
  const top = sorted.slice(0, props.limit);
  const restCount = sorted.slice(props.limit).reduce((a, d) => a + (d.count || 0), 0);
  // Duas cores por fatia: a que PREENCHE a rosca e a que marca a legenda.
  // O mesmo tom nos dois lugares erra um dos dois — o bloco fica pesado ou o
  // quadradinho de 10px some. "Outros" é sempre neutro, nunca ganha matiz.
  const list = top.map((d, i) => ({
    name: d.name, value: d.count || 0,
    fatia: t.fillPalette.value[i % 8], marca: t.palette.value[i % 8],
  }));
  if (restCount > 0) list.push({ name: 'Outros', value: restCount, fatia: t.neutralArea.value, marca: t.neutral.value });
  return list;
});

const legend = computed(() =>
  slices.value.map(s => ({
    ...s,
    pct: total.value > 0 ? Math.round((s.value / total.value) * 100) : 0,
  }))
);

const option = computed(() => ({
  ...t.base.value,
  tooltip: {
    ...t.tooltip.value,
    trigger: 'item',
    formatter: (p) => `${p.name}<br/><b>${p.value}</b> (${p.percent}%)`,
  },
  series: [{
    ...t.donut(),
    radius: ['62%', '88%'],
    center: ['50%', '50%'],
    label: { show: false },
    labelLine: { show: false },
    data: slices.value.map(s => ({ name: s.name, value: s.value, itemStyle: { color: s.fatia } })),
  }],
}));

const intFmt = new Intl.NumberFormat('pt-BR');
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4">
    <h2 class="text-micro font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2 mb-3">
      <i class="fas fa-chart-pie text-accent"></i>Distribuição por empreendimento
    </h2>

    <div v-if="total > 0" class="flex items-center gap-4">
      <!-- Rosca com total no centro -->
      <div class="relative shrink-0 h-32 w-32">
        <VChart :option="option" autoresize class="h-32 w-32" />
        <div class="absolute inset-0 grid place-items-center pointer-events-none">
          <div class="text-center">
            <p class="text-lg font-bold text-ink tabular-nums leading-none">{{ intFmt.format(total) }}</p>
            <p class="text-micro text-ink-subtle mt-0.5">leads</p>
          </div>
        </div>
      </div>

      <!-- Legenda -->
      <ul class="flex-1 min-w-0 space-y-1.5">
        <li v-for="s in legend" :key="s.name" class="flex items-center gap-2 text-xs">
          <span class="h-2.5 w-2.5 rounded-sm shrink-0" :style="{ backgroundColor: s.marca }"></span>
          <span class="flex-1 min-w-0 truncate text-ink-muted" :title="s.name">{{ s.name }}</span>
          <span class="font-semibold text-ink tabular-nums shrink-0">{{ s.pct }}%</span>
        </li>
      </ul>
    </div>

    <div v-else class="h-32 grid place-items-center text-sm text-ink-subtle">
      Sem dados no período
    </div>
  </section>
</template>
