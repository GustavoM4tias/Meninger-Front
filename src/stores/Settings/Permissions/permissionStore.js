// /stores/Settings/Permissions/permissionStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

// Rotas que SEMPRE são acessíveis (independente de permissões configuradas).
// Não inclua aqui rotas que devem poder ser revogadas pelo admin via alçadas.
const ALWAYS_ALLOWED = ['/', '/settings/account', '/settings/Account', '/report'];

export const usePermissionStore = defineStore('permissions', () => {
    const allowedRoutes = ref([]);   // array de strings — vazio = sem acesso a nada controlado
    // Telas marcadas como "somente admin" pelo admin na tela de Alçadas
    // (route_policies no backend). O servidor já remove essas rotas das alçadas
    // efetivas; a lista vem para o menu esconder e o guard barrar com clareza.
    const adminOnlyRoutes = ref([]);
    // Capacidades (ações dentro da tela) calculadas pelo SERVIDOR
    // (lib/screenCapabilities.js no back): { '/rota': ['view','configure'] }.
    // Nunca é recalculada aqui nem lida do cache — ação de admin não pode
    // depender de localStorage. Enquanto não chega, can() nega (fail-closed).
    const capabilities = ref({});
    const isAdmin = ref(false);
    const loaded = ref(false);

    // ── Carrega do backend as permissões do usuário logado ───────────────────
    async function fetchMyPermissions() {
        try {
            const data = await requestWithAuth('/permissions/me');
            isAdmin.value  = data.isAdmin  ?? false;
            allowedRoutes.value = data.routes ?? [];
            adminOnlyRoutes.value = data.adminOnlyRoutes ?? [];
            capabilities.value = data.capabilities ?? {};
            loaded.value = true;
            // Cache local só das ROTAS (evita flicker do menu no reload).
            // isAdmin nunca vai para o cache: admin só vale confirmado pelo servidor.
            localStorage.setItem('_perm', JSON.stringify({
                routes: allowedRoutes.value,
                adminOnlyRoutes: adminOnlyRoutes.value,
            }));
        } catch {
            // Fallback para cache local em caso de falha de rede (só rotas;
            // isAdmin permanece false — fail-closed para telas admin)
            _loadFromCache();
            loaded.value = true;
        }
    }

    // ── Garante que as permissões foram carregadas (usado no router guard) ───
    async function ensureLoaded() {
        if (!loaded.value) {
            _loadFromCache(); // carrega imediatamente do cache para não bloquear
            await fetchMyPermissions(); // depois sincroniza com o servidor
        }
    }

    // ── Verifica se o usuário pode acessar uma rota ──────────────────────────
    // Admin: sempre true
    // Rota sempre permitida: true
    // Rota gerenciada: verifica se está no array
    // Rota não gerenciada (ex: sub-páginas internas): herda da raiz
    // ── Tela travada como somente-admin na tela de Alçadas ───────────────────
    // Cobre sub-rotas (/tela/123 herda de /tela), igual ao backend.
    function isRouteAdminOnly(routePath) {
        const path = String(routePath || '').toLowerCase().replace(/\/$/, '') || '/';
        return adminOnlyRoutes.value.some(r => {
            const locked = String(r || '').toLowerCase().replace(/\/$/, '');
            return locked && (path === locked || path.startsWith(locked + '/'));
        });
    }

    function hasAccess(routePath) {
        if (isAdmin.value) return true;

        // Normaliza para remover trailing slash. A comparação é sem caixa: o
        // backend (permissionAccessService) já trata as rotas em minúsculas, e
        // uma alçada gravada com caixa diferente escondia a tela só no front.
        const path = (routePath.replace(/\/$/, '') || '/').toLowerCase();

        // Travada pelo admin: nem a allowlist local libera (o servidor também nega).
        if (isRouteAdminOnly(path)) return false;

        if (ALWAYS_ALLOWED.some(r => r.toLowerCase() === path)) return true;

        // Verifica match exato ou prefixo (para sub-rotas como /comercial/projections/123)
        return allowedRoutes.value.some(route => {
            const allowed = String(route || '').toLowerCase();
            return path === allowed || path.startsWith(allowed + '/');
        });
    }

    // ── Ações dentro da tela ─────────────────────────────────────
    // can('/mural/admin', 'remove') → true/false. A regra (alçada x admin) mora
    // no backend; aqui é só consulta. Ação não recebida = negada.
    function can(routePath, action) {
        const path = String(routePath || '').toLowerCase().replace(/\/$/, '');
        const acoes = capabilities.value[path] || capabilities.value[routePath] || [];
        return acoes.includes(action);
    }

    // ── Limpa ao fazer logout ────────────────────────────────────────────────
    function clearPermissions() {
        allowedRoutes.value = [];
        adminOnlyRoutes.value = [];
        capabilities.value = {};
        isAdmin.value = false;
        loaded.value = false;
        localStorage.removeItem('_perm');
    }

    // ── Privado: carrega do localStorage ────────────────────────────────────
    // Restaura APENAS as rotas. isAdmin é ignorado de propósito: um valor de
    // localStorage nunca pode conceder admin (o guard exige confirmação do
    // servidor via fetchMyPermissions).
    function _loadFromCache() {
        try {
            const cached = JSON.parse(localStorage.getItem('_perm'));
            if (cached) {
                allowedRoutes.value = cached.routes ?? [];
                adminOnlyRoutes.value = cached.adminOnlyRoutes ?? [];
            }
        } catch { /* ignora */ }
    }

    return {
        allowedRoutes,
        adminOnlyRoutes,
        capabilities,
        can,
        isAdmin,
        loaded,
        fetchMyPermissions,
        ensureLoaded,
        hasAccess,
        isRouteAdminOnly,
        clearPermissions,
    };
});
