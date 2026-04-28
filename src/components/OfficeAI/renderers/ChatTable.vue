<script setup>
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import ExcelJS from 'exceljs/dist/exceljs.min.js'
import saveAs from 'file-saver'

const props = defineProps({
  title:   { type: String, default: '' },
  columns: { type: Array,  default: () => [] },
  rows:    { type: Array,  default: () => [] },
  total:   { type: Number, default: 0 },
})

// ── Sort ──────────────────────────────────────────────────────────────────────
const sortKey = ref(null)
const sortAsc = ref(true)

function toggleSort(col) {
  if (sortKey.value === col.key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = col.key
    sortAsc.value = true
  }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  return [...props.rows].sort((a, b) => {
    const va = a[sortKey.value] ?? ''
    const vb = b[sortKey.value] ?? ''
    const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
    return sortAsc.value ? cmp : -cmp
  })
})

// ── Pagination ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const page = ref(1)

const pages = computed(() => Math.ceil(sortedRows.value.length / PAGE_SIZE) || 1)
const pagedRows = computed(() => {
  const s = (page.value - 1) * PAGE_SIZE
  return sortedRows.value.slice(s, s + PAGE_SIZE)
})

// ── Cell formatting ───────────────────────────────────────────────────────────
function formatCell(value, col) {
  if (value == null || value === '') return null
  if (col.type === 'date')     return dayjs(value).format('DD/MM/YYYY')
  if (col.type === 'number')   return Number(value).toLocaleString('pt-BR') 
  return value
}

function isNumeric(col) {
  return col.type === 'number' || col.type === 'currency'
}

// Status → badge color
const STATUS_MAP = {
  ativo:      'bg-green-500/15 text-green-400 ring-1 ring-green-500/20',
  vendido:    'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20',
  cancelado:  'bg-red-500/15 text-red-400 ring-1 ring-red-500/20',
  distratado: 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20',
  reservado:  'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20',
  inativo:    'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/20',
  pendente:   'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20',
  concluido:  'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20',
}

function statusClass(col, value) {
  if (!value || !['situacao', 'situacao_nome', 'status', 'etapa'].some(k => col.key.includes(k))) return null
  return STATUS_MAP[String(value).toLowerCase()] || 'bg-slate-500/15 text-slate-400'
}

// ── Export ────────────────────────────────────────────────────────────────────
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
  <div class="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900 mt-2 shadow-sm dark:shadow-lg">

    <!-- Header -->
    <div class="px-4 py-3 bg-gray-50 dark:bg-slate-800/60 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-white/5">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-1.5 h-5 rounded-full bg-indigo-500 flex-shrink-0" />
        <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ title || 'Resultados' }}</span>
        <span class="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">
          {{ total }} registro{{ total !== 1 ? 's' : '' }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button
          @click="copyTable"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700/60 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs transition"
        >
          <i :class="copied ? 'fas fa-check text-green-500' : 'far fa-copy'" />
          <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
        </button>
        <button
          @click="exportExcel"
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 text-xs transition"
        >
          <i class="fas fa-file-excel" />
          <span>Excel</span>
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <!-- Head -->
        <thead>
          <tr class="bg-gray-50 dark:bg-slate-800/40">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-3 py-2.5 font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none group hover:text-gray-800 dark:hover:text-slate-200 transition"
              :class="isNumeric(col) ? 'text-right' : 'text-left'"
              @click="toggleSort(col)"
            >
              <span class="inline-flex items-center gap-1">
                {{ col.label }}
                <span class="opacity-0 group-hover:opacity-60 transition text-[10px]">
                  <i v-if="sortKey === col.key" :class="sortAsc ? 'fas fa-sort-up' : 'fas fa-sort-down'" class="opacity-100 text-indigo-500" />
                  <i v-else class="fas fa-sort" />
                </span>
              </span>
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody>
          <tr
            v-for="(row, i) in pagedRows"
            :key="i"
            class="border-t border-gray-100 dark:border-white/5 transition-colors duration-150 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 group"
            :class="i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/[0.015]'"
            style="animation: rowIn 0.2s ease both"
            :style="{ animationDelay: (i * 30) + 'ms' }"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-3 py-2.5 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors"
              :class="isNumeric(col) ? 'text-right tabular-nums font-medium' : ''"
            >
              <!-- Status badge -->
              <span
                v-if="statusClass(col, row[col.key])"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                :class="statusClass(col, row[col.key])"
              >
                {{ row[col.key] }}
              </span>
              <!-- Normal value -->
              <span v-else-if="formatCell(row[col.key], col) !== null">
                {{ formatCell(row[col.key], col) }}
              </span>
              <span v-else class="text-gray-300 dark:text-slate-600">—</span>
            </td>
          </tr>

          <!-- Empty -->
          <tr v-if="!rows.length">
            <td :colspan="columns.length" class="px-3 py-10 text-center">
              <div class="flex flex-col items-center gap-2 text-gray-400 dark:text-slate-600">
                <i class="fas fa-inbox text-2xl" />
                <span>Nenhum resultado encontrado.</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="pages > 1"
      class="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-800/30"
    >
      <span class="text-xs text-gray-400 dark:text-slate-500">
        {{ (page - 1) * 10 + 1 }}–{{ Math.min(page * 10, sortedRows.length) }}
        de {{ sortedRows.length }}
      </span>
      <div class="flex items-center gap-1">
        <button
          @click="page--"
          :disabled="page <= 1"
          class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-200 disabled:opacity-25 disabled:cursor-not-allowed transition"
        >
          <i class="fas fa-chevron-left text-[10px]" />
        </button>
        <span class="text-xs text-gray-400 dark:text-slate-400 px-1">{{ page }} / {{ pages }}</span>
        <button
          @click="page++"
          :disabled="page >= pages"
          class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-200 disabled:opacity-25 disabled:cursor-not-allowed transition"
        >
          <i class="fas fa-chevron-right text-[10px]" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes rowIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0);   }
}
</style>
