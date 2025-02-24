// src/utils/apiAuth.js
import { fetchCarregamento } from '../Config/fetchCarregamento';
import AUTH_URL from '../../config/apiAuthUrl';

export const registerUser = async (username, password, email, position, city, birth_date) => {
  const response = await fetchCarregamento(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, email, position, city, birth_date}),
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

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }
  return response.json();
};

export const getUserInfo = async () => {
  const response = await fetchCarregamento(`${AUTH_URL}/user`, {
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
  const response = await fetchCarregamento(`${AUTH_URL}/user/${id}`, {
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
  const response = await fetchCarregamento(`${AUTH_URL}/user`, {
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

export const updateUserInfo = async (id, username, email, position, manager, city, birth_date, status) => {

  const response = await fetchCarregamento(`${AUTH_URL}/users`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`, 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({id, username, email, position, manager, city, birth_date, status}),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message);
  }

  return response.json();
};

export const getAllUsers = async () => {
  const response = await fetchCarregamento(`${AUTH_URL}/users`, {
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
