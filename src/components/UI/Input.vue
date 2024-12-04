<template>
  <div class="input-field w-full mt-2 text-lg">
    <label v-if="label" for="input-field" class="block text-gray-700 dark:text-gray-200 font-semibold mb-1">{{ label }}</label>
    <input class="p-3 border border-gray-100 text-gray-800 rounded-lg shadow-sm w-full" :type="type"
      :placeholder="placeholder" :value="modelValue" @input="updateValue" :required="required" />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: String,
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false }
});

const emit = defineEmits();
const updateValue = (event) => {
  emit('update:modelValue', event.target.value); // Emite o evento de atualização
};
</script>