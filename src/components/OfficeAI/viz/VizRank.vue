<script setup>
/**
 * VizRank - ranking com barra (RankBars do design system) para um dataset de
 * "categoria x valor". É o que substitui a tabela na maioria das respostas de
 * "quem mais / qual maior": a barra maior é a maior, sem ler nove colunas.
 * Uma segunda numérica vira a meta da linha ("12 vendas · R$ 1,2 mi").
 */
import { computed } from 'vue';
import RankBars from '@/components/UI/RankBars.vue';
import { perfilDoDataset } from './emeBlock.js';
import { formatarValor, numeroDe } from './formatos.js';

const props = defineProps({
  dataset: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const p = computed(() => perfilDoDataset(props.dataset));
const catKey = computed(() => (p.value.categoricas[0] || p.value.temporais[0])?.key);
const valCol = computed(() => p.value.numericas[0]);
const metaCol = computed(() => p.value.numericas[1] || null);
const badgeCol = computed(() => (props.dataset.columns || []).find((c) => c.type === 'badge') || null);

const items = computed(() => (props.dataset.rows || [])
  .map((r, i) => ({
    key: `${r[catKey.value] ?? i}`,
    label: formatarValor(r[catKey.value], (p.value.categoricas[0] || p.value.temporais[0])?.type || 'text'),
    value: numeroDe(r[valCol.value?.key]) ?? 0,
    meta: metaCol.value ? `${metaCol.value.label || metaCol.value.key}: ${formatarValor(r[metaCol.value.key], metaCol.value.type)}` : undefined,
    badge: badgeCol.value ? r[badgeCol.value.key] : undefined,
  }))
  .sort((a, b) => b.value - a.value));

const fmt = (v) => formatarValor(v, valCol.value?.type || 'number');
</script>

<template>
  <div class="p-3">
    <RankBars :items="items" :value-format="fmt" :limit="compact ? 8 : 0" />
  </div>
</template>
