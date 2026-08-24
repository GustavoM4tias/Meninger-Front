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
        <template #actions>
          <PageHelp
            storage-key="titulos"
            title="Como buscar títulos"
            intro="Consulta de títulos do Sienge por data de vencimento. As parcelas e os custos vêm do backup, então refletem o último espelho do Sienge, não o instante atual."
            :steps="[
              { title: 'Recorte o período', text: 'A busca é por data de vencimento. Sem período, a consulta traria a base inteira.' },
              { title: 'Filtre por empreendimento e departamento', text: 'É o que separa o custo de uma obra do custo de outra.' },
              { title: 'Leia a parcela', text: 'Cada linha é uma parcela, não um contrato: o mesmo contrato aparece tantas vezes quantas forem as parcelas no período.' },
            ]"
            :tips="[
              'Valor divergente do Sienge quase sempre é defasagem do backup, não erro de conta.',
              'Título sem departamento aparece assim mesmo: a tela não adivinha classificação.',
            ]" />
        </template>
      </PageHeader>

      <!-- Filtros Card -->
      <Surface variant="raised" padding="md" class="mb-5 surface-gradient">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <!-- Empreendimento -->
          <div class="md:col-span-4">
            <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-city text-accent text-[10px]"></i>
              Empreendimento / Centro de Custo
            </label>
            <MultiSelector :model-value="selectedCostCenterNames" @update:modelValue="handleCostCenterChange"
              :options="costCenterOptions" placeholder="Selecione empreendimentos" :page-size="200" />
          </div>

          <!-- Data Inicial -->
          <div class="md:col-span-2">
            <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-calendar-day text-accent text-[10px]"></i>
              Data Inicial
            </label>
            <Input v-model="store.startDate" type="date" />
          </div>

          <!-- Data Final -->
          <div class="md:col-span-2">
            <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-calendar-check text-accent text-[10px]"></i>
              Data Final
            </label>
            <Input v-model="store.endDate" type="date" />
          </div>

          <!-- Departamentos -->
          <div class="md:col-span-2">
            <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
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
          <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
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
      <!-- A listagem é o primitivo. Era uma tabela com `overflow-x-auto` e
           NENHUMA versão de celular: no telefone a pessoa arrastava a tela de
           lado para ler uma linha, e o Fornecedor sumia da vista junto com o
           Valor. Agora cada largura tem o seu arranjo, e ordenar existe nas
           duas. -->
      <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
        <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40">
          <h3 class="text-base font-semibold text-ink flex items-center gap-2">
            <i class="fas fa-table text-accent"></i>
            Títulos Disponíveis
          </h3>
        </div>

        <div class="p-3 sm:p-4">
          <DataTable
            :columns="columns"
            :rows="store.visibleBills"
            row-key="id"
            :loading="store.isLoading"
            manual-sort
            v-model:sort-by="ordenarPor"
            v-model:sort-dir="ordenarDir"
            empty-icon="fas fa-inbox"
            empty-title="Nenhum título encontrado"
            empty-text="Ajuste os filtros e clique em 'Filtrar'.">

            <template #cell-creditor="{ row }">
              <span class="font-semibold text-ink">
                {{ row.creditor_json ? (row.creditor_json.tradeName || row.creditor_json.name || 'Sem nome') : '-' }}
              </span>
              <span v-if="row.creditor_json?.cnpj" class="block text-micro text-ink-subtle font-mono font-normal">
                CNPJ: {{ row.creditor_json.cnpj }}
              </span>
            </template>

            <template #cell-document="{ row }">
              <span class="text-ink-muted">{{ row.document_identification_id }} {{ row.document_number }}</span>
              <span class="block text-micro text-ink-subtle font-mono">#{{ row.id }}</span>
              <span v-if="row.notes" class="block text-micro text-ink-subtle truncate max-w-56" :title="row.notes">
                {{ row.notes }}
              </span>
            </template>

            <template #cell-installments="{ row }">
              <Badge v-if="row.installments_number && row.installments_number > 1"
                variant="accent" size="sm" class="font-mono">{{ row.installments_number }}x</Badge>
              <Badge v-else variant="neutral" size="sm" class="font-mono">1x</Badge>
            </template>

            <template #cell-amount="{ row }">
              <span class="font-bold text-accent font-mono tabular-nums">
                {{ Number(row.total_invoice_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
              </span>
            </template>

            <template #cell-issue_date="{ row }">
              <span class="font-mono tabular-nums">
                {{ row.issue_date ? new Date(row.issue_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-' }}
              </span>
            </template>

            <template #cell-department="{ row }">
              <Badge v-if="row.main_department_name" variant="info" size="sm">{{ row.main_department_name }}</Badge>
              <span v-else class="text-xs text-ink-subtle">-</span>
            </template>

            <template #cell-status="{ row }">
              <Badge :variant="statusBadgeVariant(row.current_status)" size="sm">
                {{ statusBadgeLabel(row.current_status) }}
              </Badge>
            </template>
          </DataTable>
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
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import DataTable from '@/components/UI/DataTable.vue';
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
/* `priority` decide a ORDEM no celular, nunca o que existe. Um titulo se
   reconhece por QUEM cobra e QUANTO: esses dois abrem o cartao, o resto vem
   no corpo e a contagem de parcelas fica a um toque. */
const columns = [
  { key: 'creditor',     label: 'Fornecedor',   priority: 1, sortable: true },
  { key: 'amount',       label: 'Valor Total',  priority: 1, sortable: true, numeric: true },
  { key: 'document',     label: 'Documento',    priority: 2, sortable: true },
  { key: 'issue_date',   label: 'Emissão',      priority: 2, sortable: true, numeric: true },
  { key: 'status',       label: 'Status',       priority: 2, sortable: true },
  { key: 'department',   label: 'Departamento', priority: 2, sortable: true },
  { key: 'installments', label: 'Parcelas',     priority: 3, sortable: true },
];

/* Quem ordena e a store (ver applySort la): os acessores desta lista tem regra
   propria. O DataTable so mostra os controles e avisa. */
const ordenarPor = computed({
  get: () => store.sortKey,
  set: (v) => store.applySort(v, store.sortDir),
});
const ordenarDir = computed({
  get: () => store.sortDir,
  set: (v) => store.applySort(store.sortKey, v),
});

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
