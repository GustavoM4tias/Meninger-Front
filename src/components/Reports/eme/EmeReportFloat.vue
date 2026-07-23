<script setup>
// Fase B — Eme flutuante sobre o relatório, no PADRÃO do player da Eme
// (OfficeChatFloat): fechada é a bolinha com o logo, arrastável e com posição
// persistida; aberta é o painel ancorado no CANTO ESQUERDO (não briga com a
// Eme global, que vive à direita). Mobile: bottom sheet.
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import IconButton from '@/components/UI/IconButton.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'
import { specOutline, BLOCK_LABELS } from '../blocks/registry.js'
import EmeChatThread from './EmeChatThread.vue'

const emit = defineEmits(['goto-block'])

// Estado exposto ao pai: com o painel aberto no desktop, o Builder desloca o
// relatório para a direita para que o painel nunca cubra o conteúdo.
const open = defineModel('open', { type: Boolean, default: true })

const store = useReportsStore()
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

// ── Bolinha arrastável (mesmo esquema do OfficeChatFloat, ancorada à ESQUERDA)
const POS_KEY = 'eme:report-fab:pos'
const DEFAULT_POS = { left: 20, bottom: 20 }
const pos = ref({ ...DEFAULT_POS })

function clampPos(p) {
  const padding = 8
  return {
    left: Math.max(padding, Math.min(p.left, window.innerWidth - 64 - padding)),
    bottom: Math.max(padding, Math.min(p.bottom, window.innerHeight - 64 - padding)),
  }
}
function loadPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || '')
    if (typeof p?.left === 'number' && typeof p?.bottom === 'number') pos.value = clampPos(p)
  } catch { /* ignore */ }
}
function savePos(p) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

const fabStyle = computed(() => ({ left: `${pos.value.left}px`, bottom: `${pos.value.bottom}px` }))

const DRAG_THRESHOLD = 5
const isDragging = ref(false)
let pointerDown = false
let startX = 0; let startY = 0; let startPos = null

function onPointerDown(e) {
  pointerDown = true
  isDragging.value = false
  startX = e.clientX
  startY = e.clientY
  startPos = { ...pos.value }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}
function onPointerMove(e) {
  if (!pointerDown) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!isDragging.value && Math.hypot(dx, dy) > DRAG_THRESHOLD) isDragging.value = true
  if (isDragging.value) pos.value = clampPos({ left: startPos.left + dx, bottom: startPos.bottom - dy })
}
function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  if (isDragging.value) savePos(pos.value)
  else open.value = true // tap puro → abre
  pointerDown = false
  setTimeout(() => { isDragging.value = false }, 0)
}
function onResize() { pos.value = clampPos(pos.value) }

onMounted(() => {
  loadPos()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <Teleport to="body">
    <!-- ── Bolinha da Eme (fechada) — arrastável ─────────────────────────── -->
    <div v-if="!open" class="fixed z-50" :style="fabStyle">
      <button
        type="button"
        :class="[
          'group relative h-14 w-14 rounded-full bg-surface-overlay border border-line shadow-overlay',
          'flex items-center justify-center transition-transform select-none touch-none',
          isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-110 active:scale-95',
        ]"
        :title="isDragging ? 'Arrastando…' : 'Clique para abrir · arraste para reposicionar'"
        @pointerdown.prevent="onPointerDown"
      >
        <span class="absolute inset-0 rounded-full bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <img src="/Mlogo.png" class="h-7 invert dark:invert-0 relative pointer-events-none" alt="Eme" draggable="false" />
        <span v-if="store.isStreaming" class="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
          <span class="relative inline-flex h-3 w-3 rounded-full bg-accent ring-2 ring-surface" />
        </span>
      </button>
    </div>

    <!-- ── Painel aberto — ancorado à ESQUERDA (mobile: bottom sheet) ────── -->
    <div
      v-else
      class="fixed z-50 flex flex-col bg-surface-overlay border border-line shadow-overlay overflow-hidden
             inset-x-0 bottom-0 rounded-t-2xl max-h-[72vh]
             sm:inset-x-auto sm:left-4 sm:bottom-4 sm:w-96 sm:rounded-2xl sm:h-[32rem] sm:max-h-[calc(100vh-6rem)]"
    >
      <!-- Header (padrão do player da Eme) -->
      <div class="flex items-center gap-1.5 px-3 py-2 border-b border-line bg-surface-raised flex-shrink-0">
        <img src="/Mlogo.png" class="h-4 flex-shrink-0 invert dark:invert-0" alt="Eme" />
        <span class="text-xs text-ink-muted flex-1 min-w-0 truncate">Eme · Relatório</span>
        <div class="flex items-center rounded-lg bg-surface-sunken p-0.5 mr-1">
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
        <IconButton icon="fas fa-minus" size="sm" label="Minimizar" @click="open = false" />
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
  </Teleport>
</template>
