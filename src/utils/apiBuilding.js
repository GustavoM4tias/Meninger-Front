// src/utils/apiBuilding.js
import { fetchCarregamento } from './fetchCarregamento';


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
