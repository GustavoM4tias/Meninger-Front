// src/stores/Comercial/Projections/projectionsStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

function getToken() { return localStorage.getItem('token'); }
async function requestWithAuth(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken(); if (token) headers.set('Authorization', `Bearer ${token}`);
    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has('Content-Type') && options.method && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Erro na requisição');
    }
    return res.json();
}

export const useProjectionsStore = defineStore('projections', () => {
    const carregamento = useCarregamentoStore();

    const toBool = (v) => v === true || v === 1 || v === '1';
    const list = ref([]);      // [{id,year,name,is_locked,is_active,...}]
    const allActive = ref([]); // [{id,year,name}] (ativas de todos os anos)
    const detail = ref(null);
    const logs = ref([]);
    const error = ref(null);

    async function fetchList(year) {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const q = year ? `?year=${year}` : '';
            const raw = await requestWithAuth(`${API_URL}/projections${q}`);
            list.value = (raw || []).map(p => ({ ...p, is_active: toBool(p.is_active) }));
        } catch (e) {
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    async function fetchAllActive() {
        // util p/ modal de clonagem
        const raw = await requestWithAuth(`${API_URL}/projections?only_active=1`);
        allActive.value = (raw || []).map(p => ({ ...p, is_active: toBool(p.is_active) }));
    }

    async function createProjection({ year, name, is_active = false }) {
        const r = await requestWithAuth(`${API_URL}/projections`, {
            method: 'POST',
            body: JSON.stringify({ year, name, is_active })
        });
        await fetchList(year);
        await fetchAllActive();
        return r;
    }

    async function cloneProjection({ source_id, year, name, is_active = false }) {
        const r = await requestWithAuth(`${API_URL}/projections/clone`, {
            method: 'POST',
            body: JSON.stringify({ source_id, year, name, is_active })
        });
        await fetchList(year);
        await fetchAllActive();
        return r;
    }

    async function fetchDetail(id) {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const d = await requestWithAuth(`${API_URL}/projections/${id}`);
            if (d?.projection) d.projection.is_active = toBool(d.projection.is_active);
            detail.value = d;
        } catch (e) {
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    async function saveLines(id, rows, { removeMissing = false } = {}) {
        return await requestWithAuth(`${API_URL}/projections/${id}/lines`, {
            method: 'PUT',
            body: JSON.stringify({ rows, remove_missing: !!removeMissing })
        });
    }

    async function saveDefaults(id, items, { removeMissing = false } = {}) {
        return await requestWithAuth(`${API_URL}/projections/${id}/defaults`, {
            method: 'PUT',
            body: JSON.stringify({ items, remove_missing: !!removeMissing })
        });
    }

    async function updateMeta(id, payload) {
        const r = await requestWithAuth(`${API_URL}/projections/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload) // { name?, is_locked?, is_active? }
        });
        // normaliza retorno do PATCH
        if (typeof r?.is_active !== 'undefined') r.is_active = toBool(r.is_active);
        await fetchDetail(id);
        // se alterou ativo, recarrega listas
        if (typeof payload.is_active !== 'undefined') {
            await fetchList(r.year);
            await fetchAllActive();
        }
        return r;
    }

    async function fetchLogs(id) {
        carregamento.iniciarCarregamento();
        logs.value = await requestWithAuth(`${API_URL}/projections/${id}/logs`);
        carregamento.finalizarCarregamento();
    }

    return {
        list, allActive, detail, logs, error,
        fetchList, fetchAllActive,
        createProjection, cloneProjection, fetchDetail,
        saveLines, saveDefaults, updateMeta, fetchLogs
    };
});
