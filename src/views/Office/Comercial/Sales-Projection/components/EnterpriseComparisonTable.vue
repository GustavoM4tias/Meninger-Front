<script setup>
import { ref, computed, watch, watchEffect } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useProjectionGoalModeStore } from '@/stores/Comercial/Projections/projectionGoalModeStore';
import Export from '@/components/config/Export.vue';

import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Select from '@/components/UI/Select.vue';

const props = defineProps({
  data:           { type: Array,  required: true },
  timeElapsedPct: { type: Number, default: 0 },
});

const emit = defineEmits(['selection-metrics', 'open-detail', 'open-settings', 'open-rules', 'open-charts']);

const contractsStore = useContractsStore();
const goalStore = useProjectionGoalModeStore();
const sortBy = ref('vgv-desc');
const open = ref(false);
const valueModeLabel = computed(() => contractsStore.valueModeLabel);
const isAdmin = computed(() => {
  try { return localStorage.getItem('role') === 'admin'; } catch { return false; }
});

// ── Distrato ──────────────────────────────
// Detecção e agregação centralizadas no contractsStore.
const distratoCount = (row) => contractsStore.distratoCountForRow(row);
const distratoValue = (row) => contractsStore.distratoValueForRow(row);

function baseValue(row) {
  const base = Number(contractsStore.isNet ? (row.total_value_net || 0) : (row.total_value_gross || 0));
  const dv = Number(distratoValue(row) || 0);
  return (Number.isFinite(base) ? base : 0) - (Number.isFinite(dv) ? dv : 0);
}

function appendedValue(row) {
  if (row.onlyProjectionRow) return 0;
  return contractsStore.isNet ? Number(row.proj_value_net || 0) : Number(row.proj_value_gross || 0);
}

// ── Seleção ──────────────────────────────────
const selectedKeys = ref(new Set());

watch(() => props.data, () => { selectedKeys.value = new Set(); });

const visibleKeys = computed(() => sortedData.value.map(r => r._key));

const allVisibleChecked = computed(() =>
  visibleKeys.value.length > 0 && visibleKeys.value.every(k => selectedKeys.value.has(k))
);

function toggleAllVisible(evt) {
  const next = new Set(selectedKeys.value);
  if (evt.target.checked) visibleKeys.value.forEach(k => next.add(k));
  else visibleKeys.value.forEach(k => next.delete(k));
  selectedKeys.value = next;
}

function toggleOne(key, evt) {
  const next = new Set(selectedKeys.value);
  evt.target.checked ? next.add(key) : next.delete(key);
  selectedKeys.value = next;
}

// ── Métricas de seleção ────────────────────
const selectedRows = computed(() => {
  if (selectedKeys.value.size === 0) return [];
  return props.data.filter(r => selectedKeys.value.has(r._key));
});

const selectionMetricsComputed = computed(() => {
  if (selectedRows.value.length === 0) return null;
  const rows = selectedRows.value;
  const useNet = contractsStore.isNet;

  const totalSales = rows.reduce((s, r) => s + Math.max(0, (r.count || 0) - distratoCount(r)), 0);
  const totalValueNet = rows.reduce((s, r) => s + (r.total_value_net || 0), 0);
  const totalValueGross = rows.reduce((s, r) => s + (r.total_value_gross || 0), 0);
  const projectedVgv = rows.reduce((s, r) => s + (r.projectedVgv || 0), 0);
  const projectedUnits = rows.reduce((s, r) => s + (r.projectedUnits || 0), 0);

  const wfValueNet = rows.reduce((s, r) => s + (r.proj_value_net || 0), 0);
  const wfValueGross = rows.reduce((s, r) => s + (r.proj_value_gross || 0), 0);
  const effectiveValueNet = totalValueNet + wfValueNet;
  const effectiveValueGross = totalValueGross + wfValueGross;

  const avgSaleValueNet = totalSales > 0 ? effectiveValueNet / totalSales : 0;
  const avgSaleValueGross = totalSales > 0 ? effectiveValueGross / totalSales : 0;
  const avgProjectedTicket = projectedUnits > 0 ? projectedVgv / projectedUnits : 0;

  const realizedVgv = useNet ? effectiveValueNet : effectiveValueGross;
  const achievementPctVgv = projectedVgv > 0
    ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
    : null;

  const realizedUnits = rows.reduce((s, r) => s + Math.max(0, (r.count || 0) - distratoCount(r)), 0);
  const achievementPctUnits = projectedUnits > 0
    ? parseFloat((realizedUnits / projectedUnits * 100).toFixed(1))
    : null;

  // Modo agregado: 'units' / 'vgv' / 'mixed'
  let aggregateMode = null;
  for (const r of rows) {
    if ((r.projectedVgv || 0) <= 0 && (r.projectedUnits || 0) <= 0) continue;
    const eid = r.enterprise_id ?? r.id ?? null;
    const mode = goalStore.modeForEnterprise(eid);
    if (aggregateMode == null) aggregateMode = mode;
    else if (aggregateMode !== mode) { aggregateMode = 'mixed'; break; }
  }
  aggregateMode = aggregateMode || goalStore.globalMode || 'vgv';

  // % Atingida mode-aware — média ponderada das %s por linha (peso = projectedVgv)
  let weightSum = 0, weightedPct = 0;
  for (const r of rows) {
    const eid = r.enterprise_id ?? r.id ?? null;
    const mode = goalStore.modeForEnterprise(eid);
    let pct = null;
    if (mode === 'units') {
      const proj = r.projectedUnits || 0;
      if (proj > 0) {
        const realized = Math.max(0, ((r.count || 0) > 0 ? (r.count || 0) : (r.proj_count || 0)) - distratoCount(r));
        pct = (realized / proj) * 100;
      }
    } else {
      const projVgv = r.projectedVgv || 0;
      if (projVgv > 0) {
        const baseReal = useNet ? (r.total_value_net || 0) : (r.total_value_gross || 0);
        const wfVgv = r.onlyProjectionRow ? 0 : (useNet ? (r.proj_value_net || 0) : (r.proj_value_gross || 0));
        pct = ((baseReal + wfVgv) / projVgv) * 100;
      }
    }
    if (pct == null) continue;
    const w = r.projectedVgv || 0;
    if (w <= 0) continue;
    weightedPct += pct * w;
    weightSum += w;
  }
  const achievementPct = weightSum > 0
    ? parseFloat((weightedPct / weightSum).toFixed(1))
    : null;

  return {
    totalSales,
    totalContracts: totalSales,
    totalValueNet,
    totalValueGross,
    avgSaleValueNet,
    avgSaleValueGross,
    totalValue: totalValueNet,
    avgSaleValue: avgSaleValueNet,
    totalEnterprises: rows.length,
    projectedVgv, projectedUnits,
    avgProjectedTicket,
    achievementPct,
    achievementPctVgv,
    achievementPctUnits,
    aggregateMode,
    timeElapsedPct: props.timeElapsedPct,
  };
});

watchEffect(() => { emit('selection-metrics', selectionMetricsComputed.value); });

// ── Goal-mode-aware achievement ───────────
function effectiveAchievementPct(row) {
  const eid = row.enterprise_id ?? row.id ?? null;
  const mode = goalStore.modeForEnterprise(eid);
  if (mode === 'units') {
    const projected = row.projectedUnits || 0;
    if (projected <= 0) return null;
    const effectiveCount = (row.count || 0) > 0 ? (row.count || 0) : (row.proj_count || 0);
    const realized = Math.max(0, effectiveCount - distratoCount(row));
    return parseFloat((realized / projected * 100).toFixed(1));
  }
  return row.achievementPct ?? null;
}

function goalModeLabel(row) {
  const eid = row.enterprise_id ?? row.id ?? null;
  const mode = goalStore.modeForEnterprise(eid);
  return mode === 'units' ? 'Unidades' : 'VGV';
}

// ── Ordenação ────────────────────────────
const sortedData = computed(() => {
  const list = [...props.data];
  switch (sortBy.value) {
    case 'vgv-asc':
      return list.sort((a, b) => a.realizedVgv - b.realizedVgv);
    case 'achievement-desc':
      return list.sort((a, b) => (effectiveAchievementPct(b) ?? -1) - (effectiveAchievementPct(a) ?? -1));
    case 'achievement-asc':
      return list.sort((a, b) => (effectiveAchievementPct(a) ?? 999) - (effectiveAchievementPct(b) ?? 999));
    case 'name-asc':
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    default:
      return list.sort((a, b) => b.realizedVgv - a.realizedVgv);
  }
});

const totalCount = computed(() =>
  sortedData.value.reduce((s, e) => s + Math.max(0, (e.count || 0) - distratoCount(e)), 0)
);
const totalRealized = computed(() =>
  sortedData.value.reduce((s, e) => {
    const baseReal = contractsStore.isNet ? (e.total_value_net || 0) : (e.total_value_gross || 0);
    const wfVgv = contractsStore.isNet ? (e.proj_value_net || 0) : (e.proj_value_gross || 0);
    return s + baseReal + wfVgv;
  }, 0)
);

// ── Helpers de cor / status ──────────────
function ratioOf(row) {
  const elapsed = props.timeElapsedPct;
  const ach = effectiveAchievementPct(row);
  if (ach == null) return null;
  if (!row.projectedVgv && !row.projectedUnits) return null;
  if (elapsed === 0) return ach >= 100 ? 1.2 : 0.5;
  return ach / elapsed;
}

function achievementTextClass(row) {
  const r = ratioOf(row);
  if (r === null) return 'text-ink-subtle';
  if (r >= 1.1) return 'text-emerald-600 dark:text-emerald-400';
  if (r >= 0.8) return 'text-blue-600 dark:text-blue-400';
  if (r >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function achievementBarClass(row) {
  const r = ratioOf(row);
  if (r === null) return 'bg-surface-sunken';
  if (r >= 1.1) return 'bg-emerald-500';
  if (r >= 0.8) return 'bg-blue-500';
  if (r >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
}

function dotColor(status) {
  return {
    ahead: '#10b981',
    on_track: '#3b82f6',
    behind: '#eab308',
    at_risk: '#ef4444',
    no_sales: '#9ca3af',
    no_projection: '#d1d5db',
  }[status] ?? '#d1d5db';
}

const STATUS_VARIANT = {
  ahead:         'success',
  on_track:      'accent',
  behind:        'warning',
  at_risk:       'danger',
  no_sales:      'neutral',
  no_projection: 'neutral',
};

const STATUS_ICON = {
  ahead: 'fas fa-fire',
  on_track: 'fas fa-circle-check',
  behind: 'fas fa-triangle-exclamation',
  at_risk: 'fas fa-skull',
  no_sales: 'fas fa-ban',
  no_projection: 'fas fa-minus',
};

const STATUS_LABEL = {
  ahead: 'Acima',
  on_track: 'Na meta',
  behind: 'Alerta',
  at_risk: 'Em risco',
  no_sales: 'Sem vendas',
  no_projection: 'Sem projeção',
};

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);

// ── SegmentedControl bridges ───────────────────
const valueModeProxy = computed({
  get: () => contractsStore.valueMode,
  set: (v) => contractsStore.setValueMode(v),
});
const groupByProxy = computed({
  get: () => contractsStore.groupBy,
  set: (v) => contractsStore.setGroupBy(v),
});

const valueModeOptions = [
  { value: 'net',   label: 'VGV' },
  { value: 'gross', label: 'VGV+DC' },
];

const groupByOptions = [
  { value: 'enterprise', label: 'Empreendimento', icon: 'fas fa-building' },
  { value: 'company',    label: 'Empresa',        icon: 'fas fa-city' },
];

const sortOptions = computed(() => [
  { value: 'vgv-desc',         label: `${valueModeLabel.value} Real ↓` },
  { value: 'vgv-asc',          label: `${valueModeLabel.value} Real ↑` },
  { value: 'achievement-desc', label: '% Atingida ↓' },
  { value: 'achievement-asc',  label: '% Atingida ↑' },
  { value: 'name-asc',         label: 'Nome A→Z' },
]);
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient overflow-hidden">

    <!-- Header -->
    <div class="flex flex-col gap-3 p-3 sm:p-4 border-b border-line">
      <div class="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-ink">
            Vendas por {{ contractsStore.groupBy === 'company' ? 'empresa' : 'empreendimento' }}
          </h3>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-ink">{{ sortedData.length }}</span>
            {{ contractsStore.groupBy === 'company' ? 'empresa(s)' : 'empreendimento(s)' }} ·
            <span class="font-mono text-ink">{{ totalCount }}</span> venda(s) ·
            <span class="font-mono text-ink">{{ formatCurrency(totalRealized) }}</span>
            <span v-if="selectedKeys.size" class="text-accent">
              · <span class="font-mono">{{ selectedKeys.size }}</span> selecionado(s)
            </span>
          </p>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <Button variant="primary" size="sm" icon="fas fa-chart-pie"
            @click="emit('open-charts')">
            <span class="hidden sm:inline">Análise</span>
          </Button>
          <IconButton v-if="isAdmin" icon="fas fa-cog" size="sm"
            label="Configurar regras (ocultar empreend., comissão, LAND_VALUE_ONLY...)"
            @click="emit('open-rules')" />
          <IconButton v-if="isAdmin" icon="fas fa-sliders" size="sm"
            label="Configurações de meta (unidades vs VGV)"
            @click="emit('open-settings')" />
          <IconButton icon="fas fa-download" size="sm" label="Exportar dados"
            @click="open = true" />
        </div>
      </div>

      <!-- Toolbar de toggles -->
      <div class="flex items-center gap-2 flex-wrap">
        <SegmentedControl v-model="groupByProxy" :options="groupByOptions" size="sm" />
        <SegmentedControl v-model="valueModeProxy" :options="valueModeOptions" size="sm" />
        <Select v-model="sortBy" :options="sortOptions" size="md" class="max-w-36" />
      </div>
    </div>

    <!-- Empty -->
    <EmptyState v-if="sortedData.length === 0"
      icon="fas fa-bullseye" title="Nenhum empreendimento encontrado"
      description="Ajuste os filtros para ver resultados." />

    <!-- Mobile: cards -->
    <div v-else class="md:hidden divide-y divide-line">
      <article v-for="row in sortedData" :key="row._key"
        class="flex items-start gap-3 p-3 cursor-pointer hover:bg-surface-sunken/40 transition-colors"
        :class="row.onlyProjectionRow ? 'bg-emerald-500/5' : ''"
        @click="emit('open-detail', row)">

        <input type="checkbox" :checked="selectedKeys.has(row._key)"
          @click.stop @change="toggleOne(row._key, $event)"
          class="mt-1 shrink-0 accent-accent" />

        <div class="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: dotColor(row.status) }"></div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2 flex-wrap">
            <p class="text-sm font-medium text-ink truncate flex-1">{{ row.name }}</p>
            <Badge :variant="STATUS_VARIANT[row.status] || 'neutral'" size="sm">
              <i :class="STATUS_ICON[row.status]" class="text-[9px]"></i>
              {{ STATUS_LABEL[row.status] || row.status }}
            </Badge>
          </div>

          <div class="flex items-center gap-3 mt-1.5 flex-wrap text-[11px]">
            <span class="text-ink-muted font-mono">
              <span class="text-ink font-semibold">{{ row.count - distratoCount(row) }}</span> venda(s)
              <span v-if="!row.onlyProjectionRow && row.proj_count" class="text-emerald-500 font-semibold">
                +{{ row.proj_count }}
              </span>
              <span v-if="!row.onlyProjectionRow && distratoCount(row) > 0" class="text-red-500 font-semibold"
                v-tippy="'Distratos (não contabilizados)'">
                −{{ distratoCount(row) }}
              </span>
            </span>
          </div>

          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {{ formatCurrency(baseValue(row)) }}
            </span>
            <span v-if="!row.onlyProjectionRow && appendedValue(row) > 0"
              class="text-[11px] text-emerald-500 font-mono tabular-nums">
              +{{ formatCurrency(appendedValue(row)) }}
            </span>
          </div>

          <div class="mt-1.5 flex items-center justify-between gap-2 text-[11px] flex-wrap">
            <span class="text-ink-subtle font-mono">
              meta {{ row.projectedUnits || '—' }}u · {{ formatCurrency(row.projectedVgv) }}
            </span>
            <div v-if="effectiveAchievementPct(row) != null" class="flex items-center gap-1.5">
              <span class="font-mono font-bold tabular-nums" :class="achievementTextClass(row)">
                {{ effectiveAchievementPct(row).toFixed(1) }}%
              </span>
              <div class="w-16 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-300"
                  :class="achievementBarClass(row)"
                  :style="{ width: Math.min(effectiveAchievementPct(row), 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- Desktop: tabela -->
    <div v-if="sortedData.length" class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-surface-sunken/40 border-b border-line">
          <tr>
            <th class="px-4 py-2.5 w-10">
              <input type="checkbox" :checked="allVisibleChecked"
                @change="toggleAllVisible($event)" class="accent-accent" />
            </th>
            <th class="px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
              {{ contractsStore.groupBy === 'company' ? 'Empresa' : 'Empreendimento' }}
            </th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Vendas</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
              Realizado <span class="text-ink-subtle/70">({{ valueModeLabel }})</span>
            </th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Meta unid.</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Meta projetada</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle"
              v-tippy="`Modo padrão: ${goalStore.globalMode === 'units' ? 'Unidades' : 'VGV'}. Clique no nome para detalhes.`">
              % Atingida
            </th>
            <th class="px-4 py-2.5 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-line">
          <tr v-for="row in sortedData" :key="row._key"
            class="transition-colors"
            :class="row.onlyProjectionRow
              ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
              : 'hover:bg-surface-sunken/40'">

            <td class="px-4 py-3">
              <input type="checkbox" :checked="selectedKeys.has(row._key)"
                @change="toggleOne(row._key, $event)" class="accent-accent" />
            </td>

            <!-- Nome -->
            <td class="px-4 py-3 max-w-md">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-2.5 h-2.5 rounded-full shrink-0"
                  :style="{ backgroundColor: dotColor(row.status) }"></div>
                <button @click="emit('open-detail', row)"
                  v-tippy="`Ver detalhes — meta por ${goalModeLabel(row)}`"
                  class="text-sm font-medium text-ink hover:text-accent text-left truncate transition-colors">
                  {{ row.name }}
                </button>
                <Badge v-if="row.onlyProjectionRow" variant="success" size="sm">
                  <i class="fas fa-chart-line text-[9px]"></i>Projeção
                </Badge>
              </div>
            </td>

            <!-- Vendas -->
            <td class="px-4 py-3 text-right">
              <div class="text-sm font-semibold text-ink tabular-nums relative inline-block">
                {{ row.count - distratoCount(row) }}
                <span v-if="!row.onlyProjectionRow && row.proj_count"
                  class="absolute -top-3 -right-2 text-[10px] font-bold text-emerald-500 font-mono"
                  v-tippy="'Projeção'">
                  +{{ row.proj_count }}
                </span>
                <span v-if="!row.onlyProjectionRow && distratoCount(row) > 0"
                  class="absolute -bottom-3 -right-2 text-[10px] font-bold text-red-500 font-mono"
                  v-tippy="'Distratos (não contabilizados)'">
                  −{{ distratoCount(row) }}
                </span>
              </div>
            </td>

            <!-- Realizado -->
            <td class="px-4 py-3 text-right">
              <div class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {{ formatCurrency(baseValue(row)) }}
              </div>
              <div v-if="!row.onlyProjectionRow && appendedValue(row) > 0"
                class="text-[11px] text-emerald-500 font-mono tabular-nums">
                +{{ formatCurrency(appendedValue(row)) }}
              </div>
              <div v-if="!row.onlyProjectionRow && distratoValue(row) > 0"
                class="text-[11px] text-red-500 font-mono tabular-nums"
                v-tippy="'Distratos (não contabilizados)'">
                −{{ formatCurrency(distratoValue(row)) }}
              </div>
            </td>

            <!-- Meta Unidades -->
            <td class="px-4 py-3 text-right">
              <span v-if="row.projectedUnits"
                class="text-sm font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                {{ row.projectedUnits }}
              </span>
              <span v-else class="text-sm text-ink-subtle">—</span>
            </td>

            <!-- Meta Projetada -->
            <td class="px-4 py-3 text-right">
              <span v-if="row.projectedVgv"
                class="text-sm font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                {{ formatCurrency(row.projectedVgv) }}
              </span>
              <span v-else class="text-sm text-ink-subtle">—</span>
            </td>

            <!-- % Atingida -->
            <td class="px-4 py-3 text-right">
              <div v-if="effectiveAchievementPct(row) != null" class="flex flex-col items-end gap-1.5">
                <span class="text-sm font-bold tabular-nums" :class="achievementTextClass(row)"
                  v-tippy="`Meta por ${goalModeLabel(row)}`">
                  {{ effectiveAchievementPct(row).toFixed(1) }}%
                </span>
                <div class="w-20 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-300"
                    :class="achievementBarClass(row)"
                    :style="{ width: Math.min(effectiveAchievementPct(row), 100) + '%' }"></div>
                </div>
              </div>
              <span v-else class="text-sm text-ink-subtle">—</span>
            </td>

            <!-- Status -->
            <td class="px-4 py-3 text-center">
              <Badge :variant="STATUS_VARIANT[row.status] || 'neutral'" size="sm">
                <i :class="STATUS_ICON[row.status]" class="text-[9px]"></i>
                {{ STATUS_LABEL[row.status] || row.status }}
              </Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Export v-model="open" :source="sortedData"
      title="Exportação de Vendas × Projeção" filename="Vendas_Projecao"
      initial-delimiter=";" initial-array-mode="join" :preselect="[]" />
  </section>
</template>
