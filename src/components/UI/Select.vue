<script setup>
import { computed } from 'vue';
import { sizeMap, fieldBase, labelBase } from './_classes';

const props = defineProps({
  modelValue: { type: [String, Number, Array], default: '' },
  options: { type: Array, required: true, default: () => [] },
  placeholder: { type: String, default: 'Selecione uma opção' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
  classes: { type: String, default: '' }, // backwards compat
  id: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'change']);
const updateValue = (e) => {
  emit('update:modelValue', e.target.value);
  emit('change', e.target.value);
};

const sz = computed(() => sizeMap[props.size] || sizeMap.md);

const fieldClasses = computed(() => [
  fieldBase,
  sz.value.padX, sz.value.padY, sz.value.text, sz.value.radius,
  'pr-10 appearance-none cursor-pointer',
  props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '',
  props.classes,
]);
</script>

<template>
  <div class="w-full">
    <label v-if="label" :for="id" :class="labelBase">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        :class="fieldClasses"
        @change="updateValue"
      >
        <option value="" disabled hidden>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
 
    </div>

    <p v-if="error" class="mt-1.5 text-xs text-red-500 flex items-center gap-1">
      <i class="fas fa-circle-exclamation"></i>{{ error }}
    </p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-ink-subtle">{{ hint }}</p>
  </div>
</template>
