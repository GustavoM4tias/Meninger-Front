<template>
  <button :type="type" :disabled="disabled" :class="[
    'inline-flex items-center justify-center gap-2',
    'px-4 py-2 text-sm font-medium rounded-lg',
    'transition-all duration-150 cursor-pointer',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    outlined
      ? 'border border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-400'
      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm focus:ring-blue-500',
    disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
  ]" @click="handleClick">
    <slot />
  </button>
</template>

<script setup>
const props = defineProps({
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  outlined: { type: Boolean, default: false },
});

const emit = defineEmits(['click']);
const handleClick = (e) => emit('click', e);
</script>