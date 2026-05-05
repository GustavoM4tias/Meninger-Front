<template>
  <!-- ── Tela de gravação ───────────────────────────────────────────────────────── -->
  <div class="min-h-screen flex flex-col relative overflow-hidden bg-surface-base">

    <!-- Gradientes de fundo -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-500/5 dark:bg-violet-700/8 rounded-full blur-3xl" />
      <div class="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-700/5 rounded-full blur-3xl" />
    </div>
    <!-- Grid decorativo -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

    <!-- Header -->
    <header class="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-line bg-surface-raised/70 backdrop-blur-sm">
      <Button variant="ghost" size="sm" icon="fas fa-chevron-left" @click="handleMinimize">
        <span class="hidden sm:inline">Continuar trabalhando</span>
      </Button>
      <div class="text-center min-w-0">
        <h1 class="font-semibold text-sm text-ink truncate max-w-[260px]">{{ store.title }}</h1>
        <p v-if="store.location" class="text-xs text-ink-subtle">
          <i class="fas fa-location-dot mr-1"></i>{{ store.location }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="hidden sm:inline-flex items-center gap-1 text-xs text-ink-subtle">
          <i class="fas fa-users"></i>
          <span class="font-mono tabular-nums">{{ store.attendees.length || 1 }}</span>
        </span>
        <Button variant="danger" size="sm" icon="fas fa-stop" @click="confirmStop = true">
          Encerrar
        </Button>
      </div>
    </header>

    <!-- Corpo principal -->
    <main class="relative z-10 flex flex-col items-center flex-1 px-6 py-8 gap-8">

      <!-- ── Status + Timer ──────────────────────────────────────────────── -->
      <div class="flex flex-col items-center gap-3">
        <!-- Badge de status -->
        <transition name="fade">
          <div v-if="store.isRecording"
            class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-400 text-xs font-semibold tracking-wide uppercase">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Gravando
          </div>
          <div v-else-if="store.isPaused"
            class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wide uppercase">
            <i class="fas fa-pause text-[10px]"></i>
            Pausado
          </div>
        </transition>

        <!-- Timer digital -->
        <div class="font-mono text-7xl font-bold tracking-widest tabular-nums select-none text-ink"
          :class="{ 'opacity-40': store.isPaused }">
          {{ store.timerDisplay }}
        </div>

        <!-- Subtítulo -->
        <p class="text-xs text-ink-subtle tracking-widest uppercase">
          {{ store.isRecording ? 'em andamento' : store.isPaused ? 'gravação pausada' : '' }}
        </p>
      </div>

      <!-- ── Orb de escuta ───────────────────────────────────────────────── -->
      <div class="relative flex items-center justify-center">

        <!-- Anéis de pulso externos -->
        <div v-for="ring in 4" :key="ring"
          class="absolute rounded-full border border-violet-500/10 transition-all duration-300"
          :style="ringStyle(ring)" />

        <!-- Anel rotativo com gradiente -->
        <div class="relative w-52 h-52 rounded-full flex items-center justify-center"
          :class="store.isRecording ? 'orb-spin' : ''">
          <div class="absolute inset-0 rounded-full orb-gradient-ring" />
          <!-- Fundo interno sempre escuro para o canvas funcionar -->
          <div class="absolute inset-[3px] rounded-full bg-surface-sunken" />

          <!-- Canvas de visualização de áudio -->
          <canvas ref="canvasEl" width="196" height="196"
            class="absolute inset-[3px] rounded-full" />

          <!-- Ícone central (quando não está gravando) -->
          <div v-if="!store.isRecording" class="absolute flex flex-col items-center gap-1">
            <i class="fas fa-microphone-slash text-ink-subtle text-3xl"></i>
          </div>

          <!-- Ponto central pulsante (quando gravando) -->
          <div v-if="store.isRecording"
            class="absolute w-3 h-3 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50 animate-pulse" />
        </div>

        <!-- Partículas orbitais -->
        <div v-for="p in 3" :key="p" class="absolute" :style="orbitalStyle(p)">
          <div class="w-1.5 h-1.5 rounded-full bg-violet-400/60 shadow-sm shadow-violet-400/40" />
        </div>
      </div>

      <!-- ── Barras de nível de áudio ────────────────────────────────────── -->
      <div class="flex items-end gap-0.5 h-8">
        <div v-for="i in 32" :key="i"
          class="w-1 rounded-full transition-all duration-75"
          :style="barStyle(i)" />
      </div>

      <!-- ── Transcrição ao vivo ─────────────────────────────────────────── -->
      <div class="w-full max-w-2xl">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-semibold text-ink-subtle uppercase tracking-widest flex items-center gap-2">
            <i class="fas fa-wave-square text-violet-500 text-[10px]"></i>
            Transcrição ao vivo
          </h3>
          <span class="text-xs text-ink-subtle font-mono tabular-nums">{{ store.cues.length }} segmentos</span>
        </div>
        <div ref="transcriptEl"
          class="h-44 overflow-y-auto space-y-2 p-4 rounded-2xl border border-line bg-surface-raised scroll-smooth">
          <div v-if="!store.cues.length && !store.interimText"
            class="h-full flex items-center justify-center text-ink-subtle text-sm">
            {{ store.isRecording ? 'Aguardando fala...' : 'Inicie a gravação' }}
          </div>
          <TransitionGroup name="cue">
            <div v-for="(cue, i) in store.cues" :key="i"
              class="flex gap-3 text-sm leading-relaxed">
              <span class="text-violet-500 dark:text-violet-400 shrink-0 font-mono text-xs mt-0.5 tabular-nums">{{ cue.startStr }}</span>
              <span class="text-ink-muted">{{ cue.text }}</span>
            </div>
          </TransitionGroup>
          <!-- Resultado interim -->
          <div v-if="store.interimText" class="flex gap-3 text-sm leading-relaxed">
            <span class="text-violet-400/50 shrink-0 font-mono text-xs mt-0.5">{{ store.timerDisplay }}</span>
            <span class="text-ink-subtle italic">{{ store.interimText }}<span class="animate-pulse">▌</span></span>
          </div>
        </div>
      </div>

      <!-- ── Controles ───────────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 flex-wrap justify-center">
        <Button v-if="store.isPaused"
          variant="primary"
          icon="fas fa-play"
          class="!bg-violet-600 hover:!bg-violet-700"
          @click="store.resume()">
          Retomar
        </Button>
        <Button v-if="store.isRecording"
          variant="secondary"
          icon="fas fa-pause"
          @click="store.pause()">
          Pausar
        </Button>
        <Button variant="danger" icon="fas fa-stop" @click="confirmStop = true">
          Encerrar
        </Button>
      </div>

      <!-- Aviso Web Speech API -->
      <Surface v-if="!store.hasMicSupport"
        variant="raised"
        padding="sm"
        class="border-red-500/30 bg-red-500/10">
        <div class="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
          <i class="fas fa-circle-exclamation"></i>
          Microfone não disponível ou não permitido. Verifique as permissões do navegador.
        </div>
      </Surface>
    </main>

    <!-- ── Modal de confirmação de encerramento ───────────────────────── -->
    <Modal :open="confirmStop"
      size="sm"
      title="Encerrar gravação?"
      @close="confirmStop = false">
      <div class="text-center space-y-4">
        <div class="flex justify-center">
          <div class="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 grid place-items-center">
            <i class="fas fa-stop text-red-500"></i>
          </div>
        </div>
        <p class="text-sm text-ink-muted">
          A transcrição será salva. Você poderá gerar o resumo de IA depois.
        </p>
      </div>
      <template #footer>
        <Button variant="ghost" @click="confirmStop = false">Continuar</Button>
        <Button variant="danger" icon="fas fa-stop" @click="handleStop">
          Encerrar e Salvar
        </Button>
      </template>
      <div class="text-center -mt-1">
        <button @click="handleDiscard"
          class="text-xs text-ink-subtle hover:text-red-500 transition-colors">
          Descartar sem salvar
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useInPersonRecordingStore } from '@/stores/Microsoft/inPersonRecording';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Surface from '@/components/UI/Surface.vue';

const router = useRouter();
const store  = useInPersonRecordingStore();

const confirmStop = ref(false);

function handleMinimize() {
  router.push('/microsoft/transcripts');
}

async function handleStop() {
  confirmStop.value = false;
  stopVisualization();
  await store.stop();
  router.push('/microsoft/transcripts');
}

async function handleDiscard() {
  confirmStop.value = false;
  stopVisualization();
  await store.discard();
  router.push('/microsoft/transcripts');
}

// ── Audio visualization ───────────────────────────────────────────────────────
const canvasEl     = ref(null);
const transcriptEl = ref(null);

let audioCtx     = null;
let analyserNode = null;
let dataArray    = null;
let rafId        = null;
let audioStream  = null;
const audioLevel  = ref(0);
const freqBands   = ref(new Array(32).fill(0));

async function initVisualization() {
  try {
    audioStream  = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioCtx     = new (window.AudioContext || window.webkitAudioContext)();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 128;
    dataArray    = new Uint8Array(analyserNode.frequencyBinCount);
    const src    = audioCtx.createMediaStreamSource(audioStream);
    src.connect(analyserNode);
    drawLoop();
  } catch (err) {
    console.warn('[InPerson Viz]', err.message);
  }
}

function drawLoop() {
  if (!analyserNode) return;
  analyserNode.getByteFrequencyData(dataArray);

  const canvas = canvasEl.value;
  if (canvas && store.isRecording) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const r  = 76;
    const bins = dataArray.length;

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < bins; i++) {
      const angle  = (i / bins) * Math.PI * 2 - Math.PI / 2;
      const v      = dataArray[i] / 255;
      const barLen = 6 + v * 38;
      const x1 = cx + Math.cos(angle) * r;
      const y1 = cy + Math.sin(angle) * r;
      const x2 = cx + Math.cos(angle) * (r + barLen);
      const y2 = cy + Math.sin(angle) * (r + barLen);
      const hue = 255 + v * 50;
      ctx.strokeStyle = `hsla(${hue}, 75%, ${45 + v * 35}%, ${0.4 + v * 0.6})`;
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  audioLevel.value = avg;

  const step = Math.floor(dataArray.length / 32);
  for (let i = 0; i < 32; i++) {
    freqBands.value[i] = dataArray[i * step] || 0;
  }

  rafId = requestAnimationFrame(drawLoop);
}

function stopVisualization() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
  if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); audioStream = null; }
  analyserNode = null;
  dataArray    = null;
}

onMounted(() => {
  if (store.isActive) initVisualization();
});

onUnmounted(() => {
  stopVisualization();
});

watch(() => store.cues.length, async () => {
  await nextTick();
  if (transcriptEl.value) transcriptEl.value.scrollTop = transcriptEl.value.scrollHeight;
});

// ── Estilos computados ────────────────────────────────────────────────────────
function ringStyle(ring) {
  const base    = 208 + ring * 40;
  const boost   = store.isRecording ? (audioLevel.value / 255) * 30 : 0;
  const size    = base + boost;
  const opacity = store.isRecording ? (0.12 - ring * 0.02 + (audioLevel.value / 255) * 0.08) : 0.03;
  return { width: size + 'px', height: size + 'px', opacity, transition: 'all 0.15s ease' };
}

function barStyle(i) {
  const v      = freqBands.value[i - 1] || 0;
  const height = store.isRecording ? Math.max(4, (v / 255) * 30 + 4) : 4;
  const lit    = store.isRecording && v > 20;
  const isDark = document.documentElement.classList.contains('dark');
  return {
    height: height + 'px',
    background: lit
      ? `hsl(${255 + (v / 255) * 50}, 75%, ${45 + (v / 255) * 25}%)`
      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
    transition: 'height 0.07s ease, background 0.1s ease',
  };
}

function orbitalStyle(p) {
  const angle  = ((p - 1) * 120 - 90) + (store.isRecording ? Date.now() / 30 * p % 360 : 0);
  const radius = 115;
  const rad    = angle * (Math.PI / 180);
  return {
    transform: `translate(${Math.cos(rad) * radius}px, ${Math.sin(rad) * radius}px)`,
    opacity:   store.isRecording ? 0.6 : 0.15,
    transition: 'opacity 0.5s ease',
  };
}
</script>

<style scoped>
.orb-gradient-ring {
  background: conic-gradient(from 0deg, #7c3aed, #4f46e5, #0ea5e9, #06b6d4, #7c3aed);
  padding: 3px;
}
.orb-spin { animation: spin 8s linear infinite; }
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.cue-enter-active { transition: all 0.3s ease; }
.cue-enter-from   { opacity: 0; transform: translateY(8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
