<script setup>
import { computed } from 'vue';
import { sizeMap, fieldBase, labelBase } from './_classes';

const props = defineProps({
  modelValue: [String, Number],
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'md' },          // sm | md | lg
  iconLeft: { type: String, default: '' },        // ex: 'fas fa-envelope'
  iconRight: { type: String, default: '' },
  id: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur']);
const updateValue = (e) => emit('update:modelValue', e.target.value);

const sz = computed(() => sizeMap[props.size] || sizeMap.md);

const fieldClasses = computed(() => [
  fieldBase,
  sz.value.padY, sz.value.text, sz.value.radius,
  props.iconLeft ? 'pl-10' : sz.value.padX,
  props.iconRight ? 'pr-10' : sz.value.padX,
  props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '',
]);
</script>

<template>
  <div class="w-full">
    <label v-if="label" :for="id" :class="labelBase">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <i v-if="iconLeft"
         :class="iconLeft"
         class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-sm pointer-events-none"></i>

      <input
        :id="id"
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        :class="fieldClasses"
        @input="updateValue"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />

      <i v-if="iconRight"
         :class="iconRight"
         class="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle text-sm pointer-events-none"></i>
    </div>

    <p v-if="error" class="mt-1.5 text-xs text-red-500 flex items-center gap-1">
      <i class="fas fa-circle-exclamation"></i>{{ error }}
    </p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-ink-subtle">{{ hint }}</p>
  </div>
</template>
