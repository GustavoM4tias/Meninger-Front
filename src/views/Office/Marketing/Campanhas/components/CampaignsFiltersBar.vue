<script setup>
// FiltersBar de Campanhas — mesma estrutura visual do FiltersBar de Leads.
// Toolbar header (sempre visível) + grid expansível com MultiSelectors + datas.
//
// O componente trabalha com um objeto `filtros` reativo (v-model:filtros).
// As opções dinâmicas (contas, mídias, objetivos) vêm via props.

import { computed, ref } from 'vue';
import dayjs from 'dayjs';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    filtros: { type: Object, required: true },
    contasOptions: { type: Array, default: () => [] },
    midiasOptions: { type: Array, default: () => [] },
    objetivosOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:filtros', 'buscar', 'limpar']);

function updateField(key, val) {
    const next = { ...props.filtros, [key]: Array.isArray(val) ? [...val] : val };
    emit('update:filtros', next);
}

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

// ── Defaults de data (mês atual) ───────────────────────────────────────────
const defaultStart = dayjs().startOf('month').format('YYYY-MM-DD');
const defaultEnd   = dayjs().endOf('month').format('YYYY-MM-DD');

// Período começa VAZIO (mostra todas as campanhas). Vazio = sem filtro de data;
// o usuário aplica início/fim só quando quer recortar por período.
const dataInicio = computed({
    get: () => props.filtros.data_inicio || '',
    set: v  => updateField('data_inicio', v || ''),
});
const dataFim = computed({
    get: () => props.filtros.data_fim || '',
    set: v  => updateField('data_fim', v || ''),
});

// ── Filtros ativos ─────────────────────────────────────────────────────────
const activeFiltersCount = computed(() => {
    const f = props.filtros || {};
    return Object.entries(f).reduce((acc, [k, v]) => {
        // Datas default não contam como ativos
        if (k === 'data_inicio' && v === defaultStart) return acc;
        if (k === 'data_fim'    && v === defaultEnd)   return acc;
        if (Array.isArray(v)) return acc + (v.length > 0 ? 1 : 0);
        return acc + (v && String(v).trim() !== '' ? 1 : 0);
    }, 0);
});

const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

// ── Expandir/recolher ──────────────────────────────────────────────────────
const isExpanded = ref(window.innerWidth >= 1024);
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

      <!-- Datas (overlap) -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-calendar-day text-[10px] mr-1 text-ink-subtle"></i>Início do período
        </label>
        <Input v-model="dataInicio" type="date" size="sm" />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-calendar-check text-[10px] mr-1 text-ink-subtle"></i>Fim do período
        </label>
        <Input v-model="dataFim" type="date" size="sm" />
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
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-sliders text-[10px] mr-1 text-ink-subtle"></i>Opções
        </label>
        <label class="inline-flex items-center gap-2 text-sm text-ink-muted cursor-pointer h-[34px] px-3 rounded-lg border border-line w-full">
          <input type="checkbox" :checked="!!filtros.incluir_arquivadas"
            @change="e => updateField('incluir_arquivadas', e.target.checked)"
            class="accent-accent rounded" />
          Incluir arquivadas
        </label>
      </div>

      <!-- Dica de overlap -->
      <div class="sm:col-span-2 lg:col-span-4 text-[10px] text-ink-subtle space-y-0.5">
        <div>
          <i class="fas fa-circle-info mr-1"></i>
          O período filtra campanhas com <b>ads rodando no intervalo</b> (início ≤ fim AND término ≥ início).
        </div>
        <div class="pl-3.5">
          • <b>Ativas sem data de término</b>: consideradas rodando até hoje.
          <br>• <b>Pausadas/arquivadas sem data de término</b>: <b>excluídas</b> — não dá pra saber quando pararam. Pra ver, remova a data.
        </div>
      </div>
    </div>
  </section>
</template>
