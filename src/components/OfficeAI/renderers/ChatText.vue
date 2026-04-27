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
    class="chat-text prose prose-sm max-w-none leading-relaxed
           text-gray-800 dark:text-gray-100
           prose-headings:text-gray-900 dark:prose-headings:text-gray-100
           prose-strong:text-gray-900 dark:prose-strong:text-gray-100
           prose-code:bg-gray-100 dark:prose-code:bg-slate-700
           prose-code:text-indigo-700 dark:prose-code:text-indigo-300
           prose-pre:bg-gray-100 dark:prose-pre:bg-slate-800
           prose-a:text-indigo-600 dark:prose-a:text-indigo-400
           prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400
           dark:prose-invert"
    v-html="html"
  />
  <span v-if="streaming" class="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse rounded-sm align-middle" />
</template>
