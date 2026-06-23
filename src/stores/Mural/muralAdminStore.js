// stores/Mural/muralAdminStore.js
//
// Mural de Avisos / Comunicados — store ADMIN (gestão). Conversa com
// /api/comunicados/admin[...]: CRUD, público-alvo (assignments), publicar,
// atualizar destinatários, status e painel de aderência.

import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function apiFetch(path, opts = {}) {
    const resp = await fetch(`${API_URL}/comunicados${path}`, { headers: authHeaders(), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || `Erro na requisição (${resp.status}).`);
    }
    return data;
}

export const useMuralAdminStore = defineStore('muralAdmin', () => {
    const list = ref([]);          // [{ ...comunicado, stats }]
    const current = ref(null);     // { ...comunicado, assignments, stats }
    const adherence = ref(null);   // { comunicado, total, acked, pending, users }
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    async function fetchList(status) {
        loading.value = true;
        error.value = null;
        try {
            const qs = status ? `?status=${encodeURIComponent(status)}` : '';
            const data = await apiFetch(`/admin${qs}`);
            list.value = Array.isArray(data.results) ? data.results : [];
        } catch (e) {
            error.value = e.message;
            list.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchOne(id) {
        loading.value = true;
        error.value = null;
        try {
            const data = await apiFetch(`/admin/${id}`);
            current.value = data.comunicado || null;
            return current.value;
        } catch (e) {
            error.value = e.message;
            current.value = null;
            return null;
        } finally {
            loading.value = false;
        }
    }

    async function create(payload) {
        saving.value = true;
        error.value = null;
        try {
            const data = await apiFetch('/admin', { method: 'POST', body: JSON.stringify(payload) });
            await fetchList();
            return data.comunicado;
        } catch (e) {
            error.value = e.message;
            throw e;
        } finally {
            saving.value = false;
        }
    }

    async function update(id, payload) {
        saving.value = true;
        error.value = null;
        try {
            const data = await apiFetch(`/admin/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
            await fetchList();
            return data.comunicado;
        } catch (e) {
            error.value = e.message;
            throw e;
        } finally {
            saving.value = false;
        }
    }

    // Substitui o público-alvo (assignments: [{ scopeType, scopeValue }]).
    async function setAssignments(id, assignments) {
        error.value = null;
        try {
            return await apiFetch(`/admin/${id}/assignments`, {
                method: 'PUT',
                body: JSON.stringify({ assignments }),
            });
        } catch (e) {
            error.value = e.message;
            throw e;
        }
    }

    // Resolve destinatários + materializa + dispara notificação. Pode falhar se
    // não houver público-alvo — o erro é propagado para a UI avisar.
    async function publish(id) {
        saving.value = true;
        error.value = null;
        try {
            const data = await apiFetch(`/admin/${id}/publish`, { method: 'POST' });
            await fetchList();
            return data.comunicado;
        } catch (e) {
            error.value = e.message;
            throw e;
        } finally {
            saving.value = false;
        }
    }

    // Re-materializa quem entrou no público depois da publicação (sem re-notificar antigos).
    async function refresh(id) {
        error.value = null;
        try {
            return await apiFetch(`/admin/${id}/refresh`, { method: 'POST' });
        } catch (e) {
            error.value = e.message;
            throw e;
        }
    }

    async function setStatus(id, status) {
        saving.value = true;
        error.value = null;
        try {
            const data = await apiFetch(`/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            await fetchList();
            return data.comunicado;
        } catch (e) {
            error.value = e.message;
            throw e;
        } finally {
            saving.value = false;
        }
    }

    async function remove(id) {
        error.value = null;
        try {
            await apiFetch(`/admin/${id}`, { method: 'DELETE' });
            await fetchList();
            return true;
        } catch (e) {
            error.value = e.message;
            return false;
        }
    }

    async function fetchAdherence(id) {
        loading.value = true;
        error.value = null;
        try {
            adherence.value = await apiFetch(`/admin/${id}/adherence`);
            return adherence.value;
        } catch (e) {
            error.value = e.message;
            adherence.value = null;
            return null;
        } finally {
            loading.value = false;
        }
    }

    return {
        list, current, adherence, loading, saving, error,
        fetchList, fetchOne, create, update, setAssignments, publish, refresh, setStatus, remove, fetchAdherence,
    };
});
