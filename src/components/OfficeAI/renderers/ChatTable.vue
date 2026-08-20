<script setup>
/**
 * Tabela de resposta da Eme.
 * ─────────────────────────────────────────────────────────────────────────────
 * Usa o `DataTable` do sistema, o mesmo do relatório. A Eme respondia com uma
 * tabela desenhada à parte: ordenação própria, paginação de 10, paleta de
 * status própria e cor fixa que quebrava no tema claro. Quem perguntava aqui e
 * abria o relatório via dois desenhos do mesmo dado.
 *
 * Do `DataTable` vem de graça: ordenação por coluna, prioridade por coluna
 * (na bolha estreita e no celular a linha vira card sem perder campo), célula
 * truncada para a linha não variar de altura, e vazio tratado.
 *
 * Copiar e exportar para Excel continuam como estavam - é o que se faz com uma
 * resposta que veio certa.
 */
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import ExcelJS from 'exceljs/dist/exceljs.min.js'
import saveAs from 'file-saver'

import Panel from '@/components/UI/Panel.vue'
import DataTable from '@/components/UI/DataTable.vue'
import Badge from '@/components/UI/Badge.vue'
import { useIncrementalList } from '@/composables/useIncrementalList'

const props = defineProps({
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
  columns:  { type: Array,  default: () => [] },
  rows:     { type: Array,  default: () => [] },
  total:    { type: Number, default: 0 },
})

const isNumeric = (col) => col.type === 'number' || col.type === 'currency'

/* Colunas de STATUS ganham selo. A checagem é por nome de campo porque o
   backend não marca o tipo - mesma lista de sempre. */
const ehStatus = (col) => ['situacao', 'situacao_nome', 'status', 'etapa']
  .some((k) => String(col.key).includes(k))

/* Selo pelos tokens de estado, não por paleta própria: verde é aprovado no
   sistema inteiro, aqui também. */
const STATUS_VARIANT = {
  ativo: 'success', concluido: 'success', vendido: 'info', reservado: 'warning',
  pendente: 'warning', distratado: 'warning', cancelado: 'danger', inativo: 'neutral',
}
const statusVariant = (v) => STATUS_VARIANT[String(v || '').toLowerCase()] || 'neutral'

function formatCell(value, col) {
  if (value == null || value === '') return '-'
  if (col.type === 'date') return dayjs(value).format('DD/MM/YYYY')
  if (col.type === 'number') return Number(value).toLocaleString('pt-BR')
  return value
}

/* PRIORIDADE por posição: as duas primeiras colunas identificam a linha e
   ficam sempre visíveis; as três seguintes entram no corpo do card; o resto
   fica a um toque, em "Ver detalhes". O backend não manda prioridade, e a
   ordem em que ele monta as colunas já reflete a importância. */
const colunas = computed(() => props.columns.map((c, i) => ({
  key: c.key,
  label: c.label,
  priority: i < 2 ? 1 : i < 5 ? 2 : 3,
  numeric: isNumeric(c),
  sortable: true,
  value: (row) => row[c.key],
  format: (v) => formatCell(v, c),
})))

/* Ordenação aqui (a tabela recebe a lista já fatiada pelo scroll). */
const ordem = ref({ by: '', dir: 'asc' })

const ordenadas = computed(() => {
  const { by, dir } = ordem.value
  if (!by) return props.rows
  const col = props.columns.find((c) => c.key === by)
  const mul = dir === 'asc' ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const va = a[by] ?? '', vb = b[by] ?? ''
    if (col && isNumeric(col)) return ((Number(va) || 0) - (Number(vb) || 0)) * mul
    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * mul
  })
})

/* Passo menor que o do relatório: resposta de chat costuma ser curta, e 50
   linhas de uma vez dentro de uma bolha é mais rolagem do que resposta. */
const inc = useIncrementalList(ordenadas, { step: 25 })

const copied = ref(false)

async function exportExcel() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Eme — Menin Office'
  const ws = wb.addWorksheet('Dados')

  // Header
  ws.addRow(props.columns.map(c => c.label))
  const header = ws.getRow(1)
  header.eachCell(cell => {
    cell.fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    cell.font    = { bold: true, color: { argb: 'FFE2E8F0' }, size: 11 }
    cell.border  = { bottom: { style: 'medium', color: { argb: 'FF6366F1' } } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  header.height = 22

  // Data rows
  props.rows.forEach((row, ri) => {
    const vals = props.columns.map(col => {
      const v = row[col.key]
      if (v == null) return ''
      if (col.type === 'date') return dayjs(v).format('DD/MM/YYYY')
      return v
    })
    const r = ws.addRow(vals)
    r.eachCell(cell => {
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: ri % 2 === 0 ? 'FF0F172A' : 'FF1E293B' },
      }
      cell.font = { color: { argb: 'FFCBD5E1' }, size: 10 }
      cell.alignment = { vertical: 'middle' }
    })
  })

  // Column widths
  ws.columns.forEach((col, i) => {
    const label = props.columns[i]?.label ?? ''
    const maxLen = Math.max(
      label.length,
      ...props.rows.map(r => String(r[props.columns[i]?.key] ?? '').length)
    )
    col.width = Math.min(Math.max(maxLen + 4, 12), 40)
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${props.title || 'dados'}.xlsx`)
}

async function copyTable() {
  const header = props.columns.map(c => c.label).join('\t')
  const body = props.rows.map(row =>
    props.columns.map(col => {
      const v = row[col.key]
      if (v == null) return ''
      return col.type === 'date' ? dayjs(v).format('DD/MM/YYYY') : String(v)
    }).join('\t')
  ).join('\n')
  await navigator.clipboard.writeText(header + '\n' + body)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <Panel :padded="false" class="mt-2 overflow-hidden">
    <template #title>{{ title || 'Resultados' }}</template>
    <template #subtitle>
      {{ total }} registro{{ total !== 1 ? 's' : '' }}<span v-if="subtitle"> · {{ subtitle }}</span>
    </template>

    <template #actions>
      <button type="button" @click="copyTable" v-tippy="'Copiar como texto'"
        class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs
               text-ink-muted hover:text-ink hover:bg-surface-sunken
               transition-colors duration-120 focus-ring">
        <i :class="copied ? 'fas fa-check text-data-pos' : 'far fa-copy'" />
        <span class="hidden sm:inline">{{ copied ? 'Copiado' : 'Copiar' }}</span>
      </button>
      <button type="button" @click="exportExcel" v-tippy="'Baixar em Excel'"
        class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium
               bg-data-pos/10 text-data-pos hover:bg-data-pos/20
               transition-colors duration-120 focus-ring">
        <i class="fas fa-file-excel" />
        <span class="hidden sm:inline">Excel</span>
      </button>
    </template>

    <div class="p-3">
      <DataTable :columns="colunas" :rows="inc.visiveis.value" row-key="__i"
        manual-sort density="compact"
        v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
        more-label="Ver mais campos"
        empty-title="Sem resultados"
        empty-text="A consulta não retornou nenhuma linha.">
        <template v-for="col in columns.filter(ehStatus)" :key="col.key" #[`cell-${col.key}`]="{ value }">
          <Badge :variant="statusVariant(value)" size="sm">{{ value || '-' }}</Badge>
        </template>
      </DataTable>

      <!-- Gatilho: mais 25 linhas quando chega perto do fim -->
      <div v-if="!inc.acabou.value" :ref="el => inc.observar(el)"
        class="pt-3 text-center text-micro text-ink-subtle">
        carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
      </div>
    </div>
  </Panel>
</template>
