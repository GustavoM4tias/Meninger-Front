<script setup>
import { ref, computed, watch, watchEffect } from 'vue';
import { useCan } from '@/composables/useCan';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useProjectionGoalModeStore } from '@/stores/Comercial/Projections/projectionGoalModeStore';
import Export from '@/components/config/Export.vue';

import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Panel from '@/components/UI/Panel.vue';
import DataTable from '@/components/UI/DataTable.vue';
import ActionBar from '@/components/UI/ActionBar.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
  data:           { type: Array,  required: true },
  timeElapsedPct: { type: Number, default: 0 },
});

const emit = defineEmits(['selection-metrics', 'open-detail', 'open-settings', 'open-rules', 'open-charts']);

const contractsStore = useContractsStore();
const goalStore = useProjectionGoalModeStore();
const sortKey = ref('realizado');
const sortDir = ref('desc');
const open = ref(false);
const valueModeLabel = computed(() => contractsStore.valueModeLabel);
// Ações desta tela (lib/screenCapabilities.js no back): view segue a alçada,
// configure (regra de meta) é admin. Lia `localStorage.getItem('role')` —
// qualquer um se dava admin no navegador. Ver composables/useCan.js.
const can = useCan('/comercial/relatorios/projecao');

// ── Valores ───────────────────────────────
// Mesmos getters do Faturamento: distrato conta (selo informativo), projeção somada à parte.
const distratoCount = (row) => contractsStore.distratoCountForRow(row);
const distratoValue = (row) => contractsStore.distratoValueForRow(row);
const baseValue = (row) => contractsStore.realizedValueForRow(row);
const appendedValue = (row) => contractsStore.projectedValueForRow(row);
const realizedCount = (row) => contractsStore.realizedCountForRow(row);
const combinedValue = (row) => contractsStore.combinedValueForRow(row);
const combinedCount = (row) => contractsStore.combinedCountForRow(row);
const isUnlinked = (row) => contractsStore.isUnlinkedProjectionRow(row);

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

  const totalSales = rows.reduce((s, r) => s + realizedCount(r), 0);
  const projectedVgv = rows.reduce((s, r) => s + (r.projectedVgv || 0), 0);
  const projectedUnits = rows.reduce((s, r) => s + (r.projectedUnits || 0), 0);

  // Realizado pela mesma regra do Faturamento, nos dois modos (os cartões
  // escolhem qual mostrar conforme VGV / VGV+DC).
  const totalValueNet = rows.reduce((s, r) => s + contractsStore.combinedValuesForRow(r).net, 0);
  const totalValueGross = rows.reduce((s, r) => s + contractsStore.combinedValuesForRow(r).gross, 0);
  const realizedVgv = useNet ? totalValueNet : totalValueGross;
  const avgSaleValueNet = totalSales > 0 ? totalValueNet / totalSales : 0;
  const avgSaleValueGross = totalSales > 0 ? totalValueGross / totalSales : 0;
  const avgProjectedTicket = projectedUnits > 0 ? projectedVgv / projectedUnits : 0;

  const achievementPctVgv = projectedVgv > 0
    ? parseFloat((realizedVgv / projectedVgv * 100).toFixed(1))
    : null;

  const realizedUnits = rows.reduce((s, r) => s + combinedCount(r), 0);
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
      if (proj > 0) pct = (combinedCount(r) / proj) * 100;
    } else {
      const projVgv = r.projectedVgv || 0;
      if (projVgv > 0) pct = (combinedValue(r) / projVgv) * 100;
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
    totalValue: realizedVgv,
    avgSaleValue: useNet ? avgSaleValueNet : avgSaleValueGross,
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
    // Distratos contam normalmente (regra de ouro: na época foi venda).
    const realized = (row.count || 0) > 0 ? (row.count || 0) : (row.proj_count || 0);
    return parseFloat((realized / projected * 100).toFixed(1));
  }
  return row.achievementPct ?? null;
}

function goalModeLabel(row) {
  const eid = row.enterprise_id ?? row.id ?? null;
  const mode = goalStore.modeForEnterprise(eid);
  return mode === 'units' ? 'Unidades' : 'VGV';
}

/* ── Ordenação ────────────────────────────────────────────────────────────
 * O seletor de ordenação saiu da barra: quem ordena agora é o cabeçalho da
 * tabela, que é o padrão do sistema e existe nas duas larguras (no celular a
 * DataTable mostra o próprio seletor). A ordenação continua CONTROLADA aqui
 * porque é a `sortedData` que alimenta a exportação. */
const sortValueOfRow = (r) => {
  switch (sortKey.value) {
    case 'name': return (r.name || '').toLowerCase();
    case 'count': return combinedCount(r);
    case 'metaUnid': return r.projectedUnits || 0;
    case 'metaVgv': return r.projectedVgv || 0;
    case 'atingida': return effectiveAchievementPct(r) ?? -1;
    case 'status': return STATUS_LABEL[r.status] || '';
    default: return combinedValue(r);
  }
};

const sortedData = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...props.data].sort((a, b) => {
    const av = sortValueOfRow(a);
    const bv = sortValueOfRow(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'pt-BR', { numeric: true, sensitivity: 'base' }) * dir;
  });
});

const onSortBy = (key) => { sortKey.value = key || 'realizado'; };
const onSortDir = (dir) => { sortDir.value = dir; };

const totalCount = computed(() =>
  sortedData.value.reduce((s, e) => s + realizedCount(e), 0)
);
const totalRealized = computed(() =>
  sortedData.value.reduce((s, e) => s + combinedValue(e), 0)
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
  if (r >= 1.1) return 'text-data-pos';
  if (r >= 0.8) return 'text-accent';
  if (r >= 0.4) return 'text-data-warn';
  return 'text-data-neg';
}

function achievementBarClass(row) {
  const r = ratioOf(row);
  if (r === null) return 'bg-surface-sunken';
  if (r >= 1.1) return 'bg-data-pos';
  if (r >= 0.8) return 'bg-accent';
  if (r >= 0.4) return 'bg-data-warn';
  return 'bg-data-neg';
}

/* Ponto de status. Eram seis hex crus, fora da paleta e cegos ao tema escuro.
 * Aqui a cor é de JUÍZO (data-pos/warn/neg), que é exatamente o que o status
 * comunica - e por isso nunca vira série. Escrito por extenso de propósito: o
 * Tailwind varre o texto do arquivo e não geraria `bg-${x}`. */
const STATUS_DOT = {
  ahead: 'bg-data-pos',
  on_track: 'bg-accent',
  behind: 'bg-data-warn',
  at_risk: 'bg-data-neg',
  no_sales: 'bg-ink-subtle',
  no_projection: 'bg-line',
};
const dotClass = (status) => STATUS_DOT[status] || 'bg-line';

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

/* ── Colunas ──────────────────────────────────────────────────────────────
 * Prioridade decide a ORDEM no celular, nunca o que existe: as metas ficam a
 * um toque, em "Ver detalhes", e continuam ordenáveis. */
const columns = computed(() => [
  { key: 'sel', label: 'Sel.', priority: 2, align: 'center', width: '3.25rem', truncate: false },
  {
    key: 'name', priority: 1, sortable: true, truncate: false,
    label: contractsStore.groupBy === 'company' ? 'Empresa' : 'Empreendimento',
  },
  { key: 'count', label: 'Vendas', priority: 2, numeric: true, sortable: true, width: '7rem' },
  { key: 'realizado', label: `Realizado (${valueModeLabel.value})`, priority: 1, numeric: true, sortable: true, width: '12rem' },
  { key: 'metaUnid', label: 'Meta unid.', priority: 3, numeric: true, sortable: true, width: '8rem' },
  { key: 'metaVgv', label: 'Meta projetada', priority: 3, numeric: true, sortable: true, width: '11rem' },
  { key: 'atingida', label: '% Atingida', priority: 1, numeric: true, sortable: true, width: '9rem' },
  { key: 'status', label: 'Status', priority: 2, align: 'center', sortable: true, width: '8rem', truncate: false },
]);

const someVisibleChecked = computed(
  () => visibleKeys.value.some((k) => selectedKeys.value.has(k)) && !allVisibleChecked.value);

const clearSelection = () => { selectedKeys.value = new Set(); };
</script>

<template>
  <Panel :padded="false" icon="fas fa-bullseye"
    :title="`Vendas por ${contractsStore.groupBy === 'company' ? 'empresa' : 'empreendimento'}`"
    :subtitle="`${sortedData.length} ${contractsStore.groupBy === 'company' ? 'empresa(s)' : 'empreendimento(s)'} · ${totalCount} venda(s) · ${formatCurrency(totalRealized)}`">

    <template #actions>
      <SegmentedControl v-model="groupByProxy" :options="groupByOptions" size="sm" />
      <SegmentedControl v-model="valueModeProxy" :options="valueModeOptions" size="sm" />
      <Button variant="primary" size="sm" icon="fas fa-chart-pie" @click="emit('open-charts')">
        <span class="hidden sm:inline">Análise</span>
      </Button>
      <IconButton v-if="can('configure')" icon="fas fa-cog" size="sm"
        label="Configurar regras (ocultar empreend., comissão, LAND_VALUE_ONLY...)"
        @click="emit('open-rules')" />
      <IconButton v-if="can('configure')" icon="fas fa-sliders" size="sm"
        label="Configurações de meta (unidades vs VGV)" @click="emit('open-settings')" />
      <IconButton icon="fas fa-download" size="sm" label="Exportar dados" @click="open = true" />
    </template>

    <!-- Selecionar todos fora da tabela: no celular não há cabeçalho de coluna
         onde ele caberia, e esconder no monitor quebraria a paridade. -->
    <div v-if="sortedData.length" class="px-3 sm:px-4 pt-3 flex items-center gap-2">
      <input id="proj-sel-todos" type="checkbox" class="checkbox checkbox-sm"
        :checked="allVisibleChecked" :indeterminate.prop="someVisibleChecked"
        @change="toggleAllVisible($event)" />
      <label for="proj-sel-todos" class="text-micro text-ink-muted cursor-pointer select-none">
        Selecionar todos ({{ sortedData.length }})
      </label>
    </div>

    <div class="p-3 sm:p-4">
      <DataTable :columns="columns" :rows="sortedData" row-key="_key" clickable manual-sort
        :sort-by="sortKey" :sort-dir="sortDir"
        empty-icon="fas fa-bullseye" empty-title="Nenhum empreendimento encontrado"
        empty-text="Ajuste os filtros para ver resultados."
        @update:sortBy="onSortBy" @update:sortDir="onSortDir"
        @row-click="row => emit('open-detail', row)">

        <template #cell-sel="{ row }">
          <input type="checkbox" class="checkbox checkbox-sm" :checked="selectedKeys.has(row._key)"
            :aria-label="`Selecionar ${row.name}`"
            @click.stop @change="toggleOne(row._key, $event)" />
        </template>

        <template #cell-name="{ row }">
          <span class="inline-flex items-center gap-2 min-w-0">
            <span class="h-2.5 w-2.5 rounded-full shrink-0" :class="dotClass(row.status)"></span>
            <span class="truncate font-medium text-ink" :title="row.name"
              v-tippy="`Ver detalhes — meta por ${goalModeLabel(row)}`">{{ row.name }}</span>
            <Badge v-if="isUnlinked(row)" variant="warning" size="sm"
              v-tippy="'Esta projeção não achou o empreendimento correspondente no Sienge, por isso aparece em linha separada. Um admin resolve na engrenagem, aba Vínculo CV ↔ Sienge.'">
              <i class="fas fa-link-slash text-micro"></i>Sem vínculo
            </Badge>
            <Badge v-else-if="row.onlyProjectionRow" variant="success" size="sm">
              <i class="fas fa-chart-line text-micro"></i>Projeção
            </Badge>
          </span>
        </template>

        <template #cell-count="{ row }">
          <span class="inline-flex items-baseline gap-1.5 justify-end">
            <span class="font-semibold text-ink">{{ realizedCount(row) }}</span>
            <span v-if="!row.onlyProjectionRow && row.proj_count" v-tippy="'Projeção'"
              class="text-micro font-semibold text-data-pos">+{{ row.proj_count }}</span>
            <span v-if="!row.onlyProjectionRow && distratoCount(row) > 0"
              v-tippy="'Distratada(s) depois da venda — contabilizadas no período'"
              class="text-micro font-semibold text-data-warn">
              <i class="fas fa-file-circle-xmark"></i>{{ distratoCount(row) }}</span>
          </span>
        </template>

        <template #cell-realizado="{ row }">
          <span class="block font-semibold text-data-pos">{{ formatCurrency(baseValue(row)) }}</span>
          <span v-if="!row.onlyProjectionRow && appendedValue(row) > 0"
            class="block text-micro text-data-pos">+{{ formatCurrency(appendedValue(row)) }}</span>
          <span v-if="!row.onlyProjectionRow && distratoValue(row) > 0"
            v-tippy="'Valor de vendas distratadas — incluído no total'"
            class="block text-micro text-data-warn">
            <i class="fas fa-file-circle-xmark"></i> {{ formatCurrency(distratoValue(row)) }}</span>
        </template>

        <template #cell-metaUnid="{ row }">
          <span v-if="row.projectedUnits" class="font-semibold text-accent">{{ row.projectedUnits }}</span>
          <span v-else class="text-ink-subtle">—</span>
        </template>

        <template #cell-metaVgv="{ row }">
          <span v-if="row.projectedVgv" class="font-semibold text-accent">
            {{ formatCurrency(row.projectedVgv) }}
          </span>
          <span v-else class="text-ink-subtle">—</span>
        </template>

        <template #cell-atingida="{ row }">
          <span v-if="effectiveAchievementPct(row) != null" class="flex flex-col items-end gap-1.5">
            <span class="font-bold" :class="achievementTextClass(row)"
              v-tippy="`Meta por ${goalModeLabel(row)}`">
              {{ effectiveAchievementPct(row).toFixed(1) }}%
            </span>
            <span class="w-20 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
              <span class="block h-full rounded-full transition-all duration-420 ease-out-expo"
                :class="achievementBarClass(row)"
                :style="{ width: Math.min(effectiveAchievementPct(row), 100) + '%' }"></span>
            </span>
          </span>
          <span v-else class="text-ink-subtle">—</span>
        </template>

        <template #cell-status="{ row }">
          <Badge :variant="STATUS_VARIANT[row.status] || 'neutral'" size="sm">
            <i :class="STATUS_ICON[row.status]" class="text-micro"></i>
            {{ STATUS_LABEL[row.status] || row.status }}
          </Badge>
        </template>
      </DataTable>
    </div>
  </Panel>

  <ActionBar v-if="selectedKeys.size > 0" :count="selectedKeys.size"
    :unit="contractsStore.groupBy === 'company' ? 'empresas' : 'empreendimentos'"
    summary="Os cartões do topo já mostram só o que está marcado"
    @clear="clearSelection" />

  <Export v-model="open" :source="sortedData"
    title="Vendas x Projeção"
    initial-delimiter=";" initial-array-mode="join" :preselect="[]"
    :filters="{ 'Ordenação': `${sortKey} ${sortDir}`, 'Modo de valor': valueModeLabel }" />
</template>
