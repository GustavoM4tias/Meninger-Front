// src/utils/apiBuilding.js
import { fetchCarregamento } from '../Config/fetchCarregamento';
import EVENT_URL from '../../config/apiEventUrl'; // Define a URL base da sua API

export const getAddress = async (cep) => {
    const response = await fetchCarregamento(`https://viacep.com.br/ws/${cep}/json/`, {
        method: 'GET'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
    }
    return response.json();
};

// Função para obter o clima de uma cidade
export const getWeatherByCity = async (city) => {
    try {
        // 1. Requisição para OpenStreetMap para obter a latitude e longitude
        const addressResponse = await fetch(`https://nominatim.openstreetmap.org/search?city=${city}&format=json`, {
            method: 'GET',
        });

        if (!addressResponse.ok) {
            const errorData = await addressResponse.json();
            throw new Error(`Erro ao buscar as coordenadas: ${errorData.message}`);
        }

        const addressData = await addressResponse.json();
        if (!addressData.length) {
            throw new Error('Cidade não encontrada.');
        }

        // 2. Pegar latitude e longitude
        const { lat, lon } = addressData[0];

        // 3. Requisição para Open-Meteo para obter o clima com a latitude e longitude
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&current_weather=true`, {
            method: 'GET',
        });

        if (!weatherResponse.ok) {
            const errorData = await weatherResponse.json();
            throw new Error(`Erro ao buscar o clima: ${errorData.message}`);
        }

        // 4. Pega as informações do clima
        const weatherData = await weatherResponse.json();
        // console.log('Dados do clima:', weatherData.current_weather);

        return weatherData.current_weather;
    } catch (error) {
        console.error('Erro:', error.message);
    }
};

export const getBuildings = async () => {
    const response = await fetchCarregamento(`${EVENT_URL}/buildings`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`, // Verifique se o token está sendo recuperado corretamente
            'Content-Type': 'application/json',
        },
    });

    // Verifica se a resposta da API foi bem-sucedida
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao obter empreendimentos');
    }
    return response.json();
};

export const addBuilding = async (building) => {
    const response = await fetchCarregamento(`${EVENT_URL}/buildings/add`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`, // Verifique se o token está sendo recuperado corretamente
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(building),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar empreendimento');
    }
    return response.json();
};

export const updateBuilding = async (building) => {
    // console.log(`id passado é: ${building.id}`)
    const response = await fetchCarregamento(`${EVENT_URL}/buildings/edit/${building.id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`, // Verifique se o token está sendo recuperado corretamente
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(building),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar empreendimento');
    }
    return response.json();
};

export const deleteBuilding = async (buildingId) => {
    try {
        const response = await fetchCarregamento(`${EVENT_URL}/buildings/delete/${buildingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Verifique se o token está sendo recuperado corretamente
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Falha na requisição');
        }
    } catch (error) {
        console.error('Erro ao excluir empreendimento:', error);
        throw error; // Re-lança o erro para que possa ser tratado onde for chamado
    }
};
