<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  size: { type: String, default: 'md' },     // sm | md
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  iconOn: { type: String, default: '' },
  iconOff: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'change']);

const sizeMap = {
  sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'translate-x-4', icon: 'text-[8px]' },
  md: { track: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'translate-x-5', icon: 'text-[10px]' },
};

const sz = computed(() => sizeMap[props.size] || sizeMap.md);

function toggle() {
  if (props.disabled) return;
  const v = !props.modelValue;
  emit('update:modelValue', v);
  emit('change', v);
}
</script>

<template>
  <label class="inline-flex items-center gap-3" :class="disabled ? 'opacity-50' : 'cursor-pointer'">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      @click="toggle"
      :class="[
        'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40',
        sz.track,
        modelValue ? 'bg-accent' : 'bg-surface-sunken border border-line',
      ]"
    >
      <span
        :class="[
          'inline-flex items-center justify-center rounded-full bg-white shadow-soft transition-transform duration-200',
          sz.thumb,
          modelValue ? sz.translate : 'translate-x-0.5',
        ]"
      >
        <i v-if="modelValue && iconOn" :class="[iconOn, sz.icon, 'text-accent']"></i>
        <i v-else-if="!modelValue && iconOff" :class="[iconOff, sz.icon, 'text-ink-subtle']"></i>
      </span>
    </button>

    <div v-if="label || description" class="flex flex-col">
      <span v-if="label" class="text-sm font-medium text-ink">{{ label }}</span>
      <span v-if="description" class="text-xs text-ink-muted">{{ description }}</span>
    </div>
  </label>
</template>
