import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

function safeArray(v) {
    return Array.isArray(v) ? v : [];
}
function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export const useAcademyUsersStore = defineStore('academyUsers', {
    state: () => ({
        list: {
            q: '',
            page: 1,
            pageSize: 20,
            total: 0,
            results: [],
        },
        profile: {
            data: null,
            loaded: false,
        },
        error: null,
    }),

    actions: {
        async fetchRank({ q = '', page = 1, pageSize = 20, audience = 'BOTH' } = {}) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();

                const data = await requestWithAuth(
                    `/academy/users/rank?q=${encodeURIComponent(q || '')}` +
                    `&page=${encodeURIComponent(page)}` +
                    `&pageSize=${encodeURIComponent(pageSize)}` +
                    `&audience=${encodeURIComponent(audience)}`
                );

                this.list = {
                    q,
                    page: safeNumber(data?.page, 1),
                    pageSize: safeNumber(data?.pageSize, pageSize),
                    total: safeNumber(data?.total, 0),
                    results: safeArray(data?.results),
                };

                return this.list;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar ranking de usuários.';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async fetchUserProfile(userId, { audience = 'BOTH' } = {}) {
            const carregamento = useCarregamentoStore();
            this.error = null;
            this.profile.loaded = false;

            try {
                carregamento.iniciarCarregamento();

                const data = await requestWithAuth(
                    `/academy/users/${userId}/summary?audience=${encodeURIComponent(audience)}`
                );

                this.profile.data = data || null;
                this.profile.loaded = true;
                return this.profile.data;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar perfil do usuário.';
                this.profile.loaded = true;
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },
    },
});
