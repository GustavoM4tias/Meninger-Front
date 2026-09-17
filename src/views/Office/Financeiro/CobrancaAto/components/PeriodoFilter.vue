<script setup>
/**
 * PeriodoFilter - o período da tela Ato e Parcelas, um só.
 * ─────────────────────────────────────────────────────────────────────────────
 * Quatro campos de data no padrão das outras telas (Conciliação: "Recebido
 * de / Recebido até"; Cancelamentos: "Cancelado a partir de / até"):
 *   Emitido de · Emitido até · Pago de · Pago até
 *
 * São dois períodos INDEPENDENTES. Preencher só um deles é o caso comum ("o
 * que emitimos em agosto", "o que entrou esta semana"); os dois juntos
 * respondem "do que saiu em agosto, o que foi pago em setembro".
 *
 *   <PeriodoFilter v-model="periodo" />
 *   periodo = { emitidoDe, emitidoAte, pagoDe, pagoAte }   (ISO YYYY-MM-DD ou '')
 *
 * Renderiza os quatro Inputs soltos (sem invólucro), então cada um ocupa uma
 * célula da grade do FilterBar, igual a qualquer outro campo.
 */
import Input from '@/components/UI/Input.vue';

const props = defineProps({
  modelValue: { type: Object, required: true },
});
const emit = defineEmits(['update:modelValue', 'change']);

const CAMPOS = [
  { key: 'emitidoDe', label: 'Emitido de' },
  { key: 'emitidoAte', label: 'Emitido até' },
  { key: 'pagoDe', label: 'Pago de' },
  { key: 'pagoAte', label: 'Pago até' },
];

function set(key, v) {
  const next = { ...props.modelValue, [key]: v || '' };
  emit('update:modelValue', next);
  emit('change', next);
}
</script>

<template>
  <Input v-for="c in CAMPOS" :key="c.key" type="date" :label="c.label"
    :model-value="modelValue[c.key] || ''" @update:modelValue="v => set(c.key, v)" />
</template>
