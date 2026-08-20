<script setup>
/**
 * StatCard — o cartão de número do Office. Um só, para todo o sistema.
 * ─────────────────────────────────────────────────────────────────────────────
 * Substitui as quatro implementações independentes que existiam (Faturamento,
 * Leads, Campanhas, Relatórios), cada uma com um tamanho de ícone, um jeito de
 * mostrar variação e um comportamento diferente no celular.
 *
 * O número é o elemento mais forte da tela: escala própria (`text-metric*`),
 * tabular, tracking negativo. Tudo em volta dele é discreto de propósito.
 *
 * Use dentro de <StatRow>, que cuida da grade, da faixa rolável no celular e da
 * entrada escalonada.
 *
 *   <StatRow :items="kpis" />
 *
 *   kpis = [{
 *     key: 'vgv', label: 'VGV do mês',
 *     raw: 12400000, format: fmtBRLCompacto,   // conta até o valor
 *     icon: 'fas fa-building', tone: 'accent',
 *     hint: '38 contratos',
 *     delta: { value: 12.4, dir: 'up', good: true, label: 'vs mês anterior' },
 *     series: [3, 5, 4, 8, 11],
 *     to: '/comercial/faturamento',            // opcional: vira link
 *   }]
 *
 * Prefira `raw` + `format` a `value` pronto: é o que liga o count-up.
 */
import { computed, toRef } from 'vue';
import Sparkline from './Sparkline.vue';
import { useCountUp } from '@/composables/useCountUp';

const props = defineProps({
  label: { type: String, required: true },
  /* Valor já formatado. Use quando não fizer sentido contar (texto, faixa). */
  value: { type: [String, Number], default: '-' },
  /* Valor CRU + formatador: aciona o count-up. É a forma preferida - o número
     contando até o valor é o movimento de maior efeito e menor risco do
     sistema. `format` recebe o número intermediário a cada quadro. */
  raw: { type: Number, default: null },
  format: { type: Function, default: null },
  /* casas decimais do valor INTERMEDIÁRIO da contagem; o valor final é sempre
     exato. Use 1 quando o número tem uma casa (ex.: "4,2 dias"), senão a
     contagem anda em inteiros e o último quadro dá um pulinho. */
  decimals: { type: Number, default: 0 },
  hint: { type: String, default: '' },          // linha de contexto sob o número
  icon: { type: String, default: '' },
  /* tom do ícone: accent | pos | neg | warn | neutral | 1..8 (slot de série) */
  tone: { type: [String, Number], default: 'accent' },
  /* { value: número, dir: 'up'|'down'|'flat', good: bool, label: string } */
  delta: { type: Object, default: null },
  series: { type: Array, default: () => [] },
  sparkMode: { type: String, default: 'bars' },
  size: { type: String, default: 'md' },        // sm | md | lg
  loading: { type: Boolean, default: false },
  to: { type: String, default: '' },            // se preenchido, o card vira link
  tooltip: { type: String, default: '' },
  /* Card que FILTRA: clicar recorta a lista abaixo. `active` marca o recorte
     em vigor, para o cartão dizer o que está aplicado sem precisar de um chip
     à parte. */
  selectable: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(['select']);

/* Classes ESCRITAS POR EXTENSO: o Tailwind varre o texto do arquivo, então
   `bg-series-${n}` montado em runtime não seria gerado no CSS final. */
const TONES = {
  accent: 'bg-accent-soft text-accent',
  pos: 'bg-data-pos-soft text-data-pos',
  neg: 'bg-data-neg-soft text-data-neg',
  warn: 'bg-data-warn-soft text-data-warn',
  neutral: 'bg-surface-sunken text-ink-muted',
  1: 'bg-series-1/15 text-series-1',
  2: 'bg-series-2/15 text-series-2',
  3: 'bg-series-3/15 text-series-3',
  4: 'bg-series-4/15 text-series-4',
  5: 'bg-series-5/15 text-series-5',
  6: 'bg-series-6/15 text-series-6',
  7: 'bg-series-7/15 text-series-7',
  8: 'bg-series-8/15 text-series-8',
};
const toneClass = computed(() => TONES[props.tone] || TONES.accent);
const sparkColor = computed(() => {
  const t = props.tone;
  if (typeof t === 'number' || /^[1-8]$/.test(String(t))) return `rgb(var(--series-${t}))`;
  if (t === 'pos') return 'rgb(var(--data-pos))';
  if (t === 'neg') return 'rgb(var(--data-neg))';
  if (t === 'warn') return 'rgb(var(--data-warn))';
  return 'rgb(var(--accent))';
});

const VALUE_SIZE = { sm: 'text-metric-sm', md: 'text-metric', lg: 'text-metric-lg', xl: 'text-metric-xl' };

/* Count-up: só quando veio `raw`. `useCountUp` já respeita movimento reduzido,
   então quem pediu menos animação recebe o valor final direto. */
const { display, counting } = useCountUp(toRef(props, 'raw'), { duration: 850, decimals: props.decimals });
const shownValue = computed(() => {
  if (props.raw == null) return props.value;
  return props.format ? props.format(display.value) : display.value;
});

/* Variação: a seta diz a DIREÇÃO, a cor diz se é BOM. Não são a mesma coisa —
   inadimplência subindo é seta para cima e cor de negativo. Quando `good` não
   vem, assume que subir é bom. */
const deltaView = computed(() => {
  const d = props.delta;
  if (!d || d.value == null || !isFinite(Number(d.value))) return null;
  const n = Number(d.value);
  const dir = d.dir || (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');
  const good = d.good == null ? dir === 'up' : d.good;
  return {
    text: `${n > 0 ? '+' : ''}${Number(n.toFixed(1))}%`,
    icon: dir === 'up' ? 'fa-arrow-trend-up' : dir === 'down' ? 'fa-arrow-trend-down' : 'fa-minus',
    cls: dir === 'flat'
      ? 'bg-surface-sunken text-ink-muted'
      : good ? 'bg-data-pos-soft text-data-pos' : 'bg-data-neg-soft text-data-neg',
    label: d.label || '',
  };
});
</script>

<template>
  <component :is="to ? 'router-link' : (selectable ? 'button' : 'div')"
    :to="to || undefined" :type="(!to && selectable) ? 'button' : undefined"
    :aria-pressed="selectable ? active : undefined" v-tippy="tooltip"
    class="group relative flex flex-col gap-1 p-3.5 rounded-xl border bg-surface-raised text-left
           surface-gradient shadow-soft transition-all duration-200 ease-out-expo
           w-[10.5rem] sm:w-auto shrink-0"
    :class="[
      active ? 'border-accent ring-1 ring-accent/30' : 'border-line',
      (to || selectable)
        ? 'cursor-pointer hover:border-accent/40 hover:-translate-y-px hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/30'
        : 'hover:border-line-strong',
    ]"
    @click="selectable && !to ? emit('select') : null">

    <!-- ícone + variação -->
    <div class="flex items-center justify-between gap-2">
      <span v-if="icon"
        class="h-8 w-8 rounded-lg grid place-items-center text-xs shrink-0
               transition-transform duration-200 ease-out-expo group-hover:scale-110"
        :class="toneClass">
        <i :class="icon"></i>
      </span>
      <span v-else class="h-8"></span>

      <!-- o selo "pousa" depois, com um overshoot curto: confirma que a
           comparação com o período anterior também chegou -->
      <span v-if="deltaView" v-tippy="deltaView.label"
        class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-micro font-semibold
               tabular-nums animate-pop-in [animation-delay:420ms]"
        :class="deltaView.cls">
        <i :class="['fas', deltaView.icon]" style="font-size:9px"></i>{{ deltaView.text }}
      </span>
    </div>

    <!-- o número: o elemento mais forte do card. Conta até o valor quando
         recebe `raw`, e assenta na cor final ao terminar. -->
    <span class="metric mt-1 truncate transition-colors duration-420"
      :class="[VALUE_SIZE[size] || VALUE_SIZE.md, loading ? 'opacity-30' : '', counting ? 'metric-counting' : '']">
      <slot name="value">{{ shownValue }}</slot>
    </span>

    <!-- rótulo -->
    <div class="min-w-0">
      <p class="text-xs text-ink-muted leading-tight truncate">{{ label }}</p>
      <p v-if="hint" class="text-micro text-ink-subtle tabular-nums leading-tight truncate mt-0.5">{{ hint }}</p>
    </div>

    <!-- A série ocupa a LARGURA TODA, embaixo. Espremida num canto de 56px ela
         vira enfeite; ocupando a base do card ela mostra de verdade se o
         número vinha subindo ou caindo. -->
    <Sparkline v-if="series.length" :values="series" :mode="sparkMode" :color="sparkColor"
      class="w-full mt-2" height="h-7" />

    <!-- seta discreta só quando o card leva a algum lugar -->
    <i v-if="to"
      class="fas fa-arrow-right absolute top-3.5 right-3.5 text-micro text-ink-subtle opacity-0
             group-hover:opacity-100 transition-opacity duration-200"
      :class="deltaView ? 'hidden' : ''"></i>
  </component>
</template>
