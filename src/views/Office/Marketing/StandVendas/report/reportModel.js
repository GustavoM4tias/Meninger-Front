// Regras do relatório do stand, sem tela: recortes que os modais abrem,
// meses do stand, contas mensais que faltaram e as pendências.
//
// Tudo sai dos lançamentos que a API já classificou (tipo + categoria). O
// relatório não reclassifica nada: se um número parece errado, o lugar de
// acertar é a classificação (aba Custos ou o próprio modal do lançamento).
import { fmtYm } from '../standFormat';

export const KIND_ORDER = ['construcao', 'esporadica', 'recorrencia', 'sem_classificacao'];

// Como o relatório chama cada tipo: a fase do stand (o Office chama de
// construção / esporádica / recorrência na classificação).
export const FASE = {
    construcao: { label: 'Implantação', color: 'var(--sr-c1)', text: 'Montar o stand: obra, móveis, comunicação visual e o que ficou nele.' },
    esporadica: { label: 'Ajustes e eventuais', color: 'var(--sr-e1)', text: 'Depois de pronto: última medição, reparos, material avulso.' },
    recorrencia: { label: 'Operação', color: 'var(--sr-r1)', text: 'Manter aberto: aluguel, energia, água, internet, café e limpeza.' },
    sem_classificacao: { label: 'Sem classificação', color: 'var(--sr-n1)', text: 'Nenhuma regra pegou. Abra e classifique.' },
};
export const faseLabel = (k) => (FASE[k] || FASE.sem_classificacao).label;
export const kindOf = (i) => i.kind || 'sem_classificacao';
export const sumOf = (list) => list.reduce((s, i) => s + (Number(i.amount) || 0), 0);

const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
    'setembro', 'outubro', 'novembro', 'dezembro'];
export const ymLong = (ym) => {
    const [y, m] = String(ym).split('-');
    return `${MESES_LONGOS[Number(m) - 1] || m} de ${y}`;
};

export const currentYm = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const ymShift = (ym, delta) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export function ymRange(from, to) {
    const out = [];
    let cur = from;
    let guard = 0;
    while (cur <= to && guard++ < 240) { out.push(cur); cur = ymShift(cur, 1); }
    return out;
}

/** Chave da categoria do lançamento: a categoria, ou a conta quando não tem. */
export const catKey = (i) => (i.categoryId ? `cat:${i.categoryId}` : `conta:${i.contaCode}`);
export const catLabel = (i) => i.categoryName || i.contaName || i.contaCode || 'Sem categoria';

/** Meses do relatório: do primeiro pagamento (ou da inauguração) até o mês corrente. */
export function reportMonths(items, openedAt) {
    const yms = items.map((i) => i.lastYm || i.firstYm).filter(Boolean);
    const now = currentYm();
    let first = yms.length ? yms.reduce((a, b) => (a < b ? a : b)) : now;
    if (openedAt && openedAt.slice(0, 7) < first) first = openedAt.slice(0, 7);
    return ymRange(first, now);
}

/** Um lançamento pode ser pago em dois meses: o mês do recorte é por pagamento. */
export function amountIn(item, ym) {
    return (item.months || []).filter((m) => m.ym === ym).reduce((s, m) => s + (Number(m.amount) || 0), 0);
}
export const paidIn = (item, ym) => (item.months || []).some((m) => m.ym === ym);
export const paidOn = (item, day) => (item.months || []).some((m) => m.paidAt === day) || item.paidAt === day;

/**
 * Recorte que um clique abre. Devolve { eyebrow, title, list, amountOf }.
 * `amountOf` existe por causa do recorte por mês: um lançamento pago em dois
 * meses entra no modal de cada mês só com a parte daquele mês.
 */
export function scopeFor(key, ctx) {
    const [tipo, a, b] = String(key).split('|');
    const all = ctx.items;
    const whole = (i) => Number(i.amount) || 0;
    if (tipo === 'all') return { eyebrow: 'Gasto total', title: 'Todos os lançamentos do stand', list: all, amountOf: whole };
    if (tipo === 'kind') return { eyebrow: 'Fase', title: faseLabel(a), list: all.filter((i) => kindOf(i) === a), amountOf: whole };
    if (tipo === 'grp') {
        const g = (ctx.grupos || []).find((x) => x.key === a);
        return { eyebrow: 'Natureza', title: g?.label || 'Natureza', list: all.filter((i) => ctx.groupOf(i) === a), amountOf: whole };
    }
    if (tipo === 'mgrp') {
        const g = (ctx.grupos || []).find((x) => x.key === b);
        return {
            eyebrow: g?.label || 'Natureza',
            title: ymLong(a) + (a === currentYm() ? ' (em andamento)' : ''),
            list: all.filter((i) => paidIn(i, a) && ctx.groupOf(i) === b),
            amountOf: (i) => amountIn(i, a),
        };
    }
    if (tipo === 'cat') {
        const list = all.filter((i) => catKey(i) === a);
        return { eyebrow: 'Categoria', title: list[0] ? catLabel(list[0]) : 'Categoria', list, amountOf: whole };
    }
    if (tipo === 'month') {
        const list = all.filter((i) => paidIn(i, a) && (!b || kindOf(i) === b));
        return {
            eyebrow: b ? faseLabel(b) : 'Mês',
            title: ymLong(a) + (a === currentYm() ? ' (em andamento)' : ''),
            list, amountOf: (i) => amountIn(i, a),
        };
    }
    if (tipo === 'catmonth') {
        const list = all.filter((i) => catKey(i) === a && paidIn(i, b) && kindOf(i) === 'recorrencia');
        return {
            eyebrow: list[0] ? catLabel(list[0]) : 'Categoria',
            title: ymLong(b), list, amountOf: (i) => amountIn(i, b),
        };
    }
    if (tipo === 'day') {
        const list = all.filter((i) => paidOn(i, a));
        const [y, m, d] = a.split('-');
        return { eyebrow: 'Dia de pagamento', title: `${d}/${m}/${y}`, list, amountOf: whole };
    }
    if (tipo === 'note') {
        const n = (ctx.notes || []).find((x) => x.id === a);
        return { eyebrow: 'Pendência', title: n?.title || '', list: n?.items || [], amountOf: whole, note: n };
    }
    return { eyebrow: '', title: '', list: [], amountOf: whole };
}

/**
 * Contas que vencem todo mês (categoria com "vence todo mês") e não foram
 * pagas em algum mês FECHADO com o stand aberto. O primeiro mês cheio é o
 * seguinte ao da inauguração; sem inauguração, o primeiro mês com gasto de
 * recorrência.
 */
export function monthlyGaps(categories, items, openedAt) {
    const mensais = (categories || []).filter((c) => c.expected_monthly && c.is_active !== false);
    if (!mensais.length) return [];
    const fechadoAte = ymShift(currentYm(), -1);
    let inicio = openedAt ? ymShift(openedAt.slice(0, 7), 1) : null;
    if (!inicio) {
        const rec = items.filter((i) => i.kind === 'recorrencia').map((i) => i.firstYm).filter(Boolean).sort();
        inicio = rec[0] || null;
    }
    if (!inicio || inicio > fechadoAte) return [];
    const meses = ymRange(inicio, fechadoAte);
    const out = [];
    for (const c of mensais) {
        const daCat = items.filter((i) => Number(i.categoryId) === Number(c.id));
        const faltam = meses.filter((ym) => !daCat.some((i) => paidIn(i, ym)));
        if (!faltam.length) continue;
        out.push({ category: c, missing: faltam, never: !daCat.length, items: daCat });
    }
    return out;
}

/** As pendências do stand, na ordem em que valem ser resolvidas. */
export function buildNotes({ items, outside, categories, openedAt, contaPrefix = '20207' }) {
    const notes = [];
    if (outside.length) {
        notes.push({
            id: 'fora-depto',
            title: outside.length === 1 ? 'Título de stand fora do departamento' : `${outside.length} títulos de stand fora do departamento`,
            text: `Estão numa conta do plano de stand, mas sem o departamento Stand de Vendas no Sienge. Por isso ficam fora de todos os números desta tela. Com eles, o gasto total iria a ${fmtMoney(sumOf(items) + sumOf(outside))}.`,
            act: 'Acerto no Sienge: apropriar o título ao departamento Stand de Vendas. Na próxima carga ele entra sozinho.',
            items: outside,
            tone: 'warn',
        });
    }
    const semClasse = items.filter((i) => !i.kind);
    if (semClasse.length) {
        notes.push({
            id: 'sem-classe',
            title: `${semClasse.length} lançamento${semClasse.length > 1 ? 's' : ''} sem classificação`,
            text: 'Nenhuma conta, regra por palavra ou janela de montagem pegou estes lançamentos, então eles não somam em construção, recorrência nem esporádico.',
            act: 'Abra cada um e classifique, ou crie uma regra em Categorias › Classificação automática para pegar os próximos sozinha.',
            items: semClasse,
            tone: 'warn',
        });
    }
    for (const g of monthlyGaps(categories, items, openedAt)) {
        notes.push({
            id: `mensal-${g.category.id}`,
            title: g.never
                ? `${g.category.name}: nenhum pagamento desde a inauguração`
                : `${g.category.name}: sem pagamento em ${g.missing.map(fmtYm).join(', ')}`,
            text: 'Esta conta vence todo mês com o stand aberto. Pode estar no nome do locador, embutida no aluguel, lançada em outro centro de custo ou ainda não lançada.',
            act: 'Conferir com o administrativo da praça.',
            items: g.items,
            tone: 'info',
        });
    }
    const forado = items.filter((i) => i.standPlan === false);
    if (forado.length) {
        notes.push({
            id: 'fora-plano',
            title: `${forado.length} lançamento${forado.length > 1 ? 's' : ''} fora do plano do stand`,
            text: `Estão no departamento do stand, mas numa conta fora do plano ${contaPrefix.replace(/^(\d)(\d{2})(\d{2})$/, '$1.$2.$3')} (adiantamento, brindes, contas Adm e Obra). Entram no gasto pela classificação, não pela conta.`,
            act: 'Já estão classificados pelas regras automáticas. Para os próximos stands: lançar direto nas contas de stand.',
            items: forado,
            tone: 'info',
            // Observação, não pendência: a classificação já resolveu.
            counted: false,
        });
    }
    return notes;
}

const fmtMoney = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "Rua X, 10 · Tel. (..) · Inaugurado em .." → só o que não é a inauguração. */
export function noteParts(notes) {
    return String(notes || '').split('·').map((p) => p.trim())
        .filter((p) => p && !/^Inaugurad[oa] em/i.test(p));
}

export function daysSince(iso) {
    if (!iso) return null;
    const ini = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((hoje - ini) / 86400000));
}

// Nome de credor como o Sienge guarda ("MERCADOPAGO.COM REPRESENTACOES",
// "53.515.687 JULIANA DIAS PRETO") vira algo legível na lista.
const SIGLAS = new Set(['LTDA', 'ME', 'EPP', 'SA', 'S/A', 'EIRELI', 'MEI', 'CPFL', 'SOS', 'GT', 'MTX', 'GPS', 'INSS', 'ISS']);
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em']);
export function niceName(raw) {
    const txt = String(raw || '').replace(/^[\d.\-/]+\s+/, '').trim();
    if (!txt) return 'Sem credor identificado';
    return txt.toLowerCase().split(/\s+/).map((w, i) => {
        const up = w.toUpperCase();
        if (SIGLAS.has(up)) return up;
        if (i > 0 && MINUSCULAS.has(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
}

/** Resumo da observação do título: "medição 3" ou o começo do texto. */
export function shortNote(notes) {
    const n = String(notes || '').replace(/\s+/g, ' ').trim();
    if (!n) return '';
    const med = n.match(/^Faturamento da medi[cç][aã]o (\d+)/i);
    if (med) return `medição ${med[1]}`;
    if (/Reten[cç][aã]o de INSS/i.test(n)) return 'INSS retido de prestador';
    const s = n.length > 70 ? `${n.slice(0, 70)}…` : n;
    return s.charAt(0) + s.slice(1).toLowerCase();
}

// ── Natureza (agrupamento dos gráficos) ─────────────────────────────────────
// O relatório pinta por NATUREZA: as maiores categorias, cada uma com um tom
// da família do seu tipo (azuis = implantação, verde-água = operação, âmbar =
// ajustes). Categoria pequena demais para ter cor própria vai para "Outras".
export const TONS = {
    construcao: ['var(--sr-c1)', 'var(--sr-c2)', 'var(--sr-c3)'],
    recorrencia: ['var(--sr-r1)', 'var(--sr-r2)', 'var(--sr-r3)'],
    esporadica: ['var(--sr-e1)', 'var(--sr-e2)'],
    sem_classificacao: ['var(--sr-n1)'],
};
export const OUTRAS = { key: '__outras', label: 'Outras', color: 'var(--sr-n2)', kind: null };

export function buildGroups(items, max = 6) {
    const map = new Map();
    for (const i of items) {
        const k = catKey(i);
        const g = map.get(k) || { key: k, label: catLabel(i), value: 0, n: 0, kinds: new Map() };
        g.value += Number(i.amount) || 0;
        g.n += 1;
        g.kinds.set(kindOf(i), (g.kinds.get(kindOf(i)) || 0) + (Number(i.amount) || 0));
        map.set(k, g);
    }
    const todas = [...map.values()].sort((a, b) => b.value - a.value)
        .map((g) => ({ ...g, kind: [...g.kinds.entries()].sort((a, b) => b[1] - a[1])[0][0] }));
    const proprias = todas.slice(0, todas.length > max ? max - 1 : max);
    const usados = {};
    const grupos = proprias.map((g) => {
        const tons = TONS[g.kind] || TONS.sem_classificacao;
        const idx = usados[g.kind] || 0;
        usados[g.kind] = idx + 1;
        return { key: g.key, label: g.label, kind: g.kind, value: g.value, n: g.n, color: tons[Math.min(idx, tons.length - 1)] };
    });
    const resto = todas.slice(proprias.length);
    if (resto.length) {
        grupos.push({ ...OUTRAS, value: resto.reduce((s, g) => s + g.value, 0), n: resto.reduce((s, g) => s + g.n, 0), members: resto.map((g) => g.key) });
    }
    const groupOf = (i) => {
        const k = catKey(i);
        return grupos.find((g) => g.key === k) ? k : OUTRAS.key;
    };
    // Ordem de leitura: implantação, ajustes, operação (o empilhamento segue).
    const ordem = { construcao: 0, esporadica: 1, recorrencia: 2, sem_classificacao: 3 };
    grupos.sort((a, b) => (a.key === OUTRAS.key) - (b.key === OUTRAS.key) || (ordem[a.kind] ?? 9) - (ordem[b.kind] ?? 9) || b.value - a.value);
    return { grupos, groupOf };
}
