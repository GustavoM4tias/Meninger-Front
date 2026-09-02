// Vocabulário da tela do veículo. Os níveis de combustível são exatamente os
// do formulário que a operação já usava no Forms - trocar a escala agora
// obrigaria todo mundo a reaprender o que "1/2" significa.
export const NIVEIS_COMBUSTIVEL = [
    { value: 'reserva', label: 'Reserva' },
    { value: '1/4', label: '1/4' },
    { value: '1/2', label: '1/2' },
    { value: '3/4', label: '3/4' },
    { value: 'cheio', label: 'Cheio' },
];

export const PERIODOS = [
    { value: 'manha', label: 'Manhã' },
    { value: 'tarde', label: 'Tarde' },
    { value: 'dia', label: 'Dia inteiro' },
    { value: 'personalizado', label: 'Horário específico' },
];

export const SITUACOES = {
    livre: { label: 'Livre', variant: 'success', icon: 'fas fa-circle-check' },
    em_uso: { label: 'Em uso', variant: 'warning', icon: 'fas fa-car-side' },
    reservado_agora: { label: 'Reservado agora', variant: 'info', icon: 'fas fa-clock' },
    indisponivel: { label: 'Indisponível', variant: 'danger', icon: 'fas fa-screwdriver-wrench' },
};

export const STATUS_RESERVA = {
    reservada: { label: 'Reservada', variant: 'info' },
    em_uso: { label: 'Em uso', variant: 'warning' },
    devolvida: { label: 'Devolvida', variant: 'neutral' },
    cancelada: { label: 'Cancelada', variant: 'neutral' },
    expirada: { label: 'Expirada', variant: 'danger' },
};

const TZ = 'America/Sao_Paulo';

/* Toda data da tela passa por aqui com o fuso explícito: o servidor manda UTC
   e, sem o timeZone, o navegador de quem estiver fora de Brasília mostraria a
   manhã de um dia no dia anterior. */
export function dataHora(valor) {
    if (!valor) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: TZ,
    }).format(new Date(valor));
}

export function apenasHora(valor) {
    if (!valor) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: TZ,
    }).format(new Date(valor));
}

export function diaLongo(valor) {
    if (!valor) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short', day: '2-digit', month: 'short', timeZone: TZ,
    }).format(new Date(valor));
}

/** 'YYYY-MM-DD' no fuso de Brasília (o value dos <input type="date">). */
export function chaveDoDia(data) {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ,
    }).format(new Date(data));
}

export function nomeDoCondutor(reserva) {
    /* `users` não tem coluna `name`: o nome que a empresa conhece é o username. */
    return reserva?.condutor?.username || reserva?.condutor?.email || 'Sem condutor';
}

export function rotuloVeiculo(veiculo) {
    if (!veiculo) return 'Veículo';
    return veiculo.apelido || `${veiculo.modelo} · ${veiculo.placa}`;
}
