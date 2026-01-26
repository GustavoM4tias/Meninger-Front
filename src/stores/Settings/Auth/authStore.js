// src/store/authStore.js
import { defineStore } from 'pinia';
import router from '@/router';
import API_URL from '@/config/apiUrl';
import { getUserInfo, getUserById, fetchBanners } from '@/utils/Auth/apiAuth';

function safeJsonParse(v, fallback = null) {
  try { return JSON.parse(v); } catch { return fallback; }
}

function normalizeProvider(user) {
  const p = String(user?.auth_provider || 'INTERNAL').toUpperCase();
  return p || 'INTERNAL';
}

export const useAuthStore = defineStore('user', {
  state: () => ({
    users: [],
    user: safeJsonParse(localStorage.getItem('user'), null), // ✅ persiste sessão com user completo
    userById: null,
    token: localStorage.getItem('token') || null,
    banners: [],
  }),

  getters: {
    // ✅ provider canônico para controles
    authProvider: (state) => normalizeProvider(state.user),

    // ✅ externo vs interno (para guards e UI)
    isExternal: (state) => normalizeProvider(state.user) !== 'INTERNAL',
    isInternal: (state) => normalizeProvider(state.user) === 'INTERNAL',

    // ✅ seus getters atuais (mantidos)
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
    // =========================
    // Sessão / Persistência
    // =========================
    setUser(user) {
      this.user = user || null;

      // ✅ persistir user completo (evita depender só de role/position)
      if (this.user) localStorage.setItem('user', JSON.stringify(this.user));
      else localStorage.removeItem('user');

      // compatibilidade com seu legado
      localStorage.setItem('role', this.user?.role || '');
      localStorage.setItem('position', this.user?.position || '');
      localStorage.setItem('auth_provider', this.user?.auth_provider || 'INTERNAL');
    },

    setToken(token) {
      this.token = token || null;
      if (this.token) localStorage.setItem('token', this.token);
      else localStorage.removeItem('token');
    },

    clearUser() {
      this.user = null;
      this.userById = null;
      this.token = null;

      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('position');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_provider');
    },

    isAuthenticated() {
      return !!this.token;
    },

    logout() {
      this.clearUser();
      router.push('/login');
    },

    academyLogout() {
      this.clearUser();
      router.push({ name: 'AcademyLogin' });
    },

    // ✅ “me” único (serve interno e externo)
    async fetchMe() {
      // getUserInfo já usa token, então funciona pra qualquer provider
      const result = await getUserInfo();
      this.setUser(result.data);
      return result.data;
    },

    async initializeAuth() {
      // ✅ usado no bootstrap do app
      if (this.token && !this.user) {
        try {
          await this.fetchMe();
        } catch {
          this.clearUser();
        }
      }
    },

    // =========================
    // Regras antigas (mantidas)
    // =========================
    setUserById(userById) {
      this.userById = userById;
      localStorage.setItem('position', userById?.position || '');
    },

    hasPosition(position) {
      if (!position) return true;
      return this.user?.position === position || localStorage.getItem('position') === position;
    },

    hasRole(role) {
      if (!role) return true;
      return this.user?.role === role || localStorage.getItem('role') === role;
    },

    async fetchUserInfo() {
      // mantém sua função mas agora delega pro fetchMe
      try {
        await this.fetchMe();
      } catch (error) {
        console.error(error);
        this.clearUser();
        throw error; // ✅ NÃO redireciona aqui
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

    // =========================
    // CRUD Usuários (Office)
    // =========================
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

    async getBanners() {
      try {
        const result = await fetchBanners();
        this.banners = result.data;
      } catch (error) {
        console.error('Erro ao buscar banners:', error);
      }
    },
  },
});
