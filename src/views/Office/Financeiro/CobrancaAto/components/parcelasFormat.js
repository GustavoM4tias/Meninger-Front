// Rótulos e formatação da aba Parcelas - um lugar só para a lista e o modal
// não divergirem.

export const PLANO_LABEL = { ativo: 'Ativo', pausado: 'Pausado', encerrado: 'Encerrado', cancelado: 'Cancelado' };
export const PLANO_VARIANT = { ativo: 'success', pausado: 'warning', encerrado: 'info', cancelado: 'neutral' };
export const MOTIVO_LABEL = {
  sienge_faturado: 'Sienge faturou o contrato',
  reserva_cancelada: 'reserva cancelada no CV',
  manual: 'encerrado pela tela',
  sem_series: 'sem série mensal no CV',
};
export const PARCELA_LABEL = {
  prevista: 'Prevista', emitida: 'Boleto em aberto', vencida: 'Vencida', paga: 'Paga',
  transferida: 'No Sienge', cancelada: 'Cancelada', erro: 'Erro',
};
export const PARCELA_VARIANT = {
  prevista: 'neutral', emitida: 'warning', vencida: 'danger', paga: 'success',
  transferida: 'info', cancelada: 'neutral', erro: 'danger',
};

export const planoLabel = (s) => PLANO_LABEL[s] || s || '-';
export const planoVariant = (s) => PLANO_VARIANT[s] || 'neutral';
export const motivoLabel = (m) => MOTIVO_LABEL[m] || m || '';
export const parcelaLabel = (s) => PARCELA_LABEL[s] || s || '-';
export const parcelaVariant = (s) => PARCELA_VARIANT[s] || 'neutral';

export function formatCurrency(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "em 12 dias" / "hoje" / "há 3 dias" a partir de 'YYYY-MM-DD'. */
export function diasLabel(ymd) {
  if (!ymd) return '';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  const alvo = new Date(y, m - 1, d);
  const dias = Math.round((alvo - hoje) / 86400000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias > 1) return `em ${dias} dias`;
  if (dias === -1) return 'há 1 dia';
  return `há ${-dias} dias`;
}
