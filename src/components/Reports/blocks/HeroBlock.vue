<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  meta: { type: Array, default: () => [] }, // [{ label, value }]
})
</script>

<template>
  <header class="pt-2 pb-6 border-b border-line">
    <p v-if="eyebrow" class="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">{{ eyebrow }}</p>
    <h1 class="font-display text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight text-ink">{{ title }}</h1>
    <p v-if="subtitle" class="mt-3 text-base sm:text-lg text-ink-muted max-w-3xl">{{ subtitle }}</p>
    <div v-if="tags.length" class="mt-4 flex flex-wrap gap-1.5">
      <span
        v-for="(t, i) in tags" :key="i"
        class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent-soft text-accent"
      >{{ t }}</span>
    </div>
    <dl v-if="meta.length" class="mt-5 flex flex-wrap gap-x-8 gap-y-2">
      <div v-for="(m, i) in meta" :key="i" class="min-w-0">
        <dt class="text-[10px] uppercase tracking-wider text-ink-subtle">{{ m.label }}</dt>
        <dd class="text-sm font-medium text-ink">{{ m.value }}</dd>
      </div>
    </dl>
  </header>
</template>
