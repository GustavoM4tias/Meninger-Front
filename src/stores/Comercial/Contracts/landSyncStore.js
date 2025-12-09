// src/stores/Comercial/Contracts/landSyncStore.js
import { defineStore } from 'pinia';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento'

const carregamentoStore = useCarregamentoStore()

export const useLandSyncStore = defineStore('landSync', {
    state: () => ({
        items: [],   // { id, enterprise_id, enterprise_name }
        loading: false,
        error: null,
        syncLoading: false,   // 👈 novo: rodando OBSTIT agora
    }),

    actions: {
        async fetchAll() {
            carregamentoStore.iniciarCarregamento()
            this.error = null;
            this.loading = true;
            try {
                const res = await fetch(`${API_URL}/admin/land-sync-enterprises`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!res.ok) throw new Error(`Erro ao listar: ${res.status}`);
                const data = await res.json();
                this.items = data.results || [];
            } catch (e) {
                this.error = e.message;
            } finally {
                this.loading = false;
                carregamentoStore.finalizarCarregamento()
            }
        },

        async addItem({ enterprise_id, enterprise_name }) {
            this.error = null;
            carregamentoStore.iniciarCarregamento()
            try {
                const res = await fetch(`${API_URL}/admin/land-sync-enterprises`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ enterprise_id, enterprise_name })
                });
                if (!res.ok) throw new Error(`Erro ao adicionar: ${res.status}`);
                const item = await res.json();

                const existsIdx = this.items.findIndex(i => i.id === item.id);
                if (existsIdx >= 0) {
                    this.items.splice(existsIdx, 1, item);
                } else {
                    this.items.push(item);
                }
            } catch (e) {
                this.error = e.message;
                throw e;
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        async removeItem(id) {
            this.error = null;
            carregamentoStore.iniciarCarregamento()
            try {
                const res = await fetch(`${API_URL}/admin/land-sync-enterprises/${id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!res.ok) throw new Error(`Erro ao remover: ${res.status}`);
                this.items = this.items.filter(i => i.id !== id);
            } catch (e) {
                this.error = e.message;
                throw e;
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        // 👇 NOVO: rodar sincronização OBSTIT
        async runSync() {
            this.error = null;
            this.syncLoading = true
            carregamentoStore.iniciarCarregamento()
            try {
                const res = await fetch(`${API_URL}/admin/land-sync-obstit/run`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!res.ok) {
                    if (res.status === 429) {
                        throw new Error('Já existe uma sincronização em andamento.');
                    }
                    throw new Error(`Erro ao rodar sincronização: ${res.status}`);
                }
                const data = await res.json().catch(() => null);
                return data; // counters etc.
            } catch (e) {
                this.error = e.message;
                throw e;
            } finally {
            this.syncLoading = false
                carregamentoStore.finalizarCarregamento()
            }
        }
    }
});
