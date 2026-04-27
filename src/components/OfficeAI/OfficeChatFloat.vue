<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import OfficeChatSession from './OfficeChatSession.vue'
import OfficeChatHistory from './OfficeChatHistory.vue'

const aiStore = useOfficeAIStore()
const router = useRouter()
const expanded = ref(false) // false = pill/mini, true = painel completo

const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputEl = ref(null)

function startEditTitle() {
  if (!aiStore.currentSessionId) return
  titleDraft.value = aiStore.currentSessionTitle
  editingTitle.value = true
  nextTick(() => titleInputEl.value?.select())
}

async function saveTitle() {
  editingTitle.value = false
  const trimmed = titleDraft.value.trim()
  if (trimmed && trimmed !== aiStore.currentSessionTitle) {
    await aiStore.renameSession(trimmed)
  }
}

function onTitleKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); saveTitle() }
  if (e.key === 'Escape') { editingTitle.value = false }
}

// Escuta navegação do Eme vinda do backend
function onEmeNavigate(e) {
  const { route, filters, message } = e.detail
  // Muda para modo flutuante ao navegar (se estava na home)
  if (aiStore.mode === 'home') aiStore.minimize()
  router.push({ path: route, query: filters || {} })
}

onMounted(() => {
  window.addEventListener('eme:navigate', onEmeNavigate)
  aiStore.loadStorageUsage()
})

onUnmounted(() => {
  window.removeEventListener('eme:navigate', onEmeNavigate)
})

function toggleExpand() {
  expanded.value = !expanded.value
}

function backToHome() {
  aiStore.setMode('home')
  router.push('/')
}
</script>

<template>
  <!-- Só exibe quando modo floating -->
  <Teleport to="body">
    <Transition name="float-slide">
      <div
        v-if="aiStore.mode === 'floating'"
        class="fixed bottom-5 right-5 z-50 flex flex-col shadow-2xl"
        :class="expanded ? 'w-80 sm:w-96 h-[32rem] rounded-2xl' : 'w-auto h-auto'"
      >
        <!-- Modo expandido: painel de chat -->
        <div v-if="expanded" class="flex flex-col h-full bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 bg-slate-800/80">
            <img src="/Mlogo.png" class="h-4 flex-shrink-0" alt="Eme" />

            <!-- Título editável -->
            <div class="flex-1 min-w-0">
              <input
                v-if="editingTitle"
                ref="titleInputEl"
                v-model="titleDraft"
                @blur="saveTitle"
                @keydown="onTitleKeydown"
                class="w-full text-xs text-gray-200 bg-transparent border-b border-slate-500 outline-none px-0.5 py-0.5"
                placeholder="Nome do chat..."
                maxlength="80"
              />
              <button
                v-else
                @click="startEditTitle"
                class="group flex items-center gap-1 w-full min-w-0"
                :title="aiStore.currentSessionTitle || 'Eme'"
              >
                <span class="text-xs text-gray-400 group-hover:text-gray-200 transition truncate">
                  {{ aiStore.currentSessionTitle || 'Eme' }}
                </span>
                <i v-if="aiStore.currentSessionId" class="fas fa-pen text-[9px] text-slate-600 group-hover:text-slate-400 transition flex-shrink-0" />
              </button>
            </div>

            <button @click="aiStore.newSession()" class="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition" title="Novo chat">
              <i class="fas fa-edit text-xs" />
            </button>
            <button @click="aiStore.historyOpen = !aiStore.historyOpen" class="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition">
              <i class="fas fa-clock-rotate-left text-xs" />
            </button>
            <button @click="backToHome" class="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition" title="Voltar à home">
              <i class="fas fa-maximize text-xs" />
            </button>
            <button @click="expanded = false" class="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition">
              <i class="fas fa-minus text-xs" />
            </button>
          </div>

          <!-- Histórico (overlay) -->
          <div v-if="aiStore.historyOpen" class="absolute inset-0 bg-slate-900 z-10 rounded-2xl">
            <OfficeChatHistory />
          </div>

          <!-- Chat -->
          <OfficeChatSession :compact="true" class="flex-1 min-h-0" />
        </div>

        <!-- Modo pill: botão flutuante com preview -->
        <div v-else class="flex items-center gap-2">
          <!-- Preview da última mensagem se estiver streamando -->
          <Transition name="fade">
            <div
              v-if="aiStore.isStreaming && aiStore.streamingText"
              class="max-w-56 bg-slate-900 border border-white/10 rounded-2xl rounded-br-sm px-3 py-2 text-xs text-gray-300 shadow-lg"
            >
              <p class="line-clamp-2">{{ aiStore.streamingText }}</p>
              <span class="inline-block w-1.5 h-3 ml-0.5 bg-blue-400 animate-pulse rounded-sm align-middle" />
            </div>
          </Transition>

          <!-- Botão circular -->
          <button
            @click="toggleExpand"
            class="w-16 h-16 rounded-full bg-slate-900 border border-white/5 shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform relative"
          >
            <img src="/Mlogo.png" class="h-8" alt="Eme" />
            <!-- Indicador de streaming -->
            <span
              v-if="aiStore.isStreaming"
              class="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900 animate-pulse"
            />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.float-slide-enter-active,
.float-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.float-slide-enter-from,
.float-slide-leave-to {
  transform: translateY(2rem) scale(0.9);
  opacity: 0;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
