<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Busque títulos no Sienge — parcelas e custos gerados automaticamente por data de vencimento"
        icon="fas fa-file-invoice-dollar">
        <template #title>
          Gerenciamento de Títulos e Custos
          <Favorite :router="'/financeiro/titulos'" :section="'Títulos'" />
        </template>
      </PageHeader>

      <!-- Filtros Card -->
      <Surface variant="raised" padding="md" class="mb-5 surface-gradient">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <!-- Empreendimento -->
          <div class="md:col-span-4">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-city text-accent text-[10px]"></i>
              Empreendimento / Centro de Custo
            </label>
            <MultiSelector :model-value="selectedCostCenterNames" @update:modelValue="handleCostCenterChange"
              :options="costCenterOptions" placeholder="Selecione empreendimentos" :page-size="200" />
          </div>

          <!-- Data Inicial -->
          <div class="md:col-span-2">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-calendar-day text-accent text-[10px]"></i>
              Data Inicial
            </label>
            <Input v-model="store.startDate" type="date" />
          </div>

          <!-- Data Final -->
          <div class="md:col-span-2">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-calendar-check text-accent text-[10px]"></i>
              Data Final
            </label>
            <Input v-model="store.endDate" type="date" />
          </div>

          <!-- Departamentos -->
          <div class="md:col-span-2">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-sitemap text-accent text-[10px]"></i>
              Departamento(s)
            </label>
            <MultiSelector :model-value="store.selectedDepartments"
              @update:modelValue="v => store.selectedDepartments = Array.isArray(v) ? v : []"
              :options="store.departmentsOptions" placeholder="Departamento" :page-size="200" />
          </div>

          <!-- Botões -->
          <div class="md:col-span-2 flex flex-col gap-2">
            <Button variant="primary" icon="fas fa-filter" block
              :loading="store.isLoading"
              :disabled="store.isLoading || !store.costCenterIds.length"
              @click="store.fetchBills">
              {{ store.isLoading ? 'Carregando...' : 'Filtrar' }}
            </Button>
          </div>
        </div>

        <!-- Busca livre -->
        <div class="mt-4">
          <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
            <i class="fas fa-magnifying-glass text-accent text-[10px]"></i>
            Buscar
          </label>
          <div class="relative">
            <Input v-model="store.searchTerm" icon-left="fas fa-search"
              placeholder="Tipo (ALUG, NFE, NFS...), nº do título (#), credor, documento, status..." />
            <button v-if="store.searchTerm" type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors"
              title="Limpar busca" @click="store.searchTerm = ''">
              <i class="fas fa-times-circle"></i>
            </button>
          </div>
        </div>

        <!-- Aviso de range excessivo -->
        <Surface v-if="store.dateRangeWarning" variant="raised" padding="sm"
          class="mt-3 border-amber-500/30 bg-amber-500/10">
          <div class="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <i class="fas fa-triangle-exclamation"></i>
            {{ store.dateRangeWarning }}
          </div>
        </Surface>

        <Surface v-if="store.error" variant="raised" padding="sm"
          class="mt-3 border-red-500/30 bg-red-500/10">
          <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ store.error }}
          </div>
        </Surface>
      </Surface>

      <!-- Summary Card -->
      <Surface variant="raised" padding="md" class="mb-5 surface-gradient">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-xl bg-accent-soft border border-accent/20 grid place-items-center text-accent shrink-0">
            <i class="fas fa-list text-xl"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-ink font-mono tabular-nums">
              {{ store.visibleBills.length }}
            </div>
            <div class="text-xs text-ink-muted">
              de <span class="font-mono tabular-nums">{{ store.bills.length }}</span> carregados
            </div>
          </div>
        </div>
      </Surface>

      <!-- Table Card -->
      <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
        <!-- Table Header -->
        <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40">
          <h3 class="text-base font-semibold text-ink flex items-center gap-2">
            <i class="fas fa-table text-accent"></i>
            Títulos Disponíveis
          </h3>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto">
            <thead class="bg-surface-sunken/60 border-b border-line">
              <tr>
                <th v-for="col in columns" :key="col.key"
                  class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle select-none cursor-pointer hover:text-ink transition-colors"
                  :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'"
                  @click="store.setSort(col.key)">
                  <span class="inline-flex items-center gap-1.5"
                    :class="col.align === 'right' ? 'flex-row-reverse' : ''">
                    {{ col.label }}
                    <i class="text-[9px]" :class="sortIcon(col.key)"></i>
                  </span>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-line">
              <tr v-for="bill in store.visibleBills" :key="bill.id"
                class="hover:bg-surface-hover/40 transition-colors">

                <!-- Fornecedor -->
                <td class="px-4 py-3 align-middle">
                  <div class="space-y-0.5 max-w-56">
                    <div class="text-sm font-semibold text-ink truncate">
                      {{ bill.creditor_json ? (bill.creditor_json.tradeName || bill.creditor_json.name || 'Sem nome') : '—' }}
                    </div>
                    <div v-if="bill.creditor_json?.cnpj" class="text-[10px] text-ink-subtle truncate font-mono">
                      CNPJ: {{ bill.creditor_json.cnpj }}
                    </div>
                  </div>
                </td>

                <!-- Documento -->
                <td class="px-4 py-3 align-middle">
                  <div class="space-y-0.5">
                    <div class="text-xs font-medium text-ink-muted">
                      {{ bill.document_identification_id }} {{ bill.document_number }}
                    </div>
                    <div class="text-[10px] text-ink-subtle font-mono">#{{ bill.id }}</div>
                    <div v-if="bill.notes" class="text-[10px] text-ink-subtle truncate max-w-40" :title="bill.notes">
                      {{ bill.notes }}
                    </div>
                  </div>
                </td>

                <!-- Parcelas -->
                <td class="px-4 py-3 whitespace-nowrap text-center align-middle">
                  <Badge v-if="bill.installments_number && bill.installments_number > 1"
                    variant="accent" size="sm" class="font-mono">
                    {{ bill.installments_number }}x
                  </Badge>
                  <Badge v-else variant="neutral" size="sm" class="font-mono">1x</Badge>
                </td>

                <!-- Valor -->
                <td class="px-4 py-3 whitespace-nowrap text-right align-middle">
                  <div class="text-sm font-bold text-accent font-mono tabular-nums">
                    {{ Number(bill.total_invoice_amount || 0).toLocaleString('pt-BR', {
                      style: 'currency', currency: 'BRL'
                    }) }}
                  </div>
                </td>

                <!-- Emissão -->
                <td class="px-4 py-3 whitespace-nowrap text-center align-middle">
                  <div class="text-sm text-ink-muted font-mono tabular-nums">
                    {{ bill.issue_date ? new Date(bill.issue_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—' }}
                  </div>
                </td>

                <!-- Departamento -->
                <td class="px-4 py-3 text-center align-middle">
                  <Badge v-if="bill.main_department_name" variant="info" size="sm">
                    {{ bill.main_department_name }}
                  </Badge>
                  <span v-else class="text-xs text-ink-subtle">—</span>
                </td>

                <!-- Status -->
                <td class="px-4 py-3 text-center align-middle">
                  <Badge :variant="statusBadgeVariant(bill.current_status)" size="sm">
                    {{ statusBadgeLabel(bill.current_status) }}
                  </Badge>
                </td>
              </tr>

              <tr v-if="!store.visibleBills.length && !store.isLoading">
                <td colspan="7" class="px-6 py-12">
                  <EmptyState
                    icon="fas fa-inbox"
                    title="Nenhum título encontrado"
                    description="Ajuste os filtros e clique em 'Filtrar'." />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>
    </PageContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBillsStore } from '@/stores/Financeiro/Bills/billsStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useCostCenterNamesStore } from '@/stores/Financeiro/costCenterNamesStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useBillsStore();
const contractsStore = useContractsStore();
const ccNames = useCostCenterNamesStore();

// ── MultiSelector de centro de custo ──────────────────────────────────────────
const selectedCostCenterNames = ref([]);

// Nome efetivo = override admin (se houver) senão o nome do enterprise_cities
function effectiveName(e) {
  return ccNames.displayName(e.erp_id, e.name);
}

// Rótulo "Nome (CC)" para o filtro buscar por nome OU por número do centro de custo.
// Dedup por erp_id (enterprise_cities pode ter duplicatas crm/erp).
const costCenterEntries = computed(() => {
  const byId = new Map();
  for (const e of contractsStore.enterpriseCities || []) {
    const id = Number(e.erp_id);
    if (!Number.isFinite(id) || byId.has(id)) continue;
    byId.set(id, `${effectiveName(e)} (${id})`);
  }
  return byId;
});

const costCenterOptions = computed(() =>
  Array.from(costCenterEntries.value.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
);

const costCenterIdByName = computed(() => {
  const m = new Map();
  for (const [id, label] of costCenterEntries.value) m.set(label, id);
  return m;
});

function handleCostCenterChange(v) {
  const arr = Array.isArray(v) ? v : [];
  selectedCostCenterNames.value = arr;
  store.costCenterIds = arr
    .map(label => costCenterIdByName.value.get(label))
    .filter(id => Number.isFinite(id));
}

// ── Colunas ordenáveis ────────────────────────────────────────────────────────
const columns = [
  { key: 'creditor',     label: 'Fornecedor',   align: 'left' },
  { key: 'document',     label: 'Documento',    align: 'left' },
  { key: 'installments', label: 'Parcelas',     align: 'center' },
  { key: 'amount',       label: 'Valor Total',  align: 'right' },
  { key: 'issue_date',   label: 'Emissão',      align: 'center' },
  { key: 'department',   label: 'Departamento', align: 'center' },
  { key: 'status',       label: 'Status',       align: 'center' },
];

function sortIcon(key) {
  if (store.sortKey !== key) return 'fas fa-sort text-ink-subtle/40';
  return store.sortDir === 'asc'
    ? 'fas fa-sort-up text-accent'
    : 'fas fa-sort-down text-accent';
}

// ── Status badge ──────────────────────────────────────────────────────────────
function statusBadgeVariant(status) {
  switch (status) {
    case 'paid':      return 'success';
    case 'partial':   return 'warning';
    case 'cancelled': return 'danger';
    default:          return 'neutral';   // open ou null
  }
}
function statusBadgeLabel(status) {
  switch (status) {
    case 'paid':      return 'Pago';
    case 'partial':   return 'Parcial';
    case 'cancelled': return 'Cancelado';
    case 'open':      return 'Em aberto';
    default:          return '—';
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      contractsStore.fetchEnterpriseCities(),
      ccNames.fetchOverrideMap(),
    ]);
  } catch (e) {
    console.error('Erro ao carregar empreendimentos:', e);
  }
});
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
