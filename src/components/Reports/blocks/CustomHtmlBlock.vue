<script setup>
import { computed } from 'vue'
import DOMPurify from 'dompurify'

const props = defineProps({
  html: { type: String, default: '' },
})

// Bloco de escape: HTML gerado pela Eme quando nenhum bloco do catálogo atende.
// Sanitizado aqui e também no backend antes de gravar. Sem scripts/iframes.
const safe = computed(() =>
  DOMPurify.sanitize(props.html || '', {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  })
)
</script>

<template>
  <div class="report-custom-html" v-html="safe" />
</template>

<style scoped>
.report-custom-html :deep(*) { max-width: 100%; }
</style>
