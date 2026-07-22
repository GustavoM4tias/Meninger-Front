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
  <div
    class="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-p:text-ink-muted prose-strong:text-ink prose-headings:font-display prose-headings:text-ink prose-a:text-accent"
    v-html="html"
  />
</template>
