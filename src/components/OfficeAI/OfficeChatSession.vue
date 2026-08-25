<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import EmeContextBar from './EmeContextBar.vue';
import { useOfficeAIStore } from '@/stores/officeAIStore'
import { useAuthStore } from '@/stores/Settings/Auth/authStore'
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore'
import { useEmeVoice } from '@/composables/useEmeVoice'
import { randomEmePlaceholder } from '@/utils/OfficeAI/emePlaceholders'
import ChatMessage from './ChatMessage.vue'
import FeedbackModal from './FeedbackModal.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['minimize'])

const aiStore = useOfficeAIStore()
const authStore = useAuthStore()
const permStore = usePermissionStore()

// ── Voz ──────────────────────────────────────────────────────────────────────
const voice = useEmeVoice()
const voiceAvailable = computed(() => permStore.isAdmin && voice.isSupported)

// Placeholder-exemplo sorteado uma vez por carga — muda "de vez em quando".
const basePlaceholder = randomEmePlaceholder('Pergunte à Eme: ')

const composerPlaceholder = computed(() => {
  // Prioridade: estados de voz (incluindo PROCESSING) > streaming genérico
  const fromVoice = ({
    ARMED:      'Diga "Olá Eme"…',
    LISTENING:  voice.interimText.value || 'Te ouvindo…',
    PROCESSING: 'Eme está pensando…',
    SPEAKING:   'Respondendo… (microfone pausado)',
  }[voice.state.value])
  if (fromVoice) return fromVoice
  if (aiStore.isStreaming) return 'Aguarde…'
  return basePlaceholder
})

const composerStateClass = computed(() => ({
  OFF:        'border-line focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring/20',
  ARMED:      'border-accent/50 ring-2 ring-accent/20',
  LISTENING:  'border-data-neg/60 ring-2 ring-data-neg/20',
  PROCESSING: 'border-accent/60 ring-2 ring-accent/20',
  SPEAKING:   'border-data-warn/50 ring-2 ring-data-warn/20',
}[voice.state.value] || ''))

const alwaysOnPersisted = computed(() =>
  localStorage.getItem('eme:voice:always-on') === 'true'
)

const micIconClass = computed(() => {
  if (voice.state.value === 'OFF' && alwaysOnPersisted.value) {
    return 'fas fa-microphone text-data-warn animate-pulse'
  }
  return ({
    OFF:        'fas fa-microphone text-ink-subtle',
    ARMED:      'fas fa-microphone text-accent',
    LISTENING:  'fas fa-waveform-lines text-data-neg animate-pulse',
    PROCESSING: 'fas fa-circle-notch fa-spin text-accent',
    SPEAKING:   'fas fa-volume-high text-data-warn',
  }[voice.state.value])
})

const micTitle = computed(() => {
  const base = voice.statusLabel.value
  if (voice.state.value === 'OFF') return `${base} · Clique para ATIVAR voz (fica ligada até desativar)`
  return `${base} · Clique para DESATIVAR voz`
})

function onMicClick() {
  if (!voiceAvailable.value) return
  if (voice.state.value === 'OFF') voice.wakeUp()
  else voice.sleepUntilWoken()
}

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
      <!-- Abrindo uma conversa do histórico -->
      <div v-if="aiStore.carregandoMensagens"
        class="flex flex-col items-center justify-center h-full gap-3 px-2 text-center">
        <i class="fas fa-circle-notch fa-spin text-accent text-xl"></i>
        <p class="text-xs text-ink-muted">Abrindo a conversa…</p>
      </div>

      <!-- Não abriu: diz o motivo e oferece o caminho de volta -->
      <div v-else-if="aiStore.erroMensagens"
        class="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
        <div class="h-11 w-11 rounded-2xl bg-data-warn-soft border border-data-warn/25 grid place-items-center">
          <i class="fas fa-triangle-exclamation text-data-warn"></i>
        </div>
        <div>
          <p class="text-sm font-medium text-ink">Não consegui abrir esta conversa</p>
          <p class="text-xs text-ink-muted mt-0.5 max-w-[34ch]">{{ aiStore.erroMensagens }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" @click="aiStore.recarregarMensagens()"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-soft text-accent
                   hover:brightness-105 transition-all duration-120">
            <i class="fas fa-rotate mr-1.5"></i>Tentar de novo
          </button>
          <button type="button" @click="aiStore.newSession()"
            class="px-3 py-1.5 rounded-lg text-xs text-ink-subtle hover:text-ink transition-colors duration-120">
            Começar uma nova
          </button>
        </div>
      </div>

      <div v-else-if="!aiStore.messages.length && !aiStore.isStreaming"
        class="flex flex-col items-center justify-center h-full gap-4 px-2 text-center">
        <div class="h-12 w-12 rounded-2xl bg-accent-soft border border-accent/20 grid place-items-center animate-glow-pulse">
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

      <ChatMessage v-for="msg in aiStore.messages" :key="msg.id"
        :message="msg"
        :compact="compact"
        @feedback="(rating) => openFeedback(msg, rating)"
        @retry="aiStore.retryMessage(msg)"
        @storageHelp="aiStore.historyOpen = true"
      />

      <!-- Streaming: timeline do agente + texto parcial (dentro do ChatMessage) -->
      <ChatMessage v-if="aiStore.isStreaming"
        :message="{ role: 'assistant', content: aiStore.streamingText, metadata: {} }"
        :streaming="true"
        :compact="compact"
      />
    </div>

    <!-- Input -->
    <div class="border-t border-line px-3 py-3 bg-surface">
      <!-- Onde a pessoa está e o que ela apontou com Ctrl+clique -->
      <EmeContextBar />
      <div
        class="relative bg-surface-sunken border rounded-2xl flex items-end gap-2 px-2 py-1 transition"
        :class="composerStateClass">
        <textarea v-model="messageInput" @keydown="onKeydown"
          :placeholder="composerPlaceholder"
          :disabled="aiStore.isStreaming || aiStore.isAtStorageLimit" rows="1"
          :class="[
            'flex-1 bg-transparent border-none outline-none resize-none text-sm text-ink placeholder:text-ink-subtle',
            'eme-placeholder-1-linha',
            'max-h-32 min-h-[1.5rem] leading-relaxed py-2 px-2',
            voice.state.value === 'LISTENING' ? 'placeholder:text-ink placeholder:italic' : '',
          ]" />

        <div class="flex items-center gap-1.5 h-full my-auto pr-1 pb-1">
          <button v-if="voiceAvailable" type="button" @click="onMicClick"
            :title="micTitle"
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center transition',
              'bg-surface-raised hover:bg-accent-soft border border-line',
              voice.isActive.value ? 'ring-2 ring-offset-1 ring-offset-surface' : '',
              voice.state.value === 'LISTENING' ? 'ring-data-neg/40' : '',
              voice.state.value === 'ARMED' ? 'ring-accent/40' : '',
              voice.state.value === 'PROCESSING' ? 'ring-accent/40' : '',
              voice.state.value === 'SPEAKING' ? 'ring-data-warn/40' : '',
            ]">
            <i :class="micIconClass" class="text-xs" />
          </button>

          <button type="button" @click="send"
            :disabled="!messageInput.trim() || aiStore.isStreaming || aiStore.isAtStorageLimit"
            class="w-8 h-8 rounded-full flex items-center justify-center border transition-colors"
            :class="messageInput.trim() && !aiStore.isStreaming
              ? 'bg-accent text-white border-accent hover:bg-accent-hover shadow-glow-accent'
              : 'bg-surface-raised text-ink-subtle border-line cursor-not-allowed'">
            <i class="fas fa-arrow-up text-xs" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <FeedbackModal :open="feedbackModal.open" :rating="feedbackModal.rating" @confirm="confirmFeedback"
    @close="closeFeedback" />
</template>

<style scoped>
/* O placeholder é uma frase-exemplo ("Pergunte à Eme: teto de comissão do...").
   Numa caixa estreita ela rolava dentro do campo e a pessoa via meia frase em
   movimento. Uma linha só, cortada com reticências. */
.eme-placeholder-1-linha::placeholder {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
