<template>
  <div class="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">

    <!-- ── Cabeçalho ─────────────────────────────────────────────────────────── -->
    <div class="p-6 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Vendas por {{ contractsStore.groupBy === 'company' ? 'Empresa' : 'Empreendimento' }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Realizado vs. Projetado</p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- VGV / VGV+DC -->
          <div class="inline-flex rounded-md border dark:border-gray-700 overflow-hidden">
            <button @click="contractsStore.setValueMode('net')" :class="[
              'px-3 py-1 text-sm font-medium',
              contractsStore.valueMode === 'net'
                ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100'
            ]">VGV</button>
            <button @click="contractsStore.setValueMode('gross')" :class="[
              'px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700',
              contractsStore.valueMode === 'gross'
                ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100'
            ]">VGV+DC</button>
          </div>

          <!-- GroupBy: Empreendimento / Empresa -->
          <div class="inline-flex rounded-md border dark:border-gray-700 overflow-hidden">
            <button @click="contractsStore.setGroupBy('enterprise')" :class="[
              'px-3 py-1 text-sm font-medium',
              contractsStore.groupBy === 'enterprise'
                ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100'
            ]">Empreendimento</button>
            <button @click="contractsStore.setGroupBy('company')" :class="[
              'px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700',
              contractsStore.groupBy === 'company'
                ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100'
            ]">Empresa</button>
          </div>

          <!-- Ordenação -->
          <select v-model="sortBy"
            class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm px-2 py-1.5 text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="vgv-desc">{{ valueModeLabel }} Realizado ↓</option>
            <option value="vgv-asc">{{ valueModeLabel }} Realizado ↑</option>
            <option value="achievement-desc">% Atingida ↓</option>
            <option value="achievement-asc">% Atingida ↑</option>
            <option value="name-asc">Nome A→Z</option>
          </select>

          <!-- Configurações de regras (admin only) — abre o mesmo modal do Faturamento -->
          <button v-if="isAdmin"
            class="inline-flex items-center justify-center p-2 rounded-full text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            v-tippy="'Configurar regras (ocultar empreendimentos, comissão, LAND_VALUE_ONLY…)'"
            @click="$emit('open-rules')">
            <i class="fas fa-cog"></i>
          </button>

          <!-- Configurações de Meta (admin only) — modo unidades/VGV -->
          <button v-if="isAdmin"
            class="text-xl ps-1 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            v-tippy="'Configurações de Meta (unidades vs VGV)'" @click="$emit('open-settings')">
            <i class="fas fa-sliders"></i>
          </button>

          <!-- Exportar -->
          <button
            class="text-2xl ps-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            v-tippy="'Exportar Dados'" @click="open = true">
            <i class="fas fa-download"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Sem dados ──────────────────────────────────────────────────────────── -->
    <div v-if="sortedData.length === 0" class="p-12 text-center">
      <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <p class="text-gray-400 dark:text-gray-500 text-sm">Nenhum empreendimento encontrado</p>
    </div>

    <!-- ── Tabela ─────────────────────────────────────────────────────────────── -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-10">
              <input type="checkbox" :checked="allVisibleChecked" @change="toggleAllVisible($event)" />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {{ contractsStore.groupBy === 'company' ? 'Empresa' : 'Empreendimento' }}
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Vendas
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Realizado <span class="text-gray-400">({{ valueModeLabel }})</span>
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Meta Unidades
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Meta Projetada
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              v-tippy="`Modo padrão: ${goalStore.globalMode === 'units' ? 'Unidades' : 'VGV'}. Clique no nome para ver detalhes.`">
              % Atingida
            </th>
            <th class="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
            </th>
          </tr>
        </thead>

        <tbody class="bg-white dark:bg-gray-800/40 divide-y divide-gray-200 dark:divide-gray-600">
          <tr
            v-for="row in sortedData"
            :key="row._key"
            :class="row.onlyProjectionRow
              ? 'bg-green-50/70 dark:bg-green-900/20 hover:bg-green-100/70 dark:hover:bg-green-900/30'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/70'"
            class="transition-colors">

            <!-- Checkbox -->
            <td class="px-6 py-4">
              <input type="checkbox" :checked="selectedKeys.has(row._key)" @change="toggleOne(row._key, $event)" />
            </td>

            <!-- Empreendimento -->
            <td class="px-6 py-4 max-w-96">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: dotColor(row.status) }" />
                <button
                  class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 truncate text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  v-tippy="`Ver detalhes das vendas — Meta por ${goalModeLabel(row)}`"
                  @click="$emit('open-detail', row)">
                  {{ row.name }}
                </button>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm font-semibold relative">
                {{ row.count - distratoCount(row) }}

                <span v-if="!row.onlyProjectionRow && row.proj_count"
                  class="font-bold text-emerald-600 absolute -top-3">
                  +{{ row.proj_count }}
                </span>

                <span v-if="!row.onlyProjectionRow && distratoCount(row) > 0"
                  class="font-bold text-red-600 absolute -top-4 right-2" v-tippy="'Distratos (não contabilizados)'">
                  -{{ distratoCount(row) }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="text-sm font-semibold text-green-600">
                {{ formatCurrency(baseValue(row)) }}

                <span v-if="!row.onlyProjectionRow && appendedValue(row) > 0"
                  class="text-emerald-600 font-semibold text-xs">
                  <br />+{{ formatCurrency(appendedValue(row)) }}
                </span>

                <span v-if="!row.onlyProjectionRow && distratoValue(row) > 0"
                  class="text-red-600 font-semibold text-xs" v-tippy="'Distratos (não contabilizados)'">
                  <br />-{{ formatCurrency(distratoValue(row)) }}
                </span>
              </div>
            </td>

            <!-- Meta Unidades -->
            <td class="px-6 py-4 text-right">
              <span v-if="row.projectedUnits" class="text-sm font-medium text-violet-600 dark:text-violet-400">
                {{ row.projectedUnits }}
              </span>
              <span v-else class="text-sm text-gray-400 dark:text-gray-500">—</span>
            </td>

            <!-- Meta Projetada (VGV) -->
            <td class="px-6 py-4 text-right">
              <span v-if="row.projectedVgv" class="text-sm font-medium text-sky-600 dark:text-sky-400">
                {{ formatCurrency(row.projectedVgv) }}
              </span>
              <span v-else class="text-sm text-gray-400 dark:text-gray-500">—</span>
            </td>

            <!-- % Atingida -->
            <td class="px-6 py-4 text-right">
              <div v-if="effectiveAchievementPct(row) != null" class="flex flex-col items-end gap-1.5">
                <span class="text-sm font-bold" :class="achievementTextClass(row)"
                  v-tippy="`Meta por ${goalModeLabel(row)}`">
                  {{ effectiveAchievementPct(row).toFixed(1) }}%
                </span>
                <div class="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="achievementBarClass(row)"
                    :style="{ width: Math.min(effectiveAchievementPct(row), 100) + '%' }" />
                </div>
              </div>
              <span v-else class="text-sm text-gray-400 dark:text-gray-500">—</span>
            </td>

            <!-- Status -->
            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                :class="statusBadgeClass(row.status)">
                {{ statusIcon(row.status) }} {{ statusLabel(row.status) }}
              </span>
            </td>

          </tr>
        </tbody>
      </table>
    </div>

    <Export v-model="open" :source="sortedData" title="Exportação de Vendas × Projeção"
      filename="Vendas_Projecao" initial-delimiter=";" initial-array-mode="join" :preselect="[]" />

  </div>
</template>

<script setup>
import { ref, computed, watch, watchEffect } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import { useProjectionGoalModeStore } from '@/stores/Comercial/Projections/projectionGoalModeStore'
import Export from '@/components/config/Export.vue'

const props = defineProps({
  data:           { type: Array,  required: true },
  timeElapsedPct: { type: Number, default: 0 },
})

const emit = defineEmits(['selection-metrics', 'open-detail', 'open-settings', 'open-rules'])

const contractsStore = useContractsStore()
const goalStore      = useProjectionGoalModeStore()
const sortBy         = ref('vgv-desc')
const open           = ref(false)
const valueModeLabel = computed(() => contractsStore.valueModeLabel)
const isAdmin        = computed(() => { try { return localStorage.getItem('role') === 'admin' } catch { return false } })

// ── Distrato (igual ao Dashboard de Faturamento) ──────────────────────────────

const norm = (v) => String(v ?? '').trim().toLowerCase()

function repasseStatusOfSale(sale) {
  const first = sale?.contracts?.[0] || {}
  const r = first?.repasse?.[0]
  if (r) {
    const sr = (r.status_repasse ?? r.statusRepasse ?? '').toString().trim()
    if (sr) return sr
  }
  const res = first?.reserva
  if (res) {
    const srr = (res.status_repasse ?? res.statusRepasse ?? '').toString().trim()
    if (srr) return srr
  }
  return null
}

const saleIsDistrato = (sale) => norm(repasseStatusOfSale(sale)) === 'distrato'

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Exatamente igual ao salesForRowFrom do EnterprisesSalesTable (modo enterprise)
function salesForRow(sales, row) {
  const rowEnterpriseId = toNum(row.enterprise_id ?? row.id ?? null)
  if (rowEnterpriseId == null) return []
  const onlyProjRow = !!row.onlyProjectionRow
  return (sales || []).filter(sale => {
    const contracts = Array.isArray(sale?.contracts) ? sale.contracts : []
    if (!contracts.length) return false
    const belongs = contracts.some(c => toNum(c.enterprise_id) === rowEnterpriseId)
    if (!belongs) return false
    if (onlyProjRow) return contracts.every(c => !!c._projection)
    return true
  })
}

function distratoMetaForRow(row) {
  const snapshot = Array.isArray(contractsStore.uniqueSales) ? contractsStore.uniqueSales : []
  const sales = salesForRow(snapshot, row)
  let count = 0
  let value = 0
  for (const s of sales) {
    if (!saleIsDistrato(s)) continue
    if (row.onlyProjectionRow) continue
    count += 1
    value += Number(contractsStore.valuePicker(s) || 0)
  }
  return { count, value }
}

const distratoCount = (row) => distratoMetaForRow(row).count
const distratoValue = (row) => distratoMetaForRow(row).value

// Mesmo padrão do baseValue do EnterprisesSalesTable
function baseValue(row) {
  const base = Number(contractsStore.isNet ? (row.total_value_net || 0) : (row.total_value_gross || 0))
  const dv   = Number(distratoValue(row) || 0)
  return (Number.isFinite(base) ? base : 0) - (Number.isFinite(dv) ? dv : 0)
}

function appendedValue(row) {
  if (row.onlyProjectionRow) return 0
  return contractsStore.isNet ? Number(row.proj_value_net || 0) : Number(row.proj_value_gross || 0)
}

// ── Seleção ───────────────────────────────────────────────────────────────────

const selectedKeys = ref(new Set())

watch(() => props.data, () => { selectedKeys.value = new Set() })

const visibleKeys = computed(() => sortedData.value.map(r => r._key))

const allVisibleChecked = computed(() =>
  visibleKeys.value.length > 0 && visibleKeys.value.every(k => selectedKeys.value.has(k))
)

function toggleAllVisible(evt) {
  const next = new Set(selectedKeys.value)
  if (evt.target.checked) visibleKeys.value.forEach(k => next.add(k))
  else visibleKeys.value.forEach(k => next.delete(k))
  selectedKeys.value = next
}

function toggleOne(key, evt) {
  const next = new Set(selectedKeys.value)
  evt.target.checked ? next.add(key) : next.delete(key)
  selectedKeys.value = next
}

// ── Métricas de seleção ───────────────────────────────────────────────────────

const selectedRows = computed(() => {
  if (selectedKeys.value.size === 0) return []
  return props.data.filter(r => selectedKeys.value.has(r._key))
})

const selectionMetricsComputed = computed(() => {
  if (selectedRows.value.length === 0) return null
  const rows = selectedRows.value

  const useNet = contractsStore.isNet

  const totalSales      = rows.reduce((s, r) => s + Math.max(0, (r.count || 0) - distratoCount(r)), 0)
  const totalValueNet   = rows.reduce((s, r) => s + (r.total_value_net   || 0), 0)
  const totalValueGross = rows.reduce((s, r) => s + (r.total_value_gross || 0), 0)
  const projectedVgv    = rows.reduce((s, r) => s + (r.projectedVgv    || 0), 0)
  const projectedUnits  = rows.reduce((s, r) => s + (r.projectedUnits  || 0), 0)

  // Inclui VGV workflow (pipeline) na métrica realizada para consistência com os cards
  const wfValueNet   = rows.reduce((s, r) => s + (r.proj_value_net   || 0), 0)
  const wfValueGross = rows.reduce((s, r) => s + (r.proj_value_gross || 0), 0)
  const effectiveValueNet   = totalValueNet   + wfValueNet
  const effectiveValueGross = totalValueGross + wfValueGross

  const avgSaleValueNet    = totalSales > 0 ? effectiveValueNet   / totalSales : 0
  const avgSaleValueGross  = totalSales > 0 ? effectiveValueGross / totalSales : 0
  const avgProjectedTicket = projectedUnits > 0 ? projectedVgv / projectedUnits : 0

  const realizedVgv    = useNet ? effectiveValueNet : effectiveValueGross
  const achievementPct = projectedVgv > 0
    ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
    : null

  const realizedUnits    = rows.reduce((s, r) => s + Math.max(0, (r.count || 0) - distratoCount(r)), 0)
  const achievementPctUnits = projectedUnits > 0
    ? parseFloat((realizedUnits / projectedUnits * 100).toFixed(1))
    : null

  return {
    totalSales,
    totalContracts:      totalSales,
    totalValueNet,
    totalValueGross,
    avgSaleValueNet,
    avgSaleValueGross,
    totalValue:          totalValueNet,
    avgSaleValue:        avgSaleValueNet,
    totalEnterprises:    rows.length,
    projectedVgv,
    projectedUnits,
    avgProjectedTicket,
    achievementPct,
    achievementPctUnits,
    timeElapsedPct:      props.timeElapsedPct,
  }
})

watchEffect(() => { emit('selection-metrics', selectionMetricsComputed.value) })

// ── Goal-mode-aware achievement ───────────────────────────────────────────

/** Returns effective achievement % based on goal mode for this enterprise. */
function effectiveAchievementPct(row) {
  const eid = row.enterprise_id ?? row.id ?? null
  const mode = goalStore.modeForEnterprise(eid)
  if (mode === 'units') {
    const projected = row.projectedUnits || 0
    if (projected <= 0) return null
    // Quando não há vendas reais (count=0) mas há pipeline workflow (proj_count>0),
    // usa proj_count como realizados — ex.: empresa com 0+1 deve mostrar 1/5 = 20%.
    const effectiveCount = (row.count || 0) > 0 ? (row.count || 0) : (row.proj_count || 0)
    const realized = Math.max(0, effectiveCount - distratoCount(row))
    return parseFloat((realized / projected * 100).toFixed(1))
  }
  // vgv mode — row.achievementPct já inclui workflowVgv quando count=0
  return row.achievementPct ?? null
}

/** Effective goal mode label for this row (for tooltip) */
function goalModeLabel(row) {
  const eid = row.enterprise_id ?? row.id ?? null
  const mode = goalStore.modeForEnterprise(eid)
  return mode === 'units' ? 'Unidades' : 'VGV'
}

// ── Ordenação ─────────────────────────────────────────────────────────────────

const sortedData = computed(() => {
  const list = [...props.data]
  switch (sortBy.value) {
    case 'vgv-asc':
      return list.sort((a, b) => a.realizedVgv - b.realizedVgv)
    case 'achievement-desc':
      return list.sort((a, b) => (effectiveAchievementPct(b) ?? -1) - (effectiveAchievementPct(a) ?? -1))
    case 'achievement-asc':
      return list.sort((a, b) => (effectiveAchievementPct(a) ?? 999) - (effectiveAchievementPct(b) ?? 999))
    case 'name-asc':
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
    default:
      return list.sort((a, b) => b.realizedVgv - a.realizedVgv)
  }
})

// ── Helpers de cor / status ───────────────────────────────────────────────────

function ratioOf(row) {
  const elapsed = props.timeElapsedPct
  const ach = effectiveAchievementPct(row)
  if (ach == null) return null
  if (!row.projectedVgv && !row.projectedUnits) return null
  if (elapsed === 0) return ach >= 100 ? 1.2 : 0.5
  return ach / elapsed
}

function achievementTextClass(row) {
  const r = ratioOf(row)
  if (r === null) return 'text-gray-400 dark:text-gray-500'
  if (r >= 1.1)   return 'text-emerald-600 dark:text-emerald-400'
  if (r >= 0.8)   return 'text-blue-600 dark:text-blue-400'
  if (r >= 0.4)   return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function achievementBarClass(row) {
  const r = ratioOf(row)
  if (r === null) return 'bg-gray-300 dark:bg-gray-600'
  if (r >= 1.1)   return 'bg-emerald-500'
  if (r >= 0.8)   return 'bg-blue-500'
  if (r >= 0.4)   return 'bg-yellow-500'
  return 'bg-red-500'
}

function dotColor(status) {
  return {
    ahead:         '#10b981',
    on_track:      '#3b82f6',
    behind:        '#eab308',
    at_risk:       '#ef4444',
    no_sales:      '#9ca3af',
    no_projection: '#d1d5db',
  }[status] ?? '#d1d5db'
}

function statusBadgeClass(s) {
  return {
    ahead:         'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    on_track:      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    behind:        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    at_risk:       'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    no_sales:      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    no_projection: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  }[s] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600'
}

function statusIcon(s) {
  return { ahead: '🔥', on_track: '✅', behind: '⚠️', at_risk: '❄️', no_sales: '⛔', no_projection: '➖' }[s] ?? ''
}

function statusLabel(s) {
  return {
    ahead:         'Acima',
    on_track:      'Na Meta',
    behind:        'Alerta',
    at_risk:       'Em Risco',
    no_sales:      'Sem Vendas',
    no_projection: 'Sem Projeção',
  }[s] ?? s
}

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style:                 'currency',
    currency:              'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v || 0)
</script>
