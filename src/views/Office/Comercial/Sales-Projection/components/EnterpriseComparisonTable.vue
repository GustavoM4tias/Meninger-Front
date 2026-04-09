<template>
  <div class="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">

    <!-- ── Cabeçalho ─────────────────────────────────────────────────────────── -->
    <div class="p-6 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Vendas por Empreendimento</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Realizado vs. Projetado por empreendimento</p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- VGV / VGV+DC -->
          <div class="inline-flex rounded-md border dark:border-gray-700 overflow-hidden">
            <button
              @click="contractsStore.setValueMode('net')"
              :class="[
                'px-3 py-1 text-sm font-medium',
                contractsStore.valueMode === 'net'
                  ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100'
              ]">VGV</button>
            <button
              @click="contractsStore.setValueMode('gross')"
              :class="[
                'px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700',
                contractsStore.valueMode === 'gross'
                  ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100'
              ]">VGV+DC</button>
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
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Empreendimento
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Vendas
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Realizado <span class="text-gray-400">({{ valueModeLabel }})</span>
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Meta Projetada
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
            :key="row.enterprise_id ?? row.name"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">

            <!-- Empreendimento -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: dotColor(row.status) }" />
                <span class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{{ row.name }}</span>
              </div>
            </td>

            <!-- Vendas -->
            <td class="px-6 py-4 text-right">
              <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ row.count }}</span>
            </td>

            <!-- Realizado VGV -->
            <td class="px-6 py-4 text-right">
              <span class="text-sm font-semibold text-green-600 dark:text-green-400">
                {{ formatCurrency(row.realizedVgv) }}
              </span>
            </td>

            <!-- Meta Projetada -->
            <td class="px-6 py-4 text-right">
              <span v-if="row.projectedVgv" class="text-sm font-medium text-sky-600 dark:text-sky-400">
                {{ formatCurrency(row.projectedVgv) }}
              </span>
              <span v-else class="text-sm text-gray-400 dark:text-gray-500">—</span>
            </td>

            <!-- % Atingida -->
            <td class="px-6 py-4 text-right">
              <div v-if="row.achievementPct != null && row.projectedVgv > 0" class="flex flex-col items-end gap-1.5">
                <span class="text-sm font-bold" :class="achievementTextClass(row)">
                  {{ row.achievementPct.toFixed(1) }}%
                </span>
                <div class="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="achievementBarClass(row)"
                    :style="{ width: Math.min(row.achievementPct, 100) + '%' }" />
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

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'

const props = defineProps({
  data:            { type: Array,  required: true },
  timeElapsedPct:  { type: Number, default: 0 },
})

const contractsStore = useContractsStore()
const sortBy         = ref('vgv-desc')
const valueModeLabel = computed(() => contractsStore.valueModeLabel)

// ── Ordenação ─────────────────────────────────────────────────────────────────

const sortedData = computed(() => {
  const list = [...props.data]
  switch (sortBy.value) {
    case 'vgv-asc':
      return list.sort((a, b) => a.realizedVgv - b.realizedVgv)
    case 'achievement-desc':
      return list.sort((a, b) => (b.achievementPct ?? -1) - (a.achievementPct ?? -1))
    case 'achievement-asc':
      return list.sort((a, b) => (a.achievementPct ?? 999) - (b.achievementPct ?? 999))
    case 'name-asc':
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
    default: // vgv-desc
      return list.sort((a, b) => b.realizedVgv - a.realizedVgv)
  }
})

// ── Helpers de cor / status ───────────────────────────────────────────────────

function ratioOf(row) {
  const elapsed = props.timeElapsedPct
  if (!row.projectedVgv) return null
  if (elapsed === 0) return row.achievementPct >= 100 ? 1.2 : 0.5
  return (row.achievementPct ?? 0) / elapsed
}

function achievementTextClass(row) {
  const r = ratioOf(row)
  if (r === null)  return 'text-gray-400 dark:text-gray-500'
  if (r >= 1.1)    return 'text-emerald-600 dark:text-emerald-400'
  if (r >= 0.8)    return 'text-blue-600 dark:text-blue-400'
  if (r >= 0.4)    return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function achievementBarClass(row) {
  const r = ratioOf(row)
  if (r === null)  return 'bg-gray-300 dark:bg-gray-600'
  if (r >= 1.1)    return 'bg-emerald-500'
  if (r >= 0.8)    return 'bg-blue-500'
  if (r >= 0.4)    return 'bg-yellow-500'
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
