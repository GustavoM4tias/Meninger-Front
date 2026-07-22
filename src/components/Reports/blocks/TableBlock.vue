<script setup>
import { computed } from 'vue'
import { formatValue } from '../format.js'

const props = defineProps({
  title: { type: String, default: '' },
  // columns: [{ key, label, format?, align? ('left'|'right'|'center') }]
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] }, // [{ [key]: value }]
  totals: { type: Object, default: null }, // { [key]: value } - linha de totais
  caption: { type: String, default: '' },
})

const alignClass = (c) => c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
const numericDefault = computed(() =>
  props.columns.map((c) => c.align || (['number', 'currency', 'currency-compact', 'percent'].includes(c.format) ? 'right' : 'left'))
)
</script>

<template>
  <figure class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
    <figcaption v-if="title" class="px-4 pt-3.5 pb-2 text-sm font-medium text-ink">{{ title }}</figcaption>
    <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[480px]">
        <thead>
          <tr class="border-b border-line bg-surface-sunken/60">
            <th
              v-for="(c, ci) in columns" :key="c.key"
              class="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle whitespace-nowrap"
              :class="alignClass({ align: numericDefault[ci] })"
            >{{ c.label }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line/70">
          <tr v-for="(r, ri) in rows" :key="ri" class="hover:bg-surface-sunken/40 transition-colors">
            <td
              v-for="(c, ci) in columns" :key="c.key"
              class="px-4 py-2.5 text-ink-muted tabular-nums"
              :class="[alignClass({ align: numericDefault[ci] }), ci === 0 ? 'font-medium text-ink' : '']"
            >{{ formatValue(r[c.key], c.format) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="totals">
          <tr class="border-t border-line-strong bg-surface-sunken/60">
            <td
              v-for="(c, ci) in columns" :key="c.key"
              class="px-4 py-2.5 font-semibold text-ink tabular-nums"
              :class="alignClass({ align: numericDefault[ci] })"
            >{{ totals[c.key] !== undefined ? formatValue(totals[c.key], c.format) : (ci === 0 ? 'Total' : '') }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p v-if="caption" class="px-4 py-2.5 text-xs text-ink-subtle border-t border-line/70">{{ caption }}</p>
  </figure>
</template>
