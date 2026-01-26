// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import officeRoutes from './office.routes.js';
import academyRoutes from './academy.routes.js';

function isAcademyHost() {
  return window.location.host === 'academy.menin.com.br';
}

const router = createRouter({
  history: createWebHistory(),
  routes: isAcademyHost() ? academyRoutes : officeRoutes,
});

// ✅ Sem redirect de host aqui dentro. Só auth/permissão.
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  const requiresAuth = to.matched.some(r => r.meta?.requiresAuth);

  if (requiresAuth && !authStore.isAuthenticated()) {
    return next(isAcademyHost() ? { name: 'AcademyLogin' } : { name: 'login' });
  }

  const allowedPosition = to.meta?.allowedPosition;
  const allowedRole = to.meta?.allowedRole;

  if (allowedPosition && !authStore.hasPosition(allowedPosition)) {
    return next({ path: '/error', query: { message: 'Você não tem permissão para acessar esta página!' } });
  }

  if (allowedRole && !authStore.hasRole(allowedRole)) {
    return next({ path: '/error', query: { message: 'Você não tem permissão para acessar esta página!' } });
  }

  next();
});

export default router;
