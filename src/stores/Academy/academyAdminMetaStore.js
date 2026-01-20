// src/stores/Academy/academyAdminMetaStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyAdminMetaStore = defineStore('academyAdminMeta', {
    state: () => ({
        positions: [],
        departments: [],
        cities: [],
        usersSearch: [],
        kbArticlesSearch: [],
        communityTopicsSearch: [],
        error: null,
    }),

    actions: {
        async fetchMeta() {
            this.error = null;
            const json = await requestWithAuth('/academy/admin/meta');
            // ajuste conforme seu controller retorna
            this.positions = json?.positions || json?.data?.positions || [];
            this.departments = json?.departments || json?.data?.departments || [];
            this.cities = json?.cities || json?.data?.cities || [];
            return json;
        },

        async searchUsers(q = '') {
            const json = await requestWithAuth(`/academy/admin/users?q=${encodeURIComponent(q)}`);
            this.usersSearch = json?.results || json?.data || [];
            return json;
        },

        async searchKbArticles(q = '') {
            // usa o que já existe: /academy/kb/articles
            const json = await requestWithAuth(`/academy/kb/articles?q=${encodeURIComponent(q)}`);
            // ajuste ao seu retorno real:
            this.kbArticlesSearch = json?.results || json?.data || json || [];
            return json;
        },

        async searchCommunityTopics(q = '') {
            const json = await requestWithAuth(`/academy/community/topics?q=${encodeURIComponent(q)}`);
            this.communityTopicsSearch = json?.results || json?.data || json || [];
            return json;
        },
    },
});
