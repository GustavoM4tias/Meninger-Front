<script setup>
import { computed } from 'vue';

const props = defineProps({
  size: { type: String, default: 'md' },     // xs | sm | md | lg
  variant: { type: String, default: 'accent' }, // accent | neutral | inverted
});

const sizeMap = { xs: 'h-3 w-3 border-[1.5px]', sm: 'h-4 w-4 border-2', md: 'h-5 w-5 border-2', lg: 'h-7 w-7 border-[2.5px]' };
const variantMap = {
  accent: 'border-accent/30 border-t-accent',
  neutral: 'border-ink-subtle/30 border-t-ink-muted',
  inverted: 'border-white/30 border-t-white',
};

const classes = computed(() => [
  'inline-block rounded-full animate-spin',
  sizeMap[props.size] || sizeMap.md,
  variantMap[props.variant] || variantMap.accent,
]);
</script>

<template>
  <span :class="classes" role="status" aria-label="Carregando..."></span>
</template>
