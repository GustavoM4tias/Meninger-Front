<template>
    <button class="btn bg-blue-700 hover:bg-blue-800 w-full text-gray-50 text-2xl py-2.5 px-3 my-5 border-0 rounded-lg cursor-pointer duration-200" :type="type" :disabled="disabled" @click="handleClick">
      <slot></slot>
    </button>
  </template>
  
  <script setup>
  const props = defineProps({
    type: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false }
  });
  </script>
  