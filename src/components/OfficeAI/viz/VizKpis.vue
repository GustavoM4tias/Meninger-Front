<script setup>
/**
 * VizKpis - números de destaque.
 * `inline` (padrão na bolha do chat): MetricInline - métricas em linha, sem
 * parede de caixas. `cards`: StatRow com count-up, para quando cada número é
 * um assunto por si. Cada kpi: { label, value, type?, unit?, delta?, tone?, hint?, sparkline? }.
 */
import { computed } from 'vue';
import MetricInline from '@/components/UI/MetricInline.vue';
import StatRow from '@/components/UI/StatRow.vue';
import { formatarValor, numeroDe } from './formatos.js';

const props = defineProps({
  kpis: { type: Array, default: () => [] },
  inline: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
});

const itens = computed(() => props.kpis.map((k, i) => {
  const raw = numeroDe(k.value);
  const tipo = k.type || (typeof k.value === 'string' && /R\$/.test(k.value) ? 'currency' : typeof k.value === 'string' && /%$/.test(k.value.trim()) ? 'percent' : 'number');
  const podeContar = raw != null && typeof k.value !== 'string';
  return {
    key: k.key || `k${i}`,
    label: k.label,
    value: podeContar ? undefined : String(k.value ?? '-'),
    raw: podeContar ? raw : null,
    format: podeContar ? (v) => formatarValor(v, tipo) + (k.unit ? ` ${k.unit}` : '') : null,
    decimals: podeContar && !Number.isInteger(raw) ? 1 : 0,
    hint: k.hint,
    tone: k.tone || '',
    icon: k.icon,
    delta: k.delta,
    series: k.sparkline,
  };
}));
</script>

<template>
  <div :class="inline ? 'px-3 pb-1' : 'p-3'">
    <MetricInline v-if="inline" :items="itens" />
    <StatRow v-else :items="itens" :cols="{ sm: 2, md: compact ? 2 : 3, lg: compact ? 2 : 4 }" size="sm" />
  </div>
</template>
