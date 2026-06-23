// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { allManagedRoutes } from '@/config/navRegistry';

import officeRoutes from './office.routes.js';
// Academy em manutenção (migrando para dentro do Office). O academy.routes.js
// fica preservado no repo; para reativar no futuro, reimportar e usar no lugar
// de maintenanceRoutes na linha de seleção de rotas abaixo.
import maintenanceRoutes from './maintenance.routes.js';
import lpRoutes from './lp.routes.js';

// Decide se a aplicação roda como Academy ou Office.
// Produção: pelo subdomínio (academy.menin.com.br → Academy; demais → Office).
// Dev: também aceita `academy.localhost` (navegadores resolvem *.localhost
// automaticamente, sem mexer no arquivo hosts) ou a env VITE_APP_CONTEXT.
function isAcademyHost() {
  const ctx = String(import.meta.env.VITE_APP_CONTEXT || '').toLowerCase();
  if (ctx === 'academy') return true;
  if (ctx === 'office') return false;

  const host = String(window.location.host || '').toLowerCase();
  return host === 'academy.menin.com.br' || host.startsWith('academy.');
}

// Roteamento por host pras landing pages públicas em lp.menin.com.br.
// Dev: aceita `lp.localhost` ou a env VITE_APP_CONTEXT=lp.
function isLpHost() {
  const ctx = String(import.meta.env.VITE_APP_CONTEXT || '').toLowerCase();
  if (ctx === 'lp') return true;
  const host = String(window.location.host || '').toLowerCase();
  return host === 'lp.menin.com.br' || host.startsWith('lp.');
}

const router = createRouter({
  history: createWebHistory(),
  routes: isLpHost() ? lpRoutes : (isAcademyHost() ? maintenanceRoutes : officeRoutes),
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

  // 3. Check de alçada — só para rotas gerenciadas e usuários autenticados.
  //    Não roda no contexto Academy nem LP (lp não usa auth).
  if (requiresAuth && authStore.isAuthenticated() && !isAcademyHost() && !isLpHost()) {
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
