// stores/Academy/academyCommentsStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyCommentsStore = defineStore('academyComments', {
    state: () => ({
        // comentários por articleId: { [articleId]: [...roots] }
        byArticle: {},
        error: null,
        loadingByArticle: {},
    }),

    actions: {
        async fetch(articleId) {
            const aid = Number(articleId);
            if (!aid) return [];
            this.error = null;
            this.loadingByArticle = { ...this.loadingByArticle, [aid]: true };
            try {
                const data = await requestWithAuth(`/academy/kb/articles/${aid}/comments`);
                const results = Array.isArray(data?.results) ? data.results : [];
                this.byArticle = { ...this.byArticle, [aid]: results };
                return results;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar comentários.';
                this.byArticle = { ...this.byArticle, [aid]: [] };
                return [];
            } finally {
                this.loadingByArticle = { ...this.loadingByArticle, [aid]: false };
            }
        },

        async create(articleId, { body, parentId = null }) {
            const aid = Number(articleId);
            this.error = null;
            const data = await requestWithAuth(`/academy/kb/articles/${aid}/comments`, {
                method: 'POST',
                body: JSON.stringify({ body, parentId }),
            });
            // recarrega a thread (mais simples e consistente que mutar local)
            await this.fetch(aid);
            return data?.comment || null;
        },

        async update(articleId, commentId, { body }) {
            this.error = null;
            await requestWithAuth(`/academy/kb/comments/${Number(commentId)}`, {
                method: 'PATCH',
                body: JSON.stringify({ body }),
            });
            await this.fetch(articleId);
        },

        async remove(articleId, commentId) {
            this.error = null;
            await requestWithAuth(`/academy/kb/comments/${Number(commentId)}`, {
                method: 'DELETE',
            });
            await this.fetch(articleId);
        },

        commentsFor(articleId) {
            return this.byArticle[Number(articleId)] || [];
        },

        isLoading(articleId) {
            return !!this.loadingByArticle[Number(articleId)];
        },
    },
});
