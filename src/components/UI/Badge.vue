<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: { type: String, default: 'neutral' }, // neutral | accent | success | warning | danger | info
  size: { type: String, default: 'md' },         // sm | md
  dot: { type: Boolean, default: false },
  outlined: { type: Boolean, default: false },
});

const variants = {
  neutral: { solid: 'bg-surface-sunken text-ink-muted border-line', outline: 'border-line text-ink-muted' },
  accent:  { solid: 'bg-accent-soft text-accent border-accent/20', outline: 'border-accent/40 text-accent' },
  success: { solid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', outline: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400' },
  warning: { solid: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', outline: 'border-amber-500/40 text-amber-600 dark:text-amber-400' },
  danger:  { solid: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20', outline: 'border-red-500/40 text-red-600 dark:text-red-400' },
  info:    { solid: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20', outline: 'border-sky-500/40 text-sky-600 dark:text-sky-400' },
};

const sizeMap = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-0.5 text-xs gap-1.5',
};

const dotColor = {
  neutral: 'bg-ink-subtle',
  accent: 'bg-accent',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
};

const classes = computed(() => {
  const v = variants[props.variant] || variants.neutral;
  return [
    'inline-flex items-center font-medium rounded-md border',
    sizeMap[props.size] || sizeMap.md,
    props.outlined ? `bg-transparent ${v.outline}` : v.solid,
  ];
});
</script>

<template>
  <span :class="classes">
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full" :class="dotColor[variant] || dotColor.neutral"></span>
    <slot />
  </span>
</template>
