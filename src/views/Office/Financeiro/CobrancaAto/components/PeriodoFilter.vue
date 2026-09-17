<script setup>
/**
 * PeriodoFilter - o período da tela Ato e Parcelas, um só.
 * ─────────────────────────────────────────────────────────────────────────────
 * Dois períodos INDEPENDENTES, cada um com "de / até" e atalhos:
 *   - Emitido: quando o boleto (ou link) saiu;
 *   - Pago:    quando o cliente pagou.
 *
 * Preencher só um deles é o caso comum ("o que emitimos em agosto", "o que
 * entrou esta semana"); os dois juntos respondem "do que saiu em agosto, o
 * que foi pago em setembro". Antes a aba Histórico tinha UM período e um
 * botão "buscar por data de: Emissão | Pagamento" (dava para ver um OU outro),
 * e o Acompanhamento das parcelas tinha só Hoje / 7 dias / 30 dias, sem data.
 * Agora as duas abas usam este bloco, com os mesmos rótulos e atalhos.
 *
 *   <PeriodoFilter v-model="periodo" />
 *   periodo = { emitidoDe, emitidoAte, pagoDe, pagoAte }   (ISO YYYY-MM-DD ou '')
 *
 * `span` diz quantas colunas o bloco toma na grade do FilterBar (padrão: a
 * linha inteira de 4); fora de uma grade, passe `span=""`.
 */
import { computed } from 'vue';
import Input from '@/components/UI/Input.vue';
import { ATALHOS } from './periodo';

const props = defineProps({
  modelValue: { type: Object, required: true },
  span: { type: String, default: 'sm:col-span-2 lg:col-span-4' },
});
const emit = defineEmits(['update:modelValue', 'change']);

const GRUPOS = [
  { key: 'emitido', label: 'Emitido', icon: 'fas fa-barcode', de: 'emitidoDe', ate: 'emitidoAte' },
  { key: 'pago', label: 'Pago', icon: 'fas fa-circle-check', de: 'pagoDe', ate: 'pagoAte' },
];

function set(patch) {
  const next = { ...props.modelValue, ...patch };
  emit('update:modelValue', next);
  emit('change', next);
}
function atalho(g, a) {
  const r = a.range();
  set({ [g.de]: r.de, [g.ate]: r.ate });
}
function limpar(g) { set({ [g.de]: '', [g.ate]: '' }); }

/* Qual atalho está "aceso": só quando de/até batem exatamente com ele. */
const ativo = computed(() => {
  const out = {};
  for (const g of GRUPOS) {
    const de = props.modelValue[g.de] || '', ate = props.modelValue[g.ate] || '';
    out[g.key] = ATALHOS.find(a => { const r = a.range(); return r.de === de && r.ate === ate; })?.key || '';
  }
  return out;
});
const preenchido = (g) => !!(props.modelValue[g.de] || props.modelValue[g.ate]);
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" :class="span">
    <div v-for="g in GRUPOS" :key="g.key" class="min-w-0">
      <!-- Rótulo do grupo + atalhos na mesma linha; os campos "de / até" embaixo. -->
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
        <span class="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <i :class="[g.icon, 'text-micro text-ink-subtle']"></i>{{ g.label }}
        </span>
        <span class="ml-auto inline-flex flex-wrap items-center gap-1">
          <button v-for="a in ATALHOS" :key="a.key" type="button"
            class="h-6 px-1.5 rounded-md text-micro font-medium transition-colors duration-120 focus-ring"
            :class="ativo[g.key] === a.key ? 'bg-accent-soft text-accent' : 'text-ink-subtle hover:text-ink hover:bg-surface-sunken'"
            @click="atalho(g, a)">{{ a.label }}</button>
          <button v-if="preenchido(g)" type="button" title="Limpar período"
            class="h-6 w-6 inline-flex items-center justify-center rounded-md text-micro text-ink-subtle hover:text-ink hover:bg-surface-sunken focus-ring"
            @click="limpar(g)"><i class="fas fa-xmark"></i></button>
        </span>
      </div>

      <div class="flex items-center gap-1.5">
        <span class="text-micro text-ink-subtle shrink-0">de</span>
        <Input :model-value="modelValue[g.de] || ''" type="date" size="sm" class="min-w-0"
          :aria-label="`${g.label} de`" @update:modelValue="v => set({ [g.de]: v })" />
        <span class="text-micro text-ink-subtle shrink-0">até</span>
        <Input :model-value="modelValue[g.ate] || ''" type="date" size="sm" class="min-w-0"
          :aria-label="`${g.label} até`" @update:modelValue="v => set({ [g.ate]: v })" />
      </div>
    </div>
  </div>
</template>
