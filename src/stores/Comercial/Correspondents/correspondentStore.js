// stores/Comercial/Correspondents/correspondentStore.js
//
// Correspondentes do CV. O panorama vem do espelho local (o GET de empresas
// do CV está quebrado); os cadastros são feitos por API e SEMPRE conferidos
// por leitura, porque a resposta do POST do CV não é confiável.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useCorrespondentStore = defineStore('correspondents', () => {
    const empresas = ref([]);
    const registros = ref([]);
    const totalUsuarios = ref(0);

    // Próximo código provável da empresa no CV (o CV numera em sequência e não
    // devolve o id no cadastro). Serve para a tela oferecer o vínculo em vez de
    // mandar o operador procurar o número na listagem do CV.
    const codigoSugerido = ref(null);

    const loading = ref(false);
    const syncing = ref(false);
    const saving = ref(false);

    const empresasVinculadas = computed(() => empresas.value.filter(e => e.cv_idempresa));
    const pendentes = computed(() => registros.value.filter(r => r.status === 'error' || r.status === 'pending').length);

    async function fetchOverview() {
        loading.value = true;
        try {
            const data = await requestWithAuth('/correspondents/overview');
            empresas.value = data?.empresas || [];
            totalUsuarios.value = data?.total_usuarios || 0;
            codigoSugerido.value = data?.codigo_sugerido ?? null;
        } finally {
            loading.value = false;
        }
    }

    async function fetchRegistrations() {
        const data = await requestWithAuth('/correspondents/registrations');
        registros.value = data?.registros || [];
    }

    async function sync() {
        syncing.value = true;
        try {
            const data = await requestWithAuth('/correspondents/sync', { method: 'POST' });
            empresas.value = data?.empresas || [];
            totalUsuarios.value = data?.total_usuarios || 0;
            codigoSugerido.value = data?.codigo_sugerido ?? null;
        } finally {
            syncing.value = false;
        }
    }

    /** Prévia da colagem - não grava nada, só devolve o que foi entendido. */
    async function preview(texto) {
        const data = await requestWithAuth('/correspondents/preview', {
            method: 'POST',
            body: JSON.stringify({ texto }),
        });
        return { pessoas: data?.pessoas || [], ignorados: data?.ignorados || [] };
    }

    async function createCompany(payload) {
        saving.value = true;
        try {
            const data = await requestWithAuth('/correspondents/companies', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            await fetchOverview();
            return data;
        } finally {
            saving.value = false;
        }
    }

    /**
     * Reenvia ao CV uma empresa que ficou pendente (o CV responde igual quando
     * grava e quando recusa, então cadastro que não chegou lá precisa de outra
     * tentativa). Devolve o envio, com o código provável.
     */
    async function resendCompany(id) {
        saving.value = true;
        try {
            const data = await requestWithAuth(`/correspondents/companies/${id}/resend`, { method: 'POST' });
            await fetchOverview();
            return data?.envio || {};
        } finally {
            saving.value = false;
        }
    }

    async function linkCompany(id, cvIdempresa) {
        const data = await requestWithAuth(`/correspondents/companies/${id}/link`, {
            method: 'POST',
            body: JSON.stringify({ cv_idempresa: cvIdempresa }),
        });
        await fetchOverview();
        return data?.empresa;
    }

    async function updateCompany(id, payload) {
        saving.value = true;
        try {
            const data = await requestWithAuth(`/correspondents/companies/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            await fetchOverview();
            return data?.empresa;
        } finally {
            saving.value = false;
        }
    }

    async function createUsers(companyId, pessoas) {
        saving.value = true;
        try {
            const data = await requestWithAuth('/correspondents/users', {
                method: 'POST',
                body: JSON.stringify({ company_id: companyId, pessoas }),
            });
            await Promise.all([fetchOverview(), fetchRegistrations()]);
            return data;
        } finally {
            saving.value = false;
        }
    }

    // ── Links públicos de auto-cadastro ──────────────────────────────────────
    const convites = ref([]);

    async function fetchInvites() {
        const data = await requestWithAuth('/correspondents/invites');
        convites.value = data?.convites || [];
    }

    async function createInvite({ company_id, label, expires_at }) {
        saving.value = true;
        try {
            const data = await requestWithAuth('/correspondents/invites', {
                method: 'POST',
                body: JSON.stringify({ company_id, label, expires_at }),
            });
            await fetchInvites();
            return data?.convite;
        } finally {
            saving.value = false;
        }
    }

    async function revokeInvite(id) {
        await requestWithAuth(`/correspondents/invites/${id}/revoke`, { method: 'POST' });
        await fetchInvites();
    }

    async function retry(id) {
        try {
            await requestWithAuth(`/correspondents/registrations/${id}/retry`, { method: 'POST' });
        } finally {
            await Promise.all([fetchOverview(), fetchRegistrations()]);
        }
    }

    return {
        empresas, registros, convites, totalUsuarios, codigoSugerido,
        loading, syncing, saving,
        empresasVinculadas, pendentes,
        fetchOverview, fetchRegistrations, fetchInvites, sync, preview,
        createCompany, resendCompany, linkCompany, updateCompany, createUsers, retry,
        createInvite, revokeInvite,
    };
});
