<script setup>
/**
 * O modal do relatório. Qualquer número da tela abre aqui a lista de
 * lançamentos que o compõem; da lista se chega ao lançamento, e do lançamento
 * se volta para a lista (pilha, com seta de voltar). Quem cuida do stand
 * classifica o lançamento ali mesmo.
 *
 *   views: { type: 'list', key } | { type: 'item', key } | { type: 'run' }
 */
import { ref, computed, watch } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import { kindMeta, KIND_OPTIONS } from '@/stores/Marketing/SalesStand/salesStandStore';
import { fmtBRL, fmtDate, fmtYm } from '../standFormat';
import { scopeFor, sumOf, kindOf, catLabel, niceName, shortNote, KIND_ORDER } from './reportModel';

const props = defineProps({
    open: { type: Boolean, default: false },
    // Vista inicial. Objeto novo = pilha nova.
    root: { type: Object, default: null },
    items: { type: Array, default: () => [] },
    outside: { type: Array, default: () => [] },
    notes: { type: Array, default: () => [] },
    breakdown: { type: Array, default: () => [] },
    monthly: { type: Number, default: 0 },
    categoryOptions: { type: Array, default: () => [] },
    canManage: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'classify']);

const stack = ref([]);
watch(() => props.root, (v) => { stack.value = v ? [v] : []; }, { immediate: true });
const view = computed(() => stack.value[stack.value.length - 1] || null);
const push = (v) => stack.value.push(v);
const back = () => { if (stack.value.length > 1) stack.value.pop(); };

const ctx = computed(() => ({ items: props.items, notes: props.notes }));
const allByKey = computed(() => new Map([...props.items, ...props.outside].map((i) => [i.key, i])));

// ── Lista ────────────────────────────────────────────────────────────────────
const scope = computed(() => (view.value?.type === 'list' ? scopeFor(view.value.key, ctx.value) : null));
const rows = computed(() => {
    if (!scope.value) return [];
    return scope.value.list
        .map((i) => ({ item: i, value: scope.value.amountOf(i) }))
        .sort((a, b) => (a.item.paidAt || '').localeCompare(b.item.paidAt || '') || b.value - a.value);
});
const listTotal = computed(() => rows.value.reduce((s, r) => s + r.value, 0));
const listByKind = computed(() => {
    const tot = listTotal.value || 1;
    return KIND_ORDER.map((k) => ({
        k, v: rows.value.filter((r) => kindOf(r.item) === k).reduce((s, r) => s + r.value, 0),
    })).filter((p) => p.v > 0).map((p) => ({ ...p, pct: (p.v / tot) * 100 }));
});

// ── Lançamento ───────────────────────────────────────────────────────────────
const item = computed(() => (view.value?.type === 'item' ? allByKey.value.get(view.value.key) || null : null));
const sameSupplier = computed(() => {
    if (!item.value) return [];
    const nome = niceName(item.value.supplier);
    return props.items.filter((i) => i.key !== item.value.key && niceName(i.supplier) === nome);
});
const form = ref({ kind: '', category_id: '' });
watch(item, (i) => {
    form.value = { kind: i?.kind || 'construcao', category_id: i?.categoryId || '' };
}, { immediate: true });
const categorySelect = computed(() => [{ value: '', label: '(Herdar da conta)' }, ...props.categoryOptions]);

function salvarClasse() {
    if (!item.value) return;
    emit('classify', {
        keys: [item.value.key],
        kind: form.value.kind,
        category_id: form.value.category_id ? Number(form.value.category_id) : null,
    });
}
function herdar() {
    if (item.value) emit('classify', { keys: [item.value.key], reset: true });
}

// ── Cabeçalho ────────────────────────────────────────────────────────────────
const head = computed(() => {
    if (!view.value) return { eyebrow: '', title: '', sub: '' };
    if (view.value.type === 'list') return { eyebrow: scope.value?.eyebrow, title: scope.value?.title, sub: '' };
    if (view.value.type === 'run') return { eyebrow: 'Custo por mês', title: 'Quanto custa manter o stand aberto', sub: 'Estimativa conta a conta, pelos últimos meses fechados' };
    const i = item.value;
    if (!i) return { eyebrow: '', title: 'Lançamento', sub: '' };
    return {
        eyebrow: catLabel(i),
        title: niceName(i.supplier),
        sub: `${i.docType || ''} ${i.docNumber || ''} · título ${i.billId}${i.installment > 1 ? `, parcela ${i.installment}` : ''}`,
    };
});

const kindLabel = (i) => (i.outsideDepartment ? 'Fora do departamento' : kindMeta(kindOf(i)).label);
</script>

<template>
    <Modal :open="open" size="lg" @close="emit('close')">
        <template #header>
            <div class="flex items-start gap-3 min-w-0">
                <button v-if="stack.length > 1" type="button" aria-label="Voltar"
                    class="h-10 w-10 shrink-0 grid place-items-center rounded-lg border border-line text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors duration-120 focus-ring"
                    @click="back">
                    <i class="fas fa-arrow-left text-sm"></i>
                </button>
                <div class="min-w-0">
                    <p class="metric-label">{{ head.eyebrow }}</p>
                    <h2 class="text-base sm:text-lg font-semibold text-ink leading-snug">{{ head.title }}</h2>
                    <p v-if="head.sub" class="text-xs text-ink-muted mt-0.5 font-mono">{{ head.sub }}</p>
                </div>
            </div>
        </template>

        <Transition name="troca" mode="out-in">
            <!-- ══ Lista ══ -->
            <div v-if="view?.type === 'list'" :key="`l-${view.key}`" class="flex flex-col gap-4">
                <div v-if="scope?.note" class="flex flex-col gap-1.5 rounded-lg border px-3.5 py-3"
                    :class="scope.note.tone === 'warn' ? 'border-data-warn/30 bg-data-warn-soft' : 'border-line bg-surface-sunken'">
                    <p class="text-sm text-ink">{{ scope.note.text }}</p>
                    <p class="text-xs font-medium" :class="scope.note.tone === 'warn' ? 'text-data-warn' : 'text-ink-muted'">
                        <i class="fas fa-wrench mr-1"></i>{{ scope.note.act }}
                    </p>
                </div>

                <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <p class="metric text-metric">{{ fmtBRL(listTotal) }}</p>
                    <p class="text-xs text-ink-muted">{{ rows.length }} lançamento{{ rows.length === 1 ? '' : 's' }} · toque para abrir</p>
                </div>

                <div v-if="listByKind.length > 1" class="flex flex-col gap-2">
                    <div class="flex h-2.5 rounded overflow-hidden gap-0.5">
                        <span v-for="p in listByKind" :key="p.k" class="h-full crescer"
                            :class="kindMeta(p.k).dot" :style="{ width: p.pct + '%' }"></span>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1">
                        <span v-for="p in listByKind" :key="p.k" class="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                            <span class="w-2 h-2 rounded-full" :class="kindMeta(p.k).dot"></span>{{ kindMeta(p.k).label }}
                            <span class="font-mono tabular-nums text-ink">{{ fmtBRL(p.v) }}</span>
                        </span>
                    </div>
                </div>

                <ul class="flex flex-col -mx-2">
                    <li v-for="(r, idx) in rows" :key="r.item.key" class="stagger-in" :style="{ '--i': idx }">
                        <button type="button"
                            class="w-full grid grid-cols-[3rem_1fr_auto] items-center gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-surface-sunken transition-colors duration-120 focus-ring border-b border-line-subtle min-h-[52px]"
                            @click="push({ type: 'item', key: r.item.key })">
                            <span class="font-mono text-xs text-ink-subtle">{{ fmtDate(r.item.paidAt).slice(0, 5) }}</span>
                            <span class="min-w-0">
                                <span class="block text-sm font-medium text-ink truncate">{{ niceName(r.item.supplier) }}</span>
                                <span class="block text-xs text-ink-muted truncate">
                                    {{ catLabel(r.item) }}<template v-if="shortNote(r.item.notes)"> · {{ shortNote(r.item.notes) }}</template>
                                </span>
                            </span>
                            <span class="text-right">
                                <span class="block font-mono tabular-nums text-sm text-ink">{{ fmtBRL(r.value) }}</span>
                                <span class="inline-flex items-center gap-1 text-micro"
                                    :class="r.item.outsideDepartment ? 'text-data-warn' : kindMeta(kindOf(r.item)).text">
                                    <span class="w-1.5 h-1.5 rounded-full"
                                        :class="r.item.outsideDepartment ? 'bg-data-warn' : kindMeta(kindOf(r.item)).dot"></span>
                                    {{ kindLabel(r.item) }}
                                </span>
                            </span>
                        </button>
                    </li>
                </ul>
                <p v-if="!rows.length" class="text-sm text-ink-muted">Nenhum lançamento neste recorte.</p>
            </div>

            <!-- ══ Lançamento ══ -->
            <div v-else-if="view?.type === 'item' && item" :key="`i-${view.key}`" class="flex flex-col gap-5">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="metric text-metric-lg">{{ fmtBRL(item.amount) }}</p>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium"
                        :class="item.outsideDepartment ? 'border-data-warn/30 bg-data-warn-soft text-data-warn'
                            : [kindMeta(kindOf(item)).bg, kindMeta(kindOf(item)).border, kindMeta(kindOf(item)).text]">
                        <i :class="item.outsideDepartment ? 'fas fa-triangle-exclamation' : kindMeta(kindOf(item)).icon"></i>
                        {{ kindLabel(item) }}
                    </span>
                </div>

                <dl class="grid grid-cols-1 sm:grid-cols-[11rem_1fr] text-sm border-t border-line">
                    <template v-for="row in [
                        ['Pago em', (item.months || []).length > 1
                            ? item.months.map((m) => `${fmtDate(m.paidAt)} (${fmtBRL(m.amount)})`).join(' + ')
                            : fmtDate(item.paidAt)],
                        ['Emissão', fmtDate(item.issuedAt)],
                        ['Fornecedor no Sienge', item.supplier],
                        ['Conta', `${item.contaCode} · ${item.contaName || ''}`],
                        ['Categoria', item.categoryName || 'Sem categoria'],
                        ['Classificação', item.outsideDepartment ? 'Fora dos totais até o título ganhar o departamento do stand'
                            : item.source === 'manual' ? 'Classificado à mão neste stand' : item.kind ? 'Herdada da categoria da conta' : 'Sem classificação'],
                        ['Documento', `${item.docType || ''} ${item.docNumber || ''} · título ${item.billId}/${item.installment}`],
                    ]" :key="row[0]">
                        <dt class="pt-2.5 sm:py-2.5 text-xs text-ink-muted sm:border-b border-line">{{ row[0] }}</dt>
                        <dd class="pb-2.5 sm:py-2.5 border-b border-line text-ink break-words min-w-0">{{ row[1] }}</dd>
                    </template>
                </dl>

                <div v-if="item.notes">
                    <p class="metric-label mb-1.5">Observação do título</p>
                    <p class="text-sm text-ink bg-surface-sunken rounded-lg px-3.5 py-3 whitespace-pre-wrap break-words">{{ item.notes }}</p>
                </div>

                <div v-if="canManage && !item.outsideDepartment" class="flex flex-col gap-3 rounded-lg border border-line px-3.5 py-3.5">
                    <p class="metric-label">Classificar este lançamento</p>
                    <SegmentedControl v-model="form.kind" block size="sm" :options="KIND_OPTIONS" />
                    <Select v-model="form.category_id" :options="categorySelect" placeholder="(Herdar da conta)" />
                    <div class="flex flex-wrap justify-end gap-2">
                        <Button v-if="item.source === 'manual'" variant="ghost" size="sm" icon="fas fa-rotate-left"
                            :loading="saving" @click="herdar">
                            Voltar a herdar da conta
                        </Button>
                        <Button variant="primary" size="sm" icon="fas fa-check" :loading="saving" @click="salvarClasse">
                            Salvar classificação
                        </Button>
                    </div>
                </div>

                <div v-if="sameSupplier.length">
                    <p class="metric-label mb-1">
                        Outros lançamentos de {{ niceName(item.supplier) }} · {{ fmtBRL(sumOf(sameSupplier)) }}
                    </p>
                    <ul class="flex flex-col -mx-2">
                        <li v-for="o in sameSupplier" :key="o.key">
                            <button type="button"
                                class="w-full grid grid-cols-[3rem_1fr_auto] items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-surface-sunken transition-colors duration-120 focus-ring min-h-[44px]"
                                @click="push({ type: 'item', key: o.key })">
                                <span class="font-mono text-xs text-ink-subtle">{{ fmtDate(o.paidAt).slice(0, 5) }}</span>
                                <span class="text-sm text-ink-muted truncate">{{ catLabel(o) }}<template v-if="shortNote(o.notes)"> · {{ shortNote(o.notes) }}</template></span>
                                <span class="font-mono tabular-nums text-sm text-ink">{{ fmtBRL(o.amount) }}</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- ══ Custo por mês ══ -->
            <div v-else-if="view?.type === 'run'" key="run" class="flex flex-col gap-4">
                <p class="metric text-metric">{{ fmtBRL(monthly) }}<span class="text-sm font-normal text-ink-muted"> /mês</span></p>
                <ul class="flex flex-col -mx-2">
                    <li v-for="(l, idx) in breakdown" :key="l.key" class="stagger-in" :style="{ '--i': idx }">
                        <button type="button"
                            class="w-full grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-surface-sunken transition-colors duration-120 focus-ring border-b border-line-subtle min-h-[52px]"
                            @click="push({ type: 'list', key: `cat|${l.key}` })">
                            <span class="min-w-0">
                                <span class="block text-sm font-medium text-ink">{{ l.name }}</span>
                                <span class="block text-xs text-ink-muted">{{ l.basis }} · {{ l.months.map(fmtYm).join(', ') }}</span>
                            </span>
                            <span class="font-mono tabular-nums text-sm text-ink">{{ fmtBRL(l.amount) }}</span>
                        </button>
                    </li>
                </ul>
                <p class="text-xs text-ink-muted">
                    Cada conta de recorrência entra pela média dos meses em que foi paga dentro dos últimos 3 meses
                    fechados. Conta que só apareceu no mês corrente entra pelo valor dele.
                </p>
            </div>
        </Transition>
    </Modal>
</template>

<style scoped>
.troca-enter-active,
.troca-leave-active { transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms cubic-bezier(0.16, 1, 0.3, 1); }
.troca-enter-from { opacity: 0; transform: translateX(10px); }
.troca-leave-to { opacity: 0; transform: translateX(-6px); }
.crescer { transform-origin: left center; animation: crescer 460ms cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes crescer { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) {
    .crescer { animation: none; }
    .troca-enter-active, .troca-leave-active { transition: none; }
}
</style>
