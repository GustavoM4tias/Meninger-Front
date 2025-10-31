// src/stores/eventStore.js
import { defineStore } from 'pinia';
import { getEvents } from '../../../utils/Event/apiEvents';

export const useEventStore = defineStore('eventStore', {
    state: () => ({
        events: [],
        errorMessage: ''
    }),
    getters: {
        eventosEmAndamento: (state) => {
            const dataAtual = new Date();
            return state.events.filter(event => new Date(event.event_date) >= dataAtual);
        },
        eventosFinalizados: (state) => {
            const dataAtual = new Date();
            return state.events
                .filter(event => new Date(event.event_date) < dataAtual)
                .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
        },
        eventosRecentes: (state) => {
            const agora = new Date();

            // 1) Próximo evento FUTURO com imagem (menor event_date >= agora)
            const proximo = state.events
                .filter(e => e?.images?.length > 0 && e?.event_date && new Date(e.event_date) >= agora)
                .slice()
                .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))[0];

            // 2) Dois mais recentes PASSADOS com imagem (maior event_date < agora)
            const passadosTop2 = state.events
                .filter(e => e?.images?.length > 0 && e?.event_date && new Date(e.event_date) < agora)
                .slice()
                .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
                .slice(0, 2);

            // 3) Monta a lista final:
            if (proximo) {
                // exatamente 1 futuro + 2 passados (se existirem)
                if (passadosTop2.length === 2) return [proximo, ...passadosTop2];

                // faltou passado? completa com mais futuros (sempre respeitando a ordem)
                const futurosExtra = state.events
                    .filter(e => e?.images?.length > 0 && e?.event_date && new Date(e.event_date) >= agora && e.id !== proximo.id)
                    .slice()
                    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                    .slice(0, 2 - passadosTop2.length);

                return [proximo, ...passadosTop2, ...futurosExtra];
            }

            // Não há futuro com imagem → devolve 3 passados com imagem
            return state.events
                .filter(e => e?.images?.length > 0 && e?.event_date && new Date(e.event_date) < agora)
                .slice()
                .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
                .slice(0, 3);
        },
    },
    actions: {
        async fetchEvents() {
            this.errorMessage = '';
            try {
                const result = await getEvents();
                this.events = result.data.events;
            } catch (error) {
                console.error('Erro ao obter eventos:', error);
                this.errorMessage = 'Erro ao carregar eventos.';
            }
        },
    },
});
