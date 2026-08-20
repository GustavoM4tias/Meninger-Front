// Transporte das consultas do relatório aberto por LINK PÚBLICO (/r/:token).
// Mesma forma de erro do requestWithAuth (Error com .status e .payload), só que
// sem JWT: a credencial é o próprio token da URL.
import API_URL from '@/config/apiUrl.js'

export async function publicPost(token, subPath, body) {
  const res = await fetch(`${API_URL}/reports/public/${encodeURIComponent(token)}${subPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(json?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.payload = json
    throw err
  }
  return json
}
