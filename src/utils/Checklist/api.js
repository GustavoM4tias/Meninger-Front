// utils/Checklist/api.js
// Cliente do módulo Checklist (segue o padrão fetch + API_URL + token do Mural).
import API_URL from '@/config/apiUrl';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function req(path, opts = {}) {
    const resp = await fetch(`${API_URL}/checklists${path}`, { headers: authHeaders(), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(data?.message || data?.error || `Erro na requisição (${resp.status}).`);
        err.code = data?.code || null; // ex.: APPROVAL_REQUIRED, APPROVAL_LOCKED
        err.status = resp.status;
        throw err;
    }
    return data;
}
const body = (b) => ({ body: JSON.stringify(b) });

export default {
    // Checklists
    list: (query = '') => req(`${query}`),
    dashboard: () => req('/dashboard'),
    myTasks: () => req('/my-tasks'),
    get: (id) => req(`/${id}`),
    create: (payload) => req('/', { method: 'POST', ...body(payload) }),
    update: (id, payload) => req(`/${id}`, { method: 'PATCH', ...body(payload) }),
    archive: (id) => req(`/${id}/archive`, { method: 'POST' }),
    remove: (id) => req(`/${id}`, { method: 'DELETE' }),

    // Seções
    addSection: (checklistId, payload) => req(`/${checklistId}/sections`, { method: 'POST', ...body(payload) }),
    updateSection: (id, payload) => req(`/sections/${id}`, { method: 'PATCH', ...body(payload) }),
    removeSection: (id) => req(`/sections/${id}`, { method: 'DELETE' }),

    // Catálogo de status
    statuses: (templateId) => req(`/statuses${templateId ? `?templateId=${templateId}` : ''}`),
    createStatus: (payload) => req('/statuses', { method: 'POST', ...body(payload) }),
    updateStatus: (id, payload) => req(`/statuses/${id}`, { method: 'PATCH', ...body(payload) }),
    removeStatus: (id) => req(`/statuses/${id}`, { method: 'DELETE' }),

    // Modelos
    templates: () => req('/templates'),
    templatesAll: () => req('/templates?includeInactive=true'),
    template: (id) => req(`/templates/${id}`),
    instantiate: (id, payload) => req(`/templates/${id}/instantiate`, { method: 'POST', ...body(payload) }),
    // Edição de modelos (admin)
    createTemplate: (payload) => req('/templates', { method: 'POST', ...body(payload) }),
    updateTemplate: (id, payload) => req(`/templates/${id}`, { method: 'PATCH', ...body(payload) }),
    deleteTemplate: (id) => req(`/templates/${id}`, { method: 'DELETE' }),
    saveTemplateSection: (templateId, payload) => req(`/templates/${templateId}/sections`, { method: 'POST', ...body(payload) }),
    removeTemplateSection: (id) => req(`/templates/sections/${id}`, { method: 'DELETE' }),
    saveTemplateItem: (templateId, payload) => req(`/templates/${templateId}/items`, { method: 'POST', ...body(payload) }),
    removeTemplateItem: (id) => req(`/templates/items/${id}`, { method: 'DELETE' }),

    // Clonar checklist
    clone: (id, title) => req(`/${id}/clone`, { method: 'POST', ...body({ title }) }),

    // Tarefas
    getTask: (id) => req(`/tasks/${id}`),
    createTask: (checklistId, payload) => req(`/${checklistId}/tasks`, { method: 'POST', ...body(payload) }),
    updateTask: (id, payload) => req(`/tasks/${id}`, { method: 'PATCH', ...body(payload) }),
    setTaskStatus: (id, statusId) => req(`/tasks/${id}/status`, { method: 'POST', ...body({ status_id: statusId }) }),
    reorderTasks: (items) => req('/tasks/reorder', { method: 'POST', ...body({ items }) }),
    removeTask: (id) => req(`/tasks/${id}`, { method: 'DELETE' }),
    nudgeTask: (id, message, channels) => req(`/tasks/${id}/nudge`, { method: 'POST', ...body({ message, channels }) }),

    // Comentários / anexos
    addComment: (taskId, payload) => req(`/tasks/${taskId}/comments`, { method: 'POST', ...body(typeof payload === 'string' ? { body: payload } : payload) }),
    removeComment: (id) => req(`/comments/${id}`, { method: 'DELETE' }),
    addAttachment: (taskId, payload) => req(`/tasks/${taskId}/attachments`, { method: 'POST', ...body(payload) }),
    removeAttachment: (id) => req(`/attachments/${id}`, { method: 'DELETE' }),

    // Cobrança (régua configurável — admin)
    cobrancaSettings: () => req('/cobranca/settings'),
    saveCobrancaSettings: (payload) => req('/cobranca/settings', { method: 'PUT', ...body(payload) }),
    cobrancaRules: () => req('/cobranca/rules'),
    createRule: (payload) => req('/cobranca/rules', { method: 'POST', ...body(payload) }),
    updateRule: (id, payload) => req(`/cobranca/rules/${id}`, { method: 'PATCH', ...body(payload) }),
    removeRule: (id) => req(`/cobranca/rules/${id}`, { method: 'DELETE' }),
    runCobranca: (dryRun) => req('/cobranca/run', { method: 'POST', ...body({ dryRun }) }),

    // Edição em cascata (bulk)
    bulkTasks: (ids, patch) => req('/tasks/bulk', { method: 'POST', ...body({ ids, patch }) }),

    // Régua por checklist (padrão / personalizada / desligada)
    getChecklistCobranca: (id) => req(`/${id}/cobranca`),
    saveChecklistCobranca: (id, payload) => req(`/${id}/cobranca`, { method: 'PUT', ...body(payload) }),

    // Usuários (seletor de responsável)
    users: () => req('/users'),
    // Empreendimentos do CV (seletor)
    enterprises: () => req('/enterprises'),

    // ── Autorização / aprovação ──
    authProfiles: () => req('/approval/profiles'),
    createAuthProfile: (payload) => req('/approval/profiles', { method: 'POST', ...body(payload) }),
    updateAuthProfile: (id, payload) => req(`/approval/profiles/${id}`, { method: 'PATCH', ...body(payload) }),
    removeAuthProfile: (id) => req(`/approval/profiles/${id}`, { method: 'DELETE' }),
    approvalMe: () => req('/approval/me'),
    pendingApprovals: () => req('/approval/pending'),
    submitApproval: (id) => req(`/tasks/${id}/submit-approval`, { method: 'POST' }),
    decideApproval: (id, payload) => req(`/tasks/${id}/decision`, { method: 'POST', ...body(payload) }),
    cancelApproval: (id) => req(`/tasks/${id}/cancel-approval`, { method: 'POST' }),

    // Importação de Excel (multipart — não usa o helper JSON)
    importExcel: async (file, title) => {
        const fd = new FormData();
        fd.append('file', file);
        if (title) fd.append('title', title);
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_URL}/checklists/import/excel`, {
            method: 'POST',
            headers: { Authorization: token ? `Bearer ${token}` : '' },
            body: fd,
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.message || data?.error || 'Falha ao importar.');
        return data;
    },
};
