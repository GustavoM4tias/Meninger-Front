<script setup>
import { computed } from 'vue'
import { formatValue } from '../format.js'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: Number, default: 0 },
  goal: { type: Number, default: 0 },
  format: { type: String, default: 'number' },
  hint: { type: String, default: '' },
})

const pct = computed(() => {
  if (!props.goal) return 0
  return Math.min(100, Math.round((props.value / props.goal) * 1000) / 10)
})
const toneClass = computed(() => {
  if (pct.value >= 100) return 'bg-emerald-500'
  if (pct.value >= 70) return 'bg-accent'
  if (pct.value >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
})
</script>

<template>
  <div class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-4 sm:px-5">
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
      <span class="text-ink-subtle">{{ hint }}</span>
      <span class="font-semibold tabular-nums" :class="pct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-muted'">{{ pct }}%</span>
    </div>
  </div>
</template>
