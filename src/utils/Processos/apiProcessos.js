// utils/Processos/apiProcessos.js
//
// Motor de processos. Tela DELEGÁVEL: as ações de dentro são cobradas por
// capacidade no servidor (lib/screenCapabilities.js), então esconder botão
// aqui é cosmético - quem barra é a API.
//
//   view        ver o mapa, a fila e o histórico
//   aprovar     transformar proposta em regra da empresa, e desfazer ação
//   autonomia   mudar o degrau (admin)
//   configurar  o portão da fila (admin)

import API_URL from '@/config/apiUrl'

const BASE = `${API_URL}/processos`

function authHeader() {
    return {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
    }
}

async function req(path = '', opts = {}) {
    const r = await fetch(`${BASE}${path}`, { headers: authHeader(), ...opts })
    const corpo = await r.json().catch(() => ({}))
    // O servidor recusa com a frase que diz o que fazer ("O teto deste processo
    // é Propor..."). Trocar por "Erro 400" jogaria fora a parte útil.
    if (!r.ok) throw new Error(corpo.message || corpo.error || `Erro ${r.status}`)
    return corpo
}

/** { processos, fila, settings, promocoes, niveis, rotulos } */
export const carregar = () => req('').then(r => r.data)

export const salvarProcesso = (key, body) =>
    req(`/processos/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(body) })

export const trocarAutonomia = (key, body) =>
    req(`/processos/${encodeURIComponent(key)}/autonomia`, { method: 'PUT', body: JSON.stringify(body) })

export const observacoesDe = (key, limite = 100) =>
    req(`/processos/${encodeURIComponent(key)}/observacoes?limite=${limite}`).then(r => r.data)

export const fila = (paradas = false) =>
    req(`/fila?paradas=${paradas}`).then(r => r.data)

/** decisao: 'aprovar' | 'recusar' */
export const decidir = (id, decisao, nota = '') =>
    req(`/propostas/${id}/${decisao}`, { method: 'POST', body: JSON.stringify({ nota }) })

/** Desfaz uma ação automática. Rebaixa o processo na hora. */
export const reverter = (id, nota = '') =>
    req(`/acoes/${id}/reverter`, { method: 'POST', body: JSON.stringify({ nota }) })

export const salvarSettings = (body) =>
    req('/settings', { method: 'PUT', body: JSON.stringify(body) })

export default { carregar, salvarProcesso, trocarAutonomia, observacoesDe, fila, decidir, reverter, salvarSettings }
