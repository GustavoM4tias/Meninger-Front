<script setup>
// Drill-down do relatório interativo: o leitor clicou num item (barra, fatia,
// etapa do funil, posição do ranking) e vê aqui a LISTA dos registros que
// compõem aquele número, com ações de focar o relatório nesse item e exportar.
import { ref, computed } from 'vue'
import Modal from '@/components/UI/Modal.vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import { formatValue } from './format.js'
import { exportRowsXlsx } from './exportExcel.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  label: { type: String, default: '' },
  // Resultado do POST /reports/:id/data/drill
  data: { type: Object, default: null },
  // Existe filtro do relatório casando com o campo agrupado?
  canFilter: { type: Boolean, default: false },
  reportTitle: { type: String, default: 'relatorio' },
})

const emit = defineEmits(['close', 'apply-filter', 'open-row'])

const exportando = ref(false)
const busca = ref('')

const columns = computed(() => props.data?.columns || [])
const rows = computed(() => {
  const all = props.data?.rows || []
  const q = busca.value.trim().toLowerCase()
  if (!q) return all
  return all.filter((r) => columns.value.some((c) => String(r?.[c.key] ?? '').toLowerCase().includes(q)))
})

// Datas ISO ficam legíveis sem depender de format declarado por coluna
function celula(v) {
  if (v == null || v === '') return '-'
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(s)) return formatValue(s, 'date')
  return s
}

async function exportar() {
  if (exportando.value || !rows.value.length) return
  exportando.value = true
  try {
    await exportRowsXlsx({
      rows: rows.value,
      columns: columns.value,
      title: `${props.reportTitle}-${props.label}`,
      sheetName: props.label || 'Registros',
    })
  } finally {
    exportando.value = false
  }
}

function fechar() {
  busca.value = ''
  emit('close')
}
</script>

<template>
  <Modal :open="open" size="xl" :title="label || 'Registros'" @close="fechar">
    <template #header>
      <div class="flex items-center gap-2 min-w-0">
        <h2 class="text-base font-semibold text-ink truncate">{{ label || 'Registros' }}</h2>
        <Badge v-if="data" variant="neutral" size="sm" class="flex-shrink-0">
          {{ data.total }} registro{{ data.total === 1 ? '' : 's' }}
        </Badge>
      </div>
      <!-- Sem categoria (KPI, número grande) a lista é o universo da consulta,
           não o recorte de um item: dizer isso evita ler as linhas como se
           fossem só as do indicador clicado. -->
      <p v-if="data" class="text-xs text-ink-muted mt-0.5 truncate">
        <template v-if="data.scope === 'dataset'">
          Todos os registros da consulta que gerou este indicador, no recorte atual dos filtros
        </template>
        <template v-else>{{ data.datasetLabel }}</template>
      </p>
    </template>

    <div v-if="loading" class="py-16 text-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin text-xl" />
      <p class="mt-2 text-xs">Buscando os registros...</p>
    </div>

    <div v-else-if="error" class="py-12 text-center">
      <i class="fas fa-circle-info text-xl text-ink-subtle mb-2" />
      <p class="text-sm text-ink-muted">{{ error }}</p>
    </div>

    <template v-else-if="data">
      <!-- Busca local na lista -->
      <div class="relative mb-3">
        <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-subtle" />
        <input
          v-model="busca"
          type="text"
          placeholder="Buscar nesta lista"
          class="w-full h-10 rounded-lg border border-line bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div class="rounded-xl border border-line overflow-hidden">
        <div class="overflow-x-auto max-h-[52vh] overflow-y-auto">
          <table class="w-full text-sm min-w-[560px]">
            <thead class="sticky top-0 z-10">
              <tr class="border-b-2 border-accent/30 bg-surface-sunken">
                <th
                  v-for="c in columns" :key="c.key"
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent whitespace-nowrap bg-surface-sunken"
                >{{ c.label }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/70">
              <tr
                v-for="(r, ri) in rows" :key="ri"
                class="hover:bg-surface-sunken/40 cursor-pointer transition-colors"
                title="Ver detalhes do registro"
                @click="emit('open-row', { row: r, columns })"
              >
                <td
                  v-for="(c, ci) in columns" :key="c.key"
                  class="px-3.5 py-2.5 tabular-nums"
                  :class="ci === 0 ? 'font-medium text-ink' : 'text-ink-muted'"
                >{{ celula(r[c.key]) }}</td>
              </tr>
              <tr v-if="!rows.length">
                <td :colspan="columns.length" class="px-4 py-8 text-center text-xs text-ink-subtle">
                  Nenhum registro encontrado na busca.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p v-if="data.truncated" class="mt-2 text-[11px] text-ink-subtle">
        <i class="fas fa-circle-info mr-1" />Mostrando os primeiros {{ data.rows.length }} de {{ data.total }} registros.
      </p>
    </template>

    <template #footer>
      <Button
        v-if="data && rows.length"
        variant="secondary" size="sm" icon="fas fa-file-excel"
        :loading="exportando"
        @click="exportar"
      >
        Exportar Excel
      </Button>
      <Button
        v-if="canFilter && data"
        variant="primary" size="sm" icon="fas fa-filter"
        @click="emit('apply-filter')"
      >
        Focar o relatório nisto
      </Button>
      <Button variant="ghost" size="sm" @click="fechar">Fechar</Button>
    </template>
  </Modal>
</template>
