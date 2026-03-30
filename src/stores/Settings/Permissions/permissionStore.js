// /stores/Settings/Permissions/permissionStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

// Rotas que SEMPRE são acessíveis (independente de permissões configuradas).
// Não inclua aqui rotas que devem poder ser revogadas pelo admin via alçadas.
const ALWAYS_ALLOWED = ['/', '/settings/account', '/settings/Account', '/report'];

export const usePermissionStore = defineStore('permissions', () => {
    const allowedRoutes = ref([]);   // array de strings — vazio = sem acesso a nada controlado
    const isAdmin = ref(false);
    const loaded = ref(false);

    // ── Carrega do backend as permissões do usuário logado ───────────────────
    async function fetchMyPermissions() {
        try {
            const data = await requestWithAuth('/permissions/me');
            isAdmin.value  = data.isAdmin  ?? false;
            allowedRoutes.value = data.routes ?? [];
            loaded.value = true;
            // Cache local para evitar flicker no reload
            localStorage.setItem('_perm', JSON.stringify({ isAdmin: isAdmin.value, routes: allowedRoutes.value }));
        } catch {
            // Fallback para cache local em caso de falha de rede
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
    function hasAccess(routePath) {
        if (isAdmin.value) return true;

        // Normaliza para remover trailing slash
        const path = routePath.replace(/\/$/, '') || '/';

        if (ALWAYS_ALLOWED.includes(path)) return true;

        // Verifica match exato ou prefixo (para sub-rotas como /comercial/projections/123)
        return allowedRoutes.value.some(allowed =>
            path === allowed ||
            path.startsWith(allowed + '/')
        );
    }

    // ── Limpa ao fazer logout ────────────────────────────────────────────────
    function clearPermissions() {
        allowedRoutes.value = [];
        isAdmin.value = false;
        loaded.value = false;
        localStorage.removeItem('_perm');
    }

    // ── Privado: carrega do localStorage ────────────────────────────────────
    function _loadFromCache() {
        try {
            const cached = JSON.parse(localStorage.getItem('_perm'));
            if (cached) {
                isAdmin.value       = cached.isAdmin  ?? false;
                allowedRoutes.value = cached.routes   ?? [];
            }
        } catch { /* ignora */ }
    }

    return {
        allowedRoutes,
        isAdmin,
        loaded,
        fetchMyPermissions,
        ensureLoaded,
        hasAccess,
        clearPermissions,
    };
});
