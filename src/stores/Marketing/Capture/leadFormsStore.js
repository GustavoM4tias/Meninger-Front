// stores/Marketing/Capture/leadFormsStore.js
//
// Store da gestão de formulários de captação (CRUD admin). Conversa com
// /api/marketing/lead-forms — list/create/update.

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
    const resp = await fetch(`${API_URL}/marketing${path}`, { headers: authHeaders(), ...opts });
    if (resp.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || `Erro na requisição (${resp.status}).`);
    }
    return data;
}

export const useLeadFormsStore = defineStore('marketingLeadForms', () => {
    const forms = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    async function fetchAll() {
        loading.value = true;
        error.value = null;
        try {
            const data = await apiFetch('/lead-forms');
            forms.value = Array.isArray(data.results) ? data.results : [];
        } catch (e) {
            error.value = e.message;
            forms.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function create(payload) {
        saving.value = true;
        error.value = null;
        try {
            const data = await apiFetch('/lead-forms', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            await fetchAll();
            return data.form;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            saving.value = false;
        }
    }

    async function update(id, payload) {
        saving.value = true;
        error.value = null;
        try {
            const data = await apiFetch(`/lead-forms/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            await fetchAll();
            return data.form;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            saving.value = false;
        }
    }

    /** Toggle rápido do active (sem abrir o modal). */
    async function toggleActive(id, desired) {
        error.value = null;
        try {
            const body = typeof desired === 'boolean' ? JSON.stringify({ active: desired }) : '{}';
            const d = await apiFetch(`/lead-forms/${id}/toggle-active`, { method: 'POST', body });
            // Atualiza in-place pra UX responsiva (mantém stats).
            const idx = forms.value.findIndex(f => f.id === id);
            if (idx >= 0 && d.form) {
                forms.value[idx] = { ...forms.value[idx], active: d.form.active };
            }
            return d.form?.active;
        } catch (e) {
            error.value = e.message;
            return null;
        }
    }

    async function fetchRecentLeads(formId, { limit = 20 } = {}) {
        try {
            const d = await apiFetch(`/lead-forms/${formId}/leads?limit=${limit}`);
            return Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            return [];
        }
    }

    return { forms, loading, saving, error, fetchAll, create, update, toggleActive, fetchRecentLeads };
});
