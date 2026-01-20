import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

function safeArray(v) {
    return Array.isArray(v) ? v : [];
}

export const useAcademyStore = defineStore('academy', {
    state: () => ({
        panel: {
            audience: 'BOTH',
            kbUpdates: [],
            openQuestions: [],
            tracksInProgress: [],
            highlights: [],
            counts: {
                kbUpdates: 0,
                openQuestions: 0,
                tracksInProgress: 0,
                highlights: 0,
            }
        },
        error: null,
        loaded: false,
    }),

    actions: {
        async fetchPanelSummary({ audience = 'BOTH' } = {}) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();

                const data = await requestWithAuth(`/academy/panel/summary?audience=${encodeURIComponent(audience)}`);

                const kbUpdates = safeArray(data?.kbUpdates);
                const openQuestions = safeArray(data?.openQuestions);
                const tracksInProgress = safeArray(data?.tracksInProgress);
                const highlights = safeArray(data?.highlights);

                this.panel = {
                    audience: data?.audience || audience,
                    kbUpdates,
                    openQuestions,
                    tracksInProgress,
                    highlights,
                    counts: {
                        kbUpdates: kbUpdates.length,
                        openQuestions: openQuestions.length,
                        tracksInProgress: tracksInProgress.length,
                        highlights: highlights.length,
                    }
                };

                this.loaded = true;
                return this.panel;
            } catch (e) {
                this.error = e.message || 'Erro ao carregar painel do Academy';
                this.loaded = false;
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },
    }
});
