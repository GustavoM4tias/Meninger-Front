// src/stores/Academy/academyKbStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

function safeArray(v) {
    return Array.isArray(v) ? v : [];
}

function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function buildQuery(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === null || typeof v === 'undefined') return;
        const s = String(v).trim();
        if (!s) return;
        qs.set(k, s);
    });
    return qs.toString();
}

function jsonBody(payload) {
    return { body: JSON.stringify(payload || {}) };
}

const carregamento = useCarregamentoStore();

export const useAcademyKbStore = defineStore('academyKb', {
    state: () => ({
        categories: [],
        error: null,

        filters: {
            q: '',
            categorySlug: '',
            status: '',
            mode: '',
        },

        list: {
            results: [],
            total: 0,
            page: 1,
            pageSize: 20,
            loaded: false,
            error: null,
        },

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

        article: {
            data: null,
            loaded: false,
            error: null,
        },
    }),

    actions: {
        async fetchCategories({ audience = 'BOTH' } = {}) {
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/kb/categories?audience=${encodeURIComponent(audience)}`);
                this.categories = safeArray(data?.categories);
                return this.categories;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar categorias';
                this.categories = [];
                return [];
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async fetchArticles({ q, categorySlug, audience = 'BOTH', page, pageSize, status, mode } = {}) {
            this.list.error = null;
            this.error = null;

            if (typeof q !== 'undefined') this.filters.q = q;
            if (typeof categorySlug !== 'undefined') this.filters.categorySlug = categorySlug;
            if (typeof status !== 'undefined') this.filters.status = status;
            if (typeof mode !== 'undefined') this.filters.mode = mode;

            if (typeof page !== 'undefined') this.list.page = safeNumber(page, 1);
            if (typeof pageSize !== 'undefined') this.list.pageSize = safeNumber(pageSize, 20);

            try {
                carregamento.iniciarCarregamento();

                const query = buildQuery({
                    q: this.filters.q,
                    categorySlug: this.filters.categorySlug,
                    audience,
                    page: this.list.page || 1,
                    pageSize: this.list.pageSize || 20,
                    mode: this.filters.mode === 'admin' ? 'admin' : '',
                    status: this.filters.status,
                });

                const data = await requestWithAuth(`/academy/kb/articles?${query}`);

                this.list.results = safeArray(data?.results);
                this.list.total = safeNumber(data?.total, 0);
                this.list.loaded = true;

                return this.list.results;
            } catch (e) {
                this.list.error = e?.message || 'Erro ao carregar artigos';
                this.list.results = [];
                this.list.total = 0;
                this.list.loaded = false;
                return [];
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async fetchMyArticles({ q, status, page, pageSize } = {}) {
            this.my.error = null;

            if (typeof q !== 'undefined') this.my.q = q;
            if (typeof status !== 'undefined') this.my.status = status;

            if (typeof page !== 'undefined') this.my.page = safeNumber(page, 1);
            if (typeof pageSize !== 'undefined') this.my.pageSize = safeNumber(pageSize, 20);

            try {
                carregamento.iniciarCarregamento();

                const query = buildQuery({
                    q: this.my.q,
                    status: this.my.status,
                    page: this.my.page || 1,
                    pageSize: this.my.pageSize || 20,
                });

                const data = await requestWithAuth(`/academy/kb/articles/my?${query}`);

                this.my.results = safeArray(data?.results);
                this.my.total = safeNumber(data?.total, 0);
                this.my.loaded = true;

                return this.my.results;
            } catch (e) {
                this.my.error = e?.message || 'Erro ao carregar meus artigos';
                this.my.results = [];
                this.my.total = 0;
                this.my.loaded = false;
                return [];
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async publishMyArticle(articleId, publish) {
            this.my.error = null;

            const id = Number(articleId);
            if (!Number.isFinite(id) || id <= 0) {
                this.my.error = 'ID inválido.';
                return false;
            }

            try {
                carregamento.iniciarCarregamento();

                await requestWithAuth(`/academy/kb/articles/${id}/publish`, {
                    method: 'PATCH',
                    ...jsonBody({ publish: !!publish }),
                });

                const nextStatus = publish ? 'PUBLISHED' : 'DRAFT';

                const idx = this.my.results.findIndex((x) => Number(x?.id) === id);
                if (idx >= 0) {
                    if (this.my.status && this.my.status !== nextStatus) {
                        this.my.results.splice(idx, 1);
                        this.my.total = Math.max(0, safeNumber(this.my.total, 0) - 1);
                    } else {
                        this.my.results[idx] = { ...this.my.results[idx], status: nextStatus };
                    }
                }

                await this.fetchMyArticles({
                    q: this.my.q,
                    status: this.my.status,
                    page: this.my.page,
                    pageSize: this.my.pageSize,
                });

                return true;
            } catch (e) {
                this.my.error = e?.message || 'Erro ao publicar/despublicar';
                return false;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async fetchArticle({ categorySlug, articleSlug, audience = 'BOTH' } = {}) {
            this.article.error = null;

            const cs = String(categorySlug || '').trim();
            const as = String(articleSlug || '').trim();
            if (!cs || !as) {
                this.article.data = null;
                this.article.loaded = false;
                this.article.error = 'Parâmetros inválidos.';
                return null;
            }

            try {
                carregamento.iniciarCarregamento();

                const qs = buildQuery({ audience });
                const url = `/academy/kb/articles/${encodeURIComponent(cs)}/${encodeURIComponent(as)}${qs ? `?${qs}` : ''}`;

                const data = await requestWithAuth(url);

                this.article.data = data || null;
                this.article.loaded = true;

                return this.article.data;
            } catch (e) {
                this.article.error = e?.message || 'Erro ao carregar artigo';
                this.article.data = null;
                this.article.loaded = false;
                return null;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },
    },
});
