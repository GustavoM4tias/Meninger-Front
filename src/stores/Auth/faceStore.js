// src/stores/Auth/faceStore.js
import { defineStore } from 'pinia';
import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl'; // backend WebGL
import { enrollFaceApi, identifyFaceApi } from '@/utils/Auth/apiFace';

export const useFaceStore = defineStore('face', {
    state: () => ({
        modelsLoaded: false,
        loading: false,
        faceEnabledForEmail: false,
        lastDistance: null,
    }),
    actions: {
        async loadModelsOnce() {
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
            return await enrollFaceApi(embeddings);
        },

        // por este método novo (sem email):
        async identify(embedding) {
            const r = await identifyFaceApi(embedding);
            if (r.success) this.lastDistance = r?.data?.meta?.dist ?? null;
            return r;
        },

        async getOneGoodEmbedding(videoEl, opts = { inputSize: 416, scoreThreshold: 0.3 }) {
            await this.loadModelsOnce();
            const options = new faceapi.TinyFaceDetectorOptions(opts);

            const det = await faceapi
                .detectSingleFace(videoEl, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!det) {
                console.warn('[FaceDetect] nada detectado neste frame');
                return null;
            }

            const score = det.detection.score;
            console.log('[FaceDetect] score=', score.toFixed(3));

            if (det.descriptor && score > 0.5) {
                return Array.from(det.descriptor);
            }
            return null;
        },

        // util para debug: retorna deteccao sem descriptor (mais leve)
        async pingDetect(videoEl, opts = { inputSize: 416, scoreThreshold: 0.3 }) {
            await this.loadModelsOnce();
            const options = new faceapi.TinyFaceDetectorOptions(opts);
            const det = await faceapi.detectSingleFace(videoEl, options);
            return det || null;
        },

        async collectEmbeddings(videoEl, total = 10, opts = { inputSize: 320, scoreThreshold: 0.5 }) {
            await this.loadModelsOnce();
            const options = new faceapi.TinyFaceDetectorOptions(opts);
            const list = [];
            while (list.length < total) {
                const det = await faceapi
                    .detectSingleFace(videoEl, options)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                if (det?.descriptor && det.detection?.score > 0.7) {
                    list.push(Array.from(det.descriptor));
                }
                await new Promise(r => setTimeout(r, 120));
            }
            return list;
        },
    },
});
