<script setup>
import { computed, inject } from 'vue'
import { formatValue, tone } from '../format.js'
import BlockEmpty from './BlockEmpty.vue'

const props = defineProps({
  // stats: [{ label, value, format?, tone?, delta?, deltaTone?, hint? }]
  stats: { type: Array, default: () => [] },
  // Relatório interativo: clicar no card abre os registros da consulta que
  // gerou o indicador. Sem categoria para filtrar, então o drill devolve o
  // universo do dataset (o modal deixa isso explícito).
  blockId: { type: String, default: null },
  clickable: { type: Boolean, default: false },
})

const reportDrill = inject('reportDrill', null)
function abrir() {
  if (!props.clickable || !reportDrill) return
  reportDrill({ kind: 'category', blockId: props.blockId, label: '' })
}

// O `tone` do stat vinha sendo ignorado: a Eme marcava um KPI como success e
// outro como danger e os cards saíam idênticos, sem cor nenhuma. Agora o tom
// pinta o VALOR e o marcador — nunca o fundo do card, que numa área larga
// achataria o contraste (pior ainda no dark).
const KNOWN = { neutral: 1, accent: 1, success: 1, warning: 1, danger: 1, info: 1 }
const toneOf = (s) => (KNOWN[s?.tone] ? s.tone : 'neutral')
const hasTone = (s) => toneOf(s) !== 'neutral'

// Colunas pelo número de cards, pra não sobrar buraco na linha (3 stats numa
// grade fixa de 4 deixavam um vão à direita).
const cols = computed(() => {
  const n = props.stats.length
  if (n <= 1) return 'grid-cols-1'
  if (n === 2) return 'grid-cols-2'
  if (n === 3) return 'grid-cols-2 sm:grid-cols-3'
  return 'grid-cols-2 lg:grid-cols-4'
})
</script>

<template>
  <BlockEmpty v-if="!stats.length" label="Indicadores" hint="Nenhum valor retornado para este recorte." icon="fas fa-gauge-simple" />
  <div v-else class="grid gap-3" :class="cols">
    <div
      v-for="(s, i) in stats" :key="i"
      class="relative rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-3.5 overflow-hidden"
      :class="clickable ? 'cursor-pointer transition-colors hover:border-accent/50 hover:bg-surface-sunken/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40' : ''"
      :role="clickable ? 'button' : undefined"
      :tabindex="clickable ? 0 : undefined"
      :title="clickable ? 'Ver os registros por trás deste indicador' : undefined"
      @click="abrir"
      @keydown.enter.prevent="abrir"
      @keydown.space.prevent="abrir"
    >
      <!-- Filete do tom no topo: sinaliza o estado sem tingir o card inteiro -->
      <span
        v-if="hasTone(s)"
        aria-hidden="true"
        class="absolute inset-x-0 top-0 h-[3px]"
        :class="tone(toneOf(s)).dot"
      ></span>

      <p class="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-subtle">
        <span
          v-if="hasTone(s)" aria-hidden="true"
          class="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          :class="tone(toneOf(s)).dot"
        ></span>
        <span class="truncate">{{ s.label }}</span>
      </p>

      <p
        class="mt-1 text-xl sm:text-2xl font-semibold tabular-nums leading-none"
        :class="hasTone(s) ? tone(toneOf(s)).text : 'text-ink'"
      >
        {{ formatValue(s.value, s.format) }}
      </p>

      <p v-if="s.delta || s.hint" class="mt-1.5 flex items-center gap-1.5 text-xs">
        <span v-if="s.delta" :class="tone(s.deltaTone || 'neutral').text" class="font-medium tabular-nums">{{ s.delta }}</span>
        <span v-if="s.hint" class="text-ink-subtle truncate">{{ s.hint }}</span>
      </p>

      <span v-if="clickable" aria-hidden="true" class="absolute right-2.5 bottom-2 text-[10px] text-ink-subtle">
        <i class="fas fa-up-right-from-square" />
      </span>
    </div>
  </div>
</template>
