// Formatação compartilhada do Stand de Vendas (cards, detalhe, tabelas).

export const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const num = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const mil = (v) => num(v / 1000);

// Faixa de valor do modelo, compacta: "R$ 20 a 50 mil", "R$ 110 mil+",
// "R$ 850,00 a R$ 990,00" (abaixo de mil) ou '' quando não definida.
export function fmtValueRange(m) {
    const min = Number(m?.avg_value_min) || 0;
    const max = Number(m?.avg_value_max) || 0;
    if (!min && !max) return '';
    if (min >= 1000 && max >= 1000) {
        return min === max ? `R$ ${mil(min)} mil` : `R$ ${mil(min)} a ${mil(max)} mil`;
    }
    if (min >= 1000 && !max) return `R$ ${mil(min)} mil+`;
    if (min && max && min !== max) return `${fmtBRL(min)} a ${fmtBRL(max)}`;
    if (min && !max) return `${fmtBRL(min)}+`;
    return fmtBRL(max || min);
}

// Faixa de metragem: "14 a 22 m²", "80+ m²" (aberta) ou '' quando não definida.
export function fmtAreaRange(m) {
    const min = Number(m?.avg_area_min) || 0;
    const max = Number(m?.avg_area_max) || 0;
    if (!min && !max) return '';
    if (min && max && min !== max) return `${num(min)} a ${num(max)} m²`;
    if (min && !max) return `${num(min)}+ m²`;
    return `${num(max || min)} m²`;
}

// Ordena modelos por porte (faixa de valor, depois metragem); sem faixa vai pro fim.
export function sortModelsByTier(models) {
    const key = (m) => Number(m?.avg_value_min) || Number(m?.avg_area_min) || Infinity;
    return [...(models || [])].sort((a, b) => key(a) - key(b) || String(a.name).localeCompare(String(b.name)));
}

// "2026-08" -> "ago/26". Mês do PAGAMENTO, que é a régua do gasto do stand.
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function fmtYm(ym) {
    if (!ym) return '-';
    const [y, m] = String(ym).split('-');
    return `${MESES[Number(m) - 1] || m}/${String(y).slice(2)}`;
}

// "2026-08-05" -> "05/08/26"
export function fmtDate(iso) {
    if (!iso) return '-';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    return d ? `${d}/${m}/${String(y).slice(2)}` : '-';
}

// Valor curto para caber em celular: "R$ 146,6 mil", "R$ 6,0 mil", "R$ 990".
export function fmtBRLShort(v) {
    const n = Number(v || 0);
    if (Math.abs(n) >= 1000) return `R$ ${num(n / 1000)} mil`;
    return `R$ ${num(n)}`;
}
