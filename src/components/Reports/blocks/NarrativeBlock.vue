<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  markdown: { type: String, default: '' },
})

// A IA às vezes escapa as quebras ("\n" literal). O backend já normaliza ao
// salvar; aqui é a rede de segurança para specs antigos e para o preview.
const html = computed(() => {
  const text = String(props.markdown || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
  return DOMPurify.sanitize(marked.parse(text, { breaks: true, gfm: true }))
})
</script>

<template>
  <div class="md-body text-[15px] sm:text-base" v-html="html" />
</template>
