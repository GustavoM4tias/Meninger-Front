// stores/Settings/Admin/orgSyncStore.js
//
// Sincronização de empresas — registro unificado de empresas (Sienge) e
// empreendimentos (CV × Sienge). Substitui o antigo enterpriseCitiesStore
// (Vínculos de cidades): sem override manual de cidade, só dado efetivo.

import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';

function authHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
    };
}

export const useOrgSyncStore = defineStore('orgSync', () => {
    const items = ref([]);
    const total = ref(0);
    const companies = ref([]);
    const page = ref(1);
    const pageSize = ref(50);
    const loading = ref(false);
    const error = ref(null);
    const filtros = ref({ q: '', status: '', companyId: '' });

    async function fetchList({ resetPage = false } = {}) {
        if (resetPage) page.value = 1;
        loading.value = true;
        error.value = null;
        try {
            const params = new URLSearchParams({
                page: String(page.value),
                pageSize: String(pageSize.value),
            });
            if (filtros.value.q) params.set('q', filtros.value.q);
            if (filtros.value.status) params.set('status', filtros.value.status);
            if (filtros.value.companyId) params.set('companyId', String(filtros.value.companyId));

            const res = await fetch(`${API_URL}/admin/org/enterprises?${params}`, { headers: authHeaders() });
            if (!res.ok) throw new Error(`Erro ao listar empreendimentos (${res.status})`);
            const data = await res.json();
            items.value = Array.isArray(data.items) ? data.items : [];
            total.value = Number(data.total) || 0;
        } catch (e) {
            error.value = e.message;
            items.value = [];
            total.value = 0;
        } finally {
            loading.value = false;
        }
    }

    async function fetchCompanies() {
        try {
            const res = await fetch(`${API_URL}/admin/org/companies`, { headers: authHeaders() });
            if (!res.ok) throw new Error(`Erro ao listar empresas (${res.status})`);
            companies.value = await res.json();
        } catch (e) {
            console.warn('[orgSync] companies:', e.message);
            companies.value = [];
        }
    }

    async function runSync(source) {
        const res = await fetch(`${API_URL}/admin/org/sync/${source}`, { method: 'POST', headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Falha no sync ${source} (${res.status})`);
        return data;
    }

    async function consolidate() {
        const res = await fetch(`${API_URL}/admin/org/consolidate`, { method: 'POST', headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Falha na consolidação (${res.status})`);
        return data;
    }

    async function pair(surviveId, absorbId) {
        const res = await fetch(`${API_URL}/admin/org/enterprises/${surviveId}/pair`, {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ absorbId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Falha ao parear (${res.status})`);
        return data;
    }

    async function updateEnterprise(id, patch) {
        const res = await fetch(`${API_URL}/admin/org/enterprises/${id}`, {
            method: 'PUT', headers: authHeaders(),
            body: JSON.stringify(patch),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Falha ao atualizar (${res.status})`);
        return data;
    }

    return {
        items, total, companies, page, pageSize, loading, error, filtros,
        fetchList, fetchCompanies, runSync, consolidate, pair, updateEnterprise,
    };
});
