import API_URL from '@/config/apiUrl'

// Client do Eme Atende (atendente IA de leads). Admin only no backend.
const BASE = `${API_URL}/eme-atende`

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

// Settings
export const getSettings = () => req('/settings')
export const updateSettings = (data) => req('/settings', { method: 'PUT', body: JSON.stringify(data) })

// API keys (intake de leads)
export const listApiKeys = () => req('/api-keys')
export const createApiKey = (name) => req('/api-keys', { method: 'POST', body: JSON.stringify({ name }) })
export const deactivateApiKey = (id) => req(`/api-keys/${id}`, { method: 'DELETE' })

// Fluxos
export const listFlows = () => req('/flows')
export const createFlow = (data) => req('/flows', { method: 'POST', body: JSON.stringify(data) })
export const updateFlow = (id, data) => req(`/flows/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteFlow = (id) => req(`/flows/${id}`, { method: 'DELETE' })

// Regras de segmentação
export const listRules = () => req('/flow-rules')
export const createRule = (data) => req('/flow-rules', { method: 'POST', body: JSON.stringify(data) })
export const updateRule = (id, data) => req(`/flow-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteRule = (id) => req(`/flow-rules/${id}`, { method: 'DELETE' })

// Templates do canal (cache whatsapp_templates)
export const listTemplates = (status) => req(`/templates${status ? `?status=${status}` : ''}`)

// Leads
export const listLeads = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  return req(`/leads${q ? `?${q}` : ''}`)
}
export const getLead = (id) => req(`/leads/${id}`)

// Conversas
export const listConversations = (state) => req(`/conversations${state ? `?state=${state}` : ''}`)
export const getConversation = (id) => req(`/conversations/${id}`)
export const setConversationState = (id, state) => req(`/conversations/${id}/state`, { method: 'PUT', body: JSON.stringify({ state }) })

// Sandbox
export const testAi = (data) => req('/test/ai', { method: 'POST', body: JSON.stringify(data) })
