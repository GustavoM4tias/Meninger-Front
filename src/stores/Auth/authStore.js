// src/store/authStore.js
import { defineStore } from 'pinia';
import { getUserInfo, getAllUsers, getUserById } from '../../utils/Auth/apiAuth';

export const useAuthStore = defineStore('user', {
  state: () => ({
    users: [],
    user: null,
    token: localStorage.getItem('token') || null, // Inicializa o token do localStorage
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
      localStorage.setItem('position', user.position); // Salva o position no localStorage
    },
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token); // Salva o token no localStorage
    },
    clearUser() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token'); // Remove o token do localStorage
      localStorage.removeItem('position'); // Remove o position do localStorage
    },
    isAuthenticated() {
      return !!this.token;
    },
    async fetchUserInfo() {
      try {
        const result = await getUserInfo();
        this.setUser(result.data); // Chama setUser para sincronizar o localStorage
      } catch (error) {
        console.error(error);
        this.clearUser(); // Limpa usuário caso não consiga obter dados
      }
    },
    async fetchUserById(id) { // ajustar
      try {
        const result = await getUserById(id);
        this.setUser(result.data); // Chama setUser para sincronizar o localStorage
      } catch (error) {
        console.error(error);
        this.clearUser(); // Limpa usuário caso não consiga obter dados
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
    hasPosition(position) {
      // Verifica a posição pelo estado ou pelo localStorage
      return this.user?.position === position || localStorage.getItem('position') === position;
    },
  },
});
