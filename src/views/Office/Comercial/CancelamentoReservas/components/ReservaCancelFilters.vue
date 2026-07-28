<script setup>
import { computed, ref, onMounted } from 'vue';
import { useReservaCancelStore } from '@/stores/Comercial/ReservaCancel/reservaCancelStore';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

// Aplica → o pai dispara fetchHistory + fetchStats.
const emit = defineEmits(['filter-changed']);

const store = useReservaCancelStore();

// ── Opções ──────────────────────────────────────────────────────────────────
// Mesmos valores/labels usados nos KPIs e badges da tela.
const STATUS_OPTIONS = [
  { value: 'success',    label: 'Sucesso' },
  { value: 'blocked',    label: 'Pendência' },
  { value: 'error',      label: 'Erro' },
  { value: 'processing', label: 'Processando' },
  { value: 'skipped',    label: 'Não aplicável' },
  { value: 'ignored',    label: 'Duplicado' },
];
const statusLabels  = STATUS_OPTIONS.map(o => o.label);
const labelToStatus = Object.fromEntries(STATUS_OPTIONS.map(o => [o.label, o.value]));
const statusToLabel = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]));

// Empreendimentos vêm de /history-facets (array de strings) — cached no store.
const empreendimentosOptions = computed(() => store.facets?.empreendimentos || []);

// Etapas do CV (reserva e repasse) — o filtro guarda IDs, o seletor mostra os
// nomes do workflow do CV, como no relatório do Boleto do Ato.
const cvSituacaoOptions = computed(() => (store.facets?.cvSituacoes || []).map(s => s.nome).filter(Boolean));
const cvRepasseOptions  = computed(() => (store.facets?.cvRepasses  || []).map(s => s.nome).filter(Boolean));
const cvSitByLabel = computed(() => Object.fromEntries((store.facets?.cvSituacoes || []).map(s => [s.nome, String(s.id)])));
const cvSitById    = computed(() => Object.fromEntries((store.facets?.cvSituacoes || []).map(s => [String(s.id), s.nome])));
const cvRepByLabel = computed(() => Object.fromEntries((store.facets?.cvRepasses  || []).map(s => [s.nome, String(s.id)])));
const cvRepById    = computed(() => Object.fromEntries((store.facets?.cvRepasses  || []).map(s => [String(s.id), s.nome])));

const selectedCvSituacaoLabels = computed({
  get: () => (store.historyFilter.cvSituacao || []).map(v => cvSitById.value[String(v)] || String(v)),
  set: (labels) => { store.historyFilter.cvSituacao = labels.map(l => cvSitByLabel.value[l]).filter(Boolean); },
});
const selectedCvRepasseLabels = computed({
  get: () => (store.historyFilter.cvRepasse || []).map(v => cvRepById.value[String(v)] || String(v)),
  set: (labels) => { store.historyFilter.cvRepasse = labels.map(l => cvRepByLabel.value[l]).filter(Boolean); },
});

// V-model de labels ↔ valores para o MultiSelector de status. Escreve direto no
// store.historyFilter, então os KPIs da tela ficam sempre em sincronia.
const selectedStatusLabels = computed({
  get: () => (store.historyFilter.status || []).map(v => statusToLabel[v] || v),
  set: (labels) => { store.historyFilter.status = labels.map(l => labelToStatus[l] || l); },
});

// ── Apply / Clear ────────────────────────────────────────────────────────────
function applyFilters() {
  store.historyPage = 1;
  emit('filter-changed');
}
function clearFilters() {
  store.resetHistoryFilters();
  emit('filter-changed');
}

function onEnterApply(e) {
  if (e?.key === 'Enter') applyFilters();
}

// ── Indicadores ──────────────────────────────────────────────────────────────
const activeFiltersCount = computed(() => {
  let n = 0;
  const f = store.historyFilter;
  if (f.status?.length) n++;
  if (f.empreendimento?.length) n++;
  if (f.cvSituacao?.length) n++;
  if (f.cvRepasse?.length) n++;
  if (f.idreserva) n++;
  if (f.dateFrom)  n++;
  if (f.dateTo)    n++;
  if (f.q)         n++;
  return n;
});

// Expand/colapse (default expandido em >= lg)
const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
function toggle() { isExpanded.value = !isExpanded.value; }

onMounted(() => {
  store.fetchFacets();
});
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar -->
    <div class="filters-toolbar">
      <button @click="toggle"
        class="filters-toolbar-trigger">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Filtros</span>
        <Badge v-if="activeFiltersCount" variant="accent" size="sm">
          {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
        </Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" @click="applyFilters">
          <span class="hidden sm:inline">Filtrar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded"
      class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow:visible">

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-flag text-[10px] mr-1 text-ink-subtle"></i>Status do caso
        </label>
        <MultiSelector v-model="selectedStatusLabels"
          :options="statusLabels" placeholder="Todos" :select-all="false" />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
        </label>
        <MultiSelector :model-value="store.historyFilter.empreendimento"
          @update:modelValue="v => store.historyFilter.empreendimento = Array.isArray(v) ? v : []"
          :options="empreendimentosOptions" placeholder="Todos os empreendimentos"
          :page-size="200" :select-all="true" />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-flag text-[10px] mr-1 text-ink-subtle"></i>Etapa da reserva (CV)
        </label>
        <MultiSelector v-model="selectedCvSituacaoLabels"
          :options="cvSituacaoOptions" placeholder="Todas as etapas" :select-all="false" />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-building-columns text-[10px] mr-1 text-ink-subtle"></i>Etapa do repasse (CV)
        </label>
        <MultiSelector v-model="selectedCvRepasseLabels"
          :options="cvRepasseOptions" placeholder="Todas as etapas" :select-all="false" />
      </div>

      <Input v-model="store.historyFilter.dateFrom" type="date" label="Cancelado a partir de" />
      <Input v-model="store.historyFilter.dateTo" type="date" label="Cancelado até" />

      <Input v-model="store.historyFilter.idreserva" type="number" label="ID Reserva" placeholder="Ex: 7460"
        @keyup="onEnterApply" />

      <div class="sm:col-span-2 lg:col-span-3">
        <Input v-model="store.historyFilter.q" type="text" label="Busca livre"
          placeholder="Titular, unidade, contrato ou motivo"
          @keyup="onEnterApply" />
      </div>
    </div>
  </section>
</template>
