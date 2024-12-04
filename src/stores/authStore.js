// src/store/authStore.js
import { defineStore } from 'pinia';
import { getUserInfo, getAllUsers } from '../utils/apiAuth';

export const useAuthStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null, // Inicializa o token do localStorage
  }),
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
    async getAllUsers() {
      try {
        const users = await getAllUsers();
        return users;
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
