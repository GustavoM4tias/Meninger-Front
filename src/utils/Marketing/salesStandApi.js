// utils/Marketing/salesStandApi.js
// Cliente do módulo Stand de Vendas.
import API_URL from '@/config/apiUrl';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function req(path, opts = {}) {
    const resp = await fetch(`${API_URL}/sales-stands${path}`, { headers: authHeaders(), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(data?.message || data?.error || `Erro na requisição (${resp.status}).`);
        err.code = data?.code || null; // ex.: MODEL_IN_USE, ALREADY_DEFINED
        err.status = resp.status;
        throw err;
    }
    return data;
}
const body = (b) => ({ body: JSON.stringify(b) });

export default {
    costCenters: () => req('/cost-centers'),

    // Stands modelo (categorias)
    models: () => req('/models'),
    createModel: (payload) => req('/models', { method: 'POST', ...body(payload) }),
    updateModel: (id, payload) => req(`/models/${id}`, { method: 'PATCH', ...body(payload) }),
    deleteModel: (id) => req(`/models/${id}`, { method: 'DELETE' }),

    // Stands reais
    list: () => req(''),
    create: (payload) => req('', { method: 'POST', ...body(payload) }),
    update: (id, payload) => req(`/${id}`, { method: 'PATCH', ...body(payload) }),
    remove: (id) => req(`/${id}`, { method: 'DELETE' }),
    spend: (id) => req(`/${id}/spend`),
    define: (id, payload = {}) => req(`/${id}/define`, { method: 'POST', ...body(payload) }),
    undefine: (id) => req(`/${id}/undefine`, { method: 'POST' }),
};
