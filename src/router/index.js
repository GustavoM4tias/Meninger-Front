// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { allManagedRoutes } from '@/config/navRegistry';

import officeRoutes from './office.routes.js';
import academyRoutes from './academy.routes.js';

function isAcademyHost() {
  return window.location.host === 'academy.menin.com.br';
}

const router = createRouter({
  history: createWebHistory(),
  routes: isAcademyHost() ? academyRoutes : officeRoutes,
});

// ✅ Guard unificado: autenticação + role + permissões de alçada
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  const requiresAuth = to.matched.some(r => r.meta?.requiresAuth);

  // 1. Autenticação
  if (requiresAuth && !authStore.isAuthenticated()) {
    return next(isAcademyHost() ? { name: 'AcademyLogin' } : { name: 'login' });
  }

  // 2. Checks de position e role (comportamento original)
  const allowedPosition = to.meta?.allowedPosition;
  const allowedRole     = to.meta?.allowedRole;

  if (allowedPosition && !authStore.hasPosition(allowedPosition)) {
    return next({ path: '/error', query: { message: 'Você não tem permissão para acessar esta página!' } });
  }

  if (allowedRole && !authStore.hasRole(allowedRole)) {
    return next({ path: '/error', query: { message: 'Você não tem permissão para acessar esta página!' } });
  }

  // 3. Check de alçada — só para rotas gerenciadas e usuários autenticados
  if (requiresAuth && authStore.isAuthenticated() && !isAcademyHost()) {
    const permStore = usePermissionStore();
    await permStore.ensureLoaded();

    // Apenas verifica rotas que estão no registro gerenciado (ignora rotas internas, params, etc.)
    const isManagedRoute = allManagedRoutes.some(managed =>
      to.path === managed || to.path.startsWith(managed + '/')
    );

    if (isManagedRoute && !permStore.hasAccess(to.path)) {
      return next({ path: '/error', query: { message: 'Você não tem permissão para acessar esta página.' } });
    }
  }

  next();
});

export default router;
