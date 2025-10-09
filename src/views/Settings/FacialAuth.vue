<!-- src/components/Auth/FaceEnroll.vue -->
<template>
    <div>
        <Button @click="openModal" class="mb-2">Habilitar login facial</Button>

        <div v-if="showModal" class="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
                <h2 class="text-xl font-semibold mb-3">Termo de Consentimento (LGPD)</h2>
                <div class="prose dark:prose-invert max-h-48 overflow-auto border rounded p-3">
                    <p>
                        Ao habilitar o login por reconhecimento facial, você concorda com a
                        coleta e armazenamento de um <strong>template biométrico</strong> (vetor numérico)
                        exclusivamente para fins de autenticação neste sistema.
                    </p>
                    <ul class="list-disc ml-5">
                        <li>Você pode desabilitar e excluir o template a qualquer momento.</li>
                        <li>As imagens não serão armazenadas; somente o <em>embedding</em> será mantido.</li>
                        <li>O uso é restrito à autenticação; não há compartilhamento com terceiros.</li>
                    </ul>
                </div>

                <label class="flex items-start gap-2 mt-4">
                    <input type="checkbox" v-model="accepted" />
                    <span>Li e concordo com o termo de consentimento.</span>
                </label>

                <div class="mt-4 flex items-center gap-2">
                    <Button :disabled="loading || !accepted" @click="startEnroll">
                        {{ loading ? 'Processando...' : 'Começar' }}
                    </Button>
                    <Button outlined @click="closeModal">Cancelar</Button>
                </div>

                <!-- Área de captura -->
                <div v-if="enrolling" class="mt-4">
                    <p class="text-sm text-gray-500 mb-2">Posicione o rosto no centro. Pode ser solicitado virar
                        levemente a cabeça.</p>
                    <div class="relative">
                        <video ref="videoRef" autoplay playsinline muted class="w-full rounded-md border"></video>
                        <canvas ref="overlayRef" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Coletado: {{ collected }}/{{ target }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<!-- src/components/Auth/FaceEnroll.vue (troque apenas o <script setup>) -->
<script setup>
import Button from '@/components/UI/Button.vue';
import { ref, onBeforeUnmount, nextTick } from 'vue';
import { useFaceStore } from '@/stores/Auth/faceStore';
import * as faceapi from '@vladmandic/face-api';

const face = useFaceStore();

const showModal = ref(false);
const accepted = ref(false);
const enrolling = ref(false);
const loading = ref(false);

const videoRef = ref(null);
const overlayRef = ref(null);
const streamRef = ref(null);

const collected = ref(0);
const target = 10;

function openModal() {
    console.log('[FaceEnroll] Modal aberto');
    showModal.value = true;
}

function closeModal() {
    console.log('[FaceEnroll] Fechando modal e parando câmera');
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

    if (v.readyState >= 2 && v.videoWidth && v.videoHeight) {
        console.log('[FaceEnroll] vídeo OK', v.videoWidth, 'x', v.videoHeight);
        return;
    }
    await new Promise((resolve) => {
        v.onloadedmetadata = () => {
            console.log('[FaceEnroll] loadedmetadata', v.videoWidth, 'x', v.videoHeight);
            resolve();
        };
    });
}

async function startCamera() {
    console.log('[FaceEnroll] Iniciando câmera...');
    try {
        streamRef.value = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
        });
        videoRef.value.srcObject = streamRef.value;
        await ensureVideoReady();

        // dimensiona overlay para o tamanho real do vídeo
        const v = videoRef.value;
        const c = overlayRef.value;
        if (c) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            console.log('[FaceEnroll] overlay ajustado', c.width, 'x', c.height);
        }

        console.log('[FaceEnroll] Câmera iniciada com sucesso');
    } catch (err) {
        console.error('[FaceEnroll] Erro ao iniciar câmera:', err);
        throw err;
    }
}

function stopCamera() {
    if (streamRef.value) {
        streamRef.value.getTracks().forEach((t) => t.stop());
        console.log('[FaceEnroll] Câmera parada');
    }
    streamRef.value = null;
    const c = overlayRef.value;
    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
}

async function drawOnce() {
    // desenha um retangulo/score se houver detecção (debug visual)
    const v = videoRef.value;
    const c = overlayRef.value;
    if (!v || !c) return;

    const det = await face.pingDetect(v, { inputSize: 416, scoreThreshold: 0.3 });
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    if (det) {
        const box = det.box;
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = '#00FF00';
        ctx.font = '14px sans-serif';
        ctx.fillText(`score: ${det.score.toFixed(3)}`, box.x, Math.max(10, box.y - 4));
    }
}

onBeforeUnmount(() => stopCamera());

async function startEnroll() {
    if (!accepted.value) return;

    console.log('[FaceEnroll] Iniciando processo de enrolamento facial...');
    loading.value = true;
    enrolling.value = true;
    collected.value = 0;

    try {
        console.log('[FaceEnroll] Carregando modelos...');
        await face.loadModelsOnce();
        console.log('[FaceEnroll] Modelos carregados');

        await startCamera();

        const embeddings = [];
        // loop de coleta com overlay
        while (embeddings.length < target) {
            await drawOnce();

            const e = await face.getOneGoodEmbedding(videoRef.value, {
                inputSize: 416,       // 320/416/512 — 416 costuma ser um bom equilíbrio
                scoreThreshold: 0.3,  // mais permissivo para detectar e depois filtramos pelo .5
            });

            if (e) {
                embeddings.push(e);
                collected.value = embeddings.length;
                console.log(`[FaceEnroll] Embedding ${embeddings.length} coletado`);
            } else {
                console.warn('[FaceEnroll] Sem embedding neste frame');
            }

            await new Promise((r) => setTimeout(r, 120));
        }

        console.log('[FaceEnroll] Total de embeddings coletados:', embeddings.length);
        const r = await face.enroll(embeddings);
        console.log('[FaceEnroll] Resposta do backend:', r);

        if (r.success) {
            console.log('[FaceEnroll] Login facial habilitado');
            closeModal();
        } else {
            console.error('[FaceEnroll] Erro do backend no enrolamento:', r.error);
        }
    } catch (err) {
        console.error('[FaceEnroll] ERRO GERAL no startEnroll():', err);
    } finally {
        stopCamera();
        loading.value = false;
        enrolling.value = false;
    }
}
</script>
