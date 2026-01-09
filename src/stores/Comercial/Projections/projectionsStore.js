import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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

    const list = ref([]);
    const allActive = ref([]);
    const detail = ref(null);
    const logs = ref([]);
    const error = ref(null);

    // ✅ Enterprise Picker (ERP + cidade)
    const enterprisePicker = ref([]);         // [{id,name,city,...}]
    const enterprisePickerError = ref(null);
    const enterprisePickerLoaded = ref(false);

    const enterprisePickerCities = computed(() => {
        const set = new Set();
        for (const it of enterprisePicker.value || []) {
            if (it?.city) set.add(String(it.city));
        }
        return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    });

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
        const raw = await requestWithAuth(`${API_URL}/projections?only_active=1&start_month=1900-01&end_month=2999-12`);
        allActive.value = (raw || []).map(p => ({ ...p, is_active: toBool(p.is_active), is_locked: toBool(p.is_locked) }));
    }

    async function createProjection({ name, is_active = false }) {
        return await requestWithAuth(`${API_URL}/projections`, {
            method: 'POST',
            body: JSON.stringify({ name, is_active })
        });
    }

    async function cloneProjection({ source_id, name, is_active = false }) {
        return await requestWithAuth(`${API_URL}/projections/clone`, {
            method: 'POST',
            body: JSON.stringify({ source_id, name, is_active })
        });
    }

    async function fetchDetail(id, { start_month, end_month, include_zero } = {}) {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const q = new URLSearchParams();
            if (start_month) q.set('start_month', start_month);
            if (end_month) q.set('end_month', end_month);
            if (include_zero) q.set('include_zero', '1');

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

    // ✅ Busca empreendimentos (ERP) com cidade – USO PELO COMPONENTE
    async function fetchEnterprisePicker({ force = false } = {}) {
        enterprisePickerError.value = null;

        if (!force && enterprisePickerLoaded.value && (enterprisePicker.value?.length || 0) > 0) {
            return enterprisePicker.value;
        }

        try {
            carregamento.iniciarCarregamento();
            const data = await requestWithAuth(`${API_URL}/projections/enterprise-picker`);
            const results = data?.results || data || [];

            enterprisePicker.value = (results || []).map((it) => ({
                ...it,
                id: it?.id ?? it?.erp_id ?? it?.code ?? it?.key,
                name: it?.name ?? it?.label ?? String(it?.id ?? ''),
                city: it?.city ?? it?.cidade ?? null,
            })).filter(it => it?.id != null);

            enterprisePickerLoaded.value = true;
            return enterprisePicker.value;
        } catch (e) {
            enterprisePickerError.value = e.message;
            enterprisePicker.value = [];
            enterprisePickerLoaded.value = false;
            return [];
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    // ✅ filtro centralizado (sem query no template)
    function filterEnterprisePicker({ search = '', citySearch = '', selectedCities = [] } = {}) {
        const s = String(search || '').trim().toLowerCase();
        const cs = String(citySearch || '').trim().toLowerCase();
        const cities = new Set((selectedCities || []).map(x => String(x)));

        return (enterprisePicker.value || []).filter((it) => {
            const idStr = String(it?.id ?? '');
            const name = String(it?.name ?? '');
            const city = String(it?.city ?? '');

            const okSearch =
                !s ||
                name.toLowerCase().includes(s) ||
                idStr.toLowerCase().includes(s);

            const okCitySearch =
                !cs ||
                city.toLowerCase().includes(cs);

            const okCitySelected =
                !cities.size ||
                (it?.city && cities.has(String(it.city)));

            return okSearch && okCitySearch && okCitySelected;
        });
    }

    return {
        list, allActive, detail, logs, error,

        // ✅ picker
        enterprisePicker,
        enterprisePickerCities,
        enterprisePickerError,
        fetchEnterprisePicker,
        filterEnterprisePicker,

        fetchList, fetchAllActive,
        createProjection, cloneProjection,
        fetchDetail, saveLines, saveDefaults,
        updateMeta, fetchLogs
    };
});
