import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function asObjOrNull(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return null; }
    }
    if (typeof v === 'object') return v;
    return null;
}

const carregamento = useCarregamentoStore();

export const useAcademyKbAdminStore = defineStore('academyKbAdmin', {
    state: () => ({
        lastSaved: null,
        error: null,
    }),

    actions: {
        async fetchById(id) {
            this.error = null;

            const safeId = safeNumber(id, 0);
            if (!safeId) return null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/kb/articles/${safeId}`);

                const article = data?.article || null;
                if (article && 'payload' in article) {
                    article.payload = asObjOrNull(article.payload);
                }

                this.lastSaved = article;
                return article;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar artigo (admin).';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async createArticle({ title, categorySlug, body, payload = null }) {
            this.error = null; 

            try {
                carregamento.iniciarCarregamento();

                const data = await requestWithAuth('/academy/kb/articles', {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        categorySlug,
                        body,
                        payload: asObjOrNull(payload), // ✅ novo
                    }),
                });

                const article = data?.article || null;
                if (article && 'payload' in article) {
                    article.payload = asObjOrNull(article.payload);
                }

                this.lastSaved = article;
                return article;
            } catch (e) {
                this.error = e?.message || 'Erro ao criar artigo.';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async updateArticle(id, { title, categorySlug, body, payload = null }) {
            this.error = null; 

            const safeId = safeNumber(id, 0);
            if (!safeId) throw new Error('ID inválido.');

            try {
                carregamento.iniciarCarregamento();

                const data = await requestWithAuth(`/academy/kb/articles/${safeId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        title,
                        categorySlug,
                        body,
                        payload: asObjOrNull(payload), // ✅ novo
                    }),
                });

                const article = data?.article || null;
                if (article && 'payload' in article) {
                    article.payload = asObjOrNull(article.payload);
                }

                this.lastSaved = article;
                return article;
            } catch (e) {
                this.error = e?.message || 'Erro ao atualizar artigo.';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async setPublish(id, publish) {
            this.error = null;
            const safeId = safeNumber(id, 0);
            if (!safeId) throw new Error('ID inválido.');

            try {
                const data = await requestWithAuth(`/academy/kb/articles/${safeId}/publish`, {
                    method: 'PATCH',
                    body: JSON.stringify({ publish: !!publish }),
                });

                const article = data?.article || null;
                if (article && 'payload' in article) {
                    article.payload = asObjOrNull(article.payload);
                }

                this.lastSaved = article;
                return article;
            } catch (e) {
                this.error = e?.message || 'Erro ao publicar/despublicar.';
                throw e;
            }
        },
    },
});
