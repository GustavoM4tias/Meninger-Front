<template>
    <DataTable :columns="colunas" :rows="items" row-key="key" :clickable="selectable"
        density="compact" empty-icon="fas fa-receipt" empty-title="Nenhum lançamento"
        empty-text="Nenhum pagamento de stand bate com este recorte."
        sort-by="paidAt" sort-dir="desc"
        @row-click="(row) => emit('toggle', row.key)">

        <!-- Seleção. O cabeçalho da tabela não abriga controle, então o
             "marcar todos" mora na barra de filtros, acima. -->
        <template #cell-sel="{ row }">
            <input type="checkbox" class="check" :checked="selected.has(row.key)" :disabled="!selectable"
                :title="selected.has(row.key) ? 'Desmarcar este lançamento' : 'Marcar este lançamento'"
                :aria-label="`Selecionar lançamento de ${row.supplier}`"
                @click.stop @change="emit('toggle', row.key)" />
        </template>

        <template #cell-supplier="{ row }">
            <span class="inline-flex items-center gap-1.5 min-w-0"
                :title="`${row.supplier} - conta ${row.contaCode} ${row.contaName || ''}`
                    + (row.standPlan === false ? ' (fora do plano de Despesas com Stand)' : '')">
                <i v-if="row.standPlan === false" class="fas fa-arrow-right-from-bracket text-micro text-data-warn shrink-0"></i>
                <span class="truncate">{{ row.supplier }}</span>
            </span>
        </template>

        <template #cell-kind="{ row }">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-micro font-medium"
                :class="[meta(row.kind).bg, meta(row.kind).border, meta(row.kind).text]"
                :title="`${meta(row.kind).label} — ${row.source === 'manual'
                    ? 'classificado à mão neste stand'
                    : row.kind ? `herdado da categoria ${row.categoryName}` : meta(row.kind).hint}`">
                <i :class="meta(row.kind).icon" class="text-micro"></i>
                {{ meta(row.kind).short }}
                <i v-if="row.source === 'manual'" class="fas fa-hand-pointer text-micro opacity-70"></i>
            </span>
        </template>

        <template #cell-months="{ row }">
            <span :title="row.months.map((m) => `${fmtYm(m.ym)}: ${fmtBRL(m.amount)}`).join(' · ')">
                {{ row.months.map((m) => fmtYm(m.ym)).join(', ') }}
            </span>
        </template>
    </DataTable>
</template>

<script setup>
// Lista de lançamentos do stand, item a item, na tabela padrão do Office
// (DataTable): ordenação por qualquer coluna, título em toda célula, e no
// celular a linha vira card com o resto dos campos a um toque.
//
// Serve tanto na visão "Itens" quanto dentro de cada mês na visão "Meses" — a
// seleção é do pai, então dá para marcar itens de meses diferentes e
// classificar tudo de uma vez.
import { computed } from 'vue';
import { fmtBRL, fmtDate, fmtYm } from '../standFormat';
import { kindMeta } from '@/stores/Marketing/SalesStand/salesStandStore';
import DataTable from '@/components/UI/DataTable.vue';

const props = defineProps({
    items: { type: Array, default: () => [] },
    // Set com as chaves selecionadas (compartilhado com o pai).
    selected: { type: Object, default: () => new Set() },
    selectable: { type: Boolean, default: true },
});
const emit = defineEmits(['toggle']);

const meta = (k) => kindMeta(k);

const colunas = computed(() => [
    ...(props.selectable
        ? [{ key: 'sel', label: '', priority: 1, width: '2.5rem', truncate: false }]
        : []),
    {
        key: 'paidAt', label: 'Pago em', priority: 1, sortable: true, truncate: false,
        format: (v) => fmtDate(v),
    },
    { key: 'supplier', label: 'Fornecedor', priority: 1, sortable: true },
    {
        key: 'amount', label: 'Valor', priority: 1, numeric: true, sortable: true,
        format: (v) => fmtBRL(v),
    },
    {
        key: 'kind', label: 'Tipo', priority: 2, sortable: true, truncate: false,
        sortValue: (r) => meta(r.kind).label,
    },
    {
        key: 'categoryName', label: 'Categoria', priority: 2, sortable: true,
        format: (v, r) => v || `Sem categoria (${r.contaName || r.contaCode})`,
    },
    {
        key: 'doc', label: 'Documento', priority: 2, sortable: true, truncate: false,
        value: (r) => [r.docType, r.docNumber].filter(Boolean).join(' '),
    },
    {
        key: 'contaName', label: 'Conta do Sienge', priority: 3, sortable: true,
        format: (v, r) => `${r.contaCode} — ${v || 'sem nome'}`,
    },
    { key: 'months', label: 'Meses pagos', priority: 3, truncate: false },
    { key: 'issuedAt', label: 'Emitido em', priority: 3, format: (v) => fmtDate(v) },
    { key: 'notes', label: 'Observação do título', priority: 3, truncate: false },
]);
</script>

<style scoped>
/* Caixa de seleção no padrão do sistema: sem cor solta, só tokens. */
.check {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    accent-color: rgb(var(--accent));
    cursor: pointer;
}
</style>
