<script setup>
import { ref, onBeforeUnmount, nextTick } from 'vue';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';

const face = useFaceStore();

const showModal = ref(false);
const accepted = ref(false);
const enrolling = ref(false);
const loading = ref(false);

const videoRef = ref(null);
const overlayRef = ref(null);
const streamRef = ref(null);

const collected = ref(0);
const target = 15;

function openModal() { showModal.value = true; }

function closeModal() {
  stopCamera();
  enrolling.value = false;
  loading.value = false;
  accepted.value = false;
  collected.value = 0;
  showModal.value = false;
}

async function ensureVideoReady() {
  await nextTick();
  const v = videoRef.value;
  if (!v) throw new Error('videoRef nulo');
  if (v.readyState >= 2 && v.videoWidth && v.videoHeight) return;
  await new Promise((resolve) => { v.onloadedmetadata = () => resolve(); });
}

async function startCamera() {
  streamRef.value = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  videoRef.value.srcObject = streamRef.value;
  await ensureVideoReady();
  const v = videoRef.value;
  const c = overlayRef.value;
  if (c) { c.width = v.videoWidth; c.height = v.videoHeight; }
}

function stopCamera() {
  if (streamRef.value) streamRef.value.getTracks().forEach(t => t.stop());
  streamRef.value = null;
  const c = overlayRef.value;
  if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
}

async function drawOnce() {
  const v = videoRef.value;
  const c = overlayRef.value;
  if (!v || !c) return;

  const det = await face.pingDetect(v, { inputSize: 416, scoreThreshold: 0.3 });
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);

  if (det) {
    const box = det.box;
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.fillStyle = '#10B981';
    ctx.font = '14px sans-serif';
    ctx.fillText(`score: ${det.score.toFixed(3)}`, box.x, Math.max(10, box.y - 4));
  }
}

onBeforeUnmount(() => stopCamera());

async function startEnroll() {
  if (!accepted.value) return;
  loading.value = true;
  enrolling.value = true;
  collected.value = 0;

  try {
    await face.loadModelsOnce();
    await startCamera();

    const embeddings = [];
    while (embeddings.length < target) {
      await drawOnce();
      const e = await face.getOneGoodEmbedding(videoRef.value, {
        inputSize: 416, scoreThreshold: 0.65,
      });
      if (e) {
        embeddings.push(e);
        collected.value = embeddings.length;
      }
      await new Promise(r => setTimeout(r, 300));
    }

    const r = await face.enroll(embeddings);
    if (r.success) closeModal();
  } catch (err) {
    console.error('[FaceEnroll] Erro:', err);
  } finally {
    stopCamera();
    loading.value = false;
    enrolling.value = false;
  }
}
</script>

<template>
  <div>
    <Button variant="secondary" size="sm" @click="openModal"><slot></slot></Button>

    <Modal :open="showModal" size="lg" @close="closeModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-users-viewfinder text-sm"></i>
          </div>
          <div>
            <h2 class="text-base font-semibold text-ink">Cadastro biométrico</h2>
            <p class="text-xs text-ink-muted mt-0.5">Termo de consentimento (LGPD)</p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Termo -->
        <div class="rounded-lg border border-line bg-surface-sunken px-4 py-3 max-h-48 overflow-auto text-sm text-ink-muted leading-relaxed space-y-2">
          <p>
            Ao habilitar o login por reconhecimento facial, você concorda com a coleta e
            armazenamento de um <strong class="text-ink">template biométrico</strong>
            (vetor numérico) exclusivamente para fins de autenticação neste sistema.
          </p>
          <ul class="list-disc ml-5 space-y-1">
            <li>Você pode desabilitar e excluir o template a qualquer momento.</li>
            <li>As imagens não serão armazenadas; somente o <em>embedding</em> será mantido.</li>
            <li>O uso é restrito à autenticação; não há compartilhamento com terceiros.</li>
          </ul>
        </div>

        <label class="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" v-model="accepted" class="mt-0.5" />
          <span class="text-sm text-ink">Li e concordo com o termo de consentimento.</span>
        </label>

        <!-- Captura -->
        <div v-if="enrolling" class="space-y-3">
          <div class="rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2.5 text-xs text-accent leading-relaxed">
            Posicione o rosto no centro e olhe direto para a câmera.
            Vire levemente a cabeça para os lados (±15°) para diversificar o template.
            Boa iluminação frontal melhora a acurácia.
          </div>

          <div class="relative rounded-lg overflow-hidden border border-line bg-black">
            <video ref="videoRef" autoplay playsinline muted class="w-full"></video>
            <canvas ref="overlayRef" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>
          </div>

          <!-- Progress -->
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-ink-muted flex items-center gap-1.5">
                <Spinner size="xs" /> Coletando frames de qualidade
              </span>
              <span class="font-mono text-ink">{{ collected }}/{{ target }}</span>
            </div>
            <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
              <div class="h-full bg-accent rounded-full transition-all duration-500"
                :style="{ width: `${(collected / target) * 100}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="closeModal" :disabled="loading">Cancelar</Button>
        <Button :loading="loading" :disabled="!accepted" icon="fas fa-camera" @click="startEnroll">
          {{ loading ? 'Processando...' : 'Começar' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
