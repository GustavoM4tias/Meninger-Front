// stores/Academy/academyAdherenceStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyAdherenceStore = defineStore('academyAdherence', {
    state: () => ({
        data: null,   // { trackSlug, total, completed, inProgress, notStarted, overdue, users[] }
        error: null,
        loading: false,
    }),

    actions: {
        async fetch(trackSlug) {
            this.error = null;
            this.loading = true;
            try {
                const d = await requestWithAuth(
                    `/academy/tracks-admin/${encodeURIComponent(trackSlug)}/adherence`
                );
                this.data = d || null;
                return this.data;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar aderência.';
                this.data = null;
                return null;
            } finally {
                this.loading = false;
            }
        },

        clear() {
            this.data = null;
            this.error = null;
        },
    },
});
