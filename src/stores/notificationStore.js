// src/stores/notificationStore.js
import { defineStore } from 'pinia';
import { getBuildings } from '../utils/apiBuilding';

export const useNotificationStore = defineStore('notificationStore', {
    state: () => ({
        notifications: [],
    }),
    actions: {
        async fetchNotifications() {
            try {
                // Buscar empreendimentos
                const result = await getBuildings();
                const buildings = result.data.buildings || [];
                // console.log(buildings)

                // Filtrar empreendimentos criados na última semana
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                const recentBuildings = buildings.filter(building => {
                    const createdAt = new Date(building.post_date);
                    return createdAt >= oneWeekAgo;
                });

                // Adicionar notificações baseadas nos empreendimentos recentes
                this.notifications = recentBuildings.map(building => ({
                    title: building.title, // Nome do empreendimento
                    type: 'Empreendimento',
                    image: building.image || '/noimg.jpg', // Imagem ou fallback
                    link: `/`, // Link para o empreendimento
                }));
            } catch (error) {
                console.error('Erro ao carregar notificações:', error);
            }
        },
    },
});
// Adicionar um metodo booleano no event para "notificar" que caso true, aparecer nas notificações e enviar via email. 

// Adicionar aniversário como notificação.

