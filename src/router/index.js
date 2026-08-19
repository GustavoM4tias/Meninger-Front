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
import { attachPwaRoutes } from './pwa.routes.js';

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
  routes: isLpHost() ? lpRoutes : (isAcademyHost() ? maintenanceRoutes : attachPwaRoutes(officeRoutes)),
});

// ─── Auto-recuperação de build obsoleto ──────────────────────────────────────
// Após um deploy novo, uma aba antiga ainda aponta para os chunks com hash do
// build anterior. Esses arquivos deixam de existir e o servidor devolve o
// index.html (text/html) no lugar do .js/.css → o navegador recusa por MIME e a
// navegação lazy quebra ("Failed to fetch dynamically imported module"). Quando
// isso acontece, recarregamos a página UMA vez para baixar o index.html fresco
// (com os novos hashes). Trava por tempo evita loop se a falha for real.
const RELOAD_FLAG = 'app:chunk-reload-at';
function isStaleChunkError(err) {
  const msg = String(err?.message || err || '');
  return /dynamically imported module|module script|Importing a module script failed|error loading dynamically imported/i.test(msg);
}
function reloadForFreshBuild(targetPath) {
  const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
  if (Date.now() - last < 10000) return; // já recarregou há pouco: não insiste (evita loop)
  sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  if (targetPath) window.location.assign(targetPath);
  else window.location.reload();
}
// Falha de import dinâmico durante uma navegação (router lazy).
router.onError((error, to) => {
  if (isStaleChunkError(error)) reloadForFreshBuild(to?.fullPath);
});
// Falha de preload de chunk do Vite (mesma causa, fora de navegação).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault(); // não deixa virar erro não tratado
  reloadForFreshBuild();
});

// ─── Barreira de acesso → sempre o login ─────────────────────────────────────
// Não existe mais tela de erro: qualquer bloqueio (cargo, role, admin, alçada)
// termina no login. Encerrar a sessão local é o que faz o login realmente
// aparecer (o componente manda usuário autenticado direto pra Home) e garante um
// /permissions/me novo no próximo acesso — que é o caminho de volta quando o
// bloqueio veio de sessão vencida ou da API fora do ar, e não de falta de alçada.
function backToLogin(next, authStore) {
  try { authStore.clearUser(); } catch { /* ignora */ }
  return next(isAcademyHost() ? { name: 'AcademyLogin' } : { name: 'login', query: { motivo: 'acesso' } });
}

// ✅ Guard unificado: autenticação + role + admin + permissões de alçada
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  const requiresAuth = to.matched.some(r => r.meta?.requiresAuth);

  // 1. Autenticação
  if (requiresAuth && !authStore.isAuthenticated()) {
    return next(isAcademyHost() ? { name: 'AcademyLogin' } : { name: 'login' });
  }

  // 1b. Garante o usuário carregado do servidor antes de avaliar role/cargo.
  //     hasRole/hasPosition não têm mais fallback de localStorage; sem isso,
  //     um F5 numa rota admin negaria acesso antes do fetchMe terminar.
  //     Falha de rede: segue sem user → checks de role negam (fail-closed),
  //     sem deslogar o usuário.
  if (requiresAuth && authStore.isAuthenticated() && !authStore.user) {
    try { await authStore.fetchMe(); } catch { /* fail-closed nos checks abaixo */ }
  }

  // 2. Checks de position e role
  const allowedPosition = to.meta?.allowedPosition;
  const allowedRole     = to.meta?.allowedRole;

  if (allowedPosition && !authStore.hasPosition(allowedPosition)) {
    return backToLogin(next, authStore);
  }

  if (allowedRole && !authStore.hasRole(allowedRole)) {
    return backToLogin(next, authStore);
  }

  // 3. Check de alçada — só para rotas gerenciadas e usuários autenticados.
  //    Não roda no contexto Academy nem LP (lp não usa auth).
  if (requiresAuth && authStore.isAuthenticated() && !isAcademyHost() && !isLpHost()) {
    const permStore = usePermissionStore();
    await permStore.ensureLoaded();

    // 3a. Rotas admin: por CÓDIGO (meta.requiresAdmin/adminOnly em qualquer
    //     nível do match) ou por CONFIGURAÇÃO (tela travada como somente-admin
    //     na tela de Alçadas). Exige admin confirmado pelo servidor
    //     (/permissions/me), nunca cache.
    const needsAdmin = to.matched.some(r => r.meta?.requiresAdmin || r.meta?.adminOnly)
      || permStore.isRouteAdminOnly(to.path);
    if (needsAdmin && !permStore.isAdmin) {
      return backToLogin(next, authStore);
    }

    // 3b. Apenas verifica rotas que estão no registro gerenciado (ignora rotas internas, params, etc.)
    const isManagedRoute = allManagedRoutes.some(managed =>
      to.path === managed || to.path.startsWith(managed + '/')
    );

    if (isManagedRoute && !permStore.hasAccess(to.path)) {
      return backToLogin(next, authStore);
    }
  }

  next();
});

export default router;
