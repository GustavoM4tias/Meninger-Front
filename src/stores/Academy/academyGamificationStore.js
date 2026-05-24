// stores/Academy/academyGamificationStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useAcademyGamificationStore = defineStore('academyGamification', {
    state: () => ({
        stats: {
            level: 1,
            totalXp: 0,
            xpInCurrentLevel: 0,
            xpToNextLevel: 0,
            currentStreak: 0,
            longestStreak: 0,
        },
        badges: [],
        error: null,
        loaded: false,
    }),

    actions: {
        async fetchMyStats() {
            this.error = null;
            try {
                const data = await requestWithAuth('/academy/me/xp');
                this.stats = {
                    level: Number(data?.level || 1),
                    totalXp: Number(data?.totalXp || 0),
                    xpInCurrentLevel: Number(data?.xpInCurrentLevel || 0),
                    xpToNextLevel: Number(data?.xpToNextLevel || 0),
                    currentStreak: Number(data?.currentStreak || 0),
                    longestStreak: Number(data?.longestStreak || 0),
                };
                this.loaded = true;
                return this.stats;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar XP.';
                return this.stats;
            }
        },

        async fetchMyBadges() {
            this.error = null;
            try {
                const data = await requestWithAuth('/academy/me/badges');
                this.badges = Array.isArray(data?.results) ? data.results : [];
                return this.badges;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar conquistas.';
                this.badges = [];
                return [];
            }
        },

        async fetchAll() {
            await Promise.all([this.fetchMyStats(), this.fetchMyBadges()]);
        },
    },
});
