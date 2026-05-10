<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import { useAuthStore } from '@/stores/Settings/Auth/authStore'
import ChatText from './renderers/ChatText.vue'
import ChatTable from './renderers/ChatTable.vue'
import ChatChart from './renderers/ChatChart.vue'
import ChatNavAction from './renderers/ChatNavAction.vue'
import ChatLeadsActions from './renderers/ChatLeadsActions.vue'
import ChatEventsActions from './renderers/ChatEventsActions.vue'
import ChatEnterprisesActions from './renderers/ChatEnterprisesActions.vue'
import ChatEnterpriseDetail from './renderers/ChatEnterpriseDetail.vue'
import ChatMcmvActions from './renderers/ChatMcmvActions.vue'
import ChatPrecadastrosSummary from './renderers/ChatPrecadastrosSummary.vue'
import ChatPrecadastrosActions from './renderers/ChatPrecadastrosActions.vue'
import ChatReservasSummary from './renderers/ChatReservasSummary.vue'
import ChatReservasActions from './renderers/ChatReservasActions.vue'
import FeedbackModal from './FeedbackModal.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['minimize'])

const aiStore = useOfficeAIStore()
const authStore = useAuthStore()

// Texto do composer vem da store — permite pré-preencher de fora
// (ex: "Criar via Eme" na página de alertas).
const messageInput = computed({
  get: () => aiStore.composerDraft,
  set: (v) => aiStore.setDraft(v),
})
const messagesEl = ref(null)

// Pega só o primeiro nome do user pra saudação.
const firstName = computed(() => {
  const full = authStore.user?.username || ''
  return full.split(/\s+/)[0] || ''
})

// Sugestões rápidas no empty state — clique manda direto pra Eme.
const quickPrompts = [
  { icon: '📊', text: 'Resumo de leads deste mês' },
  { icon: '📅', text: 'Eventos da próxima semana' },
  { icon: '🔔', text: 'Quero criar um alerta recorrente' },
  { icon: '🏢', text: 'Empreendimentos em vendas' },
]
function sendQuick(text) {
  messageInput.value = text
  send()
}

// feedback modal state
const feedbackModal = ref({ open: false, msgId: null, rating: null })

watch(() => [aiStore.messages.length, aiStore.streamingText], () => {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
}, { deep: true })

function send() {
  const text = messageInput.value.trim()
  if (!text || aiStore.isStreaming) return
  messageInput.value = ''
  aiStore.sendMessage(text)
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function getAction(msg) {
  return msg.metadata?.action || null
}

// Detecta se a action é de um determinado módulo, olhando em vários lugares
// (context.source, source top-level e tipo). Robusto a variações.
function actionSource(msg) {
  const a = getAction(msg)
  if (!a) return null
  if (a.context?.source) return a.context.source
  if (a.source)          return a.source
  if (typeof a.type === 'string') {
    if (a.type === 'precadastros_summary') return 'precadastros'
    if (a.type === 'reservas_summary')     return 'reservas'
    if (a.type === 'enterprise_detail')    return 'enterprises'
  }
  return null
}

function actionContext(msg) {
  return getAction(msg)?.context || {}
}

function parseContent(msg) {
  if (msg.role === 'assistant' && msg.metadata?.action) {
    return msg.content || ''
  }
  return msg.content || ''
}

function openFeedback(msg, rating) {
  feedbackModal.value = { open: true, msgId: msg.id, rating }
}

function closeFeedback() {
  feedbackModal.value = { open: false, msgId: null, rating: null }
}

async function confirmFeedback({ comment }) {
  const { msgId, rating } = feedbackModal.value
  closeFeedback()
  await aiStore.sendFeedback(msgId, rating, comment)
}
</script>

<template>
  <div class="flex flex-col h-full" v-bind="$attrs">
    <!-- Mensagens -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
      :class="compact ? 'text-sm' : ''">
      <div v-if="!aiStore.messages.length && !aiStore.isStreaming"
        class="flex flex-col items-center justify-center h-full gap-4 px-2 text-center">
        <div class="h-12 w-12 rounded-2xl bg-accent-soft border border-accent/20 grid place-items-center">
          <img src="/Mlogo.png" class="h-6 invert dark:invert-0" alt="Eme" />
        </div>
        <div>
          <p class="text-base font-medium text-ink">
            Olá<span v-if="firstName">, <span class="text-accent">{{ firstName }}</span></span>
          </p>
          <p class="text-sm text-ink-muted mt-0.5">O que posso fazer por você hoje?</p>
        </div>
        <div class="grid grid-cols-1 gap-1.5 w-full max-w-xs">
          <button v-for="q in quickPrompts" :key="q.text" type="button"
            @click="sendQuick(q.text)"
            class="text-left text-xs px-3 py-2 rounded-lg border border-line bg-surface-raised
                   hover:border-accent/40 hover:bg-accent-soft/40 hover:text-accent transition-colors text-ink">
            <span class="mr-1.5">{{ q.icon }}</span>{{ q.text }}
          </button>
        </div>
      </div>

      <template v-for="msg in aiStore.messages" :key="msg.id">
        <!-- Usuário -->
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div
            class="max-w-[80%] bg-accent text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-soft">
            {{ msg.content }}
          </div>
        </div>

        <!-- Assistente -->
        <div v-else class="flex gap-2.5 items-start max-w-[90%]">
          <img src="/Mlogo.png" class="h-5 mt-0.5 invert dark:invert-0" alt="Eme" />
          <div class="flex-1 min-w-0">
            <ChatNavAction v-if="getAction(msg)?.type === 'navigate'" :action="getAction(msg)" />
            <ChatText v-if="parseContent(msg)" :content="parseContent(msg)" />
            <ChatTable v-if="getAction(msg)?.type === 'table'" :title="getAction(msg).title"
              :columns="getAction(msg).columns" :rows="getAction(msg).rows" :total="getAction(msg).total" />
            <ChatChart v-if="getAction(msg)?.type === 'chart'" :chart-type="getAction(msg).chartType"
              :title="getAction(msg).title" :labels="getAction(msg).labels" :data="getAction(msg).data" />
            <ChatLeadsActions v-if="actionSource(msg) === 'leads'" :context="actionContext(msg)" />
            <ChatEventsActions
              v-if="actionSource(msg) === 'events'"
              :context="actionContext(msg)"
              :rows="getAction(msg).rows || getAction(msg).rawRows || []"
            />
            <ChatEnterprisesActions
              v-if="actionSource(msg) === 'enterprises'"
              :context="actionContext(msg)"
            />
            <ChatEnterpriseDetail
              v-if="getAction(msg)?.type === 'detail'"
              :action="getAction(msg)"
            />
            <ChatPrecadastrosSummary
              v-if="getAction(msg)?.type === 'precadastros_summary'"
              :action="getAction(msg)"
            />
            <ChatReservasSummary
              v-if="getAction(msg)?.type === 'reservas_summary'"
              :action="getAction(msg)"
            />
            <ChatMcmvActions
              v-if="actionSource(msg) === 'mcmv'"
              :context="actionContext(msg)"
            />
            <ChatPrecadastrosActions
              v-if="actionSource(msg) === 'precadastros'"
              :context="actionContext(msg)"
            />
            <ChatReservasActions
              v-if="actionSource(msg) === 'reservas'"
              :context="actionContext(msg)"
            />
            <div v-if="msg.response_type === 'error' && msg.metadata?.storageLimit"
              class="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20
                     text-sm text-amber-700 dark:text-amber-300 mt-2">
              <i class="fas fa-database mt-0.5" />
              <div>
                Você atingiu o limite de armazenamento (20 MB).
                <button class="underline ml-1" @click="aiStore.historyOpen = true">Exclua alguns chats</button> para
                continuar.
              </div>
            </div>

            <!-- Feedback + Retry -->
            <div v-if="msg.response_type !== 'error'" class="flex items-center gap-1 mt-1.5">
              <button @click="openFeedback(msg, 'up')" class="p-1 rounded-lg transition text-xs"
                :class="msg.feedback === 'up' ? 'text-emerald-500' : 'text-ink-subtle hover:text-ink-muted'"
                title="Boa resposta">
                <i class="fas fa-thumbs-up" />
              </button>
              <button @click="openFeedback(msg, 'down')" class="p-1 rounded-lg transition text-xs"
                :class="msg.feedback === 'down' ? 'text-red-500' : 'text-ink-subtle hover:text-ink-muted'"
                title="Resposta ruim">
                <i class="fas fa-thumbs-down" />
              </button>
              <button @click="aiStore.retryMessage(msg)" :disabled="aiStore.isStreaming"
                class="p-1 rounded-lg transition text-xs text-ink-subtle hover:text-ink-muted disabled:opacity-30"
                title="Refazer resposta">
                <i class="fas fa-rotate-right" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Streaming -->
      <div v-if="aiStore.isStreaming" class="flex gap-2.5 items-start max-w-[90%]">
        <img src="/Mlogo.png" class="h-6 invert dark:invert-0" alt="Eme" />
        <div class="flex-1 min-w-0">
          <ChatText v-if="aiStore.streamingText" :content="aiStore.streamingText" :streaming="true" />
          <div v-else class="flex gap-1 py-2">
            <span class="w-2 h-2 rounded-full bg-ink-subtle animate-bounce" style="animation-delay: 0ms" />
            <span class="w-2 h-2 rounded-full bg-ink-subtle animate-bounce" style="animation-delay: 150ms" />
            <span class="w-2 h-2 rounded-full bg-ink-subtle animate-bounce" style="animation-delay: 300ms" />
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-line px-3 py-3 bg-surface">
      <div
        class="relative bg-surface-sunken border border-line rounded-2xl flex items-end gap-2 px-2 py-1
               focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring/20 transition">
        <textarea v-model="messageInput" @keydown="onKeydown"
          :placeholder="aiStore.isStreaming ? 'Aguarde…' : 'Pergunte ao Eme…'"
          :disabled="aiStore.isStreaming || aiStore.isAtStorageLimit" rows="1"
          class="flex-1 bg-transparent border-none outline-none resize-none text-sm text-ink placeholder:text-ink-subtle
                 max-h-32 min-h-[1.5rem] leading-relaxed py-2 px-2" />

        <div class="flex justify-end h-full my-auto pr-1 pb-1">
          <button @click="send" :disabled="!messageInput.trim() || aiStore.isStreaming || aiStore.isAtStorageLimit"
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            :class="messageInput.trim() && !aiStore.isStreaming
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-surface-raised text-ink-subtle cursor-not-allowed'">
            <i class="fas fa-arrow-up text-xs" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <FeedbackModal :open="feedbackModal.open" :rating="feedbackModal.rating" @confirm="confirmFeedback"
    @close="closeFeedback" />
</template>
