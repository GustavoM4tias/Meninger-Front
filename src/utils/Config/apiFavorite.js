// utils/apiFavorite.js
import EVENT_URL from '../../config/apiEventUrl'; // Define a URL base da sua API

export const addFavorite = async (router, section) => {
    try {
        await fetch(`${EVENT_URL}/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Acesso com o token JWT
            },
            body: JSON.stringify({ router, section })
        });
    } catch (error) {
        console.error('Erro ao adicionar favorito', error);
    }
};

export const removeFavorite = async (router, section) => {
    try {
        const response = await fetch(`${EVENT_URL}/favorite/${encodeURIComponent(router)}/${encodeURIComponent(section)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            }
        });
        if (response.ok) {
            console.log("Favorito removido");
        }
    } catch (error) {
        console.error('Erro ao remover favorito', error);
    }
};

export const getFavorites = async () => {
    try {
        const response = await fetch(`${EVENT_URL}/favorite`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            }
        });
        const favorites = await response.json();
        return favorites;
    } catch (error) {
        console.error('Erro ao obter favoritos', error);
    }
};
