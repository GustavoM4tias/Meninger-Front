<script setup>
import { computed } from 'vue'
import { inlineMd } from '../mdInline.js'

const props = defineProps({
  text: { type: String, default: '' },
})

const html = computed(() => inlineMd(props.text))
</script>

<template>
  <p v-if="html" class="text-xs text-ink-subtle italic" v-html="html" />
</template>
