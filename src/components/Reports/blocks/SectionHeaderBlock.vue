<script setup>
defineProps({
  num: { type: [String, Number], default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="pt-8 flex items-start gap-4">
    <span
      v-if="num !== '' && num !== null"
      class="flex-shrink-0 w-9 h-9 rounded-full border border-accent/40 text-accent flex items-center justify-center font-display text-sm"
    >{{ num }}</span>
    <div class="min-w-0">
      <h2 class="font-display text-xl sm:text-2xl text-ink leading-snug">{{ title }}</h2>
      <p v-if="description" class="mt-1.5 text-sm text-ink-muted max-w-2xl">{{ description }}</p>
    </div>
  </div>
</template>
