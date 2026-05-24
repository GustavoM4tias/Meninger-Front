// stores/Academy/academyModulesStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyModulesStore = defineStore('academyModules', {
    state: () => ({
        list: [],
        error: null,
        loading: false,
    }),

    actions: {
        async fetch(trackSlug) {
            this.error = null;
            this.loading = true;
            try {
                const data = await requestWithAuth(
                    `/academy/tracks-admin/${encodeURIComponent(trackSlug)}/modules`
                );
                this.list = Array.isArray(data?.results) ? data.results : [];
                return this.list;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar módulos.';
                this.list = [];
                return [];
            } finally {
                this.loading = false;
            }
        },

        async create(trackSlug, payload) {
            this.error = null;
            await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(trackSlug)}/modules`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            await this.fetch(trackSlug);
        },

        async update(trackSlug, id, payload) {
            this.error = null;
            await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(trackSlug)}/modules/${Number(id)}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            await this.fetch(trackSlug);
        },

        async remove(trackSlug, id) {
            this.error = null;
            await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(trackSlug)}/modules/${Number(id)}`, {
                method: 'DELETE',
            });
            await this.fetch(trackSlug);
        },

        async reorder(trackSlug, order) {
            this.error = null;
            await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(trackSlug)}/modules/reorder`, {
                method: 'PATCH',
                body: JSON.stringify({ order }),
            });
            await this.fetch(trackSlug);
        },

        async moveItem(trackSlug, itemId, moduleId) {
            this.error = null;
            await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(trackSlug)}/items/${Number(itemId)}/move`, {
                method: 'PATCH',
                body: JSON.stringify({ moduleId }),
            });
        },
    },
});
