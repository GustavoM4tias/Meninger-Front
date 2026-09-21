// utils/Settings/apiAiProviders.js
//
// Conexões de IA. Admin-only no backend (requireAdmin), então aqui não há
// nenhuma decisão de permissão: esconder botão no navegador é cosmético.
//
// A CHAVE SÓ VAI, NUNCA VOLTA. O GET devolve `chaves: { total, finais }` - o
// bastante para reconhecer qual credencial está cadastrada. Quem quiser trocar
// digita a nova inteira. É proposital: campo que vem preenchido é credencial
// no cache do navegador e no print de tela.

import API_URL from '@/config/apiUrl'

const BASE = `${API_URL}/ai-providers`

function authHeader() {
    return {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
    }
}

async function req(path = '', opts = {}) {
    const r = await fetch(`${BASE}${path}`, { headers: authHeader(), ...opts })
    const corpo = await r.json().catch(() => ({}))
    // O backend recusa gravação inválida com uma frase que diz o que fazer
    // ("Já existe um provedor com este identificador."). Trocar isso por
    // "Erro 400" jogaria fora justamente a parte útil.
    if (!r.ok) throw new Error(corpo.message || corpo.error || `Erro ${r.status}`)
    return corpo
}

/** { providers, routes, tipos, usos, contextos } - sem nenhuma credencial. */
export const carregar = () => req('').then(r => r.data)

export const criarProvider = (body) =>
    req('', { method: 'POST', body: JSON.stringify(body) })

export const salvarProvider = (id, body) =>
    req(`/${id}`, { method: 'PUT', body: JSON.stringify(body) })

export const removerProvider = (id) =>
    req(`/${id}`, { method: 'DELETE' })

/** Quem atende um contexto do produto. */
export const salvarRota = (contexto, body) =>
    req(`/rotas/${encodeURIComponent(contexto)}`, { method: 'PUT', body: JSON.stringify(body) })

/**
 * Ping real em cada modelo do pool. Demora alguns segundos de propósito: o
 * ponto é descobrir a chave errada AQUI, e não na próxima pergunta de alguém.
 */
export const testarProvider = (id) =>
    req(`/${id}/testar`, { method: 'POST' }).then(r => r.data)

export default { carregar, criarProvider, salvarProvider, removerProvider, salvarRota, testarProvider }
