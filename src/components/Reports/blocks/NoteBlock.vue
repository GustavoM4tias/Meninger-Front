<script setup>
defineProps({
  text: { type: String, default: '' },
})
</script>

<template>
  <p class="text-xs text-ink-subtle italic">{{ text }}</p>
</template>
