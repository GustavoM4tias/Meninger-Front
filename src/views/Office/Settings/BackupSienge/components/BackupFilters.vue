<script setup>
/**
 * BackupFilters - barra de filtros padrão do sistema para o histórico de backups.
 *
 * O período (padrão: mês corrente) é consultado no servidor, sem limite de
 * quantidade; os demais campos refinam o resultado carregado. Tudo só vale ao
 * clicar em Filtrar.
 *
 * O objeto `filters` é mutado direto (o pai o cria com reactive()).
 */
import { computed, ref } from 'vue';

import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const props = defineProps({
  filters: { type: Object, required: true },
  // { status:[{value,label}], importStatus:[...], stage:[...], trigger:[...] }
  facets: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  activeCount: { type: Number, default: 0 },
  // Rótulo do período atualmente carregado (ex: "agosto de 2026")
  appliedLabel: { type: String, default: '' },
});

const emit = defineEmits(['apply', 'reset']);

/** Ponte label ↔ value para os MultiSelector (que trabalham com strings). */
function bridge(facetKey, filterKey) {
  return computed({
    get: () => (props.filters[filterKey] || []).map(
      v => props.facets[facetKey]?.find(o => o.value === v)?.label || v,
    ),
    set: (labels) => {
      props.filters[filterKey] = labels.map(
        l => props.facets[facetKey]?.find(o => o.label === l)?.value ?? l,
      );
    },
  });
}

const statusLabels = computed(() => (props.facets.status || []).map(o => o.label));
const importLabels = computed(() => (props.facets.importStatus || []).map(o => o.label));
const stageLabels = computed(() => (props.facets.stage || []).map(o => o.label));
const triggerLabels = computed(() => (props.facets.trigger || []).map(o => o.label));

const selectedStatus = bridge('status', 'status');
const selectedImport = bridge('importStatus', 'importStatus');
const selectedStage = bridge('stage', 'stage');
const selectedTrigger = bridge('trigger', 'trigger');

// Recolhida ao abrir a tela - o período em uso já aparece no selo da barra.
const isExpanded = ref(false);

const invalidRange = computed(() =>
  !!props.filters.dateFrom && !!props.filters.dateTo && props.filters.dateFrom > props.filters.dateTo,
);

function apply() {
  if (invalidRange.value) return;
  emit('apply');
}
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar -->
    <div class="filters-toolbar">
      <button type="button" class="filters-toolbar-trigger" @click="isExpanded = !isExpanded">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Filtros</span>
        <Badge v-if="appliedLabel" variant="accent" size="sm">{{ appliedLabel }}</Badge>
        <Badge v-if="activeCount" variant="neutral" size="sm">
          +{{ activeCount }} filtro{{ activeCount > 1 ? 's' : '' }}
        </Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" icon="fas fa-rotate-left" @click="emit('reset')">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" :loading="loading" :disabled="invalidRange" @click="apply">
          <span class="hidden sm:inline">Filtrar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded" class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow: visible">

      <Input v-model="filters.dateFrom" type="date" label="Iniciado a partir de" @keyup.enter="apply" />
      <Input v-model="filters.dateTo" type="date" label="Iniciado até" @keyup.enter="apply"
        :error="invalidRange ? 'A data final é anterior à inicial' : ''" />

      <div v-if="statusLabels.length">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-flag text-[10px] mr-1 text-ink-subtle"></i>Status
        </label>
        <MultiSelector v-model="selectedStatus" :options="statusLabels" placeholder="Todos" />
      </div>

      <div v-if="importLabels.length">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-database text-[10px] mr-1 text-ink-subtle"></i>Restore
        </label>
        <MultiSelector v-model="selectedImport" :options="importLabels" placeholder="Todos" />
      </div>

      <div v-if="triggerLabels.length">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-bolt text-[10px] mr-1 text-ink-subtle"></i>Disparo
        </label>
        <MultiSelector v-model="selectedTrigger" :options="triggerLabels" placeholder="Todos" />
      </div>

      <div v-if="stageLabels.length">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-list-check text-[10px] mr-1 text-ink-subtle"></i>Etapa final
        </label>
        <MultiSelector v-model="selectedStage" :options="stageLabels" placeholder="Todas" />
      </div>

      <div class="sm:col-span-2">
        <Input v-model="filters.q" type="text" label="Busca livre" placeholder="ID, arquivo ou mensagem de erro"
          icon-left="fas fa-magnifying-glass" @keyup.enter="apply" />
      </div>
    </div>
  </section>
</template>
