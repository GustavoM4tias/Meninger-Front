<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useOfficeAIStore } from '@/stores/officeAIStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { initEmeVoice, useEmeVoice, enqueueSpeech, onAllSpeechDone, cancelSpeech, markConversationActive } from '@/composables/useEmeVoice';
import OfficeChatSession from './OfficeChatSession.vue';
import OfficeChatHistory from './OfficeChatHistory.vue';
import ChatTitleEditor from './ChatTitleEditor.vue';
import IconButton from '@/components/UI/IconButton.vue';

const aiStore = useOfficeAIStore();
const permStore = usePermissionStore();
const router = useRouter();
const route  = useRoute();
const expanded = ref(false);

// ── Inicialização da voz da Eme (admin only) ───────────────────────────────
// Preferências persistidas.
const TTS_KEY = 'eme:voice:tts';
const ALWAYS_ON_KEY = 'eme:voice:always-on';
const ttsEnabled  = ref(localStorage.getItem(TTS_KEY) !== 'false');
// Default OFF — ngm é ouvido sem querer. Usuário ativa 1x e fica ativo até desativar.
const alwaysOn    = ref(localStorage.getItem(ALWAYS_ON_KEY) === 'true');
watch(ttsEnabled, v => localStorage.setItem(TTS_KEY, v ? 'true' : 'false'));
watch(alwaysOn,   v => localStorage.setItem(ALWAYS_ON_KEY, v ? 'true' : 'false'));

const pendingSpeak = ref(false);
const voice = useEmeVoice();
const { arm, resumeAfterSpeaking, toggleArmed, finishProcessing, state: voiceState } = voice;

function setupVoice() {
  initEmeVoice({
    ttsEnabled,
    alwaysOn,   // push-to-talk após resposta → continua armado pra "Olá Eme"
    onCapture: (text, { willSpeak }) => {
      // Garante que o float está aberto pra mostrar a interação
      if (route.path !== '/' && route.name !== 'Home') {
        expanded.value = true;
      }
      pendingSpeak.value = willSpeak;
      aiStore.sendMessage(text, { viaVoice: true });
    },
  });
}

// Tenta armar a voz. Se falhar por falta de permissão de mic ou autoplay,
// engata um listener "uma única vez" pro primeiro click/keydown.
let autoArmFallbackInstalled = false;
async function tryAutoArm() {
  if (!permStore.isAdmin) return;
  if (!alwaysOn.value) return;
  if (!voice.isSupported) {
    console.warn('[Eme Voice] Reconhecimento de voz não suportado nesse navegador');
    return;
  }
  if (voiceState.value !== 'OFF') return;

  let permission = 'prompt';
  try {
    const status = await navigator.permissions?.query?.({ name: 'microphone' });
    permission = status?.state || 'prompt';
  } catch { /* Firefox e outros — permissions API limitada */ }

  if (permission === 'granted') {
    arm({ silent: true });
    return;
  }
  if (permission === 'denied') {
    console.warn('[Eme Voice] Permissão de microfone NEGADA — libere no cadeado da URL');
    return;
  }

  if (autoArmFallbackInstalled) return;
  autoArmFallbackInstalled = true;

  const handler = () => {
    autoArmFallbackInstalled = false;
    window.removeEventListener('click', handler, true);
    window.removeEventListener('keydown', handler, true);
    if (alwaysOn.value && voiceState.value === 'OFF' && permStore.isAdmin) {
      arm({ silent: true });
    }
  };
  window.addEventListener('click', handler, { once: false, capture: true });
  window.addEventListener('keydown', handler, { once: false, capture: true });
}

// Roda quando admin é confirmado (permissões carregam async no boot)
watch(() => permStore.isAdmin, (v) => {
  if (v) {
    setupVoice();
    tryAutoArm();
  }
}, { immediate: true });

// Se o user habilitar "sempre-ativo" depois, tenta armar.
// Se desabilitar, desliga.
watch(alwaysOn, (on) => {
  if (on) tryAutoArm();
  else if (voiceState.value === 'ARMED') voice.stop();
});

// ── TTS após streaming terminar ──────────────────────────────────────────────
// Estratégia simples e robusta: espera a resposta INTEIRA chegar, depois
// extrai as frases e enfileira em ordem. Sem sobreposição, sem cortes pelo
// meio, sem problemas com 'replace' events do backend.
function stripMarkdown(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ');
}

// Divide o texto em até N frases pra enfileirar.
function splitIntoSentences(text, max = 6) {
  const clean = stripMarkdown(text).trim();
  if (!clean) return [];
  // Quebra por pontuação forte (.!?) seguida de espaço/fim
  const raw = clean.split(/(?<=[.!?])\s+/).filter(s => s.trim().length >= 3);
  return raw.slice(0, max);
}

watch(() => aiStore.isStreaming, (now, prev) => {
  if (!(prev && !now)) return;

  // Resposta chegou — entramos em "conversa ativa": próxima pergunta aceita só "Eme"
  markConversationActive();

  if (voiceState.value !== 'PROCESSING') return;

  const willSpeak = pendingSpeak.value;
  pendingSpeak.value = false;
  console.log('[Eme Voice] Streaming terminou. TTS habilitado:', willSpeak);

  if (!willSpeak) {
    cancelSpeech();
    finishProcessing();
    return;
  }

  // Pega o texto da última mensagem da assistente (já filtrado anti-alucinação)
  const last = aiStore.messages[aiStore.messages.length - 1];
  const sentences = last?.role === 'assistant'
    ? splitIntoSentences(last.content, 6)
    : [];

  console.log('[Eme Voice] Frases pra TTS:', sentences.length);
  for (const s of sentences) {
    enqueueSpeech(s.trim());
  }

  // Vai pra SPEAKING; quando a fila esvaziar, libera o mic
  finishProcessing();
  onAllSpeechDone(() => {
    console.log('[Eme Voice] Fala terminada — re-armando');
    resumeAfterSpeaking();
  });
});

// Atalho global Alt+Shift+E — modo hands-free (ARMED, espera "Olá Eme")
function onVoiceShortcut(e) {
  // Match: Alt+Shift+E (Windows/Linux) ou Option+Shift+E (Mac)
  // Em alguns layouts, Alt+Shift produz outro char no e.key; o e.code é mais confiável.
  const isE = e.code === 'KeyE' || e.key === 'E' || e.key === 'e' || e.key === '´' || e.key === 'É';
  if (!(e.altKey && e.shiftKey && isE)) return;
  e.preventDefault();
  e.stopPropagation();

  if (!permStore.isAdmin) return;
  toggleArmed();
}

// ── Visibilidade ────────────────────────────────────────────────────────────
// Mostra como pill em qualquer rota EXCETO a home (que tem UI própria da Eme)
// e o builder de relatórios (onde a Eme já é o painel fixo da tela — dois
// chats flutuantes ao mesmo tempo confundem).
const isOnHome = computed(() => {
  const p = route.path || '';
  return p === '/' || p === '' || route.name === 'Home';
});
const isOnReportBuilder = computed(() => route.name === 'Builder de Relatório');
const showFloat = computed(() => !isOnHome.value && !isOnReportBuilder.value);

// ── Posição do FAB (persistida em localStorage) ─────────────────────────────
const POS_KEY = 'eme:fab:pos';
const DEFAULT_POS = { right: 20, bottom: 20 };

const pos = ref({ ...DEFAULT_POS });
function loadPos() {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p?.right === 'number' && typeof p?.bottom === 'number') {
      pos.value = clampPos(p);
    }
  } catch { /* ignore */ }
}
function savePos(p) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
function clampPos(p) {
  const padding = 8;
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    right:  Math.max(padding, Math.min(p.right,  w - 64 - padding)),
    bottom: Math.max(padding, Math.min(p.bottom, h - 64 - padding)),
  };
}

const fabStyle = computed(() => ({
  right:  `${pos.value.right}px`,
  bottom: `${pos.value.bottom}px`,
}));

// ── Drag-to-move ────────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 5; // px — abaixo disso é click, acima é drag
const isPointerDown = ref(false);
const isDragging    = ref(false);

let startX = 0, startY = 0, startPos = null;

function onPointerDown(e) {
  if (expanded.value) return;
  isPointerDown.value = true;
  isDragging.value = false;
  startX = e.clientX;
  startY = e.clientY;
  startPos = { ...pos.value };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup',   onPointerUp);
}

function onPointerMove(e) {
  if (!isPointerDown.value) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (!isDragging.value && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    isDragging.value = true;
  }
  if (isDragging.value) {
    // pos.right cresce pra esquerda (oposto do mouse X)
    pos.value = clampPos({
      right:  startPos.right  - dx,
      bottom: startPos.bottom - dy,
    });
  }
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup',   onPointerUp);
  if (isDragging.value) {
    savePos(pos.value);
  } else {
    expanded.value = true; // tap puro → abre
  }
  isPointerDown.value = false;
  setTimeout(() => { isDragging.value = false; }, 0);
}

// ── Eventos externos ────────────────────────────────────────────────────────
function onEmeNavigate(e) {
  const { route: targetRoute, filters } = e.detail || {};
  if (aiStore.mode === 'home') aiStore.minimize();
  if (targetRoute) router.push({ path: targetRoute, query: filters || {} });
}

function onEmeOpen(e) {
  const prompt = e.detail?.prompt;
  if (prompt) aiStore.setDraft(prompt);
  expanded.value = true;
}

function onResize() {
  pos.value = clampPos(pos.value);
}

onMounted(() => {
  loadPos();
  window.addEventListener('eme:navigate', onEmeNavigate);
  window.addEventListener('eme:open',     onEmeOpen);
  window.addEventListener('resize',       onResize);
  // capture:true pra pegar antes de qualquer input absorver
  window.addEventListener('keydown',      onVoiceShortcut, true);
  aiStore.loadStorageUsage();
});
onUnmounted(() => {
  window.removeEventListener('eme:navigate', onEmeNavigate);
  window.removeEventListener('eme:open',     onEmeOpen);
  window.removeEventListener('resize',       onResize);
  window.removeEventListener('keydown',      onVoiceShortcut, true);
  window.removeEventListener('pointermove',  onPointerMove);
  window.removeEventListener('pointerup',    onPointerUp);
});

function backToHome() {
  aiStore.setMode('home');
  router.push('/');
}
function rename(title) { aiStore.renameSession(title); }
</script>

<template>
  <Teleport to="body">
    <Transition name="float-slide">
      <div
        v-if="showFloat"
        class="fixed z-50 flex flex-col"
        :style="fabStyle"
        :class="expanded ? 'w-80 sm:w-96 h-[32rem]' : 'w-auto h-auto'"
      >
        <!-- ── Modo expandido ───────────────────────────────────────── -->
        <div v-if="expanded"
          class="flex flex-col h-full bg-surface-overlay border border-line rounded-2xl shadow-overlay overflow-hidden">

          <div class="flex items-center gap-1.5 px-3 py-2 border-b border-line bg-surface-raised">
            <img src="/Mlogo.png" class="h-4 flex-shrink-0 invert dark:invert-0" alt="Eme" />
            <div class="flex-1 min-w-0">
              <ChatTitleEditor v-if="aiStore.currentSessionId"
                :title="aiStore.currentSessionTitle" @rename="rename" />
              <span v-else class="text-xs text-ink-muted">Eme</span>
            </div>
            <IconButton icon="fas fa-edit" size="sm" label="Novo chat" @click="aiStore.newSession()" />
            <IconButton icon="fas fa-clock-rotate-left" size="sm" label="Histórico"
              @click="aiStore.historyOpen = !aiStore.historyOpen" />
            <IconButton icon="fas fa-up-right-and-down-left-from-center" size="sm" label="Voltar à home"
              @click="backToHome" />
            <IconButton icon="fas fa-minus" size="sm" label="Minimizar"
              @click="expanded = false" />
          </div>

          <transition
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0">
            <div v-if="aiStore.historyOpen"
              class="absolute inset-0 top-[44px] bg-surface-overlay z-10 rounded-b-2xl overflow-hidden">
              <OfficeChatHistory />
            </div>
          </transition>

          <OfficeChatSession :compact="true" class="flex-1 min-h-0" />
        </div>

        <!-- ── Modo pill (FAB) — arrastável ────────────────────────── -->
        <div v-else class="flex items-end gap-2">
          <Transition name="fade">
            <div v-if="aiStore.isStreaming && aiStore.streamingText"
              class="max-w-56 bg-surface-overlay border border-line rounded-2xl rounded-br-sm
                     px-3 py-2 text-xs text-ink shadow-elevated mb-2">
              <p class="line-clamp-2">{{ aiStore.streamingText }}</p>
              <span class="inline-block w-1.5 h-3 ml-0.5 bg-accent animate-pulse rounded-sm align-middle"></span>
            </div>
          </Transition>

          <button type="button"
            @pointerdown.prevent="onPointerDown"
            :class="[
              'group relative h-14 w-14 rounded-full bg-surface-overlay border border-line shadow-overlay',
              'flex items-center justify-center transition-transform select-none touch-none',
              isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-110 active:scale-95',
            ]"
            :title="isDragging ? 'Arrastando…' : 'Clique para abrir · arraste para reposicionar'">
            <span class="absolute inset-0 rounded-full bg-accent/20 blur-xl
                         opacity-0 group-hover:opacity-100 transition-opacity"></span>
            <img src="/Mlogo.png" class="h-7 invert dark:invert-0 relative pointer-events-none"
              alt="Eme" draggable="false" />
            <span v-if="aiStore.isStreaming"
              class="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping"></span>
              <span class="relative inline-flex h-3 w-3 rounded-full bg-accent ring-2 ring-surface"></span>
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.float-slide-enter-active,
.float-slide-leave-active {
  transition: all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.float-slide-enter-from,
.float-slide-leave-to {
  transform: translateY(2rem) scale(0.9);
  opacity: 0;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
