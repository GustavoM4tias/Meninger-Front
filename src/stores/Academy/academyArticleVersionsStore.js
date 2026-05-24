// stores/Academy/academyArticleVersionsStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyArticleVersionsStore = defineStore('academyArticleVersions', {
    state: () => ({
        list: [],
        error: null,
        loading: false,
    }),

    actions: {
        async fetch(articleId) {
            this.error = null;
            this.loading = true;
            try {
                const data = await requestWithAuth(`/academy/kb/articles/${Number(articleId)}/versions`);
                this.list = Array.isArray(data?.results) ? data.results : [];
                return this.list;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar histórico.';
                this.list = [];
                return [];
            } finally {
                this.loading = false;
            }
        },

        async getVersion(articleId, versionNumber) {
            const data = await requestWithAuth(
                `/academy/kb/articles/${Number(articleId)}/versions/${Number(versionNumber)}`
            );
            return data?.version || null;
        },

        async restore(articleId, versionNumber) {
            this.error = null;
            const data = await requestWithAuth(
                `/academy/kb/articles/${Number(articleId)}/versions/${Number(versionNumber)}/restore`,
                { method: 'POST' }
            );
            return data?.article || null;
        },
    },
});
