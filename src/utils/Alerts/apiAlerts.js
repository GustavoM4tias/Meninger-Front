// utils/Alerts/apiAlerts.js
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

export const listAlerts = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/alerts${qs ? `?${qs}` : ''}`, { headers: headers() }).then(handle);
};
export const getAlert = (id) =>
    fetch(`${API_URL}/alerts/${id}`, { headers: headers() }).then(handle);
export const updateAlert = (id, patch) =>
    fetch(`${API_URL}/alerts/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(patch) }).then(handle);
export const deleteAlert = (id) =>
    fetch(`${API_URL}/alerts/${id}`, { method: 'DELETE', headers: headers() }).then(handle);
export const fireAlert = (id) =>
    fetch(`${API_URL}/alerts/${id}/fire`, { method: 'POST', headers: headers() }).then(handle);
export const fetchLogs = (id) =>
    fetch(`${API_URL}/alerts/${id}/logs`, { headers: headers() }).then(handle);

// ─── Compartilhamento ──────────────────────────────────────────────────────────
export const shareAlert = (id, payload) =>
    fetch(`${API_URL}/alerts/${id}/share`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(handle);
export const fetchIncomingShares = () =>
    fetch(`${API_URL}/alerts/shares/incoming`, { headers: headers() }).then(handle);
export const respondShare = (shareId, action) =>
    fetch(`${API_URL}/alerts/shares/${shareId}/respond`, { method: 'POST', headers: headers(), body: JSON.stringify({ action }) }).then(handle);
export const fetchShareableUsers = () =>
    fetch(`${API_URL}/alerts/shareable-users`, { headers: headers() }).then(handle);

// ─── Painel admin ───────────────────────────────────────────────────────────────
export const fetchAdminStats = () =>
    fetch(`${API_URL}/alerts/admin/stats`, { headers: headers() }).then(handle);
