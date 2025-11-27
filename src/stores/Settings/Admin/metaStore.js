// src/stores/Settings/Admin/metaStore.js
import { defineStore } from 'pinia';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

export const useAdminMetaStore = defineStore('adminMeta', {
    state: () => ({
        positions: [],
        userCities: [],
        error: null,
    }),

    actions: {
        async fetchPositions() {
            const carregamentoStore = useCarregamentoStore();
            carregamentoStore.iniciarCarregamento();
            this.error = null;

            try {
                const res = await fetch(`${API_URL}/admin/positions`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!res.ok) throw new Error(`Erro ao carregar cargos (${res.status})`);

                const json = await res.json();
                // responseHandler.success → { success, data }
                this.positions = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
            } catch (e) {
                console.error(e);
                this.error = e.message;
                this.positions = [];
            } finally {
                carregamentoStore.finalizarCarregamento();
            }
        },

        async fetchUserCities() {
            const carregamentoStore = useCarregamentoStore();
            carregamentoStore.iniciarCarregamento();
            this.error = null;

            try {
                const res = await fetch(`${API_URL}/admin/user-cities`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!res.ok) throw new Error(`Erro ao carregar cidades (${res.status})`);

                const json = await res.json();
                this.userCities = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
            } catch (e) {
                console.error(e);
                this.error = e.message;
                this.userCities = [];
            } finally {
                carregamentoStore.finalizarCarregamento();
            }
        },

        async createPosition(payload) {
            const res = await fetch(`${API_URL}/admin/positions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || `Erro ao criar cargo (${res.status})`);
            }

            // opcional: push direto
            if (json.data) this.positions.push(json.data);
            // ou garantir consistência recarregando:
            await this.fetchPositions();

            return json;
        },

        async updatePosition(id, payload) {
            const res = await fetch(`${API_URL}/admin/positions/${id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || `Erro ao atualizar cargo (${res.status})`);
            }

            await this.fetchPositions();
            return json;
        },

        async deactivatePosition(id) {
            const res = await fetch(`${API_URL}/admin/positions/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || `Erro ao desativar cargo (${res.status})`);
            }

            await this.fetchPositions();
            return json;
        },

        async createUserCity(payload) {
            const res = await fetch(`${API_URL}/admin/user-cities`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || `Erro ao criar cidade (${res.status})`);
            }

            if (json.data) this.userCities.push(json.data);
            await this.fetchUserCities();
            return json;
        },

        async updateUserCity(id, payload) {
            const res = await fetch(`${API_URL}/admin/user-cities/${id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || `Erro ao atualizar cidade (${res.status})`);
            }

            await this.fetchUserCities();
            return json;
        },

        async deactivateUserCity(id) {
            const res = await fetch(`${API_URL}/admin/user-cities/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || `Erro ao desativar cidade (${res.status})`);
            }

            await this.fetchUserCities();
            return json;
        },
    },
});
