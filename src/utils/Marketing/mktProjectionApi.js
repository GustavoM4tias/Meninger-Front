// utils/Marketing/mktProjectionApi.js
// Cliente da tela Projeção de Investimentos (Marketing). Os números vêm da
// planilha do SharePoint lida pelo backend.
import API_URL from '@/config/apiUrl';

function authHeaders() {
    const token = localStorage.getItem('token');
    return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' };
}

async function req(path, opts = {}) {
    const resp = await fetch(`${API_URL}/marketing/projecao-investimentos${path}`, { headers: authHeaders(), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(data?.message || data?.error || `Erro na requisição (${resp.status}).`);
        err.status = resp.status;
        err.permissao = data?.permissao || null;
        throw err;
    }
    return data;
}
const body = (b) => ({ body: JSON.stringify(b) });

export default {
    data: ({ force = false } = {}) => req(force ? '/data?force=1' : '/data'),
    refresh: () => req('/refresh', { method: 'POST' }),
    settings: () => req('/settings'),
    saveSettings: (payload) => req('/settings', { method: 'PATCH', ...body(payload) }),
};
