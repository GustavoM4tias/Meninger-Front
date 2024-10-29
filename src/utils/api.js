// src/utils/api.js
import { fetchCarregamento } from './fetchCarregamento';
import API_URL from '../config/apiConfig'

export const registerUser = async (username, password, email) => {
  const response = await fetchCarregamento(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, email }),
  });
  return response.json();
};

export const loginUser = async (username, password) => {
  const response = await fetchCarregamento(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  // Verifica se a resposta da API foi bem-sucedida
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Erro ao fazer login');
  }
  return response.json();
};

// src/utils/api.js
export const getUserInfo = async () => {
  const response = await fetchCarregamento(`${API_URL}/user`, { 
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json', 
    },
  });

  // Verifica se a resposta da API foi bem-sucedida
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Erro ao obter informações do usuário');
  }
  return response.json();
};
