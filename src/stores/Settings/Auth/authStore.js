// src/store/authStore.js
import { defineStore } from 'pinia';
import router from '@/router';
import API_URL from '@/config/apiUrl';
import { getUserInfo, getUserById, fetchBanners } from '@/utils/Auth/apiAuth';

export const useAuthStore = defineStore('user', {
  state: () => ({
    users: [],
    user: null,
    userById: null,
    token: localStorage.getItem('token') || null,
    banners: [],
  }),

  getters: {
    usuariosComAniversarioValido: (state) =>
      state.users.filter(u => u.birth_date && !isNaN(new Date(u.birth_date))),
    proximoAniversario: () => (birthDateStr) => {
      const base = new Date(birthDateStr);
      if (isNaN(base)) return null;
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const prox = new Date(ano, base.getMonth(), base.getDate());
      if (prox < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
        prox.setFullYear(ano + 1);
      }
      return prox;
    },
    aniversariosEmAndamento: (state, getters) => {
      return getters.usuariosComAniversarioValido
        .map(u => ({ ...u, _nextBDay: getters.proximoAniversario(u.birth_date) }))
        .filter(u => u._nextBDay)
        .sort((a, b) => a._nextBDay - b._nextBDay);
    },
    aniversariosFinalizados: (state, getters) => {
      const hoje = new Date();
      return getters.usuariosComAniversarioValido
        .map(u => {
          const base = new Date(u.birth_date);
          if (isNaN(base)) return null;
          let last = new Date(hoje.getFullYear(), base.getMonth(), base.getDate());
          if (last > hoje) last.setFullYear(hoje.getFullYear() - 1);
          return { ...u, _lastBDay: last };
        })
        .filter(Boolean)
        .sort((a, b) => b._lastBDay - a._lastBDay);
    },
  },

  actions: {
    setUser(user) {
      this.user = user;
      localStorage.setItem('role', user.role);
      localStorage.setItem('position', user.position);
    },
    setUserById(userById) {
      this.userById = userById;
      localStorage.setItem('position', userById.position);
    },
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token);
    },
    clearUser() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('position');
    },
    isAuthenticated() {
      return !!this.token;
    },
    logout() {
      this.clearUser();
      router.push('/login');
    },

    async fetchUserInfo() {
      try {
        const result = await getUserInfo();
        this.setUser(result.data);
      } catch (error) {
        console.error(error);
        this.clearUser();
        router.push('/login');
      }
    },

    async fetchUserById(id) {
      try {
        const result = await getUserById(id);
        this.setUserById(result.data);
      } catch (error) {
        console.error(error);
      }
    },

    // ====== AQUI COMEÇA O CRUD DE USUÁRIOS ======

    async getAllUsers() {
      try {
        const response = await fetch(`${API_URL}/auth/users`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || data.error || 'Erro ao buscar usuários');
        }

        this.users = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        return data;
      } catch (error) {
        console.error('Erro em getAllUsers:', error);
        throw error;
      }
    },

    async createUser(payload) {
      const body = {
        username: payload.username,
        password: payload.password,
        email: payload.email,
        position: payload.position,
        city: payload.city,
        birth_date: payload.birth_date,
      };

      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data.message || data.error || 'Erro ao criar usuário');
        }

        await this.getAllUsers();
        return data;
      } catch (error) {
        console.error('Erro em createUser:', error);
        throw error;
      }
    },

    async updateUser(payload) {
      const body = {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        position: payload.position,
        manager_id: payload.manager_id ?? null,
        city: payload.city,
        birth_date: payload.birth_date,
        status: payload.status,
        role: payload.role ?? 'user',
      };

      try {
        const response = await fetch(`${API_URL}/auth/users`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(data.message || data.error || 'Erro ao atualizar usuário');
        }

        await this.getAllUsers();
        return data;
      } catch (error) {
        console.error('Erro em updateUser:', error);
        throw error;
      }
    },
    // ====== FIM CRUD USUÁRIOS ======

    async getBanners() {
      try {
        const result = await fetchBanners();
        this.banners = result.data;
      } catch (error) {
        console.error('Erro ao buscar banners:', error);
      }
    },
    hasPosition(position) {
      return this.user?.position === position || localStorage.getItem('position') === position;
    },
    hasRole(role) {
      return this.user?.role === role || localStorage.getItem('role') === role;
    },
    async initializeAuth() {
      if (this.token && !this.user) {
        try {
          await this.fetchUserInfo();
        } catch (error) {
          this.clearUser();
        }
      }
    },
  },
});
