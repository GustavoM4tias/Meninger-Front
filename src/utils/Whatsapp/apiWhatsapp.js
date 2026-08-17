// utils/Whatsapp/apiWhatsapp.js
import API_URL from '@/config/apiUrl';

const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const handle = async (resp) => {
    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} ${resp.statusText} ${text}`);
    }
    return resp.json();
};

// Monta querystring ignorando valores vazios/undefined/null (URLSearchParams converteria em "undefined")
const qs = (params = {}) => {
    const out = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') continue;
        out.set(k, String(v));
    }
    const s = out.toString();
    return s ? `?${s}` : '';
};

// ── Config (admin) ───────────────────────────────────────────────────────
export const getConfig    = () => fetch(`${API_URL}/whatsapp/config`,      { headers: headers() }).then(handle);
export const updateConfig = (patch) => fetch(`${API_URL}/whatsapp/config`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(patch),
}).then(handle);
export const healthCheck  = () => fetch(`${API_URL}/whatsapp/config/health`, {
    method: 'POST', headers: headers(),
}).then(handle);
export const syncTemplates = () => fetch(`${API_URL}/whatsapp/config/sync-templates`, {
    method: 'POST', headers: headers(),
}).then(handle);
export const testSend = (payload) => fetch(`${API_URL}/whatsapp/config/test-send`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
}).then(handle);
export const registerPhone = (pin) => fetch(`${API_URL}/whatsapp/config/register-phone`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ pin }),
}).then(handle);

// Setup Wizard — descobre Business → WABA → Phone a partir de um access_token
export const discoverFromToken = (payload) => fetch(`${API_URL}/whatsapp/config/discover`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
}).then(handle);
export const applyDiscovered = (payload) => fetch(`${API_URL}/whatsapp/config/apply-discovered`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
}).then(handle);

// ── Templates (admin) ────────────────────────────────────────────────────
export const listTemplates = (params = {}) =>
    fetch(`${API_URL}/whatsapp/templates${qs(params)}`, { headers: headers() }).then(handle);
export const getTemplate = (id) =>
    fetch(`${API_URL}/whatsapp/templates/${id}`, { headers: headers() }).then(handle);
export const createTemplate = (payload) => fetch(`${API_URL}/whatsapp/templates`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
}).then(handle);
// force=true derruba a trava de "template em uso por fluxo crítico" (409).
export const deleteTemplate = (name, { force = false } = {}) =>
    fetch(`${API_URL}/whatsapp/templates/${encodeURIComponent(name)}${force ? '?force=true' : ''}`, {
        method: 'DELETE', headers: headers(),
    }).then(handle);

// ── Mensagens / log (admin) ──────────────────────────────────────────────
export const listMessages = (params = {}) =>
    fetch(`${API_URL}/whatsapp/messages${qs(params)}`, { headers: headers() }).then(handle);
export const fetchStats = (days = 30) =>
    fetch(`${API_URL}/whatsapp/messages/stats?days=${days}`, { headers: headers() }).then(handle);

// ── Info pública do sistema (usuário autenticado) ────────────────────────
export const getSystemInfo = () => fetch(`${API_URL}/whatsapp/info`, { headers: headers() }).then(handle);

// ── Cobertura do canal (admin) ───────────────────────────────────────────
// Não há opt-in: quem está no Office recebe. O que importa é quem está sem
// telefone no perfil e por isso fica de fora.
export const getCoverage = () => fetch(`${API_URL}/whatsapp/coverage`, { headers: headers() }).then(handle);
