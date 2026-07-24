// Séries diárias de leads — base do gráfico "Entradas de leads" e das sparklines
// dos KPIs. Tudo client-side: o store já traz a lista completa do período.
import dayjs from 'dayjs';

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Palavras-chave por métrica — mesma heurística usada nos KPIs e no funil.
export const KW = {
  atendimento: ['atendimento', 'externo', 'tentativa', 'contato'],
  qualificado: ['qualificad'],
  reserva:     ['reserva', 'proposta', 'venda', 'contrato'],
  descartado:  ['descartad', 'perdid', 'sem interesse'],
};

export function matchSituacao(lead, keywords) {
  const n = norm(lead?.situacao_nome);
  return keywords.some(k => n.includes(k));
}

/**
 * Conta leads por dia entre `from` e `to` (inclusive), preenchendo dias vazios
 * com zero para o gráfico não "pular" datas.
 * @returns {{date:string,label:string,count:number}[]}
 */
export function dailySeries(leads, from, to, predicate = null) {
  const start = dayjs(from).startOf('day');
  const end = dayjs(to).startOf('day');
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return [];

  // Trava defensiva: períodos absurdos não devem gerar milhares de buckets.
  const days = Math.min(end.diff(start, 'day') + 1, 400);

  const buckets = new Map();
  for (let i = 0; i < days; i++) buckets.set(start.add(i, 'day').format('YYYY-MM-DD'), 0);

  for (const l of leads || []) {
    if (predicate && !predicate(l)) continue;
    if (!l?.data_cad) continue;
    const d = dayjs(l.data_cad);
    if (!d.isValid()) continue;
    const key = d.format('YYYY-MM-DD');
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }

  return Array.from(buckets, ([date, count]) => ({
    date,
    label: dayjs(date).format('DD/MM'),
    count,
  }));
}

/** Só os valores — usado pelas sparklines. */
export function seriesValues(leads, from, to, predicate = null) {
  return dailySeries(leads, from, to, predicate).map(p => p.count);
}
