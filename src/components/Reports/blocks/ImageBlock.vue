<script setup>
defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  caption: { type: String, default: '' },
})
</script>

<template>
  <figure class="rounded-xl overflow-hidden border border-line bg-surface-raised shadow-soft">
    <img :src="src" :alt="alt" loading="lazy" class="w-full max-h-[480px] object-cover" />
    <figcaption v-if="caption" class="px-4 py-2.5 text-xs text-ink-subtle">{{ caption }}</figcaption>
  </figure>
</template>
