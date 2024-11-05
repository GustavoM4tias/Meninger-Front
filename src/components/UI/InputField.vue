<template>
    <div class="input-field w-full my-4">
      <input 
        :type="type" 
        :placeholder="placeholder" 
        :value="modelValue" 
        @input="updateValue"
        :required="required"
        class="input"
      />
    </div>
  </template>
  
  <script setup>
  import { defineProps, defineEmits } from 'vue';
  
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
  
  <style scoped>
  .input {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 100%;
  }
  </style>
  