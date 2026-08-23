<script setup>
import { computed } from 'vue'
import { formatValue } from '../format.js'
import { inlineMd, preenchido } from '../mdInline.js'
import BlockEmpty from './BlockEmpty.vue'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: Number, default: 0 },
  goal: { type: Number, default: 0 },
  format: { type: String, default: 'number' },
  hint: { type: String, default: '' },
})

const hintHtml = computed(() => inlineMd(props.hint))
// Sem meta (ou meta zero) a barra ficaria sempre em 0% - o que parece um
// resultado péssimo quando na verdade é falta de parâmetro.
const semMeta = computed(() => !props.goal || !preenchido(props.value))

const pct = computed(() => {
  if (!props.goal) return 0
  return Math.min(100, Math.round((props.value / props.goal) * 1000) / 10)
})
const toneClass = computed(() => {
  // A barra é ÁREA: tom `-area`. Com o tom de marca, uma barra larga de meta
  // fica com o mesmo peso de um texto de alerta.
  if (pct.value >= 100) return 'bg-data-pos-area'
  if (pct.value >= 70) return 'bg-series-1-soft'
  if (pct.value >= 40) return 'bg-data-warn-area'
  return 'bg-data-neg-area'
})
</script>

<template>
  <BlockEmpty v-if="semMeta" :label="label || 'Meta'" hint="Sem meta definida ou sem valor realizado." icon="fas fa-bullseye" />
  <div v-else class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-4 sm:px-5">
    <div class="flex items-baseline justify-between gap-3">
      <p class="text-sm font-medium text-ink truncate">{{ label }}</p>
      <p class="text-sm text-ink-muted tabular-nums whitespace-nowrap">
        <span class="font-semibold text-ink">{{ formatValue(value, format) }}</span>
        <span class="text-ink-subtle"> / {{ formatValue(goal, format) }}</span>
      </p>
    </div>
    <div class="mt-3 h-2.5 rounded-full bg-surface-sunken overflow-hidden">
      <div class="h-full rounded-full transition-all duration-700" :class="toneClass" :style="{ width: pct + '%' }" />
    </div>
    <div class="mt-1.5 flex items-center justify-between text-xs">
      <span class="text-ink-subtle" v-html="hintHtml" />
      <span class="font-semibold tabular-nums" :class="pct >= 100 ? 'text-data-pos' : 'text-ink-muted'">{{ pct }}%</span>
    </div>
  </div>
</template>
