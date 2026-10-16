// Utilitários da ficha comercial nova (resumo, espelho e impressão).
// Funções puras: a tela e o HTML de impressão usam as mesmas.

export const brl = (v, dec = 0) => (v == null || v === '' || !Number.isFinite(Number(v))
    ? '-'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: dec, maximumFractionDigits: dec }));
export const brl2 = (v) => brl(v, 2);
export const num = (v, dec = 0) => (v == null || !Number.isFinite(Number(v)) ? '-' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
export const pct = (v, dec = 0) => (v == null || !Number.isFinite(Number(v)) ? '-' : `${num(v, dec)}%`);
export const area = (v) => (v == null ? '-' : `${num(v, Number(v) % 1 ? 2 : 0)} m²`);
export const data = (ymd) => (ymd ? String(ymd).slice(0, 10).split('-').reverse().join('/') : '-');
export const mil = (v) => (v == null ? '-' : `R$ ${num(Math.round(Number(v) / 1000))} mil`);
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesCurto = (ym) => { const [, m] = String(ym).split('-'); return MESES[Number(m) - 1] || ym; };
export const mesLongo = (ref) => { const [y, m] = String(ref || '').split('-'); return m ? `${MESES_LONGOS[Number(m) - 1]} de ${y}` : '-'; };

// Situação da unidade (mesmas cores do espelho de Empreendimentos).
export const SITUACAO = {
    disponivel: { rotulo: 'Disponível', chave: 'd', cel: 'bg-data-pos text-ink-inverted', leg: 'bg-data-pos' },
    reserva_inicio: { rotulo: 'Reservado', chave: 'r', cel: 'bg-data-warn text-ink-inverted', leg: 'bg-data-warn' },
    reserva_ativa: { rotulo: 'Reservado', chave: 'r', cel: 'bg-data-warn text-ink-inverted', leg: 'bg-data-warn' },
    vendida: { rotulo: 'Vendido', chave: 'v', cel: 'bg-data-neg text-ink-inverted', leg: 'bg-data-neg' },
    bloqueada: { rotulo: 'Bloqueado', chave: 'b', cel: 'bg-surface-sunken text-ink-muted', leg: 'bg-surface-sunken border border-line' },
    estoque: { rotulo: 'Segurado (à venda)', chave: 'd', cel: 'bg-data-pos/15 text-data-pos border border-dashed border-data-pos', leg: 'bg-data-pos/15 border border-dashed border-data-pos' },
    sem_status: { rotulo: 'Sem situação', chave: 'b', cel: 'bg-surface-sunken text-ink-subtle', leg: 'bg-surface-sunken' },
};
export const situacaoDe = (c) => (c?.estoque_comercial ? SITUACAO.estoque : (SITUACAO[c?.status] || SITUACAO.sem_status));
export const aVenda = (c) => c?.status === 'disponivel' || (c?.status === 'bloqueada' && c?.estoque_comercial);

// Séries da tabela do CV agrupadas pelo papel no pagamento (igual ao back).
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function tipoSerie(nome) {
    const n = semAcento(nome);
    if (/subsid/.test(n)) return 'subsidio';
    if (/financ|entrega das chaves|chaves/.test(n)) return 'financiamento';
    if (/semestr/.test(n)) return 'semestrais';
    if (/anua/.test(n)) return 'anuais';
    if (/parcelad|mensa/.test(n)) return 'mensais';
    if (/\bato\b|a vista|sinal|entrada/.test(n)) return 'ato';
    if (/desconto/.test(n)) return 'desconto';
    return 'outras';
}
export const ROTULO_SERIE = { ato: 'Ato', mensais: 'Parcelado', semestrais: 'Semestrais', anuais: 'Anuais', subsidio: 'Subsídio', financiamento: 'Financiamento', desconto: 'Desconto', outras: 'Outras' };
// Cor fixa por papel (nunca rodar a paleta).
export const COR_SERIE = { ato: 'bg-series-4', mensais: 'bg-series-2', semestrais: 'bg-series-3', anuais: 'bg-series-5', subsidio: 'bg-series-6', financiamento: 'bg-series-1', outras: 'bg-series-7', desconto: 'bg-series-8' };
export const COR_SERIE_HEX = { ato: '#d9a43c', mensais: '#3f9a83', semestrais: '#6c8fd1', anuais: '#9b7bd1', subsidio: '#a9d3c5', financiamento: '#0d6b57', outras: '#9aa5a2', desconto: '#c0605a' };

export function fluxoDaUnidade(series = [], valorTabela = null) {
    const linhas = (series || []).map((s) => {
        const valor = Number(s.valor) || 0;
        const qtd = Number(s.qtd_parcelas) || 1;
        const venc = String(s.data_vencimento || '');
        const m = venc.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        return { tipo: tipoSerie(s.nome), nome: s.nome, qtd, valor, total: valor * qtd, primeiro_vencimento: m ? `${m[3]}-${m[2]}-${m[1]}` : null };
    }).filter((l) => l.total > 0);
    const total = valorTabela || linhas.reduce((s, l) => s + l.total, 0) || null;
    for (const l of linhas) { l.rotulo = ROTULO_SERIE[l.tipo]; l.pct = total ? (l.total / total) * 100 : null; }
    const soma = (tipos) => linhas.filter((l) => tipos.includes(l.tipo)).reduce((s, l) => s + l.total, 0);
    const rp = soma(['ato', 'mensais', 'semestrais', 'anuais', 'outras']);
    return { linhas, total, recurso_proprio: rp, recurso_proprio_pct: total ? (rp / total) * 100 : null };
}

// Texto curto de uma linha do fluxo ("60x de R$ 690").
export const linhaFluxo = (l) => (l.qtd > 1 ? `${l.qtd}x de ${brl(l.valor, l.valor % 1 ? 2 : 0)}` : brl(l.valor, l.valor % 1 ? 2 : 0));

// Regras do CV em linhas legíveis, na ordem da tabela de séries.
export function regrasDoCv(regra) {
    if (!regra?.series?.length) return [];
    const out = [];
    for (const s of regra.series) {
        if (s.travada) continue;
        const partes = [];
        if (s.valor_min) partes.push(`mínimo ${brl(s.valor_min)}`);
        if (s.valor_max) partes.push(`máximo ${brl(s.valor_max)}`);
        if (s.parcelas_max) partes.push(`até ${s.parcelas_max}x`);
        // Uma linha só é o normal (ato, financiamento): só vale dizer quando é mais.
        if (s.linhas_max > 1) partes.push(`até ${s.linhas_max} linhas`);
        const nota = [s.renda_pct ? `parcela até ${num(s.renda_pct)}% da renda` : null, s.bloqueia_minimo ? 'abaixo do mínimo não entra' : null].filter(Boolean).join(' · ');
        if (!partes.length && !nota) continue;
        out.push({ chave: `s${s.idserie}`, rotulo: s.nome, valor: partes.join(' · ') || 'liberada', nota });
    }
    return out;
}
