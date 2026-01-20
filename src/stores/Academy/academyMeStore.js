import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

function safeArray(v) {
    return Array.isArray(v) ? v : [];
}

function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export const useAcademyMeStore = defineStore('academyMe', {
    state: () => ({
        summary: {
            audience: 'BOTH',
            user: null,
            kb: { drafts: 0, published: 0, total: 0 },
            community: { topicsCreated: 0, answersPosted: 0 },
            tracks: { completed: 0, inProgress: 0, list: [] },
        },
        error: null,
        loaded: false,
    }),

    getters: {
        user: (s) => s.summary?.user || null,
        kb: (s) => s.summary?.kb || { drafts: 0, published: 0, total: 0 },
        community: (s) => s.summary?.community || { topicsCreated: 0, answersPosted: 0 },
        tracks: (s) => ({
            completed: safeNumber(s.summary?.tracks?.completed),
            inProgress: safeNumber(s.summary?.tracks?.inProgress),
            list: safeArray(s.summary?.tracks?.list),
        }),

        // MVP de “evolução” (score simples e determinístico)
        score: (s) => {
            const kbPublished = safeNumber(s.summary?.kb?.published);
            const answers = safeNumber(s.summary?.community?.answersPosted);
            const topics = safeNumber(s.summary?.community?.topicsCreated);
            const completed = safeNumber(s.summary?.tracks?.completed);

            // pesos fáceis de entender
            return kbPublished * 20 + answers * 3 + topics * 10 + completed * 25;
        },
    },

    actions: {
        async fetchSummary({ audience = 'BOTH' } = {}) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();

                const data = await requestWithAuth(
                    `/academy/me/summary?audience=${encodeURIComponent(audience)}`
                );

                this.summary = {
                    audience: data?.audience || audience,
                    user: data?.user || null,
                    kb: {
                        drafts: safeNumber(data?.kb?.drafts),
                        published: safeNumber(data?.kb?.published),
                        total: safeNumber(data?.kb?.total),
                    },
                    community: {
                        topicsCreated: safeNumber(data?.community?.topicsCreated),
                        answersPosted: safeNumber(data?.community?.answersPosted),
                    },
                    tracks: {
                        completed: safeNumber(data?.tracks?.completed),
                        inProgress: safeNumber(data?.tracks?.inProgress),
                        list: safeArray(data?.tracks?.list),
                    },
                };

                this.loaded = true;
                return this.summary;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar perfil do Academy';
                this.loaded = false;
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },
        async fetchUserSummary(userId, { audience = 'BOTH' } = {}) {
            return await requestWithAuth(`/academy/users/${userId}/summary?audience=${encodeURIComponent(audience)}`);
        }
    },
});
