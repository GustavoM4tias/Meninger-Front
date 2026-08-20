<script setup>
/**
 * StatRow — a linha de KPIs no topo de um Painel.
 * ─────────────────────────────────────────────────────────────────────────────
 * MÓVEL PRIMEIRO. Quem lê KPI é a diretoria, no celular. Por isso o padrão no
 * estreito é FAIXA ROLÁVEL (cards de largura fixa, deslizando na horizontal)
 * e não grade espremida: seis números apertados em duas colunas de 375px não
 * se leem. No largo vira grade normal.
 *
 * A rolagem fica presa a este container (nunca o corpo da página rolando de
 * lado) e sangra até a borda da tela para o card seguinte "espiar" e indicar
 * que há mais conteúdo.
 *
 *   <StatRow :items="kpis" :loading="carregando" />
 *   <StatRow :items="kpis" :cols="{ sm: 2, lg: 4 }" />
 *
 * Cada item é um objeto de StatCard. `key` identifica o card; use-a estável,
 * porque é ela que preserva a cor e a posição quando o filtro muda.
 */
import { computed } from 'vue';
import StatCard from './StatCard.vue';
import Skeleton from './Skeleton.vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  /* nº de colunas por breakpoint no modo grade */
  cols: { type: Object, default: () => ({ sm: 2, md: 3, lg: 4 }) },
  size: { type: String, default: 'md' },
  loading: { type: Boolean, default: false },
  /* false = sempre grade, inclusive no celular (use só com 2 ou 3 cards) */
  scrollMobile: { type: Boolean, default: true },
  /* Cards que filtram: repassa o clique com a chave do item. */
  selectable: { type: Boolean, default: false },
  activeKey: { type: [String, Number], default: null },
});

const emit = defineEmits(['select']);

/* Grades escritas por extenso — o Tailwind não gera classe montada em runtime. */
const GRID = {
  1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6',
};
const GRID_MD = {
  1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3',
  4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6',
};
const GRID_LG = {
  1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6', 7: 'lg:grid-cols-7', 8: 'lg:grid-cols-8',
};

const gridClasses = computed(() => [
  GRID[props.cols.sm] || '',
  GRID_MD[props.cols.md] || '',
  GRID_LG[props.cols.lg] || '',
]);
</script>

<template>
  <!-- sangria até a borda no celular: o próximo card espia e mostra que há mais -->
  <div :class="scrollMobile
    ? '-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar'
    : ''">
    <div class="gap-2.5 sm:gap-3" :class="[
      scrollMobile ? 'flex sm:grid min-w-max sm:min-w-0' : 'grid grid-cols-2',
      ...gridClasses,
    ]">
      <template v-if="loading && !items.length">
        <Skeleton v-for="i in (cols.lg || 4)" :key="`sk-${i}`" variant="stat"
          class="w-[10.5rem] sm:w-auto shrink-0" />
      </template>

      <StatCard v-for="(item, i) in items" :key="item.key || item.label" v-bind="item" :size="size"
        :loading="loading" :selectable="selectable" :active="selectable && activeKey === item.key"
        :style="{ '--i': i }" class="card-enter"
        @select="emit('select', item)" />
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
