// stores/Academy/academyQuestionBankStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyQuestionBankStore = defineStore('academyQuestionBank', {
    state: () => ({
        list: [],
        page: 1,
        pageSize: 20,
        total: 0,
        error: null,
        loading: false,
    }),

    actions: {
        async fetch({ q = '', tags = '', difficulty = '', status = '', page = 1, pageSize = 20 } = {}) {
            this.error = null;
            this.loading = true;
            try {
                const params = new URLSearchParams();
                if (q) params.set('q', q);
                if (tags) params.set('tags', tags);
                if (difficulty) params.set('difficulty', difficulty);
                if (status) params.set('status', status);
                params.set('page', page);
                params.set('pageSize', pageSize);

                const data = await requestWithAuth(`/academy/admin/questions?${params.toString()}`);
                this.list = Array.isArray(data?.results) ? data.results : [];
                this.page = Number(data?.page || page);
                this.pageSize = Number(data?.pageSize || pageSize);
                this.total = Number(data?.total || this.list.length);
                return this.list;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar questões.';
                this.list = [];
                return [];
            } finally {
                this.loading = false;
            }
        },

        // withAnswerKey=true para o admin ver/editar o gabarito
        async getById(id) {
            const data = await requestWithAuth(`/academy/admin/questions/${Number(id)}?withAnswerKey=true`);
            return data?.question || null;
        },

        async create(payload) {
            this.error = null;
            const data = await requestWithAuth('/academy/admin/questions', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            return data?.question || null;
        },

        async update(id, payload) {
            this.error = null;
            const data = await requestWithAuth(`/academy/admin/questions/${Number(id)}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            return data?.question || null;
        },

        async archive(id) {
            this.error = null;
            await requestWithAuth(`/academy/admin/questions/${Number(id)}`, { method: 'DELETE' });
        },
    },
});
