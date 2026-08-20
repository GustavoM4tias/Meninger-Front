<script setup>
/**
 * MetricInline — métricas em LINHA, não em cards.
 * ─────────────────────────────────────────────────────────────────────────────
 * Uma fileira de cards e, logo abaixo, outra fileira de cards, e mais outra:
 * o olho não sabe onde parar e a página vira uma parede de caixas.
 *
 * Aqui as métricas de apoio moram DENTRO do painel que elas explicam,
 * separadas só por um filete. Sem borda, sem sombra, sem fundo próprio: elas
 * apoiam o número principal, não competem com ele.
 *
 * Use quando as métricas são leitura secundária. Quando cada número é um
 * assunto por si (e às vezes leva a outra tela), aí sim é StatRow/StatCard.
 *
 *   <MetricInline :items="[
 *     { key: 'tempo', label: 'Tempo até finalizar', raw: 12.4, format: v => v.toFixed(1) + 'd', decimals: 1 },
 *     { key: 'aprov', label: '% Aprovação', raw: 61.2, format: fmtPct, tone: 'pos' },
 *   ]" />
 */
import MetricInlineItem from './MetricInlineItem.vue';

defineProps({
  items: { type: Array, default: () => [] },
});
</script>

<template>
  <dl class="grid grid-cols-2 sm:flex sm:flex-wrap
             divide-x divide-y sm:divide-y-0 divide-line-subtle
             border-t border-line-subtle">
    <MetricInlineItem v-for="(item, i) in items" :key="item.key || item.label"
      v-bind="item" :index="i" class="sm:flex-1" />
  </dl>
</template>
