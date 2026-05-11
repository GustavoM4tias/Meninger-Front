// utils/apiFavorite.js
import API_URL from '@/config/apiUrl';

function authHeaders(includeJson = false) {
    const h = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    if (includeJson) h['Content-Type'] = 'application/json';
    return h;
}

// Lança erro com mensagem útil quando o backend retorna 4xx/5xx,
// para que o store/componente possa exibir toast e reverter UI otimista.
async function parseOrThrow(response, action) {
    if (response.ok) return response.status === 204 ? null : response.json().catch(() => null);
    let detail = '';
    try {
        const body = await response.json();
        detail = body?.detail || body?.message || '';
    } catch { /* ignore */ }
    throw new Error(`Falha ao ${action} (${response.status}${detail ? ': ' + detail : ''})`);
}

export const addFavorite = async (router, section) => {
    const response = await fetch(`${API_URL}/favorite`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ router, section }),
    });
    return parseOrThrow(response, 'adicionar favorito');
};

export const removeFavorite = async (router, section) => {
    const response = await fetch(
        `${API_URL}/favorite/${encodeURIComponent(router)}/${encodeURIComponent(section)}`,
        { method: 'DELETE', headers: authHeaders() },
    );
    return parseOrThrow(response, 'remover favorito');
};

export const getFavorites = async () => {
    const response = await fetch(`${API_URL}/favorite`, {
        method: 'GET',
        headers: authHeaders(),
    });
    const data = await parseOrThrow(response, 'obter favoritos');
    return Array.isArray(data) ? data : [];
};
