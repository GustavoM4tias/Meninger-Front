// stores/Academy/academyOnboardingStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyOnboardingStore = defineStore('academyOnboarding', {
    state: () => ({
        list: [],
        error: null,
        loading: false,
    }),

    actions: {
        async fetch() {
            this.error = null;
            this.loading = true;
            try {
                const data = await requestWithAuth('/academy/admin/onboarding');
                this.list = Array.isArray(data?.results) ? data.results : [];
                return this.list;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar regras.';
                this.list = [];
                return [];
            } finally {
                this.loading = false;
            }
        },

        async create(payload) {
            this.error = null;
            await requestWithAuth('/academy/admin/onboarding', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            await this.fetch();
        },

        async update(id, payload) {
            this.error = null;
            await requestWithAuth(`/academy/admin/onboarding/${Number(id)}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            await this.fetch();
        },

        async remove(id) {
            this.error = null;
            await requestWithAuth(`/academy/admin/onboarding/${Number(id)}`, { method: 'DELETE' });
            await this.fetch();
        },

        async applyNow() {
            this.error = null;
            return requestWithAuth('/academy/admin/onboarding/apply-now', { method: 'POST' });
        },
    },
});
