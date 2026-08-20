<script setup>
/**
 * FunnelStrip — um funil inteiro numa faixa.
 * ─────────────────────────────────────────────────────────────────────────────
 * Substitui a fileira de cards por etapa. Seis cards lado a lado ocupam meia
 * tela e ainda obrigam o olho a comparar número com número; uma barra
 * proporcional mostra a mesma coisa em 40px de altura, e a comparação vira
 * visual: o pedaço maior é o maior.
 *
 * Cada faixa é clicável e filtra a tela por aquela etapa. A faixa ativa fica
 * marcada, então dá para ver o filtro sem abrir o painel de filtros.
 *
 *   <FunnelStrip :stages="etapas" :total="1076" :active="['aprovado']"
 *                @select="filtrarPorEtapa" />
 *
 *   etapas = [{ key, label, count, icon, bar: 'bg-series-4', text: 'text-series-4' }]
 *
 * `bar` e `text` são classes Tailwind (não cores cruas), porque é assim que
 * STAGE_GROUPS já entrega e é o que mantém a cor igual no gráfico, na lista e
 * aqui.
 */
import { computed, ref, onMounted, nextTick } from 'vue';

const props = defineProps({
  stages: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  /* chaves das etapas atualmente filtradas */
  active: { type: Array, default: () => [] },
  clickable: { type: Boolean, default: true },
  /* rótulo do que está sendo contado, no plural */
  unit: { type: String, default: 'itens' },
});

const emit = defineEmits(['select', 'clear']);

const soma = computed(() => props.stages.reduce((s, e) => s + (e.count || 0), 0));
const base = computed(() => props.total || soma.value || 0);

const comPct = computed(() => props.stages.map((e) => ({
  ...e,
  pct: base.value ? ((e.count || 0) / base.value) * 100 : 0,
  ativo: props.active.includes(e.key),
})));

/* Na barra, só o que tem valor: faixa de 0% vira um risco de 2px sem
   significado. Na legenda, tudo - saber que "Aprovados" está zerado no período
   é exatamente o tipo de coisa que se quer ver. */
const naBarra = computed(() => comPct.value.filter((e) => (e.count || 0) > 0));

/* Entrada: as faixas nascem com largura zero e crescem até o valor. É a mesma
   ideia do número que conta - o dado se anuncia chegando, em vez de aparecer
   pronto. A transição de largura já existia para a troca de filtro; aqui ela
   também cobre o primeiro paint. Sob `prefers-reduced-motion` a regra global
   zera a duração e a barra nasce pronta. */
const montado = ref(false);
onMounted(() => { nextTick(() => requestAnimationFrame(() => { montado.value = true; })); });

const temFiltro = computed(() => props.active.length > 0);
const escolher = (e) => { if (props.clickable) emit('select', e); };
</script>

<template>
  <div class="space-y-3">
    <!-- A BARRA. Proporcional, sem rótulo dentro: em 375px não cabe texto na
         fatia de 8%, e número cortado é pior que número nenhum. Quem nomeia é
         a legenda logo abaixo. -->
    <div class="flex h-3.5 sm:h-4 w-full rounded-full overflow-hidden bg-surface-sunken gap-[2px]">
      <button v-for="(e, i) in naBarra" :key="e.key" type="button"
        :disabled="!clickable"
        v-tippy="`${e.label}: ${e.count} (${e.pct.toFixed(1)}%)`"
        :aria-label="`${e.label}: ${e.count} de ${base}`"
        :style="{ width: montado ? `${e.pct}%` : '0%', transitionDelay: `${Math.min(i, 8) * 45}ms` }"
        :class="[e.bar, 'h-full transition-all duration-500 ease-out-expo first:rounded-l-full last:rounded-r-full',
                 clickable ? 'cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/50 focus-visible:relative focus-visible:z-10' : '',
                 temFiltro && !e.ativo ? 'opacity-35' : 'opacity-100']"
        @click="escolher(e)"></button>
    </div>

    <!-- A LEGENDA. Também é o filtro: cada item liga e desliga a etapa.
         Alvo de 40px de altura, então funciona no dedo.

         No largo é FLEX com `flex-1 basis-0`, não grade de N colunas: a grade
         fixa deixava buraco à direita sempre que o número de etapas não batia
         com o número de colunas (5 etapas numa grade de 6 = uma coluna vazia).
         Com flex, seja qual for a quantidade, os itens dividem a largura toda
         em partes iguais. No estreito continua grade de 2. -->
    <div class="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
      <button v-for="(e, i) in comPct" :key="e.key" type="button" :disabled="!clickable"
        :style="{ '--i': i }"
        :class="['stagger-in flex flex-col items-center justify-center gap-0.5 min-h-14 px-2 py-1.5',
                 'rounded-lg text-center min-w-0 border transition-all duration-120 focus-ring',
                 'sm:flex-1 sm:basis-0 sm:min-w-[6.5rem]',
                 clickable ? 'cursor-pointer hover:bg-surface-sunken' : 'cursor-default',
                 e.ativo ? 'border-accent/50 bg-accent-soft/50' : 'border-transparent']"
        @click="escolher(e)">
        <span class="flex items-center justify-center gap-1.5 min-w-0 max-w-full">
          <span :class="[e.bar, 'h-2 w-2 rounded-sm shrink-0', e.count ? '' : 'opacity-40']"></span>
          <span class="text-micro text-ink-muted leading-tight truncate">{{ e.label }}</span>
        </span>
        <span class="metric text-sm leading-tight" :class="e.count ? '' : 'text-ink-subtle'">
          {{ e.count }}
          <span class="text-micro font-normal text-ink-subtle tabular-nums ml-0.5">{{ e.pct.toFixed(0) }}%</span>
        </span>
      </button>
    </div>

    <!-- Sai do filtro sem precisar abrir o painel -->
    <button v-if="temFiltro && clickable" type="button"
      class="text-micro text-accent hover:underline focus-ring rounded px-1 -mx-1"
      @click="emit('clear')">
      <i class="fas fa-xmark mr-1"></i>Ver todas as etapas
    </button>
  </div>
</template>
