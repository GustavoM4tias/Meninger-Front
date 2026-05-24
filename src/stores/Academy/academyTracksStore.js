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
        // ✅ Dados enriquecidos vindos do servidor (gabarito privado).
        totalQuestions: Number.isFinite(Number(raw.totalQuestions)) ? Number(raw.totalQuestions) : undefined,
        correctCount: Number.isFinite(Number(raw.correctCount)) ? Number(raw.correctCount) : undefined,
        perQuestion: Array.isArray(raw.perQuestion) ? raw.perQuestion : undefined,
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

        async submitQuiz(slug, { itemId, answers } = {}) {
            this.error = null;

            // allCorrect é calculado server-side a partir do gabarito privado.
            // Não enviamos do cliente — o backend ignora qualquer valor recebido.
            const data = await requestWithAuth(`/academy/tracks/${encodeURIComponent(slug)}/quiz`, {
                method: 'POST',
                body: JSON.stringify({
                    itemId: Number(itemId),
                    answers: answers || {},
                }),
            });

            const normalized = normalizeTrackDetail(data);
            if (normalized) this.detail = normalized;

            return data;
        },

        // S5.2: tracking de vídeo. Chamado pelo VideoPlayer periodicamente.
        // Quando o backend auto-completa o item (>=85%), devolve o detail
        // atualizado — sincronizamos o estado local.
        async trackVideoWatch(slug, { itemId, currentSec, durationSec } = {}) {
            try {
                const data = await requestWithAuth(`/academy/tracks/${encodeURIComponent(slug)}/watch`, {
                    method: 'POST',
                    body: JSON.stringify({
                        itemId: Number(itemId),
                        currentSec: Number(currentSec) || 0,
                        durationSec: Number(durationSec) || 0,
                    }),
                });
                // se auto-completou, recarrega o detail pra refletir o progresso
                if (data?.autoCompleted) {
                    await this.fetchTrack(slug).catch(() => { });
                }
                return data;
            } catch (e) {
                // tracking de vídeo nunca deve quebrar a experiência — falha silenciosa
                console.warn('[academyTracks.trackVideoWatch]', e?.message);
                return null;
            }
        },
    },
});
