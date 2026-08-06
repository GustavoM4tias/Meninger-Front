<script setup>
/**
 * BackupFilters - barra de filtros padrão do sistema para o histórico de backups.
 *
 * Filtro único por período (padrão: mês corrente). A consulta é feita no
 * servidor, sem limite de quantidade, ao clicar em Filtrar.
 *
 * O objeto `filters` é mutado direto (o pai o cria com reactive()).
 */
import { computed, ref } from 'vue';

import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';

const props = defineProps({
  filters: { type: Object, required: true },   // { dateFrom, dateTo }
  loading: { type: Boolean, default: false },
  // Rótulo do período atualmente carregado (ex: "agosto de 2026")
  appliedLabel: { type: String, default: '' },
});

const emit = defineEmits(['apply', 'reset']);

// Aberto por padrão só no desktop - no celular a barra começa recolhida.
const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);

const invalidRange = computed(() =>
  !!props.filters.dateFrom && !!props.filters.dateTo && props.filters.dateFrom > props.filters.dateTo,
);
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar -->
    <div class="filters-toolbar">
      <button type="button" class="filters-toolbar-trigger" @click="isExpanded = !isExpanded">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Período</span>
        <Badge v-if="appliedLabel" variant="accent" size="sm">{{ appliedLabel }}</Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" icon="fas fa-rotate-left" @click="emit('reset')">
          <span class="hidden sm:inline">Mês atual</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" :loading="loading" :disabled="invalidRange"
          @click="emit('apply')">
          <span class="hidden sm:inline">Filtrar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded" class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
      <Input v-model="filters.dateFrom" type="date" label="Iniciado a partir de"
        @keyup.enter="emit('apply')" />
      <Input v-model="filters.dateTo" type="date" label="Iniciado até"
        :error="invalidRange ? 'A data final é anterior à inicial' : ''"
        @keyup.enter="emit('apply')" />
    </div>
  </section>
</template>
