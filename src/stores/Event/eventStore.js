// src/stores/eventStore.js
import { defineStore } from 'pinia';
import { getEvents } from '../../utils/Event/apiEvents';

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
            return state.events
                .filter(event => event.images && event.images.length > 0)
                .sort((a, b) => new Date(b.post_date) - new Date(a.post_date))
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
