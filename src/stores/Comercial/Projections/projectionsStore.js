import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

function getToken() { return localStorage.getItem('token'); }

async function requestWithAuth(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has('Content-Type') && options.method && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });

    const tryJson = async () => res.json().catch(() => ({}));
    if (!res.ok) {
        const j = await tryJson();
        throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
    }
    return tryJson();
}

function toBool(v) { return v === true || v === 1 || v === '1'; }

export const useProjectionsStore = defineStore('projections', () => {
    const carregamento = useCarregamentoStore();

    const list = ref([]);      // [{id,name,is_locked,is_active,created_at,updated_at}]
    const allActive = ref([]); // [{id,name}] - opcional pro clone
    const detail = ref(null);  // { projection, lines, enterprise_defaults }
    const logs = ref([]);
    const error = ref(null);

    async function fetchList({ start_month, end_month, only_active } = {}) {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const q = new URLSearchParams();
            if (start_month) q.set('start_month', start_month);
            if (end_month) q.set('end_month', end_month);
            if (only_active) q.set('only_active', '1');

            const raw = await requestWithAuth(`${API_URL}/projections?${q.toString()}`);
            list.value = (raw || []).map(p => ({ ...p, is_active: toBool(p.is_active), is_locked: toBool(p.is_locked) }));
        } catch (e) {
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    async function fetchAllActive() {
        // Caso você tenha endpoint que lista todas ativas sem range,
        // mantenha como está. Se backend exigir range, passe um range amplo no controller.
        const raw = await requestWithAuth(`${API_URL}/projections?only_active=1&start_month=1900-01&end_month=2999-12`);
        allActive.value = (raw || []).map(p => ({ ...p, is_active: toBool(p.is_active), is_locked: toBool(p.is_locked) }));
    }

    async function createProjection({ name, is_active = false }) {
        const r = await requestWithAuth(`${API_URL}/projections`, {
            method: 'POST',
            body: JSON.stringify({ name, is_active })
        });
        return r;
    }

    async function cloneProjection({ source_id, name, is_active = false }) {
        const r = await requestWithAuth(`${API_URL}/projections/clone`, {
            method: 'POST',
            body: JSON.stringify({ source_id, name, is_active })
        });
        return r;
    }

    async function fetchDetail(id, { start_month, end_month } = {}) {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const q = new URLSearchParams();
            if (start_month) q.set('start_month', start_month);
            if (end_month) q.set('end_month', end_month);

            const d = await requestWithAuth(`${API_URL}/projections/${id}?${q.toString()}`);
            if (d?.projection) {
                d.projection.is_active = toBool(d.projection.is_active);
                d.projection.is_locked = toBool(d.projection.is_locked);
            }
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
            body: JSON.stringify(payload)
        });
        if (typeof r?.is_active !== 'undefined') r.is_active = toBool(r.is_active);
        if (typeof r?.is_locked !== 'undefined') r.is_locked = toBool(r.is_locked);
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
        createProjection, cloneProjection,
        fetchDetail, saveLines, saveDefaults,
        updateMeta, fetchLogs
    };
});
