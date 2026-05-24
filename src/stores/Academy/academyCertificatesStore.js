// stores/Academy/academyCertificatesStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

export const useAcademyCertificatesStore = defineStore('academyCertificates', {
    state: () => ({
        list: [],
        error: null,
        loaded: false,
    }),

    actions: {
        async fetchMine() {
            this.error = null;
            try {
                const data = await requestWithAuth('/academy/cert/my');
                this.list = Array.isArray(data?.results) ? data.results : [];
                this.loaded = true;
                return this.list;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar certificados.';
                this.list = [];
                return [];
            }
        },

        // Verificação pública (sem auth) — útil para mostrar status detalhado.
        async verify(code) {
            try {
                return await requestWithAuth(`/academy/cert/verify/${encodeURIComponent(code)}`);
            } catch (e) {
                return { valid: false, reason: 'error' };
            }
        },

        // URL do PDF (download/abrir direto no browser).
        // API_URL já inclui o /api — então o path é /academy/cert/pdf/:code.
        pdfUrl(code) {
            const base = String(API_URL || '').replace(/\/$/, '');
            return `${base}/academy/cert/pdf/${encodeURIComponent(code)}`;
        },
    },
});
