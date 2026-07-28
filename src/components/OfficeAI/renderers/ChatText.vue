<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  content: { type: String, default: '' },
  streaming: { type: Boolean, default: false },
})

const html = computed(() => {
  if (!props.content) return ''
  const raw = marked.parse(props.content, { breaks: true, gfm: true })
  return DOMPurify.sanitize(raw)
})
</script>

<template>
  <div
    class="chat-text md-body md-body-sm max-w-none [overflow-wrap:anywhere]"
    v-html="html"
  />
  <span v-if="streaming" class="inline-block w-2 h-4 ml-1 bg-accent animate-pulse rounded-sm align-middle" />
</template>
