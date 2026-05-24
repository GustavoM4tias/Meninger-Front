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
              :options="costCenterOptions" placeholder="Selecione empreendimentos" :page-size="200"
              :disabled="isSyncing" />
          </div>

          <!-- Data Inicial -->
          <div class="md:col-span-2">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-calendar-day text-accent text-[10px]"></i>
              Data Inicial
            </label>
            <Input v-model="store.startDate" type="date" :disabled="isSyncing" />
          </div>

          <!-- Data Final -->
          <div class="md:col-span-2">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-calendar-check text-accent text-[10px]"></i>
              Data Final
            </label>
            <Input v-model="store.endDate" type="date" :disabled="isSyncing" />
          </div>

          <!-- Departamentos -->
          <div class="md:col-span-2">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-sitemap text-accent text-[10px]"></i>
              Departamento(s)
            </label>
            <MultiSelector :model-value="store.selectedDepartments"
              @update:modelValue="v => store.selectedDepartments = Array.isArray(v) ? v : []"
              :options="store.departmentsOptions" placeholder="Departamento" :page-size="200" :disabled="isSyncing" />
          </div>

          <!-- Botões -->
          <div class="md:col-span-2 flex flex-col gap-2">
            <Button variant="primary" icon="fas fa-filter" block
              :loading="store.isLoading"
              :disabled="store.isLoading || !store.costCenterIds.length || isSyncing"
              @click="store.fetchBills">
              {{ store.isLoading ? 'Carregando...' : 'Filtrar' }}
            </Button>

            <!-- Sincronizar Tudo — aparece só quando 1 empreendimento selecionado -->
            <Button v-if="canSyncEnterprise"
              variant="primary"
              size="sm"
              block
              class="!bg-emerald-600 hover:!bg-emerald-700"
              :icon="isSyncing ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-arrow-down'"
              :disabled="isSyncing || store.isLoading"
              @click="startEnterpriseSync">
              {{ isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo' }}
            </Button>
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

      <!-- Painel de Sync Completo -->
      <transition name="slide-down">
        <Surface v-if="syncStatus && syncStatus.phase !== null"
          variant="raised"
          padding="md"
          class="mb-5 border-2 surface-gradient"
          :class="{
            'border-emerald-500/40 bg-emerald-500/10': syncStatus.phase === 'done',
            'border-red-500/40 bg-red-500/10': syncStatus.phase === 'error',
            'border-accent/40 bg-accent-soft': syncStatus.running,
          }">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-3">
                <div class="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0"
                  :class="{
                    'bg-emerald-500': syncStatus.phase === 'done',
                    'bg-red-500': syncStatus.phase === 'error',
                    'bg-accent': syncStatus.running,
                  }">
                  <i :class="{
                    'fas fa-check': syncStatus.phase === 'done',
                    'fas fa-times': syncStatus.phase === 'error',
                    'fas fa-arrows-rotate fa-spin': syncStatus.running,
                  }"></i>
                </div>
                <div class="min-w-0">
                  <h3 class="font-semibold text-ink text-sm">
                    Sincronização Completa do Empreendimento
                  </h3>
                  <p class="text-xs text-ink-muted">{{ syncPhaseLabel }}</p>
                </div>
              </div>

              <!-- Barra de progresso -->
              <div v-if="syncStatus.running" class="mb-3">
                <div class="h-2 bg-surface-sunken rounded-full overflow-hidden">
                  <div class="h-full bg-accent rounded-full transition-all duration-500"
                    :style="{ width: syncProgressPct + '%' }">
                  </div>
                </div>
                <div class="flex justify-between text-[11px] text-ink-muted mt-1 font-mono tabular-nums">
                  <span>{{ syncProgressLabel }}</span>
                  <span>{{ syncProgressPct }}%</span>
                </div>
              </div>

              <!-- Resultado final (done) -->
              <div v-if="syncStatus.phase === 'done' && syncStatus.result" class="grid grid-cols-3 gap-3 text-center">
                <Surface variant="raised" padding="sm">
                  <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {{ syncStatus.result.total }}
                  </div>
                  <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Títulos</div>
                </Surface>
                <Surface variant="raised" padding="sm">
                  <div class="text-lg font-bold text-accent font-mono tabular-nums">
                    {{ syncStatus.result.missingDeps }}
                  </div>
                  <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Departamentos novos</div>
                </Surface>
                <Surface variant="raised" padding="sm">
                  <div class="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                    {{ syncStatus.result.missingInst }}
                  </div>
                  <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Parcelas novas</div>
                </Surface>
              </div>

              <!-- Erro -->
              <Surface v-if="syncStatus.phase === 'error'" variant="raised" padding="sm"
                class="border-red-500/30 bg-red-500/10">
                <p class="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <i class="fas fa-circle-exclamation"></i>{{ syncStatus.error }}
                </p>
              </Surface>
            </div>

            <!-- Botão fechar (só quando finalizado) -->
            <IconButton v-if="!syncStatus.running"
              icon="fas fa-times"
              label="Fechar"
              variant="ghost"
              size="sm"
              @click="syncStatus = null" />
          </div>
        </Surface>
      </transition>

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
                <th class="px-4 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Fornecedor</th>
                <th class="px-4 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Documento</th>
                <th class="px-4 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Parcelas</th>
                <th class="px-4 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Valor Total</th>
                <th class="px-4 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Emissão</th>
                <th class="px-4 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Departamento</th>
                <th class="px-4 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useBillsStore } from '@/stores/Financeiro/Bills/billsStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useCostCenterNamesStore } from '@/stores/Financeiro/costCenterNamesStore';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

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

const costCenterOptions = computed(() =>
  (contractsStore.enterpriseCities || []).map(effectiveName)
);

const costCenterIdByName = computed(() => {
  const m = new Map();
  for (const e of contractsStore.enterpriseCities || []) {
    m.set(effectiveName(e), Number(e.erp_id));
  }
  return m;
});

function handleCostCenterChange(v) {
  const arr = Array.isArray(v) ? v : [];
  selectedCostCenterNames.value = arr;
  store.costCenterIds = arr
    .map(name => costCenterIdByName.value.get(name))
    .filter(id => Number.isFinite(id));
}

// ── Sync completo de empreendimento ───────────────────────────────────────────
const syncStatus = ref(null);
const canSyncEnterprise = computed(() => store.costCenterIds.length === 1);
const isSyncing = computed(() => syncStatus.value?.running === true);

let pollTimer = null;

const syncPhaseLabels = {
  starting:     'Iniciando...',
  fetching:     'Buscando títulos no Sienge...',
  upserting:    'Salvando títulos no banco...',
  departments:  'Processando departamentos...',
  installments: 'Processando parcelas e despesas...',
  done:         'Sincronização concluída!',
  error:        'Erro durante a sincronização',
};

const syncPhaseLabel = computed(() =>
  syncPhaseLabels[syncStatus.value?.phase] || syncStatus.value?.phase || '...'
);

const syncProgressPct = computed(() => {
  const s = syncStatus.value;
  if (!s?.running) return 100;

  if (s.phase === 'fetching') {
    if (!s.total) return 5;
    return Math.min(20, Math.round((s.fetched / s.total) * 20));
  }
  if (s.phase === 'upserting') {
    if (!s.total) return 20;
    return 20 + Math.round((s.done / s.total) * 20);
  }
  if (s.phase === 'departments') {
    if (!s.total) return 40;
    return 40 + Math.round((s.done / s.total) * 25);
  }
  if (s.phase === 'installments') {
    if (!s.total) return 65;
    return 65 + Math.round((s.done / s.total) * 34);
  }
  return 5;
});

const syncProgressLabel = computed(() => {
  const s = syncStatus.value;
  if (!s) return '';
  if (s.phase === 'fetching') return `${s.fetched ?? 0} / ${s.total ?? '?'} títulos`;
  if (s.phase === 'upserting') return `${s.done ?? 0} / ${s.total ?? '?'} salvos`;
  if (s.phase === 'departments') return `${s.done ?? 0} / ${s.total ?? '?'} departamentos`;
  if (s.phase === 'installments') return `${s.done ?? 0} / ${s.total ?? '?'} parcelas`;
  return '';
});

async function pollSyncStatus() {
  const costCenterId = store.costCenterIds[0];
  if (!costCenterId) return;

  try {
    const data = await requestWithAuth(
      `${API_URL}/sienge/bills/sync-enterprise/status/${costCenterId}`
    );
    syncStatus.value = data;

    if (!data.running) {
      stopPolling();
    }
  } catch (err) {
    console.warn('[Títulos] Falha ao consultar status do sync:', err.message);
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollSyncStatus, 2500);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function startEnterpriseSync() {
  const costCenterId = store.costCenterIds[0];
  if (!costCenterId) return;

  try {
    syncStatus.value = {
      running: true,
      phase: 'starting',
      fetched: 0,
      total: null,
      done: 0,
    };

    await requestWithAuth(`${API_URL}/sienge/bills/sync-enterprise`, {
      method: 'POST',
      body: JSON.stringify({ costCenterId }),
    });

    startPolling();
  } catch (err) {
    syncStatus.value = {
      running: false,
      phase: 'error',
      error: err.message,
    };
  }
}

onUnmounted(() => stopPolling());

watch(() => store.costCenterIds, () => {
  if (!isSyncing.value) {
    stopPolling();
    syncStatus.value = null;
  }
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
