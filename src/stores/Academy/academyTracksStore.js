// stores/Academy/academyTracksStore.js
import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

function normalizeAttempt(raw) {
    if (!raw) return null;

    if (typeof raw === 'string') {
        try { return normalizeAttempt(JSON.parse(raw)); } catch { return null; }
    }

    if (typeof raw !== 'object') return null;

    let answers = raw.answers ?? raw.answers_json ?? raw.response ?? raw.payload ?? null;
    if (typeof answers === 'string') {
        try { answers = JSON.parse(answers); } catch { /* mantém string */ }
    }

    return {
        answers: answers ?? {},
        allCorrect: !!(raw.allCorrect ?? raw.all_correct ?? raw.correct),
        attemptCount: Number(raw.attemptCount ?? raw.attempt_count ?? 1),
        submittedAt: raw.submittedAt ?? raw.submitted_at ?? raw.created_at ?? raw.updated_at ?? null,
    };
}

function normalizeTrackDetail(data) {
    if (!data || typeof data !== 'object') return null;

    const items = Array.isArray(data.items) ? data.items : [];
    return {
        ...data,
        progressPercent: Number.isFinite(Number(data.progressPercent)) ? Number(data.progressPercent) : 0,
        items: items.map((it) => ({
            ...it,
            quizAttempt: normalizeAttempt(it.quizAttempt ?? it.quiz_attempt),
        })),
    };
}

export const useAcademyTracksStore = defineStore('academyTracks', {
    state: () => ({
        list: [],
        detail: null,
        error: null,
    }),

    actions: {
        async fetchTracks({ audience = 'BOTH' } = {}) {
            this.error = null;
            const carregamento = useCarregamentoStore();

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks?audience=${encodeURIComponent(audience)}`);
                const rows = Array.isArray(data) ? data : (data?.results || []);
                this.list = rows.map(t => ({ ...t, progressPercent: Number(t.progressPercent || 0) }));

                return this.list;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar trilhas.';
                this.list = [];
                return [];
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async fetchTrack(slug, { audience = 'BOTH' } = {}) {
            this.error = null;
            const carregamento = useCarregamentoStore();

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(
                    `/academy/tracks/${encodeURIComponent(slug)}?audience=${encodeURIComponent(audience)}`
                );

                this.detail = normalizeTrackDetail(data);
                return this.detail;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar trilha.';
                this.detail = null;
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async markProgress(slug, { itemId, completed = true } = {}) {
            this.error = null;

            const data = await requestWithAuth(`/academy/tracks/${encodeURIComponent(slug)}/progress`, {
                method: 'POST',
                body: JSON.stringify({ itemId, completed: !!completed }),
            });

            const normalized = normalizeTrackDetail(data);
            if (normalized) this.detail = normalized;
            return data;
        },

        async submitQuiz(slug, { itemId, answers, allCorrect } = {}) {
            this.error = null;

            const data = await requestWithAuth(`/academy/tracks/${encodeURIComponent(slug)}/quiz`, {
                method: 'POST',
                body: JSON.stringify({
                    itemId: Number(itemId),
                    answers: answers || {},
                    allCorrect: !!allCorrect,
                }),
            });

            const normalized = normalizeTrackDetail(data);
            if (normalized) this.detail = normalized;

            return data;
        },
    },
});
