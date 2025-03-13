<template>
  <div class="input-field w-full mt-2 text-lg">
    <label v-if="label" class="block text-gray-700 dark:text-gray-200 font-semibold mb-1">
      {{ label }}
    </label>
    <button
      :class="['btn w-full text-lg md:text-xl p-3 border-0 rounded-lg cursor-pointer duration-200', customClass]"
      :type="type" :disabled="disabled" @click="handleClick">
      <slot></slot>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  type: { type: String, default: 'button' },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  customClass: { type: String, default: 'bg-blue-700 hover:bg-blue-800 text-gray-50' } 
});
</script>
