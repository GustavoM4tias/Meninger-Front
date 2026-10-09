<script setup>
/**
 * Relatório do stand: a leitura de cima para baixo do que o stand custou,
 * em que ritmo, quanto custa para ficar aberto e o que falta acertar.
 *
 * Todo número é clicável e abre, no ReportModal, os lançamentos que o formam.
 * Nada aqui é digitado: tudo vem do Sienge (lançamento a lançamento) com a
 * classificação de construção / recorrência / esporádico já resolvida pela API.
 */
import { ref, computed } from 'vue';
import { useCountUp } from '@/composables/useCountUp';
import { kindMeta, STATUS_META } from '@/stores/Marketing/SalesStand/salesStandStore';
import Surface from '@/components/UI/Surface.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import Input from '@/components/UI/Input.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import DataTable from '@/components/UI/DataTable.vue';
import PhotoLightbox from '../components/PhotoLightbox.vue';
import ReportMonthChart from './ReportMonthChart.vue';
import ReportCumulative from './ReportCumulative.vue';
import ReportModal from './ReportModal.vue';
import { fmtBRL, fmtBRLShort, fmtDate, fmtYm, fmtValueRange, fmtAreaRange } from '../standFormat';
import {
    KIND_ORDER, kindOf, sumOf, catKey, catLabel, reportMonths, amountIn, currentYm,
    buildNotes, noteParts, daysSince, niceName, shortNote,
} from './reportModel';

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

const items = computed(() => props.expenses);
const total = computed(() => sumOf(items.value));
const byKind = (k) => sumOf(items.value.filter((i) => kindOf(i) === k));
const construcao = computed(() => byKind('construcao'));
const esporadica = computed(() => byKind('esporadica'));
const recorrencia = computed(() => byKind('recorrencia'));
const semClasse = computed(() => byKind('sem_classificacao'));
const monthly = computed(() => Number(props.stand.recurring_monthly) || 0);
const months = computed(() => reportMonths(items.value, props.stand.opened_at));
const openedAt = computed(() => (props.stand.opened_at ? String(props.stand.opened_at).slice(0, 10) : ''));
const dias = computed(() => daysSince(openedAt.value));

const notes = computed(() => buildNotes({
    items: items.value, outside: props.outside, categories: props.categories, openedAt: openedAt.value,
}));
// Pendência é o que pede ação; observação (counted: false) só informa.
const pendentes = computed(() => notes.value.filter((n) => n.counted !== false));

// ── Números que contam ───────────────────────────────────────────────────────
const cTotal = useCountUp(total, { duration: 850 });
// Stand definido mostra a construção CONGELADA; a apurada hoje vai no rodapé
// do número quando as duas divergem.
const definido = computed(() => props.stand.status === 'defined');
const construcaoKpi = computed(() => (definido.value ? Number(props.stand.construction_value) || 0 : construcao.value));
const divergeConstr = computed(() => definido.value && Math.abs(construcaoKpi.value - construcao.value) >= 0.01);
const cConstr = useCountUp(construcaoKpi, { duration: 850 });
const cMonthly = useCountUp(monthly, { duration: 850 });

// ── Capa e identificação ─────────────────────────────────────────────────────
const fotos = computed(() => props.stand.images || []);
const capa = computed(() => fotos.value[0] || null);
const endereco = computed(() => noteParts(props.stand.notes));
const status = computed(() => STATUS_META[props.stand.status] || STATUS_META.draft);
const modelo = computed(() => props.stand.model || null);
const faixa = computed(() => (modelo.value ? fmtValueRange(modelo.value) : ''));
const itensPresentes = computed(() => (props.stand.items || []).filter((i) => i.present !== false));

const lightboxOpen = ref(false);
const lightboxIdx = ref(0);
const verFoto = (idx) => { lightboxIdx.value = idx; lightboxOpen.value = true; };

// ── Modal ────────────────────────────────────────────────────────────────────
const modalOpen = ref(false);
const modalRoot = ref(null);
function abrir(view) {
    modalRoot.value = { ...view, n: Date.now() };
    modalOpen.value = true;
}
const abrirLista = (key) => abrir({ type: 'list', key });
const abrirItem = (row) => abrir({ type: 'item', key: row.key });
const pendenciasEl = ref(null);
const irPendencias = () => pendenciasEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// ── Por categoria ────────────────────────────────────────────────────────────
const porCategoria = computed(() => {
    const map = new Map();
    for (const i of items.value) {
        const k = catKey(i);
        const c = map.get(k) || { key: k, label: catLabel(i), value: 0, n: 0, kinds: new Map() };
        c.value += Number(i.amount) || 0;
        c.n += 1;
        c.kinds.set(kindOf(i), (c.kinds.get(kindOf(i)) || 0) + (Number(i.amount) || 0));
        map.set(k, c);
    }
    const lista = [...map.values()].sort((a, b) => b.value - a.value);
    const max = lista[0]?.value || 1;
    return lista.map((c) => ({
        ...c,
        width: (c.value / max) * 100,
        pct: total.value ? (c.value / total.value) * 100 : 0,
        // a barra pinta pelo tipo que domina a categoria
        kind: [...c.kinds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'sem_classificacao',
    }));
});

// ── Fases ────────────────────────────────────────────────────────────────────
const fases = computed(() => [
    { k: 'construcao', v: construcao.value, text: 'Montar o stand: obra, móveis, comunicação visual e o que ficou nele.' },
    { k: 'esporadica', v: esporadica.value, text: 'Gasto de vez em quando: ajustes depois de pronto, reparos, eventos.' },
    { k: 'recorrencia', v: recorrencia.value, text: 'Manter aberto: aluguel, energia, internet, café e limpeza, acumulado.' },
    ...(semClasse.value > 0 ? [{ k: 'sem_classificacao', v: semClasse.value, text: 'Lançamentos que ainda não têm tipo. Abra e classifique.' }] : []),
]);

// ── Contra o modelo ──────────────────────────────────────────────────────────
const range = computed(() => {
    const m = modelo.value;
    const min = Number(m?.avg_value_min) || 0;
    const max = Number(m?.avg_value_max) || 0;
    if (!min && !max) return null;
    const montagem = construcao.value + esporadica.value;
    const hi = Math.max(max || min * 1.4, montagem, construcao.value) * 1.15;
    const lo = Math.min(min, construcao.value) * 0.75;
    const pct = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)).toFixed(2)}%`;
    const fora = max && construcao.value > max ? 'acima' : construcao.value < min ? 'abaixo' : 'dentro';
    return { min, max, pct, montagem, fora };
});

// ── Operação mês a mês ───────────────────────────────────────────────────────
const recorrentes = computed(() => items.value.filter((i) => i.kind === 'recorrencia'));
const opMonths = computed(() => months.value.filter((ym) => recorrentes.value.some((i) => amountIn(i, ym) > 0) || ym >= (openedAt.value || '9999').slice(0, 7)));
const opRows = computed(() => {
    const map = new Map();
    for (const i of recorrentes.value) {
        const k = catKey(i);
        if (!map.has(k)) map.set(k, { key: k, label: catLabel(i) });
    }
    return [...map.values()].map((r) => {
        const da = recorrentes.value.filter((i) => catKey(i) === r.key);
        const cells = opMonths.value.map((ym) => ({ ym, v: da.reduce((s, i) => s + amountIn(i, ym), 0) }));
        return { ...r, cells, total: sumOf(da) };
    }).sort((a, b) => b.total - a.total);
});
const opTotals = computed(() => opMonths.value.map((ym) => recorrentes.value.reduce((s, i) => s + amountIn(i, ym), 0)));

// ── Lançamentos ──────────────────────────────────────────────────────────────
const fKind = ref('');
const fCat = ref('');
const fBusca = ref('');
const kindFiltro = computed(() => [
    { value: '', label: 'Todos', count: items.value.length },
    ...KIND_ORDER.filter((k) => items.value.some((i) => kindOf(i) === k))
        .map((k) => ({ value: k, label: kindMeta(k).label, count: items.value.filter((i) => kindOf(i) === k).length })),
]);
const catFiltro = computed(() => [
    { value: '', label: 'Todas as categorias' },
    ...porCategoria.value.map((c) => ({ value: c.key, label: c.label })),
]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const filtrados = computed(() => {
    const q = norm(fBusca.value);
    return items.value.filter((i) => (!fKind.value || kindOf(i) === fKind.value)
        && (!fCat.value || catKey(i) === fCat.value)
        && (!q || norm([i.supplier, niceName(i.supplier), i.contaCode, i.contaName, i.categoryName, i.billId, i.docNumber, i.notes].join(' ')).includes(q)));
});
const colunas = [
    { key: 'paidAt', label: 'Pago em', priority: 1, sortable: true, sortValue: (r) => r.paidAt || '' },
    { key: 'supplier', label: 'Fornecedor', priority: 1, sortable: true, sortValue: (r) => niceName(r.supplier) },
    { key: 'categoryName', label: 'Categoria', priority: 2, sortable: true, sortValue: (r) => catLabel(r) },
    { key: 'kind', label: 'Tipo', priority: 2, sortable: true, truncate: false, sortValue: (r) => kindMeta(kindOf(r)).label },
    { key: 'billId', label: 'Documento', priority: 3 },
    { key: 'amount', label: 'Valor', priority: 1, numeric: true, sortable: true },
];
</script>

<template>
    <div class="flex flex-col gap-10">

        <!-- ══ Capa ══ -->
        <section class="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-6 items-end stagger-in" style="--i: 0">
            <div class="flex flex-col gap-3 min-w-0 order-2 lg:order-1">
                <p class="metric-label">Relatório do stand · dados do Sienge</p>
                <h2 class="text-metric-lg sm:text-metric-xl font-semibold text-ink leading-none text-balance">{{ stand.name }}</h2>
                <div class="flex flex-col gap-1 text-sm text-ink-muted">
                    <p v-for="p in endereco" :key="p">{{ p }}</p>
                    <p v-if="openedAt">
                        Inaugurado em <b class="text-ink font-semibold">{{ fmtDate(openedAt) }}</b>
                        · no ar há <b class="text-ink font-semibold">{{ dias }} dias</b>
                    </p>
                    <p v-if="modelo">
                        Modelo de referência: <b class="text-ink font-semibold">{{ modelo.name }}</b>
                        <span v-if="faixa || fmtAreaRange(modelo)"> ({{ [faixa, fmtAreaRange(modelo)].filter(Boolean).join(', ') }})</span>
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    <Badge :variant="status.variant" size="sm"><i :class="status.icon" class="mr-1 text-micro"></i>{{ status.label }}</Badge>
                    <span v-for="cc in stand.cost_centers || []" :key="cc.code"
                        class="px-2 py-0.5 rounded-full border border-line bg-surface-raised text-micro text-ink-muted"
                        :title="cc.name">
                        CC <b class="text-ink font-mono">{{ cc.code }}</b> · {{ cc.name }}
                    </span>
                    <button v-if="canManage" type="button"
                        class="px-2 py-0.5 rounded-full border border-dashed border-line text-micro text-ink-subtle hover:text-ink hover:border-line-strong transition-colors duration-120 min-h-[28px]"
                        @click="emit('edit')">
                        <i class="fas fa-pen mr-1"></i>Editar dados
                    </button>
                </div>
            </div>
            <button v-if="capa" type="button" class="order-1 lg:order-2 block w-full rounded-xl overflow-hidden group cursor-zoom-in focus-ring"
                :title="capa.caption || 'Ampliar a foto'" @click="verFoto(0)">
                <img :src="capa.url" :alt="capa.caption || stand.name"
                    class="w-full aspect-[16/10] object-cover transition-transform duration-420 ease-out-expo group-hover:scale-[1.015]" />
            </button>
        </section>

        <!-- ══ KPIs ══ -->
        <section class="kpis grid grid-cols-2 lg:grid-cols-4 border-y border-line">
            <button type="button" class="kpi focus-ring stagger-in" style="--i: 1" @click="abrirLista('all')">
                <span class="metric-label">Gasto total</span>
                <span class="metric text-metric-sm sm:text-metric xl:text-metric-lg whitespace-nowrap" :class="{ 'metric-counting': cTotal.counting.value }">{{ fmtBRLShort(cTotal.display.value) }}</span>
                <span class="text-xs text-ink-muted">{{ items.length }} lançamentos pagos</span>
                <span class="kpi-go">Ver todos</span>
            </button>
            <button type="button" class="kpi focus-ring stagger-in" style="--i: 2" @click="abrirLista('kind|construcao')">
                <span class="metric-label">Construção<i v-if="definido" class="fas fa-lock ml-1"></i></span>
                <span class="metric text-metric-sm sm:text-metric xl:text-metric-lg whitespace-nowrap" :class="{ 'metric-counting': cConstr.counting.value }">{{ fmtBRLShort(cConstr.display.value) }}</span>
                <span v-if="divergeConstr" class="text-xs text-data-warn">congelada; hoje somaria {{ fmtBRLShort(construcao) }}</span>
                <span v-else-if="definido" class="text-xs text-ink-muted">congelada em {{ fmtDate(stand.defined_at) }}</span>
                <span v-else class="text-xs text-ink-muted">{{ faixa ? `modelo prevê ${faixa}` : 'montar o stand' }}</span>
                <span class="kpi-go">Ver a construção</span>
            </button>
            <button type="button" class="kpi focus-ring stagger-in" style="--i: 3" @click="abrir({ type: 'run' })">
                <span class="metric-label">Para manter</span>
                <span class="metric text-metric-sm sm:text-metric xl:text-metric-lg whitespace-nowrap" :class="{ 'metric-counting': cMonthly.counting.value }">
                    {{ fmtBRLShort(cMonthly.display.value) }}<span class="text-sm font-normal text-ink-muted">/mês</span>
                </span>
                <span class="text-xs text-ink-muted">{{ (stand.recurring_breakdown || []).length }} contas de recorrência</span>
                <span class="kpi-go">Ver a conta</span>
            </button>
            <button type="button" class="kpi focus-ring stagger-in" style="--i: 4" @click="irPendencias">
                <span class="metric-label">Pendências</span>
                <span class="metric text-metric-sm sm:text-metric xl:text-metric-lg whitespace-nowrap" :class="pendentes.length ? 'text-data-warn' : 'text-data-pos'">{{ pendentes.length }}</span>
                <span class="text-xs text-ink-muted">{{ pendentes.length ? 'no Sienge e na classificação' : 'nada a acertar' }}</span>
                <span class="kpi-go">{{ pendentes.length ? 'Ver o que acertar' : 'Ver detalhes' }}</span>
            </button>
        </section>

        <!-- ══ Mês a mês ══ -->
        <section class="flex flex-col gap-3">
            <div>
                <p class="metric-label">Mês a mês</p>
                <h3 class="text-lg font-semibold text-ink">Quando o dinheiro saiu</h3>
                <p class="text-sm text-ink-muted max-w-[70ch]">Valores pelo mês do pagamento. A montagem pesa nos primeiros meses; depois sobra o custo de manter o stand aberto.</p>
            </div>
            <Surface variant="raised" padding="md">
                <ReportMonthChart :items="items" :months="months"
                    @pick="(p) => abrirLista(p.ym ? `month|${p.ym}|${p.kind}` : `kind|${p.kind}`)" />
            </Surface>
        </section>

        <!-- ══ Composição e ritmo ══ -->
        <section class="flex flex-col gap-3">
            <div>
                <p class="metric-label">Composição e ritmo</p>
                <h3 class="text-lg font-semibold text-ink">Para onde foi o dinheiro e em que ritmo</h3>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-[1fr_1.25fr] gap-4 items-start">
                <Surface variant="raised" padding="md">
                    <p class="text-sm font-semibold text-ink mb-3">Por categoria</p>
                    <ul class="flex flex-col">
                        <li v-for="(c, idx) in porCategoria" :key="c.key" class="stagger-in" :style="{ '--i': idx }">
                            <button type="button"
                                class="w-full grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 items-center py-2 px-2 -mx-2 rounded-lg text-left hover:bg-surface-sunken transition-colors duration-120 focus-ring"
                                @click="abrirLista(`cat|${c.key}`)">
                                <span class="min-w-0 text-sm text-ink truncate">{{ c.label }}
                                    <span class="text-micro text-ink-subtle">· {{ c.n }}</span></span>
                                <span class="font-mono tabular-nums text-sm text-ink text-right">{{ fmtBRL(c.value) }}
                                    <span class="text-micro text-ink-subtle">{{ c.pct.toFixed(1).replace('.', ',') }}%</span></span>
                                <span class="col-span-2 h-2 rounded-full bg-surface-sunken overflow-hidden">
                                    <span class="block h-full rounded-full crescer" :class="kindMeta(c.kind).dot"
                                        :style="{ width: `${Math.max(c.width, 1.5)}%`, animationDelay: `${idx * 40}ms` }"></span>
                                </span>
                            </button>
                        </li>
                    </ul>
                </Surface>
                <Surface variant="raised" padding="md">
                    <div class="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                        <p class="text-sm font-semibold text-ink">Gasto acumulado</p>
                        <p class="text-micro text-ink-subtle">cada ponto é um dia de pagamento</p>
                    </div>
                    <ReportCumulative :items="items" :opened-at="openedAt" @pick="(d) => abrirLista(`day|${d}`)" />
                </Surface>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" :class="{ 'lg:grid-cols-4': fases.length > 3 }">
                <button v-for="(f, idx) in fases" :key="f.k" type="button"
                    class="fase focus-ring stagger-in text-left" :style="{ '--i': idx, borderTopColor: `rgb(var(--${f.k === 'sem_classificacao' ? 'data-neutral' : 'series-' + ({ construcao: 1, recorrencia: 2, esporadica: 3 })[f.k]}))` }"
                    @click="abrirLista(`kind|${f.k}`)">
                    <span class="metric-label">{{ kindMeta(f.k).label }}</span>
                    <span class="font-mono tabular-nums text-lg text-ink">{{ fmtBRL(f.v) }}</span>
                    <span class="text-xs text-ink-muted">{{ f.text }}</span>
                </button>
            </div>
        </section>

        <!-- ══ Contra o modelo ══ -->
        <section v-if="range" class="flex flex-col gap-3">
            <div>
                <p class="metric-label">Contra o modelo</p>
                <h3 class="text-lg font-semibold text-ink">
                    A construção ficou {{ range.fora }} da faixa do {{ modelo.name }}
                </h3>
                <p class="text-sm text-ink-muted max-w-[70ch]">
                    O {{ modelo.name }} prevê {{ faixa }} para montar. A construção soma {{ fmtBRL(construcao) }}<template v-if="esporadica > 0">;
                    com os gastos esporádicos, {{ fmtBRL(range.montagem) }}</template>.
                </p>
            </div>
            <Surface variant="raised" padding="md">
                <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted mb-3">
                    <span class="inline-flex items-center gap-1.5"><span class="w-3 h-2 rounded-sm bg-series-1-soft"></span>Faixa do modelo</span>
                    <span class="inline-flex items-center gap-1.5"><span class="w-1 h-3 rounded-sm bg-series-1"></span>Construção <b class="font-mono text-ink font-medium">{{ fmtBRL(construcao) }}</b></span>
                    <span v-if="esporadica > 0" class="inline-flex items-center gap-1.5"><span class="w-1 h-3 rounded-sm bg-series-3"></span>Com esporádicos <b class="font-mono text-ink font-medium">{{ fmtBRL(range.montagem) }}</b></span>
                </div>
                <div class="relative h-9">
                    <div class="absolute inset-x-0 top-4 h-1 rounded bg-line"></div>
                    <div class="absolute top-3 h-3 rounded bg-series-1-soft"
                        :style="{ left: range.pct(range.min), width: `calc(${range.pct(range.max || range.min)} - ${range.pct(range.min)})` }"></div>
                    <div class="marca bg-series-1" :style="{ left: range.pct(construcao) }" :title="`Construção ${fmtBRL(construcao)}`"></div>
                    <div v-if="esporadica > 0" class="marca bg-series-3" :style="{ left: range.pct(range.montagem) }" :title="`Com esporádicos ${fmtBRL(range.montagem)}`"></div>
                </div>
                <div class="relative h-5 text-micro text-ink-subtle">
                    <span class="absolute -translate-x-1/2" :style="{ left: range.pct(range.min) }">{{ fmtBRLShort(range.min) }}</span>
                    <span v-if="range.max" class="absolute -translate-x-1/2" :style="{ left: range.pct(range.max) }">{{ fmtBRLShort(range.max) }}</span>
                </div>
            </Surface>
        </section>

        <!-- ══ Operação ══ -->
        <section v-if="opRows.length" class="flex flex-col gap-3">
            <div>
                <p class="metric-label">Operação</p>
                <h3 class="text-lg font-semibold text-ink">Quanto custa manter o stand aberto</h3>
                <p class="text-sm text-ink-muted max-w-[70ch]">
                    Perto de <button type="button" class="font-semibold text-ink underline decoration-dotted underline-offset-4 hover:text-accent" @click="abrir({ type: 'run' })">{{ fmtBRL(monthly) }} por mês</button>,
                    conta a conta pelos últimos meses fechados. Clique num valor para ver o pagamento.
                </p>
            </div>
            <div class="overflow-x-auto rounded-xl border border-line bg-surface-raised">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-line">
                            <th class="metric-label text-left px-3 py-2.5 font-normal">Conta</th>
                            <th v-for="ym in opMonths" :key="ym" class="metric-label text-right px-3 py-2.5 font-normal whitespace-nowrap">
                                {{ fmtYm(ym) }}{{ ym === currentYm() ? '*' : '' }}
                            </th>
                            <th class="metric-label text-right px-3 py-2.5 font-normal">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="r in opRows" :key="r.key" class="border-b border-line-subtle">
                            <td class="px-3 py-2 text-ink whitespace-nowrap">{{ r.label }}</td>
                            <td v-for="c in r.cells" :key="c.ym" class="px-1 py-1 text-right">
                                <button v-if="c.v" type="button" class="focus-ring celula" @click="abrirLista(`catmonth|${r.key}|${c.ym}`)">{{ fmtBRL(c.v) }}</button>
                                <span v-else class="px-2 text-ink-subtle">-</span>
                            </td>
                            <td class="px-1 py-1 text-right">
                                <button type="button" class="focus-ring celula font-medium" @click="abrirLista(`cat|${r.key}`)">{{ fmtBRL(r.total) }}</button>
                            </td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-semibold text-ink">Total da operação</td>
                            <td v-for="(v, j) in opTotals" :key="j" class="px-1 py-1 text-right">
                                <button v-if="v" type="button" class="focus-ring celula font-semibold" @click="abrirLista(`month|${opMonths[j]}|recorrencia`)">{{ fmtBRL(v) }}</button>
                                <span v-else class="px-2 text-ink-subtle">-</span>
                            </td>
                            <td class="px-1 py-1 text-right">
                                <button type="button" class="focus-ring celula font-semibold" @click="abrirLista('kind|recorrencia')">{{ fmtBRL(recorrencia) }}</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- ══ O stand ══ -->
        <section v-if="itensPresentes.length || fotos.length" class="flex flex-col gap-4">
            <div>
                <p class="metric-label">O stand</p>
                <h3 class="text-lg font-semibold text-ink">O que o cliente encontra lá</h3>
            </div>
            <ul v-if="itensPresentes.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                <li v-for="i in itensPresentes" :key="i.label" class="flex items-start gap-2 text-sm text-ink">
                    <i class="fas fa-circle-check text-data-pos mt-1 text-xs"></i>{{ i.label }}
                </li>
            </ul>
            <div v-if="fotos.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <button v-for="(f, idx) in fotos" :key="f.id" type="button"
                    class="block rounded-lg overflow-hidden group cursor-zoom-in focus-ring stagger-in" :style="{ '--i': idx }"
                    :title="f.caption || 'Ampliar'" @click="verFoto(idx)">
                    <img :src="f.thumb_url || f.url" :alt="f.caption || 'Foto do stand'" loading="lazy"
                        class="w-full aspect-square object-cover transition-transform duration-420 ease-out-expo group-hover:scale-105" />
                </button>
            </div>
        </section>

        <!-- ══ Lançamentos ══ -->
        <section class="flex flex-col gap-3">
            <div>
                <p class="metric-label">Lançamentos</p>
                <h3 class="text-lg font-semibold text-ink">Todos os pagamentos, título a título</h3>
                <p class="text-sm text-ink-muted max-w-[70ch]">Cada linha é um título (ou parcela) pago no Sienge com o valor que cabe ao stand. Clique para abrir.</p>
            </div>
            <div class="flex flex-col lg:flex-row lg:items-center gap-2">
                <div class="overflow-x-auto no-scrollbar -mx-1 px-1">
                    <SegmentedControl v-model="fKind" :options="kindFiltro" size="sm" />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:flex-1">
                    <Select v-model="fCat" :options="catFiltro" placeholder="Todas as categorias" />
                    <Input v-model="fBusca" placeholder="Buscar fornecedor, conta ou título" icon-left="fas fa-magnifying-glass" />
                </div>
            </div>
            <p class="text-xs text-ink-muted">
                {{ filtrados.length }} lançamento{{ filtrados.length === 1 ? '' : 's' }} ·
                <b class="font-mono text-ink font-medium">{{ fmtBRL(sumOf(filtrados)) }}</b>
            </p>
            <DataTable :columns="colunas" :rows="filtrados" row-key="key" clickable sort-by="paidAt" sort-dir="asc"
                empty-icon="fas fa-receipt" empty-title="Nenhum lançamento" empty-text="Ajuste os filtros para ver mais."
                @row-click="abrirItem">
                <template #cell-paidAt="{ row }"><span class="font-mono text-xs">{{ fmtDate(row.paidAt) }}</span></template>
                <template #cell-supplier="{ row }">
                    <span class="block truncate text-ink">{{ niceName(row.supplier) }}</span>
                    <span v-if="shortNote(row.notes)" class="block truncate text-micro text-ink-subtle">{{ shortNote(row.notes) }}</span>
                </template>
                <template #cell-categoryName="{ row }">
                    <span class="block truncate">{{ catLabel(row) }}</span>
                    <span class="block text-micro text-ink-subtle font-mono">{{ row.contaCode }}</span>
                </template>
                <template #cell-kind="{ row }">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-micro font-medium whitespace-nowrap"
                        :class="[kindMeta(kindOf(row)).bg, kindMeta(kindOf(row)).border, kindMeta(kindOf(row)).text]">
                        <i :class="kindMeta(kindOf(row)).icon"></i>{{ kindMeta(kindOf(row)).label }}
                        <i v-if="row.source === 'manual'" class="fas fa-hand-pointer opacity-70" title="Classificado à mão"></i>
                    </span>
                </template>
                <template #cell-billId="{ row }"><span class="font-mono text-xs">{{ row.docType }} · {{ row.billId }}{{ row.installment > 1 ? '/' + row.installment : '' }}</span></template>
                <template #cell-amount="{ row }"><span class="font-mono tabular-nums">{{ fmtBRL(row.amount) }}</span></template>
            </DataTable>
        </section>

        <!-- ══ Pendências ══ -->
        <section ref="pendenciasEl" class="flex flex-col gap-3 scroll-mt-20">
            <div>
                <p class="metric-label">Pendências</p>
                <h3 class="text-lg font-semibold text-ink">{{ pendentes.length ? 'O que precisa de acerto' : 'Nada a acertar' }}</h3>
                <p class="text-sm text-ink-muted max-w-[70ch]">
                    {{ pendentes.length
                        ? 'Achadas sozinhas a cada abertura da tela. Resolvidas no Sienge ou na classificação, somem daqui.'
                        : 'Todos os lançamentos estão classificados, no departamento do stand, e as contas mensais apareceram em todos os meses.' }}
                </p>
            </div>
            <ol class="flex flex-col gap-2.5">
                <li v-for="(n, idx) in notes" :key="n.id"
                    class="stagger-in rounded-xl border px-4 py-3.5 flex flex-col gap-1.5"
                    :class="n.tone === 'warn' ? 'border-data-warn/30 bg-data-warn-soft' : 'border-line bg-surface-raised'"
                    :style="{ '--i': idx }">
                    <p class="text-sm font-semibold text-ink flex items-start gap-2">
                        <i :class="n.tone === 'warn' ? 'fas fa-triangle-exclamation text-data-warn' : 'fas fa-circle-info text-ink-subtle'" class="mt-0.5"></i>
                        {{ n.title }}
                    </p>
                    <p class="text-sm text-ink-muted">{{ n.text }}</p>
                    <p class="text-xs font-medium" :class="n.tone === 'warn' ? 'text-data-warn' : 'text-ink-muted'">{{ n.act }}</p>
                    <button v-if="n.items.length" type="button"
                        class="self-start mt-1 px-3 py-1.5 rounded-lg border border-line bg-surface-raised text-xs text-ink hover:border-line-strong transition-colors duration-120 focus-ring min-h-[36px]"
                        @click="abrirLista(`note|${n.id}`)">
                        Ver {{ n.items.length === 1 ? 'o lançamento' : `os ${n.items.length} lançamentos` }} · {{ fmtBRL(sumOf(n.items)) }}
                    </button>
                </li>
            </ol>
        </section>

        <!-- ══ Método ══ -->
        <section class="flex flex-col gap-2 text-sm text-ink-muted max-w-[78ch]">
            <p class="metric-label">Como os números saem</p>
            <p><b class="text-ink">O que conta como gasto do stand.</b> Os títulos pagos do Sienge na régua da aba Categorias
                (hoje, os apropriados ao departamento Stand de Vendas), pelo valor efetivamente pago: baixas de pagamento e
                adiantamento, sem estorno, com juros e multa e menos descontos, rateado pelo centro de custo e pelo departamento.</p>
            <p><b class="text-ink">Tipo de gasto.</b> Cada lançamento herda construção, recorrência ou esporádico da categoria
                da conta; quem cuida do stand reclassifica no próprio lançamento, e a classificação à mão vale sobre a da conta.</p>
            <p><b class="text-ink">Custo por mês.</b> Cada conta de recorrência entra pela média dos meses em que foi paga nos
                últimos 3 meses fechados; conta que só apareceu no mês corrente entra pelo valor dele.</p>
        </section>

        <ReportModal :open="modalOpen" :root="modalRoot" :items="items" :outside="outside" :notes="notes"
            :breakdown="stand.recurring_breakdown || []" :monthly="monthly" :category-options="categoryOptions"
            :can-manage="canManage" :saving="saving"
            @close="modalOpen = false" @classify="(p) => emit('classify', p)" />
        <PhotoLightbox v-model:open="lightboxOpen" :fotos="fotos" :inicial="lightboxIdx" />
    </div>
</template>

<style scoped>
.kpi {
    @apply flex flex-col gap-1 items-start text-left px-4 py-4 min-w-0 transition-colors duration-200;
}
.kpi:hover { @apply bg-surface-sunken; }
/* Celular: 2 colunas, divisória no meio e entre as linhas. Desktop: 4 em linha. */
.kpis > .kpi:nth-child(2n) { @apply border-l border-line; }
.kpis > .kpi:nth-child(n+3) { @apply border-t border-line; }
@media (min-width: 1024px) {
    .kpis > .kpi:nth-child(n+3) { border-top-width: 0; }
    .kpis > .kpi + .kpi { @apply border-l border-line; }
}
.kpi-go { @apply text-xs font-semibold text-accent mt-1; }
.fase {
    @apply flex flex-col gap-1 px-3 pt-3 pb-3.5 border-t-[3px] rounded-b-lg bg-transparent hover:bg-surface-raised transition-colors duration-200;
}
.marca {
    @apply absolute top-1 w-[3px] h-7 rounded-sm -translate-x-1/2;
    animation: deslizar 1.1s cubic-bezier(0.16, 1, 0.3, 1) both 0.2s;
}
@keyframes deslizar { from { left: 0; opacity: 0; } }
.celula {
    @apply w-full px-2 py-1.5 rounded-md font-mono tabular-nums text-right text-ink whitespace-nowrap hover:bg-surface-sunken hover:text-accent transition-colors duration-120;
}
.crescer { transform-origin: left center; animation: crescer 460ms cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes crescer { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) {
    .crescer { animation: none; }
    .marca { animation: none; }
}
</style>
