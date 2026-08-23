<script setup>
import { tone } from '../format.js'
import { inlineMd } from '../mdInline.js'
import BlockEmpty from './BlockEmpty.vue'

const props = defineProps({
  title: { type: String, default: '' },
  // events: [{ date, title, description?, tone? }]
  events: { type: Array, default: () => [] },
})

const descricao = (e) => inlineMd(e?.description)
</script>

<template>
  <BlockEmpty v-if="!props.events.length" :label="title || 'Linha do tempo'" hint="Nenhum marco no período." icon="fas fa-timeline" />
  <div v-else class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-4 sm:px-5">
    <p v-if="title" class="text-sm font-medium text-ink mb-3">{{ title }}</p>
    <ol class="relative space-y-4 pl-5 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-line">
      <li v-for="(e, i) in events" :key="i" class="relative">
        <span class="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full border-2 border-surface-raised" :class="tone(e.tone || 'accent').dot" />
        <p class="text-micro uppercase tracking-wider text-ink-subtle">{{ e.date }}</p>
        <p class="text-sm font-medium text-ink mt-0.5">{{ e.title }}</p>
        <p v-if="e.description" class="text-xs text-ink-muted mt-0.5" v-html="descricao(e)" />
      </li>
    </ol>
  </div>
</template>
