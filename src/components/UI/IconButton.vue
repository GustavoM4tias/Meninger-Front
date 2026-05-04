<script setup>
import { computed } from 'vue';

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, default: '' },
  variant: { type: String, default: 'ghost' },  // ghost | primary | secondary | danger
  size: { type: String, default: 'md' },        // sm | md | lg
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(['click']);

const sizeMap = {
  sm: { box: 'h-7 w-7', text: 'text-xs', radius: 'rounded-md' },
  md: { box: 'h-9 w-9', text: 'text-sm', radius: 'rounded-lg' },
  lg: { box: 'h-10 w-10', text: 'text-base', radius: 'rounded-lg' },
};

const variants = {
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-soft',
  secondary: 'bg-surface-raised text-ink border border-line hover:bg-surface-sunken',
  danger: 'text-red-500 hover:bg-red-500/10',
};

const sz = computed(() => sizeMap[props.size] || sizeMap.md);

const classes = computed(() => [
  'inline-flex items-center justify-center transition-all duration-150 ease-out-expo',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40',
  'active:scale-[0.94]',
  sz.value.box, sz.value.radius, sz.value.text,
  variants[props.variant] || variants.ghost,
  props.active ? 'bg-surface-sunken text-ink' : '',
  props.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
]);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    :class="classes"
    @click="$emit('click', $event)"
  >
    <i :class="icon"></i>
  </button>
</template>
