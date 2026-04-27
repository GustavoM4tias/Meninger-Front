import { fetchCarregamento } from '@/utils/Config/fetchCarregamento'
import API_URL from '@/config/apiUrl'

const BASE = `${API_URL}/office-chat`

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

export const getSessions = async () => {
  const response = await fetch(`${BASE}/sessions`, {
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Erro ao listar sessões.')
  return response.json()
}

export const getSessionMessages = async (sessionId) => {
  const response = await fetch(`${BASE}/sessions/${sessionId}/messages`, {
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Erro ao carregar mensagens.')
  return response.json()
}

export const renameSession = async (sessionId, title) => {
  const response = await fetch(`${BASE}/sessions/${sessionId}/title`, {
    method: 'PATCH',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!response.ok) throw new Error('Erro ao renomear sessão.')
  return response.json()
}

export const toggleFavoriteSession = async (sessionId) => {
  const response = await fetchCarregamento(`${BASE}/sessions/${sessionId}/favorite`, {
    method: 'PATCH',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  })
  return response.json()
}

export const removeSession = async (sessionId) => {
  await fetchCarregamento(`${BASE}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  })
}

export const getStorageUsage = async () => {
  const response = await fetch(`${BASE}/usage`, {
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  })
  if (!response.ok) return null
  return response.json()
}

export const getMemories = async () => {
  const response = await fetch(`${BASE}/memories`, {
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Erro ao carregar memórias.')
  return response.json()
}

export const deleteMemory = async (key) => {
  await fetchCarregamento(`${BASE}/memories/${key}`, {
    method: 'DELETE',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  })
}

export const submitFeedback = async (messageId, rating, comment = null) => {
  const response = await fetch(`${BASE}/messages/${messageId}/feedback`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
  })
  if (!response.ok) throw new Error('Erro ao enviar feedback.')
  return response.json()
}

export const getFeedback = async ({ page = 1, per_page = 30, rating } = {}) => {
  const params = new URLSearchParams({ page, per_page })
  if (rating) params.set('rating', rating)
  const response = await fetch(`${BASE}/feedback?${params}`, {
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Erro ao carregar feedbacks.')
  return response.json()
}
