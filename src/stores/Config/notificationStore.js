// src/stores/notificationStore.js
import { defineStore } from 'pinia';
import { useAuthStore } from '../Settings/Auth/authStore';
import { useEventStore } from '../Marketing/Event/eventStore';

const startOfDay = (d) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
};
const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export const useNotificationStore = defineStore('notificationStore', {
    state: () => ({
        notifications: [],
    }),
    actions: {
        async fetchNotifications() {
            try {
                const now = new Date();

                // ==== Aniversários ====
                const authStore = useAuthStore();
                if (!authStore.users || authStore.users.length === 0) {
                    await authStore.getAllUsers();
                }

                const birthdayNotifications = (authStore.usuariosComAniversarioValido || [])
                    .map(user => {
                        if (!user.birth_date) return null;
                        const birth = new Date(user.birth_date);
                        // aniversário deste ano (para ordenar/proximidade)
                        const thisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
                        const diffDays = (thisYear - now) / (1000 * 60 * 60 * 24); // pode ser negativo se já passou
                        if (diffDays < -1 || diffDays > 3) return null; // janela -1 a +3

                        return {
                            title: user.username,
                            type: 'Aniversário',
                            date: thisYear,             // usado para ordenação e exibição
                            importance: isSameDay(thisYear, now) ? 10 : 6,
                            birth: thisYear,            // usado para render do badge (dia/mês)
                            image: user.avatar_url || user.profile_image || null,
                            link: '/',                  // ajuste se quiser ir pra um perfil
                        };
                    })
                    .filter(Boolean);

                // ==== Eventos ====
                const eventStore = useEventStore();
                if (eventStore.events.length === 0) {
                    await eventStore.fetchEvents();
                }

                const eventNotifications = eventStore.events
                    .filter(e => e?.event_date)
                    .map(e => {
                        const eventDate = new Date(e.event_date);
                        const diffDays = (eventDate - now) / (1000 * 60 * 60 * 24);
                        if (diffDays < -1 || diffDays > 3) return null; // janela -1 a +3
                        const important =
                            isSameDay(eventDate, now) ? 9 : (diffDays >= 0 ? 7 : 5); // hoje > próximos > já passaram ontem
                        return {
                            title: e.title,
                            type: 'Evento',
                            date: eventDate, // Date real
                            importance: important,
                            image: e.images?.[0] || '/noimg.jpg',
                            link: `/events?search=${encodeURIComponent(e.title)}`,
                        };
                    })
                    .filter(Boolean);

                // ==== Combina e ordena ====
                const all = [...birthdayNotifications, ...eventNotifications];
                all.sort((a, b) => {
                    // 1) maior importância primeiro
                    if (b.importance !== a.importance) return b.importance - a.importance;
                    // 2) data mais próxima de agora (absoluto)
                    const da = Math.abs(a.date - now);
                    const db = Math.abs(b.date - now);
                    if (da !== db) return da - db;
                    // 3) desempate: eventos do dia primeiro
                    const aToday = isSameDay(a.date, now);
                    const bToday = isSameDay(b.date, now);
                    if (aToday !== bToday) return aToday ? -1 : 1;
                    // 4) fallback por data asc
                    return a.date - b.date;
                });

                this.notifications = all;
            } catch (error) {
                console.error('Erro ao carregar notificações:', error);
            }
        },
    },
});
