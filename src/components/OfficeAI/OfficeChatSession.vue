<script setup>
import { ref, nextTick, watch } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import ChatText from './renderers/ChatText.vue'
import ChatTable from './renderers/ChatTable.vue'
import ChatChart from './renderers/ChatChart.vue'
import ChatNavAction from './renderers/ChatNavAction.vue'
import ChatLeadsActions from './renderers/ChatLeadsActions.vue'
import ChatEventsActions from './renderers/ChatEventsActions.vue'
import ChatEnterprisesActions from './renderers/ChatEnterprisesActions.vue'
import ChatEnterpriseDetail from './renderers/ChatEnterpriseDetail.vue'
import FeedbackModal from './FeedbackModal.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['minimize'])

const aiStore = useOfficeAIStore()
const messageInput = ref('')
const messagesEl = ref(null)

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
        class="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <img src="/Mlogo.png" class="h-10" alt="Eme" />
        <p class="text-sm">Pergunte qualquer coisa sobre o sistema</p>
      </div>

      <template v-for="msg in aiStore.messages" :key="msg.id">
        <!-- Usuário -->
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div
            class="max-w-[80%] bg-slate-700 text-gray-100 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
            {{ msg.content }}
          </div>
        </div>

        <!-- Assistente -->
        <div v-else class="flex gap-2.5 items-start max-w-[90%]">
          <img src="/Mlogo.png" class="h-5 mt-0.5" alt="Eme" />
          <div class="flex-1 min-w-0">
            <ChatNavAction v-if="getAction(msg)?.type === 'navigate'" :action="getAction(msg)" />
            <ChatText v-if="parseContent(msg)" :content="parseContent(msg)" />
            <ChatTable v-if="getAction(msg)?.type === 'table'" :title="getAction(msg).title"
              :columns="getAction(msg).columns" :rows="getAction(msg).rows" :total="getAction(msg).total" />
            <ChatChart v-if="getAction(msg)?.type === 'chart'" :chart-type="getAction(msg).chartType"
              :title="getAction(msg).title" :labels="getAction(msg).labels" :data="getAction(msg).data" />
            <ChatLeadsActions v-if="getAction(msg)?.context?.source === 'leads'" :context="getAction(msg).context" />
            <ChatEventsActions
              v-if="getAction(msg)?.context?.source === 'events'"
              :context="getAction(msg).context"
              :rows="getAction(msg).rows || getAction(msg).rawRows || []"
            />
            <ChatEnterprisesActions
              v-if="getAction(msg)?.context?.source === 'enterprises'"
              :context="getAction(msg).context"
            />
            <ChatEnterpriseDetail
              v-if="getAction(msg)?.type === 'detail'"
              :action="getAction(msg)"
            />
            <div v-if="msg.response_type === 'error' && msg.metadata?.storageLimit"
              class="flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300 mt-2">
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
                :class="msg.feedback === 'up' ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'"
                title="Boa resposta">
                <i class="fas fa-thumbs-up" />
              </button>
              <button @click="openFeedback(msg, 'down')" class="p-1 rounded-lg transition text-xs"
                :class="msg.feedback === 'down' ? 'text-red-400' : 'text-gray-600 hover:text-gray-400'"
                title="Resposta ruim">
                <i class="fas fa-thumbs-down" />
              </button>
              <button @click="aiStore.retryMessage(msg)" :disabled="aiStore.isStreaming"
                class="p-1 rounded-lg transition text-xs text-gray-600 hover:text-gray-400 disabled:opacity-30"
                title="Refazer resposta">
                <i class="fas fa-rotate-right" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Streaming -->
      <div v-if="aiStore.isStreaming" class="flex gap-2.5 items-start max-w-[90%]">
        <img src="/Mlogo.png" class="h-6" alt="Eme" />
        <div class="flex-1 min-w-0">
          <ChatText v-if="aiStore.streamingText" :content="aiStore.streamingText" :streaming="true" />
          <div v-else class="flex gap-1 py-2">
            <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay: 0ms" />
            <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay: 150ms" />
            <span class="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style="animation-delay: 300ms" />
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-white/5 px-3 py-3">
      <div
        class="relative bg-slate-800 rounded-2xl flex items-end gap-2 px-2 py-1 focus-within:ring-1 focus-within:ring-white/20 transition">
        <textarea v-model="messageInput" @keydown="onKeydown"
          :placeholder="aiStore.isStreaming ? 'Aguarde...' : 'Mensagem para Eme...'"
          :disabled="aiStore.isStreaming || aiStore.isAtStorageLimit" rows="1"
          class="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-100 placeholder-gray-500 max-h-32 min-h-[1.5rem] leading-relaxed" />

        <div class="flex justify-end h-full my-auto">
          <button @click="send" :disabled="!messageInput.trim() || aiStore.isStreaming || aiStore.isAtStorageLimit"
            class="w-8 h-8 rounded-full flex items-center justify-center transition"
            :class="messageInput.trim() && !aiStore.isStreaming ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 dark:bg-slate-700/80 text-gray-400 dark:text-slate-500 cursor-not-allowed'">
            <i class="fas fa-arrow-up text-xs" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <FeedbackModal :open="feedbackModal.open" :rating="feedbackModal.rating" @confirm="confirmFeedback"
    @close="closeFeedback" />
</template>
