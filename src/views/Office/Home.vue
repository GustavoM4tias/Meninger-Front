<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore } from '@/stores/Settings/Auth/authStore'
import { useBuildingStore } from '@/stores/Comercial/Building/buildingStore'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import WeatherInfo from '@/components/Home/WeatherInfo.vue'
import OfficeChatHistory from '@/components/OfficeAI/OfficeChatHistory.vue'
import ChatText from '@/components/OfficeAI/renderers/ChatText.vue'
import ChatTable from '@/components/OfficeAI/renderers/ChatTable.vue'
import ChatChart from '@/components/OfficeAI/renderers/ChatChart.vue'
import ChatNavAction from '@/components/OfficeAI/renderers/ChatNavAction.vue'
import FeedbackModal from '@/components/OfficeAI/FeedbackModal.vue'
import ChatLeadsActions from '@/components/OfficeAI/renderers/ChatLeadsActions.vue'
import ChatEventsActions from '@/components/OfficeAI/renderers/ChatEventsActions.vue'
import ChatEnterprisesActions from '@/components/OfficeAI/renderers/ChatEnterprisesActions.vue'
import ChatEnterpriseDetail from '@/components/OfficeAI/renderers/ChatEnterpriseDetail.vue'

const authStore = useAuthStore()
const buildingStore = useBuildingStore()
const aiStore = useOfficeAIStore()

const messageInput = ref('')
const messagesEl = ref(null)
const textareaEl = ref(null)
const titleInputEl = ref(null)
const editingTitle = ref(false)
const titleDraft = ref('')
const isChatMode = computed(() => aiStore.messages.length > 0 || aiStore.isStreaming)

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

onMounted(() => {
  aiStore.setMode('home')
  aiStore.loadStorageUsage()
})

onUnmounted(() => {
  if (aiStore.hasSession || aiStore.messages.length > 0) {
    aiStore.setMode('floating')
  } else {
    aiStore.setMode('hidden')
  }
})

watch(
  () => authStore.user?.city,
  async (city) => {
    if (!city) { buildingStore.weather = null; return }
    await buildingStore.getWeatherByCity(city)
  },
  { immediate: true }
)

watch(
  () => [aiStore.messages.length, aiStore.streamingText],
  () => nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }),
  { deep: true }
)

function autoResize() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 180) + 'px'
}

const suggestions = [
  { label: 'Leads deste mes',          icon: '📊', prompt: 'Mostre os leads deste mes' },
  { label: 'Leads por situação',           icon: '📡', prompt: 'Mostre um grafico de leads agrupados por situação' },
  { label: 'Abrir relatorio de leads',  icon: '🔗', prompt: 'Abra o relatorio de leads com filtro do mes atual' },
  { label: 'Eventos do mes',            icon: '📅', prompt: 'Quais eventos temos este mes?' },
  { label: 'Relatório de eventos',            icon: '📚', prompt: 'Gere o relatório de eventos para o mes atual' },
]

function sendSuggestion(prompt) { aiStore.sendMessage(prompt) }

function send() {
  const text = messageInput.value.trim()
  if (!text || aiStore.isStreaming || aiStore.isAtStorageLimit) return
  messageInput.value = ''
  nextTick(() => { if (textareaEl.value) textareaEl.value.style.height = 'auto' })
  aiStore.sendMessage(text)
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}

function getAction(msg) { return msg.metadata?.action || null }

const feedbackModal = ref({ open: false, msgId: null, rating: null })

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
  <main class="flex flex-col w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-gray-50 dark:bg-slate-950">

    <!-- MODO LANDING -->
    <Transition name="fade" mode="out-in">
      <div v-if="!isChatMode" key="landing"
        class="flex flex-col items-center justify-center h-full gap-6 px-4 pb-8 relative">

        <div v-if="authStore.user" class="absolute top-4 right-4 opacity-50 hover:opacity-100 transition">
          <WeatherInfo
            :weather="buildingStore.weather?.current_weather ?? buildingStore.weather"
            :city="authStore.user.city"
          />
        </div>

        <div class="w-full text-start md:max-w-3xl">
          <h1 class="text-4xl font-light text-gray-900 dark:text-white mb-1">
            Olá<span v-if="authStore.user?.username">, {{ authStore.user.username }}</span>
          </h1>
          <p class="text-gray-500 dark:text-slate-500 text-lg">O que posso fazer por você hoje?</p>
        </div>

        <div class="w-full md:max-w-3xl">
          <div class="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-xl">
            <textarea
              ref="textareaEl"
              v-model="messageInput"
              @keydown="onKeydown"
              @input="autoResize"
              placeholder="Pergunte ao Eme..."
              :disabled="aiStore.isAtStorageLimit"
              rows="1"
              class="w-full bg-transparent outline-none resize-none border-none text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-600 px-5 pt-4 pb-2 max-h-44 leading-relaxed"
            />
            <div class="flex items-center justify-between px-4 pb-3 pt-1">
              <button
                @click="aiStore.historyOpen = true"
                class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-xl transition"
              >
                <i class="fas fa-clock-rotate-left" />
                Historico
              </button>
              <button
                @click="send"
                :disabled="!messageInput.trim() || aiStore.isAtStorageLimit"
                class="w-9 h-9 rounded-full flex items-center justify-center transition"
                :class="messageInput.trim() ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'"
              >
                <i class="fas fa-arrow-up text-sm" />
              </button>
            </div>
          </div>

          <div v-if="aiStore.isAtStorageLimit"
            class="flex items-center gap-2 mt-3 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300">
            <i class="fas fa-database" />
            Limite de 20 MB atingido.
            <button class="underline ml-1" @click="aiStore.historyOpen = true">Exclua alguns chats</button> para continuar.
          </div>
        </div>

        <div class="flex flex-wrap gap-2 justify-center max-w-2xl">
          <button
            v-for="item in suggestions" :key="item.label"
            @click="sendSuggestion(item.prompt)"
            class="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-gray-500 dark:text-slate-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-300 transition"
          >
            <span>{{ item.icon }}</span>
            {{ item.label }}
          </button>
        </div>
      </div>

      <!-- MODO CHAT -->
      <div v-else key="chat" class="flex flex-col h-full relative">

        <div class="absolute top-3 left-2 flex items-center gap-0.5">
          <button
            @click="aiStore.historyOpen = !aiStore.historyOpen"
            class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-400 transition"
            title="Historico"
          >
            <i class="fas fa-clock-rotate-left" />
          </button>
          <button
            @click="aiStore.newSession()"
            class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-600 hover:text-gray-600 dark:hover:text-slate-400 transition"
            title="Novo chat"
          >
            <i class="fas fa-edit" />
          </button>

          <!-- Título da sessão editável -->
          <div v-if="aiStore.currentSessionId" class="ml-1 pt-1">
            <input
              v-if="editingTitle"
              ref="titleInputEl"
              v-model="titleDraft"
              @blur="saveTitle"
              @keydown="onTitleKeydown"
              class="text-sm text-gray-700 dark:text-gray-200 bg-transparent border-b border-gray-300 dark:border-slate-600 outline-none px-1 py-0.5 w-48 max-w-xs"
              placeholder="Nome do chat..."
              maxlength="80"
            />
            <button
              v-else
              @click="startEditTitle"
              class="group flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition max-w-xs"
              title="Renomear chat"
            >
              <span class="text-sm text-gray-500 dark:text-slate-500 group-hover:text-gray-700 dark:group-hover:text-slate-300 truncate max-w-[12rem]">
                {{ aiStore.currentSessionTitle || 'Chat sem título' }}
              </span>
              <i class="fas fa-pen text-[10px] text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors flex-shrink-0" />
            </button>
          </div>
        </div>

        <div class="flex-1 min-h-0">
          <div ref="messagesEl" class="h-full overflow-y-auto py-6">
            <div class="max-w-3xl mx-auto px-4 space-y-6">

              <template v-for="msg in aiStore.messages" :key="msg.id">
                <div v-if="msg.role === 'user'" class="flex justify-end">
                  <div class="max-w-[75%] bg-indigo-500 dark:bg-slate-800 text-white dark:text-gray-100 rounded-3xl rounded-br-md px-4 py-2 text-sm leading-relaxed">
                    {{ msg.content }}
                  </div>
                </div>

                <div v-else class="flex gap-3 items-start">
                  <img src="/Mlogo.png" class="h-5 md:h-7 invert dark:invert-0" alt="Eme" />
                  <div class="flex-1 min-w-0 pt-0.5 space-y-2">
                    <div v-if="msg.response_type === 'error' && msg.metadata?.storageLimit"
                      class="flex items-start gap-2 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300">
                      <i class="fas fa-database mt-0.5 flex-shrink-0" />
                      <span>Limite de 20 MB atingido.
                        <button class="underline ml-1" @click="aiStore.historyOpen = true">Exclua alguns chats</button> para continuar.
                      </span>
                    </div>
                    <span v-else-if="msg.response_type === 'error'" class="text-sm text-slate-600 italic">{{ msg.content }}</span>
                    <template v-else>
                      <ChatNavAction v-if="getAction(msg)?.type === 'navigate'" :action="getAction(msg)" />
                      <ChatText v-if="msg.content" :content="msg.content" />
                      <ChatTable
                        v-if="getAction(msg)?.type === 'table'"
                        :title="getAction(msg).title"
                        :columns="getAction(msg).columns"
                        :rows="getAction(msg).rows"
                        :total="getAction(msg).total"
                      />
                      <ChatChart
                        v-if="getAction(msg)?.type === 'chart'"
                        :chart-type="getAction(msg).chartType"
                        :title="getAction(msg).title"
                        :labels="getAction(msg).labels"
                        :data="getAction(msg).data"
                      />
                      <ChatLeadsActions
                        v-if="getAction(msg)?.context?.source === 'leads'"
                        :context="getAction(msg).context"
                      />
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
                      <!-- Feedback + Retry -->
                      <div class="flex items-center gap-1 mt-1.5">
                        <button
                          @click="openFeedback(msg, 'up')"
                          class="p-1 rounded-lg transition text-xs"
                          :class="msg.feedback === 'up' ? 'text-green-500' : 'text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400'"
                          title="Boa resposta"
                        >
                          <i class="fas fa-thumbs-up" />
                        </button>
                        <button
                          @click="openFeedback(msg, 'down')"
                          class="p-1 rounded-lg transition text-xs"
                          :class="msg.feedback === 'down' ? 'text-red-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400'"
                          title="Resposta ruim"
                        >
                          <i class="fas fa-thumbs-down" />
                        </button>
                        <button
                          @click="aiStore.retryMessage(msg)"
                          :disabled="aiStore.isStreaming"
                          class="p-1 rounded-lg transition text-xs text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 disabled:opacity-30"
                          title="Refazer resposta"
                        >
                          <i class="fas fa-rotate-right" />
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </template>

              <div v-if="aiStore.isStreaming" class="flex gap-3 items-start">
                <img src="/Mlogo.png" class="h-7 invert dark:invert-0" alt="Eme" />
                <div class="flex-1 min-w-0 pt-0.5">
                  <ChatText v-if="aiStore.streamingText" :content="aiStore.streamingText" :streaming="true" />
                  <div v-else class="flex gap-1.5 py-1">
                    <span class="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-700 animate-bounce" style="animation-delay:0ms" />
                    <span class="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-700 animate-bounce" style="animation-delay:150ms" />
                    <span class="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-700 animate-bounce" style="animation-delay:300ms" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="flex-shrink-0 px-4 pb-5 pt-2">
          <div class="max-w-3xl mx-auto">
            <div class="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-none">
              <textarea
                ref="textareaEl"
                v-model="messageInput"
                @keydown="onKeydown"
                @input="autoResize"
                :placeholder="aiStore.isStreaming ? 'Aguardando Eme...' : 'Mensagem para Eme...'"
                :disabled="aiStore.isStreaming || aiStore.isAtStorageLimit"
                rows="1"
                class="w-full bg-transparent outline-none border-none resize-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-600 px-5 pt-3.5 pb-2 max-h-44 leading-relaxed disabled:opacity-40"
              />
              <div class="flex items-center justify-end px-4 pb-3">
                <button
                  @click="send"
                  :disabled="!messageInput.trim() || aiStore.isStreaming || aiStore.isAtStorageLimit"
                  class="w-8 h-8 rounded-full flex items-center justify-center transition"
                  :class="messageInput.trim() && !aiStore.isStreaming ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'"
                >
                  <i class="fas fa-arrow-up text-xs" />
                </button>
              </div>
            </div>
            <p class="text-center text-[11px] text-gray-400 dark:text-slate-700 mt-2">Eme pode cometer erros. Verifique informações importantes.</p>
          </div>
        </div>

      </div>
    </Transition>

    <FeedbackModal
      :open="feedbackModal.open"
      :rating="feedbackModal.rating"
      @confirm="confirmFeedback"
      @close="closeFeedback"
    />

    <!-- MODAL HISTORICO - padrao unico para ambos os modos -->
    <Transition name="slide-up">
      <div
        v-if="aiStore.historyOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-end sm:items-center justify-center"
        @click.self="aiStore.historyOpen = false"
      >
        <div class="w-full max-w-sm sm:rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-2xl max-h-[80vh] flex flex-col">
          <OfficeChatHistory />
        </div>
      </div>
    </Transition>

  </main>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.22s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(10px); }
</style>
