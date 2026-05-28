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
            // Atualiza in-place pra UX mais responsiva (mas mantém stats anteriores).
            const idx = forms.value.findIndex(f => f.id === metaFormId);
            if (idx >= 0 && d.form) {
                forms.value[idx] = { ...d.form, stats: forms.value[idx].stats };
            }
            return d.form;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            saving.value = false;
        }
    }

    async function fetchRecentLeads(metaFormId, { limit = 20, cv = null } = {}) {
        try {
            const qs = new URLSearchParams({ limit: String(limit) });
            if (cv === 'matched' || cv === 'unmatched') qs.set('cv', cv);
            const d = await apiFetch(`/meta-forms/${encodeURIComponent(metaFormId)}/leads?${qs}`);
            return Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            return [];
        }
    }

    async function fetchFieldMappings(metaFormId) {
        try {
            return await apiFetch(`/meta-forms/${encodeURIComponent(metaFormId)}/field-mappings`);
        } catch (e) {
            error.value = e.message;
            return null;
        }
    }

    async function saveFieldMappings(metaFormId, mappings) {
        saving.value = true;
        error.value = null;
        try {
            const d = await apiFetch(`/meta-forms/${encodeURIComponent(metaFormId)}/field-mappings`, {
                method: 'PUT',
                body: JSON.stringify({ mappings }),
            });
            const idx = forms.value.findIndex(f => f.id === metaFormId);
            if (idx >= 0 && d.form) {
                forms.value[idx] = { ...d.form, stats: forms.value[idx].stats };
            }
            return d.form;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            saving.value = false;
        }
    }

    async function fetchComparison(metaFormId) {
        try {
            return await apiFetch(`/meta-forms/${encodeURIComponent(metaFormId)}/comparison`);
        } catch (e) {
            error.value = e.message;
            return null;
        }
    }

    /** Faz download direto do CSV — abre nova aba/baixa via browser. */
    function downloadLeadsCsv(metaFormId, { cv = null } = {}) {
        const token = localStorage.getItem('token');
        const qs = new URLSearchParams();
        if (cv === 'matched' || cv === 'unmatched') qs.set('cv', cv);
        // O endpoint admin exige Bearer — não dá pra usar window.open direto.
        // Estratégia: fetch + blob + download programático.
        return fetch(`${API_URL}/marketing/meta-forms/${encodeURIComponent(metaFormId)}/leads.csv?${qs}`, {
            headers: { Authorization: token ? `Bearer ${token}` : '' },
        }).then(async (r) => {
            if (!r.ok) throw new Error(`Erro ao exportar (${r.status}).`);
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leads-meta-${metaFormId}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    return {
        forms, loading, syncing, saving, error, lastSync,
        fetchAll, syncFromMeta, updateMapping, fetchRecentLeads,
        fetchComparison, downloadLeadsCsv,
        fetchFieldMappings, saveFieldMappings,
    };
});
