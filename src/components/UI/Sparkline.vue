<script setup>
/**
 * Sparkline — mini série dentro de um StatCard ou de uma célula de tabela.
 * SVG/divs puros: seis destes numa linha não justificam carregar o ECharts.
 *
 * O último ponto é sempre o destacado (é o valor "de agora"; os anteriores são
 * contexto). Decorativo por natureza, então sai da árvore de acessibilidade —
 * o número ao lado é quem carrega a informação.
 */
import { computed } from 'vue';

const props = defineProps({
  values: { type: Array, default: () => [] },      // [number]
  mode: { type: String, default: 'bars' },         // bars | line
  color: { type: String, default: 'currentColor' },
  bars: { type: Number, default: 14 },             // nº de colunas (reamostra)
  height: { type: String, default: 'h-6' },
});

/** Reamostra para no máximo `bars` colunas, somando os pontos de cada balde. */
const buckets = computed(() => {
  const v = (props.values || []).map((n) => Number(n) || 0);
  if (!v.length) return [];
  if (v.length <= props.bars) return v;
  const size = Math.ceil(v.length / props.bars);
  const out = [];
  for (let i = 0; i < v.length; i += size) out.push(v.slice(i, i + size).reduce((a, b) => a + b, 0));
  return out;
});

const max = computed(() => Math.max(1, ...buckets.value));
const hasData = computed(() => buckets.value.some((n) => n > 0));

/* Modo linha: normaliza para uma viewBox de 100x30. */
const points = computed(() => {
  const b = buckets.value;
  if (b.length < 2) return '';
  const step = 100 / (b.length - 1);
  return b.map((v, i) => `${(i * step).toFixed(2)},${(28 - (v / max.value) * 26).toFixed(2)}`).join(' ');
});
const lastPoint = computed(() => {
  const p = points.value.split(' ').pop();
  return p ? p.split(',').map(Number) : null;
});
</script>

<template>
  <div v-if="hasData" :class="height" aria-hidden="true">
    <!-- barras: leitura de volume por período.
         Crescem da base, escalonadas da esquerda para a direita. -->
    <div v-if="mode === 'bars'" class="flex items-end gap-[2px] h-full">
      <span v-for="(v, i) in buckets" :key="i"
        class="w-[3px] rounded-sm origin-bottom animate-grow transition-[height] duration-300"
        :style="{
          height: Math.max(10, (v / max) * 100) + '%',
          backgroundColor: color,
          opacity: i === buckets.length - 1 ? 1 : 0.35,
          animationDelay: `${Math.min(i, 14) * 28}ms`,
        }"></span>
    </div>

    <!-- linha: leitura de tendência.
         `pathLength="1"` normaliza o comprimento do traço, então o desenho
         funciona igual em qualquer quantidade de pontos. -->
    <svg v-else class="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
      <polyline :points="points" fill="none" :stroke="color" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="0.85"
        path-length="1" class="animate-draw"
        style="stroke-dasharray:1; --len:1" />
      <!-- ponta destacada: onde a série está agora. Aparece quando o traço
           termina de se desenhar. -->
      <circle v-if="lastPoint" :cx="lastPoint[0]" :cy="lastPoint[1]" r="2.5" :fill="color"
        vector-effect="non-scaling-stroke"
        class="animate-pop-in" style="animation-delay:620ms" />
    </svg>
  </div>
</template>
