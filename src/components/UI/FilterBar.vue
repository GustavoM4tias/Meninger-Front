<script setup>
/**
 * FilterBar — a barra de filtros do Office, uma só.
 * ─────────────────────────────────────────────────────────────────────────────
 * Consolida o bloco que hoje é copiado tela a tela (`.filters-toolbar` +
 * gatilho + selo de "N ativos" + Limpar/Filtrar + grade de campos).
 *
 * Duas coisas que sempre davam errado quando era copiado à mão e aqui vêm de
 * graça:
 *  - a barra tem ALTURA FIXA, então aparecer ou sumir o selo "N ativos" não
 *    empurra a página (a tela dava um pulinho a cada seleção);
 *  - no celular ela começa RECOLHIDA, porque quatro campos abertos empurram o
 *    conteúdo para baixo da dobra.
 *
 *   <FilterBar :active-count="n" @apply="buscar" @clear="limpar">
 *     <Input label="Busca" v-model="q" />
 *     <Select label="Empreendimento" v-model="emp" :options="emps" />
 *   </FilterBar>
 *
 * Os campos vão no slot padrão e entram numa grade responsiva pronta.
 */
import { ref, watch } from 'vue';
import Badge from './Badge.vue';
import Button from './Button.vue';

const props = defineProps({
  /* nº de filtros preenchidos; alimenta o selo e o realce da barra */
  activeCount: { type: Number, default: 0 },
  title: { type: String, default: 'Filtros' },
  icon: { type: String, default: 'fas fa-filter' },
  /* colunas da grade de campos no desktop */
  cols: { type: Number, default: 4 },
  /* Começa FECHADA, sempre. Relatório serve para ler o resultado; o filtro é
     um meio, não o assunto. Quatro campos abertos empurram os números para
     baixo da dobra, no celular e no monitor. O selo "N ativos" na barra já diz
     que existe filtro aplicado sem precisar abrir. */
  defaultOpen: { type: Boolean, default: false },
  applyLabel: { type: String, default: 'Filtrar' },
  clearLabel: { type: String, default: 'Limpar' },
  loading: { type: Boolean, default: false },
  /* esconde os botões quando a tela filtra ao digitar */
  autoApply: { type: Boolean, default: false },
});

const emit = defineEmits(['apply', 'clear', 'toggle']);

const open = ref(props.defaultOpen);

watch(open, (v) => emit('toggle', v));

/* Grades por extenso: o Tailwind não gera classe montada em runtime. */
const GRID = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
  6: 'sm:grid-cols-3 lg:grid-cols-6',
};
</script>

<template>
  <section class="panel surface-gradient">
    <div class="filters-toolbar">
      <button type="button" class="filters-toolbar-trigger focus-ring rounded-md px-1 -mx-1"
        :aria-expanded="open" @click="open = !open">
        <i :class="[icon, 'text-xs text-ink-muted']"></i>
        <span>{{ title }}</span>
        <Badge v-if="activeCount" variant="accent" size="sm">
          {{ activeCount }} ativo{{ activeCount > 1 ? 's' : '' }}
        </Badge>
        <i class="fas fa-chevron-down text-micro text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': open }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <slot name="actions" />
        <template v-if="!autoApply">
          <Button variant="ghost" size="sm" icon="fas fa-eraser" :disabled="!activeCount" @click="emit('clear')">
            <span class="hidden sm:inline">{{ clearLabel }}</span>
          </Button>
          <Button size="sm" icon="fas fa-magnifying-glass" :loading="loading" @click="emit('apply')">
            <span class="hidden sm:inline">{{ applyLabel }}</span>
          </Button>
        </template>
      </div>
    </div>

    <div v-show="open" class="p-3 sm:p-4 grid grid-cols-1 gap-3 animate-fade-in" :class="GRID[cols] || GRID[4]">
      <slot />
    </div>

    <div v-if="$slots.chips && activeCount" class="px-3 sm:px-4 pb-3 flex flex-wrap gap-1.5">
      <slot name="chips" />
    </div>
  </section>
</template>
