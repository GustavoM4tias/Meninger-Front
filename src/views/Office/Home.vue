<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useBuildingStore } from '@/stores/Comercial/Building/buildingStore';
import { useOfficeAIStore } from '@/stores/officeAIStore';

import WeatherInfo from '@/components/Home/WeatherInfo.vue';
import OfficeChatHistory from '@/components/OfficeAI/OfficeChatHistory.vue';
import FeedbackModal from '@/components/OfficeAI/FeedbackModal.vue';

import ChatComposer from '@/components/OfficeAI/ChatComposer.vue';
import ChatMessage from '@/components/OfficeAI/ChatMessage.vue';
import ChatLandingSuggestions from '@/components/OfficeAI/ChatLandingSuggestions.vue';
import ChatTitleEditor from '@/components/OfficeAI/ChatTitleEditor.vue';

import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';

const authStore = useAuthStore();
const buildingStore = useBuildingStore();
const aiStore = useOfficeAIStore();

// Texto do composer compartilhado com o float — permite pré-preencher de fora
const messageInput = computed({
  get: () => aiStore.composerDraft,
  set: (v) => aiStore.setDraft(v),
});
const messagesEl = ref(null);

const isChatMode = computed(() => aiStore.messages.length > 0 || aiStore.isStreaming);

const SUGGESTIONS = [
  { label: 'Leads deste mês',              icon: '📊', prompt: 'Mostre os leads deste mes' },
  { label: 'Abrir relatório de leads',     icon: '🔗', prompt: 'Abra o relatorio de leads com filtro do mes atual' },
  { label: 'Eventos do mês',               icon: '📅', prompt: 'Quais eventos temos este mes?' },
  { label: 'Relatório de eventos',         icon: '📚', prompt: 'Gere o relatório de eventos para o mes atual' },
  { label: 'Faixas Minha Casa Minha Vida', icon: '🏠', prompt: 'Qual o teto do Minha Casa Minha Vida na minha cidade' },
];

// ─── Lifecycle ──────────────────────────────────────────
onMounted(() => {
  aiStore.setMode('home');
  aiStore.loadStorageUsage();
});

onUnmounted(() => {
  aiStore.setMode(aiStore.hasSession || aiStore.messages.length > 0 ? 'floating' : 'hidden');
});

watch(() => authStore.user?.city, async (city) => {
  if (!city) { buildingStore.weather = null; return; }
  await buildingStore.getWeatherByCity(city);
}, { immediate: true });

watch(() => [aiStore.messages.length, aiStore.streamingText],
  () => nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }), { deep: true }
);

// ─── Actions ────────────────────────────────────────────
function send(text) {
  if (!text || aiStore.isStreaming || aiStore.isAtStorageLimit) return;
  aiStore.sendMessage(text);
}

// ─── Feedback ───────────────────────────────────────────
const feedbackModal = ref({ open: false, msgId: null, rating: null });

function openFeedback(msg, rating) {
  feedbackModal.value = { open: true, msgId: msg.id, rating };
}
function closeFeedback() { feedbackModal.value = { open: false, msgId: null, rating: null }; }
async function confirmFeedback({ comment }) {
  const { msgId, rating } = feedbackModal.value;
  closeFeedback();
  await aiStore.sendFeedback(msgId, rating, comment);
}
</script>

<template>
  <main class="flex flex-col w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-surface">

    <Transition name="fade" mode="out-in">

      <!-- ── LANDING ─────────────────────────────────────── -->
      <div v-if="!isChatMode" key="landing"
        class="flex flex-col items-center justify-center h-full gap-6 px-4 pb-8 relative">

        <div v-if="authStore.user" class="absolute top-4 right-4 opacity-60 hover:opacity-100 transition-opacity">
          <WeatherInfo :weather="buildingStore.weather?.current_weather ?? buildingStore.weather"
            :city="authStore.user.city" />
        </div>

        <div class="w-full md:max-w-3xl">
          <h1 class="text-3xl sm:text-4xl font-light text-ink mb-1">
            Olá<span v-if="authStore.user?.username">, <span class="text-accent font-medium">{{ authStore.user.username }}</span></span>
          </h1>
          <p class="text-ink-muted text-base sm:text-lg">O que posso fazer por você hoje?</p>
        </div>

        <div class="w-full md:max-w-3xl">
          <ChatComposer
            v-model="messageInput"
            size="lg"
            placeholder="Pergunte ao Eme..."
            :disabled="aiStore.isAtStorageLimit"
            :is-streaming="aiStore.isStreaming"
            show-history-button
            @send="send"
            @history="aiStore.historyOpen = true"
          />

          <div v-if="aiStore.isAtStorageLimit"
            class="flex items-center gap-2 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
            <i class="fas fa-database"></i>
            Limite de 20 MB atingido.
            <button class="underline ml-1" @click="aiStore.historyOpen = true">Exclua alguns chats</button> para continuar.
          </div>
        </div>

        <ChatLandingSuggestions :suggestions="SUGGESTIONS" @select="send" />
      </div>

      <!-- ── CHAT ────────────────────────────────────────── -->
      <div v-else key="chat" class="flex flex-col h-full relative">

        <div class="absolute top-2 left-2 flex items-center gap-0.5 z-10">
          <IconButton icon="fas fa-clock-rotate-left" label="Histórico"
            @click="aiStore.historyOpen = !aiStore.historyOpen" />
          <IconButton icon="fas fa-edit" label="Novo chat" @click="aiStore.newSession()" />

          <div v-if="aiStore.currentSessionId" class="ml-1">
            <ChatTitleEditor
              :title="aiStore.currentSessionTitle"
              @rename="(title) => aiStore.renameSession(title)"
            />
          </div>
        </div>

        <div class="flex-1 min-h-0">
          <div ref="messagesEl" class="h-full overflow-y-auto py-12">
            <div class="max-w-3xl mx-auto px-4 space-y-6">
              <ChatMessage v-for="msg in aiStore.messages" :key="msg.id"
                :message="msg"
                @feedback="(rating) => openFeedback(msg, rating)"
                @retry="aiStore.retryMessage(msg)"
                @storageHelp="aiStore.historyOpen = true"
              />

              <div v-if="aiStore.isStreaming" class="flex gap-3 items-start">
                <img src="/Mlogo.png" class="h-7 invert dark:invert-0" alt="Eme" />
                <div class="flex-1 min-w-0 pt-0.5">
                  <ChatMessage v-if="aiStore.streamingText"
                    :message="{ role: 'assistant', content: aiStore.streamingText, metadata: {} }"
                    :streaming="true" />
                  <div v-else class="flex gap-1.5 py-1">
                    <span class="w-2 h-2 rounded-full bg-ink-subtle animate-bounce" style="animation-delay:0ms"></span>
                    <span class="w-2 h-2 rounded-full bg-ink-subtle animate-bounce" style="animation-delay:150ms"></span>
                    <span class="w-2 h-2 rounded-full bg-ink-subtle animate-bounce" style="animation-delay:300ms"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-shrink-0 px-4 pb-5 pt-2 bg-gradient-to-t from-surface via-surface/95 to-transparent">
          <div class="max-w-3xl mx-auto">
            <ChatComposer
              v-model="messageInput"
              size="md"
              :placeholder="aiStore.isStreaming ? 'Aguardando Eme...' : 'Mensagem para Eme...'"
              :disabled="aiStore.isAtStorageLimit"
              :is-streaming="aiStore.isStreaming"
              @send="send"
            />
            <p class="text-center text-[11px] text-ink-subtle mt-2 font-mono">
              Eme pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <FeedbackModal :open="feedbackModal.open" :rating="feedbackModal.rating"
      @confirm="confirmFeedback" @close="closeFeedback" />

    <!-- Modal histórico -->
    <Modal :open="aiStore.historyOpen" size="sm" hide-close
      @close="aiStore.historyOpen = false">
      <OfficeChatHistory />
    </Modal>
  </main>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
