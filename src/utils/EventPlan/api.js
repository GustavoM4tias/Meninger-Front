// utils/EventPlan/api.js
// Cliente do módulo Plano de Eventos (mesmo padrão fetch + API_URL do Checklist).
import API_URL from '@/config/apiUrl';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function req(path, opts = {}) {
    const resp = await fetch(`${API_URL}/event-plans${path}`, { headers: authHeaders(), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(data?.error || data?.message || `Erro na requisição (${resp.status}).`);
        err.status = resp.status;
        // 422 traz a lista de pendências item a item (ex.: item obrigatório
        // reprovado sem escolha). A tela usa isso para apontar onde corrigir.
        err.details = data?.details || null;
        // Corpo cru: o 409 de plano duplicado devolve o id do plano existente,
        // e a tela leva o usuário direto para ele em vez de só reclamar.
        err.payload = data || null;
        throw err;
    }
    return data;
}
const body = (b) => ({ body: JSON.stringify(b) });

export default {
    permissions: () => req('/permissions'),

    // Planos
    list: (query = '') => req(query),
    // Consolidado do mês: agenda unificada + lista de compras agrupada
    consolidated: (month) => req(`/consolidated?reference_month=${encodeURIComponent(month)}`),
    // Itens previstos de um evento da agenda (consumido pela tela de Eventos)
    byAgendaEvent: (eventId) => req(`/by-event/${eventId}`),
    get: (id) => req(`/${id}`),
    create: (payload) => req('/', { method: 'POST', ...body(payload) }),

    // Eventos
    addEvent: (planId, payload) => req(`/${planId}/events`, { method: 'POST', ...body(payload) }),
    updateEvent: (planId, eventId, payload) => req(`/${planId}/events/${eventId}`, { method: 'PATCH', ...body(payload) }),
    removeEvent: (planId, eventId) => req(`/${planId}/events/${eventId}`, { method: 'DELETE' }),

    // Itens
    addItem: (planId, eventId, payload) => req(`/${planId}/events/${eventId}/items`, { method: 'POST', ...body(payload) }),
    updateItem: (planId, itemId, payload) => req(`/${planId}/items/${itemId}`, { method: 'PATCH', ...body(payload) }),
    removeItem: (planId, itemId) => req(`/${planId}/items/${itemId}`, { method: 'DELETE' }),

    // Fluxo
    submit: (planId) => req(`/${planId}/submit`, { method: 'POST' }),
    decide: (planId, payload) => req(`/${planId}/decide`, { method: 'POST', ...body(payload) }),
    close: (planId, payload) => req(`/${planId}/close`, { method: 'POST', ...body(payload) }),

    // Orçamento do item (multipart no endpoint central de uploads)
    uploadQuote: async (file, planId = '') => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('context', 'event_plan_quote');
        if (planId) fd.append('referenceId', String(planId));
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_URL}/uploads`, {
            method: 'POST',
            headers: { Authorization: token ? `Bearer ${token}` : '' },
            body: fd,
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.message || 'Falha no upload do orçamento.');
        return data; // { url, path, fileName, mimeType, size }
    },

    // Configuração (admin)
    users: () => req('/users'),
    settings: () => req('/settings'),
    saveSettings: (payload) => req('/settings', { method: 'PUT', ...body(payload) }),
    saveAuthProfile: (payload) => req('/auth-profiles', { method: 'POST', ...body(payload) }),
    removeAuthProfile: (id) => req(`/auth-profiles/${id}`, { method: 'DELETE' }),
};
