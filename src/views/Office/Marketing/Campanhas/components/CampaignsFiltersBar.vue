<script setup>
// FiltersBar de Campanhas — mesma estrutura visual do FiltersBar de Leads.
// Toolbar header (sempre visível) + grid expansível com MultiSelectors.
//
// SEM datas aqui: o período é a régua GLOBAL da tela (PeriodPicker no topo)
// e recorta as métricas — este bar só refina a listagem.
//
// O componente trabalha com um objeto `filtros` reativo (v-model:filtros).
// As opções dinâmicas (contas, mídias, objetivos) vêm via props.

import { computed, ref } from 'vue';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    filtros: { type: Object, required: true },
    // Período mestre da tela — as datas moram AQUI no filtro (sem picker no topo).
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

// ── Datas (período mestre — recorta KPIs/gráfico/tabelas) ──────────────────
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

const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

// ── Expandir/recolher ──────────────────────────────────────────────────────
// Recolhido por padrão (padrão do sistema) — o usuário abre quando precisar.
const isExpanded = ref(false);
function toggle() { isExpanded.value = !isExpanded.value; }
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">

    <!-- Toolbar header (sempre visível) -->
    <div class="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/40 rounded-t-xl">
      <button @click="toggle"
        class="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Filtros</span>
        <Badge v-if="hasActiveFilters" variant="accent" size="sm">{{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}</Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <slot name="extra-actions" />
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="$emit('limpar')">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" @click="$emit('buscar')">
          <span class="hidden sm:inline">Buscar</span>
        </Button>
      </div>
    </div>

    <!-- Campos: grid expansível -->
    <div v-show="isExpanded"
      class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow: visible;">

      <!-- Datas (período mestre) -->
      <Input v-model="dataInicio" type="date" label="Data início" size="sm" />
      <Input v-model="dataFim" type="date" label="Data fim" size="sm" />

      <!-- Status -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-circle-play text-[10px] mr-1 text-ink-subtle"></i>Status
        </label>
        <MultiSelector :model-value="filtros.status"
          @update:modelValue="v => updateField('status', v)"
          :options="statusOptions" placeholder="Todos os status" :page-size="50" />
      </div>

      <!-- Conta de anúncio -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-building-columns text-[10px] mr-1 text-ink-subtle"></i>Conta de anúncio
        </label>
        <MultiSelector :model-value="filtros.conta"
          @update:modelValue="v => updateField('conta', v)"
          :options="contasOptions" placeholder="Todas as contas" :page-size="150" />
      </div>

      <!-- Mídia (vínculo CV) -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-bullhorn text-[10px] mr-1 text-ink-subtle"></i>Mídia
        </label>
        <MultiSelector :model-value="filtros.midia"
          @update:modelValue="v => updateField('midia', v)"
          :options="midiasOptions" placeholder="Sem filtro" :page-size="150" />
      </div>

      <!-- Objetivo -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-bullseye text-[10px] mr-1 text-ink-subtle"></i>Objetivo
        </label>
        <MultiSelector :model-value="filtros.objetivo"
          @update:modelValue="v => updateField('objetivo', v)"
          :options="objetivosOptions" placeholder="Todos objetivos" :page-size="50" />
      </div>

      <!-- Busca textual -->
      <div class="sm:col-span-2">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-magnifying-glass text-[10px] mr-1 text-ink-subtle"></i>Buscar
        </label>
        <Input :model-value="filtros.busca"
          @update:modelValue="v => updateField('busca', v)"
          placeholder="Nome da campanha, ID, observação..." size="sm" />
      </div>

      <!-- Ordenação (single-select via MultiSelector pra visual idêntico) -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-arrow-down-wide-short text-[10px] mr-1 text-ink-subtle"></i>Ordenar por
        </label>
        <MultiSelector :model-value="filtros.sort ? [sortLabelByKey[filtros.sort]] : []"
          @update:modelValue="v => updateField('sort', v.length ? (sortKeyByLabel[v[v.length - 1]] || 'spend') : 'spend')"
          :options="sortOptions" placeholder="Selecionar ordenação" :page-size="10" />
      </div>

      <!-- Opções extras -->
      <div class="sm:col-span-2">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-sliders text-[10px] mr-1 text-ink-subtle"></i>Opções
        </label>
        <div class="flex gap-2">
          <label class="inline-flex items-center gap-2 text-sm text-ink-muted cursor-pointer h-[34px] px-3 rounded-lg border border-line flex-1">
            <input type="checkbox" :checked="!!filtros.incluir_arquivadas"
              @change="e => updateField('incluir_arquivadas', e.target.checked)"
              class="accent-accent rounded" />
            Incluir arquivadas
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-ink-muted cursor-pointer h-[34px] px-3 rounded-lg border border-line flex-1"
            title="Inclui campanhas sem gasto/entrega no período selecionado (métricas zeradas)">
            <input type="checkbox" :checked="!!filtros.mostrar_sem_veiculacao"
              @change="e => updateField('mostrar_sem_veiculacao', e.target.checked)"
              class="accent-accent rounded" />
            Sem veiculação no período
          </label>
        </div>
      </div>

      <!-- Dica da régua de tempo -->
      <div class="sm:col-span-2 lg:col-span-4 text-[10px] text-ink-subtle">
        <i class="fas fa-circle-info mr-1"></i>
        As <b>datas</b> recortam TODAS as métricas (investido, leads, CAC, gráfico, tabelas).
        Os demais filtros só refinam a listagem.
      </div>
    </div>
  </section>
</template>
