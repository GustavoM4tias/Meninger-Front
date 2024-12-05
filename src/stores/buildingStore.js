// src/stores/buildingStore.js
import { defineStore } from 'pinia';
import { getBuildings } from '../utils/apiBuilding';

export const useBuildingStore = defineStore('buildingStore', {
    state: () => ({
        buildings: [],
        errorMessage: '',
    }),
    actions: {
        async fetchBuildings() {
            try {
                const result = await getBuildings();
                this.buildings = result.data.buildings || []; // Certifique-se de que sempre será um array
                // console.log('Dados retornados pela API:', result);
            } catch (error) {
                console.error('Erro ao carregar empreendimentos:', error);
                this.errorMessage = 'Erro ao carregar empreendimentos.';
            }
        },
        async addBuilding(building) {
            try {
                const newBuilding = await addBuilding(building);
                this.buildings.push(newBuilding);
            } catch (error) {
                console.error("Erro ao adicionar empreendimento:", error);
            }
        },

        async updateBuilding(building) {
            try {
                const updatedBuilding = await updateBuilding(building);
                const index = this.buildings.findIndex(b => b.id === building.id);
                if (index !== -1) {
                    this.buildings[index] = updatedBuilding;
                }
            } catch (error) {
                console.error("Erro ao atualizar empreendimento:", error);
            }
        },

        async deleteBuilding(buildingId) {
            try {
                await deleteBuilding(buildingId);
                this.buildings = this.buildings.filter(b => b.id !== buildingId);
            } catch (error) {
                console.error("Erro ao excluir empreendimento:", error);
            }
        },
    },
});