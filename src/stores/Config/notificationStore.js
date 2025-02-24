// src/stores/notificationStore.js
import { defineStore } from 'pinia';
import { getBuildings } from '../../utils/Building/apiBuilding';
import { useAuthStore } from '../Auth/authStore'; // Importa a store de autenticação para acessar os usuários
import { useEventStore } from '../Event/eventStore';


export const useNotificationStore = defineStore('notificationStore', {
    state: () => ({
        notifications: [],
    }),
    actions: {
        async fetchNotifications() {
            try {
                const currentDate = new Date();

                // Buscar empreendimentos
                const result = await getBuildings();
                const buildings = result.data.buildings || [];

                // Filtrar empreendimentos criados na última semana
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);

                const recentBuildings = buildings.filter(building => {
                    const createdAt = new Date(building.post_date);
                    return createdAt >= oneWeekAgo;
                });

                // Adicionar notificações baseadas nos empreendimentos recentes
                const buildingNotifications = recentBuildings.map(building => ({
                    title: building.title, // Nome do empreendimento
                    type: 'Empreendimento',
                    date: new Date(building.post_date),
                    importance: Math.max(0, 7 - Math.floor((currentDate - new Date(building.post_date)) / (1000 * 60 * 60 * 24))), // Mais importante no dia do cadastro
                    image: building.images[0] || '/noimg.jpg', // Imagem ou fallback 
                    link: `/buildings?search=${building.title}`, // Link para o evento
                }));

                // Buscar aniversários
                const authStore = useAuthStore(); // Usa a store de autenticação
                if (authStore.users.length === 0) {
                    await authStore.getAllUsers(); // Busca todos os usuários se ainda não carregados
                }

                const birthdayNotifications = authStore.usuariosComAniversarioValido
                    .filter(user => {
                        const birthDate = new Date(user.birth_date);
                        birthDate.setFullYear(currentDate.getFullYear()); // Ajusta para o ano atual
                        const diffDays = (birthDate - currentDate) / (1000 * 60 * 60 * 24);
                        return diffDays >= -1 && diffDays <= 3; // Filtro de 3 dias antes
                    })
                    .map(user => ({
                        title: `${user.username}`, // Nome do usuário
                        type: 'Aniversário',
                        date: new Date(user.birth_date),
                        importance: user.birth_date === currentDate.toISOString().split('T')[0] ? 10 : 5, // Prioridade máxima no dia do aniversário
                        birth: user.birth_date, // Imagem do perfil ou fallback
                        link: `/`, // Link para o perfil do usuário
                    }));

                // 3. Buscar eventos
                const eventStore = useEventStore();
                if (eventStore.events.length === 0) {
                    await eventStore.fetchEvents();
                }

                const upcomingEvents = eventStore.events.filter(event => {
                    const eventDate = new Date(event.event_date);
                    const diffDays = (eventDate - currentDate) / (1000 * 60 * 60 * 24);
                    return diffDays >= -1 && diffDays <= 3; // Próximos 3 dias
                });

                const eventNotifications = upcomingEvents.map(event => ({
                    title: event.title, // Nome do evento
                    type: 'Evento',
                    date: new Date(event.event_date),
                    importance: event.event_date === currentDate.toISOString().split('T')[0] ? 10 : 5, // Prioridade máxima no dia do evento
                    image: event.images[0] || '/noimg.jpg', // Imagem ou fallback
                    link: `/events?search=${event.title}`, // Link para o evento
                }));

                // Combinar notificações
                this.notifications = [
                    ...buildingNotifications,
                    ...birthdayNotifications,
                    ...eventNotifications,
                ];

                // Ordenar notificações: maior importância primeiro, em seguida pela data mais próxima
                this.notifications.sort((a, b) => {
                    if (b.importance !== a.importance) {
                        return b.importance - a.importance; // Ordena pela importância
                    }
                    return a.date - b.date; // Ordena pela data mais próxima
                });
            } catch (error) {
                console.error('Erro ao carregar notificações:', error);
            }
        },
    },
});
// Adicionar um metodo booleano no event para "notificar" que caso true, aparecer nas notificações e enviar via email. 

