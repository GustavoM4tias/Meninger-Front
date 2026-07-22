<script setup>
import { formatValue, tone } from '../format.js'

defineProps({
  // stats: [{ label, value, format?, delta?, deltaTone?, hint? }]
  stats: { type: Array, default: () => [] },
})
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div
      v-for="(s, i) in stats" :key="i"
      class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-3.5"
    >
      <p class="text-[11px] uppercase tracking-wider text-ink-subtle truncate">{{ s.label }}</p>
      <p class="mt-1 text-xl sm:text-2xl font-semibold text-ink tabular-nums leading-none">
        {{ formatValue(s.value, s.format) }}
      </p>
      <p v-if="s.delta || s.hint" class="mt-1.5 flex items-center gap-1.5 text-xs">
        <span v-if="s.delta" :class="tone(s.deltaTone || 'neutral').text" class="font-medium tabular-nums">{{ s.delta }}</span>
        <span v-if="s.hint" class="text-ink-subtle truncate">{{ s.hint }}</span>
      </p>
    </div>
  </div>
</template>
