import { defineStore } from 'pinia';
import router from '@/router';
import API_URL from '@/config/apiUrl';
import {
  getUserInfo,
  getUserById,
  fetchBanners,
  loginUser,
  requestPasswordReset,
  resetPassword,
} from '@/utils/Auth/apiAuth';

function safeJsonParse(v, fallback = null) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function normalizeProvider(user) {
  const p = String(user?.auth_provider || '').toUpperCase();
  return p || '';
}

function getErrorMessage(error, fallback = 'Ocorreu um erro.') {
  if (error?.message) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

export const useAuthStore = defineStore('user', {
  state: () => ({
    users: [],
    user: safeJsonParse(localStorage.getItem('user'), null),
    userById: null,
    weather: null,
    token: localStorage.getItem('token') || null,
    banners: [],

    forgotPassword: {
      open: false,
      loading: false,
      step: 1,
      email: '',
      code: '',
      password: '',
      confirmPassword: '',
      message: '',
      error: '',
    },
  }),

  getters: {
    authProvider: (state) => normalizeProvider(state.user),
    isExternal: (state) => normalizeProvider(state.user) !== 'INTERNAL',
    isInternal: (state) => normalizeProvider(state.user) === 'INTERNAL',

    usuariosComAniversarioValido: (state) =>
      state.users.filter((u) => u.birth_date && !isNaN(new Date(u.birth_date))),

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
        .map((u) => ({ ...u, _nextBDay: getters.proximoAniversario(u.birth_date) }))
        .filter((u) => u._nextBDay)
        .sort((a, b) => a._nextBDay - b._nextBDay);
    },

    aniversariosFinalizados: (state, getters) => {
      const hoje = new Date();

      return getters.usuariosComAniversarioValido
        .map((u) => {
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
      this.user = user || null;

      if (this.user) {
        localStorage.setItem('user', JSON.stringify(this.user));
      } else {
        localStorage.removeItem('user');
      }

      localStorage.setItem('role', this.user?.role || '');
      localStorage.setItem('position', this.user?.position || '');
      localStorage.setItem('auth_provider', this.user?.auth_provider || '');
    },

    setToken(token) {
      this.token = token || null;

      if (this.token) {
        localStorage.setItem('token', this.token);
      } else {
        localStorage.removeItem('token');
      }
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
      const isAcademy = window.location.host === 'academy.menin.com.br';
      router.push(isAcademy ? { name: 'AcademyLogin' } : { name: 'login' });
    },

    academyLogout() {
      this.clearUser();
      router.push({ name: 'AcademyLogin' });
    },

    async fetchMe() {
      const result = await getUserInfo();
      this.setUser(result.data);
      return result.data;
    },

    async initializeAuth() {
      if (this.token && !this.user) {
        try {
          await this.fetchMe();
        } catch {
          this.clearUser();
        }
      }
    },

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
      try {
        await this.fetchMe();
      } catch (error) {
        console.error(error);
        this.clearUser();
        throw error;
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

    async login(email, password) {
      try {
        const result = await loginUser(email, password);

        if (!result?.success || !result?.data?.token) {
          throw new Error(result?.message || result?.error || 'Falha no login.');
        }

        this.setToken(result.data.token);
        await this.fetchUserInfo();

        return result;
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Erro ao tentar login.'));
      }
    },

    openForgotPasswordModal(email = '') {
      this.forgotPassword.open = true;
      this.forgotPassword.loading = false;
      this.forgotPassword.step = 1;
      this.forgotPassword.email = email || '';
      this.forgotPassword.code = '';
      this.forgotPassword.password = '';
      this.forgotPassword.confirmPassword = '';
      this.forgotPassword.message = '';
      this.forgotPassword.error = '';
    },

    closeForgotPasswordModal() {
      this.forgotPassword.open = false;
      this.forgotPassword.loading = false;
      this.forgotPassword.step = 1;
      this.forgotPassword.email = '';
      this.forgotPassword.code = '';
      this.forgotPassword.password = '';
      this.forgotPassword.confirmPassword = '';
      this.forgotPassword.message = '';
      this.forgotPassword.error = '';
    },

    backForgotPasswordStep() {
      this.forgotPassword.step = 1;
      this.forgotPassword.code = '';
      this.forgotPassword.password = '';
      this.forgotPassword.confirmPassword = '';
      this.forgotPassword.message = '';
      this.forgotPassword.error = '';
    },

    setForgotPasswordField(field, value) {
      if (!Object.prototype.hasOwnProperty.call(this.forgotPassword, field)) return;
      this.forgotPassword[field] = value;
    },

    async requestForgotPassword() {
      this.forgotPassword.loading = true;
      this.forgotPassword.error = '';
      this.forgotPassword.message = '';

      try {
        const result = await requestPasswordReset(this.forgotPassword.email);

        if (result?.success === false) {
          throw new Error(result?.message || result?.error || 'Erro ao solicitar redefinição.');
        }

        this.forgotPassword.message =
          result?.message ||
          result?.data?.message ||
          'Se existir uma conta válida, enviaremos um código para o e-mail informado.';

        this.forgotPassword.step = 2;

        return result;
      } catch (error) {
        const message = getErrorMessage(error, 'Erro ao solicitar redefinição.');
        this.forgotPassword.error = message;
        throw new Error(message);
      } finally {
        this.forgotPassword.loading = false;
      }
    },

    async confirmForgotPassword() {
      this.forgotPassword.loading = true;
      this.forgotPassword.error = '';
      this.forgotPassword.message = '';

      try {
        const result = await resetPassword(
          this.forgotPassword.email,
          this.forgotPassword.code,
          this.forgotPassword.password,
          this.forgotPassword.confirmPassword
        );

        if (result?.success === false) {
          throw new Error(result?.message || result?.error || 'Erro ao redefinir senha.');
        }

        this.forgotPassword.message =
          result?.message ||
          result?.data?.message ||
          'Senha redefinida com sucesso.';

        return result;
      } catch (error) {
        const message = getErrorMessage(error, 'Erro ao redefinir senha.');
        this.forgotPassword.error = message;
        throw new Error(message);
      } finally {
        this.forgotPassword.loading = false;
      }
    },

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

        this.users = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
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
        show_in_organogram: payload.show_in_organogram ?? false,
        phone: payload.phone ?? null,
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