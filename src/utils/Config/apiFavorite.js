// utils/apiFavorite.js
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const addFavorite = (router, section) =>
    requestWithAuth(`${API_URL}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ router, section }),
    });

export const removeFavorite = (router, section) =>
    requestWithAuth(
        `${API_URL}/favorite/${encodeURIComponent(router)}/${encodeURIComponent(section)}`,
        { method: 'DELETE' },
    );

export const getFavorites = async () => {
    const result = await requestWithAuth(`${API_URL}/favorite`);
    return Array.isArray(result) ? result : [];
};
