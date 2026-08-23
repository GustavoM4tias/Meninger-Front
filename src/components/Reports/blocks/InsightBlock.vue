<script setup>
import { computed } from 'vue'
import { tone } from '../format.js'
import { inlineMd } from '../mdInline.js'

const props = defineProps({
  text: { type: String, default: '' },
  label: { type: String, default: 'Insight' },
  blockTone: { type: String, default: 'accent' },
})

const html = computed(() => inlineMd(props.text))
</script>

<template>
  <aside
    v-if="html"
    class="rounded-xl border-l-4 px-4 py-3.5 sm:px-5" :class="[tone(blockTone).bg]"
    :style="{ borderLeftColor: 'currentColor' }"
  >
    <p class="text-micro font-semibold uppercase tracking-wider mb-1" :class="tone(blockTone).text">{{ label }}</p>
    <p class="text-sm text-ink leading-relaxed" v-html="html" />
  </aside>
</template>
