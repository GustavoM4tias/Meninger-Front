<template>
  <teleport to="body">
    <transition name="signature-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        :aria-label="`Assinar: ${documentPayload?.document_name}`"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          @click="handleBackdropClick"
        />

        <!-- Card -->
        <div class="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
            <div class="flex items-center gap-3">
              <!-- Step indicator -->
              <div class="flex items-center gap-1.5">
                <span
                  v-for="n in 3"
                  :key="n"
                  class="h-1.5 rounded-full transition-all duration-300"
                  :class="[
                    n <= currentStep
                      ? 'w-6 bg-blue-500'
                      : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                  ]"
                />
              </div>
              <span class="text-xs text-gray-400 font-medium uppercase tracking-wide">
                {{ stepLabel }}
              </span>
            </div>
            <button
              type="button"
              class="h-8 w-8 grid place-items-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
              @click="cancel"
              aria-label="Fechar"
            >
              <i class="fas fa-times text-sm" />
            </button>
          </div>

          <!-- ══════════════ STEP 1 — Confirmação do documento ══════════════ -->
          <div v-if="currentStep === 1" class="p-5 space-y-4">
            <div>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">Confirmar assinatura</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Revise as informações antes de prosseguir.
              </p>
            </div>

            <!-- Info do documento -->
            <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 space-y-2">
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
                  <i class="fas fa-file-pdf text-blue-500 text-sm" />
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {{ documentPayload?.document_name }}
                  </p>
                  <p class="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                    {{ documentPayload?.document_type || 'PDF' }}
                  </p>
                </div>
              </div>

              <div v-if="documentPayload?.document_hash" class="pt-1 border-t border-gray-200 dark:border-white/10">
                <p class="text-[11px] text-gray-400 font-mono truncate">
                  SHA-256: {{ documentPayload.document_hash }}
                </p>
              </div>
            </div>

            <!-- Aviso de responsabilidade -->
            <div class="flex gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3.5">
              <i class="fas fa-shield-alt text-amber-500 text-sm mt-0.5 shrink-0" />
              <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Ao continuar, você confirma que leu e concorda com o conteúdo deste documento.
                A assinatura é juridicamente vinculativa e registrada com auditoria completa.
              </p>
            </div>

            <div v-if="initError" class="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
              {{ initError }}
            </div>

            <button
              type="button"
              class="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="initiating"
              @click="startSession"
            >
              <span v-if="initiating">
                <i class="fas fa-circle-notch fa-spin mr-2" />Preparando sessão...
              </span>
              <span v-else>Continuar para verificação</span>
            </button>
          </div>

          <!-- ══════════════ STEP 2 — Verificação MFA ══════════════ -->
          <div v-else-if="currentStep === 2" class="p-5 space-y-4">
            <div>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">Verificação de identidade</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Confirme sua senha e posicione o rosto na câmera.
              </p>
            </div>

            <!-- Timer de expiração da sessão -->
            <div v-if="sessionTimeLeft > 0" class="flex items-center gap-2 text-xs text-gray-400">
              <i class="fas fa-clock" />
              <span>Sessão expira em <strong class="text-gray-600 dark:text-gray-300">{{ formatTime(sessionTimeLeft) }}</strong></span>
              <div class="ml-auto h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all duration-1000"
                  :style="{ width: `${(sessionTimeLeft / (SESSION_TTL * 60)) * 100}%` }"
                />
              </div>
            </div>

            <!-- Câmera facial -->
            <div class="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video
                ref="videoRef"
                autoplay
                muted
                playsinline
                class="w-full h-full object-cover"
                :class="{ 'opacity-50': !cameraReady }"
              />

              <!-- Overlay de detecção -->
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <!-- Guia oval do rosto -->
                <div
                  class="rounded-full border-2 transition-colors duration-300"
                  :class="[
                    faceDetected
                      ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)]'
                      : 'border-white/30'
                  ]"
                  style="width: 140px; height: 180px"
                />
              </div>

              <!-- Status da câmera -->
              <div class="absolute bottom-2 left-0 right-0 flex justify-center">
                <div
                  class="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all"
                  :class="[
                    !cameraReady
                      ? 'bg-gray-900/70 text-gray-300'
                      : faceDetected
                        ? 'bg-green-500/80 text-white'
                        : 'bg-black/60 text-gray-200'
                  ]"
                >
                  <i
                    class="mr-1.5"
                    :class="[
                      !cameraReady ? 'fas fa-circle-notch fa-spin' :
                      faceDetected ? 'fas fa-check-circle' : 'fas fa-user'
                    ]"
                  />
                  {{ cameraStatusLabel }}
                </div>
              </div>
            </div>

            <!-- Coleta de frames -->
            <div v-if="collecting" class="space-y-1.5">
              <div class="flex justify-between text-xs text-gray-500">
                <span>Coletando frames faciais...</span>
                <span>{{ collectedFrames }}/{{ FRAMES_NEEDED }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div
                  class="h-full rounded-full bg-blue-500 transition-all duration-200"
                  :style="{ width: `${(collectedFrames / FRAMES_NEEDED) * 100}%` }"
                />
              </div>
            </div>

            <!-- Senha -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Senha
              </label>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Digite sua senha"
                  autocomplete="current-password"
                  class="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  @keydown.enter="attemptSign"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  @click="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" />
                </button>
              </div>
            </div>

            <!-- Erro da verificação -->
            <div
              v-if="signError"
              class="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400 flex gap-2"
            >
              <i class="fas fa-exclamation-circle mt-0.5 shrink-0" />
              <span>{{ signError }}</span>
            </div>

            <button
              type="button"
              class="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="signing || !password || !faceEmbedding"
              @click="attemptSign"
            >
              <span v-if="signing">
                <i class="fas fa-circle-notch fa-spin mr-2" />Verificando e assinando...
              </span>
              <span v-else-if="!faceEmbedding">
                <i class="fas fa-camera mr-2" />Aguardando reconhecimento facial
              </span>
              <span v-else>
                <i class="fas fa-pen-nib mr-2" />Assinar documento
              </span>
            </button>
          </div>

          <!-- ══════════════ STEP 3 — Sucesso ══════════════ -->
          <div v-else-if="currentStep === 3" class="p-6 text-center space-y-4">
            <!-- Ícone de sucesso animado -->
            <div class="flex justify-center">
              <div class="relative h-20 w-20">
                <div class="absolute inset-0 rounded-full bg-green-100 dark:bg-green-500/20 animate-ping opacity-30" />
                <div class="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                  <i class="fas fa-check-circle text-green-500 text-4xl" />
                </div>
              </div>
            </div>

            <div>
              <p class="text-xl font-bold text-gray-900 dark:text-white">Documento assinado!</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ signResult?.document_name }}
              </p>
            </div>

            <!-- Código de verificação -->
            <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 space-y-1.5">
              <p class="text-xs text-gray-400 uppercase tracking-wider font-medium">Código de verificação</p>
              <p class="text-2xl font-mono font-bold tracking-[0.2em] text-gray-900 dark:text-white">
                {{ signResult?.verification_code }}
              </p>
              <p class="text-[11px] text-gray-400">
                Use este código para validar a autenticidade do documento.
              </p>
            </div>

            <!-- Metadados da assinatura -->
            <div class="text-left rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2 text-xs">
              <div class="flex justify-between text-gray-500">
                <span>Assinado em</span>
                <span class="font-medium text-gray-700 dark:text-gray-300">
                  {{ formatDate(signResult?.signed_at) }}
                </span>
              </div>
              <div class="flex justify-between text-gray-500">
                <span>ID da assinatura</span>
                <span class="font-mono text-gray-700 dark:text-gray-300">#{{ signResult?.signature_id }}</span>
              </div>
            </div>

            <button
              type="button"
              class="w-full py-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium text-sm transition"
              @click="close"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';
import { useSignatureStore } from '@/stores/Signature/signatureStore';

// ── Props & Emits ─────────────────────────────────────────────────────────────
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /**
   * Payload do documento a assinar.
   * { document_type?, document_ref?, document_url?, document_hash?, document_name, metadata? }
   */
  documentPayload: { type: Object, required: true },
});

const emit = defineEmits(['update:modelValue', 'signed', 'cancel']);

// ── Stores ────────────────────────────────────────────────────────────────────
const faceStore = useFaceStore();
const sigStore = useSignatureStore();

// ── Constantes ────────────────────────────────────────────────────────────────
const SESSION_TTL = 10;   // minutos (deve bater com o backend)
const FRAMES_NEEDED = 8;  // frames a coletar para embedding robusto

// ── Estado ────────────────────────────────────────────────────────────────────
const currentStep = ref(1);

// Step 1
const initiating = ref(false);
const initError = ref(null);

// Step 2
const videoRef = ref(null);
const cameraReady = ref(false);
const faceDetected = ref(false);
const faceEmbedding = ref(null);
const collecting = ref(false);
const collectedFrames = ref(0);
const password = ref('');
const showPassword = ref(false);
const signing = ref(false);
const signError = ref(null);
const sessionTimeLeft = ref(SESSION_TTL * 60);

// Step 3
const signResult = ref(null);

// ── Internos ──────────────────────────────────────────────────────────────────
let cameraStream = null;
let detectInterval = null;
let collectInterval = null;
let sessionTimer = null;
let collectBuffer = [];

// ── Computed ──────────────────────────────────────────────────────────────────
const stepLabel = computed(() => {
  const labels = ['Documento', 'Verificação', 'Concluído'];
  return labels[currentStep.value - 1] ?? '';
});

const cameraStatusLabel = computed(() => {
  if (!cameraReady.value) return 'Iniciando câmera...';
  if (collecting.value) return 'Coletando frames...';
  if (faceEmbedding.value) return 'Rosto capturado';
  if (faceDetected.value) return 'Rosto detectado';
  return 'Posicione seu rosto';
});

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(() => props.modelValue, (open) => {
  if (!open) cleanup();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

// ── Câmera ────────────────────────────────────────────────────────────────────
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
    if (videoRef.value) {
      videoRef.value.srcObject = cameraStream;
      await videoRef.value.play().catch(() => {});
    }
    cameraReady.value = true;
    startFaceDetectionLoop();
  } catch (err) {
    signError.value = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.';
    console.error('[SignatureModal] câmera:', err);
  }
}

function startFaceDetectionLoop() {
  detectInterval = setInterval(async () => {
    if (!videoRef.value || !cameraReady.value || faceEmbedding.value) return;
    try {
      const emb = await faceStore.getOneGoodEmbedding(videoRef.value);
      faceDetected.value = !!emb;
      if (emb && !collecting.value) startEmbeddingCollection();
    } catch { /* ignora frames com falha */ }
  }, 250);
}

async function startEmbeddingCollection() {
  if (collecting.value || faceEmbedding.value) return;
  collecting.value = true;
  collectBuffer = [];
  collectedFrames.value = 0;

  collectInterval = setInterval(async () => {
    if (!videoRef.value) return;
    const emb = await faceStore.getOneGoodEmbedding(videoRef.value, {
      inputSize: 320, scoreThreshold: 0.6,
    }).catch(() => null);

    if (emb) {
      collectBuffer.push(emb);
      collectedFrames.value = collectBuffer.length;
    }

    if (collectBuffer.length >= FRAMES_NEEDED) {
      clearInterval(collectInterval);
      collecting.value = false;
      faceEmbedding.value = averageEmbedding(collectBuffer);
    }
  }, 150);
}

function averageEmbedding(arr) {
  if (!arr.length) return null;
  const len = arr[0].length;
  const out = new Array(len).fill(0);
  for (const v of arr) for (let i = 0; i < len; i++) out[i] += v[i];
  for (let i = 0; i < len; i++) out[i] /= arr.length;
  return out;
}

function stopCamera() {
  clearInterval(detectInterval);
  clearInterval(collectInterval);
  detectInterval = null;
  collectInterval = null;
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  if (videoRef.value) videoRef.value.srcObject = null;
  cameraReady.value = false;
  faceDetected.value = false;
}

// ── Timer de sessão ───────────────────────────────────────────────────────────
function startSessionTimer() {
  sessionTimeLeft.value = SESSION_TTL * 60;
  sessionTimer = setInterval(() => {
    sessionTimeLeft.value--;
    if (sessionTimeLeft.value <= 0) {
      clearInterval(sessionTimer);
      signError.value = 'Sessão expirada. Feche e tente novamente.';
    }
  }, 1000);
}

// ── Fluxo ─────────────────────────────────────────────────────────────────────
async function startSession() {
  initiating.value = true;
  initError.value = null;
  try {
    await sigStore.initiate(props.documentPayload);
    currentStep.value = 2;
    await faceStore.loadModelsOnce();
    startCamera();
    startSessionTimer();
  } catch (err) {
    initError.value = sigStore.error || 'Erro ao iniciar sessão de assinatura.';
  } finally {
    initiating.value = false;
  }
}

async function attemptSign() {
  if (!password.value || !faceEmbedding.value) return;
  signing.value = true;
  signError.value = null;
  try {
    const result = await sigStore.sign({
      password: password.value,
      face_embedding: faceEmbedding.value,
    });
    stopCamera();
    clearInterval(sessionTimer);
    signResult.value = result;
    currentStep.value = 3;
    emit('signed', result);
  } catch (err) {
    signError.value = sigStore.error || 'Verificação falhou. Tente novamente.';
    // Se face falhou, reseta embedding para nova coleta
    if (err?.payload?.code === 'FACE_MISMATCH') {
      faceEmbedding.value = null;
      collectBuffer = [];
      collectedFrames.value = 0;
      collecting.value = false;
    }
  } finally {
    signing.value = false;
  }
}

function cancel() {
  cleanup();
  emit('cancel');
  emit('update:modelValue', false);
}

function close() {
  cleanup();
  emit('update:modelValue', false);
}

function handleBackdropClick() {
  if (currentStep.value === 3) close();
  // Nas steps 1 e 2 não fecha ao clicar no backdrop (evita perda acidental)
}

function cleanup() {
  stopCamera();
  clearInterval(sessionTimer);
  sigStore.reset();
  // Reset local state
  currentStep.value = 1;
  initiating.value = false;
  initError.value = null;
  signing.value = false;
  signError.value = null;
  password.value = '';
  showPassword.value = false;
  faceEmbedding.value = null;
  collecting.value = false;
  collectedFrames.value = 0;
  signResult.value = null;
}

onBeforeUnmount(cleanup);
</script>

<style scoped>
.signature-fade-enter-active,
.signature-fade-leave-active {
  transition: opacity 0.2s ease;
}
.signature-fade-enter-from,
.signature-fade-leave-to {
  opacity: 0;
}
</style>
