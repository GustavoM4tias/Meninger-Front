// utils/Frota/apiFrota.js
// Chamadas da tela do veículo corporativo.
//
// O backend responde 409 quando é choque de agenda. A mensagem dele já vem
// pronta e em português ("Já reservado por Fulano de 24/08 07:00 até 24/08
// 18:00"), então ela é preservada tal e qual - reescrever aqui só apagaria a
// informação que resolve o problema da pessoa.
import API_URL from '@/config/apiUrl';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const handle = async (resp) => {
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(corpo?.error || `HTTP ${resp.status}`);
        err.status = resp.status;
        err.conflito = resp.status === 409;
        throw err;
    }
    return corpo?.data ?? corpo;
};

const get = (caminho) => fetch(`${API_URL}/fleet${caminho}`, { headers: authHeaders() }).then(handle);
const send = (metodo) => (caminho, corpo) => fetch(`${API_URL}/fleet${caminho}`, {
    method: metodo,
    headers: authHeaders(),
    body: JSON.stringify(corpo || {}),
}).then(handle);

const post = send('POST');
const put = send('PUT');

export const fetchOverview = () => get('/overview');
export const fetchAgenda = ({ de, ate, vehicleId } = {}) => {
    const qs = new URLSearchParams();
    if (de) qs.set('de', new Date(de).toISOString());
    if (ate) qs.set('ate', new Date(ate).toISOString());
    if (vehicleId) qs.set('vehicle_id', String(vehicleId));
    return get(`/agenda?${qs.toString()}`);
};
export const fetchMinhasReservas = () => get('/minhas-reservas');
export const verificarDisponibilidade = (payload) => post('/verificar', payload);

export const criarReserva = (payload) => post('/reservations', payload);
export const cancelarReserva = (id, motivo) => post(`/reservations/${id}/cancel`, { motivo });
export const registrarRetirada = (id, payload) => post(`/reservations/${id}/pickup`, payload);
export const registrarDevolucao = (id, payload) => post(`/reservations/${id}/return`, payload);
export const retirarAgora = (payload) => post('/pickup-now', payload);
export const ressincronizarEvento = (id) => post(`/reservations/${id}/resync-event`);

export const criarBloqueio = (payload) => post('/blocks', payload);
export const removerBloqueio = (id) => fetch(`${API_URL}/fleet/blocks/${id}`, {
    method: 'DELETE', headers: authHeaders(),
}).then(handle);

export const fetchRegistros = (vehicleId) => get(`/vehicles/${vehicleId}/logs`);
export const criarRegistro = (vehicleId, payload) => post(`/vehicles/${vehicleId}/logs`, payload);

export const fetchSettings = () => get('/settings');
export const salvarSettings = (payload) => put('/settings', payload);
export const fetchVeiculos = () => get('/vehicles');
export const fetchUsuarios = () => get('/users');

/* Sobe UMA foto já comprimida pela tela e devolve { url, path }. Uma por vez de
   propósito: a pessoa vê o progresso e uma falha custa uma foto, não o
   formulário inteiro. */
export const subirFoto = (payload) => post('/photos', payload);

/* Lê o odômetro na foto do painel. É SUGESTÃO: a tela preenche e a pessoa
   confirma. Falha aqui nunca trava a retirada - digita-se o número. */
export const lerOdometroFoto = (payload) => post('/odometer/read', payload);
export const salvarVeiculo = (id, payload) => (id ? put(`/vehicles/${id}`, payload) : post('/vehicles', payload));
