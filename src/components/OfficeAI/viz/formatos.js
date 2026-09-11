/**
 * Formatação de célula/valor por TIPO de coluna - um lugar só para a galeria
 * inteira (tabela, tooltip do gráfico, KPI, card) mostrar o mesmo número do
 * mesmo jeito.
 */
import dayjs from 'dayjs';

const nf = new Intl.NumberFormat('pt-BR');
const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Número puro de uma célula que pode vir formatada ("R$ 3.597.425", "13,5%"). */
export function numeroDe(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  // "R$ 1.234,56" / "1.234,56" / "13,5%" / "-2.000"
  const limpo = s.replace(/[^\d,.-]/g, '');
  if (!limpo) return null;
  const temVirgula = limpo.includes(',');
  const normal = temVirgula ? limpo.replace(/\./g, '').replace(',', '.') : limpo.replace(/(\.\d{3})+(?!\d)/g, (m) => m.replace(/\./g, ''));
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export function formatarValor(v, tipo = 'text', { compacto = false } = {}) {
  if (v == null || v === '') return '-';
  switch (tipo) {
    case 'currency': {
      const n = numeroDe(v);
      if (n == null) return String(v);
      if (compacto && Math.abs(n) >= 1_000_000) return `R$ ${nf1.format(n / 1_000_000)} mi`;
      if (compacto && Math.abs(n) >= 1_000) return `R$ ${nf1.format(n / 1_000)} mil`;
      return Number.isInteger(n) ? brl.format(n) : brlCents.format(n);
    }
    case 'number': {
      const n = numeroDe(v);
      if (n == null) return String(v);
      if (compacto && Math.abs(n) >= 1_000_000) return `${nf1.format(n / 1_000_000)} mi`;
      if (compacto && Math.abs(n) >= 10_000) return `${nf1.format(n / 1_000)} mil`;
      return Number.isInteger(n) ? nf.format(n) : nf1.format(n);
    }
    case 'percent': {
      const n = numeroDe(v);
      return n == null ? String(v) : `${nf1.format(n)}%`;
    }
    case 'date': {
      const d = dayjs(v);
      return d.isValid() ? d.format('DD/MM/YYYY') : String(v);
    }
    case 'month': {
      const m = /^(\d{4})-(\d{2})/.exec(String(v));
      return m ? `${MESES[Number(m[2]) - 1]}/${m[1].slice(2)}` : String(v);
    }
    default:
      return String(v);
  }
}

/** Formatador pronto para um tipo (para passar ao ECharts/StatCard). */
export const formatadorDe = (tipo, opts) => (v) => formatarValor(v, tipo, opts);

export default { numeroDe, formatarValor, formatadorDe };
