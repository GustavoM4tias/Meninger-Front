<script setup>
// Mini gráfico de barras para os cards de KPI. SVG puro — 6 destes numa linha
// não justificam carregar o ECharts.
import { computed } from 'vue';

const props = defineProps({
  values: { type: Array, default: () => [] },   // [number]
  color:  { type: String, default: 'currentColor' },
  bars:   { type: Number, default: 14 },        // nº de barras exibidas (pega as últimas)
});

// Reamostra para no máximo `bars` colunas, somando os dias de cada balde.
const buckets = computed(() => {
  const v = (props.values || []).map(n => Number(n) || 0);
  if (!v.length) return [];
  if (v.length <= props.bars) return v;
  const size = Math.ceil(v.length / props.bars);
  const out = [];
  for (let i = 0; i < v.length; i += size) {
    out.push(v.slice(i, i + size).reduce((a, b) => a + b, 0));
  }
  return out;
});

const max = computed(() => Math.max(1, ...buckets.value));
const hasData = computed(() => buckets.value.some(n => n > 0));
</script>

<template>
  <div v-if="hasData" class="flex items-end gap-[2px] h-6" aria-hidden="true">
    <span v-for="(v, i) in buckets" :key="i"
      class="w-[3px] rounded-sm transition-all duration-300"
      :style="{
        height: Math.max(10, (v / max) * 100) + '%',
        backgroundColor: color,
        opacity: i === buckets.length - 1 ? 1 : 0.35,
      }"></span>
  </div>
</template>
