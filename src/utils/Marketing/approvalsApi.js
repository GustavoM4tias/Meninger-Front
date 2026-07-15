// utils/Marketing/approvalsApi.js
// Cliente do módulo Aprovações de Marketing (mesmo padrão do Checklist/Mural).
import API_URL from '@/config/apiUrl';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function req(path, opts = {}) {
    const resp = await fetch(`${API_URL}/marketing-approvals${path}`, { headers: authHeaders(), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(data?.message || data?.error || `Erro na requisição (${resp.status}).`);
        err.code = data?.code || null; // ex.: ALREADY_DECIDED
        err.status = resp.status;
        throw err;
    }
    return data;
}
const body = (b) => ({ body: JSON.stringify(b) });

export default {
    // Metadados
    me: () => req('/me'),
    types: () => req('/types'),
    profiles: () => req('/profiles'),
    costCenters: () => req('/cost-centers'),

    // Tickets
    list: (query = '') => req(`${query}`),
    get: (id) => req(`/${id}`),
    create: (payload) => req('/', { method: 'POST', ...body(payload) }),
    decide: (id, payload) => req(`/${id}/decision`, { method: 'POST', ...body(payload) }),
    cancel: (id) => req(`/${id}/cancel`, { method: 'POST' }),
    addAttachment: (id, payload) => req(`/${id}/attachments`, { method: 'POST', ...body(payload) }),
    removeAttachment: (id) => req(`/attachments/${id}`, { method: 'DELETE' }),
    // Documento de autorização assinado fora do sistema → aprova a solicitação com
    // o anexo como comprovante. payload = anexo já upado ({ url, file_name, ... }).
    registerSignedDocument: (id, payload) => req(`/${id}/signed-document`, { method: 'POST', ...body(payload) }),

    // PDF de autorização (blob autenticado — pendente = versão p/ assinatura presencial)
    pdf: async (id) => {
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_URL}/marketing-approvals/${id}/pdf`, {
            headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            throw new Error(data?.message || 'Falha ao gerar o PDF.');
        }
        return resp.blob();
    },

    // Administração
    users: () => req('/users'),
    settings: () => req('/settings'),
    saveSettings: (payload) => req('/settings', { method: 'PUT', ...body(payload) }),
    createProfile: (payload) => req('/profiles', { method: 'POST', ...body(payload) }),
    updateProfile: (id, payload) => req(`/profiles/${id}`, { method: 'PATCH', ...body(payload) }),

    // Upload de anexo (multipart no endpoint central de uploads)
    upload: async (file, referenceId = '') => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('context', 'marketing_approval_attachment');
        if (referenceId) fd.append('referenceId', referenceId);
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_URL}/uploads`, {
            method: 'POST',
            headers: { Authorization: token ? `Bearer ${token}` : '' },
            body: fd,
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.message || 'Falha no upload.');
        return data; // { url, path, fileName, mimeType, size }
    },
};
