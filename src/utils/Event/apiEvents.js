// src/utils/apiEvents.js
import { fetchCarregamento } from '../Config/fetchCarregamento';
import API_URL from '../../config/apiUrl'; // Define a URL base da sua API

import { useToast } from 'vue-toastification';

const toast = useToast();

export const getEvents = async () => {
    const response = await fetch(`${API_URL}/events`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`, // Verifique se o token está sendo recuperado corretamente
            'Content-Type': 'application/json',
        },
    });

    // Verifica se a resposta da API foi bem-sucedida
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao obter eventos');
    }
    return response.json();
};

export const addEvent = async (event) => {
    const response = await fetchCarregamento(`${API_URL}/events/add`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`, // Verifique se o token está sendo recuperado corretamente
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar evento');
    }
    return response.json();
};

export const updateEvent = async (event) => {
    // console.log(`id passado é: ${event.id}`)
    const response = await fetchCarregamento(`${API_URL}/events/edit/${event.id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`, // Verifique se o token está sendo recuperado corretamente
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar evento');
    }
    return response.json();
};

export const deleteEvent = async (eventId) => {
    try {
        const response = await fetchCarregamento(`${API_URL}/events/delete/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Verifique se o token está sendo recuperado corretamente
                'Content-Type': 'application/json'
            }
        },
        toast.success('Evento excluido com sucesso!'));
        if (!response.ok) {
            throw new Error('Falha na requisição');
        }
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        toast.error('Erro ao excluir evento.')
        throw error; // Re-lança o erro para que possa ser tratado onde for chamado
    }
};
