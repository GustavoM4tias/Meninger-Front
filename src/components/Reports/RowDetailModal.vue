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
    // Coluna declarada como link (ex.: abrir o registro no CV) vira âncora
    const href = col?.type === 'link' && typeof bruto === 'string' && /^https?:\/\//i.test(bruto) ? bruto : null
    return { key: k, label: col?.label || k, valor, href, hrefLabel: col?.linkLabel || 'Abrir' }
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
        <dt class="text-micro font-semibold uppercase tracking-wider text-ink-subtle truncate" :title="campo.label">
          {{ campo.label }}
        </dt>
        <dd class="text-sm text-ink break-words">
          <a
            v-if="campo.href"
            :href="campo.href" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-accent hover:opacity-80"
          >
            <i class="fas fa-arrow-up-right-from-square text-micro" />{{ campo.hrefLabel }}
          </a>
          <template v-else>{{ campo.valor }}</template>
        </dd>
      </div>
    </dl>
    <p v-if="!campos.length" class="py-8 text-center text-xs text-ink-subtle">Sem dados para exibir.</p>

    <template #footer>
      <Button variant="secondary" size="sm" @click="emit('close')">Fechar</Button>
    </template>
  </Modal>
</template>
