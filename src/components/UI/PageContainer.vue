<script setup>
import { computed } from 'vue';

const props = defineProps({
  size: { type: String, default: 'xl' },     // sm | md | lg | xl | full
  padded: { type: Boolean, default: true },
  full: { type: Boolean, default: false },   // 100% width
});

const sizeMap = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

const classes = computed(() => [
  'w-full mx-auto',
  props.full ? 'max-w-none' : (sizeMap[props.size] || sizeMap.xl),
  props.padded ? 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8' : '',
]);
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
