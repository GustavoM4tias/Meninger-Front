// src/utils/Auth/apiFace.js
import API_URL from '@/config/apiUrl';

export const enrollFaceApi = async (embeddings) => {
    const r = await fetch(`${API_URL}/auth/face/enroll`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeddings }),
    });
    return r.json();
};

export const identifyFaceApi = async (embedding) => {
  const r = await fetch(`${API_URL}/auth/face/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embedding }),
  });
  return r.json();
};