<script setup>
// Filtros de Campanhas sobre o FilterBar do Office (barra fechada por
// padrão, selo de "N ativos", Limpar/Buscar). Aqui só moram os campos.
//
// SEM datas aqui: o período é a régua GLOBAL da tela (PeriodPicker no topo)
// e recorta as métricas - este bar só refina a listagem.
//
// O componente trabalha com um objeto `filtros` reativo (v-model:filtros).
// As opções dinâmicas (contas, mídias, objetivos) vêm via props.

import { computed, ref } from 'vue';

import FilterBar from '@/components/UI/FilterBar.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import { labelBase } from '@/components/UI/_classes.js';

const props = defineProps({
    filtros: { type: Object, required: true },
    // Período mestre da tela - as datas moram AQUI no filtro (sem picker no topo).
    periodo: { type: Object, default: () => ({ since: '', until: '', preset: 'custom' }) },
    contasOptions: { type: Array, default: () => [] },
    midiasOptions: { type: Array, default: () => [] },
    objetivosOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:filtros', 'update:periodo', 'buscar', 'limpar']);

function updateField(key, val) {
    const next = { ...props.filtros, [key]: Array.isArray(val) ? [...val] : val };
    emit('update:filtros', next);
}

// ── Datas (período mestre - recorta KPIs/gráfico/tabelas) ──────────────────
const dataInicio = computed({
    get: () => props.periodo?.since || '',
    set: v => emit('update:periodo', { ...props.periodo, since: v || '', preset: 'custom' }),
});
const dataFim = computed({
    get: () => props.periodo?.until || '',
    set: v => emit('update:periodo', { ...props.periodo, until: v || '', preset: 'custom' }),
});

// ── Status: lista fixa estilo das opções do MultiSelector (strings) ────────
const statusOptions = ['Ativas', 'Pausadas', 'Arquivadas', 'Excluídas', 'Rascunho'];

// ── Sort: usa MultiSelector pra ter mesmo visual dos outros campos ─────────
const sortOptions = ['Maior gasto', 'Mais leads', 'Menor CAC', 'Mais recentes', 'A → Z'];
const sortLabelByKey = {
    spend: 'Maior gasto', leads: 'Mais leads', cac: 'Menor CAC',
    start: 'Mais recentes', name: 'A → Z',
};
const sortKeyByLabel = Object.fromEntries(
    Object.entries(sortLabelByKey).map(([k, v]) => [v, k]),
);

// ── Filtros ativos ─────────────────────────────────────────────────────────
const activeFiltersCount = computed(() => {
    const f = props.filtros || {};
    return Object.entries(f).reduce((acc, [k, v]) => {
        if (k === 'sort') return acc;                       // ordenação não é filtro
        if (Array.isArray(v)) return acc + (v.length > 0 ? 1 : 0);
        if (typeof v === 'boolean') return acc + (v ? 1 : 0);
        return acc + (v && String(v).trim() !== '' ? 1 : 0);
    }, 0);
});


</script>
<template>
  <FilterBar :active-count="activeFiltersCount" apply-label="Buscar" @apply="$emit('buscar')" @clear="$emit('limpar')">
    <!-- Datas (período mestre: recortam TODAS as métricas) -->
    <Input v-model="dataInicio" type="date" label="Data início" size="sm" />
    <Input v-model="dataFim" type="date" label="Data fim" size="sm" />

    <div>
      <label :class="labelBase">Status</label>
      <MultiSelector :model-value="filtros.status" @update:modelValue="v => updateField('status', v)"
        :options="statusOptions" placeholder="Todos os status" :page-size="50" />
    </div>
    <div>
      <label :class="labelBase">Conta de anúncio</label>
      <MultiSelector :model-value="filtros.conta" @update:modelValue="v => updateField('conta', v)"
        :options="contasOptions" placeholder="Todas as contas" :page-size="150" />
    </div>
    <div>
      <label :class="labelBase">Mídia</label>
      <MultiSelector :model-value="filtros.midia" @update:modelValue="v => updateField('midia', v)"
        :options="midiasOptions" placeholder="Sem filtro" :page-size="150" />
    </div>
    <div>
      <label :class="labelBase">Objetivo</label>
      <MultiSelector :model-value="filtros.objetivo" @update:modelValue="v => updateField('objetivo', v)"
        :options="objetivosOptions" placeholder="Todos objetivos" :page-size="50" />
    </div>

    <Input :model-value="filtros.busca" @update:modelValue="v => updateField('busca', v)"
      label="Buscar" placeholder="Nome da campanha, ID, observação..." size="sm" class="sm:col-span-2" />

    <div>
      <label :class="labelBase">Ordenar por</label>
      <MultiSelector :model-value="filtros.sort ? [sortLabelByKey[filtros.sort]] : []"
        @update:modelValue="v => updateField('sort', v.length ? (sortKeyByLabel[v[v.length - 1]] || 'spend') : 'spend')"
        :options="sortOptions" placeholder="Selecionar ordenação" :page-size="10" />
    </div>

    <div class="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-x-6 gap-y-2 pt-1">
      <Switch :model-value="!!filtros.incluir_arquivadas" @update:model-value="v => updateField('incluir_arquivadas', v)"
        size="sm" label="Incluir arquivadas" />
      <Switch :model-value="!!filtros.mostrar_sem_veiculacao" @update:model-value="v => updateField('mostrar_sem_veiculacao', v)"
        size="sm" label="Sem veiculação no período" description="Inclui campanhas sem gasto/entrega no período (métricas zeradas)" />
    </div>

    <p class="sm:col-span-2 lg:col-span-4 text-micro text-ink-subtle">
      <i class="fas fa-circle-info mr-1"></i>
      As <b>datas</b> recortam todas as métricas (investido, leads, CAC, gráfico, tabelas). Os demais filtros só refinam a listagem.
    </p>
  </FilterBar>
</template>
