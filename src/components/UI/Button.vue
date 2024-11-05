<template>
    <button class="btn bg-blue-700 hover:bg-blue-800 w-full text-gray-50 py-1.5 px-3 my-2 border-0 rounded-md cursor-pointer duration-200" :type="type" @click="handleClick">
      <slot></slot>
    </button>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps({
    type: { type: String, default: 'button' }
  });
  
  const handleClick = () => {
    emit('click');
  };
  </script>
  