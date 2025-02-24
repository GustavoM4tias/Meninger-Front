// src/utils/favoriteStore.js
import { defineStore } from 'pinia';
import { getFavorites } from '../../utils/Config/apiFavorite';

export const useFavoritesStore = defineStore('favorites', {
    state: () => ({
        favorites: [],
        errorMessage: ''
    }),
    getters: {
        // Verifica se um item está favoritado
        isFavorited: (state) => (router, section) => {
            return state.favorites.some(fav => fav.router === router && fav.section === section);
        },
    },
    actions: {
        // Carrega os favoritos
        async loadFavorites() {
            this.errorMessage = '';
            try {
                const result = await getFavorites();
                this.favorites = result;  // Atualiza os favoritos
            } catch (error) {
                console.error('Erro ao carregar favoritos:', error);
                this.errorMessage = 'Erro ao carregar favoritos.';
            }
        },
        // Adiciona um favorito
        async addFavorite(router, section) {
            try {
                await addFavorite(router, section);
                await this.loadFavorites();  // Recarrega os favoritos após adicionar
            } catch (error) {
                console.error('Erro ao adicionar favorito:', error);
            }
        },
        // Remove um favorito
        async removeFavorite(router, section) {
            try {
                await removeFavorite(router, section);
                await this.loadFavorites();  // Recarrega os favoritos após remover
            } catch (error) {
                console.error('Erro ao remover favorito:', error);
            }
        },
    },
});
