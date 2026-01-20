import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

function safeArray(v) {
    return Array.isArray(v) ? v : [];
}

export const useAcademyTracksAdminStore = defineStore('academyTracksAdmin', {
    state: () => ({
        list: [],
        detail: null, // {track, items}
        error: null,

        filters: {
            status: '',    // '' | DRAFT | PUBLISHED
            audience: 'BOTH',
        }
    }),

    actions: {
        async fetchList({ status, audience } = {}) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            if (typeof status !== 'undefined') this.filters.status = status;
            if (typeof audience !== 'undefined') this.filters.audience = audience;

            try {
                carregamento.iniciarCarregamento();

                const qs = new URLSearchParams();
                if (this.filters.status) qs.set('status', this.filters.status);
                if (this.filters.audience) qs.set('audience', this.filters.audience);

                const data = await requestWithAuth(`/academy/tracks-admin?${qs.toString()}`);
                this.list = safeArray(data?.results);
                return this.list;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar trilhas (admin)';
                this.list = [];
                return [];
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async fetchDetail(slug) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}`);
                this.detail = data;
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao carregar detalhe (admin)';
                this.detail = null;
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async createTrack(payload) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks-admin`, {
                    method: 'POST',
                    body: JSON.stringify(payload || {}),
                });
                await this.fetchList();
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao criar trilha';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async updateTrack(slug, payload) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload || {}),
                });
                this.detail = data;
                await this.fetchList();
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao atualizar trilha';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async setPublish(slug, publish) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/publish`, {
                    method: 'PATCH',
                    body: JSON.stringify({ publish: !!publish }),
                });
                this.detail = data;
                await this.fetchList();
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao publicar/despublicar trilha';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async addItem(slug, payload) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/items`, {
                    method: 'POST',
                    body: JSON.stringify(payload || {}),
                });
                await this.fetchDetail(slug);
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao adicionar item';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async updateItem(slug, itemId, payload) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/items/${Number(itemId)}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload || {}),
                });
                await this.fetchDetail(slug);
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao atualizar item';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async removeItem(slug, itemId) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/items/${Number(itemId)}`, {
                    method: 'DELETE',
                });
                await this.fetchDetail(slug);
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao remover item';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },

        async reorderItems(slug, orderIds) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();
                const data = await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(slug)}/items/reorder`, {
                    method: 'PATCH',
                    body: JSON.stringify({ order: safeArray(orderIds) }),
                });
                await this.fetchDetail(slug);
                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao reordenar itens';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        },
        async removeTrack(slug) {
            const carregamento = useCarregamentoStore();
            this.error = null;

            try {
                carregamento.iniciarCarregamento();

                const data = await requestWithAuth(
                    `/academy/tracks-admin/${encodeURIComponent(slug)}`,
                    { method: 'DELETE' }
                );

                // limpa detail se era a mesma
                if (this.detail?.track?.slug === slug) this.detail = null;

                // remove da lista (nome correto é "list")
                this.list = safeArray(this.list).filter((t) => t.slug !== slug);

                return data;
            } catch (e) {
                this.error = e?.message || 'Erro ao excluir trilha';
                throw e;
            } finally {
                carregamento.finalizarCarregamento();
            }
        }
    }
});
