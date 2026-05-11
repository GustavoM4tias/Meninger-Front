// src/utils/favoriteStore.js
import { defineStore } from 'pinia';
import { getFavorites, addFavorite, removeFavorite } from '@/utils/Config/apiFavorite';

export const useFavoritesStore = defineStore('favorites', {
    state: () => ({
        favorites: [],
        errorMessage: ''
    }),
    getters: {
        // Verifica se um item está favoritado
        isFavorited: (state) => (router, section) => {
            return Array.isArray(state.favorites) &&
                state.favorites.some(fav => fav.router === router && fav.section === section);
        },
    },
    actions: {
        async loadFavorites() {
            this.errorMessage = '';
            try {
                const result = await getFavorites();
                this.favorites = Array.isArray(result) ? result : [];
            } catch (error) {
                console.error('Erro ao carregar favoritos:', error);
                this.favorites = [];
                this.errorMessage = error.message || 'Erro ao carregar favoritos.';
            }
        },
        // Propaga erro para o componente decidir UI (toast etc.)
        async addFavorite(router, section) {
            await addFavorite(router, section);
            await this.loadFavorites();
        },
        async removeFavorite(router, section) {
            await removeFavorite(router, section);
            await this.loadFavorites();
        },
    },
});
