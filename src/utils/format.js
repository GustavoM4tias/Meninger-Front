/**
 * Formatação de número, dinheiro, data e porcentagem — uma implementação só.
 * ─────────────────────────────────────────────────────────────────────────────
 * Medido em 25/08/2026, antes deste arquivo existir:
 *
 *   formatDate      20 cópias locais em 19 versões DIFERENTES
 *   fmtDate         19 cópias em 16 versões
 *   formatCurrency   8 cópias em 8 versões (nenhuma igual a outra)
 *   fmtMoney         7 cópias em 6 versões
 *
 * A diferença quase nunca é a formatação em si: é O QUE APARECE QUANDO NÃO HÁ
 * VALOR. As cópias devolviam `''`, `'-'`, `'—'`, `'0'`, `'R$ 0,00'`, `null` ou
 * a própria entrada crua, e cada tela escolheu sozinha. Por isso aqui o vazio é
 * ARGUMENTO, não convenção escondida:
 *
 *   fmtInt(n)              → '—'  quando não há valor
 *   fmtInt(n, '0')         → '0'  quando a ausência significa zero de verdade
 *
 * A regra: `—` quando o dado não existe; `0` só quando zero é a resposta certa
 * (uma contagem de nada é zero, um CAC sem lead não é).
 *
 * Sobre porcentagem: existem DUAS no Office e elas não são a mesma função.
 * A Meta entrega CTR já em pontos percentuais (2.5 = 2,5%); nosso cálculo de
 * orçamento entrega razão (0.025 = 2,5%). Daí `fmtPct` e `fmtRatio`, separadas
 * de propósito - foi o mesmo nome cobrindo as duas que produziu telas com
 * fator 100 de diferença.
 */

const LOCALE = 'pt-BR';
const VAZIO = '—';

/** Trata null, undefined, '' e NaN como "não há valor". */
function semValor(v) {
    return v == null || v === '' || (typeof v === 'number' && Number.isNaN(v));
}

/** Data válida a partir de string ISO, DATEONLY, Date ou timestamp. */
function paraData(v) {
    if (semValor(v)) return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    /* 'YYYY-MM-DD' puro é dia civil, não instante: sem a hora o JS lê como UTC
       e no Brasil a data volta um dia. Ancorar em meia-noite local resolve. */
    const s = String(v);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

// ── Número ──────────────────────────────────────────────────────────────────

/** Inteiro com separador de milhar. `1234` → `1.234` */
export function fmtInt(v, vazio = VAZIO) {
    if (semValor(v)) return vazio;
    return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(Number(v));
}

/** Decimal com casas fixas. `fmtNum(3.14159, 2)` → `3,14` */
export function fmtNum(v, casas = 2, vazio = VAZIO) {
    if (semValor(v)) return vazio;
    return new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
    }).format(Number(v));
}

/** Número curto para caber em cartão. `1250000` → `1,3 mi` */
export function fmtCompact(v, vazio = VAZIO) {
    if (semValor(v)) return vazio;
    return new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v));
}

// ── Dinheiro ────────────────────────────────────────────────────────────────

/** Moeda. `fmtMoney(1234.5)` → `R$ 1.234,50` */
export function fmtMoney(v, { moeda = 'BRL', casas = 2, vazio = VAZIO } = {}) {
    if (semValor(v)) return vazio;
    try {
        return new Intl.NumberFormat(LOCALE, {
            style: 'currency',
            currency: moeda,
            minimumFractionDigits: casas,
            maximumFractionDigits: casas,
        }).format(Number(v));
    } catch {
        /* Moeda desconhecida vinda da API não pode derrubar a tela. */
        return `${moeda} ${fmtNum(v, casas, vazio)}`;
    }
}

/** Moeda sem centavos, para totais grandes. `fmtMoneyCurto(1234567)` → `R$ 1,2 mi` */
export function fmtMoneyCurto(v, { moeda = 'BRL', vazio = VAZIO } = {}) {
    if (semValor(v)) return vazio;
    try {
        return new Intl.NumberFormat(LOCALE, {
            style: 'currency', currency: moeda,
            notation: 'compact', maximumFractionDigits: 1,
        }).format(Number(v));
    } catch {
        return `${moeda} ${fmtCompact(v, vazio)}`;
    }
}

// ── Porcentagem ─────────────────────────────────────────────────────────────

/** Valor JÁ em pontos percentuais (o que a Meta devolve). `2.5` → `2,50%` */
export function fmtPct(v, casas = 2, vazio = VAZIO) {
    if (semValor(v)) return vazio;
    return `${fmtNum(Number(v), casas, vazio)}%`;
}

/** Valor em RAZÃO de 0 a 1 (o que nosso cálculo devolve). `0.025` → `3%` */
export function fmtRatio(v, casas = 0, vazio = VAZIO) {
    if (semValor(v)) return vazio;
    return `${fmtNum(Number(v) * 100, casas, vazio)}%`;
}

// ── Data ────────────────────────────────────────────────────────────────────

/** `10/08/2026` */
export function fmtDate(v, vazio = VAZIO) {
    const d = paraData(v);
    return d ? d.toLocaleDateString(LOCALE) : vazio;
}

/** `10/08/26` — para caber em coluna estreita. */
export function fmtDateCurta(v, vazio = VAZIO) {
    const d = paraData(v);
    return d ? d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: '2-digit' }) : vazio;
}

/** `10/08/2026 14:32` */
export function fmtDateTime(v, vazio = VAZIO) {
    const d = paraData(v);
    if (!d) return vazio;
    return `${d.toLocaleDateString(LOCALE)} ${d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}`;
}

/** `agora`, `12min atrás`, `3h atrás`, `5d atrás`, depois vira data. */
export function fmtRelative(v, vazio = VAZIO) {
    const d = paraData(v);
    if (!d) return vazio;
    const min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (min < 0) return fmtDate(d, vazio);      // futuro: data, não "-3min atrás"
    if (min < 1) return 'agora';
    if (min < 60) return `${min}min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h atrás`;
    const dias = Math.floor(h / 24);
    if (dias < 7) return `${dias}d atrás`;
    return fmtDate(d, vazio);
}

export default {
    fmtInt, fmtNum, fmtCompact,
    fmtMoney, fmtMoneyCurto,
    fmtPct, fmtRatio,
    fmtDate, fmtDateCurta, fmtDateTime, fmtRelative,
};
