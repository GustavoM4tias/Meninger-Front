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
// `force` só é usado quando o portão da régua barra e a pessoa decide publicar
// assim mesmo. O motivo fica gravado na versão - é o que separa "exceção
// justificada" de "portão que ninguém respeita".
export const publish = (label, note, force = false, forceReason = '') =>
  req('/publish', { method: 'POST', body: JSON.stringify({ label, note, force, force_reason: forceReason }) })
export const rollback = (id) => req(`/rollback/${id}`, { method: 'POST' })
export const deactivate = () => req('/deactivate', { method: 'POST' })

// Sandbox
export const sandboxPreview = (role, city) => req('/sandbox/preview', { method: 'POST', body: JSON.stringify({ role, city }) })
export const sandboxChat = (message, role, city) => req('/sandbox/chat', { method: 'POST', body: JSON.stringify({ message, role, city }) })

// Recuperação (roteamento semântico, blocos/glossário por similaridade, memória)
export const getRetrieval = () => req('/retrieval')
export const saveRetrieval = (settings) => req('/retrieval', { method: 'PUT', body: JSON.stringify({ settings }) })
export const reindexRetrieval = (kind) => req('/retrieval/reindex', { method: 'POST', body: JSON.stringify({ kind }) })

// Avaliação (conjunto de casos + rodadas)
export const getEvalCases = () => req('/eval/cases')
export const createEvalCase = (data) => req('/eval/cases', { method: 'POST', body: JSON.stringify(data) })
export const updateEvalCase = (id, data) => req(`/eval/cases/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteEvalCase = (id) => req(`/eval/cases/${id}`, { method: 'DELETE' })
export const getEvalRuns = () => req('/eval/runs')
export const getEvalRun = (id) => req(`/eval/runs/${id}`)
// `alvo` decide o que a rodada testa: 'rascunho' (o que vai entrar, e é o que
// serve de prova para o portão) ou 'ativo' (o prompt que já está no ar).
export const runEval = (caseIds, label, alvo = 'rascunho') =>
  req('/eval/run', { method: 'POST', body: JSON.stringify({ case_ids: caseIds || null, label: label || null, alvo }) })

// Ancoragem: o modelo cita a célula em vez de digitar o número.
export const getAnchoring = () => req('/anchoring')
export const saveAnchoring = (settings) => req('/anchoring', { method: 'PUT', body: JSON.stringify({ settings }) })

// Portão de publicação (a régua obrigatória) + veredito do rascunho atual.
export const getEvalGate = () => req('/eval-gate')
export const saveEvalGate = (settings) => req('/eval-gate', { method: 'PUT', body: JSON.stringify({ settings }) })
