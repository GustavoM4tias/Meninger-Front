<script setup>
/**
 * Tela inicial do Stand de Vendas: todos os stands num olhar, no desenho do
 * relatório aprovado (artifact de 09/10/2026).
 *
 *   topo        frase-título + faixa dos quatro números do conjunto
 *   comparação  quanto cada stand custou (por fase), implantação contra a
 *               faixa do modelo, e quanto custa manter cada um por mês
 *   os stands   uma LINHA larga por stand (não card): foto, números,
 *               composição, mini-barras de 12 meses e pendências
 *
 * Clicar num stand abre a prévia; o botão da prévia leva ao relatório.
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { fmtBRL, fmtDate } from '../standFormat';
import { currentYm, ymShift, daysSince, noteParts, loadReportFonts, escHtml } from './reportModel';
import SrTip from './SrTip.vue';
import './standReport.css';

const props = defineProps({
    stands: { type: Array, default: () => [] },
});
const emit = defineEmits(['open']);

onMounted(loadReportFonts);

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const NOW = currentYm();
const k = (v) => (Math.abs(v) >= 1e6
    ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`
    : `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`);
const FASES = [['construcao', 'var(--sr-c1)'], ['esporadica', 'var(--sr-e1)'], ['recorrencia', 'var(--sr-r1)'], ['sem', 'var(--sr-n1)']];
const FASE_NOME = { construcao: 'Implantação', esporadica: 'Ajustes e eventuais', recorrencia: 'Operação', sem: 'Sem classificação', c: 'Implantação', e: 'Ajustes', r: 'Operação', s: 'Sem classificação' };
const FASE_TXT = {
    construcao: 'montar o stand: obra, móveis, comunicação visual',
    esporadica: 'depois de pronto: última medição, reparos, material avulso',
    recorrencia: 'manter aberto: aluguel, energia, água, internet, café',
    sem: 'nenhuma regra pegou; abra o relatório e classifique',
};
const tip = (titulo, linha) => `<b>${escHtml(titulo)}</b>${linha ? `<span class="t">${linha}</span>` : ''}`;
const pctTxt = (v, t) => (t ? `${((v / t) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do stand` : '');
const MINI = [['c', 'var(--sr-c1)'], ['e', 'var(--sr-e1)'], ['r', 'var(--sr-r1)'], ['s', 'var(--sr-n1)']];

// Cada stand com os números que a tela usa e o nome partido em cidade/empreendimento.
const S = computed(() => props.stands.map((s) => {
    const nome = String(s.name || '');
    const i = nome.indexOf(' - ');
    return {
        raw: s,
        id: s.id,
        cidade: i > 0 ? nome.slice(0, i) : '',
        emp: i > 0 ? nome.slice(i + 3) : nome,
        total: Number(s.spend_total) || 0,
        construcao: Number(s.construction_value) || 0,
        esporadica: Number(s.sporadic_value) || 0,
        recorrencia: Number(s.maintenance_value) || 0,
        sem: Number(s.unclassified_value) || 0,
        monthly: Number(s.recurring_monthly) || 0,
        pending: Number(s.pending_count) || 0,
        n: Number(s.expense_count) || 0,
        opened: s.opened_at ? String(s.opened_at).slice(0, 10) : '',
        model: s.model ? { name: s.model.name, min: Number(s.model.avg_value_min) || 0, max: Number(s.model.avg_value_max) || 0 } : null,
        cover: s.cover_url,
        byMonth: s.month_by_kind || [],
        top: s.recurring_top || [],
        notes: noteParts(s.notes),
    };
}));

const sum = (f) => S.value.reduce((a, s) => a + s[f], 0);
const T = computed(() => ({ total: sum('total'), construcao: sum('construcao'), monthly: sum('monthly'), pending: sum('pending'), n: sum('n') }));
const comImpl = computed(() => S.value.filter((s) => s.construcao > 0).length || 1);
const maisCaro = computed(() => [...S.value].sort((a, b) => b.monthly - a.monthly)[0]);

function faixa(s) {
    const m = s.model;
    if (!m || !(m.min || m.max) || !s.construcao) return { txt: m ? m.name : 'sem modelo', cls: '' };
    if (m.max && s.construcao > m.max) return { txt: `acima do ${m.name}`, cls: 'over' };
    if (s.construcao < m.min) return { txt: `abaixo do ${m.name}`, cls: '' };
    return { txt: `dentro do ${m.name}`, cls: 'ok' };
}

// ── Comparação ──────────────────────────────────────────────────────────────
const rank = computed(() => {
    const L = [...S.value].sort((a, b) => b.total - a.total);
    const max = L[0]?.total || 1;
    return L.map((s) => ({ s, parts: FASES.filter(([f]) => s[f] > 0).map(([f, c]) => ({ f, c, w: (s[f] / max) * 100, v: s[f] })) }));
});
const dots = computed(() => {
    const L = S.value.filter((s) => s.construcao > 0 || s.model).sort((a, b) => b.construcao - a.construcao);
    const hi = Math.max(1, ...L.map((s) => Math.max(s.construcao, s.model?.max || (s.model?.min || 0) * 1.3))) * 1.08;
    const pct = (v) => `${Math.max(0, Math.min(100, (v / hi) * 100)).toFixed(2)}%`;
    return {
        hi,
        rows: L.map((s) => {
            const m = s.model;
            const band = m && (m.min || m.max) ? { left: pct(m.min), width: `calc(${pct(m.max || m.min * 1.3)} - ${pct(m.min)})` } : null;
            const cls = s.construcao <= 0 ? 'none' : (m?.max && s.construcao > m.max ? 'over' : '');
            return { s, band, left: pct(s.construcao), cls };
        }),
    };
});
const mon = computed(() => {
    const L = [...S.value].sort((a, b) => b.monthly - a.monthly);
    const max = L[0]?.monthly || 1;
    return L.map((s) => ({ s, w: (s.monthly / max) * 100 }));
});

// ── Lista ───────────────────────────────────────────────────────────────────
const ORDENS = [
    { o: 'total', label: 'Maior gasto', key: (s) => s.total },
    { o: 'construcao', label: 'Implantação', key: (s) => s.construcao },
    { o: 'monthly', label: 'Para manter', key: (s) => s.monthly },
    { o: 'pending', label: 'Pendências', key: (s) => s.pending },
    { o: 'opened', label: 'Mais recentes', key: (s) => Date.parse(s.opened || 0) || 0 },
];
const ordem = ref('total');
const lista = computed(() => {
    const key = ORDENS.find((x) => x.o === ordem.value).key;
    return [...S.value].sort((a, b) => key(b) - key(a));
});
const composicao = (s) => {
    const tot = s.total || 1;
    return FASES.filter(([f]) => s[f] > 0).map(([f, c]) => ({ f, c, w: (s[f] / tot) * 100 }));
};

// Mini-barras dos últimos 12 meses, empilhadas por tipo.
function spark(s, w = 180, h = 44) {
    const meses = Array.from({ length: 12 }, (_, i) => ymShift(NOW, i - 11));
    const by = new Map(s.byMonth.map((m) => [m.ym, m]));
    const vals = meses.map((ym) => by.get(ym) || { c: 0, e: 0, r: 0, s: 0 });
    const max = Math.max(1, ...vals.map((v) => v.c + v.e + v.r + v.s));
    const bw = w / 12;
    const rects = [];
    vals.forEach((v, i) => {
        let acc = 0;
        const x = i * bw + 1.5;
        if (!(v.c + v.e + v.r + v.s)) { rects.push({ x, y: h - 1.5, w: bw - 3, h: 1.5, fill: 'var(--sr-line)', d: i, tip: tip(`${MES[Number(meses[i].slice(5)) - 1]}/${meses[i].slice(2, 4)}`, 'nenhum pagamento') }); return; }
        MINI.forEach(([f, col]) => {
            if (!v[f]) return;
            const bh = Math.max(1.5, (v[f] / max) * (h - 2));
            rects.push({ x, y: h - acc - bh, w: bw - 3, h: bh, fill: col, d: i, tip: tip(`${MES[Number(meses[i].slice(5)) - 1]}/${meses[i].slice(2, 4)} · ${FASE_NOME[f]}`, `<b>${fmtBRL(v[f])}</b>`) });
            acc += bh;
        });
    });
    return { w, h, rects };
}

// ── Prévia ──────────────────────────────────────────────────────────────────
const aberto = ref(null);
const fechando = ref(false);
const abrir = (s) => { aberto.value = s; };
function fechar() {
    if (fechando.value) return;
    fechando.value = true;
    setTimeout(() => { aberto.value = null; fechando.value = false; }, 170);
}
function onKey(e) { if (e.key === 'Escape' && aberto.value) fechar(); }
watch(aberto, (v) => { document.body.style.overflow = v ? 'hidden' : ''; });
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; });

const previa = computed(() => {
    const s = aberto.value;
    if (!s) return null;
    const meses = [];
    if (s.byMonth.length) {
        let ym = s.byMonth[0].ym;
        while (ym <= NOW && meses.length < 36) { meses.push(ym); ym = ymShift(ym, 1); }
    }
    const ult = meses.slice(-14);
    const by = new Map(s.byMonth.map((m) => [m.ym, m]));
    const W = 760; const H = 200; const PB = 22; const PT = 14; const PL = 70;
    const vals = ult.map((ym) => by.get(ym) || { c: 0, e: 0, r: 0, s: 0 });
    const max = Math.max(1, ...vals.map((v) => v.c + v.e + v.r + v.s));
    const bw = (W - PL) / Math.max(1, ult.length);
    const rects = [];
    const labels = [];
    vals.forEach((v, i) => {
        let acc = 0;
        MINI.forEach(([f, col]) => {
            if (!v[f]) return;
            const bh = Math.max(1.5, (v[f] / max) * (H - PT - PB));
            rects.push({ x: PL + i * bw + bw * 0.2, y: H - PB - acc - bh, w: bw * 0.6, h: bh, fill: col, d: i, tip: tip(`${MES[Number(ult[i].slice(5)) - 1]}/${ult[i].slice(2, 4)} · ${FASE_NOME[f]}`, `<b>${fmtBRL(v[f])}</b>`) });
            acc += bh;
        });
        labels.push({ x: PL + i * bw + bw / 2, t: MES[Number(ult[i].slice(5)) - 1] });
    });
    const grid = [0.5, 1].map((p) => ({ y: PT + (H - PT - PB) * (1 - p), t: k(max * p) }));
    return { s, f: faixa(s), W, H, PL, rects, labels, grid };
});
function irRelatorio() {
    const s = aberto.value;
    aberto.value = null;
    if (s) emit('open', s.raw);
}
</script>

<template>
    <div class="sr so">
        <!-- ══ Topo ══ -->
        <header class="top">
            <p class="eyebrow">Stand de Vendas · dados do Sienge</p>
            <h1 class="display">
                {{ S.length }} stand{{ S.length === 1 ? '' : 's' }} no ar,
                <em>{{ k(T.total) }}</em> investidos
            </h1>
            <p v-if="maisCaro" class="lede">
                Montar custou {{ k(T.construcao) }} somando os stands, em média {{ k(T.construcao / comImpl) }} cada.
                Para manter todos abertos saem {{ k(T.monthly) }} por mês; o mais caro de manter é
                {{ maisCaro.emp }}<template v-if="maisCaro.cidade"> ({{ maisCaro.cidade }})</template>.
            </p>
            <div class="kpis">
                <div class="kpi" :data-tip="tip('Gasto total', 'Tudo o que o Sienge pagou para os stands, na régua da aba Categorias, somando implantação, ajustes e operação')"><span class="eyebrow">Gasto total</span><span class="v display">{{ k(T.total) }}</span><span class="d">{{ T.n }} pagamentos no Sienge</span></div>
                <div class="kpi" :data-tip="tip('Implantação', 'Quanto custou montar os stands: obra, móveis e comunicação visual pagos até o fim da janela de montagem')"><span class="eyebrow">Implantação</span><span class="v display">{{ k(T.construcao) }}</span><span class="d">média de {{ k(T.construcao / comImpl) }} por stand</span></div>
                <div class="kpi" :data-tip="tip('Para manter', 'Soma do custo mensal de cada stand aberto: aluguel, contas e consumo, pela média dos últimos meses fechados')"><span class="eyebrow">Para manter</span><span class="v display">{{ k(T.monthly) }}<small>/mês</small></span><span class="d">todos os stands abertos</span></div>
                <div class="kpi" :data-tip="tip('Pendências', 'Lançamento sem classificação ou conta mensal (aluguel, energia, água, internet) que não apareceu em algum mês. Cada relatório mostra as suas')"><span class="eyebrow">Pendências</span><span class="v display" :class="T.pending ? 'warn' : 'ok'">{{ T.pending }}</span><span class="d">{{ T.pending ? `em ${S.filter((s) => s.pending > 0).length} stand(s)` : 'tudo em dia' }}</span></div>
            </div>
        </header>

        <!-- ══ Comparação ══ -->
        <section>
            <div class="section-head">
                <p class="eyebrow">Comparação</p>
                <h2 class="display">Quanto cada stand custou</h2>
                <p>Tudo o que o Sienge pagou para o stand, separado pela fase: implantação (montar), ajustes depois de pronto e operação (manter aberto). Clique num stand para ver o resumo.</p>
            </div>
            <div class="box">
                <div class="legend">
                    <span v-for="[f, c] in FASES" :key="f" :data-tip="tip(FASE_NOME[f], FASE_TXT[f])"><i class="sw" :style="{ background: c }"></i>{{ FASE_NOME[f] }}</span>
                </div>
                <div class="rank">
                    <button v-for="(r, idx) in rank" :key="r.s.id" type="button" :aria-label="`${r.s.emp}: ${fmtBRL(r.s.total)}`" @click="abrir(r.s)">
                        <span class="who"><b>{{ r.s.emp }}</b><span>{{ r.s.cidade }}</span></span>
                        <span class="bar"><i v-for="p in r.parts" :key="p.f" :style="{ width: p.w + '%', background: p.c, animationDelay: idx * 60 + 'ms' }" :data-tip="tip(`${FASE_NOME[p.f]} · ${r.s.emp}`, `<b>${fmtBRL(p.v)}</b> · ${pctTxt(p.v, r.s.total)}`)"></i></span>
                        <span class="amt num" :data-tip="tip(r.s.emp, `Gasto total <b>${fmtBRL(r.s.total)}</b> em ${r.s.n} pagamentos`)">{{ k(r.s.total) }}</span>
                    </button>
                </div>
            </div>
            <div class="two">
                <div class="box">
                    <div><h3>Implantação contra o modelo</h3><p class="sub">A faixa é o que o modelo prevê para montar; o ponto é o que o stand custou.</p></div>
                    <div class="dots">
                        <button v-for="d in dots.rows" :key="d.s.id" type="button" @click="abrir(d.s)">
                            <span class="lbl">{{ d.s.emp }}</span>
                            <span class="track">
                                <span class="axis"></span>
                                <span v-if="d.band" class="band" :style="d.band" :data-tip="tip(`Faixa do ${d.s.model?.name}`, `O modelo prevê de ${k(d.s.model?.min || 0)} a ${d.s.model?.max ? k(d.s.model.max) : 'mais'} para montar`)"></span>
                                <span class="dot" :class="d.cls" :style="{ left: d.left }" :data-tip="tip(d.s.emp, `Implantação <b>${fmtBRL(d.s.construcao)}</b> · ${faixa(d.s).txt}`)"></span>
                            </span>
                            <span class="v num">{{ d.s.construcao ? k(d.s.construcao) : 'sem dado' }}</span>
                        </button>
                    </div>
                    <div class="scale"><span>R$ 0</span><span>{{ k(dots.hi / 2) }}</span><span>{{ k(dots.hi) }}</span></div>
                </div>
                <div class="box">
                    <div><h3>Para manter, por mês</h3><p class="sub">Aluguel, contas e consumo, pela média dos últimos meses fechados.</p></div>
                    <div class="mon">
                        <button v-for="(m, idx) in mon" :key="m.s.id" type="button" @click="abrir(m.s)">
                            <span class="lbl">{{ m.s.emp }}</span>
                            <span class="bar" :data-tip="tip(`${m.s.emp}: ${fmtBRL(m.s.monthly)} por mês`, m.s.top.map((t) => `${escHtml(t.name)} <b>${fmtBRL(t.amount)}</b>`).join('<br>') || 'sem conta de operação ainda')"><i :style="{ width: m.w + '%', animationDelay: idx * 60 + 'ms' }"></i></span>
                            <span class="v num">{{ k(m.s.monthly) }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- ══ Os stands ══ -->
        <section>
            <div class="list-head">
                <div class="section-head">
                    <p class="eyebrow">Os stands</p>
                    <h2 class="display">Abra um stand para ver o relatório</h2>
                </div>
                <div class="seg" role="group" aria-label="Ordenar">
                    <button v-for="o in ORDENS" :key="o.o" type="button" :aria-pressed="ordem === o.o" :data-tip="`Ordenar os stands por ${o.label.toLowerCase()}`" @click="ordem = o.o">{{ o.label }}</button>
                </div>
            </div>
            <div class="stands">
                <button v-for="(s, idx) in lista" :key="s.id" type="button" class="stand" :style="{ animationDelay: idx * 50 + 'ms' }" @click="abrir(s)">
                    <span class="ph">
                        <img v-if="s.cover" :src="s.cover" :alt="`Fachada do stand ${s.emp}`" loading="lazy" />
                        <i v-else class="fas fa-store"></i>
                    </span>
                    <span class="info">
                        <span class="t">
                            <span class="eyebrow">{{ s.cidade }}</span>
                            <span class="nm display">{{ s.emp }}</span>
                            <span class="meta">{{ s.model ? s.model.name : 'Sem modelo' }}<template v-if="s.opened"> · inaugurado em {{ fmtDate(s.opened) }}, há {{ daysSince(s.opened) }} dias</template></span>
                        </span>
                        <span class="nums">
                            <span :data-tip="tip('Gasto total', `<b>${fmtBRL(s.total)}</b> em ${s.n} pagamentos no Sienge`)"><span class="k">Gasto total</span><span class="v">{{ k(s.total) }}</span><span class="h">{{ s.n }} pagamentos</span></span>
                            <span :data-tip="tip('Implantação', `<b>${fmtBRL(s.construcao)}</b> para montar · ${s.model ? `${escHtml(s.model.name)} prevê ${k(s.model.min)} a ${s.model.max ? k(s.model.max) : 'mais'}` : 'stand sem modelo'}`)"><span class="k">Implantação</span><span class="v">{{ k(s.construcao) }}</span><span class="h" :class="faixa(s).cls">{{ faixa(s).txt }}</span></span>
                            <span :data-tip="tip(`Para manter: ${fmtBRL(s.monthly)} por mês`, s.top.map((t) => `${escHtml(t.name)} <b>${fmtBRL(t.amount)}</b>`).join('<br>') || 'sem conta de operação ainda')"><span class="k">Para manter</span><span class="v">{{ k(s.monthly) }}<small>/mês</small></span><span class="h">aluguel e contas</span></span>
                        </span>
                        <span class="fbar"><i v-for="p in composicao(s)" :key="p.f" :style="{ width: p.w + '%', background: p.c }" :data-tip="tip(FASE_NOME[p.f], `<b>${fmtBRL(s[p.f])}</b> · ${pctTxt(s[p.f], s.total)}`)"></i></span>
                    </span>
                    <span class="side">
                        <span v-if="s.pending" class="pill warn" data-tip="Itens a acertar no relatório: classificação, departamento no Sienge ou conta mensal que faltou">{{ s.pending }} pendência{{ s.pending > 1 ? 's' : '' }}</span>
                        <span v-else class="pill ok" data-tip="Tudo classificado e as contas mensais apareceram em todos os meses">Em dia</span>
                        <svg class="spark" data-tip="Gasto dos últimos 12 meses, por fase. Passe o mouse em cada mês" :viewBox="`0 0 ${spark(s).w} ${spark(s).h}`" preserveAspectRatio="none" aria-hidden="true">
                            <rect v-for="(r, j) in spark(s).rects" :key="j" :x="r.x" :y="r.y" :width="r.w" :height="r.h" :fill="r.fill" :style="{ animationDelay: r.d * 30 + 'ms' }" :data-tip="r.tip" />
                        </svg>
                        <span class="go">Abrir relatório <i>→</i></span>
                    </span>
                </button>
            </div>
        </section>

        <SrTip />

        <!-- ══ Prévia do stand ══ -->
        <Teleport to="body">
            <div v-if="previa" class="sr so-scrim" :class="{ closing: fechando }" @mousedown.self="fechar">
                <div class="so-dlg" role="dialog" aria-modal="true" :aria-label="previa.s.emp">
                    <div class="hero">
                        <img v-if="previa.s.cover" :src="previa.s.cover" :alt="`Fachada do stand ${previa.s.emp}`" />
                        <button type="button" class="x" aria-label="Fechar" data-tip="Fechar (Esc)" @click="fechar"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="body">
                        <div>
                            <p class="eyebrow">{{ previa.s.cidade }}</p>
                            <h2 class="display">{{ previa.s.emp }}</h2>
                            <div class="meta">
                                <span v-for="n in previa.s.notes" :key="n">{{ n }}</span>
                                <span>{{ previa.s.model ? `Modelo ${previa.s.model.name}` : 'Sem modelo' }}<template v-if="previa.s.opened"> · inaugurado em {{ fmtDate(previa.s.opened) }}</template></span>
                            </div>
                        </div>
                        <div class="kp">
                            <div :data-tip="tip('Gasto total', `<b>${fmtBRL(previa.s.total)}</b> em ${previa.s.n} pagamentos`)"><span class="eyebrow">Gasto total</span><span class="v display">{{ k(previa.s.total) }}</span></div>
                            <div :data-tip="tip('Implantação', `<b>${fmtBRL(previa.s.construcao)}</b> · ${previa.f.txt}`)"><span class="eyebrow">Implantação</span><span class="v display">{{ k(previa.s.construcao) }}</span><span class="h">{{ previa.f.txt }}</span></div>
                            <div :data-tip="tip('Para manter', `<b>${fmtBRL(previa.s.monthly)}</b> por mês, pela média dos últimos meses fechados`)"><span class="eyebrow">Para manter</span><span class="v display">{{ k(previa.s.monthly) }}</span><span class="h">por mês</span></div>
                            <div data-tip="Itens a acertar: abra o relatório para ver cada um"><span class="eyebrow">Pendências</span><span class="v display" :class="previa.s.pending ? 'warn' : 'ok'">{{ previa.s.pending }}</span></div>
                        </div>
                        <div v-if="previa.rects.length">
                            <p class="eyebrow gap">Gasto por mês, por fase</p>
                            <svg class="chart" :viewBox="`0 0 ${previa.W} ${previa.H}`" role="img" aria-label="Gasto por mês">
                                <g v-for="g in previa.grid" :key="g.y">
                                    <line class="grid" :x1="previa.PL" :x2="previa.W" :y1="g.y" :y2="g.y" />
                                    <text :x="previa.PL - 8" :y="g.y + 4" text-anchor="end">{{ g.t }}</text>
                                </g>
                                <rect v-for="(r, j) in previa.rects" :key="j" :x="r.x" :y="r.y" :width="r.w" :height="r.h" :fill="r.fill" :style="{ animationDelay: r.d * 40 + 'ms' }" :data-tip="r.tip" />
                                <text v-for="l in previa.labels" :key="l.x" :x="l.x" :y="previa.H - 6" text-anchor="middle">{{ l.t }}</text>
                            </svg>
                        </div>
                        <div v-if="previa.s.top.length">
                            <p class="eyebrow gap">O que pesa para manter</p>
                            <div class="rows">
                                <div v-for="t in previa.s.top" :key="t.name"><span>{{ t.name }}</span><span class="num">{{ fmtBRL(t.amount) }}</span></div>
                            </div>
                        </div>
                        <div class="cta">
                            <span>Gasto lançamento a lançamento, fotos, itens e pendências.</span>
                            <button type="button" class="btn" data-tip="Abre o relatório completo deste stand" @click="irRelatorio">Abrir relatório <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.so { display: grid; grid-template-columns: minmax(0, 1fr); gap: 48px; max-width: 1120px; margin: 0 auto; padding-block: 8px 48px; color: var(--sr-ink); font-size: 15px; line-height: 1.55; }
.so > * { animation: sr-rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.so > *:nth-child(2) { animation-delay: 0.08s; }
.so > *:nth-child(3) { animation-delay: 0.16s; }
p { margin: 0; }
section { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-width: 0; }
.section-head { display: grid; gap: 6px; }
.section-head h2 { margin: 0; font-size: 22px; font-weight: 700; }
.section-head p:not(.eyebrow) { color: var(--sr-muted); max-width: 72ch; }
h3 { margin: 0; font-size: 16px; font-weight: 600; }

.top { display: grid; gap: 14px; }
.top h1 { margin: 0; font-size: clamp(32px, 5.4vw, 52px); line-height: 1.03; font-weight: 700; max-width: 18ch; }
.top h1 em { font-style: normal; color: var(--sr-accent); white-space: nowrap; }
.top .lede { color: var(--sr-muted); font-size: 16px; max-width: 64ch; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 2px solid var(--sr-ink); border-bottom: 1px solid var(--sr-line); margin-top: 10px; }
.kpi { padding: 16px 16px 18px; display: grid; gap: 4px; align-content: start; min-width: 0; }
.kpi:first-child { padding-left: 0; }
.kpi + .kpi { border-left: 1px solid var(--sr-line); }
.kpi .v { font-size: 30px; font-weight: 700; line-height: 1.1; white-space: nowrap; font-variant-numeric: tabular-nums; }
.kpi .v small { font-size: 15px; font-weight: 500; color: var(--sr-muted); }
.kpi .v.warn { color: var(--sr-warn-ink); }
.kpi .v.ok { color: var(--sr-ok); }
.kpi .d { font-size: 13px; color: var(--sr-muted); }

.box { background: var(--sr-paper); border: 1px solid var(--sr-line); border-radius: 10px; padding: 20px; min-width: 0; display: grid; gap: 14px; align-content: start; }
.box .sub { font-size: 13px; color: var(--sr-muted); }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; color: var(--sr-muted); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.rank, .dots, .mon { display: grid; gap: 4px; }
.rank button, .dots button, .mon button { display: grid; gap: 14px; align-items: center; padding: 8px 10px; margin-inline: -10px; border: 0; background: none; border-radius: 8px; cursor: pointer; text-align: left; font: inherit; color: inherit; transition: background 0.15s; }
.rank button:hover, .dots button:hover, .mon button:hover { background: var(--sr-hover); }
.rank button { grid-template-columns: minmax(0, 210px) minmax(0, 1fr) 110px; }
.rank .who { min-width: 0; display: grid; }
.rank .who b { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank .who span { font-size: 12px; color: var(--sr-muted); }
.rank .bar { height: 14px; display: flex; gap: 2px; }
.rank .bar i { display: block; height: 100%; transform-origin: left; animation: sr-widen 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.rank .bar i:first-child { border-radius: 3px 0 0 3px; }
.rank .bar i:last-child { border-radius: 0 3px 3px 0; }
.rank .amt, .dots .v, .mon .v { text-align: right; font-size: 13.5px; white-space: nowrap; }
.two { display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px; }
.dots button { grid-template-columns: minmax(0, 150px) minmax(0, 1fr) 96px; gap: 12px; padding-block: 7px; }
.mon button { grid-template-columns: minmax(0, 150px) minmax(0, 1fr) 92px; gap: 12px; padding-block: 7px; }
.dots .lbl, .mon .lbl { font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dots .track { position: relative; height: 22px; }
.dots .axis { position: absolute; left: 0; right: 0; top: 10px; height: 2px; background: var(--sr-line); }
.dots .band { position: absolute; top: 5px; height: 12px; background: var(--sr-c3); opacity: 0.55; border-radius: 3px; }
.dots .dot { position: absolute; top: 4px; width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--sr-paper); background: var(--sr-c1); transform: translateX(-7px); box-shadow: 0 0 0 1px var(--sr-c1); animation: sr-fade 0.5s ease both 0.3s; }
.dots .dot.over { background: var(--sr-e1); box-shadow: 0 0 0 1px var(--sr-e1); }
.dots .dot.none { background: var(--sr-n1); box-shadow: 0 0 0 1px var(--sr-n1); }
.scale { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--sr-muted); padding-left: 162px; padding-right: 108px; }
.mon .bar { height: 12px; background: var(--sr-hover); border-radius: 3px; overflow: hidden; }
.mon .bar i { display: block; height: 100%; background: var(--sr-r1); border-radius: 3px; transform-origin: left; animation: sr-widen 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; }

.list-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; flex-wrap: wrap; }
.seg { display: inline-flex; border: 1px solid var(--sr-line); border-radius: 8px; overflow: hidden; background: var(--sr-paper); max-width: 100%; overflow-x: auto; }
.seg button { border: 0; background: none; padding: 7px 12px; font: inherit; font-size: 13px; cursor: pointer; color: var(--sr-muted); min-height: 38px; white-space: nowrap; }
.seg button + button { border-left: 1px solid var(--sr-line); }
.seg button[aria-pressed="true"] { background: var(--sr-ink); color: var(--sr-paper); }
.stands { display: grid; border-top: 1px solid var(--sr-line); }
.stand { display: grid; grid-template-columns: 240px minmax(0, 1fr) 190px; gap: 24px; align-items: center; padding: 20px 12px; margin-inline: -12px; border: 0; border-bottom: 1px solid var(--sr-line); background: none; text-align: left; cursor: pointer; border-radius: 10px; font: inherit; color: inherit; transition: background 0.2s; animation: sr-rise 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.stand:hover { background: var(--sr-paper); }
.stand:hover .ph img { transform: scale(1.04); }
.stand:hover .go i { transform: translateX(4px); }
.ph { position: relative; display: grid; place-items: center; border-radius: 8px; overflow: hidden; aspect-ratio: 16 / 10; background: var(--sr-hover); color: var(--sr-muted); font-size: 28px; }
.ph img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
.info { min-width: 0; display: grid; gap: 12px; }
.info .t { display: grid; gap: 2px; }
.info .t > span { display: block; }
.info .nm { font-size: 21px; font-weight: 700; line-height: 1.15; }
.info .meta { font-size: 13px; color: var(--sr-muted); }
.nums { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.nums > span { display: grid; gap: 1px; min-width: 0; align-content: start; }
.nums .k { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sr-muted); font-weight: 600; }
.nums .v { font-family: var(--sr-mono); font-size: 15px; font-weight: 500; white-space: nowrap; }
.nums .v small { font-family: inherit; color: var(--sr-muted); font-weight: 400; font-size: 12px; }
.nums .h { font-size: 12px; color: var(--sr-muted); }
.nums .h.ok { color: var(--sr-ok); }
.nums .h.over { color: var(--sr-warn-ink); }
.fbar { display: flex; height: 6px; gap: 2px; border-radius: 3px; overflow: hidden; }
.fbar i { display: block; height: 100%; transform-origin: left; animation: sr-widen 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both 0.2s; }
.side { display: grid; gap: 10px; justify-items: end; align-content: center; }
.pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--sr-line); color: var(--sr-muted); white-space: nowrap; }
.pill.warn { border-color: var(--sr-warn-line); background: var(--sr-warn-bg); color: var(--sr-warn-ink); }
.pill.ok { color: var(--sr-ok); }
.spark { width: 100%; max-width: 180px; height: 44px; display: block; }
.spark rect { transform-box: fill-box; transform-origin: 50% 100%; animation: sr-grow 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.go { font-size: 13px; font-weight: 600; color: var(--sr-accent); display: inline-flex; align-items: center; gap: 8px; }
.go i { display: inline-block; transition: transform 0.2s; font-style: normal; }

@media (max-width: 920px) {
    .two { grid-template-columns: 1fr; }
    .stand { grid-template-columns: 200px minmax(0, 1fr); }
    .side { grid-column: 1 / -1; grid-template-columns: auto 1fr auto; justify-items: start; align-items: center; }
    .side .spark { max-width: none; }
}
@media (max-width: 680px) {
    .kpis { grid-template-columns: 1fr 1fr; }
    .kpi:nth-child(3) { padding-left: 0; border-left: 0; }
    .kpi:nth-child(n+3) { border-top: 1px solid var(--sr-line); }
    .kpi .v { font-size: 24px; }
    .stand { grid-template-columns: 1fr; gap: 14px; }
    .side { grid-template-columns: 1fr auto; }
    .side .spark { grid-column: 1 / -1; grid-row: 2; }
    .rank button { grid-template-columns: minmax(0, 1fr) 96px; }
    .rank .bar { grid-column: 1 / -1; grid-row: 2; }
    .dots button, .mon button { grid-template-columns: minmax(0, 1fr) 84px; }
    .dots .track, .mon .bar { grid-column: 1 / -1; grid-row: 2; }
    .scale { padding: 0; }
    .nums .v { font-size: 14px; }
}
</style>

<style>
/* Prévia (teleportada para o <body>, por isso fora do scoped). */
.so-scrim { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 12px; background: var(--sr-scrim); backdrop-filter: blur(2px); animation: sr-fade 0.25s ease; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: var(--sr-ink); }
.so-scrim.closing { animation: sr-fade 0.18s ease reverse forwards; }
.so-dlg { width: min(820px, 100%); max-height: min(88vh, 900px); overflow: auto; background: var(--sr-paper); border-radius: 14px; box-shadow: var(--sr-shadow); animation: sr-pop 0.32s cubic-bezier(0.2, 0.9, 0.25, 1.05); }
.so-scrim.closing .so-dlg { animation: sr-pop 0.18s ease-in reverse forwards; }
.so-dlg .hero { position: relative; aspect-ratio: 21 / 9; overflow: hidden; background: var(--sr-sunken); }
.so-dlg .hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
.so-dlg .x { position: absolute; top: 12px; right: 12px; width: 40px; height: 40px; border-radius: 10px; border: 0; background: var(--sr-paper); color: var(--sr-ink); cursor: pointer; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18); }
.so-dlg .body { padding: 22px 24px 26px; display: grid; gap: 18px; }
.so-dlg h2 { margin: 0; font-size: 28px; font-weight: 700; line-height: 1.1; }
.so-dlg .meta { color: var(--sr-muted); font-size: 14px; display: grid; gap: 2px; margin-top: 4px; }
.so-dlg .kp { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 2px solid var(--sr-ink); border-bottom: 1px solid var(--sr-line); }
.so-dlg .kp > div { padding: 12px 12px 14px; display: grid; gap: 2px; align-content: start; }
.so-dlg .kp > div:first-child { padding-left: 0; }
.so-dlg .kp > div + div { border-left: 1px solid var(--sr-line); }
.so-dlg .kp .v { font-size: 22px; font-weight: 700; white-space: nowrap; }
.so-dlg .kp .v.warn { color: var(--sr-warn-ink); }
.so-dlg .kp .v.ok { color: var(--sr-ok); }
.so-dlg .kp .h { font-size: 12px; color: var(--sr-muted); }
.so-dlg .gap { margin-bottom: 8px; }
.so-dlg .chart { width: 100%; height: auto; display: block; }
.so-dlg .chart text { fill: var(--sr-muted); font-size: 11px; }
.so-dlg .chart .grid { stroke: var(--sr-line); }
.so-dlg .chart rect { transform-box: fill-box; transform-origin: 50% 100%; animation: sr-grow 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.so-dlg .rows { display: grid; }
.so-dlg .rows > div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--sr-line); font-size: 14px; }
.so-dlg .cta { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.so-dlg .cta span { font-size: 13px; color: var(--sr-muted); }
.so-dlg .btn { border: 0; border-radius: 10px; padding: 11px 18px; font: inherit; font-weight: 600; font-size: 14px; background: var(--sr-accent); color: #fff; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; }
@media (max-width: 680px) {
    .so-dlg .kp { grid-template-columns: 1fr 1fr; }
    .so-dlg .kp > div:nth-child(3) { padding-left: 0; border-left: 0; }
    .so-dlg .kp > div:nth-child(n+3) { border-top: 1px solid var(--sr-line); }
    .so-dlg .body { padding: 18px 16px 22px; }
}
@media (max-width: 520px) {
    .so-scrim { place-items: end center; padding: 0; }
    .so-dlg { border-radius: 16px 16px 0 0; max-height: 94vh; }
}
</style>
