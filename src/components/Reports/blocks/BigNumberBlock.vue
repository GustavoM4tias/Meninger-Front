<script setup>
import { computed } from 'vue'
import { formatValue, tone } from '../format.js'
import { inlineMd, preenchido } from '../mdInline.js'
import BlockEmpty from './BlockEmpty.vue'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: null },
  format: { type: String, default: 'text' },
  context: { type: String, default: '' },
  delta: { type: String, default: '' },
  deltaTone: { type: String, default: 'neutral' },
})

const contextHtml = computed(() => inlineMd(props.context))
const temValor = computed(() => preenchido(props.value))
</script>

<template>
  <BlockEmpty
    v-if="!temValor"
    :label="label || 'Indicador sem valor'"
    hint="A consulta não retornou este número."
    icon="fas fa-hashtag"
  />
  <div v-else class="rounded-2xl border border-line bg-surface-raised shadow-soft surface-gradient px-5 py-6 sm:px-8 sm:py-7">
    <p class="text-[11px] uppercase tracking-[0.18em] text-ink-subtle">{{ label }}</p>
    <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="font-display text-4xl sm:text-5xl text-ink tabular-nums leading-none">{{ formatValue(value, format) }}</span>
      <span v-if="delta" :class="tone(deltaTone).text" class="text-sm font-semibold tabular-nums">{{ delta }}</span>
    </div>
    <p v-if="contextHtml" class="mt-3 text-sm text-ink-muted max-w-xl" v-html="contextHtml" />
  </div>
</template>
