// utils/Config/apiNotification.js
import API_URL from '@/config/apiUrl';

const authHeaders = () => ({
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

export const fetchNotifications = async ({ unread = false, limit = 30, offset = 0 } = {}) => {
    const qs = new URLSearchParams();
    if (unread) qs.set('unread', '1');
    qs.set('limit', String(limit));
    qs.set('offset', String(offset));
    const resp = await fetch(`${API_URL}/notifications?${qs.toString()}`, { headers: authHeaders() });
    return handle(resp);
};

export const fetchUnreadCount = async () => {
    const resp = await fetch(`${API_URL}/notifications/unread-count`, { headers: authHeaders() });
    return handle(resp);
};

export const markNotificationRead = async (id) => {
    const resp = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handle(resp);
};

export const markAllNotificationsRead = async () => {
    const resp = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        headers: authHeaders(),
    });
    return handle(resp);
};

export const deleteNotification = async (id) => {
    const resp = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    return handle(resp);
};

export const fetchNotificationPreferences = async () => {
    const resp = await fetch(`${API_URL}/notifications/preferences`, { headers: authHeaders() });
    return handle(resp);
};

export const saveNotificationPreference = async ({ type, inapp, email, whatsapp }) => {
    const resp = await fetch(`${API_URL}/notifications/preferences`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ type, inapp, email, whatsapp }),
    });
    return handle(resp);
};
