<script setup>
// Thread de mensagens do builder (compartilhada entre Fase A e Fase B).
import { computed, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  streamingText: { type: String, default: '' },
  isStreaming: { type: Boolean, default: false },
  toolProgress: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

const scroller = ref(null)
const md = (text) => DOMPurify.sanitize(marked.parse(text || '', { breaks: true, gfm: true }))

const hasRunningTools = computed(() => props.toolProgress.some((t) => t.status === 'running'))

watch(
  () => [props.messages.length, props.streamingText, props.toolProgress.length],
  () => nextTick(() => {
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
  })
)
</script>

<template>
  <div ref="scroller" class="flex-1 overflow-y-auto px-3 py-3 space-y-3">
    <div
      v-for="m in messages" :key="m.id"
      class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
    >
      <div
        class="max-w-[88%] rounded-2xl px-3.5 py-2 text-sm"
        :class="m.role === 'user'
          ? 'bg-accent text-white rounded-br-md'
          : 'bg-surface-sunken text-ink rounded-bl-md'"
      >
        <div v-if="m.role === 'user'" class="whitespace-pre-wrap">{{ m.content }}</div>
        <div v-else class="prose prose-sm dark:prose-invert max-w-none" v-html="md(m.content)" />
      </div>
    </div>

    <!-- Progresso das tools (busca de dados / montagem) -->
    <div v-if="toolProgress.length && (isStreaming || hasRunningTools)" class="space-y-1.5">
      <div
        v-for="(t, i) in toolProgress" :key="i"
        class="flex items-center gap-2 text-xs rounded-lg border border-line bg-surface-raised px-3 py-2"
      >
        <i
          :class="t.status === 'running'
            ? 'fas fa-circle-notch fa-spin text-accent'
            : t.status === 'ok' ? 'fas fa-check text-emerald-500' : 'fas fa-triangle-exclamation text-amber-500'"
          class="w-4 text-center flex-shrink-0"
        />
        <span class="font-medium text-ink truncate">{{ t.label }}</span>
        <span v-if="t.summary" class="text-ink-subtle truncate ml-auto">{{ t.summary }}</span>
      </div>
    </div>

    <!-- Texto em streaming -->
    <div v-if="streamingText" class="flex justify-start">
      <div class="max-w-[88%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm bg-surface-sunken text-ink">
        <div class="prose prose-sm dark:prose-invert max-w-none" v-html="md(streamingText)" />
        <span class="inline-block w-1.5 h-4 bg-accent animate-pulse rounded-sm align-text-bottom" />
      </div>
    </div>
    <div v-else-if="isStreaming && !toolProgress.length" class="flex items-center gap-2 text-xs text-ink-subtle px-1">
      <i class="fas fa-circle-notch fa-spin text-accent" /> Eme pensando...
    </div>
  </div>
</template>
