<script setup>
import { computed } from 'vue'
import DOMPurify from 'dompurify'
import BlockEmpty from './BlockEmpty.vue'

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
  <BlockEmpty v-if="!safe.trim()" label="Bloco personalizado" hint="Sem conteúdo gerado." icon="fas fa-code" />
  <div v-else class="report-custom-html" v-html="safe" />
</template>

<style scoped>
.report-custom-html :deep(*) { max-width: 100%; }
</style>
