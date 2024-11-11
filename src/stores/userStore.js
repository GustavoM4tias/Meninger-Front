// src/store/userStore.js
import { defineStore } from 'pinia';
import { getUserInfo } from '../utils/apiAuth';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null, // Inicializa o token do localStorage
  }),
  actions: {
    setUser(user) {
      this.user = user;
    },
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token); // Salva o token no localStorage
    },
    clearUser() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token'); // Remove o token do localStorage
    },
    isAuthenticated() {
      return !!this.token; 
    },
    async fetchUserInfo() {
      try {
        const result = await getUserInfo();
        this.user = result.data;
      } catch (error) {
        console.error(error);
      }
    },
  },
});
