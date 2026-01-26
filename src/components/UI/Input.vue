<template>
  <div class="input-field w-full mt-2">
    <label v-if="label" for="input-field" class="block text-gray-800 dark:text-gray-100 font-semibold mb-1">{{ label
      }}</label>
    <input
      class="p-3 md:text-xl border text-gray-800 dark:text-gray-100 placeholder:text-gray-500 placeholder:dark:text-gray-100 bg-gray-200 dark:bg-gray-600 border-gray-100 dark:border-gray-700 rounded-md shadow-sm w-full"
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