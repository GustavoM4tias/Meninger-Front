<template>
  <div class="input-field w-full mt-2 text-lg">
    <label v-if="label" for="input-field" class="block text-gray-700 dark:text-gray-200 font-semibold mb-1">{{ label
      }}</label>
    <input
      class="p-3 text-lg md:text-xl border text-gray-700 dark:text-gray-200 placeholder:text-gray-200 dark:bg-gray-500 border-gray-100 dark:border-gray-600 rounded-lg shadow-sm w-full"
      :type="type" :placeholder="placeholder" :value="modelValue" @input="updateValue" :required="required"
      :disabled="disabled" />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: String,
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits();
const updateValue = (event) => {
  emit('update:modelValue', event.target.value);
};
</script>