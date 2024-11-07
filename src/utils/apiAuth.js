// src/utils/apiAuth.js
import { fetchCarregamento } from './fetchCarregamento';
import AUTH_URL from '../config/apiAuthUrl';

export const registerUser = async (username, password, email) => {
  const response = await fetchCarregamento(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, email }),
  });
  return response.json();
};

export const loginUser = async (email, password) => {
  const response = await fetchCarregamento(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
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
  const response = await fetchCarregamento(`${AUTH_URL}/user`, { 
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
