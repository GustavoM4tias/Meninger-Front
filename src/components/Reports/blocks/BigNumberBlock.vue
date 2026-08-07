<script setup>
import { computed, inject } from 'vue'
import { formatValue, tone } from '../format.js'
import { inlineMd, preenchido } from '../mdInline.js'
import BlockEmpty from './BlockEmpty.vue'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: null },
  format: { type: String, default: 'text' },
  context: { type: String, default: '' },
  delta: { type: String, default: '' },
  deltaTone: { type: String, default: 'neutral' },
  // Relatório interativo: abre os registros da consulta que gerou o número
  blockId: { type: String, default: null },
  clickable: { type: Boolean, default: false },
})

const contextHtml = computed(() => inlineMd(props.context))
const temValor = computed(() => preenchido(props.value))

const reportDrill = inject('reportDrill', null)
function abrir() {
  if (!props.clickable || !reportDrill) return
  reportDrill({ kind: 'category', blockId: props.blockId, label: '' })
}
</script>

<template>
  <BlockEmpty
    v-if="!temValor"
    :label="label || 'Indicador sem valor'"
    hint="A consulta não retornou este número."
    icon="fas fa-hashtag"
  />
  <div
    v-else
    class="relative rounded-2xl border border-line bg-surface-raised shadow-soft surface-gradient px-5 py-6 sm:px-8 sm:py-7"
    :class="clickable ? 'cursor-pointer transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40' : ''"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :title="clickable ? 'Ver os registros por trás deste número' : undefined"
    @click="abrir"
    @keydown.enter.prevent="abrir"
    @keydown.space.prevent="abrir"
  >
    <span v-if="clickable" aria-hidden="true" class="absolute right-3 top-3 text-[11px] text-ink-subtle">
      <i class="fas fa-up-right-from-square" />
    </span>
    <p class="text-[11px] uppercase tracking-[0.18em] text-ink-subtle">{{ label }}</p>
    <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="font-display text-4xl sm:text-5xl text-ink tabular-nums leading-none">{{ formatValue(value, format) }}</span>
      <span v-if="delta" :class="tone(deltaTone).text" class="text-sm font-semibold tabular-nums">{{ delta }}</span>
    </div>
    <p v-if="contextHtml" class="mt-3 text-sm text-ink-muted max-w-xl" v-html="contextHtml" />
  </div>
</template>
