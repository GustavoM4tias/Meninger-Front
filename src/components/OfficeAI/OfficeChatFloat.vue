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
import { setEmeScreen, instalarCapturaCtrlClique } from '@/composables/useEmeScreenContext';
import { useEmeDock } from '@/composables/useEmeDock';

const aiStore = useOfficeAIStore();
// ── Docada x flutuante ───────────────────────────────────────────────────────
const dock = useEmeDock();
const permStore = usePermissionStore();
const router = useRouter();
const route  = useRoute();
// Aberto/fechado mora no composable: sobrevive à recarga da página e é ele que
// reserva o espaço quando ela está encostada. Antes, um reload fechava o painel
// e o espaço continuava lá, vazio.
const expanded = computed({
  get: () => dock.aberta.value,
  set: (v) => { dock.aberta.value = v; },
});

// ── Retomar a conversa ───────────────────────────────────────────────────────
// Recarregar a página zerava a Eme, então ela passou a reabrir a última
// conversa do banco. Só que "última" no banco não quer dizer "a que eu estava
// tendo": abrir a Eme numa terça de manhã trazia de volta uma conversa de
// quinta passada, sobre uma tela que a pessoa nem está mais vendo. Uma resposta
// velha reaparecendo como se fosse o assunto de agora é pior do que abrir em
// branco - ela parece atual, e não é.
//
// A regra é de CONTINUIDADE, não de histórico: só retoma o que teve atividade
// nos últimos 30 minutos, que é a janela de um F5 no meio da pergunta, de ir
// conferir outra tela e voltar, de fechar a bolinha sem querer. Passou disso,
// abre em branco - e o histórico continua a um clique, no botão de conversas.
const JANELA_RETOMADA_MS = 30 * 60 * 1000;

const retomando = ref(false);
const retomada = ref(null);   // título da conversa retomada, para avisar

async function retomarUltimaConversa() {
  if (aiStore.currentSessionId || aiStore.messages.length || retomando.value) return;
  retomando.value = true;
  try {
    if (!aiStore.sessions.length) await aiStore.loadSessions();
    const ultima = aiStore.sessions[0];
    if (!ultima) return;
    // Sem data legível o seguro é NÃO retomar: um título antigo aparecendo como
    // "Retomando" é exatamente o que se quer evitar aqui.
    const quando = new Date(ultima.updated_at || ultima.updatedAt || 0).getTime();
    if (!quando || Date.now() - quando > JANELA_RETOMADA_MS) return;
    await aiStore.loadMessages(ultima.id);
    retomada.value = ultima.title || 'conversa anterior';
    setTimeout(() => { retomada.value = null; }, 6000);
  } catch { /* sem histórico: abre em branco, como antes */ }
  finally { retomando.value = false; }
}

watch(expanded, (aberto) => { if (aberto) retomarUltimaConversa(); });

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
// Largura da viewport reativa — decide mobile (bottom-sheet) × desktop (painel).
const viewportW = ref(window.innerWidth);
const isMobileViewport = computed(() => viewportW.value < 640);

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
// Clamp considerando o TAMANHO REAL do box: pill 64px ou painel expandido
// (antes só considerava o pill — o painel aberto vazava para fora da tela).
function clampPos(p) {
  const padding = 8;
  const w = window.innerWidth;
  const h = window.innerHeight;
  // O tamanho do painel deixou de ser fixo: quem manda é o que a pessoa
  // deixou. Com 384x512 cravado aqui, um painel esticado era "preso" cedo
  // demais e parecia que o arrasto travava antes da borda.
  const boxW = expanded.value ? (w >= 640 ? dock.caixa.value.w : 320) : 64;
  const boxH = expanded.value ? dock.caixa.value.h : 64;
  return {
    right:  Math.max(padding, Math.min(p.right,  Math.max(padding, w - boxW - padding))),
    bottom: Math.max(padding, Math.min(p.bottom, Math.max(padding, h - boxH - padding))),
  };
}

// No mobile expandido o painel vira bottom-sheet (classes cuidam da posição);
// nos demais casos vale a posição arrastável persistida.
const podeDocar = computed(() => viewportW.value >= 1024);
const emDock = computed(() => dock.docada.value && expanded.value && podeDocar.value);

const fabStyle = computed(() => {
  // Docada: coluna colada na direita, do topo ao rodapé.
  if (emDock.value) return { right: '0px', top: '0px', bottom: '0px', width: `${dock.largura.value}px` };
  // Celular expandido: o bottom-sheet manda, as classes cuidam.
  if (expanded.value && isMobileViewport.value) return {};

  const base = { right: `${pos.value.right}px`, bottom: `${pos.value.bottom}px` };
  // Aberto no desktop: o tamanho é o que a pessoa deixou, não um valor fixo.
  return expanded.value
    ? { ...base, width: `${dock.caixa.value.w}px`, height: `${dock.caixa.value.h}px` }
    : base;
});

// ── Redimensionar o painel docado ────────────────────────────────────────────
// Puxar a borda esquerda. A largura é persistida: quem usa a Eme o dia todo
// quer ela larga, quem usa de vez em quando quer ela estreita.
const redimensionando = ref(false);

function iniciarResize(e) {
  if (!emDock.value) return;
  redimensionando.value = true;
  dock.ajustar(true);      // desliga as transições do shell e da barra do topo
  e.preventDefault();
  window.addEventListener('pointermove', aoRedimensionar);
  window.addEventListener('pointerup', pararResize, { once: true });
}

// Um quadro por vez: sem isto, cada pixel de movimento reflow-ava o Office
// inteiro (o conteúdo recua e a barra do topo encolhe junto) e a tela travava.
let quadroResize = null;
function aoRedimensionar(e) {
  const x = e.clientX;
  if (quadroResize) return;
  quadroResize = requestAnimationFrame(() => {
    quadroResize = null;
    dock.redimensionar(window.innerWidth - x);
  });
}

function pararResize() {
  redimensionando.value = false;
  dock.ajustar(false);
  if (quadroResize) { cancelAnimationFrame(quadroResize); quadroResize = null; }
  window.removeEventListener('pointermove', aoRedimensionar);
}

// ── Redimensionar o painel FLUTUANTE ─────────────────────────────────────────
// Ele fica ancorado no canto inferior direito, então quem cresce é a borda
// ESQUERDA (largura) e a borda de CIMA (altura) - e o canto puxa as duas.
// Antes era 384x512 cravado: quem lia uma ata inteira dentro dele sofria.
const eixoResize = ref(null);   // 'w' | 'h' | 'wh'

function iniciarResizeCaixa(eixo, e) {
  if (!expanded.value || emDock.value || isMobileViewport.value) return;
  eixoResize.value = eixo;
  e.preventDefault();
  e.stopPropagation();
  window.addEventListener('pointermove', aoRedimensionarCaixa);
  window.addEventListener('pointerup', pararResizeCaixa, { once: true });
}

function aoRedimensionarCaixa(e) {
  const eixo = eixoResize.value;
  if (!eixo) return;
  // A âncora é o canto inferior direito: a distância até o ponteiro É o tamanho.
  const w = eixo === 'h' ? dock.caixa.value.w : window.innerWidth  - e.clientX - pos.value.right;
  const h = eixo === 'w' ? dock.caixa.value.h : window.innerHeight - e.clientY - pos.value.bottom;
  dock.redimensionarCaixa(w, h);
}

function pararResizeCaixa() {
  eixoResize.value = null;
  window.removeEventListener('pointermove', aoRedimensionarCaixa);
}

// Tela estreita não comporta o dock: 400px a menos não deixa Office nenhum.
watch(() => viewportW.value, (w) => { if (w < 1024 && dock.docada.value) dock.soltar(); });

// Ao expandir, re-clampa para o painel caber na viewport a partir da posição do pill.
watch(expanded, () => { pos.value = clampPos(pos.value); });

// Rótulo do que a Eme está fazendo — preview no pill colapsado enquanto não há texto.
const streamLabel = computed(() => {
  const running = [...aiStore.agentSteps].reverse().find(s => s.status === 'running');
  if (running) return `Consultando ${running.label}…`;
  return 'Eme está pensando…';
});

// ── Drag-to-move ────────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 5; // px — abaixo disso é click, acima é drag
// Faixa da direita que, ao soltar, cola a Eme na lateral. Mesma ideia do
// encaixe de janela do sistema: levar até a borda é o gesto que a pessoa já tem.
const ZONA_DOCK = 56;
const propondoDock = ref(false);
const isPointerDown = ref(false);
const isDragging    = ref(false);

let startX = 0, startY = 0, startPos = null;

function iniciarArrasto(e) {
  isPointerDown.value = true;
  isDragging.value = false;
  startX = e.clientX;
  startY = e.clientY;
  startPos = { ...pos.value };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup',   onPointerUp);
}

// A bolinha fechada: o arrasto é nela inteira.
function onPointerDown(e) {
  if (expanded.value) return;
  iniciarArrasto(e);
}

// Vira true quando o arrasto começou com a Eme encostada: no primeiro
// movimento ela se solta e passa a seguir o ponteiro.
let soltandoDoDock = false;

// Aberta, a alça é o CABEÇALHO - como em qualquer janela. Antes o arrasto era
// bloqueado quando aberta ('if (expanded) return'), então a Eme aberta ficava
// presa no canto e a pessoa tinha que fechar, arrastar e abrir de novo.
function onHeaderPointerDown(e) {
  if (!expanded.value || isMobileViewport.value) return;
  // Botão, campo e o editor de título continuam funcionando: só o vazio arrasta.
  if (e.target?.closest?.('button, a, input, textarea, [contenteditable="true"]')) return;

  // Docada: arrastar o cabeçalho SOLTA. Colar arrastando e não poder tirar
  // arrastando seria meio caminho - o gesto tem que valer nos dois sentidos.
  if (emDock.value) {
    e.preventDefault();
    soltandoDoDock = true;
    iniciarArrasto(e);
    return;
  }
  // Botão, campo e o editor de título continuam funcionando: só o vazio arrasta.
  if (e.target?.closest?.('button, a, input, textarea, [contenteditable="true"]')) return;
  e.preventDefault();
  iniciarArrasto(e);
}

function onPointerMove(e) {
  if (!isPointerDown.value) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (!isDragging.value && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    isDragging.value = true;

    // Saiu do dock: vira flutuante embaixo do ponteiro e o arrasto recomeça
    // dali, senão ela saltaria para a última posição guardada.
    if (soltandoDoDock) {
      soltandoDoDock = false;
      dock.soltar();
      pos.value = clampPos({
        right:  window.innerWidth  - e.clientX - Math.round(dock.caixa.value.w / 2),
        bottom: window.innerHeight - e.clientY - 28,
      });
      startX = e.clientX;
      startY = e.clientY;
      startPos = { ...pos.value };
      return;
    }
  }
  if (isDragging.value) {
    // pos.right cresce pra esquerda (oposto do mouse X)
    pos.value = clampPos({
      right:  startPos.right  - dx,
      bottom: startPos.bottom - dy,
    });
    // Encostou na borda direita: propõe colar, como janela do sistema.
    propondoDock.value = podeDocar.value && e.clientX >= window.innerWidth - ZONA_DOCK;
  }
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup',   onPointerUp);
  soltandoDoDock = false;
  if (isDragging.value && propondoDock.value) {
    // Soltou na zona: cola e abre, que é o que a pessoa queria ao levar até lá.
    propondoDock.value = false;
    dock.docar();
    expanded.value = true;
  } else if (isDragging.value) {
    savePos(pos.value);
  } else if (!expanded.value) {
    expanded.value = true; // tap puro na bolinha → abre
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
  viewportW.value = window.innerWidth;
  pos.value = clampPos(pos.value);
}

// ── Contexto de tela ────────────────────────────────────────────────────────
// Duas coisas: a rota atual segue a Eme sozinha (para "explica esta tela" ter
// resposta), e o Ctrl+clique marca um trecho da página como referência da
// próxima pergunta - abrindo o painel para a pessoa VER o que foi marcado.
watch(() => route.path, (p) => setEmeScreen(p, route.meta?.content || ''), { immediate: true });

let desinstalarCaptura = null;

onMounted(() => {
  desinstalarCaptura = instalarCapturaCtrlClique(() => { expanded.value = true; });
  loadPos();
  window.addEventListener('eme:navigate', onEmeNavigate);
  window.addEventListener('eme:open',     onEmeOpen);
  window.addEventListener('resize',       onResize);
  // capture:true pra pegar antes de qualquer input absorver
  window.addEventListener('keydown',      onVoiceShortcut, true);
  aiStore.loadStorageUsage();
});
onUnmounted(() => {
  desinstalarCaptura?.();
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
    <!-- Encaixe: levar a bolinha até a borda direita propõe colar, como janela
         do sistema. A faixa aparece só durante o arrasto. -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0">
      <div v-show="propondoDock"
        :style="{ width: dock.largura.value + 'px' }"
        class="fixed right-0 top-0 bottom-0 z-40 pointer-events-none p-2">
        <div class="h-full w-full rounded-2xl border-2 border-dashed border-accent/50
                    bg-accent-soft/40 grid place-items-center">
          <div class="flex flex-col items-center gap-2 px-4 py-3 rounded-xl
                      bg-surface-overlay border border-accent/25 shadow-soft">
            <span class="w-9 h-9 rounded-lg bg-accent-soft grid place-items-center">
              <i class="fas fa-table-columns text-accent text-sm"></i>
            </span>
            <span class="text-xs font-medium text-ink">Encostar na lateral</span>
            <span class="text-micro text-ink-subtle">O Office encolhe, nada fica coberto</span>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="float-slide">
      <div
        v-if="showFloat"
        data-eme-float
        class="fixed z-50 flex flex-col"
        :style="fabStyle"
        :class="emDock
          ? 'h-dvh'
          : expanded
            ? 'max-sm:inset-x-2 max-sm:bottom-2 max-sm:w-auto max-sm:h-[min(calc(100dvh-4rem),34rem)]'
            : 'w-auto h-auto'"
      >
        <!-- ── Modo expandido ───────────────────────────────────────── -->
        <div v-if="expanded"
          class="relative flex flex-col h-full bg-surface-overlay border-line overflow-hidden"
          :class="emDock ? 'border-l' : 'border rounded-2xl shadow-overlay'">

          <!-- Puxador: só existe docada, e é a borda inteira. -->
          <div v-if="emDock" @pointerdown="iniciarResize"
            :class="redimensionando ? 'bg-accent/40' : 'hover:bg-accent/25'"
            class="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 transition-colors"
            title="Arraste para ajustar a largura"></div>

          <!-- Flutuante: ancorado no canto de baixo à direita, então cresce pela
               esquerda (largura), por cima (altura) e pelo canto (as duas). -->
          <template v-if="!emDock && !isMobileViewport">
            <div @pointerdown="iniciarResizeCaixa('w', $event)"
              :class="eixoResize === 'w' ? 'bg-accent/40' : 'hover:bg-accent/25'"
              class="absolute left-0 top-3 bottom-3 w-1.5 cursor-col-resize z-10 transition-colors"
              title="Arraste para a largura"></div>
            <div @pointerdown="iniciarResizeCaixa('h', $event)"
              :class="eixoResize === 'h' ? 'bg-accent/40' : 'hover:bg-accent/25'"
              class="absolute top-0 left-3 right-3 h-1.5 cursor-row-resize z-10 transition-colors"
              title="Arraste para a altura"></div>
            <div @pointerdown="iniciarResizeCaixa('wh', $event)"
              class="absolute left-0 top-0 w-4 h-4 cursor-nwse-resize z-10 group"
              title="Arraste para o tamanho">
              <span class="absolute left-1 top-1 w-2 h-2 border-l-2 border-t-2 rounded-tl
                           border-ink-subtle/40 group-hover:border-accent transition-colors"></span>
            </div>
          </template>

          <!-- O cabeçalho é a alça: arrastar daqui move a Eme aberta, e levar
               até a borda direita propõe encostar. -->
          <div @pointerdown="onHeaderPointerDown"
            :class="isMobileViewport ? '' : 'cursor-grab active:cursor-grabbing select-none'"
            :style="emDock ? { height: 'var(--nav-topbar-h, 48px)' } : null"
            class="flex items-center gap-1.5 px-3 h-12 shrink-0 border-b border-line
                   bg-surface/80 backdrop-blur-xl">
            <img src="/Mlogo.png" class="h-4 flex-shrink-0 invert dark:invert-0" alt="Eme" />
            <!-- min-w-0 + truncate: título longo cortava em cima dos botões. -->
            <div class="flex-1 min-w-0 overflow-hidden">
              <ChatTitleEditor v-if="aiStore.currentSessionId"
                class="block truncate"
                :title="aiStore.currentSessionTitle" @rename="rename" />
              <span v-else class="text-xs text-ink-muted">Eme</span>
            </div>
            <IconButton icon="fas fa-edit" size="sm" label="Novo chat" @click="aiStore.newSession()" />
            <IconButton icon="fas fa-clock-rotate-left" size="sm" label="Histórico"
              @click="aiStore.historyOpen = !aiStore.historyOpen" />
            <IconButton icon="fas fa-up-right-and-down-left-from-center" size="sm" label="Voltar à home"
              @click="backToHome" />
            <IconButton v-if="podeDocar"
              :icon="dock.docada.value ? 'fas fa-window-restore' : 'fas fa-table-columns'"
              size="sm"
              :label="dock.docada.value ? 'Soltar (flutuante)' : 'Encostar na lateral'"
              @click="dock.alternar()" />
            <IconButton icon="fas fa-minus" size="sm" label="Minimizar"
              @click="expanded = false" />
          </div>
          <!-- Recarregar a página zerava a Eme: ela abria em branco como se
               nunca tivesse conversado. Agora ela retoma a última conversa e
               DIZ que retomou - senão a pessoa não sabe se aquilo é novo. -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="opacity-0">
            <div v-if="retomada"
              class="flex items-center gap-2 px-3 py-1.5 bg-accent-soft border-b border-accent/20">
              <i class="fas fa-clock-rotate-left text-micro text-accent shrink-0"></i>
              <span class="text-micro text-accent truncate">Retomando: {{ retomada }}</span>
            </div>
          </Transition>

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
            <div v-if="aiStore.isStreaming && aiStore.streamingText" key="preview-text"
              class="max-w-56 bg-surface-overlay border border-line rounded-2xl rounded-br-sm
                     px-3 py-2 text-xs text-ink shadow-elevated mb-2">
              <p class="line-clamp-2 break-words">{{ aiStore.streamingText }}</p>
              <span class="inline-block w-1.5 h-3 ml-0.5 bg-accent animate-pulse rounded-sm align-middle"></span>
            </div>
            <!-- Sem texto ainda: mostra O QUE a Eme está fazendo (não só a bolinha) -->
            <div v-else-if="aiStore.isStreaming" key="preview-status"
              class="max-w-56 bg-surface-overlay border border-line rounded-2xl rounded-br-sm
                     px-3 py-2 text-xs text-ink-muted shadow-elevated mb-2 flex items-center gap-2">
              <span class="relative flex h-2 w-2 shrink-0">
                <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping"></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
              </span>
              <span class="truncate">{{ streamLabel }}</span>
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
