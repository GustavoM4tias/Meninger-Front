// stores/Academy/academyRatingsStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

// chave de cache: `${targetType}:${targetRef}`
function keyOf(targetType, targetRef) {
    return `${String(targetType).toUpperCase()}:${targetRef}`;
}

export const useAcademyRatingsStore = defineStore('academyRatings', {
    state: () => ({
        // stats por target
        statsByTarget: {},
        reviewsByTarget: {},
        error: null,
    }),

    actions: {
        async fetchStats(targetType, targetRef) {
            this.error = null;
            try {
                const data = await requestWithAuth(
                    `/academy/ratings?targetType=${encodeURIComponent(targetType)}&targetRef=${encodeURIComponent(targetRef)}`
                );
                this.statsByTarget = { ...this.statsByTarget, [keyOf(targetType, targetRef)]: data };
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar avaliações.';
                return null;
            }
        },

        async fetchReviews(targetType, targetRef, { page = 1, pageSize = 20 } = {}) {
            this.error = null;
            try {
                const data = await requestWithAuth(
                    `/academy/ratings/reviews?targetType=${encodeURIComponent(targetType)}&targetRef=${encodeURIComponent(targetRef)}&page=${page}&pageSize=${pageSize}`
                );
                this.reviewsByTarget = {
                    ...this.reviewsByTarget,
                    [keyOf(targetType, targetRef)]: Array.isArray(data?.results) ? data.results : [],
                };
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar reviews.';
                return null;
            }
        },

        async rate(targetType, targetRef, { stars, comment = null }) {
            this.error = null;
            const data = await requestWithAuth('/academy/ratings', {
                method: 'POST',
                body: JSON.stringify({ targetType, targetRef, stars, comment }),
            });
            // refresh stats
            await this.fetchStats(targetType, targetRef);
            return data;
        },

        async removeMine(targetType, targetRef) {
            this.error = null;
            await requestWithAuth('/academy/ratings', {
                method: 'DELETE',
                body: JSON.stringify({ targetType, targetRef }),
            });
            await this.fetchStats(targetType, targetRef);
        },

        statsFor(targetType, targetRef) {
            return this.statsByTarget[keyOf(targetType, targetRef)] || null;
        },

        reviewsFor(targetType, targetRef) {
            return this.reviewsByTarget[keyOf(targetType, targetRef)] || [];
        },
    },
});
