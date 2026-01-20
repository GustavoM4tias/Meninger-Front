// src/stores/Academy/academyContentResolverStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyContentResolverStore = defineStore('academyContentResolver', {
    state: () => ({
        kbById: {},       // { [id]: { id, title, slug, categorySlug, ... } }
        topicById: {},    // { [id]: { id, title, type, status, ... } }
        loading: false,
        error: null,
    }),

    actions: {
        async fetchKbArticleById(id) {
            const n = Number(id);
            if (!Number.isFinite(n) || n <= 0) return null;
            if (this.kbById[n]) return this.kbById[n];

            this.error = null;
            this.loading = true;
            try {
                const data = await requestWithAuth(`/academy/kb/articles/${n}`);
                const normalized = data?.article ? data.article : data;
                if (normalized?.id) this.kbById[n] = normalized;
                return this.kbById[n] || null;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar artigo.';
                return null;
            } finally {
                this.loading = false;
            }
        },

        async fetchCommunityTopicById(id) {
            const n = Number(id);
            if (!Number.isFinite(n) || n <= 0) return null;
            if (this.topicById[n]) return this.topicById[n];

            this.error = null;
            this.loading = true;
            try {
                const data = await requestWithAuth(`/academy/community/topics/${n}`);
                const normalized = data?.topic ? data.topic : data;
                if (normalized?.id) this.topicById[n] = normalized;
                return this.topicById[n] || null;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar tópico.';
                return null;
            } finally {
                this.loading = false;
            }
        },
    },
});
