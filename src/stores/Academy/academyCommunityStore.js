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

        // === NOVO: meus tópicos (mesmo padrão do KB) ===
        my: {
            q: '',
            status: '',
            results: [],
            total: 0,
            page: 1,
            pageSize: 20,
            loaded: false,
            error: null,
        },
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

            const topicId = Number(id);
            if (!Number.isFinite(topicId) || topicId <= 0) {
                this.error = 'ID inválido.';
                this.current = null;
                return null;
            }

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/community/topics/${topicId}?audience=${encodeURIComponent(audience)}`);
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

        async createTopic(payload = {}) {
            this.error = null;
            return requestWithAuth('/academy/community/topics', { method: 'POST', body: JSON.stringify(payload) });
        },

        async createPost(topicId, payload = {}) {
            this.error = null;
            const id = Number(topicId);
            if (!Number.isFinite(id) || id <= 0) throw new Error('ID inválido.');
            return requestWithAuth(`/academy/community/topics/${id}/posts`, { method: 'POST', body: JSON.stringify(payload) });
        },

        async acceptPost(topicId, postId) {
            this.error = null;
            const t = Number(topicId);
            const p = Number(postId);
            if (!Number.isFinite(t) || t <= 0) throw new Error('ID inválido.');
            if (!Number.isFinite(p) || p <= 0) throw new Error('ID inválido.');
            return requestWithAuth(`/academy/community/topics/${t}/accept/${p}`, { method: 'PATCH' });
        },

        async closeTopic(topicId) {
            this.error = null;
            const id = Number(topicId);
            if (!Number.isFinite(id) || id <= 0) throw new Error('ID inválido.');
            return requestWithAuth(`/academy/community/topics/${id}/close`, { method: 'PATCH' });
        },

        async reopenTopic(topicId) {
            this.error = null;
            const id = Number(topicId);
            if (!Number.isFinite(id) || id <= 0) throw new Error('ID inválido.');
            return requestWithAuth(`/academy/community/topics/${id}/reopen`, { method: 'PATCH' });
        },

        async fetchMeta() {
            this.error = null;
            const data = await requestWithAuth('/academy/community/meta');
            this.meta = data || { categories: null, types: null };
            return this.meta;
        },

        // === NOVO: Meus tópicos ===
        async fetchMyTopics({ q = '', status = '', audience = 'BOTH', page = 1, pageSize = 20 } = {}) {
            this.my.error = null;
            const carregamento = useCarregamentoStore();

            this.my.q = q;
            this.my.status = status;
            this.my.page = page;
            this.my.pageSize = pageSize;

            try {
                carregamento.iniciarCarregamento();

                const params = new URLSearchParams();
                if (q) params.set('q', q);
                if (status) params.set('status', status);
                if (audience) params.set('audience', audience);
                params.set('page', String(page));
                params.set('pageSize', String(pageSize));

                const data = await requestWithAuth(`/academy/community/topics/my?${params.toString()}`);

                this.my.results = Array.isArray(data?.results) ? data.results : [];
                this.my.total = Number(data?.total ?? this.my.results.length) || 0;
                this.my.loaded = true;

                return this.my.results;
            } catch (e) {
                this.my.error = e?.message || 'Erro ao carregar meus tópicos';
                this.my.results = [];
                this.my.total = 0;
                this.my.loaded = false;
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },
    }
});
