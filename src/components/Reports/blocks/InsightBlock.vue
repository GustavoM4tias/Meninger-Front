<script setup>
import { tone } from '../format.js'

defineProps({
  text: { type: String, default: '' },
  label: { type: String, default: 'Insight' },
  blockTone: { type: String, default: 'accent' },
})
</script>

<template>
  <aside class="rounded-xl border-l-4 px-4 py-3.5 sm:px-5" :class="[tone(blockTone).bg]" :style="{ borderLeftColor: 'currentColor' }">
    <p class="text-[11px] font-semibold uppercase tracking-wider mb-1" :class="tone(blockTone).text">{{ label }}</p>
    <p class="text-sm text-ink leading-relaxed">{{ text }}</p>
  </aside>
</template>
