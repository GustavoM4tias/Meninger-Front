<script setup>
// Fase B — Eme flutuante sobre o relatório: outline dos blocos + chat contextual.
// Desktop: cartão flutuante no canto inferior direito. Mobile: bottom sheet.
import { ref, computed, watch } from 'vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'
import { specOutline, BLOCK_LABELS } from '../blocks/registry.js'
import EmeChatThread from './EmeChatThread.vue'

const emit = defineEmits(['goto-block'])

const store = useReportsStore()
const open = ref(true)
const tab = ref('chat') // chat | outline
const draft = ref('')

const outline = computed(() => specOutline(store.spec))

function send() {
  const msg = draft.value.trim()
  if (!msg) return
  draft.value = ''
  store.sendMessage(msg)
}

function clearSelection() { store.selectBlock(null) }

// Bloco selecionado no relatório → abre o chat com contexto
watch(() => store.selectedBlock, (b) => {
  if (b) { open.value = true; tab.value = 'chat' }
})
</script>

<template>
  <!-- Botão recolhido -->
  <button
    v-if="!open"
    class="fixed bottom-4 right-4 z-40 px-4 py-3 rounded-full bg-accent text-white shadow-overlay flex items-center gap-2 hover:bg-accent-hover transition"
    @click="open = true"
  >
    <i class="fas fa-wand-magic-sparkles" />
    <span class="text-sm font-medium">Eme</span>
    <span v-if="store.isStreaming" class="w-2 h-2 rounded-full bg-white animate-pulse" />
  </button>

  <!-- Painel flutuante / bottom sheet -->
  <div
    v-else
    class="fixed z-40 flex flex-col bg-surface-overlay border border-line shadow-overlay
           inset-x-0 bottom-0 rounded-t-2xl max-h-[72vh]
           sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px] sm:rounded-2xl sm:max-h-[560px] sm:h-[560px]"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 px-3.5 py-2.5 border-b border-line flex-shrink-0">
      <span class="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center flex-shrink-0">
        <i class="fas fa-wand-magic-sparkles text-xs" />
      </span>
      <p class="text-sm font-semibold text-ink">Eme</p>
      <div class="ml-auto flex items-center rounded-lg bg-surface-sunken p-0.5">
        <button
          class="px-2.5 py-1 rounded-md text-xs transition"
          :class="tab === 'chat' ? 'bg-surface-raised shadow-soft text-ink font-medium' : 'text-ink-subtle'"
          @click="tab = 'chat'"
        >Chat</button>
        <button
          class="px-2.5 py-1 rounded-md text-xs transition"
          :class="tab === 'outline' ? 'bg-surface-raised shadow-soft text-ink font-medium' : 'text-ink-subtle'"
          @click="tab = 'outline'"
        >Itens ({{ store.blockCount }})</button>
      </div>
      <button class="ml-1 w-7 h-7 rounded-lg text-ink-subtle hover:bg-surface-sunken transition" aria-label="Minimizar" @click="open = false">
        <i class="fas fa-chevron-down text-xs" />
      </button>
    </div>

    <!-- Outline dos itens -->
    <div v-if="tab === 'outline'" class="flex-1 overflow-y-auto px-2.5 py-2.5 min-h-0">
      <div v-for="sec in outline" :key="sec.id" class="mb-1.5">
        <button
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm font-medium text-ink hover:bg-surface-sunken transition"
          @click="emit('goto-block', sec.id)"
        >
          <span v-if="sec.num" class="w-5 h-5 rounded-full border border-accent/40 text-accent text-[10px] flex items-center justify-center flex-shrink-0">{{ sec.num }}</span>
          <i v-else class="fas fa-shapes text-[10px] text-ink-subtle w-5 text-center flex-shrink-0" />
          <span class="truncate">{{ sec.title }}</span>
        </button>
        <button
          v-for="child in sec.children" :key="child.id"
          class="w-full flex items-center gap-2 pl-9 pr-2.5 py-1 rounded-lg text-left text-xs text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
          @click="emit('goto-block', child.id)"
        >
          <span class="w-1 h-1 rounded-full bg-ink-subtle flex-shrink-0" />
          <span class="truncate">{{ child.label }}</span>
          <span class="ml-auto text-[10px] text-ink-subtle flex-shrink-0">{{ BLOCK_LABELS[child.type] }}</span>
        </button>
      </div>
      <p v-if="!outline.length" class="text-xs text-ink-subtle px-2.5 py-4 text-center">Nenhum bloco ainda.</p>
    </div>

    <!-- Chat -->
    <template v-else>
      <EmeChatThread
        :messages="store.messages"
        :streaming-text="store.streamingText"
        :is-streaming="store.isStreaming"
        :tool-progress="store.toolProgress"
        compact
      />
      <!-- Contexto de bloco selecionado -->
      <div v-if="store.selectedBlock" class="mx-3 mb-1.5 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1.5 text-xs text-accent flex-shrink-0">
        <i class="fas fa-crosshairs" />
        <span class="truncate">Editando: {{ store.selectedBlock.props?.title || BLOCK_LABELS[store.selectedBlock.type] || store.selectedBlock.id }}</span>
        <button class="ml-auto hover:opacity-70" aria-label="Limpar seleção" @click="clearSelection"><i class="fas fa-xmark" /></button>
      </div>
      <div class="p-2.5 border-t border-line flex-shrink-0">
        <form class="flex items-end gap-2" @submit.prevent="send">
          <textarea
            v-model="draft"
            rows="1"
            :placeholder="store.selectedBlock ? 'O que mudar neste bloco?' : 'Peça um ajuste no relatório...'"
            class="flex-1 resize-none rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-ring"
            @keydown.enter.exact.prevent="send"
          />
          <button
            type="submit"
            :disabled="store.isStreaming || !draft.trim()"
            class="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 transition flex-shrink-0"
            aria-label="Enviar"
          >
            <i class="fas fa-paper-plane text-xs" />
          </button>
        </form>
      </div>
    </template>
  </div>
</template>
