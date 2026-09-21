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

/**
 * ENSAIO: roda a coleta e a mineração SEM GRAVAR e devolve o que faria.
 *
 * É o jeito de conferir se os coletores entenderam certo as tabelas do CV
 * antes de deixá-los escrever. Demora alguns segundos - a redação das regras
 * chama a IA de verdade.
 */
export const ensaiar = (processo_key = null) =>
    req('/minerar/ensaio', { method: 'POST', body: JSON.stringify({ processo_key }) }).then(r => r.data)

/** Roda a mineração de verdade agora, sem esperar a madrugada. */
export const minerar = () =>
    req('/minerar', { method: 'POST' }).then(r => r.data)

// ── Memória ──────────────────────────────────────────────────────────────────

/** A trilha: observou -> propôs -> você decidiu -> executou, em ordem. */
export const trilha = ({ processo = null, dias = 45, limite = 120 } = {}) => {
    const q = new URLSearchParams({ dias, limite })
    if (processo) q.set('processo', processo)
    return req(`/trilha?${q}`).then(r => r.data)
}

/** As ações automáticas, com a regra que as motivou. */
export const acoes = ({ processo = null, limite = 100 } = {}) => {
    const q = new URLSearchParams({ limite })
    if (processo) q.set('processo', processo)
    return req(`/acoes?${q}`).then(r => r.data)
}

export const saude = (semanas = 8) => req(`/saude?semanas=${semanas}`).then(r => r.data)

/** A cadeia de uma regra: proposta, casos que a sustentaram e ações que moveu. */
export const evidenciaDaRegra = (key, regraId) =>
    req(`/processos/${encodeURIComponent(key)}/regras/${regraId}/evidencia`).then(r => r.data)

/** Tira a regra do mapa. Exige motivo: é o que explica a decisão depois. */
export const revogarRegra = (key, regraId, motivo) =>
    req(`/processos/${encodeURIComponent(key)}/regras/${regraId}/revogar`,
        { method: 'POST', body: JSON.stringify({ motivo }) })

export const restaurarRegra = (key, regraId) =>
    req(`/processos/${encodeURIComponent(key)}/regras/${regraId}/restaurar`, { method: 'POST' })

export default {
    carregar, salvarProcesso, trocarAutonomia, observacoesDe, fila, decidir, reverter,
    salvarSettings, ensaiar, minerar,
    trilha, acoes, saude, evidenciaDaRegra, revogarRegra, restaurarRegra,
}
