// utils/Marketing/salesStandApi.js
// Cliente do módulo Stand de Vendas.
import API_URL from '@/config/apiUrl';

function authHeaders(json = true) {
    const token = localStorage.getItem('token');
    const h = { Authorization: token ? `Bearer ${token}` : '' };
    // Upload de foto vai como FormData: o browser é quem monta o Content-Type
    // (com o boundary). Mandar 'application/json' aqui quebra o multer.
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

async function req(path, opts = {}, { json = true } = {}) {
    const resp = await fetch(`${API_URL}/sales-stands${path}`, { headers: authHeaders(json), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(data?.message || data?.error || `Erro na requisição (${resp.status}).`);
        err.code = data?.code || null; // ex.: MODEL_IN_USE, ALREADY_DEFINED, OUT_OF_SCOPE
        err.status = resp.status;
        throw err;
    }
    return data;
}
const body = (b) => ({ body: JSON.stringify(b) });

export default {
    costCenters: () => req('/cost-centers'),
    contas: () => req('/contas'),

    // Configuração do módulo (o que conta como gasto de stand)
    settings: () => req('/settings'),
    // Conferência do departamento (o que falta o administrativo acertar)
    conferencia: () => req('/conferencia'),
    // Bate na API do Sienge, ao vivo, para saber o que ja foi corrigido
    revalidar: (payload = {}) => req('/conferencia/revalidar', { method: 'POST', ...body(payload) }),
    saveSettings: (payload) => req('/settings', { method: 'PATCH', ...body(payload) }),

    // Stands modelo (categorias)
    models: () => req('/models'),
    createModel: (payload) => req('/models', { method: 'POST', ...body(payload) }),
    updateModel: (id, payload) => req(`/models/${id}`, { method: 'PATCH', ...body(payload) }),
    deleteModel: (id) => req(`/models/${id}`, { method: 'DELETE' }),

    // Categorias de gasto (construção × recorrência por conta do Sienge)
    categories: () => req('/categories'),
    createCategory: (payload) => req('/categories', { method: 'POST', ...body(payload) }),
    updateCategory: (id, payload) => req(`/categories/${id}`, { method: 'PATCH', ...body(payload) }),
    deleteCategory: (id) => req(`/categories/${id}`, { method: 'DELETE' }),

    // Stands reais
    list: () => req(''),
    get: (id) => req(`/${id}`),
    create: (payload) => req('', { method: 'POST', ...body(payload) }),
    update: (id, payload) => req(`/${id}`, { method: 'PATCH', ...body(payload) }),
    remove: (id) => req(`/${id}`, { method: 'DELETE' }),
    spend: (id) => req(`/${id}/spend`),
    define: (id) => req(`/${id}/define`, { method: 'POST', ...body({}) }),
    undefine: (id) => req(`/${id}/undefine`, { method: 'POST' }),

    // Classificação dos lançamentos e itens do stand
    classify: (id, payload) => req(`/${id}/expenses/classify`, { method: 'POST', ...body(payload) }),
    saveItems: (id, items) => req(`/${id}/items`, { method: 'PUT', ...body({ items }) }),

    // Fotos
    images: (id) => req(`/${id}/images`),
    addImage: (id, file, caption = '') => {
        const form = new FormData();
        form.append('file', file);
        if (caption) form.append('caption', caption);
        return req(`/${id}/images`, { method: 'POST', body: form }, { json: false });
    },
    updateImage: (id, imageId, payload) => req(`/${id}/images/${imageId}`, { method: 'PATCH', ...body(payload) }),
    deleteImage: (id, imageId) => req(`/${id}/images/${imageId}`, { method: 'DELETE' }),
};
