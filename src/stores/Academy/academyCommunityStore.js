import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyCommunityStore = defineStore('academyCommunity', {
    state: () => ({
        list: [],
        total: 0,
        page: 1,
        pageSize: 20,
        current: null,
        error: null,
        meta: { categories: null, types: null },
    }),

    actions: {
        async fetchTopics({ type, q = '', status = 'OPEN', audience = 'BOTH', page = 1, pageSize = 20 } = {}) {
            this.error = null;
            const carregamento = useCarregamentoStore();

            try {
                carregamento.iniciarCarregamento();

                const params = new URLSearchParams();
                if (type) params.set('type', type);
                if (q) params.set('q', q);
                if (status) params.set('status', status);
                if (audience) params.set('audience', audience);
                params.set('page', String(page));
                params.set('pageSize', String(pageSize));

                const data = await requestWithAuth(`/academy/community/topics?${params.toString()}`);
                const results = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);

                this.list = results;
                this.total = Number(data?.total ?? data?.count ?? results.length) || 0;
                this.page = page;
                this.pageSize = pageSize;

                return this.list;
            } catch (e) {
                this.error = e.message;
                this.list = [];
                this.total = 0;
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async fetchTopic(id, { audience = 'BOTH' } = {}) {
            this.error = null;
            const carregamento = useCarregamentoStore();

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/community/topics/${id}?audience=${encodeURIComponent(audience)}`);
                this.current = data;
                return data;
            } catch (e) {
                this.error = e.message;
                this.current = null;
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async createTopic({
            title,
            body,
            payload = null,
            categorySlug = 'geral',
            tags = [],
            type = 'questions',
            audience = 'BOTH',
        } = {}) {
            this.error = null;

            const data = await requestWithAuth('/academy/community/topics', {
                method: 'POST',
                body: JSON.stringify({ title, body, payload, categorySlug, tags, type, audience }),
            });

            return data;
        },

        async createPost(topicId, { body, payload = null, type = 'ANSWER' } = {}) {
            this.error = null;

            const data = await requestWithAuth(`/academy/community/topics/${topicId}/posts`, {
                method: 'POST',
                body: JSON.stringify({ body, payload, type }),
            });

            return data;
        },

        async acceptPost(topicId, postId) {
            this.error = null;
            const data = await requestWithAuth(`/academy/community/topics/${topicId}/accept/${postId}`, {
                method: 'PATCH',
            });
            return data;
        },

        async closeTopic(topicId) {
            this.error = null;
            const data = await requestWithAuth(`/academy/community/topics/${topicId}/close`, {
                method: 'PATCH',
            });
            return data;
        },
        // actions
        async fetchMeta() {
            this.error = null;
            const data = await requestWithAuth('/academy/community/meta');
            this.meta = data || { categories: null, types: null };
            return this.meta;
        },

        async reopenTopic(topicId) {
            this.error = null;
            const data = await requestWithAuth(`/academy/community/topics/${topicId}/reopen`, { method: 'PATCH' });
            return data;
        },
    }
});
