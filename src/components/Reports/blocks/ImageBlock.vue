<script setup>
import { computed, ref } from 'vue'
import { inlineMd } from '../mdInline.js'
import BlockEmpty from './BlockEmpty.vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  caption: { type: String, default: '' },
})

// Sem src, ou com um src que não carrega, a moldura ficava com o ícone de
// imagem quebrada no meio do documento.
const falhou = ref(false)
const captionHtml = computed(() => inlineMd(props.caption))
const semImagem = computed(() => !String(props.src || '').trim() || falhou.value)
</script>

<template>
  <BlockEmpty
    v-if="semImagem"
    label="Imagem indisponível"
    :hint="alt || 'A imagem não pôde ser carregada.'"
    icon="fas fa-image"
  />
  <figure v-else class="rounded-xl overflow-hidden border border-line bg-surface-raised shadow-soft">
    <img :src="src" :alt="alt" loading="lazy" class="w-full max-h-[480px] object-cover" @error="falhou = true" />
    <figcaption v-if="captionHtml" class="px-4 py-2.5 text-xs text-ink-subtle" v-html="captionHtml" />
  </figure>
</template>
