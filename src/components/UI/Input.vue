<template>
  <div class="input-field w-full my-6">
    <input class="p-3 border border-gray-100 text-gray-800 rounded-lg shadow-sm w-full" :type="type"
      :placeholder="placeholder" :value="modelValue" @input="updateValue" :required="required" />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: String,
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false }
});

const emit = defineEmits();
const updateValue = (event) => {
  emit('update:modelValue', event.target.value); // Emite o evento de atualização
};
</script>