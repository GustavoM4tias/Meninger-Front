<script setup>
import { computed } from 'vue';

const props = defineProps({
  as: { type: String, default: 'div' },
  padding: { type: String, default: 'md' },     // none | sm | md | lg
  variant: { type: String, default: 'raised' }, // flat | raised | overlay
  interactive: { type: Boolean, default: false },
  bordered: { type: Boolean, default: true },
});

const padMap = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-6 sm:p-8' };
const variantMap = {
  flat: 'bg-surface',
  raised: 'bg-surface-raised surface-gradient',
  overlay: 'bg-surface-overlay shadow-overlay surface-gradient',
};

const classes = computed(() => [
  'rounded-xl transition-all duration-200 ease-out-expo',
  variantMap[props.variant] || variantMap.raised,
  props.bordered ? 'border border-line' : '',
  props.variant !== 'overlay' ? 'shadow-soft' : '',
  padMap[props.padding] ?? padMap.md,
  props.interactive ? 'hover:-translate-y-0.5 hover:shadow-elevated hover:border-accent/30 cursor-pointer' : '',
]);
</script>

<template>
  <component :is="as" :class="classes">
    <slot />
  </component>
</template>
