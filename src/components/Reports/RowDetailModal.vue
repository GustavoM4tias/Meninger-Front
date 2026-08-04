<script setup>
// Detalhe de um registro do relatório: o leitor clicou numa linha de tabela
// (ou num registro do drill-down) e vê aqui todos os campos daquela linha,
// formatados pelo mesmo formato declarado nas colunas.
import { computed } from 'vue'
import Modal from '@/components/UI/Modal.vue'
import Button from '@/components/UI/Button.vue'
import { formatValue } from './format.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Registro' },
  row: { type: Object, default: null },
  // columns: [{ key, label, format? }] - dá rótulo e formato aos campos
  columns: { type: Array, default: () => [] },
  // Maior que 9999 quando aberto por cima do modal de drill-down
  zIndex: { type: Number, default: 9999 },
})

const emit = defineEmits(['close'])

const campos = computed(() => {
  if (!props.row) return []
  const porChave = new Map(props.columns.map((c) => [c.key, c]))
  // Ordem: primeiro as colunas declaradas, depois qualquer campo extra da linha
  const chaves = [
    ...props.columns.map((c) => c.key).filter((k) => k in props.row),
    ...Object.keys(props.row).filter((k) => !porChave.has(k)),
  ]
  return chaves.map((k) => {
    const col = porChave.get(k)
    const bruto = props.row[k]
    let valor
    if (bruto == null || bruto === '') valor = '-'
    else if (col?.format) valor = formatValue(bruto, col.format)
    else if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(String(bruto))) valor = formatValue(bruto, 'date')
    else valor = String(bruto)
    return { key: k, label: col?.label || k, valor }
  })
})
</script>

<template>
  <Modal :open="open" size="md" :title="title" :z-index="zIndex" @close="emit('close')">
    <dl class="divide-y divide-line/70">
      <div
        v-for="campo in campos" :key="campo.key"
        class="py-2.5 grid grid-cols-[minmax(0,40%)_1fr] gap-3 items-baseline"
      >
        <dt class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle truncate" :title="campo.label">
          {{ campo.label }}
        </dt>
        <dd class="text-sm text-ink break-words">{{ campo.valor }}</dd>
      </div>
    </dl>
    <p v-if="!campos.length" class="py-8 text-center text-xs text-ink-subtle">Sem dados para exibir.</p>

    <template #footer>
      <Button variant="secondary" size="sm" @click="emit('close')">Fechar</Button>
    </template>
  </Modal>
</template>
