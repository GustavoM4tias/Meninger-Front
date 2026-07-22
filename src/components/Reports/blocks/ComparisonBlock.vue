<script setup>
import { formatValue, tone } from '../format.js'

defineProps({
  title: { type: String, default: '' },
  // sides: [{ label, value, format?, caption? }] (2 lados)
  sides: { type: Array, default: () => [] },
  // verdict: { text, tone } - leitura do comparativo
  verdict: { type: Object, default: null },
})
</script>

<template>
  <div class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
    <p v-if="title" class="px-4 pt-3.5 text-sm font-medium text-ink">{{ title }}</p>
    <div class="grid grid-cols-2 divide-x divide-line">
      <div v-for="(s, i) in sides.slice(0, 2)" :key="i" class="px-4 py-4 sm:px-6 text-center">
        <p class="text-[11px] uppercase tracking-wider text-ink-subtle truncate">{{ s.label }}</p>
        <p class="mt-1.5 font-display text-2xl sm:text-3xl text-ink tabular-nums">{{ formatValue(s.value, s.format) }}</p>
        <p v-if="s.caption" class="mt-1 text-xs text-ink-muted">{{ s.caption }}</p>
      </div>
    </div>
    <div v-if="verdict?.text" class="px-4 py-2.5 border-t border-line text-xs flex items-center gap-2" :class="tone(verdict.tone).bg">
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="tone(verdict.tone).dot" />
      <span :class="tone(verdict.tone).text" class="font-medium">{{ verdict.text }}</span>
    </div>
  </div>
</template>
