<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  markdown: { type: String, default: '' },
})

const html = computed(() =>
  DOMPurify.sanitize(marked.parse(props.markdown || '', { breaks: true, gfm: true }))
)
</script>

<template>
  <div class="md-body text-[15px] sm:text-base" v-html="html" />
</template>
