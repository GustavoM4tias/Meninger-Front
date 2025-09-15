// src/store/authStore.js
import { defineStore } from 'pinia';
import router from '@/router';
import { getUserInfo, getAllUsers, getUserById, fetchBanners } from '@/utils/Auth/apiAuth';

export const useAuthStore = defineStore('user', {
  state: () => ({
    users: [],
    user: null,
    userById: null,
    token: localStorage.getItem('token') || null, // Inicializa o token do localStorage
    banners: [], // novo estado para os banners
  }),
  getters: {
    usuariosComAniversarioValido: (state) => {
      return state.users.filter(user => user.birth_date && !isNaN(new Date(user.birth_date)));
    },
    aniversariosEmAndamento: (state) => {
      const dataAtual = new Date();
      return state.usuariosComAniversarioValido
        .filter(user => new Date(user.birth_date) >= dataAtual) // Filtra aniversários futuros
        .sort((a, b) => new Date(a.birth_date) - new Date(b.birth_date)); // Ordena do mais próximo
    },
    aniversariosFinalizados: (state) => {
      const dataAtual = new Date();
      return state.usuariosComAniversarioValido
        .filter(user => new Date(user.birth_date) < dataAtual) // Filtra aniversários passados
        .sort((a, b) => new Date(b.birth_date) - new Date(a.birth_date)); // Ordena do mais recente
    },
  },
  actions: {
    setUser(user) {
      this.user = user;
      localStorage.setItem('role', user.role)
      localStorage.setItem('position', user.position); // Salva o position no localStorage
    },
    setUserById(userById) {
      this.userById = userById;
      localStorage.setItem('position', userById.position); // Salva o position no localStorage
    },
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token); // Salva o token no localStorage
    },
    clearUser() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token'); // Remove o token do localStorage
      localStorage.removeItem('role'); // Remove o token do localStorage
      localStorage.removeItem('position'); // Remove o position do localStorage
    },
    isAuthenticated() {
      return !!this.token;
    },
    logout() {
      this.clearUser()
      router.push('/login');
    },
    async fetchUserInfo() {
      try {
        const result = await getUserInfo();
        this.setUser(result.data); // Chama setUser para sincronizar o localStorage
      } catch (error) {
        console.error(error);
        this.clearUser(); // Limpa usuário caso não consiga obter dados
        router.push('/login'); // Redireciona para a rota de login
      }
    },
    async fetchUserById(id) { // ajustar
      try {
        const result = await getUserById(id);
        this.setUserById(result.data); // Chama setUser para sincronizar o localStorage
      } catch (error) {
        console.error(error);
      }
    },
    async getAllUsers() {
      try {
        const result = await getAllUsers(); // Supondo que getAllUsers retorne um array de usuários
        this.users = result.data; // Atualiza a lista de usuários 
        return result;
      } catch (error) {
        throw new Error(error.message);
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
    hasPosition(position) {
      // Verifica a posição pelo estado ou pelo localStorage
      return this.user?.position === position || localStorage.getItem('position') === position;
    },
    hasRole(role){
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
    }
  },
});
