// Período da tela Ato e Parcelas: helpers compartilhados pelo PeriodoFilter,
// pela aba Histórico e pela aba Parcelas. O formato é o mesmo nos três:
//   { emitidoDe, emitidoAte, pagoDe, pagoAte }   (ISO YYYY-MM-DD ou '')

export const PERIODO_VAZIO = Object.freeze({ emitidoDe: '', emitidoAte: '', pagoDe: '', pagoAte: '' });

// ISO local (YYYY-MM-DD) sem passar por UTC - `toISOString` vira o dia antes
// das 21h no Brasil.
export function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* "N dias" conta hoje incluso: 7 dias = hoje e os 6 anteriores, igual ao
   Hoje / 7 dias / 30 dias que o Acompanhamento tinha. */
export function ultimosDias(n) {
  const ate = new Date();
  const de = new Date();
  de.setDate(ate.getDate() - (n - 1));
  return { de: isoLocal(de), ate: isoLocal(ate) };
}

/* Padrão das duas abas: emitido nos últimos 30 dias (hoje incluso), pago em
   aberto. Quem limpa o filtro volta para isto, não para tudo vazio. */
export function periodoPadrao() {
  const { de, ate } = ultimosDias(30);
  return { ...PERIODO_VAZIO, emitidoDe: de, emitidoAte: ate };
}

/* Quantos dos dois períodos estão preenchidos (para o selo "N ativos"). */
export function periodosAtivos(p) {
  return ((p.emitidoDe || p.emitidoAte) ? 1 : 0) + ((p.pagoDe || p.pagoAte) ? 1 : 0);
}

/* Query string no formato da API (dateFrom/dateTo = emissão, paidFrom/paidTo
   = pagamento). Só o que está preenchido. */
export function periodoParaQuery(p, params) {
  if (p.emitidoDe) params.set('dateFrom', p.emitidoDe);
  if (p.emitidoAte) params.set('dateTo', p.emitidoAte);
  if (p.pagoDe) params.set('paidFrom', p.pagoDe);
  if (p.pagoAte) params.set('paidTo', p.pagoAte);
  return params;
}

/* Frase curta do período para a tela: "emitido 01/09 a 17/09 · pago 10/09 a 17/09". */
export function periodoResumo(p) {
  const d = (iso) => { const [, m, dd] = String(iso).split('-'); return `${dd}/${m}`; };
  const faixa = (de, ate) => (de && ate ? (de === ate ? d(de) : `${d(de)} a ${d(ate)}`) : de ? `a partir de ${d(de)}` : `até ${d(ate)}`);
  const partes = [];
  if (p.emitidoDe || p.emitidoAte) partes.push(`emitido ${faixa(p.emitidoDe, p.emitidoAte)}`);
  if (p.pagoDe || p.pagoAte) partes.push(`pago ${faixa(p.pagoDe, p.pagoAte)}`);
  return partes.join(' · ');
}
