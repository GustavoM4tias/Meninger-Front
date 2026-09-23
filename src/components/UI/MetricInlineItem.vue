<script setup>
/**
 * Uma métrica da MetricInline. Existe como componente próprio porque o
 * count-up é um composable e composable não roda dentro de `v-for`.
 */
import { computed, toRef } from 'vue';
import { useCountUp } from '@/composables/useCountUp';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '-' },
  raw: { type: Number, default: null },
  format: { type: Function, default: null },
  decimals: { type: Number, default: 0 },
  hint: { type: String, default: '' },
  icon: { type: String, default: '' },
  /* pos | neg | warn | accent | vazio (herda a cor de texto) */
  tone: { type: String, default: '' },
  tooltip: { type: String, default: '' },
  index: { type: Number, default: 0 },
});

const TONES = {
  pos: 'text-data-pos',
  neg: 'text-data-neg',
  warn: 'text-data-warn',
  accent: 'text-accent',
};

const { display, counting } = useCountUp(toRef(props, 'raw'), { duration: 850, decimals: props.decimals });
const shown = computed(() => {
  if (props.raw == null) return props.value;
  return props.format ? props.format(display.value) : display.value;
});
</script>

<template>
  <div v-tippy="tooltip" :title="tooltip || undefined"
    class="px-3 py-2.5 min-w-0 text-center stagger-in" :style="{ '--i': index }">
    <!-- O rótulo nunca some: numa faixa apertada, "Estoque segu..." não diz nada.
         Ele quebra em duas linhas e o resto da explicação fica no tooltip. -->
    <dt class="flex items-center justify-center gap-1.5 text-micro text-ink-muted leading-tight">
      <i v-if="icon" :class="[icon, 'text-ink-subtle']" style="font-size:10px"></i>{{ label }}
    </dt>
    <dd class="metric text-metric-sm mt-0.5 truncate transition-colors duration-420"
      :class="counting ? 'metric-counting' : (TONES[tone] || '')">
      {{ shown }}
    </dd>
    <dd v-if="hint" class="text-micro text-ink-subtle tabular-nums leading-tight">{{ hint }}</dd>
  </div>
</template>
