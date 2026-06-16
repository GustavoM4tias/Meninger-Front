import API_URL from '@/config/apiUrl'

// Client das automações de WhatsApp (no-code). Admin only no backend.
const BASE = `${API_URL}/whatsapp-automations`

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

export const listAutomations = () => req('/')
export const createAutomation = (data) => req('/', { method: 'POST', body: JSON.stringify(data) })
export const updateAutomation = (id, data) => req(`/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteAutomation = (id) => req(`/${id}`, { method: 'DELETE' })

// Templates (catálogo + criar/submeter à Meta)
export const listTemplates = () => req('/templates')
export const createTemplate = (data) => req('/templates', { method: 'POST', body: JSON.stringify(data) })

// Webhook ↔ WABA (conectar a conta ao webhook num clique)
export const connectWebhook = () => req('/connect-webhook', { method: 'POST' })
export const webhookStatus = () => req('/webhook-status')
