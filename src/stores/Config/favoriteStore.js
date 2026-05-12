// src/stores/Config/favoriteStore.js
import { defineStore } from 'pinia';
import { getFavorites, addFavorite, removeFavorite } from '@/utils/Config/apiFavorite';

export const useFavoritesStore = defineStore('favorites', {
    state: () => ({
        favorites: [],
        errorMessage: '',
        loaded: false,           // true depois do 1º load — evita refetch a cada componente Favorite que monta
        loadingPromise: null,    // promessa em voo (singleton) — fan-in: várias chamadas simultâneas compartilham 1 requisição
    }),
    getters: {
        // Verifica se um item está favoritado
        isFavorited: (state) => (router, section) => {
            return Array.isArray(state.favorites) &&
                state.favorites.some(fav => fav.router === router && fav.section === section);
        },
    },
    actions: {
        /**
         * Carrega favoritos do backend. Cacheado por padrão — chamadas subsequentes
         * são no-op a menos que `force=true` (usado pelo add/remove pra revalidar).
         * Se uma requisição já está em voo, retorna a mesma promise (singleton).
         */
        async loadFavorites({ force = false } = {}) {
            if (this.loaded && !force) return this.favorites;
            if (this.loadingPromise) return this.loadingPromise;

            this.errorMessage = '';
            this.loadingPromise = (async () => {
                try {
                    const result = await getFavorites();
                    this.favorites = Array.isArray(result) ? result : [];
                    this.loaded = true;
                    return this.favorites;
                } catch (error) {
                    console.error('Erro ao carregar favoritos:', error);
                    this.favorites = [];
                    this.errorMessage = error.message || 'Erro ao carregar favoritos.';
                    // Não marcamos loaded=true em erro — próxima chamada tenta novamente
                    return [];
                } finally {
                    this.loadingPromise = null;
                }
            })();
            return this.loadingPromise;
        },

        async addFavorite(router, section) {
            await addFavorite(router, section);
            await this.loadFavorites({ force: true });
        },

        async removeFavorite(router, section) {
            await removeFavorite(router, section);
            await this.loadFavorites({ force: true });
        },

        // Invalida o cache (ex: logout). Próximo loadFavorites busca de novo.
        reset() {
            this.favorites = [];
            this.loaded = false;
            this.loadingPromise = null;
            this.errorMessage = '';
        },
    },
});
