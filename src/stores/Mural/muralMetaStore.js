// stores/Mural/muralMetaStore.js
//
// Listas auxiliares para o seletor de público-alvo do Mural (cargos, departamentos,
// cidades). Reaproveita os endpoints admin gerais /api/admin/*. Os usuários vêm do
// authStore (activeUsers). Carregado sob demanda e cacheado (ensureLoaded).

import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';

function authHeaders() {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' };
}

async function adminFetch(path) {
    const resp = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.message || data?.error || `Erro (${resp.status}).`);
    return data;
}

// responseHandler.success → costuma vir como { success, data } ou array direto.
function asArray(json) {
    if (Array.isArray(json)) return json;
    return json?.data || json?.results || [];
}

export const useMuralMetaStore = defineStore('muralMeta', () => {
    const positions = ref([]);    // [{ code, name }]
    const departments = ref([]);  // [{ id, name }]
    const cities = ref([]);       // [{ id, name }]
    const loaded = ref(false);
    const loading = ref(false);
    const error = ref(null);

    async function ensureLoaded(force = false) {
        if ((loaded.value && !force) || loading.value) return;
        loading.value = true;
        error.value = null;
        try {
            const [pos, deps, cts] = await Promise.all([
                adminFetch('/admin/positions').catch(() => []),
                adminFetch('/admin/departments').catch(() => []),
                adminFetch('/admin/user-cities').catch(() => []),
            ]);
            positions.value = asArray(pos).map((p) => ({ code: p.code, name: p.name })).filter((p) => p.code);
            departments.value = asArray(deps).map((d) => ({ id: d.id, name: d.name }));
            cities.value = asArray(cts).map((c) => ({ id: c.id, name: c.name }));
            loaded.value = true;
        } catch (e) {
            error.value = e.message;
        } finally {
            loading.value = false;
        }
    }

    return { positions, departments, cities, loaded, loading, error, ensureLoaded };
});
