// stores/Microsoft/microsoftStore.js
//
// Gerencia o estado da conexão Microsoft do usuário logado.
// Usado em: Login.vue, Perfil, Admin de usuários, e todos os módulos Microsoft futuros.
//
// Módulos futuros (SharePoint, Teams, etc.) criam seus próprios stores,
// mas todos dependem de `microsoftStore.connected` para saber se podem agir.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useMicrosoftStore = defineStore('microsoft', () => {

    // ── Estado ───────────────────────────────────────────────────────────────
    const connected    = ref(false);
    const tokenValid   = ref(false);
    const expiresAt    = ref(null);   // Unix ms
    const authProvider = ref(null);   // 'MICROSOFT' | 'INTERNAL' | null
    const loading      = ref(false);
    const error        = ref(null);

    // ── Computed ─────────────────────────────────────────────────────────────

    /** Usuário usa Microsoft como único meio de login (não pode desvincular) */
    const isMicrosoftOnly = computed(() => authProvider.value === 'MICROSOFT');

    /** Mostra quando o token expira em formato legível */
    const expiresAtFormatted = computed(() => {
        if (!expiresAt.value) return null;
        return new Date(expiresAt.value).toLocaleString('pt-BR');
    });

    /** URL de login Microsoft (backend redireciona para Azure AD) */
    const loginUrl = computed(() => `${API_URL}/microsoft/auth/login`);

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * Consulta o backend e atualiza o estado da conexão Microsoft.
     * Chamar: ao carregar o perfil, ao entrar em módulos que precisam do MS.
     */
    async function fetchStatus() {
        loading.value = true;
        error.value   = null;

        try {
            const data = await requestWithAuth(`${API_URL}/microsoft/auth/status`);
            connected.value    = data.connected;
            tokenValid.value   = data.tokenValid;
            expiresAt.value    = data.expiresAt;
            authProvider.value = data.authProvider;
        } catch (err) {
            console.error('[microsoftStore] fetchStatus error:', err);
            error.value = err.message;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Força renovação do token Microsoft no backend.
     * Chamar quando qualquer módulo receber erro 401 da Graph API.
     * Retorna true se o token foi renovado com sucesso.
     */
    async function refreshToken() {
        try {
            await requestWithAuth(`${API_URL}/microsoft/auth/refresh`, { method: 'POST' });
            await fetchStatus(); // atualiza expiresAt
            return true;
        } catch (err) {
            console.warn('[microsoftStore] refreshToken failed:', err.message);
            // Se o servidor retornou requiresReauth, marca como desconectado
            connected.value  = false;
            tokenValid.value = false;
            return false;
        }
    }

    /**
     * Desvincula a conta Microsoft do usuário.
     * Só disponível para usuários com auth_provider !== 'MICROSOFT'.
     */
    async function unlink() {
        loading.value = true;
        error.value   = null;

        try {
            await requestWithAuth(`${API_URL}/microsoft/auth/unlink`, { method: 'DELETE' });
            connected.value    = false;
            tokenValid.value   = false;
            expiresAt.value    = null;
            authProvider.value = 'INTERNAL';
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    /** Limpa o estado local (chamar no logout da plataforma) */
    function clear() {
        connected.value    = false;
        tokenValid.value   = false;
        expiresAt.value    = null;
        authProvider.value = null;
        error.value        = null;
    }

    /** Redireciona para o login Microsoft (inicia o fluxo OAuth) */
    function redirectToLogin() {
        window.location.href = loginUrl.value;
    }

    return {
        // state
        connected,
        tokenValid,
        expiresAt,
        authProvider,
        loading,
        error,

        // computed
        isMicrosoftOnly,
        expiresAtFormatted,
        loginUrl,

        // actions
        fetchStatus,
        refreshToken,
        unlink,
        clear,
        redirectToLogin,
    };
});
