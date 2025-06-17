// src/utils/apiAuth.js
import { fetchCarregamento } from '../Config/fetchCarregamento';
import API_URL from '../../config/apiUrl';

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

export const updateMeInfo = async (username, email, position, city, birth_date, status) => {
  const response = await fetchCarregamento(`${API_URL}/auth/user`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, position, city, birth_date, status }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }

  return response.json();
};

export const updateUserInfo = async (id, username, email, position, manager_id, city, birth_date, status) => {

  const response = await fetchCarregamento(`${API_URL}/auth/users`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, username, email, position, manager_id, city, birth_date, status }),
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