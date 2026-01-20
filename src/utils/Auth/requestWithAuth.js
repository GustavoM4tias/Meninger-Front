import API_URL from '@/config/apiUrl';

function getToken() {
    return localStorage.getItem('token');
}

async function safeReadJson(res) {
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) return res.json().catch(() => ({}));
    return null;
}

async function safeReadText(res) {
    return res.text().catch(() => '');
}

export async function requestWithAuth(path, options = {}) {
    const token = getToken();

    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');

    if (token) headers.set('Authorization', `Bearer ${token}`);

    const isFormData = options.body instanceof FormData;
    const method = (options.method || 'GET').toUpperCase();

    if (!isFormData && method !== 'GET' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const url = path.startsWith('http') ? path : `${API_URL}${path}`;

    const res = await fetch(url, { ...options, method, headers });

    const json = await safeReadJson(res);
    if (!res.ok) {
        const text = json ? '' : await safeReadText(res);

        const msg =
            json?.error ||
            json?.message ||
            (text ? text.slice(0, 300) : '') ||
            `HTTP ${res.status}`;

        const err = new Error(msg);
        err.status = res.status;
        err.payload = json || text;
        throw err;
    }

    // se não for json, devolve texto
    if (!json) return await safeReadText(res);
    return json;
}
