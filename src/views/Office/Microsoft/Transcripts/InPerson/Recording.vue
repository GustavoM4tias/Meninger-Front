<template>
  <!-- ── Tela de gravação ───────────────────────────────────────────────────────── -->
  <div class="min-h-screen flex flex-col relative overflow-hidden bg-gray-50 dark:bg-gray-950">

    <!-- Gradientes de fundo -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-500/5 dark:bg-violet-700/8 rounded-full blur-3xl" />
      <div class="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-700/5 rounded-full blur-3xl" />
    </div>
    <!-- Grid decorativo -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

    <!-- Header -->
    <header class="relative z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/5 bg-white/70 dark:bg-transparent backdrop-blur-sm">
      <button @click="handleMinimize"
        class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
        <i class="fas fa-chevron-left text-xs"></i> Continuar trabalhando
      </button>
      <div class="text-center">
        <h1 class="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[200px]">{{ store.title }}</h1>
        <p v-if="store.location" class="text-xs text-gray-400 dark:text-gray-500">
          <i class="fas fa-location-dot mr-1"></i>{{ store.location }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-400 dark:text-gray-500">
          <i class="fas fa-users mr-1"></i>{{ store.attendees.length || 1 }}
        </span>
        <button @click="confirmStop = true"
          class="px-3 py-1.5 rounded-lg text-xs text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <i class="fas fa-stop mr-1"></i>Encerrar
        </button>
      </div>
    </header>

    <!-- Corpo principal -->
    <main class="relative z-10 flex flex-col items-center flex-1 px-6 py-8 gap-8">

      <!-- ── Status + Timer ──────────────────────────────────────────────── -->
      <div class="flex flex-col items-center gap-3">
        <!-- Badge de status -->
        <transition name="fade">
          <div v-if="store.isRecording"
            class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-500 dark:text-red-400 text-xs font-semibold tracking-wide uppercase">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Gravando
          </div>
          <div v-else-if="store.isPaused"
            class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wide uppercase">
            <i class="fas fa-pause text-[10px]"></i>
            Pausado
          </div>
        </transition>

        <!-- Timer digital -->
        <div class="font-mono text-7xl font-bold tracking-widest tabular-nums select-none text-gray-900 dark:text-white"
          :class="{ 'opacity-40': store.isPaused }">
          {{ store.timerDisplay }}
        </div>

        <!-- Subtítulo -->
        <p class="text-xs text-gray-400 dark:text-gray-600 tracking-widest uppercase">
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
          <div class="absolute inset-[3px] rounded-full bg-gray-100 dark:bg-gray-900" />

          <!-- Canvas de visualização de áudio -->
          <canvas ref="canvasEl" width="196" height="196"
            class="absolute inset-[3px] rounded-full" />

          <!-- Ícone central (quando não está gravando) -->
          <div v-if="!store.isRecording" class="absolute flex flex-col items-center gap-1">
            <i class="fas fa-microphone-slash text-gray-400 darK:text-gray-600 text-3xl"></i>
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
          <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <i class="fas fa-wave-square text-violet-500 text-[10px]"></i>
            Transcrição ao vivo
          </h3>
          <span class="text-xs text-gray-400 dark:text-gray-600 tabular-nums">{{ store.cues.length }} segmentos</span>
        </div>
        <div ref="transcriptEl"
          class="h-44 overflow-y-auto space-y-2 p-4 rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02] scroll-smooth">
          <div v-if="!store.cues.length && !store.interimText"
            class="h-full flex items-center justify-center text-gray-400 dark:text-gray-700 text-sm">
            {{ store.isRecording ? 'Aguardando fala...' : 'Inicie a gravação' }}
          </div>
          <TransitionGroup name="cue">
            <div v-for="(cue, i) in store.cues" :key="i"
              class="flex gap-3 text-sm leading-relaxed">
              <span class="text-violet-500 dark:text-violet-500/70 shrink-0 font-mono text-xs mt-0.5 tabular-nums">{{ cue.startStr }}</span>
              <span class="text-gray-700 dark:text-gray-300">{{ cue.text }}</span>
            </div>
          </TransitionGroup>
          <!-- Resultado interim -->
          <div v-if="store.interimText" class="flex gap-3 text-sm leading-relaxed">
            <span class="text-violet-400/50 shrink-0 font-mono text-xs mt-0.5">{{ store.timerDisplay }}</span>
            <span class="text-gray-400 dark:text-gray-600 italic">{{ store.interimText }}<span class="animate-pulse">▌</span></span>
          </div>
        </div>
      </div>

      <!-- ── Controles ───────────────────────────────────────────────────── -->
      <div class="flex items-center gap-4">
        <button v-if="store.isPaused" @click="store.resume()"
          class="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-violet-50 dark:bg-violet-600/20 border border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-600/30 transition-all">
          <i class="fas fa-play text-sm"></i> Retomar
        </button>
        <button v-if="store.isRecording" @click="store.pause()"
          class="flex items-center gap-2.5 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/4 transition-all">
          <i class="fas fa-pause text-sm"></i> Pausar
        </button>
        <button @click="confirmStop = true"
          class="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-50 dark:bg-red-600/15 border border-red-200 dark:border-red-500/25 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-600/25 transition-all">
          <i class="fas fa-stop text-sm"></i> Encerrar
        </button>
      </div>

      <!-- Aviso Web Speech API -->
      <div v-if="!store.hasMicSupport"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/[0.08] border border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400 text-xs">
        <i class="fas fa-circle-exclamation"></i>
        Microfone não disponível ou não permitido. Verifique as permissões do navegador.
      </div>
    </main>

    <!-- ── Modal de confirmação de encerramento ───────────────────────── -->
    <Transition name="modal">
      <div v-if="confirmStop" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" @click="confirmStop = false" />
        <div class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex justify-center mb-4">
            <div class="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/25 flex items-center justify-center">
              <i class="fas fa-stop text-red-500 dark:text-red-400"></i>
            </div>
          </div>
          <h3 class="text-base font-bold text-center text-gray-900 dark:text-white mb-1">Encerrar gravação?</h3>
          <p class="text-sm text-gray-500 text-center mb-6">
            A transcrição será salva. Você poderá gerar o resumo de IA depois.
          </p>
          <div class="flex gap-3">
            <button @click="confirmStop = false"
              class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors text-sm">
              Continuar
            </button>
            <button @click="handleStop"
              class="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-semibold">
              Encerrar e Salvar
            </button>
          </div>
          <button @click="handleDiscard"
            class="w-full mt-2 py-2 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
            Descartar sem salvar
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useInPersonRecordingStore } from '@/stores/Microsoft/inPersonRecording';

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
.modal-enter-active { transition: opacity 0.2s, transform 0.2s; }
.modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from   { opacity: 0; transform: scale(0.97); }
.modal-leave-to     { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
