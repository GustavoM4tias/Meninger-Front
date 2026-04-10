<template>
  <teleport to="body">
    <transition name="sig-cancel-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="handleBackdropClick" />

        <div class="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
            <div class="flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20">
                <i class="fas fa-ban text-red-500 text-xs" />
              </div>
              <span class="font-semibold text-gray-900 dark:text-white text-sm">Cancelar assinatura</span>
            </div>
            <button
              type="button"
              class="h-8 w-8 grid place-items-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition"
              @click="cancel"
            >
              <i class="fas fa-times text-sm" />
            </button>
          </div>

          <!-- ══ STEP 1 — Confirmação ══ -->
          <div v-if="step === 'confirm'" class="p-5 space-y-4">
            <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 flex gap-3">
              <i class="fas fa-file-pdf text-gray-400 text-sm mt-0.5 shrink-0" />
              <div class="min-w-0">
                <p class="font-medium text-gray-900 dark:text-white text-sm truncate">{{ signature?.document_name }}</p>
                <p class="text-xs text-gray-400 mt-0.5">Assinado em {{ formatDate(signature?.signed_at) }}</p>
              </div>
            </div>

            <div class="flex gap-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3.5">
              <i class="fas fa-exclamation-triangle text-red-500 text-sm mt-0.5 shrink-0" />
              <p class="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                Cancelar esta assinatura invalidará o documento. A operação requer verificação de
                <strong>senha e reconhecimento facial</strong> e ficará registrada na auditoria.
              </p>
            </div>

            <!-- Motivo (opcional) -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Motivo do cancelamento <span class="normal-case text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                v-model="reason"
                rows="2"
                placeholder="Ex: Documento com erro, nova versão disponível..."
                class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none transition"
              />
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition"
                @click="cancel"
              >
                Não cancelar
              </button>
              <button
                type="button"
                class="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
                @click="step = 'verify'"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>

          <!-- ══ STEP 2 — Verificação MFA ══ -->
          <div v-else-if="step === 'verify'" class="p-5 space-y-4">
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">Verificação de identidade</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Confirme senha e facial para cancelar.</p>
            </div>

            <!-- Câmera + canvas overlay (padrão FacialAuth) -->
            <div class="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref="videoRef" autoplay muted playsinline class="w-full h-full object-cover" :class="{ 'opacity-40': !cameraReady }" />
              <canvas ref="overlayRef" class="absolute inset-0 w-full h-full pointer-events-none" />
              <div class="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                <div
                  class="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all"
                  :class="[
                    !cameraReady    ? 'bg-gray-900/70 text-gray-300'  :
                    faceEmbedding   ? 'bg-green-500/80 text-white'     :
                    collecting      ? 'bg-blue-500/80 text-white'      :
                    faceDetected    ? 'bg-blue-400/70 text-white'      :
                                      'bg-black/60 text-gray-300'
                  ]"
                >
                  <i class="mr-1.5" :class="[
                    !cameraReady  ? 'fas fa-circle-notch fa-spin' :
                    faceEmbedding ? 'fas fa-check-circle'         :
                    collecting    ? 'fas fa-circle-notch fa-spin' :
                                    'fas fa-user'
                  ]" />
                  {{ cameraStatusLabel }}
                </div>
              </div>
            </div>

            <!-- Progresso coleta -->
            <div v-if="collecting || faceEmbedding" class="space-y-1">
              <div class="flex justify-between text-xs text-gray-400">
                <span>{{ faceEmbedding ? 'Facial capturada' : 'Capturando...' }}</span>
                <span>{{ Math.min(collectedFrames, FRAMES_NEEDED) }}/{{ FRAMES_NEEDED }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-200"
                  :class="faceEmbedding ? 'bg-green-500' : 'bg-red-500'"
                  :style="{ width: `${Math.min((collectedFrames / FRAMES_NEEDED) * 100, 100)}%` }"
                />
              </div>
            </div>

            <!-- Senha -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Senha</label>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Digite sua senha"
                  autocomplete="current-password"
                  class="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition"
                  @keydown.enter="attemptCancel"
                />
                <button type="button" class="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600" @click="showPassword = !showPassword">
                  <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" />
                </button>
              </div>
            </div>

            <!-- Erro -->
            <div v-if="verifyError" class="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400 flex gap-2">
              <i class="fas fa-exclamation-circle mt-0.5 shrink-0" />
              <span>{{ verifyError }}</span>
            </div>

            <div class="flex gap-3">
              <button type="button" class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition" @click="step = 'confirm'; stopCamera()">
                <i class="fas fa-arrow-left mr-1.5" />Voltar
              </button>
              <button
                type="button"
                class="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="cancelling || !password || !faceEmbedding"
                @click="attemptCancel"
              >
                <i v-if="cancelling" class="fas fa-circle-notch fa-spin mr-1.5" />
                <i v-else-if="!faceEmbedding" class="fas fa-camera mr-1.5" />
                <i v-else class="fas fa-ban mr-1.5" />
                {{ cancelling ? 'Cancelando...' : !faceEmbedding ? 'Aguardando facial' : 'Cancelar assinatura' }}
              </button>
            </div>
          </div>

          <!-- ══ STEP 3 — Sucesso do cancelamento ══ -->
          <div v-else-if="step === 'done'" class="p-6 text-center space-y-4">
            <div class="flex justify-center">
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
                <i class="fas fa-ban text-gray-500 dark:text-gray-300 text-3xl" />
              </div>
            </div>
            <div>
              <p class="text-lg font-bold text-gray-900 dark:text-white">Assinatura cancelada</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">O documento foi marcado como cancelado e não é mais válido.</p>
            </div>
            <button type="button" class="w-full py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium text-sm transition" @click="close">
              Fechar
            </button>
          </div>

        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';
import { useSignatureStore } from '@/stores/Signature/signatureStore';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Objeto da assinatura a cancelar: { id, document_name, signed_at } */
  signature:  { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'cancelled']);

const face     = useFaceStore();
const sigStore = useSignatureStore();

// ── Estado ────────────────────────────────────────────────────────────────────
const FRAMES_NEEDED = 10;

const step         = ref('confirm'); // 'confirm' | 'verify' | 'done'
const reason       = ref('');
const password     = ref('');
const showPassword = ref(false);
const cancelling   = ref(false);
const verifyError  = ref(null);

// Câmera
const videoRef        = ref(null);
const overlayRef      = ref(null);
const streamRef       = ref(null);
const cameraReady     = ref(false);
const faceDetected    = ref(false);
const faceEmbedding   = ref(null);
const collecting      = ref(false);
const collectedFrames = ref(0);

let collectBuffer  = [];
let overlayRunning = false;

// ── Computed ──────────────────────────────────────────────────────────────────
const cameraStatusLabel = computed(() => {
  if (!cameraReady.value)  return 'Iniciando câmera...';
  if (faceEmbedding.value) return 'Facial capturada ✓';
  if (collecting.value)    return 'Capturando facial...';
  if (faceDetected.value)  return 'Rosto detectado';
  return 'Posicione seu rosto';
});

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(() => props.modelValue, (open) => { if (!open) cleanup(); });
watch(step, async (s) => {
  if (s === 'verify') {
    await face.loadModelsOnce();
    await startCamera();
  }
});

// ── Câmera (padrão FacialAuth) ────────────────────────────────────────────────
async function startCamera() {
  try {
    streamRef.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    videoRef.value.srcObject = streamRef.value;
    await nextTick();
    const v = videoRef.value;
    if (v.readyState < 2) await new Promise(r => { v.onloadedmetadata = r; });
    const c = overlayRef.value;
    if (c) { c.width = v.videoWidth; c.height = v.videoHeight; }
    cameraReady.value = true;
    startCollectLoop();
  } catch {
    verifyError.value = 'Câmera não disponível. Verifique as permissões.';
  }
}

function stopCamera() {
  overlayRunning = false;
  if (streamRef.value) { streamRef.value.getTracks().forEach(t => t.stop()); streamRef.value = null; }
  if (videoRef.value) videoRef.value.srcObject = null;
  if (overlayRef.value) overlayRef.value.getContext('2d')?.clearRect(0, 0, overlayRef.value.width, overlayRef.value.height);
  cameraReady.value = false;
}

async function startCollectLoop() {
  overlayRunning = true;
  collecting.value = true;
  collectBuffer = [];
  collectedFrames.value = 0;

  while (overlayRunning && collectBuffer.length < FRAMES_NEEDED) {
    await drawOverlay();
    if (!faceEmbedding.value) {
      const emb = await face.getOneGoodEmbedding(videoRef.value, { inputSize: 416, scoreThreshold: 0.3 }).catch(() => null);
      if (emb) { collectBuffer.push(emb); collectedFrames.value = collectBuffer.length; faceDetected.value = true; }
      else faceDetected.value = false;
    }
    await new Promise(r => setTimeout(r, 120));
  }

  collecting.value = false;
  if (collectBuffer.length >= FRAMES_NEEDED) {
    const len = collectBuffer[0].length;
    const out = new Array(len).fill(0);
    for (const v of collectBuffer) for (let i = 0; i < len; i++) out[i] += v[i];
    for (let i = 0; i < len; i++) out[i] /= collectBuffer.length;
    faceEmbedding.value = out;
  }
}

async function drawOverlay() {
  const v = videoRef.value; const c = overlayRef.value;
  if (!v || !c) return;
  const det = await face.pingDetect(v, { inputSize: 416, scoreThreshold: 0.3 }).catch(() => null);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  if (det) {
    const box = det.box;
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.fillStyle = '#ef4444'; ctx.font = '13px sans-serif';
    ctx.fillText(`${(det.score * 100).toFixed(0)}%`, box.x, Math.max(12, box.y - 4));
  }
}

// ── Ação ─────────────────────────────────────────────────────────────────────
async function attemptCancel() {
  if (!password.value || !faceEmbedding.value) return;
  cancelling.value = true;
  verifyError.value = null;
  try {
    await sigStore.cancelSignature(props.signature.id, {
      password:       password.value,
      face_embedding: faceEmbedding.value,
      reason:         reason.value || undefined,
    });
    stopCamera();
    step.value = 'done';
    emit('cancelled', props.signature.id);
  } catch (err) {
    verifyError.value = sigStore.error || 'Verificação falhou. Tente novamente.';
    if (err?.payload?.code === 'FACE_MISMATCH') {
      faceEmbedding.value = null; collectBuffer = []; collectedFrames.value = 0;
      collecting.value = false; startCollectLoop();
    }
  } finally {
    cancelling.value = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '-';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

function handleBackdropClick() { if (step.value === 'done') close(); }
function cancel() { cleanup(); emit('update:modelValue', false); }
function close()  { cleanup(); emit('update:modelValue', false); }

function cleanup() {
  overlayRunning = false;
  stopCamera();
  step.value = 'confirm';
  reason.value = ''; password.value = ''; showPassword.value = false;
  cancelling.value = false; verifyError.value = null;
  faceEmbedding.value = null; collecting.value = false; collectedFrames.value = 0;
  faceDetected.value = false; collectBuffer = [];
}

onBeforeUnmount(cleanup);
</script>

<style scoped>
.sig-cancel-fade-enter-active, .sig-cancel-fade-leave-active { transition: opacity 0.2s ease; }
.sig-cancel-fade-enter-from, .sig-cancel-fade-leave-to { opacity: 0; }
</style>
