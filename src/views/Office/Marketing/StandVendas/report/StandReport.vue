<script setup>
/**
 * Relatório do stand, no desenho do relatório aprovado em HTML (08/10/2026).
 * Leitura de cima para baixo: capa, quatro números, mês a mês, natureza e
 * ritmo, fases, contra o modelo, operação, o stand, lançamentos, ressalvas e
 * método. Todo número abre o ReportDialog com os pagamentos que o formam.
 *
 * Os gráficos são SVG próprios (como no HTML): poucas marcas, animação de
 * entrada curta e clique em cada pedaço.
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useCountUp } from '@/composables/useCountUp';
import { STATUS_META } from '@/stores/Marketing/SalesStand/salesStandStore';
import ReportDialog from './ReportDialog.vue';
import SrTip from './SrTip.vue';
import { fmtBRL, fmtDate, fmtYm, fmtValueRange, fmtAreaRange } from '../standFormat';
import {
    KIND_ORDER, FASE, faseLabel, kindOf, sumOf, catKey, catLabel, reportMonths, amountIn, currentYm,
    buildNotes, noteParts, daysSince, niceName, shortNote, buildGroups, loadReportFonts,
} from './reportModel';
import './standReport.css';

const props = defineProps({
    stand: { type: Object, required: true },
    expenses: { type: Array, default: () => [] },
    outside: { type: Array, default: () => [] },
    categories: { type: Array, default: () => [] },
    categoryOptions: { type: Array, default: () => [] },
    canManage: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
});
const emit = defineEmits(['classify', 'edit']);

onMounted(loadReportFonts);

// ── Números-base ─────────────────────────────────────────────────────────────
const items = computed(() => props.expenses);
const total = computed(() => sumOf(items.value));
const byKind = (k) => sumOf(items.value.filter((i) => kindOf(i) === k));
const implantacao = computed(() => byKind('construcao'));
const ajustes = computed(() => byKind('esporadica'));
const operacao = computed(() => byKind('recorrencia'));
const semClasse = computed(() => byKind('sem_classificacao'));
const monthly = computed(() => Number(props.stand.recurring_monthly) || 0);
const openedAt = computed(() => (props.stand.opened_at ? String(props.stand.opened_at).slice(0, 10) : ''));
const dias = computed(() => daysSince(openedAt.value));
const months = computed(() => reportMonths(items.value, openedAt.value));
const definido = computed(() => props.stand.status === 'defined');
const implantacaoKpi = computed(() => (definido.value ? Number(props.stand.construction_value) || 0 : implantacao.value));

const notes = computed(() => buildNotes({ items: items.value, outside: props.outside, categories: props.categories, openedAt: openedAt.value }));
const pendentes = computed(() => notes.value.filter((n) => n.counted !== false));

const grouping = computed(() => buildGroups(items.value));
const grupos = computed(() => grouping.value.grupos);
const groupOf = (i) => grouping.value.groupOf(i);

const cTotal = useCountUp(total, { duration: 850 });
const cImpl = useCountUp(implantacaoKpi, { duration: 850 });
const cMes = useCountUp(monthly, { duration: 850 });

// As dicas vão por v-html: nome de categoria vem do cadastro e é escapado.
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmtK = (v) => `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
const fmtKc = (v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }));

// ── Capa ─────────────────────────────────────────────────────────────────────
const partes = computed(() => {
    const nome = String(props.stand.name || '');
    const i = nome.indexOf(' - ');
    return i > 0 ? { cidade: nome.slice(0, i), emp: nome.slice(i + 3) } : { cidade: '', emp: nome };
});
const endereco = computed(() => noteParts(props.stand.notes));
const status = computed(() => STATUS_META[props.stand.status] || STATUS_META.draft);
const modelo = computed(() => props.stand.model || null);
const faixa = computed(() => (modelo.value ? fmtValueRange(modelo.value) : ''));
const fotos = computed(() => props.stand.images || []);
const itensPresentes = computed(() => (props.stand.items || []).filter((i) => i.present !== false));

// ── Modal ────────────────────────────────────────────────────────────────────
const dlgOpen = ref(false);
const dlgRoot = ref(null);
const abrir = (view) => { dlgRoot.value = { ...view, n: Date.now() }; dlgOpen.value = true; };
const lista = (key) => abrir({ type: 'list', key });

// ── Clique e teclado nos gráficos (a dica é o SrTip) ───────────────────────────
function onKeyOpen(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target.closest?.('[data-open]');
    if (!el) return;
    e.preventDefault();
    lista(el.dataset.open);
}
function onClickOpen(e) {
    const el = e.target.closest?.('[data-open]');
    if (el) lista(el.dataset.open);
}

// ── Mês a mês (barras empilhadas por natureza) ───────────────────────────────
const W = 880; const H = 300; const PL = 56; const PR = 12; const PT = 26; const PB = 30;
const nice = (v) => {
    if (v <= 0) return 1000;
    const p = 10 ** Math.floor(Math.log10(v));
    const f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
};
const bars = computed(() => {
    const cols = months.value.map((ym) => {
        const parts = grupos.value.map((g) => ({
            g, v: items.value.filter((i) => groupOf(i) === g.key).reduce((s, i) => s + amountIn(i, ym), 0),
        }));
        return { ym, parts, total: parts.reduce((s, p) => s + p.v, 0) };
    });
    const max = nice(Math.max(1, ...cols.map((c) => c.total)) * 1.08);
    const y = (v) => PT + (H - PT - PB) * (1 - v / max);
    const bw = (W - PL - PR) / Math.max(1, cols.length);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: max * f, y: y(max * f) }));
    return {
        ticks,
        cols: cols.map((c, k) => {
            const x = PL + k * bw + bw * 0.22;
            const w = bw * 0.56;
            let acc = 0;
            const segs = c.parts.filter((p) => p.v > 0).map((p) => {
                const y0 = y(acc); const y1 = y(acc + p.v);
                acc += p.v;
                return { ...p, x, w, y: y1, h: Math.max(y0 - y1, 1.5) };
            });
            return { ...c, x, w, hitX: PL + k * bw + 4, hitW: bw - 8, top: y(c.total), segs, label: fmtYm(c.ym), parcial: c.ym === currentYm() };
        }),
        bottom: y(0),
    };
});

// ── Natureza (rosca) ─────────────────────────────────────────────────────────
const R = 62; const C = 2 * Math.PI * R;
const donutDraw = ref(0);
const donut = computed(() => {
    const tot = total.value || 1;
    let off = 0;
    return grupos.value.filter((g) => g.value > 0).map((g) => {
        const len = (g.value / tot) * C;
        const seg = { ...g, len, off, pct: (g.value / tot) * 100 };
        off += len;
        return seg;
    });
});

// ── Gasto acumulado (degraus) ────────────────────────────────────────────
const CW = 520; const CH = 230; const CPL = 46; const CPR = 14; const CPT = 16; const CPB = 28;
const cumLen = ref(0);
const cumPath = ref(null);
const cum = computed(() => {
    const map = new Map();
    for (const i of items.value) {
        for (const m of i.months || []) {
            const d = m.paidAt || i.paidAt;
            if (d) map.set(d, (map.get(d) || 0) + (Number(m.amount) || 0));
        }
    }
    let acc = 0;
    const pts = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => { acc += v; return { d, v, acc }; });
    if (!pts.length) return null;
    const ini = `${months.value[0]}-01`;
    const hoje = new Date().toISOString().slice(0, 10);
    const d0 = Date.parse(ini); const d1 = Math.max(Date.parse(hoje), Date.parse(pts[pts.length - 1].d) + 86400000);
    const x = (s) => CPL + ((Date.parse(s) - d0) / (d1 - d0)) * (CW - CPL - CPR);
    const max = nice(acc * 1.05);
    const y = (v) => CPT + (CH - CPT - CPB) * (1 - v / max);
    let path = `M${x(ini).toFixed(1)},${y(0).toFixed(1)}`;
    pts.forEach((p) => { path += ` H${x(p.d).toFixed(1)} V${y(p.acc).toFixed(1)}`; });
    path += ` H${(CW - CPR).toFixed(1)}`;
    return {
        path, area: `${path} V${y(0).toFixed(1)} Z`,
        pts: pts.map((p) => ({ ...p, cx: x(p.d), cy: y(p.acc) })),
        ticks: [0, 1 / 3, 2 / 3, 1].map((f) => ({ v: max * f, y: y(max * f) })),
        meses: months.value.map((ym) => ({ ym, x: x(`${ym}-01`) })).filter((m) => m.x >= CPL - 1),
        inaug: openedAt.value && Date.parse(openedAt.value) >= d0 ? x(openedAt.value) : null,
        base: y(0),
    };
});

// ── Fases ────────────────────────────────────────────────────────────────────
const fases = computed(() => [
    { k: 'construcao', v: implantacao.value },
    { k: 'esporadica', v: ajustes.value },
    { k: 'recorrencia', v: operacao.value },
    ...(semClasse.value > 0 ? [{ k: 'sem_classificacao', v: semClasse.value }] : []),
]);

// ── Contra o modelo ──────────────────────────────────────────────────────────
const range = computed(() => {
    const m = modelo.value;
    const min = Number(m?.avg_value_min) || 0;
    const max = Number(m?.avg_value_max) || 0;
    if (!min && !max) return null;
    const montagem = implantacao.value + ajustes.value;
    const lo = Math.min(min, implantacao.value) * 0.75;
    const hi = Math.max(max || min * 1.4, montagem) * 1.15;
    const pct = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)).toFixed(2)}%`;
    const onde = max && implantacao.value > max ? 'acima da' : implantacao.value < min ? 'abaixo da' : (max && implantacao.value > max * 0.9 ? 'no teto da' : 'dentro da');
    return { min, max, montagem, pct, onde };
});

// ── Operação mês a mês ───────────────────────────────────────────────────────
const recorrentes = computed(() => items.value.filter((i) => i.kind === 'recorrencia'));
const opMonths = computed(() => months.value.filter((ym) => recorrentes.value.some((i) => amountIn(i, ym) > 0)));
const opRows = computed(() => {
    const keys = [...new Map(recorrentes.value.map((i) => [catKey(i), catLabel(i)])).entries()];
    return keys.map(([key, label]) => {
        const da = recorrentes.value.filter((i) => catKey(i) === key);
        return { key, label, total: sumOf(da), cells: opMonths.value.map((ym) => ({ ym, v: da.reduce((s, i) => s + amountIn(i, ym), 0) })) };
    }).sort((a, b) => b.total - a.total);
});
const opTotals = computed(() => opMonths.value.map((ym) => recorrentes.value.reduce((s, i) => s + amountIn(i, ym), 0)));

// ── Lançamentos ──────────────────────────────────────────────────────────────
const fFase = ref('');
const fCat = ref('');
const fBusca = ref('');
const fasesFiltro = computed(() => KIND_ORDER.filter((k) => items.value.some((i) => kindOf(i) === k)));
const catsFiltro = computed(() => [...new Map(items.value.map((i) => [catKey(i), catLabel(i)])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1])));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const filtrados = computed(() => {
    const q = norm(fBusca.value);
    return items.value.filter((i) => (!fFase.value || kindOf(i) === fFase.value)
        && (!fCat.value || catKey(i) === fCat.value)
        && (!q || norm([i.supplier, niceName(i.supplier), i.contaCode, i.contaName, i.categoryName, i.billId, i.docNumber, i.notes].join(' ')).includes(q)))
        .sort((a, b) => (a.paidAt || '').localeCompare(b.paidAt || '') || b.amount - a.amount);
});
const corGrupo = (i) => grupos.value.find((g) => g.key === groupOf(i))?.color || 'var(--sr-n2)';

// ── Entrada animada dos gráficos ─────────────────────────────────────────────
let raf = null;
onMounted(async () => {
    await nextTick();
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (cumPath.value) cumLen.value = cumPath.value.getTotalLength();
    if (reduzido) { donutDraw.value = 1; return; }
    const t0 = performance.now();
    const step = (t) => {
        const p = Math.min((t - t0) / 1000, 1);
        donutDraw.value = 1 - (1 - p) ** 3;
        if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
});
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf); });
</script>

<template>
    <div class="sr sr-page">

        <!-- ══ Capa ══ -->
        <header class="cover">
            <div class="cover-text">
                <p class="eyebrow">Relatório de stand de vendas · dados do Sienge</p>
                <h1 class="display">{{ partes.emp }}<template v-if="partes.cidade"><br>{{ partes.cidade }}</template></h1>
                <div class="cover-meta">
                    <p v-for="p in endereco" :key="p">{{ p }}</p>
                    <p v-if="openedAt">Inaugurado em <b>{{ fmtDate(openedAt) }}</b> · no ar há <b>{{ dias }} dias</b></p>
                    <p v-if="modelo">Modelo de referência: <b>{{ modelo.name }}</b>
                        <template v-if="faixa || fmtAreaRange(modelo)"> ({{ [faixa, fmtAreaRange(modelo)].filter(Boolean).join(', ') }})</template>
                    </p>
                </div>
                <div class="chips">
                    <span class="chip" :class="{ ok: definido }"><i :class="status.icon"></i>{{ status.label }}</span>
                    <span v-for="cc in stand.cost_centers || []" :key="cc.code" class="chip" :title="cc.name">CC <b>{{ cc.code }}</b> {{ cc.name }}</span>
                    <button v-if="canManage" type="button" class="chip dashed" @click="emit('edit')"><i class="fas fa-pen"></i>Editar dados</button>
                </div>
            </div>
            <figure v-if="fotos.length">
                <button type="button" class="cover-photo" :aria-label="'Ampliar: ' + (fotos[0].caption || 'foto do stand')" @click="abrir({ type: 'photo', idx: 0 })">
                    <img :src="fotos[0].url" :alt="fotos[0].caption || stand.name" />
                </button>
                <figcaption>{{ fotos[0].caption || 'Fachada do stand' }}</figcaption>
            </figure>
        </header>

        <!-- ══ Quatro números ══ -->
        <div class="kpis">
            <button type="button" class="kpi" :data-tip="`<b>Gasto total</b><span class='t'>Tudo o que o Sienge pagou para o stand (${fmtBRL(total)}). Clique para ver os pagamentos</span>`" @click="lista('all')">
                <span class="eyebrow">Gasto total</span>
                <span class="v display" :class="{ counting: cTotal.counting.value }">{{ fmtK(cTotal.display.value) }}</span>
                <span class="d">{{ items.length }} pagamentos no Sienge</span>
                <span class="go">Ver todos</span>
            </button>
            <button type="button" class="kpi" :data-tip="`<b>Implantação</b><span class='t'>Montar o stand: ${fmtBRL(implantacaoKpi)}${faixa ? `. O ${esc(modelo?.name)} prevê ${faixa}` : ''}</span>`" @click="lista('kind|construcao')">
                <span class="eyebrow">Implantação<i v-if="definido" class="fas fa-lock"></i></span>
                <span class="v display" :class="{ counting: cImpl.counting.value }">{{ fmtK(cImpl.display.value) }}</span>
                <span class="d">{{ definido ? `congelada em ${fmtDate(stand.defined_at)}` : 'obra, móveis e comunicação visual' }}</span>
                <span class="go">Ver a implantação</span>
            </button>
            <button type="button" class="kpi" data-tip="<b>Para manter</b><span class='t'>Custo mensal conta a conta, pela média dos últimos meses fechados. Clique para ver a conta</span>" @click="abrir({ type: 'run' })">
                <span class="eyebrow">Para manter</span>
                <span class="v display" :class="{ counting: cMes.counting.value }">{{ fmtK(cMes.display.value) }}<small>/mês</small></span>
                <span class="d">aluguel, contas e consumo</span>
                <span class="go">Ver a conta</span>
            </button>
            <button type="button" class="kpi" data-tip="<b>Pendências</b><span class='t'>O que falta acertar no Sienge ou na classificação. Clique para descer até elas</span>" @click="$refs.ressalvas?.scrollIntoView({ behavior: 'smooth', block: 'start' })">
                <span class="eyebrow">Pendências</span>
                <span class="v display" :class="pendentes.length ? 'warn' : 'ok'">{{ pendentes.length }}</span>
                <span class="d">{{ pendentes.length ? 'no Sienge e na classificação' : 'nada a acertar' }}</span>
                <span class="go">{{ pendentes.length ? 'Ver o que acertar' : 'Ver detalhes' }}</span>
            </button>
        </div>

        <!-- ══ Mês a mês ══ -->
        <section>
            <div class="section-head">
                <p class="eyebrow">Mês a mês</p>
                <h2 class="display">Quando o dinheiro saiu</h2>
                <p>Valores pelo mês do pagamento, por natureza. A montagem pesa nos primeiros meses; depois sobra o custo de manter o stand aberto.</p>
            </div>
            <div class="sr-panel">
                <div class="sr-panel-head">
                    <div class="legend">
                        <button v-for="g in grupos" :key="g.key" type="button" :data-tip="`<b>${esc(g.label)}</b><span class='t'>${fmtBRL(g.value)} em ${g.n} pagamentos. Clique para ver</span>`" @click="lista(`grp|${g.key}`)"><i class="sw" :style="{ background: g.color }"></i>{{ g.label }}</button>
                    </div>
                    <span class="hint">Clique num mês ou numa cor para ver os pagamentos</span>
                </div>
                <div class="chart-scroll" @click="onClickOpen" @keydown="onKeyOpen">
                    <svg :viewBox="`0 0 ${W} ${H}`" width="100%" class="chart" role="group" aria-label="Gasto do stand por mês de pagamento">
                        <g v-for="t in bars.ticks" :key="t.v">
                            <line class="grid" :x1="PL" :x2="W - PR" :y1="t.y" :y2="t.y" />
                            <text :x="PL - 8" :y="t.y + 4" text-anchor="end">{{ t.v ? fmtKc(t.v) : '0' }}</text>
                        </g>
                        <g v-for="(c, k) in bars.cols" :key="c.ym" class="col" tabindex="0" role="button"
                            :data-open="`month|${c.ym}`" :aria-label="`${c.label}: ${fmtBRL(c.total)}`">
                            <rect class="hit" :x="c.hitX" :y="PT - 20" :width="c.hitW" :height="H - PT - PB + 20" rx="6" />
                            <g class="stack" :style="{ animationDelay: `${k * 90 + 150}ms` }">
                                <rect v-for="s in c.segs" :key="s.g.key" :x="s.x" :y="s.y" :width="s.w" :height="s.h" :fill="s.g.color"
                                    :data-open="`mgrp|${c.ym}|${s.g.key}`" :data-tip="`${esc(s.g.label)} · ${c.label}<br><b>${fmtBRL(s.v)}</b>`" />
                            </g>
                            <text v-if="c.total" class="val" :x="c.x + c.w / 2" :y="c.top - 7" text-anchor="middle">{{ fmtKc(c.total) }}</text>
                            <text :x="c.x + c.w / 2" :y="H - 9" text-anchor="middle">{{ c.label }}{{ c.parcial ? ' (parcial)' : '' }}</text>
                        </g>
                    </svg>
                </div>
            </div>
        </section>

        <!-- ══ Natureza e ritmo ══ -->
        <section>
            <div class="section-head">
                <p class="eyebrow">Composição e ritmo</p>
                <h2 class="display">Para onde foi o dinheiro e em que ritmo</h2>
            </div>
            <div class="two">
                <div class="sr-panel">
                    <h3>Por natureza</h3>
                    <div class="donut-wrap" @click="onClickOpen" @keydown="onKeyOpen">
                        <svg viewBox="0 0 170 170" width="170" height="170" class="donut" role="group" aria-label="Gasto por natureza">
                            <circle cx="85" cy="85" :r="R" fill="none" stroke="var(--sr-sunken)" stroke-width="24" />
                            <circle v-for="s in donut" :key="s.key" class="seg" cx="85" cy="85" :r="R" fill="none" :stroke="s.color" stroke-width="24"
                                :stroke-dasharray="`${s.len * donutDraw} ${C - s.len * donutDraw}`" :stroke-dashoffset="-s.off * donutDraw"
                                transform="rotate(-90 85 85)" tabindex="0" role="button" :data-open="`grp|${s.key}`"
                                :aria-label="`${s.label}: ${fmtBRL(s.value)}`" :data-tip="`${esc(s.label)}<br><b>${fmtBRL(s.value)}</b>`" />
                            <text class="c1" x="85" y="88" text-anchor="middle">{{ fmtK(total).replace(' mil', '') }}</text>
                            <text class="c2" x="85" y="106" text-anchor="middle">mil no total</text>
                        </svg>
                        <div class="dlist">
                            <button v-for="s in donut" :key="s.key" type="button" :data-open="`grp|${s.key}`" :data-tip="`<b>${esc(s.label)}</b><span class='t'>${fmtBRL(s.value)} · ${s.n} pagamentos</span>`">
                                <i class="sw" :style="{ background: s.color }"></i>
                                <span>{{ s.label }} <span class="muted">· {{ s.n }}</span></span>
                                <span class="pc num">{{ s.pct < 1 ? 'menos de 1' : s.pct.toFixed(1).replace('.', ',') }}%</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="sr-panel">
                    <div class="sr-panel-head"><h3>Gasto acumulado</h3><span class="hint">Cada ponto é um dia de pagamento</span></div>
                    <div v-if="cum" class="chart-scroll" @click="onClickOpen" @keydown="onKeyOpen">
                        <svg :viewBox="`0 0 ${CW} ${CH}`" width="100%" class="chart cum" role="group" aria-label="Gasto acumulado por data de pagamento">
                            <g v-for="t in cum.ticks" :key="t.v">
                                <line class="grid" :x1="CPL" :x2="CW - CPR" :y1="t.y" :y2="t.y" />
                                <text :x="CPL - 6" :y="t.y + 4" text-anchor="end">{{ t.v ? fmtKc(t.v) : '0' }}</text>
                            </g>
                            <text v-for="m in cum.meses" :key="m.ym" :x="m.x" :y="CH - 8">{{ fmtYm(m.ym).slice(0, 3) }}</text>
                            <template v-if="cum.inaug !== null">
                                <line class="inaug" :x1="cum.inaug" :x2="cum.inaug" :y1="CPT" :y2="cum.base" />
                                <text class="inaug-t" :x="cum.inaug + 5" :y="CPT + 10">inauguração {{ fmtDate(openedAt).slice(0, 5) }}</text>
                            </template>
                            <path class="area" :d="cum.area" />
                            <path ref="cumPath" class="line" :d="cum.path"
                                :style="cumLen ? { strokeDasharray: cumLen, strokeDashoffset: 0, '--len': cumLen } : {}" />
                            <circle v-for="(p, k) in cum.pts" :key="p.d" class="pt" :cx="p.cx" :cy="p.cy" r="4" tabindex="0" role="button"
                                :data-open="`day|${p.d}`" :aria-label="`${fmtDate(p.d)}: ${fmtBRL(p.v)}`"
                                :data-tip="`${fmtDate(p.d)} · ${fmtBRL(p.v)}<br>acumulado <b>${fmtBRL(p.acc)}</b>`"
                                :style="{ animationDelay: `${600 + k * 30}ms` }" />
                        </svg>
                    </div>
                </div>
            </div>
            <div class="phase-split" :class="{ four: fases.length > 3 }">
                <button v-for="f in fases" :key="f.k" type="button" class="phase" :style="{ borderTopColor: FASE[f.k].color }" :data-tip="`<b>${faseLabel(f.k)}</b><span class='t'>${FASE[f.k].text} Clique para ver os pagamentos</span>`" @click="lista(`kind|${f.k}`)">
                    <span class="eyebrow">{{ faseLabel(f.k) }}</span>
                    <span class="v num">{{ fmtBRL(f.v) }}</span>
                    <span class="t">{{ FASE[f.k].text }}</span>
                </button>
            </div>
        </section>

        <!-- ══ Contra o modelo ══ -->
        <section v-if="range">
            <div class="section-head">
                <p class="eyebrow">Contra o modelo</p>
                <h2 class="display">A implantação ficou {{ range.onde }} faixa do {{ modelo.name }}</h2>
                <p>O {{ modelo.name }} prevê {{ faixa }} para montar. A implantação custou {{ fmtBRL(implantacao) }}<template v-if="ajustes > 0">; somando os ajustes, {{ fmtBRL(range.montagem) }}</template>.</p>
            </div>
            <div class="sr-panel">
                <div class="legend static">
                    <span><i class="sw band"></i>Faixa do {{ modelo.name }}</span>
                    <span><i class="sw" style="background: var(--sr-c1); width: 3px"></i>Implantação <b class="num">{{ fmtBRL(implantacao) }}</b></span>
                    <span v-if="ajustes > 0"><i class="sw" style="background: var(--sr-e1); width: 3px"></i>Com ajustes <b class="num">{{ fmtBRL(range.montagem) }}</b></span>
                </div>
                <div class="range-track">
                    <div class="range-axis"></div>
                    <div class="range-band" :style="{ left: range.pct(range.min), width: `calc(${range.pct(range.max || range.min)} - ${range.pct(range.min)})` }"></div>
                    <div class="range-mark" :style="{ left: range.pct(implantacao), background: 'var(--sr-c1)' }" :data-tip="`Implantação<br><b>${fmtBRL(implantacao)}</b>`"></div>
                    <div v-if="ajustes > 0" class="range-mark" :style="{ left: range.pct(range.montagem), background: 'var(--sr-e1)' }" :data-tip="`Com ajustes<br><b>${fmtBRL(range.montagem)}</b>`"></div>
                </div>
                <div class="range-labels">
                    <span :style="{ left: range.pct(range.min) }">{{ fmtK(range.min).replace(',0', '') }}</span>
                    <span v-if="range.max" :style="{ left: range.pct(range.max) }">{{ fmtK(range.max).replace(',0', '') }}</span>
                </div>
            </div>
        </section>

        <!-- ══ Operação ══ -->
        <section v-if="opRows.length">
            <div class="section-head">
                <p class="eyebrow">Operação</p>
                <h2 class="display">Quanto custa manter o stand aberto</h2>
                <p>Perto de <button type="button" class="inline-link" @click="abrir({ type: 'run' })">{{ fmtBRL(monthly) }} por mês</button>, conta a conta pelos últimos meses fechados. Clique num valor para ver o pagamento.</p>
            </div>
            <div class="table-scroll">
                <table class="op">
                    <thead><tr><th>Conta</th><th v-for="ym in opMonths" :key="ym" class="r">{{ fmtYm(ym) }}{{ ym === currentYm() ? '*' : '' }}</th><th class="r">Total</th></tr></thead>
                    <tbody>
                        <tr v-for="r in opRows" :key="r.key">
                            <td>{{ r.label }}</td>
                            <td v-for="c in r.cells" :key="c.ym" class="r">
                                <button v-if="c.v" type="button" class="cell num" :data-tip="`<b>${esc(r.label)} · ${fmtYm(c.ym)}</b><span class='t'>Clique para ver o pagamento</span>`" @click="lista(`catmonth|${r.key}|${c.ym}`)">{{ fmtBRL(c.v) }}</button>
                                <span v-else class="muted">-</span>
                            </td>
                            <td class="r"><button type="button" class="cell num" @click="lista(`cat|${r.key}`)">{{ fmtBRL(r.total) }}</button></td>
                        </tr>
                        <tr class="total">
                            <td>Total da operação</td>
                            <td v-for="(v, j) in opTotals" :key="j" class="r"><button v-if="v" type="button" class="cell num" @click="lista(`month|${opMonths[j]}|recorrencia`)">{{ fmtBRL(v) }}</button><span v-else class="muted">-</span></td>
                            <td class="r"><button type="button" class="cell num" @click="lista('kind|recorrencia')">{{ fmtBRL(operacao) }}</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- ══ O stand ══ -->
        <section v-if="itensPresentes.length || fotos.length">
            <div class="section-head">
                <p class="eyebrow">O stand</p>
                <h2 class="display">O que o cliente encontra lá</h2>
            </div>
            <ul v-if="itensPresentes.length" class="items">
                <li v-for="i in itensPresentes" :key="i.label">{{ i.label }}</li>
            </ul>
            <div v-if="fotos.length" class="gallery">
                <button v-for="(f, k) in fotos" :key="f.id" type="button" :aria-label="'Ampliar: ' + (f.caption || 'foto')" @click="abrir({ type: 'photo', idx: k })">
                    <img :src="f.thumb_url || f.url" :alt="f.caption || 'Foto do stand'" loading="lazy" />
                </button>
            </div>
        </section>

        <!-- ══ Lançamentos ══ -->
        <section>
            <div class="section-head">
                <p class="eyebrow">Lançamentos</p>
                <h2 class="display">Todos os pagamentos, título a título</h2>
                <p>Cada linha é um título (ou parcela) pago no Sienge, com o valor que cabe ao stand. Clique numa linha para ver o detalhe.</p>
            </div>
            <div class="filters">
                <div class="seg" role="group" aria-label="Fase">
                    <button type="button" :aria-pressed="!fFase" data-tip="Mostra todas as fases" @click="fFase = ''">Todas</button>
                    <button v-for="k in fasesFiltro" :key="k" type="button" :aria-pressed="fFase === k" :data-tip="FASE[k].text" @click="fFase = k">{{ faseLabel(k) }}</button>
                </div>
                <select v-model="fCat" aria-label="Natureza">
                    <option value="">Toda natureza</option>
                    <option v-for="[k, l] in catsFiltro" :key="k" :value="k">{{ l }}</option>
                </select>
                <input v-model="fBusca" type="search" placeholder="Buscar fornecedor, conta ou título" aria-label="Buscar" />
            </div>
            <p class="fsum">{{ filtrados.length }} pagamento{{ filtrados.length === 1 ? '' : 's' }} · <b class="num">{{ fmtBRL(sumOf(filtrados)) }}</b></p>
            <div class="table-scroll">
                <table class="lanc">
                    <thead><tr><th>Pago em</th><th>Fornecedor</th><th>Natureza</th><th>Fase</th><th>Documento</th><th class="r">Valor</th></tr></thead>
                    <tbody>
                        <tr v-if="!filtrados.length"><td colspan="6" class="muted">Nenhum pagamento com esses filtros.</td></tr>
                        <tr v-for="i in filtrados" :key="i.key" class="row" tabindex="0"
                            @click="abrir({ type: 'item', key: i.key })" @keydown.enter="abrir({ type: 'item', key: i.key })">
                            <td class="num">{{ fmtDate(i.paidAt).slice(0, 5) }}</td>
                            <td>{{ niceName(i.supplier) }}<span v-if="shortNote(i.notes)" class="sub">{{ shortNote(i.notes) }}</span></td>
                            <td><span class="nat"><i class="sw" :style="{ background: corGrupo(i) }"></i>{{ catLabel(i) }}</span><span class="sub num">{{ i.contaCode }}</span></td>
                            <td><span class="pill" :data-tip="FASE[kindOf(i)]?.text"><i class="sw" :style="{ background: (FASE[kindOf(i)] || FASE.sem_classificacao).color }"></i>{{ faseLabel(kindOf(i)) }}</span></td>
                            <td class="num">{{ i.docType }} · {{ i.billId }}{{ i.installment > 1 ? '/' + i.installment : '' }}</td>
                            <td class="r num">{{ fmtBRL(i.amount) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- ══ Ressalvas ══ -->
        <section ref="ressalvas" class="anchor">
            <div class="section-head">
                <p class="eyebrow">Ressalvas</p>
                <h2 class="display">{{ pendentes.length ? 'O que precisa de acerto' : 'Nada a acertar' }}</h2>
                <p>{{ pendentes.length ? 'Achadas sozinhas a cada abertura. Resolvidas no Sienge ou na classificação, somem daqui.' : 'Tudo classificado, no departamento do stand, e as contas mensais apareceram em todos os meses.' }}</p>
            </div>
            <ol v-if="notes.length" class="notes">
                <li v-for="n in notes" :key="n.id" :class="{ info: n.counted === false || n.tone === 'info' }">
                    <b>{{ n.title }}</b>
                    <p>{{ n.text }}</p>
                    <p class="act">{{ n.act }}</p>
                    <button v-if="n.items.length" type="button" @click="lista(`note|${n.id}`)">
                        Ver {{ n.items.length === 1 ? 'o pagamento' : `os ${n.items.length} pagamentos` }} · {{ fmtBRL(sumOf(n.items)) }}
                    </button>
                </li>
            </ol>
        </section>

        <!-- ══ Método ══ -->
        <section>
            <div class="section-head">
                <p class="eyebrow">Método</p>
                <h2 class="display">Como os números foram tirados</h2>
            </div>
            <div class="method">
                <p><b>Fonte.</b> Backup do Sienge, centros de custo {{ (stand.cost_centers || []).map((c) => c.code).join(', ') || '-' }}.</p>
                <p><b>O que conta como gasto de stand.</b> Os títulos pagos na régua da aba Categorias (hoje, os apropriados ao departamento Stand de Vendas), pelo valor efetivamente pago: baixas de pagamento e adiantamento, sem estornos, com juros e multa e menos descontos, rateado pelo centro de custo e pelo departamento. Documentos PCT ficam fora.</p>
                <p><b>Fases e natureza.</b> Cada lançamento ganha natureza pela conta do Sienge ou, sem ela, por palavra no fornecedor e na observação. A fase vem da natureza e da janela de montagem: o que foi pago até alguns dias depois da inauguração é implantação; obra paga depois é ajuste. Classificação feita à mão vale sobre tudo.</p>
                <p><b>Para manter.</b> Cada conta de operação entra pela média dos meses em que foi paga nos últimos 3 meses fechados; conta que só apareceu no mês corrente entra pelo valor dele.</p>
            </div>
        </section>

        <SrTip />

        <ReportDialog :open="dlgOpen" :root="dlgRoot" :items="items" :outside="outside" :notes="notes"
            :grupos="grupos" :group-of="groupOf" :breakdown="stand.recurring_breakdown || []" :monthly="monthly"
            :photos="fotos" :category-options="categoryOptions" :can-manage="canManage" :saving="saving"
            @close="dlgOpen = false" @classify="(p) => emit('classify', p)" />
    </div>
</template>

<style scoped>
.sr-page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 44px; max-width: 1080px; margin: 0 auto; padding-block: 8px 48px; color: var(--sr-ink); font-size: 15px; line-height: 1.55; }
.sr-page > *:not(.tip) { animation: sr-rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.sr-page > *:nth-child(2) { animation-delay: 0.08s; }
.sr-page > *:nth-child(3) { animation-delay: 0.16s; }
.sr-page > *:nth-child(4) { animation-delay: 0.24s; }
.sr-page > *:nth-child(n+5) { animation-delay: 0.3s; }
section { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-width: 0; }
.section-head { display: grid; gap: 6px; }
.section-head h2 { margin: 0; font-size: 22px; font-weight: 700; }
.section-head p:not(.eyebrow) { color: var(--sr-muted); max-width: 70ch; }
p { margin: 0; }
h3 { margin: 0; font-size: 15px; font-weight: 600; }
.muted { color: var(--sr-muted); }
.anchor { scroll-margin-top: 80px; }

/* Capa */
.cover { display: grid; grid-template-columns: 1.05fr 1fr; gap: 28px; align-items: end; }
.cover-text { display: grid; gap: 14px; min-width: 0; }
.cover h1 { margin: 0; font-size: clamp(30px, 5vw, 46px); line-height: 1.05; font-weight: 700; }
.cover-meta { display: grid; gap: 4px; color: var(--sr-muted); font-size: 14px; }
.cover-meta b { color: var(--sr-ink); font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--sr-line); background: var(--sr-paper); color: var(--sr-muted); font-family: inherit; }
.chip b { color: var(--sr-ink); font-weight: 600; }
.chip.ok { color: var(--sr-ok); }
.chip.dashed { border-style: dashed; cursor: pointer; }
.chip.dashed:hover { color: var(--sr-ink); }
figure { margin: 0; min-width: 0; }
figcaption { font-size: 12.5px; color: var(--sr-muted); margin-top: 6px; }
.cover-photo { padding: 0; border: 0; background: none; display: block; width: 100%; cursor: zoom-in; border-radius: 8px; overflow: hidden; }
.cover-photo img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; transition: transform 0.4s; }
.cover-photo:hover img { transform: scale(1.015); }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 2px solid var(--sr-ink); border-bottom: 1px solid var(--sr-line); }
.kpi { padding: 16px 16px 18px; display: grid; gap: 4px; align-content: start; min-width: 0; text-align: left; background: none; border: 0; cursor: pointer; font: inherit; color: inherit; transition: background 0.2s; }
.kpi:first-child { padding-left: 0; }
.kpi + .kpi { border-left: 1px solid var(--sr-line); }
.kpi:hover { background: var(--sr-hover); }
.kpi:first-child:hover { background: none; }
.kpi:first-child:hover .v { color: var(--sr-accent); }
.kpi .eyebrow i { margin-left: 6px; }
.kpi .v { font-size: 30px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; white-space: nowrap; transition: color 0.26s; }
.kpi .v small { font-size: 15px; font-weight: 500; color: var(--sr-muted); }
.kpi .v.counting { color: var(--sr-accent); }
.kpi .v.warn { color: var(--sr-warn-ink); }
.kpi .v.ok { color: var(--sr-ok); }
.kpi .d { font-size: 13px; color: var(--sr-muted); }
.kpi .go { font-size: 12px; color: var(--sr-accent); font-weight: 600; margin-top: 4px; }

/* Painéis e gráficos */
.sr-panel { background: var(--sr-paper); border: 1px solid var(--sr-line); border-radius: 8px; padding: 20px; min-width: 0; display: grid; gap: 14px; align-content: start; }
.sr-panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; color: var(--sr-muted); }
.legend button, .legend span { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 2px 0; font: inherit; color: inherit; }
.legend button { cursor: pointer; }
.legend button:hover { color: var(--sr-ink); }
.legend b { color: var(--sr-ink); font-weight: 500; }
.legend.static { font-size: 13px; }
.sw.band { width: 14px; background: var(--sr-c3); opacity: 0.6; }
.hint { font-size: 12.5px; color: var(--sr-muted); display: inline-flex; align-items: center; gap: 6px; }
.hint::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--sr-accent); }
.chart-scroll { overflow-x: auto; }
.chart { display: block; min-width: 520px; }
.chart.cum { min-width: 420px; }
.chart text { fill: var(--sr-muted); font-size: 12px; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.chart .val { fill: var(--sr-ink); font-family: var(--sr-mono); font-weight: 500; }
.chart .grid { stroke: var(--sr-line); stroke-width: 1; }
.col { cursor: pointer; outline: none; }
.col .hit { fill: transparent; }
.col:hover .hit, .col:focus-visible .hit { fill: var(--sr-hover); }
.col:focus-visible .hit { stroke: var(--sr-accent); }
.stack { transform-box: fill-box; transform-origin: 50% 100%; animation: sr-grow 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.stack rect { transition: opacity 0.2s; }
.col:hover .stack rect { opacity: 0.85; }

.two { display: grid; grid-template-columns: 1fr 1.35fr; gap: 16px; }
.donut-wrap { display: grid; grid-template-columns: 170px 1fr; gap: 18px; align-items: center; }
.donut .seg { cursor: pointer; transition: stroke-width 0.2s; outline: none; }
.donut .seg:hover, .donut .seg:focus-visible { stroke-width: 30; }
.donut .c1 { font-family: var(--sr-display); font-size: 19px; font-weight: 700; fill: var(--sr-ink); }
.donut .c2 { font-size: 11px; fill: var(--sr-muted); }
.dlist { display: grid; gap: 2px; min-width: 0; }
.dlist button { display: grid; grid-template-columns: 12px 1fr auto; gap: 8px; align-items: center; background: none; border: 0; padding: 6px 8px; margin-inline: -8px; border-radius: 6px; cursor: pointer; text-align: left; font: inherit; font-size: 13.5px; color: inherit; }
.dlist button:hover { background: var(--sr-hover); }
.dlist .pc { font-size: 12.5px; color: var(--sr-muted); }
.cum .line { fill: none; stroke: var(--sr-accent); stroke-width: 2.2; animation: sr-draw 1.4s cubic-bezier(0.4, 0.1, 0.2, 1) 0.2s both; }
@keyframes sr-draw { from { stroke-dashoffset: var(--len, 0); } to { stroke-dashoffset: 0; } }
.cum .area { fill: var(--sr-accent); opacity: 0.1; }
.cum .pt { fill: var(--sr-paper); stroke: var(--sr-accent); stroke-width: 2; cursor: pointer; transition: r 0.15s; animation: sr-fade 0.3s ease both; outline: none; }
.cum .pt:hover, .cum .pt:focus-visible { r: 6; }
.cum .inaug { stroke: var(--sr-warn-ink); stroke-dasharray: 3 3; }
.cum .inaug-t { fill: var(--sr-warn-ink); font-weight: 600; font-size: 11.5px; }

.phase-split { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.phase-split.four { grid-template-columns: repeat(4, 1fr); }
.phase { border: 0; border-top: 3px solid; padding: 10px 10px 12px; display: grid; gap: 4px; text-align: left; background: none; cursor: pointer; border-radius: 0 0 6px 6px; transition: background 0.2s; align-content: start; font: inherit; color: inherit; }
.phase:hover { background: var(--sr-paper); }
.phase .v { font-size: 18px; font-weight: 500; }
.phase .t { font-size: 13px; color: var(--sr-muted); }

/* Faixa do modelo */
.range-track { position: relative; height: 34px; }
.range-axis { position: absolute; left: 0; right: 0; top: 15px; height: 4px; background: var(--sr-line); border-radius: 2px; }
.range-band { position: absolute; top: 11px; height: 12px; background: var(--sr-c3); opacity: 0.55; border-radius: 3px; }
.range-mark { position: absolute; top: 4px; width: 3px; height: 26px; border-radius: 2px; transform: translateX(-1px); animation: sr-slide 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both 0.3s; }
@keyframes sr-slide { from { left: 0; } }
.range-labels { position: relative; height: 18px; font-size: 12px; color: var(--sr-muted); }
.range-labels span { position: absolute; transform: translateX(-50%); white-space: nowrap; }

/* Tabelas */
.table-scroll { overflow-x: auto; border: 1px solid var(--sr-line); border-radius: 8px; background: var(--sr-paper); }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--sr-line); vertical-align: top; }
th { font-size: 11.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sr-muted); font-weight: 600; white-space: nowrap; }
td.r, th.r { text-align: right; white-space: nowrap; }
td .sub { display: block; font-size: 12px; color: var(--sr-muted); }
tr.total td { font-weight: 600; border-bottom: 0; }
.op td { vertical-align: middle; }
.op td.r { padding: 4px; }
.cell { width: 100%; text-align: right; padding: 5px 8px; border: 0; background: none; border-radius: 6px; cursor: pointer; font-size: 13.5px; color: inherit; white-space: nowrap; }
.cell:hover, .cell:focus-visible { background: var(--sr-hover); color: var(--sr-accent); }
.lanc tr.row { cursor: pointer; transition: background 0.15s; }
.lanc tr.row:hover, .lanc tr.row:focus-visible { background: var(--sr-hover); outline: none; }
.nat { display: inline-flex; align-items: center; gap: 6px; }
.pill { font-size: 11.5px; padding: 1px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--sr-line); color: var(--sr-muted); white-space: nowrap; }
.inline-link { border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: var(--sr-ink); text-decoration: underline dotted; text-underline-offset: 4px; cursor: pointer; }
.inline-link:hover { color: var(--sr-accent); }

/* Filtros */
.filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.seg { display: inline-flex; border: 1px solid var(--sr-line); border-radius: 8px; overflow: hidden; background: var(--sr-paper); max-width: 100%; overflow-x: auto; }
.seg button { border: 0; background: none; padding: 7px 12px; font: inherit; font-size: 13px; cursor: pointer; color: var(--sr-muted); min-height: 38px; white-space: nowrap; }
.seg button + button { border-left: 1px solid var(--sr-line); }
.seg button[aria-pressed="true"] { background: var(--sr-ink); color: var(--sr-paper); }
.filters select, .filters input { font: inherit; font-size: 13.5px; padding: 7px 10px; min-height: 38px; border: 1px solid var(--sr-line); border-radius: 8px; background: var(--sr-paper); color: var(--sr-ink); }
.filters input { flex: 1 1 200px; min-width: 0; }
.fsum { font-size: 13px; color: var(--sr-muted); }
.fsum b { color: var(--sr-ink); font-weight: 500; }

/* O stand */
.items { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 24px; padding: 0; margin: 0; list-style: none; }
.items li { padding-left: 20px; position: relative; }
.items li::before { content: ""; position: absolute; left: 2px; top: 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--sr-ok); }
.gallery { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.gallery button { padding: 0; border: 0; background: none; cursor: zoom-in; border-radius: 6px; overflow: hidden; display: block; }
.gallery img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; transition: transform 0.35s; }
.gallery button:hover img { transform: scale(1.05); }

/* Ressalvas */
.notes { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; counter-reset: n; }
.notes li { background: var(--sr-warn-bg); border: 1px solid var(--sr-warn-line); border-radius: 8px; padding: 14px 16px 14px 48px; position: relative; counter-increment: n; display: grid; gap: 6px; }
.notes li::before { content: counter(n); position: absolute; left: 16px; top: 13px; width: 22px; height: 22px; border-radius: 50%; background: var(--sr-warn-ink); color: var(--sr-warn-bg); font-size: 12px; font-weight: 600; display: grid; place-items: center; }
.notes li.info { background: var(--sr-paper); border-color: var(--sr-line); }
.notes li.info::before { background: var(--sr-muted); color: var(--sr-paper); }
.notes li p { font-size: 14px; }
.notes li .act { color: var(--sr-warn-ink); font-size: 13.5px; }
.notes li.info .act { color: var(--sr-muted); }
.notes li button { justify-self: start; border: 1px solid var(--sr-warn-line); background: var(--sr-paper); color: var(--sr-ink); border-radius: 6px; padding: 5px 11px; font: inherit; font-size: 13px; cursor: pointer; min-height: 36px; }
.notes li.info button { border-color: var(--sr-line); }

.method { font-size: 13.5px; color: var(--sr-muted); display: grid; gap: 8px; max-width: 78ch; }
.method b { color: var(--sr-ink); font-weight: 600; }


@media (max-width: 860px) {
    .two { grid-template-columns: 1fr; }
    .gallery { grid-template-columns: repeat(3, 1fr); }
    .phase-split.four { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 760px) {
    .cover { grid-template-columns: 1fr; }
    .cover figure { order: -1; }
    .kpis { grid-template-columns: 1fr 1fr; }
    .kpi:nth-child(3) { padding-left: 0; border-left: 0; }
    .kpi:nth-child(n+3) { border-top: 1px solid var(--sr-line); }
    .phase-split { grid-template-columns: 1fr; }
    .phase-split.four { grid-template-columns: 1fr; }
    .items { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
    .kpi .v { font-size: 22px; }
    .donut-wrap { grid-template-columns: 1fr; justify-items: center; }
    .donut-wrap .dlist { width: 100%; }
    .gallery { grid-template-columns: 1fr 1fr; }
    .items { grid-template-columns: 1fr; }
}
</style>
