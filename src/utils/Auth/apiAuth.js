// src/utils/apiAuth.js
import { fetchCarregamento } from '@/utils/Config/fetchCarregamento';
import API_URL from '@/config/apiUrl';

export const registerUser = async (username, password, email, position, city, birth_date) => {
  const response = await fetchCarregamento(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, email, position, city, birth_date }),
  });
  return response.json();
};

export const loginUser = async (email, password) => {
  const response = await fetchCarregamento(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  return response.json();
};

export const changePassword = async (currentPassword, newPassword, confirmNewPassword) => {
  const response = await fetchCarregamento(`${API_URL}/auth/user/password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }

  return response.json();
};

export const requestPasswordReset = async (email) => {
  const response = await fetchCarregamento(`${API_URL}/auth/forgot-password/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return response.json();
};

export const resetPassword = async (email, code, password, confirmPassword) => {
  const response = await fetchCarregamento(`${API_URL}/auth/forgot-password/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code, password, confirmPassword }),
  });

  return response.json();
};

export const getUserInfo = async () => {
  const response = await fetch(`${API_URL}/auth/user`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  return response.json();
};

export const getUserById = async (id) => {
  const response = await fetchCarregamento(`${API_URL}/auth/user/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  return response.json();
};

export const updateMeInfo = async (username, email, position, city, birth_date, status, face_enabled, phone = null) => {
  const response = await fetchCarregamento(`${API_URL}/auth/user`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, position, city, birth_date, status, face_enabled, phone }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  console.log('Valor passado na store', birth_date)

  return response.json();
};
// src/utils/apiAuth.js
export const updateUserInfo = async (id, username, email, position, manager_id, city, birth_date, status, role) => {
  const response = await fetchCarregamento(`${API_URL}/auth/users`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, username, email, position, role, manager_id, city, birth_date, status }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  return response.json();
};

// ── Cadastro de primeiro acesso (usuário pendente de aprovação) ──────────────

export const getSignupOptions = async () => {
  const response = await fetch(`${API_URL}/auth/signup-options`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || 'Erro ao carregar opções de cadastro');
  }
  return data.data || data;
};

export const completeSignup = async (payload) => {
  const response = await fetchCarregamento(`${API_URL}/auth/complete-signup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || 'Erro ao concluir o cadastro');
  }
  return data;
};

// Solicitação pública de acesso (tela de login, sem Microsoft)
export const requestSignup = async (payload) => {
  const response = await fetchCarregamento(`${API_URL}/auth/signup-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || 'Erro ao enviar o cadastro');
  }
  return data;
};

export const rejectUser = async (id, reason = '') => {
  const response = await fetchCarregamento(`${API_URL}/auth/users/${id}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || 'Erro ao reprovar cadastro');
  }
  return data;
};

export const activateUser = async (id) => {
  const response = await fetchCarregamento(`${API_URL}/auth/users/${id}/activate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || 'Erro ao ativar usuário');
  }
  return data;
};

export const adminResetUserPassword = async (id) => {
  const response = await fetchCarregamento(`${API_URL}/auth/users/${id}/reset-password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }

  return response.json();
};

export const getAllUsers = async () => {
  const response = await fetch(`${API_URL}/auth/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  return response.json();
};

export const fetchBanners = async () => {
  const response = await fetch(`${API_URL}/cv/banners`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  return response.json();
};