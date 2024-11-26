// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/userStore';
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
    name: 'teste',
    component: () => import('../views/teste.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('../views/Account.vue'),
    meta: { requiresAuth: true },
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
  const userStore = useUserStore();
  const requiresAuth = to.meta.requiresAuth;

  if (requiresAuth && !userStore.isAuthenticated()) {
    next('/login');
  } else {
    next(); 
  }
});

export default router;
