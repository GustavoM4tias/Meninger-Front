<script setup>
import { computed, inject } from 'vue'
import { formatValue } from '../format.js'

const props = defineProps({
  title: { type: String, default: '' },
  // columns: [{ key, label, format?, align? ('left'|'right'|'center') }]
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] }, // [{ [key]: value }]
  totals: { type: Object, default: null }, // { [key]: value } - linha de totais
  caption: { type: String, default: '' },
  // Relatório interativo: clicar numa linha abre o detalhe do registro
  blockId: { type: String, default: null },
  clickable: { type: Boolean, default: false },
})

const reportDrill = inject('reportDrill', null)
function abrirLinha(row) {
  if (!props.clickable || !reportDrill) return
  reportDrill({
    kind: 'row',
    blockId: props.blockId,
    row,
    columns: props.columns,
    title: props.title || 'Registro',
  })
}

const alignClass = (c) => c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
const numericDefault = computed(() =>
  props.columns.map((c) => c.align || (['number', 'currency', 'currency-compact', 'percent'].includes(c.format) ? 'right' : 'left'))
)
</script>

<template>
  <figure class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden">
    <figcaption v-if="title" class="px-4 pt-3.5 pb-2 flex items-center gap-2">
      <span aria-hidden="true" class="w-1 h-4 rounded-full bg-accent flex-shrink-0"></span>
      <span class="text-sm font-semibold text-ink">{{ title }}</span>
    </figcaption>
    <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[480px]">
        <!-- Cabeçalho com rótulo no acento e régua de 2px: dá cor à tabela sem
             tingir a faixa inteira (véu translúcido achata o contraste). -->
        <thead>
          <tr class="border-b-2 border-accent/30 bg-surface-sunken">
            <th
              v-for="(c, ci) in columns" :key="c.key"
              class="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-accent whitespace-nowrap"
              :class="alignClass({ align: numericDefault[ci] })"
            >{{ c.label }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line/70">
          <tr
            v-for="(r, ri) in rows" :key="ri"
            class="hover:bg-surface-sunken/40 transition-colors"
            :class="clickable ? 'cursor-pointer' : ''"
            :title="clickable ? 'Ver detalhes do registro' : undefined"
            @click="abrirLinha(r)"
          >
            <td
              v-for="(c, ci) in columns" :key="c.key"
              class="px-4 py-2.5 text-ink-muted tabular-nums"
              :class="[alignClass({ align: numericDefault[ci] }), ci === 0 ? 'font-medium text-ink' : '']"
            >{{ formatValue(r[c.key], c.format) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="totals">
          <tr class="border-t-2 border-accent/40 bg-surface-sunken">
            <td
              v-for="(c, ci) in columns" :key="c.key"
              class="px-4 py-2.5 font-bold text-ink tabular-nums"
              :class="alignClass({ align: numericDefault[ci] })"
            >{{ totals[c.key] !== undefined ? formatValue(totals[c.key], c.format) : (ci === 0 ? 'Total' : '') }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p v-if="caption" class="px-4 py-2.5 text-xs text-ink-subtle border-t border-line/70">{{ caption }}</p>
  </figure>
</template>
