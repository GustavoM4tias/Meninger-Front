// stores/Marketing/Capture/metaFormsStore.js
//
// Store dos Lead Forms da Meta cacheados localmente + seu mapping.
// Conversa com /api/marketing/meta-forms.

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

export const useMetaFormsStore = defineStore('marketingMetaForms', () => {
    const forms = ref([]);
    const loading = ref(false);
    const syncing = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const lastSync = ref(null);          // resultado do último syncFromMeta()

    async function fetchAll() {
        loading.value = true;
        error.value = null;
        try {
            const d = await apiFetch('/meta-forms');
            forms.value = Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            forms.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function syncFromMeta() {
        syncing.value = true;
        error.value = null;
        lastSync.value = null;
        try {
            const d = await apiFetch('/meta-forms/sync', { method: 'POST' });
            lastSync.value = {
                pages_count:  d.pages_count,
                forms_total:  d.forms_total,
                forms_new:    d.forms_new,
                forms_updated: d.forms_updated,
                errors: d.errors || [],
            };
            await fetchAll();
            return lastSync.value;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            syncing.value = false;
        }
    }

    async function updateMapping(metaFormId, patch) {
        saving.value = true;
        error.value = null;
        try {
            const d = await apiFetch(`/meta-forms/${encodeURIComponent(metaFormId)}/mapping`, {
                method: 'PUT',
                body: JSON.stringify(patch),
            });
            // Atualiza in-place pra UX mais responsiva.
            const idx = forms.value.findIndex(f => f.id === metaFormId);
            if (idx >= 0 && d.form) forms.value[idx] = d.form;
            return d.form;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            saving.value = false;
        }
    }

    return {
        forms, loading, syncing, saving, error, lastSync,
        fetchAll, syncFromMeta, updateMapping,
    };
});
