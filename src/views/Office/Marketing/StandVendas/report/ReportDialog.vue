<script setup>
/**
 * O modal do relatório, no desenho do relatório aprovado em HTML: cartão no
 * centro (folha de baixo no celular), entrada com leve impulso, seta de voltar
 * quando se navega da lista para o lançamento, e a foto em tela escura.
 *
 *   view: { type: 'list', key } | { type: 'item', key } | { type: 'run' } | { type: 'photo', idx }
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { KIND_OPTIONS } from '@/stores/Marketing/SalesStand/salesStandStore';
import { fmtBRL, fmtDate, fmtYm } from '../standFormat';
import { scopeFor, sumOf, kindOf, catLabel, niceName, shortNote, faseLabel, FASE } from './reportModel';
import './standReport.css';

const props = defineProps({
    open: { type: Boolean, default: false },
    root: { type: Object, default: null },
    items: { type: Array, default: () => [] },
    outside: { type: Array, default: () => [] },
    notes: { type: Array, default: () => [] },
    grupos: { type: Array, default: () => [] },
    groupOf: { type: Function, default: () => '' },
    breakdown: { type: Array, default: () => [] },
    monthly: { type: Number, default: 0 },
    photos: { type: Array, default: () => [] },
    categoryOptions: { type: Array, default: () => [] },
    canManage: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'classify']);

const stack = ref([]);
const closing = ref(false);
watch(() => props.root, (v) => { stack.value = v ? [{ ...v }] : []; }, { immediate: true });
const view = computed(() => stack.value[stack.value.length - 1] || null);
const push = (v) => stack.value.push(v);
const back = () => { if (stack.value.length > 1) stack.value.pop(); };
const bodyKey = computed(() => JSON.stringify(view.value || {}));

function close() {
    if (closing.value) return;
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduzido) { emit('close'); return; }
    closing.value = true;
    setTimeout(() => { closing.value = false; emit('close'); }, 170);
}

function onKey(e) {
    if (!props.open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    const v = view.value;
    if (v?.type === 'photo' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const n = props.photos.length;
        stack.value[stack.value.length - 1] = { type: 'photo', idx: (v.idx + (e.key === 'ArrowRight' ? 1 : -1) + n) % n };
    }
}
watch(() => props.open, (o) => {
    if (o) { window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden'; }
    else { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; }
}, { immediate: true });
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; });

const ctx = computed(() => ({ items: props.items, notes: props.notes, grupos: props.grupos, groupOf: props.groupOf }));
const allByKey = computed(() => new Map([...props.items, ...props.outside].map((i) => [i.key, i])));
const corDe = (i) => props.grupos.find((g) => g.key === props.groupOf(i))?.color || 'var(--sr-n2)';

// ── Lista ──
const scope = computed(() => (view.value?.type === 'list' ? scopeFor(view.value.key, ctx.value) : null));
const rows = computed(() => (scope.value ? scope.value.list
    .map((item) => ({ item, value: scope.value.amountOf(item) }))
    .sort((a, b) => (a.item.paidAt || '').localeCompare(b.item.paidAt || '') || b.value - a.value) : []));
const listTotal = computed(() => rows.value.reduce((s, r) => s + r.value, 0));
const listByGroup = computed(() => {
    const tot = listTotal.value || 1;
    return props.grupos.map((g) => ({
        ...g, v: rows.value.filter((r) => props.groupOf(r.item) === g.key).reduce((s, r) => s + r.value, 0),
    })).filter((g) => g.v > 0).map((g) => ({ ...g, pct: (g.v / tot) * 100 }));
});

// ── Lançamento ──
const item = computed(() => (view.value?.type === 'item' ? allByKey.value.get(view.value.key) || null : null));
const outros = computed(() => {
    if (!item.value) return [];
    const nome = niceName(item.value.supplier);
    return props.items.filter((i) => i.key !== item.value.key && niceName(i.supplier) === nome);
});
const form = ref({ kind: 'construcao', category_id: '' });
watch(item, (i) => { form.value = { kind: i?.kind || 'construcao', category_id: i?.categoryId || '' }; }, { immediate: true });

function comoClassificou(i) {
    if (i.outsideDepartment) return 'Fora dos totais até o título ganhar o departamento do stand no Sienge';
    const vivo = i.liveFixed ? `Corrigido no Sienge (conferência ao vivo de ${fmtDate(i.liveCheckedAt)}); ` : '';
    if (i.source === 'manual') return `${vivo}Classificado à mão neste stand`;
    if (!i.kind) return `${vivo}Sem classificação: nenhuma conta, regra ou janela de montagem pegou este lançamento`;
    const base = vivo + (i.source === 'regra' ? `Pela regra "${i.rule}"`
        : i.source === 'categoria' ? `Pela conta ${i.contaCode} (categoria ${i.categoryName})`
            : 'Pela janela de montagem');
    if (i.phase === 'montagem') return `${base}; implantação porque foi pago dentro da janela de montagem`;
    if (i.phase === 'pos_montagem') return `${base}; ajuste porque foi pago depois da montagem`;
    return base;
}
const detalhes = computed(() => {
    const i = item.value;
    if (!i) return [];
    return [
        ['Pago em', (i.months || []).length > 1 ? i.months.map((m) => `${fmtDate(m.paidAt)} (${fmtBRL(m.amount)})`).join(' + ') : fmtDate(i.paidAt)],
        ['Emissão', fmtDate(i.issuedAt)],
        ['Fornecedor no Sienge', i.supplier],
        ['Conta', `${i.contaCode} · ${i.contaName || ''}`],
        ['Natureza', i.categoryName || 'Sem categoria'],
        ['Como foi classificado', comoClassificou(i)],
        ['Documento', `${i.docType || ''} ${i.docNumber || ''} · título ${i.billId}/${i.installment}`],
    ];
});
function salvarClasse() {
    emit('classify', { keys: [item.value.key], kind: form.value.kind, category_id: form.value.category_id ? Number(form.value.category_id) : null });
}
function herdar() { emit('classify', { keys: [item.value.key], reset: true }); }

// ── Foto ──
const foto = computed(() => (view.value?.type === 'photo' ? props.photos[view.value.idx] : null));
function moverFoto(d) {
    const n = props.photos.length;
    stack.value[stack.value.length - 1] = { type: 'photo', idx: (view.value.idx + d + n) % n };
}

// ── Cabeçalho ──
const head = computed(() => {
    const v = view.value;
    if (!v) return {};
    if (v.type === 'list') return { eyebrow: scope.value?.eyebrow, title: scope.value?.title };
    if (v.type === 'run') return { eyebrow: 'Para manter', title: 'Quanto custa manter o stand aberto', sub: 'Conta a conta, pelos últimos meses fechados' };
    if (v.type === 'photo') return { eyebrow: `Foto ${v.idx + 1} de ${props.photos.length}`, title: foto.value?.caption || 'Stand de vendas' };
    const i = item.value;
    if (!i) return { title: 'Lançamento' };
    return { eyebrow: catLabel(i), title: niceName(i.supplier), sub: `${i.docType || ''} ${i.docNumber || ''} · título ${i.billId}${i.installment > 1 ? `, parcela ${i.installment}` : ''}` };
});
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="sr srd-wrap" :class="{ closing }" @mousedown.self="close">
            <div class="srd" :class="{ photo: view?.type === 'photo' }" role="dialog" aria-modal="true" :aria-label="head.title">
                <header class="srd-head">
                    <button v-if="stack.length > 1" type="button" class="srd-icon" aria-label="Voltar" @click="back">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="srd-t">
                        <p class="eyebrow">{{ head.eyebrow }}</p>
                        <h2 class="display">{{ head.title }}</h2>
                        <p v-if="head.sub" class="srd-sub num">{{ head.sub }}</p>
                    </div>
                    <button type="button" class="srd-icon" aria-label="Fechar" @click="close"><i class="fas fa-xmark"></i></button>
                </header>

                <div :key="bodyKey" class="srd-body" :class="{ flush: view?.type === 'photo' }">
                    <!-- Lista -->
                    <template v-if="view?.type === 'list'">
                        <div v-if="scope?.note" class="srd-note">
                            <p class="srd-note-act"><i class="fas fa-wrench"></i> {{ scope.note.act }}</p>
                            <p>{{ scope.note.text }}</p>
                        </div>
                        <div class="srd-total">
                            <span class="display v num">{{ fmtBRL(listTotal) }}</span>
                            <span class="n">{{ rows.length }} pagamento{{ rows.length === 1 ? '' : 's' }} · clique para ver o detalhe</span>
                        </div>
                        <template v-if="listByGroup.length > 1">
                            <div class="srd-bar">
                                <i v-for="g in listByGroup" :key="g.key" :style="{ width: g.pct + '%', background: g.color }" :title="`${g.label}: ${fmtBRL(g.v)}`"></i>
                            </div>
                            <div class="srd-legend">
                                <span v-for="g in listByGroup" :key="g.key"><i class="sw" :style="{ background: g.color }"></i>{{ g.label }} <b class="num">{{ fmtBRL(g.v) }}</b></span>
                            </div>
                        </template>
                        <div class="srd-list">
                            <button v-for="(r, k) in rows" :key="r.item.key" type="button" class="srd-row"
                                :style="{ animationDelay: Math.min(k * 25, 400) + 'ms' }" @click="push({ type: 'item', key: r.item.key })">
                                <span class="d num">{{ fmtDate(r.item.paidAt).slice(0, 5) }}</span>
                                <span class="w">
                                    <b>{{ niceName(r.item.supplier) }}</b>
                                    <span><i class="sw sm" :style="{ background: corDe(r.item) }"></i>{{ catLabel(r.item) }}<template v-if="shortNote(r.item.notes)"> · {{ shortNote(r.item.notes) }}</template></span>
                                </span>
                                <span class="a num">{{ fmtBRL(r.value) }}<span v-if="r.item.outsideDepartment" class="tag">fora do departamento</span><span v-else-if="r.item.liveFixed" class="tag ok" data-tip="A API do Sienge confirmou o departamento do stand; o espelho confirma na próxima carga">corrigido no Sienge</span></span>
                            </button>
                            <p v-if="!rows.length" class="srd-empty">Nenhum pagamento neste recorte.</p>
                        </div>
                    </template>

                    <!-- Lançamento -->
                    <template v-else-if="view?.type === 'item' && item">
                        <div class="srd-total">
                            <span class="display big num">{{ fmtBRL(item.amount) }}</span>
                            <span class="srd-pill"><i class="sw" :style="{ background: item.outsideDepartment ? 'var(--sr-warn-ink)' : (FASE[kindOf(item)] || FASE.sem_classificacao).color }"></i>{{ item.outsideDepartment ? 'Fora do departamento' : faseLabel(kindOf(item)) }}</span>
                        </div>
                        <dl class="srd-kv">
                            <template v-for="d in detalhes" :key="d[0]">
                                <dt>{{ d[0] }}</dt><dd>{{ d[1] }}</dd>
                            </template>
                        </dl>
                        <div v-if="item.notes">
                            <p class="eyebrow srd-gap">Observação do título</p>
                            <div class="srd-obs">{{ item.notes }}</div>
                        </div>
                        <div v-if="canManage && !item.outsideDepartment" class="srd-classify">
                            <p class="eyebrow">Classificar este lançamento</p>
                            <div class="srd-seg">
                                <button v-for="o in KIND_OPTIONS" :key="o.value" type="button" :aria-pressed="form.kind === o.value"
                                    @click="form.kind = o.value">{{ faseLabel(o.value) }}</button>
                            </div>
                            <select v-model="form.category_id" class="srd-select" aria-label="Natureza">
                                <option value="">(Herdar da conta ou da regra)</option>
                                <option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                            </select>
                            <div class="srd-actions">
                                <button v-if="item.source === 'manual'" type="button" class="srd-btn ghost" :disabled="saving" @click="herdar">Voltar ao automático</button>
                                <button type="button" class="srd-btn" :disabled="saving" @click="salvarClasse">{{ saving ? 'Salvando…' : 'Salvar classificação' }}</button>
                            </div>
                        </div>
                        <div v-if="outros.length">
                            <p class="eyebrow srd-gap">Outros pagamentos para {{ niceName(item.supplier) }} · {{ fmtBRL(sumOf(outros)) }}</p>
                            <div class="srd-list">
                                <button v-for="o in outros" :key="o.key" type="button" class="srd-row" @click="push({ type: 'item', key: o.key })">
                                    <span class="d num">{{ fmtDate(o.paidAt).slice(0, 5) }}</span>
                                    <span class="w"><b>{{ catLabel(o) }}</b><span>{{ shortNote(o.notes) || faseLabel(kindOf(o)) }}</span></span>
                                    <span class="a num">{{ fmtBRL(o.amount) }}</span>
                                </button>
                            </div>
                        </div>
                    </template>

                    <!-- Custo por mês -->
                    <template v-else-if="view?.type === 'run'">
                        <div class="srd-total"><span class="display v num">{{ fmtBRL(monthly) }}<small>/mês</small></span><span class="n">clique numa conta para ver os pagamentos</span></div>
                        <div class="srd-list">
                            <button v-for="l in breakdown" :key="l.key" type="button" class="srd-row two" @click="push({ type: 'list', key: `cat|${l.key}` })">
                                <span class="w"><b>{{ l.name }}</b><span>{{ l.basis }} · {{ l.months.map(fmtYm).join(', ') }}</span></span>
                                <span class="a num">{{ fmtBRL(l.amount) }}</span>
                            </button>
                        </div>
                        <p class="srd-alert">Cada conta de operação entra pela média dos meses em que foi paga nos últimos 3 meses fechados. Conta que só apareceu no mês corrente entra pelo valor dele. Conta paga fora do Sienge (no nome do locador, por exemplo) não aparece aqui.</p>
                    </template>

                    <!-- Foto -->
                    <div v-else-if="view?.type === 'photo' && foto" class="srd-photo">
                        <button v-if="photos.length > 1" type="button" class="srd-icon" aria-label="Foto anterior" @click="moverFoto(-1)"><i class="fas fa-chevron-left"></i></button>
                        <img :src="foto.url" :alt="foto.caption || 'Foto do stand'" />
                        <button v-if="photos.length > 1" type="button" class="srd-icon" aria-label="Próxima foto" @click="moverFoto(1)"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style>
.srd-wrap {
    position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 12px;
    background: var(--sr-scrim); backdrop-filter: blur(2px); animation: sr-fade 0.25s ease;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: var(--sr-ink);
}
.srd-wrap.closing { animation: sr-fade 0.18s ease reverse forwards; }
.srd {
    width: min(760px, 100%); max-height: min(86vh, 900px); display: grid; grid-template-rows: auto 1fr;
    background: var(--sr-paper); border-radius: 12px; box-shadow: var(--sr-shadow); overflow: hidden;
    animation: sr-pop 0.32s cubic-bezier(0.2, 0.9, 0.25, 1.05);
}
.srd-wrap.closing .srd { animation: sr-pop 0.18s ease-in reverse forwards; }
.srd.photo { width: min(1100px, 100%); background: #0b0f18; color: #e6ebf5; }
.srd.photo .eyebrow, .srd.photo .srd-sub { color: #9aa6bf; }
.srd.photo .srd-head { border-bottom-color: #222b3d; }
.srd.photo .srd-icon { background: #141b2a; border-color: #2a3550; color: #c4cde0; }
.srd-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid var(--sr-line); }
.srd-t { flex: 1; min-width: 0; display: grid; gap: 3px; }
.srd-t h2 { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.2; }
.srd-sub { font-size: 12.5px; color: var(--sr-muted); margin: 0; }
.srd-icon {
    width: 40px; height: 40px; flex: none; display: grid; place-items: center; border-radius: 8px; cursor: pointer;
    border: 1px solid var(--sr-line); background: var(--sr-paper); color: var(--sr-muted);
}
.srd-icon:hover { color: var(--sr-ink); }
.srd-body { overflow-y: auto; padding: 16px 20px 22px; display: grid; gap: 16px; align-content: start; animation: sr-swap 0.25s ease; }
.srd-body.flush { padding: 0; }
.srd-total { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.srd-total .v { font-size: 28px; font-weight: 700; }
.srd-total .v small { font-size: 15px; font-weight: 500; color: var(--sr-muted); }
.srd-total .big { font-size: 34px; font-weight: 700; }
.srd-total .n { font-size: 13px; color: var(--sr-muted); }
.srd-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--sr-line); color: var(--sr-muted); }
.srd-bar { display: flex; height: 12px; border-radius: 3px; overflow: hidden; background: var(--sr-sunken); }
.srd-bar i { display: block; height: 100%; transform-origin: left; animation: sr-widen 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.srd-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12.5px; color: var(--sr-muted); }
.srd-legend span { display: inline-flex; align-items: center; gap: 6px; }
.srd-legend b { color: var(--sr-ink); font-weight: 500; }
.srd-list { display: grid; }
.srd-row {
    display: grid; grid-template-columns: 52px 1fr auto; gap: 12px; align-items: center; padding: 10px 8px; margin-inline: -8px;
    border: 0; border-bottom: 1px solid var(--sr-line); background: none; text-align: left; cursor: pointer; border-radius: 6px;
    color: inherit; font: inherit; animation: sr-rise 0.3s ease both; min-height: 52px;
}
.srd-row.two { grid-template-columns: 1fr auto; }
.srd-row:hover, .srd-row:focus-visible { background: var(--sr-hover); }
.srd-row .d { font-size: 12.5px; color: var(--sr-muted); }
.srd-row .w { min-width: 0; display: grid; }
.srd-row .w b { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.srd-row .w span { font-size: 12.5px; color: var(--sr-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.srd-row .a { font-size: 13.5px; text-align: right; display: grid; justify-items: end; gap: 3px; }
.sw.sm { width: 8px; height: 8px; }
.srd-empty { color: var(--sr-muted); font-size: 14px; }
.srd-kv { display: grid; grid-template-columns: 180px 1fr; margin: 0; border-top: 1px solid var(--sr-line); }
.srd-kv dt, .srd-kv dd { margin: 0; padding: 9px 0; border-bottom: 1px solid var(--sr-line); font-size: 14px; }
.srd-kv dt { color: var(--sr-muted); font-size: 13px; }
.srd-kv dd { min-width: 0; overflow-wrap: anywhere; }
.srd-obs { background: var(--sr-sunken); border-radius: 8px; padding: 12px 14px; font-size: 13.5px; white-space: pre-wrap; overflow-wrap: anywhere; }
.srd-gap { margin-bottom: 6px; }
.srd-note { background: var(--sr-warn-bg); border: 1px solid var(--sr-warn-line); border-radius: 8px; padding: 12px 14px; display: grid; gap: 6px; font-size: 14px; }
.srd-note-act { color: var(--sr-warn-ink); font-weight: 600; font-size: 13.5px; }
.srd-alert { background: var(--sr-sunken); border-radius: 8px; padding: 10px 12px; font-size: 13px; color: var(--sr-muted); }
.srd-classify { display: grid; gap: 10px; border: 1px solid var(--sr-line); border-radius: 10px; padding: 14px; }
.srd-seg { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--sr-line); border-radius: 8px; overflow: hidden; }
.srd-seg button { border: 0; background: none; padding: 8px 6px; font: inherit; font-size: 13px; color: var(--sr-muted); cursor: pointer; min-height: 40px; }
.srd-seg button + button { border-left: 1px solid var(--sr-line); }
.srd-seg button[aria-pressed="true"] { background: var(--sr-ink); color: var(--sr-paper); }
.srd-select { font: inherit; font-size: 14px; padding: 8px 10px; min-height: 40px; border: 1px solid var(--sr-line); border-radius: 8px; background: var(--sr-paper); color: var(--sr-ink); }
.srd-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.srd-btn { border: 0; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; background: var(--sr-accent); color: #fff; min-height: 40px; }
.srd-btn.ghost { background: none; color: var(--sr-muted); border: 1px solid var(--sr-line); }
.srd-btn:disabled { opacity: 0.6; cursor: default; }
.srd-photo { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; padding: 12px; min-height: 0; }
.srd-photo img { max-height: 72vh; width: 100%; object-fit: contain; display: block; animation: sr-fade 0.3s ease; }
@media (max-width: 520px) {
    .srd-wrap { place-items: end center; padding: 0; }
    .srd { width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
    .srd-row { grid-template-columns: 1fr auto; }
    .srd-row .d { grid-column: 1 / -1; }
    .srd-kv { grid-template-columns: 1fr; }
    .srd-kv dt { border-bottom: 0; padding-bottom: 0; }
    .srd-photo { grid-template-columns: 1fr; }
    .srd-photo .srd-icon { display: none; }
}
</style>
