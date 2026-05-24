// stores/Academy/academyFollowStore.js
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

function keyOf(targetType, targetRef) {
    return `${String(targetType).toUpperCase()}:${targetRef}`;
}

export const useAcademyFollowStore = defineStore('academyFollow', {
    state: () => ({
        // mapa local de o que o user segue: { 'USER:5': true, 'TRACK:abc': true }
        following: {},
        myFollows: [],
        error: null,
    }),

    actions: {
        async fetchMyFollows(targetType = null) {
            this.error = null;
            try {
                const qs = targetType ? `?targetType=${encodeURIComponent(targetType)}` : '';
                const data = await requestWithAuth(`/academy/me/follows${qs}`);
                this.myFollows = Array.isArray(data?.results) ? data.results : [];
                // hidrata o mapa local
                const map = {};
                for (const f of this.myFollows) {
                    map[keyOf(f.targetType, f.targetRef)] = true;
                }
                this.following = map;
                return this.myFollows;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar follows.';
                return [];
            }
        },

        async follow(targetType, targetRef) {
            this.error = null;
            try {
                await requestWithAuth('/academy/follow', {
                    method: 'POST',
                    body: JSON.stringify({ targetType, targetRef }),
                });
                this.following = { ...this.following, [keyOf(targetType, targetRef)]: true };
                return true;
            } catch (e) {
                this.error = e?.message || 'Erro ao seguir.';
                return false;
            }
        },

        async unfollow(targetType, targetRef) {
            this.error = null;
            try {
                await requestWithAuth('/academy/unfollow', {
                    method: 'POST',
                    body: JSON.stringify({ targetType, targetRef }),
                });
                const next = { ...this.following };
                delete next[keyOf(targetType, targetRef)];
                this.following = next;
                return true;
            } catch (e) {
                this.error = e?.message || 'Erro ao deixar de seguir.';
                return false;
            }
        },

        async toggle(targetType, targetRef) {
            return this.isFollowing(targetType, targetRef)
                ? this.unfollow(targetType, targetRef)
                : this.follow(targetType, targetRef);
        },

        isFollowing(targetType, targetRef) {
            return !!this.following[keyOf(targetType, targetRef)];
        },
    },
});
