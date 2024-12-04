// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/events',
    name: 'Events',
    component: () => import('../views/Events.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/teste',
    name: 'Teste',
    component: () => import('../views/teste.vue'),
    meta: {
      requiresAuth: true,
      allowedPosition: 'admin'
    },
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/admin/Users.vue'),
    meta: {
      requiresAuth: true,
      allowedPosition: ''
    },
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('../views/Account.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/error',
    name: 'Error',
    component: () => import('../views/ErrorPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth;
  const allowedPosition = to.meta.allowedPosition;
  // Verifica autenticação
  if (requiresAuth && !authStore.isAuthenticated()) {
    return next('/login');
  }
  // Verifica posição para rotas específicas
  if (allowedPosition && !authStore.hasPosition(allowedPosition)) {
    const errorMessage = `Você não tem permissão para acessar esta página!`;
    return next({
      path: '/error',
      query: { message: errorMessage },
    });
  }
  next();
});

export default router;
