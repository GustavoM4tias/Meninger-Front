<template>
  <teleport to="body">
    <transition name="signature-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="handleBackdropClick" />

        <!-- Card -->
        <div class="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span
                  v-for="n in 3" :key="n"
                  class="h-1.5 rounded-full transition-all duration-300"
                  :class="n <= currentStep ? 'w-6 bg-blue-500' : 'w-1.5 bg-gray-300 dark:bg-gray-600'"
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
            >
              <i class="fas fa-times text-sm" />
            </button>
          </div>

          <!-- ══ STEP 1 — Revisão do documento ══ -->
          <div v-if="currentStep === 1" class="p-5 space-y-4">
            <div>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">Confirmar assinatura</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Revise antes de prosseguir.</p>
            </div>

            <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 space-y-2">
              <div class="flex items-start gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
                  <i class="fas fa-file-pdf text-blue-500 text-sm" />
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white text-sm truncate">{{ documentInfo?.document_name }}</p>
                  <p class="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{{ documentInfo?.document_type || 'PDF' }}</p>
                </div>
              </div>
              <a
                v-if="documentInfo?.document_url"
                :href="documentInfo.document_url"
                target="_blank"
                class="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600"
              >
                <i class="fas fa-eye text-[10px]" /> Visualizar documento
              </a>
              <div v-if="documentInfo?.document_hash" class="pt-1 border-t border-gray-200 dark:border-white/10">
                <p class="text-[11px] text-gray-400 font-mono truncate">SHA-256: {{ documentInfo.document_hash }}</p>
              </div>
            </div>

            <div
              v-if="isRequested && documentInfo?.requester_name"
              class="flex items-center gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3"
            >
              <i class="fas fa-user text-blue-400 text-sm shrink-0" />
              <p class="text-xs text-blue-700 dark:text-blue-300">
                Solicitado por <strong>{{ documentInfo.requester_name }}</strong>
              </p>
            </div>
            <!-- Progresso do documento (novo fluxo) -->
            <div
              v-if="isNewFlow && props.signerItem?.document"
              class="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3"
            >
              <i class="fas fa-users text-gray-400 text-sm shrink-0" />
              <p class="text-xs text-gray-600 dark:text-gray-300">
                {{ props.signerItem.document.signed_signers_count || 0 }} de
                {{ props.signerItem.document.required_signers_count || 1 }} assinatura(s) concluídas
              </p>
            </div>

            <div class="flex gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3.5">
              <i class="fas fa-shield-alt text-amber-500 text-sm mt-0.5 shrink-0" />
              <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Ao continuar, a assinatura será registrada com autenticação biométrica e auditoria completa.
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
              <i v-if="initiating" class="fas fa-circle-notch fa-spin mr-2" />
              {{ initiating ? 'Preparando sessão...' : 'Continuar para verificação' }}
            </button>
          </div>

          <!-- ══ STEP 2 — Verificação facial + senha ══ -->
          <div v-else-if="currentStep === 2" class="p-5 space-y-4">
            <div>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">Verificação de identidade</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Posicione o rosto e confirme sua senha.
              </p>
            </div>

            <!-- Timer -->
            <div v-if="sessionTimeLeft > 0" class="flex items-center gap-2 text-xs text-gray-400">
              <i class="fas fa-clock" />
              <span>
                Expira em
                <strong :class="sessionTimeLeft < 60 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'">
                  {{ formatTime(sessionTimeLeft) }}
                </strong>
              </span>
              <div class="ml-auto h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-1000"
                  :class="sessionTimeLeft < 60 ? 'bg-red-500' : 'bg-blue-500'"
                  :style="{ width: `${(sessionTimeLeft / (SESSION_TTL * 60)) * 100}%` }"
                />
              </div>
            </div>

            <!-- Câmera com canvas overlay (padrão FacialAuth) -->
            <div class="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video
                ref="videoRef"
                autoplay muted playsinline
                class="w-full h-full object-cover"
                :class="{ 'opacity-40': !cameraReady }"
              />
              <!-- Canvas overlay para desenhar bounding box (igual ao FacialAuth) -->
              <canvas
                ref="overlayRef"
                class="absolute inset-0 w-full h-full pointer-events-none"
              />

              <!-- Status badge -->
              <div class="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                <div
                  class="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all duration-300"
                  :class="[
                    !cameraReady       ? 'bg-gray-900/70 text-gray-300'   :
                    faceEmbedding      ? 'bg-green-500/80 text-white'      :
                    collecting         ? 'bg-blue-500/80 text-white'       :
                    faceDetected       ? 'bg-blue-400/70 text-white'       :
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

            <!-- Progresso de coleta -->
            <div v-if="collecting || faceEmbedding" class="space-y-1.5">
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ faceEmbedding ? 'Facial capturada' : 'Capturando facial...' }}</span>
                <span>{{ Math.min(collectedFrames, FRAMES_NEEDED) }}/{{ FRAMES_NEEDED }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-200"
                  :class="faceEmbedding ? 'bg-green-500' : 'bg-blue-500'"
                  :style="{ width: `${Math.min((collectedFrames / FRAMES_NEEDED) * 100, 100)}%` }"
                />
              </div>
            </div>

            <!-- Senha -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Sua senha
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

            <!-- Erro de verificação -->
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
                <i class="fas fa-camera mr-2" />Aguardando reconhecimento facial...
              </span>
              <span v-else-if="!password">
                <i class="fas fa-lock mr-2" />Digite sua senha para assinar
              </span>
              <span v-else>
                <i class="fas fa-pen-nib mr-2" />Assinar documento
              </span>
            </button>
          </div>

          <!-- ══ STEP 3 — Sucesso ══ -->
          <div v-else-if="currentStep === 3" class="p-6 text-center space-y-4">
            <div class="flex justify-center">
              <div class="relative h-20 w-20">
                <div class="absolute inset-0 rounded-full bg-green-100 dark:bg-green-500/20 animate-ping opacity-30" />
                <div class="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                  <i class="fas fa-check-circle text-green-500 text-4xl" />
                </div>
              </div>
            </div>

            <!-- Resultado: totalmente concluído vs parcialmente -->
            <div v-if="signResult?.is_fully_signed">
              <p class="text-xl font-bold text-gray-900 dark:text-white">Documento totalmente assinado!</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Todos os {{ signResult.required_signers_count }} assinantes confirmaram. PDF final gerado.
              </p>
            </div>
            <div v-else>
              <p class="text-xl font-bold text-gray-900 dark:text-white">Assinatura registrada!</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ signResult?.signed_signers_count ?? 1 }} de {{ signResult?.required_signers_count ?? 1 }} assinaturas concluídas.
                <template v-if="(signResult?.required_signers_count ?? 1) - (signResult?.signed_signers_count ?? 1) > 0">
                  Aguardando {{ (signResult.required_signers_count - signResult.signed_signers_count) }} assinatura(s) restante(s).
                </template>
              </p>
            </div>

            <!-- Código final (doc totalmente assinado) -->
            <div v-if="signResult?.final_verification_code" class="rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-4 space-y-1.5">
              <p class="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider font-medium">Código final do documento</p>
              <p class="text-2xl font-mono font-bold tracking-[0.2em] text-gray-900 dark:text-white">
                {{ signResult.final_verification_code }}
              </p>
              <p class="text-[11px] text-green-600 dark:text-green-400">Use este código para validar a autenticidade do documento.</p>
            </div>

            <!-- Código individual do assinante -->
            <div v-else class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 space-y-1.5">
              <p class="text-xs text-gray-400 uppercase tracking-wider font-medium">Seu código de assinatura</p>
              <p class="text-2xl font-mono font-bold tracking-[0.2em] text-gray-900 dark:text-white">
                {{ signResult?.verification_code }}
              </p>
              <p class="text-[11px] text-gray-400">Este código identifica sua assinatura individual no documento.</p>
            </div>

            <div class="text-left rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2 text-xs">
              <div class="flex justify-between text-gray-500">
                <span>Assinado em</span>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatDate(signResult?.signed_at) }}</span>
              </div>
              <div class="flex justify-between text-gray-500">
                <span>{{ isNewFlow ? 'ID do documento' : 'ID da assinatura' }}</span>
                <span class="font-mono text-gray-700 dark:text-gray-300">
                  #{{ signResult?.document_id ?? signResult?.signature_id }}
                </span>
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
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';
import { useSignatureStore } from '@/stores/Signature/signatureStore';
import { useSignatureDocumentStore } from '@/stores/Signature/signatureDocumentStore';

// ── Props & Emits ─────────────────────────────────────────────────────────────
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /**
   * Novo fluxo multi-assinatura:
   *   signerItem: { id, document: { document_name, document_type, document_url, document_hash }, document.creator }
   *
   * Fluxo legado (auto-assinatura):
   *   documentPayload: { document_name, document_type, document_url?, document_hash?, _from_request?, signature_id? }
   */
  signerItem:      { type: Object, default: null },
  documentPayload: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'signed', 'cancel']);

// ── Stores ────────────────────────────────────────────────────────────────────
const face       = useFaceStore();
const sigStore   = useSignatureStore();
const sigDocStore = useSignatureDocumentStore();

// ── Modo ──────────────────────────────────────────────────────────────────────
const isNewFlow     = computed(() => !!props.signerItem);
const activeStore   = computed(() => isNewFlow.value ? sigDocStore : sigStore);
const documentInfo  = computed(() => {
  if (isNewFlow.value) {
    const d = props.signerItem?.document ?? {};
    return {
      document_name: d.document_name,
      document_type: d.document_type,
      document_url:  d.original_document_url || d.final_document_url,
      document_hash: d.document_hash,
      requester_name: d.creator?.username,
    };
  }
  return props.documentPayload ?? {};
});

// ── Constantes ────────────────────────────────────────────────────────────────
const SESSION_TTL   = 10;   // minutos
const FRAMES_NEEDED = 10;   // igual ao FacialAuth

// ── Estado ────────────────────────────────────────────────────────────────────
const currentStep = ref(1);

// Step 1
const initiating = ref(false);
const initError  = ref(null);

// Step 2 — câmera
const videoRef        = ref(null);
const overlayRef      = ref(null);
const streamRef       = ref(null);
const cameraReady     = ref(false);
const faceDetected    = ref(false);
const faceEmbedding   = ref(null);
const collecting      = ref(false);
const collectedFrames = ref(0);

// Step 2 — senha
const password     = ref('');
const showPassword = ref(false);

// Step 2 — assinatura
const signing         = ref(false);
const signError       = ref(null);
const sessionTimeLeft = ref(SESSION_TTL * 60);

// Step 3
const signResult = ref(null);

// Internos
let collectBuffer  = [];
let sessionTimer   = null;
let overlayRunning = false;

// ── Computed ──────────────────────────────────────────────────────────────────
const isFromRequest = computed(() => !!props.documentPayload?._from_request);
const isRequested   = computed(() => isNewFlow.value || isFromRequest.value);

const stepLabel = computed(() =>
  ['Documento', 'Verificação', 'Concluído'][currentStep.value - 1] ?? ''
);

const cameraStatusLabel = computed(() => {
  if (!cameraReady.value)  return 'Iniciando câmera...';
  if (faceEmbedding.value) return 'Facial capturada ✓';
  if (collecting.value)    return 'Capturando facial...';
  if (faceDetected.value)  return 'Rosto detectado';
  return 'Posicione seu rosto no centro';
});

// ── Watcher ───────────────────────────────────────────────────────────────────
watch(() => props.modelValue, (open) => { if (!open) cleanup(); });

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(secs) {
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}
function formatDate(d) {
  if (!d) return '-';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

// ── Câmera (padrão FacialAuth) ────────────────────────────────────────────────
async function ensureVideoReady() {
  await nextTick();
  const v = videoRef.value;
  if (!v) throw new Error('videoRef nulo');
  if (v.readyState >= 2 && v.videoWidth) return;
  await new Promise((resolve) => { v.onloadedmetadata = resolve; });
}

async function startCamera() {
  try {
    streamRef.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    videoRef.value.srcObject = streamRef.value;
    await ensureVideoReady();

    // Ajusta canvas ao tamanho real do vídeo (igual ao FacialAuth)
    const v = videoRef.value;
    const c = overlayRef.value;
    if (c) { c.width = v.videoWidth; c.height = v.videoHeight; }

    cameraReady.value = true;
    startCollectLoop();
  } catch (err) {
    signError.value = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.';
    console.error('[SignatureModal] câmera:', err);
  }
}

function stopCamera() {
  overlayRunning = false;
  if (streamRef.value) {
    streamRef.value.getTracks().forEach((t) => t.stop());
    streamRef.value = null;
  }
  if (videoRef.value)  videoRef.value.srcObject = null;
  if (overlayRef.value) overlayRef.value.getContext('2d')?.clearRect(0, 0, overlayRef.value.width, overlayRef.value.height);
  cameraReady.value  = false;
  faceDetected.value = false;
}

// ── Loop de coleta (igual ao FacialAuth: pingDetect para overlay + getOneGoodEmbedding) ──
async function startCollectLoop() {
  overlayRunning = true;
  collecting.value = true;
  collectBuffer = [];
  collectedFrames.value = 0;

  while (overlayRunning && collectBuffer.length < FRAMES_NEEDED) {
    // Feedback visual no canvas (caixa verde = rosto detectado)
    await drawOverlay();

    if (!faceEmbedding.value) {
      const emb = await face.getOneGoodEmbedding(videoRef.value, {
        inputSize: 416,
        scoreThreshold: 0.3,
      }).catch(() => null);

      if (emb) {
        collectBuffer.push(emb);
        collectedFrames.value = collectBuffer.length;
        faceDetected.value = true;
      } else {
        faceDetected.value = false;
      }
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  collecting.value = false;

  if (collectBuffer.length >= FRAMES_NEEDED) {
    faceEmbedding.value = averageEmbedding(collectBuffer);
  }
}

async function drawOverlay() {
  const v = videoRef.value;
  const c = overlayRef.value;
  if (!v || !c) return;

  const det = await face.pingDetect(v, { inputSize: 416, scoreThreshold: 0.3 }).catch(() => null);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);

  if (det) {
    const box = det.box;
    ctx.strokeStyle = '#22c55e'; // verde
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.fillStyle = '#22c55e';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${(det.score * 100).toFixed(0)}%`, box.x, Math.max(12, box.y - 4));
  }
}

function averageEmbedding(arr) {
  const len = arr[0].length;
  const out = new Array(len).fill(0);
  for (const v of arr) for (let i = 0; i < len; i++) out[i] += v[i];
  for (let i = 0; i < len; i++) out[i] /= arr.length;
  return out;
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

// ── Fluxo principal ───────────────────────────────────────────────────────────
async function startSession() {
  initiating.value = true;
  initError.value  = null;
  try {
    if (isNewFlow.value) {
      // Novo fluxo: inicia sessão para o signer item
      await sigDocStore.initiateSigner(props.signerItem.id);
    } else if (isFromRequest.value) {
      await sigStore.initiateFromRequest(props.documentPayload.signature_id);
    } else {
      await sigStore.initiate({
        document_name: props.documentPayload.document_name,
        document_type: props.documentPayload.document_type,
        document_url:  props.documentPayload.document_url  || null,
        document_hash: props.documentPayload.document_hash || null,
        metadata:      props.documentPayload.metadata      || {},
      });
    }

    currentStep.value = 2;
    await face.loadModelsOnce();
    await startCamera();
    startSessionTimer();
  } catch (err) {
    initError.value = (isNewFlow.value ? sigDocStore.error : sigStore.error) || err?.message || 'Erro ao iniciar sessão.';
  } finally {
    initiating.value = false;
  }
}

async function attemptSign() {
  if (!password.value || !faceEmbedding.value) return;
  signing.value   = true;
  signError.value = null;
  try {
    let result;
    if (isNewFlow.value) {
      result = await sigDocStore.sign({ password: password.value, face_embedding: faceEmbedding.value });
    } else {
      result = await sigStore.sign({ password: password.value, face_embedding: faceEmbedding.value });
    }
    stopCamera();
    clearInterval(sessionTimer);
    signResult.value  = result;
    currentStep.value = 3;
    emit('signed', result);
  } catch (err) {
    signError.value = (isNewFlow.value ? sigDocStore.error : sigStore.error) || 'Verificação falhou. Tente novamente.';
    if (err?.payload?.code === 'FACE_MISMATCH' || err?.code === 'FACE_MISMATCH') {
      faceEmbedding.value = null;
      collectBuffer = [];
      collectedFrames.value = 0;
      collecting.value = false;
      startCollectLoop();
    }
  } finally {
    signing.value = false;
  }
}

// ── Controles ─────────────────────────────────────────────────────────────────
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
  // Steps 1 e 2 não fecham no backdrop (evita perda acidental)
}

function cleanup() {
  overlayRunning = false;
  stopCamera();
  clearInterval(sessionTimer);
  sigStore.reset();
  sigDocStore.session = null;
  currentStep.value     = 1;
  initiating.value      = false;
  initError.value       = null;
  signing.value         = false;
  signError.value       = null;
  password.value        = '';
  showPassword.value    = false;
  faceEmbedding.value   = null;
  faceDetected.value    = false;
  collecting.value      = false;
  collectedFrames.value = 0;
  signResult.value      = null;
  collectBuffer         = [];
}

onBeforeUnmount(cleanup);
</script>

<style scoped>
.signature-fade-enter-active,
.signature-fade-leave-active { transition: opacity 0.2s ease; }
.signature-fade-enter-from,
.signature-fade-leave-to { opacity: 0; }
</style>
