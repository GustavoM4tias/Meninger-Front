// src/stores/Auth/faceStore.js
//
// POR QUE face-api E tensorflow SÃO CARREGADOS SOB DEMANDA:
// juntos eles dão 2,9 MB de JavaScript. Importados no topo, entravam na cadeia
// estática de quem abre a tela de LOGIN (o modal do rosto é filho dela), então
// todo mundo baixava três megabytes antes de conseguir digitar a senha -
// inclusive quem nunca usou o login por rosto. Agora eles só chegam quando a
// pessoa vai de fato usar a câmera.
import { defineStore } from 'pinia';
import { enrollFaceApi, identifyFaceApi } from '@/utils/Auth/apiFace';

// Uma carga só, compartilhada: abrir o modal e clicar rápido não pode baixar
// as bibliotecas duas vezes.
let carregando = null;
let faceapi = null;
let tf = null;

async function carregarBiblioteca() {
    if (faceapi && tf) return;
    if (!carregando) {
        carregando = (async () => {
            const [fa, tfjs] = await Promise.all([
                import('@vladmandic/face-api'),
                import('@tensorflow/tfjs'),
            ]);
            await import('@tensorflow/tfjs-backend-webgl');
            faceapi = fa;
            tf = tfjs;
        })();
    }
    await carregando;
}

export const useFaceStore = defineStore('face', {
    state: () => ({
        modelsLoaded: false,
        loading: false,
        faceEnabledForEmail: false,
        lastDistance: null,
    }),
    actions: {
        async loadModelsOnce() {
            await carregarBiblioteca();
            if (this.modelsLoaded) return;
            this.loading = true;
            try {
                const MODEL_URL = '/models/face/';

                // 1) Backend do TFJS
                const current = tf.getBackend();
                if (current !== 'webgl') {
                    console.log('[FaceModels] setBackend from', current, 'to webgl');
                    await tf.setBackend('webgl'); // se der problema, troque para 'cpu'
                }
                await tf.ready();
                console.log('[FaceModels] TFJS backend:', tf.getBackend());

                // 2) Modelos (precisam dos .json + .bin nessa pasta)
                console.log('[FaceModels] carregando tinyFaceDetector...');
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                console.log('[FaceModels] tinyFaceDetector OK');

                console.log('[FaceModels] carregando faceLandmark68...');
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                console.log('[FaceModels] faceLandmark68 OK');

                console.log('[FaceModels] carregando faceRecognition...');
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                console.log('[FaceModels] faceRecognition OK');

                this.modelsLoaded = true;
            } catch (e) {
                console.error('[FaceModels] Falha ao carregar modelos:', e);
                throw e;
            } finally {
                this.loading = false;
            }
        },

        async enroll(embeddings) {
            await carregarBiblioteca();
            return await enrollFaceApi(embeddings);
        },

        // por este método novo (sem email):
        async identify(embedding) {
            await carregarBiblioteca();
            const r = await identifyFaceApi(embedding);
            if (r.success) this.lastDistance = r?.data?.meta?.dist ?? null;
            return r;
        },

        /**
         * Captura UM embedding de qualidade a partir do vídeo.
         * scoreThreshold elevado para 0.65 — exige detecção confiante antes de extrair.
         */
        async getOneGoodEmbedding(videoEl, opts = { inputSize: 416, scoreThreshold: 0.65 }) {
            await carregarBiblioteca();
            await this.loadModelsOnce();
            const options = new faceapi.TinyFaceDetectorOptions(opts);

            const det = await faceapi
                .detectSingleFace(videoEl, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!det) return null;

            const score = det.detection.score;
            console.log('[FaceDetect] score=', score.toFixed(3));

            // Aceita apenas detecções de alta confiança
            if (det.descriptor && score >= 0.65) {
                return Array.from(det.descriptor);
            }
            return null;
        },

        /**
         * Captura N frames de qualidade e retorna a média dos embeddings.
         * Isso reduz ruído de um único frame mal posicionado/iluminado.
         * Usado exclusivamente no fluxo de LOGIN para maior segurança.
         */
        async getAveragedEmbedding(videoEl, frameCount = 5, opts = { inputSize: 416, scoreThreshold: 0.65 }) {
            await carregarBiblioteca();
            await this.loadModelsOnce();
            const collected = [];
            const maxAttempts = frameCount * 6; // nunca trava infinitamente
            let attempts = 0;

            while (collected.length < frameCount && attempts < maxAttempts) {
                attempts++;
                const e = await this.getOneGoodEmbedding(videoEl, opts);
                if (e) {
                    collected.push(e);
                    console.log(`[FaceLogin] frame ${collected.length}/${frameCount} coletado`);
                }
                await new Promise(r => setTimeout(r, 200));
            }

            if (!collected.length) return null;

            // Média dos embeddings coletados
            const len = collected[0].length;
            const mean = new Array(len).fill(0);
            for (const v of collected) for (let i = 0; i < len; i++) mean[i] += v[i];
            for (let i = 0; i < len; i++) mean[i] /= collected.length;

            console.log(`[FaceLogin] embedding médio de ${collected.length} frames`);
            return mean;
        },

        // util para debug: retorna detecção sem descriptor (mais leve)
        async pingDetect(videoEl, opts = { inputSize: 416, scoreThreshold: 0.5 }) {
            await carregarBiblioteca();
            await this.loadModelsOnce();
            const options = new faceapi.TinyFaceDetectorOptions(opts);
            const det = await faceapi.detectSingleFace(videoEl, options);
            return det || null;
        },

        /**
         * Coleta embeddings para ENROLAMENTO.
         * Score mínimo 0.75 — mais exigente porque a qualidade do template
         * define a acurácia de todos os logins futuros.
         */
        async collectEmbeddings(videoEl, total = 15, opts = { inputSize: 416, scoreThreshold: 0.65 }) {
            await carregarBiblioteca();
            await this.loadModelsOnce();
            const options = new faceapi.TinyFaceDetectorOptions(opts);
            const list = [];
            while (list.length < total) {
                const det = await faceapi
                    .detectSingleFace(videoEl, options)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                if (det?.descriptor && det.detection?.score >= 0.75) {
                    list.push(Array.from(det.descriptor));
                }
                await new Promise(r => setTimeout(r, 300));
            }
            return list;
        },
    },
});
