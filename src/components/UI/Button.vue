<template>
    <button class="btn bg-blue-700 hover:bg-blue-800 w-full text-gray-50 text-2xl py-2.5 px-3 my-5 border-0 rounded-lg cursor-pointer duration-200" :type="type" @click="handleClick">
      <slot></slot>
    </button>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps({
    type: { type: String, default: 'button' }
  });

  const emit = defineEmits();
  
  const handleClick = () => {
    emit('click');
  };
  </script>
  