// src/stores/buildingStore.js
import { defineStore } from 'pinia';
import { getBuildings, getWeather , getWeatherByCity, getBuildingById } from '../../utils/Building/apiBuilding';

export const useBuildingStore = defineStore('buildingStore', {
    state: () => ({
        buildings: [],
        selectedBuilding: null, // Add this line
        weather: null, // Estado para armazenar o clima
        errorMessage: '',
    }),
    actions: {
        async fetchBuildings() {
            try {
                const result = await getBuildings();
                this.buildings = result.buildings || result || [];
                // console.log('Dados retornados pela API:', this.buildings);
            } catch (error) {
                console.error('Erro ao carregar empreendimentos:', error);
                this.errorMessage = 'Erro ao carregar empreendimentos.';
            }
        },
        async fetchBuildingById(id) {
            try {
                const result = await getBuildingById(id);
                this.selectedBuilding = result || null;
                // console.log(`Empreendimento ${id} carregado:`, this.selectedBuilding);
            } catch (error) {
                console.error('Erro ao carregar empreendimento:', error);
                this.errorMessage = 'Erro ao carregar empreendimento.';
            }
        },
        async getWeather(lat, lon) {
            try {
                const weatherData = await getWeather(lat, lon); // Use the new function
                this.weather = weatherData;
            } catch (error) {
                console.error('Erro ao buscar o clima:', error.message);
                this.errorMessage = 'Erro ao buscar informações do clima.';
            }
        },
        async getWeatherByCity(city) {
            try {
                const weatherData = await getWeatherByCity(city);
                this.weather = weatherData; 
            } catch (error) {
                console.error('Erro ao buscar o clima:', error.message);
                this.errorMessage = 'Erro ao buscar informações do clima.';
            }
        },
    },
});