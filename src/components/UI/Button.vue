<script setup>
import { computed } from 'vue';
import { sizeMap, buttonVariants } from './_classes';

const props = defineProps({
  type: { type: String, default: 'button' },
  variant: { type: String, default: 'primary' }, // primary | secondary | ghost | outline | danger | subtle
  size: { type: String, default: 'md' },         // sm | md | lg
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  icon: { type: String, default: '' },           // ex: 'fas fa-arrow-right'
  iconRight: { type: String, default: '' },
  // backwards compat
  outlined: { type: Boolean, default: false },
});

const emit = defineEmits(['click']);

const resolvedVariant = computed(() =>
  props.outlined ? 'outline' : props.variant
);

const sz = computed(() => sizeMap[props.size] || sizeMap.md);

const classes = computed(() => [
  'inline-flex items-center justify-center font-medium select-none whitespace-nowrap',
  sz.value.padX, sz.value.padY, sz.value.text, sz.value.gap, sz.value.radius,
  'transition-all duration-150 ease-out-expo',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
  buttonVariants[resolvedVariant.value] || buttonVariants.primary,
  props.block ? 'w-full' : '',
  (props.disabled || props.loading) ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
]);

const handleClick = (e) => emit('click', e);
</script>

<template>
  <button :type="type" :disabled="disabled || loading" :class="classes" @click="handleClick">
    <i v-if="loading" class="fas fa-circle-notch fa-spin"></i>
    <i v-else-if="icon" :class="icon"></i>
    <slot />
    <i v-if="iconRight && !loading" :class="iconRight"></i>
  </button>
</template>
