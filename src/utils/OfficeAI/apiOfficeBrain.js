import API_URL from '@/config/apiUrl'

// Client do "Cérebro da Eme" (Brain Studio). Admin-only no backend.
const BASE = `${API_URL}/office-brain`

function authHeader() {
  return {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  }
}

async function req(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, { headers: authHeader(), ...opts })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || `Erro ${r.status}`)
  }
  return r.json()
}

// Visão geral (versão ativa + rascunho completo)
export const getBrain = () => req('/brain')

// Blocos do prompt
export const getBlocks = (context) => req(`/blocks${context ? `?context=${context}` : ''}`)
export const createBlock = (data) => req('/blocks', { method: 'POST', body: JSON.stringify(data) })
export const updateBlock = (id, data) => req(`/blocks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteBlock = (id) => req(`/blocks/${id}`, { method: 'DELETE' })
export const reorderBlocks = (order) => req('/blocks/reorder', { method: 'POST', body: JSON.stringify({ order }) })

// Glossário
export const getGlossary = () => req('/glossary')
export const createTerm = (data) => req('/glossary', { method: 'POST', body: JSON.stringify(data) })
export const updateTerm = (id, data) => req(`/glossary/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTerm = (id) => req(`/glossary/${id}`, { method: 'DELETE' })

// Settings (identidade, limites, pools, flags)
export const getSettings = () => req('/settings')
export const saveSetting = (key, value) => req(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) })

// Relatórios (tools)
export const getReports = () => req('/reports')
export const updateReport = (id, data) => req(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// Versões / publicação
export const getVersions = () => req('/versions')
export const publish = (label, note) => req('/publish', { method: 'POST', body: JSON.stringify({ label, note }) })
export const rollback = (id) => req(`/rollback/${id}`, { method: 'POST' })
export const deactivate = () => req('/deactivate', { method: 'POST' })

// Sandbox
export const sandboxPreview = (role, city) => req('/sandbox/preview', { method: 'POST', body: JSON.stringify({ role, city }) })
export const sandboxChat = (message, role, city) => req('/sandbox/chat', { method: 'POST', body: JSON.stringify({ message, role, city }) })
