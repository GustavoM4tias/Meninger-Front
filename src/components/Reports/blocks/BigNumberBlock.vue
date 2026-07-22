<script setup>
import { formatValue, tone } from '../format.js'

defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: null },
  format: { type: String, default: 'text' },
  context: { type: String, default: '' },
  delta: { type: String, default: '' },
  deltaTone: { type: String, default: 'neutral' },
})
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface-raised shadow-soft surface-gradient px-5 py-6 sm:px-8 sm:py-7">
    <p class="text-[11px] uppercase tracking-[0.18em] text-ink-subtle">{{ label }}</p>
    <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="font-display text-4xl sm:text-5xl text-ink tabular-nums leading-none">{{ formatValue(value, format) }}</span>
      <span v-if="delta" :class="tone(deltaTone).text" class="text-sm font-semibold tabular-nums">{{ delta }}</span>
    </div>
    <p v-if="context" class="mt-3 text-sm text-ink-muted max-w-xl">{{ context }}</p>
  </div>
</template>
