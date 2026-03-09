<template>
  <div class="input-field w-full">
    <label v-if="label"
      class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
      {{ label }}
    </label>
    <input class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100
             bg-white dark:bg-gray-900/60
             border border-gray-200 dark:border-gray-700
             rounded-md
             placeholder:text-gray-400 dark:placeholder:text-gray-500
             shadow-sm
             transition-all duration-150
             outline-none
             focus:border-blue-400 dark:focus:border-blue-500
             focus:ring-2 focus:ring-blue-500/15 dark:focus:ring-blue-500/20
             disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/30"
      :type="type" :placeholder="placeholder" :value="modelValue" @input="updateValue" :required="required"
      :disabled="disabled" />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: [String, Number],
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const updateValue = (event) => emit('update:modelValue', event.target.value);
</script>