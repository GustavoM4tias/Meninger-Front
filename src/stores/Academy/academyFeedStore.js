// stores/Academy/academyFeedStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyFeedStore = defineStore('academyFeed', {
    state: () => ({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        error: null,
        loaded: false,
        loading: false,
    }),

    getters: {
        hasMore: (s) => s.items.length < s.total,
    },

    actions: {
        async fetchFeed({ page = 1, pageSize = 20, append = false } = {}) {
            this.error = null;
            this.loading = true;
            try {
                const data = await requestWithAuth(
                    `/academy/me/feed?page=${page}&pageSize=${pageSize}`
                );
                const results = Array.isArray(data?.results) ? data.results : [];
                this.items = append ? [...this.items, ...results] : results;
                this.page = Number(data?.page || page);
                this.pageSize = Number(data?.pageSize || pageSize);
                this.total = Number(data?.total || results.length);
                this.loaded = true;
                return this.items;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar feed.';
                if (!append) this.items = [];
                return this.items;
            } finally {
                this.loading = false;
            }
        },

        async loadMore() {
            if (this.loading || !this.hasMore) return;
            await this.fetchFeed({ page: this.page + 1, pageSize: this.pageSize, append: true });
        },
    },
});
