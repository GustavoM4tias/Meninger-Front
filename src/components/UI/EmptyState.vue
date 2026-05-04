<script setup>
defineProps({
  icon: { type: String, default: 'far fa-folder-open' },
  title: { type: String, default: 'Nenhum item' },
  description: { type: String, default: '' },
  size: { type: String, default: 'md' },  // sm | md | lg
});
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center"
       :class="size === 'sm' ? 'py-8 px-4' : size === 'lg' ? 'py-20 px-6' : 'py-14 px-6'">
    <div class="grid place-items-center rounded-2xl bg-surface-sunken border border-line text-ink-subtle mb-3"
         :class="size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12'">
      <i :class="[icon, size === 'lg' ? 'text-2xl' : 'text-base']"></i>
    </div>
    <h3 class="font-medium text-ink"
        :class="size === 'lg' ? 'text-base' : 'text-sm'">
      {{ title }}
    </h3>
    <p v-if="description || $slots.description"
       class="text-ink-muted mt-1"
       :class="size === 'lg' ? 'text-sm max-w-sm' : 'text-xs max-w-xs'">
      <slot name="description">{{ description }}</slot>
    </p>
    <div v-if="$slots.actions" class="mt-4">
      <slot name="actions" />
    </div>
  </div>
</template>
