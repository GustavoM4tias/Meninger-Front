const API_URL = 'http://localhost:5000/api/auth'; // Altere para a URL da sua API em produção

import { fetchCarregamento } from './fetchCarregamento';

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
