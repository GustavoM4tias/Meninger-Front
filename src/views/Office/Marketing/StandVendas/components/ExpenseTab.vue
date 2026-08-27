<template>
    <div class="flex flex-col gap-5">

        <!-- O que ainda não tem lado. Aparece só quando existe, e leva direto
             para os lançamentos em questão. -->
        <Surface v-if="summary?.totals?.sem_classificacao > 0" variant="raised" padding="sm"
            class="border-data-warn/30 bg-data-warn/10">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="flex items-start gap-2.5 min-w-0 flex-1">
                    <i class="fas fa-circle-question text-data-warn mt-0.5"></i>
                    <p class="text-sm text-ink">
                        <span class="font-semibold">{{ fmtBRL(summary.totals.sem_classificacao) }}</span>
                        em {{ semClasseCount }} lançamento{{ semClasseCount === 1 ? '' : 's' }} não tem tipo — a conta
                        deles não está em nenhuma categoria.
                    </p>
                </div>
                <Button variant="secondary" size="sm" icon="fas fa-filter"
                    title="Filtrar a lista pelos lançamentos sem tipo" @click="filtrarSemClasse">
                    Ver estes
                </Button>
            </div>
        </Surface>

        <!-- Padrões recorrentes: o que se repete mês a mês, achado sozinho. -->
        <Panel v-if="patterns.length" title="Padrões recorrentes" icon="fas fa-wave-square"
            subtitle="Mesmo fornecedor e mesma conta pagando em vários meses. É o custo de manter o stand de pé.">
            <template #actions>
                <Badge variant="neutral" size="sm" :title="`Soma da média mensal dos ${ativos} padrões ainda ativos`">
                    {{ fmtBRL(recorrenteMes) }}/mês nos ativos
                </Badge>
            </template>
            <div class="flex flex-col divide-y divide-line">
                <div v-for="p in patterns" :key="p.id"
                    class="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-sm font-medium text-ink"
                                :title="`${p.supplier} — ${p.contaCode} ${p.contaName || ''}`">{{ p.supplier }}</span>
                            <Badge v-if="p.active" variant="success" size="sm"
                                title="Pagou no mês mais recente da base ou no anterior">ativo</Badge>
                            <Badge v-else variant="neutral" size="sm"
                                :title="`Último pagamento em ${fmtYm(p.lastYm)}`">parou em {{ fmtYm(p.lastYm) }}</Badge>
                        </div>
                        <p class="text-xs text-ink-muted mt-0.5"
                            :title="p.months.map((m) => `${fmtYm(m.ym)}: ${fmtBRL(m.amount)}`).join(' · ')">
                            {{ p.contaName || p.contaCode }} · {{ p.monthsCount }} meses
                            ({{ fmtYm(p.firstYm) }} a {{ fmtYm(p.lastYm) }}) · {{ p.itemKeys.length }} lançamentos
                        </p>
                    </div>
                    <div class="flex items-center gap-4 sm:gap-5 shrink-0">
                        <div class="text-right" :title="`Total ${fmtBRL(p.total)} dividido por ${p.monthsCount} meses`">
                            <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Média/mês</p>
                            <p class="font-mono tabular-nums font-semibold text-ink text-sm">{{ fmtBRL(p.avgMonth) }}</p>
                        </div>
                        <div class="text-right hidden sm:block" title="Soma de todos os lançamentos deste padrão">
                            <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Total</p>
                            <p class="font-mono tabular-nums text-ink-muted text-sm">{{ fmtBRL(p.total) }}</p>
                        </div>
                        <Button v-if="canManage" variant="ghost" size="sm" icon="fas fa-check-double"
                            :disabled="p.currentKind === 'recorrencia'"
                            :title="p.currentKind === 'recorrencia'
                                ? 'Todos os lançamentos deste padrão já são recorrência'
                                : `Marcar os ${p.itemKeys.length} lançamentos deste padrão como recorrência`"
                            @click="classificarPadrao(p)">
                            {{ p.currentKind === 'recorrencia' ? 'Já é recorrência' : 'Marcar recorrência' }}
                        </Button>
                    </div>
                </div>
            </div>
        </Panel>

        <!-- Visões do mesmo gasto -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <SegmentedControl v-model="view" :options="[
                { value: 'itens', label: 'Item a item', icon: 'fas fa-list-ul', count: filtrados.length },
                { value: 'meses', label: 'Mês a mês', icon: 'fas fa-calendar-days', count: meses.length },
                { value: 'categorias', label: 'Categorias', icon: 'fas fa-tags', count: summary?.byCategory?.length || 0 },
            ]" />
            <div v-if="view !== 'categorias'" class="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button v-if="canManage && view === 'itens'" variant="ghost" size="sm"
                    :icon="todosMarcados ? 'fas fa-square-check' : 'far fa-square'"
                    :title="todosMarcados
                        ? 'Desmarcar todos os lançamentos da lista'
                        : `Marcar os ${filtrados.length} lançamentos que estão na lista agora`"
                    @click="alternarTodos">
                    {{ todosMarcados ? 'Desmarcar todos' : 'Marcar todos' }}
                </Button>
                <Input v-model="busca" size="sm" icon-left="fas fa-magnifying-glass"
                    title="Filtra por fornecedor, documento, conta, categoria ou observação"
                    placeholder="Fornecedor, documento ou conta" class="sm:w-64" />
                <Select v-model="filtroTipo" size="sm" title="Filtrar por tipo de gasto" :options="[
                    { value: '', label: 'Todos os tipos' },
                    ...KIND_OPTIONS.map((k) => ({ value: k.value, label: k.label })),
                    { value: 'sem_classificacao', label: 'Sem classificação' },
                ]" class="sm:w-48" />
            </div>
        </div>

        <!-- Barra de seleção: só aparece com item marcado -->
        <Surface v-if="selecionados.size" variant="raised" padding="sm"
            class="sticky top-2 z-20 border-accent/30 shadow-lg">
            <div class="flex flex-col lg:flex-row lg:items-center gap-3">
                <div class="text-sm text-ink flex items-center gap-2 min-w-0">
                    <i class="fas fa-check-double text-accent"></i>
                    <span class="font-semibold">{{ selecionados.size }}</span>
                    lançamento{{ selecionados.size === 1 ? '' : 's' }}
                    <span class="text-ink-muted font-mono tabular-nums">({{ fmtBRL(valorSelecionado) }})</span>
                </div>
                <div class="flex flex-wrap items-center gap-2 lg:ml-auto">
                    <Button v-for="k in KIND_OPTIONS" :key="k.value" variant="secondary" size="sm" :icon="k.icon"
                        :loading="saving" :title="kindMeta(k.value).hint" @click="aplicar({ kind: k.value })">
                        {{ k.label }}
                    </Button>
                    <Select v-model="categoriaEmLote" size="sm" placeholder="Mudar categoria"
                        title="Joga os lançamentos marcados para outra categoria (o tipo passa a ser o dela)"
                        :options="[{ value: '', label: 'Mudar categoria' }, ...categoryOptions]" class="w-48"
                        @change="aplicarCategoria" />
                    <Button variant="ghost" size="sm" icon="fas fa-arrow-rotate-left" :loading="saving"
                        title="Apaga a classificação à mão: o tipo volta a ser o da categoria da conta"
                        @click="aplicar({ reset: true })">
                        Voltar ao padrão
                    </Button>
                    <Button variant="ghost" size="sm" icon="fas fa-xmark" title="Limpar a seleção"
                        @click="limparSelecao">Limpar</Button>
                </div>
            </div>
        </Surface>

        <!-- ══ Item a item ══ -->
        <ExpenseList v-if="view === 'itens'" :items="filtrados" :selected="selecionados" :selectable="canManage"
            @toggle="alternar" />

        <!-- ══ Mês a mês ══ -->
        <div v-else-if="view === 'meses'" class="flex flex-col gap-3">
            <Surface v-for="m in meses" :key="m.ym" variant="raised" padding="none" class="overflow-hidden">
                <button type="button"
                    class="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-sunken/60 transition-colors text-left"
                    :title="`${fmtYm(m.ym)}: ${fmtBRL(m.total)} no total`"
                    @click="alternarMes(m.ym)">
                    <i class="fas fa-chevron-right text-xs text-ink-subtle transition-transform"
                        :class="mesAberto === m.ym ? 'rotate-90' : ''"></i>
                    <span class="font-semibold text-ink w-20 shrink-0">{{ fmtYm(m.ym) }}</span>
                    <div class="hidden sm:flex items-center gap-0.5 flex-1 min-w-0">
                        <span v-for="f in fatias(m)" :key="f.kind" class="h-2 first:rounded-l last:rounded-r"
                            :class="kindMeta(f.kind).dot" :style="{ width: f.width }"
                            :title="`${kindMeta(f.kind).label}: ${fmtBRL(f.value)}`"></span>
                    </div>
                    <div class="ml-auto flex items-center gap-3 sm:gap-4 shrink-0 text-xs">
                        <span v-for="f in fatias(m)" :key="f.kind" class="font-mono tabular-nums hidden sm:inline"
                            :class="kindMeta(f.kind).text" :title="`${kindMeta(f.kind).label} em ${fmtYm(m.ym)}`">
                            {{ fmtBRLShort(f.value) }}
                        </span>
                        <span class="font-mono tabular-nums font-semibold text-ink text-sm"
                            :title="`Total pago em ${fmtYm(m.ym)}`">{{ fmtBRL(m.total) }}</span>
                    </div>
                </button>
                <div v-if="mesAberto === m.ym" class="border-t border-line p-3">
                    <ExpenseList :items="itensDoMes(m.ym)" :selected="selecionados" :selectable="canManage"
                        @toggle="alternar" />
                </div>
            </Surface>
            <EmptyState v-if="!meses.length" size="sm" icon="fas fa-calendar-days" title="Nenhum mês com gasto"
                description="Nenhum pagamento de stand nos centros de custo deste stand." />
        </div>

        <!-- ══ Categorias ══ -->
        <DataTable v-else :columns="colunasCategoria" :rows="summary?.byCategory || []" row-key="name"
            density="comfortable" sort-by="amount" sort-dir="desc"
            empty-icon="fas fa-tags" empty-title="Sem gasto categorizado"
            empty-text="Assim que houver pagamento de stand, ele aparece separado por categoria aqui.">
            <template #cell-name="{ row }">
                <span class="inline-flex items-center gap-2 min-w-0"
                    :title="`${row.name} — ${kindMeta(row.kind).label}`">
                    <span class="w-2 h-2 rounded-full shrink-0" :class="kindMeta(row.kind).dot"></span>
                    <span class="truncate">{{ row.name }}</span>
                </span>
            </template>
            <template #cell-kind="{ row }">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-micro font-medium"
                    :class="[kindMeta(row.kind).bg, kindMeta(row.kind).border, kindMeta(row.kind).text]"
                    :title="kindMeta(row.kind).hint">
                    <i :class="kindMeta(row.kind).icon" class="text-micro"></i>{{ kindMeta(row.kind).label }}
                </span>
            </template>
        </DataTable>
    </div>
</template>

<script setup>
// Aba Custos do stand: o gasto do Sienge item a item, mês a mês e por
// categoria, com a classificação (construção × recorrência × esporádica)
// feita aqui.
//
// A seleção é do PAI desta lista, e não da visão: dá para marcar um lançamento
// dentro de março, outro dentro de agosto e classificar os dois de uma vez.
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { fmtBRL, fmtBRLShort, fmtYm } from '../standFormat';
import { kindMeta, KIND_OPTIONS } from '@/stores/Marketing/SalesStand/salesStandStore';

import Surface from '@/components/UI/Surface.vue';
import Panel from '@/components/UI/Panel.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import DataTable from '@/components/UI/DataTable.vue';
import ExpenseList from './ExpenseList.vue';

const props = defineProps({
    expenses: { type: Array, default: () => [] },
    summary: { type: Object, default: null },
    patterns: { type: Array, default: () => [] },
    categoryOptions: { type: Array, default: () => [] },
    canManage: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
});
const emit = defineEmits(['classify']);

const toast = useToast();
const view = ref('itens');
const busca = ref('');
const filtroTipo = ref('');
const mesAberto = ref('');
const categoriaEmLote = ref('');
const selecionados = ref(new Set());

const semClasseCount = computed(() => props.expenses.filter((e) => !e.kind).length);
const ativos = computed(() => props.patterns.filter((p) => p.active).length);
const recorrenteMes = computed(() => props.patterns
    .filter((p) => p.active)
    .reduce((s, p) => s + Number(p.avgMonth || 0), 0));

const meses = computed(() => [...(props.summary?.byMonth || [])].reverse());

const filtrados = computed(() => {
    const q = busca.value.trim().toLowerCase();
    return props.expenses.filter((e) => {
        if (filtroTipo.value === 'sem_classificacao' && e.kind) return false;
        if (filtroTipo.value && filtroTipo.value !== 'sem_classificacao' && e.kind !== filtroTipo.value) return false;
        if (!q) return true;
        return [e.supplier, e.docNumber, e.docType, e.contaName, e.contaCode, e.categoryName, e.notes]
            .some((v) => String(v || '').toLowerCase().includes(q));
    });
});

const itensDoMes = (ym) => filtrados.value.filter((e) => e.months.some((m) => m.ym === ym));

const valorSelecionado = computed(() => props.expenses
    .filter((e) => selecionados.value.has(e.key))
    .reduce((s, e) => s + Number(e.amount || 0), 0));

const todosMarcados = computed(() => filtrados.value.length > 0
    && filtrados.value.every((e) => selecionados.value.has(e.key)));

// Fatias do mês na ordem dos tipos, só as que têm valor.
const ORDEM = ['construcao', 'recorrencia', 'esporadica', 'sem_classificacao'];
function fatias(m) {
    return ORDEM
        .filter((k) => Number(m[k]) > 0)
        .map((kind) => ({
            kind,
            value: Number(m[kind]),
            width: `${Math.max(2, Math.round((Number(m[kind]) / (Number(m.total) || 1)) * 100))}%`,
        }));
}

const colunasCategoria = computed(() => [
    { key: 'name', label: 'Categoria', priority: 1, sortable: true },
    { key: 'kind', label: 'Tipo', priority: 1, sortable: true, truncate: false, sortValue: (r) => kindMeta(r.kind).label },
    { key: 'amount', label: 'Valor', priority: 1, numeric: true, sortable: true, format: (v) => fmtBRL(v) },
    {
        key: 'share', label: 'Participação', priority: 2, numeric: true, sortable: true,
        value: (r) => Number(r.amount) || 0,
        format: (v) => participacao(v),
    },
    {
        key: 'items', label: 'Lançamentos', priority: 2, numeric: true, sortable: true,
        format: (v) => `${v} lançamento${v === 1 ? '' : 's'}`,
    },
]);

const participacao = (v) => {
    const total = props.summary?.totals?.total || 0;
    if (!total) return '0%';
    return `${Math.round((Number(v) / total) * 100)}%`;
};

function alternar(key) {
    if (!props.canManage) return;
    if (selecionados.value.has(key)) selecionados.value.delete(key);
    else selecionados.value.add(key);
}
function alternarTodos() {
    if (!props.canManage) return;
    const marcar = !todosMarcados.value;
    for (const e of filtrados.value) {
        if (marcar) selecionados.value.add(e.key);
        else selecionados.value.delete(e.key);
    }
}
function limparSelecao() {
    selecionados.value.clear();
}
function alternarMes(ym) {
    mesAberto.value = mesAberto.value === ym ? '' : ym;
}
function filtrarSemClasse() {
    view.value = 'itens';
    filtroTipo.value = 'sem_classificacao';
    busca.value = '';
}

function aplicar(payload) {
    const keys = [...selecionados.value];
    if (!keys.length) return;
    emit('classify', { keys, ...payload });
    limparSelecao();
}

function aplicarCategoria(value) {
    if (!value) return;
    const keys = [...selecionados.value];
    if (!keys.length) return;
    emit('classify', { keys, category_id: Number(value) });
    categoriaEmLote.value = '';
    limparSelecao();
}

function classificarPadrao(p) {
    if (!p.itemKeys?.length) return;
    emit('classify', { keys: p.itemKeys, kind: 'recorrencia' });
    toast.info(`${p.itemKeys.length} lançamentos de ${p.supplier} marcados como recorrência.`);
}

// Recarregou o stand: a seleção antiga não vale mais (as chaves podem ter saído
// do recorte) e a barra ficaria mentindo o total.
watch(() => props.expenses, () => limparSelecao());
</script>
