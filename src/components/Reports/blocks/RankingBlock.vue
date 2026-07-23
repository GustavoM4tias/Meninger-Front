<script setup>
// Ranking: lista ordenada com barra proporcional. Ideal para "top origens de
// lead", "corretores por reserva", "empreendimentos por venda".
import { computed } from 'vue'
import { formatValue } from '../format.js'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  // items: [{ label, value, note? }]
  items: { type: Array, default: () => [] },
  format: { type: String, default: 'number' },
  showShare: { type: Boolean, default: true }, // % sobre o total
  caption: { type: String, default: '' },
})

const total = computed(() => props.items.reduce((s, i) => s + (Number(i.value) || 0), 0))
const max = computed(() => Math.max(...props.items.map((i) => Number(i.value) || 0), 1))

const rows = computed(() =>
  [...props.items]
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .map((i, idx) => ({
      ...i,
      pos: idx + 1,
      width: Math.max(2, ((Number(i.value) || 0) / max.value) * 100),
      share: total.value ? Math.round(((Number(i.value) || 0) / total.value) * 1000) / 10 : 0,
    }))
)
</script>

<template>
  <figure class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-4 sm:px-5">
    <figcaption v-if="title || subtitle" class="mb-3">
      <p v-if="title" class="text-sm font-medium text-ink">{{ title }}</p>
      <p v-if="subtitle" class="text-xs text-ink-subtle mt-0.5">{{ subtitle }}</p>
    </figcaption>

    <ol class="space-y-2.5">
      <li v-for="r in rows" :key="r.label">
        <div class="flex items-baseline gap-2 mb-1">
          <span
            class="w-5 h-5 rounded-md text-[10px] font-semibold flex items-center justify-center flex-shrink-0 tabular-nums"
            :class="r.pos <= 3 ? 'bg-accent text-white' : 'bg-surface-sunken text-ink-subtle'"
          >{{ r.pos }}</span>
          <span class="text-sm text-ink truncate">{{ r.label }}</span>
          <span class="ml-auto text-sm font-semibold text-ink tabular-nums whitespace-nowrap">{{ formatValue(r.value, format) }}</span>
          <span v-if="showShare" class="text-[11px] text-ink-subtle tabular-nums w-11 text-right flex-shrink-0">{{ r.share }}%</span>
        </div>
        <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden ml-7">
          <div class="h-full rounded-full bg-accent transition-all duration-700" :style="{ width: r.width + '%', opacity: r.pos <= 3 ? 1 : 0.55 }" />
        </div>
        <p v-if="r.note" class="ml-7 mt-0.5 text-[11px] text-ink-subtle">{{ r.note }}</p>
      </li>
    </ol>

    <p v-if="caption" class="mt-3 text-xs text-ink-subtle">{{ caption }}</p>
  </figure>
</template>
