<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { useBuildingStore } from '@/stores/Comercial/Building/buildingStore';
import { useOfficeAIStore } from '@/stores/officeAIStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

import WeatherInfo from '@/components/Home/WeatherInfo.vue';
import OfficeChatHistory from '@/components/OfficeAI/OfficeChatHistory.vue';
import FeedbackModal from '@/components/OfficeAI/FeedbackModal.vue';

import ChatComposer from '@/components/OfficeAI/ChatComposer.vue';
import ChatMessage from '@/components/OfficeAI/ChatMessage.vue';
import ChatLandingSuggestions from '@/components/OfficeAI/ChatLandingSuggestions.vue';
import ChatTitleEditor from '@/components/OfficeAI/ChatTitleEditor.vue';

import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import { randomEmePlaceholder } from '@/utils/OfficeAI/emePlaceholders';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

// Placeholder sorteado uma vez por carregamento — muda "de vez em quando".
const emePlaceholder = randomEmePlaceholder();

const authStore = useAuthStore();
const permStore = usePermissionStore();
const buildingStore = useBuildingStore();
const aiStore = useOfficeAIStore();

// Texto do composer compartilhado com o float — permite pré-preencher de fora
const messageInput = computed({
  get: () => aiStore.composerDraft,
  set: (v) => aiStore.setDraft(v),
});
const messagesEl = ref(null);

const isChatMode = computed(() => aiStore.messages.length > 0 || aiStore.isStreaming);

// ─── Saudação por horário + primeiro nome ───────────────
const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
});
const firstName = computed(() => (authStore.user?.username || '').split(/\s+/)[0] || '');

// ─── Sugestões ──────────────────────────────────────────
// `route` gera o filtro por permissão: quem não pode acessar a tela não vê a
// sugestão. Sem `route` = sempre visível. Admin vê tudo (hasAccess retorna true).
// Pool de sugestões. Cada item mapeia uma capacidade REAL da Eme (uma tool que
// responde de fato) + `route` para o gate de permissão (quem não acessa a tela
// não vê a sugestão; sem `route` = sempre visível; admin vê tudo).
const SUGGESTION_POOL = [
  // Marketing
  { label: 'Leads deste mês',        sublabel: 'Resumo e conversão do período', icon: 'fas fa-chart-simple',        route: '/marketing/leads',        prompt: 'Mostre o resumo de leads deste mês' },
  { label: 'Relatório de eventos',   sublabel: 'Gerar para o mês atual',        icon: 'fas fa-calendar-days',       route: '/marketing/events',       prompt: 'Gere o relatório de eventos para o mês atual' },
  // Comercial
  { label: 'Faixas MCMV',            sublabel: 'Teto na sua cidade',            icon: 'fas fa-house-circle-check',  route: '/comercial/mcmv',         prompt: 'Qual o teto do Minha Casa Minha Vida na minha cidade?' },
  { label: 'Empreendimentos ativos', sublabel: 'Portfólio em vendas',           icon: 'fas fa-building',            route: '/comercial/buildings',    prompt: 'Quais empreendimentos estão ativos em vendas?' },
  { label: 'Pré-cadastros',          sublabel: 'Análises de crédito do mês',    icon: 'fas fa-folder-open',         route: '/comercial/precadastros', prompt: 'Como estão os pré-cadastros deste mês?' },
  { label: 'Reservas',               sublabel: 'Funil da reserva à venda',      icon: 'fas fa-file-signature',      route: '/comercial/reservas-report', prompt: 'Como está o funil de reservas?' },
  { label: 'Imobiliárias parceiras', sublabel: 'Quem atua na sua região',       icon: 'fas fa-house-flag',          route: '/comercial/imobiliarias', prompt: 'Quais imobiliárias parceiras atuam na minha região?' },
  { label: 'Fichas comerciais',      sublabel: 'Condições por empreendimento',  icon: 'fas fa-clipboard-list',      route: '/comercial/conditions',   prompt: 'Quais fichas comerciais temos disponíveis?' },
  // Financeiro (gated por alçada)
  { label: 'Custos do mês',          sublabel: 'Pago por empreendimento',       icon: 'fas fa-coins',               route: '/financeiro/custos',      prompt: 'Quais os custos deste mês por empreendimento?' },
  { label: 'Boletos Caixa',          sublabel: 'Emitidos, pagos e pendentes',   icon: 'fas fa-barcode',             route: '/financeiro/boleto-caixa', prompt: 'Como estão os boletos Caixa deste mês?' },
  // Pessoas / Contratos
  { label: 'Quem é o gestor',        sublabel: 'Pessoas e organograma',         icon: 'fas fa-user-tie',            route: '/settings/organograma',   prompt: 'Quem é o gestor do Marketing?' },
  { label: 'Contratos no validador', sublabel: 'Quantos e em que etapa',        icon: 'fas fa-file-circle-check',   route: '/validator',        prompt: 'Quantos contratos estão na análise do validador?' },
  // Perfil (sempre disponível)
  { label: 'Minhas tarefas',         sublabel: 'Do checklist, com prazos',      icon: 'fas fa-list-check',          route: '/checklists',             prompt: 'Quais são as minhas tarefas de checklist?' },
  { label: 'Meus relatórios',        sublabel: 'Os que você pode ver',          icon: 'fas fa-chart-pie',           route: '/relatorios',             prompt: 'Quais relatórios eu tenho acesso?' },
  { label: 'Minhas notificações',    sublabel: 'Ativar/desativar por canal',    icon: 'fas fa-bell',                route: null,                      prompt: 'Quero ver e ajustar minhas preferências de notificação' },
];

const MAX_SUGGESTIONS = 6;

// Só as que o usuário pode acessar (admin vê tudo; sem route = sempre visível).
const permittedSuggestions = computed(() =>
  SUGGESTION_POOL.filter(s => !s.route || permStore.hasAccess(s.route))
);

// Mostra até 6, girando a janela por PERFIL (usuário) + DIA: varia por pessoa e
// ao longo dos dias sem ficar estático, mas fica estável dentro do dia (não
// "pisca" a cada render nem quando o histórico carrega).
const visibleSuggestions = computed(() => {
  const pool = permittedSuggestions.value;
  if (pool.length <= MAX_SUGGESTIONS) return pool;
  const seed = (Number(authStore.user?.id) || 0) + new Date().getDate();
  const off = ((seed % pool.length) + pool.length) % pool.length;
  return [...pool.slice(off), ...pool.slice(0, off)].slice(0, MAX_SUGGESTIONS);
});

// ─── Conversas recentes (inline na landing) ─────────────
const recentSessions = computed(() =>
  [...aiStore.sessions]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5)
);
function openSession(id) { aiStore.loadMessages(id); }
function fromNow(d) { return dayjs(d).fromNow(); }

// ─── Lifecycle ──────────────────────────────────────────
onMounted(() => {
  aiStore.setMode('home');
  // A home da Eme é sempre um chat NOVO. Antes o `currentSessionId` sobrevivia
  // enquanto a aba estivesse aberta, então um dia inteiro de perguntas sem
  // relação caía tudo na mesma sessão (e o histórico parecia não estar
  // salvando). A conversa anterior já está salva e fica em "Conversas
  // recentes". Não interrompe uma resposta em andamento.
  if (!aiStore.isStreaming) aiStore.newSession();
  aiStore.loadStorageUsage();
  aiStore.loadSessions();
  permStore.ensureLoaded();
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
  <!-- dvh: no iOS Safari 100vh inclui a barra de URL e cortava o composer -->
  <main class="flex flex-col w-full h-[calc(100vh-3rem)] supports-[height:100dvh]:h-[calc(100dvh-3rem)] overflow-hidden bg-surface">

    <Transition name="fade" mode="out-in">

      <!-- ── LANDING ─────────────────────────────────────── -->
      <div v-if="!isChatMode" key="landing"
        class="h-full overflow-y-auto">
        <div class="relative min-h-full flex flex-col items-center px-4 py-8 sm:py-10">

          <div v-if="authStore.user" class="absolute top-4 right-4 z-10">
            <WeatherInfo :weather="buildingStore.weather?.current_weather ?? buildingStore.weather"
              :city="authStore.user.city" />
          </div>

          <div class="w-full md:max-w-3xl flex flex-col gap-6 my-auto">

            <!-- Cabeçalho -->
            <div class="relative z-10 text-center">
              <div class="mx-auto mb-4 h-14 w-14 rounded-2xl bg-accent grid place-items-center animate-glow-pulse">
                <img src="/Mlogo.png" class="h-7 invert-0" alt="Eme" />
              </div>
              <h1 class="text-3xl sm:text-4xl font-light text-ink mb-1">
                {{ greeting }}<span v-if="firstName">, <span class="text-accent font-medium">{{ firstName }}</span></span>
              </h1>
              <p class="text-ink-muted text-base sm:text-lg">Sou a Eme. O que posso resolver por você hoje?</p>
            </div>

            <!-- Input -->
            <div class="w-full">
              <div class="relative">
                <ChatComposer
                  v-model="messageInput"
                  size="lg"
                  :placeholder="emePlaceholder"
                  :disabled="aiStore.isAtStorageLimit"
                  :is-streaming="aiStore.isStreaming"
                  assistant-badge
                  class="relative z-10"
                  @send="send"
                />
              </div>

              <div v-if="aiStore.isAtStorageLimit"
                class="relative z-10 flex items-center gap-2 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                <i class="fas fa-database"></i>
                Limite de 20 MB atingido.
                <button class="underline ml-1" @click="aiStore.historyOpen = true">Exclua alguns chats</button> para continuar.
              </div>
            </div>

            <!-- Sugestões (filtradas por permissão) -->
            <ChatLandingSuggestions class="relative z-10" :suggestions="visibleSuggestions" @select="send" />

            <!-- Conversas recentes -->
            <div v-if="recentSessions.length" class="relative z-10 w-full">
              <div class="flex items-center justify-between mb-3">
                <p class="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-ink-subtle">
                  <i class="fas fa-clock-rotate-left text-accent/70"></i>
                  Conversas recentes
                </p>
                <button type="button" @click="aiStore.historyOpen = true"
                  class="text-xs font-medium text-accent hover:underline">
                  Ver tudo
                </button>
              </div>
              <div class="space-y-2">
                <button v-for="(s, i) in recentSessions" :key="s.id"
                  @click="openSession(s.id)"
                  :style="{ animationDelay: `${i * 70}ms` }"
                  class="group w-full flex items-center gap-3 text-left p-3 rounded-lg
                         bg-surface-raised border border-line
                         animate-slide-up [animation-fill-mode:backwards]
                         hover:border-accent/60 hover:bg-accent-soft/40 hover:-translate-y-0.5
                         hover:ring-2 hover:ring-accent-ring/25 hover:shadow-glow-blue
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring/30
                         transition-all duration-200 ease-out-expo">
                  <span class="shrink-0 h-8 w-8 grid place-items-center rounded-lg bg-surface-sunken
                               border border-line text-ink-muted group-hover:text-accent
                               group-hover:border-accent/40 transition-colors">
                    <i class="far fa-comment text-xs"></i>
                  </span>
                  <span class="min-w-0 flex-1 text-sm text-ink truncate group-hover:text-accent transition-colors">
                    {{ s.title || 'Chat sem título' }}
                  </span>
                  <span class="shrink-0 text-micro text-ink-subtle font-mono">{{ fromNow(s.updated_at) }}</span>
                </button>
              </div>
            </div>

            <p class="relative z-10 text-center text-micro text-ink-subtle font-mono pt-1">
              A Eme pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </div>
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

              <!-- Streaming: timeline do agente + texto parcial (o ChatMessage
                   já desenha o avatar — antes apareciam dois logos lado a lado) -->
              <ChatMessage v-if="aiStore.isStreaming"
                :message="{ role: 'assistant', content: aiStore.streamingText, metadata: {} }"
                :streaming="true" />
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
            <p class="text-center text-micro text-ink-subtle mt-2 font-mono">
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
