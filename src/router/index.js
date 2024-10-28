import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/userStore'; // Importa a store
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    beforeEnter: (to, from, next) => {
      const userStore = useUserStore();
      if (!userStore.isAuthenticated()) {
        next('/login'); // Redireciona para a página de login se não estiver autenticado
      } else {
        next(); // Permite o acesso à página
      }
    },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue')
  },
];


const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
