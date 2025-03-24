// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/Auth/authStore';
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
    meta: {
      requiresAuth: true,
      allowedPosition: ''
    },
  },
  {
    path: '/buildings',
    name: 'Buildings',
    component: () => import('../views/Buildings.vue'),
    meta: { requiresAuth: true },
    meta: {
      requiresAuth: true,
      allowedPosition: ''
    },
  },
  {
    path: '/reports',
    name: 'reports',
    children: [
      {
        path: 'leads', name: 'Leads', component: () => import('../views/Reports/Leads.vue'), meta: { requiresAuth: true },
        meta: {
          requiresAuth: true,
          allowedPosition: ''
        },
      },
      {
        path: 'imobiliarias', name: 'Imobiliarias', component: () => import('../views/Reports/Imobiliarias.vue'), meta: { requiresAuth: true },
        meta: {
          requiresAuth: true,
          allowedPosition: ''
        },
      },
      {
        path: 'vendas', name: 'Vendas', component: () => import('../views/Reports/Vendas.vue'), meta: { requiresAuth: true },
        meta: {
          requiresAuth: true,
          allowedPosition: ''
        },
      },
      {
        path: 'repasses', name: 'Repasses', component: () => import('../views/Reports/Repasses.vue'), meta: { requiresAuth: true },
        meta: {
          requiresAuth: true,
          allowedPosition: ''
        },
      },
    ],
    meta: { requiresAuth: true },
    meta: {
      requiresAuth: true,
      allowedPosition: ''
    },
  }, 
  {
    path: '/settings',
    name: 'settings',
    children: [
      {
        path: 'Users', name: 'Users', component: () => import('../views/Settings/Users.vue'), meta: { requiresAuth: true },
        meta: {
          requiresAuth: true,
          allowedPosition: ''
        },
      },
      {
        path: 'Account', name: 'Account', component: () => import('../views/Settings/Account.vue'), meta: { requiresAuth: true },
        meta: {
          requiresAuth: true,
          allowedPosition: ''
        },
      },
      {
        path: 'Hierarchy', name: 'Hierarchy', component: () => import('../views/Settings/Hierarchy.vue'), meta: { requiresAuth: true },
        meta: {
          requiresAuth: true,
          allowedPosition: ''
        },
      }, 
    ],
    meta: { requiresAuth: true },
    meta: {
      requiresAuth: true,
      allowedPosition: ''
    },
  },    
  {
    path: '/error',
    name: 'Error',
    component: () => import('../views/ErrorPage.vue'),
    meta: { requiresAuth: false },
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
