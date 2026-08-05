<script setup>
import { computed } from 'vue'
import { inlineMd } from '../mdInline.js'

const props = defineProps({
  num: { type: [String, Number], default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})

const descHtml = computed(() => inlineMd(props.description))
</script>

<template>
  <div class="pt-8 flex items-start gap-4">
    <!-- Numeral em acento sólido: o contorno de antes quase sumia no papel -->
    <span
      v-if="num !== '' && num !== null"
      class="flex-shrink-0 w-9 h-9 rounded-full bg-accent text-white dark:text-surface flex items-center justify-center font-display text-sm font-semibold tabular-nums shadow-soft"
    >{{ num }}</span>
    <div class="min-w-0">
      <h2 class="font-display text-xl sm:text-2xl text-ink leading-snug text-balance">{{ title }}</h2>
      <p v-if="descHtml" class="mt-1.5 text-sm text-ink-muted max-w-2xl" v-html="descHtml" />
    </div>
  </div>
</template>
