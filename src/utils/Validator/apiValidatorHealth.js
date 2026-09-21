// utils/Validator/apiValidatorHealth.js
//
// Saúde do Validador de Contratos. Duas camadas, como no backend:
//
//   fetchEstado()   o FAROL - cor, desde quando e uma frase. Quem tem a tela
//                   vê, porque saber que o validador está fora do ar antes de
//                   subir o PDF poupa a pessoa de decifrar um erro genérico.
//   o resto         detalhe e configuração. Só admin (requireCapability
//                   '/validator','configure' no backend); esconder o botão aqui
//                   é cosmético.

import API_URL from '@/config/apiUrl'

const BASE = `${API_URL}/contracts/health`

function authHeader() {
    return {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
    }
}

async function req(path = '', opts = {}) {
    const r = await fetch(`${BASE}${path}`, { headers: authHeader(), ...opts })
    if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error || `Erro ${r.status}`)
    }
    return r.json()
}

/** Farol: { status, status_since, last_probe_at, last_ok_at, probe_enabled, mensagem } */
export const fetchEstado = () => req('')

/** Diagnóstico completo: { saude, configuracao, webhook, execucoes, parados } */
export const fetchDetalhe = (limit = 20) => req(`/full?limit=${encodeURIComponent(limit)}`)

/** Roda a sonda agora. `incluirFila` custa uma chamada à API do CV. */
export const rodarSonda = (incluirFila = true) =>
    req('/check', { method: 'POST', body: JSON.stringify({ incluirFila }) })

/** Grava a configuração. Erro de validação volta como 400 com a mensagem. */
export const salvarConfig = (patch) =>
    req('/settings', { method: 'PUT', body: JSON.stringify(patch) })

export default { fetchEstado, fetchDetalhe, rodarSonda, salvarConfig }
