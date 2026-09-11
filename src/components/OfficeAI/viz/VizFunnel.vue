<script setup>
/**
 * VizFunnel - funil numa faixa (FunnelStrip) para um dataset de etapas.
 * Cada linha é uma etapa; a cor vem da ordem fixa da paleta de série (ou da
 * coluna `tone`, quando a tool diz que a etapa é pos/neg/warn).
 */
import { computed } from 'vue';
import FunnelStrip from '@/components/UI/FunnelStrip.vue';
import { perfilDoDataset } from './emeBlock.js';
import { numeroDe } from './formatos.js';

const props = defineProps({
  dataset: { type: Object, required: true },
  unit: { type: String, default: 'itens' },
});

/* Classes escritas por extenso: o Tailwind não gera classe montada em runtime. */
const BAR = ['bg-series-1-soft', 'bg-series-2-soft', 'bg-series-3-soft', 'bg-series-4-soft', 'bg-series-5-soft', 'bg-series-6-soft', 'bg-series-7-soft', 'bg-series-8-soft'];
const TEXT = ['text-series-1', 'text-series-2', 'text-series-3', 'text-series-4', 'text-series-5', 'text-series-6', 'text-series-7', 'text-series-8'];
const TONE = {
  pos: ['bg-data-pos/70', 'text-data-pos'], neg: ['bg-data-neg/70', 'text-data-neg'],
  warn: ['bg-data-warn/70', 'text-data-warn'], neutral: ['bg-data-neutral/60', 'text-ink-muted'],
};

const p = computed(() => perfilDoDataset(props.dataset));
const catKey = computed(() => p.value.categoricas[0]?.key);
const valKey = computed(() => p.value.numericas[0]?.key);

const stages = computed(() => (props.dataset.rows || []).slice(0, 8).map((r, i) => {
  const tone = TONE[r.tone];
  return {
    key: `${r[catKey.value] ?? i}`,
    label: String(r[catKey.value] ?? '-'),
    count: numeroDe(r[valKey.value]) ?? 0,
    bar: tone ? tone[0] : BAR[i % 8],
    text: tone ? tone[1] : TEXT[i % 8],
  };
}));
const total = computed(() => props.dataset.total_funil ?? stages.value.reduce((s, e) => s + e.count, 0));
</script>

<template>
  <div class="p-3">
    <FunnelStrip :stages="stages" :total="total" :clickable="false" :unit="unit" />
  </div>
</template>
