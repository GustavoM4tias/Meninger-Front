<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header Card -->
    <div
      class="rounded-2xl border dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg overflow-hidden">
      <div class="p-6 text-white">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold mb-2 flex items-center gap-3">
              <i class="fas fa-file-invoice-dollar"></i>
              Gerenciamento de Títulos e Custos
            </h1>
            <p class="text-indigo-50 text-sm">
              Busque títulos no Sienge — parcelas e custos gerados automaticamente por data de vencimento
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtros Card -->
    <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-6 shadow-lg">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <!-- Empreendimento -->
        <div class="md:col-span-4">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <i class="fas fa-city text-indigo-600"></i>
            Empreendimento / Centro de Custo
            <span class="text-[10px] text-gray-400 font-normal">(máx. 3)</span>
          </label>
          <MultiSelector
            :model-value="selectedCostCenterNames"
            @update:modelValue="handleCostCenterChange"
            :options="costCenterOptions"
            placeholder="Selecione empreendimentos"
            :page-size="200"
            :disabled="isSyncing" />
        </div>

        <!-- Data Inicial -->
        <div class="md:col-span-2">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <i class="fas fa-calendar-day text-indigo-600"></i>
            Data Inicial
          </label>
          <input v-model="store.startDate" type="date" :disabled="isSyncing"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>

        <!-- Data Final -->
        <div class="md:col-span-2">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <i class="fas fa-calendar-check text-indigo-600"></i>
            Data Final
          </label>
          <input v-model="store.endDate" type="date" :disabled="isSyncing"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>

        <!-- Departamentos -->
        <div class="md:col-span-2">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <i class="fas fa-sitemap text-indigo-600"></i>
            Departamento(s)
          </label>
          <MultiSelector :model-value="store.selectedDepartments"
            @update:modelValue="v => store.selectedDepartments = Array.isArray(v) ? v : []"
            :options="store.departmentsOptions" placeholder="Departamento" :page-size="200"
            :disabled="isSyncing" />
        </div>

        <!-- Botão Filtrar -->
        <div class="md:col-span-2 flex flex-col gap-2">
          <button @click="store.fetchBills"
            class="w-full px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300/50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="store.isLoading || !store.costCenterIds.length || isSyncing">
            <i class="fas fa-filter"></i>
            <span v-if="!store.isLoading">Filtrar</span>
            <span v-else>Carregando...</span>
          </button>

          <!-- Sincronizar Tudo — aparece só quando 1 empreendimento selecionado -->
          <button v-if="canSyncEnterprise"
            @click="startEnterpriseSync"
            class="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-300/50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            :disabled="isSyncing || store.isLoading">
            <i :class="isSyncing ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-download-alt'"></i>
            <span>{{ isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo' }}</span>
          </button>
        </div>
      </div>

      <!-- Aviso de range excessivo -->
      <div v-if="store.dateRangeWarning" class="mt-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 rounded-lg">
        <i class="fas fa-exclamation-triangle flex-none"></i>
        {{ store.dateRangeWarning }}
      </div>

      <p v-if="store.error" class="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
        <i class="fas fa-exclamation-circle mr-2"></i>{{ store.error }}
      </p>
    </div>

    <!-- Painel de Sync Completo -->
    <transition name="slide-down">
      <div v-if="syncStatus && syncStatus.phase !== null"
        class="rounded-2xl border shadow-lg overflow-hidden"
        :class="{
          'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20': syncStatus.phase === 'done',
          'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20': syncStatus.phase === 'error',
          'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20': syncStatus.running,
        }">
        <div class="p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- Cabeçalho do painel -->
              <div class="flex items-center gap-3 mb-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm flex-none"
                  :class="{
                    'bg-emerald-500': syncStatus.phase === 'done',
                    'bg-red-500': syncStatus.phase === 'error',
                    'bg-indigo-500': syncStatus.running,
                  }">
                  <i :class="{
                    'fas fa-check': syncStatus.phase === 'done',
                    'fas fa-times': syncStatus.phase === 'error',
                    'fas fa-sync-alt fa-spin': syncStatus.running,
                  }"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
                    Sincronização Completa do Empreendimento
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ syncPhaseLabel }}
                  </p>
                </div>
              </div>

              <!-- Barra de progresso -->
              <div v-if="syncStatus.running" class="mb-3">
                <div class="h-2 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    :style="{ width: syncProgressPct + '%' }">
                  </div>
                </div>
                <div class="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  <span>{{ syncProgressLabel }}</span>
                  <span>{{ syncProgressPct }}%</span>
                </div>
              </div>

              <!-- Resultado final (done) -->
              <div v-if="syncStatus.phase === 'done' && syncStatus.result"
                class="grid grid-cols-3 gap-3 text-center">
                <div class="bg-white/70 dark:bg-gray-800/70 rounded-lg px-3 py-2">
                  <div class="text-lg font-bold text-emerald-600">{{ syncStatus.result.total }}</div>
                  <div class="text-[10px] text-gray-500">Títulos</div>
                </div>
                <div class="bg-white/70 dark:bg-gray-800/70 rounded-lg px-3 py-2">
                  <div class="text-lg font-bold text-indigo-600">{{ syncStatus.result.missingDeps }}</div>
                  <div class="text-[10px] text-gray-500">Departamentos novos</div>
                </div>
                <div class="bg-white/70 dark:bg-gray-800/70 rounded-lg px-3 py-2">
                  <div class="text-lg font-bold text-purple-600">{{ syncStatus.result.missingInst }}</div>
                  <div class="text-[10px] text-gray-500">Parcelas novas</div>
                </div>
              </div>

              <!-- Erro -->
              <p v-if="syncStatus.phase === 'error'"
                class="text-sm text-red-700 dark:text-red-400 bg-red-100/80 dark:bg-red-900/30 px-3 py-2 rounded-lg">
                <i class="fas fa-exclamation-circle mr-2"></i>{{ syncStatus.error }}
              </p>
            </div>

            <!-- Botão fechar (só quando finalizado) -->
            <button v-if="!syncStatus.running"
              @click="syncStatus = null"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-none mt-0.5">
              <i class="fas fa-times text-base"></i>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Summary & Actions Card -->
    <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-6 shadow-lg">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="flex flex-col md:flex-row md:items-center gap-4">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white shadow-md">
              <i class="fas fa-list text-xl"></i>
            </div>
            <div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ store.visibleBills.length }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                de {{ store.bills.length }} carregados
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 shadow-lg overflow-hidden">
      <!-- Table Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i class="fas fa-table text-indigo-600"></i>
          Títulos Disponíveis
        </h3>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full table-auto">
          <thead class="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Fornecedor
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Documento
              </th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Parcelas
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Valor Total
              </th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Emissão
              </th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Departamento
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="bill in store.visibleBills" :key="bill.id"
              class="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">

              <!-- Fornecedor -->
              <td class="px-4 py-3 align-middle">
                <div class="space-y-0.5 max-w-56">
                  <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {{ bill.creditor_json ? (bill.creditor_json.tradeName || bill.creditor_json.name || 'Sem nome') : '—' }}
                  </div>
                  <div v-if="bill.creditor_json?.cnpj" class="text-[10px] text-gray-400 truncate">
                    CNPJ: {{ bill.creditor_json.cnpj }}
                  </div>
                </div>
              </td>

              <!-- Documento -->
              <td class="px-4 py-3 align-middle">
                <div class="space-y-0.5">
                  <div class="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {{ bill.document_identification_id }} {{ bill.document_number }}
                  </div>
                  <div class="text-[10px] text-gray-400">#{{ bill.id }}</div>
                  <div v-if="bill.notes" class="text-[10px] text-gray-400 truncate max-w-40" :title="bill.notes">
                    {{ bill.notes }}
                  </div>
                </div>
              </td>

              <!-- Parcelas -->
              <td class="px-4 py-3 whitespace-nowrap text-center align-middle">
                <span v-if="bill.installments_number && bill.installments_number > 1"
                  class="inline-flex items-center px-2 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-800">
                  {{ bill.installments_number }}x
                </span>
                <span v-else
                  class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full">
                  1x
                </span>
              </td>

              <!-- Valor -->
              <td class="px-4 py-3 whitespace-nowrap text-right align-middle">
                <div class="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {{ Number(bill.total_invoice_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                </div>
              </td>

              <!-- Emissão -->
              <td class="px-4 py-3 whitespace-nowrap text-center align-middle">
                <div class="text-sm text-gray-700 dark:text-gray-300">
                  {{ bill.issue_date ? new Date(bill.issue_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—' }}
                </div>
              </td>

              <!-- Departamento -->
              <td class="px-4 py-3 text-center align-middle">
                <span v-if="bill.main_department_name"
                  class="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800">
                  {{ bill.main_department_name }}
                </span>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>

            <tr v-if="!store.visibleBills.length && !store.isLoading">
              <td colspan="6" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                  <i class="fas fa-inbox text-4xl opacity-50"></i>
                  <p class="text-sm font-medium">Nenhum título encontrado</p>
                  <p class="text-xs">Ajuste os filtros e clique em "Filtrar"</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useBillsStore } from '@/stores/Financeiro/Bills/billsStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const store = useBillsStore();
const contractsStore = useContractsStore();

// ── MultiSelector de centro de custo ──────────────────────────────────────────
const selectedCostCenterNames = ref([]);

const costCenterOptions = computed(() =>
  (contractsStore.enterpriseCities || []).map(e => e.name)
);

const costCenterIdByName = computed(() => {
  const m = new Map();
  for (const e of contractsStore.enterpriseCities || []) {
    m.set(e.name, Number(e.erp_id));
  }
  return m;
});

function handleCostCenterChange(v) {
  const arr = Array.isArray(v) ? v.slice(0, 3) : [];
  selectedCostCenterNames.value = arr;
  store.costCenterIds = arr
    .map(name => costCenterIdByName.value.get(name))
    .filter(id => Number.isFinite(id));
}

// ── Sync completo de empreendimento ───────────────────────────────────────────

/** Estado do sync vindo do backend */
const syncStatus = ref(null);

/** Apenas 1 empreendimento selecionado → habilita "Sincronizar Tudo" */
const canSyncEnterprise = computed(() => store.costCenterIds.length === 1);

const isSyncing = computed(() => syncStatus.value?.running === true);

let pollTimer = null;

const syncPhaseLabels = {
  starting: 'Iniciando...',
  fetching: 'Buscando títulos no Sienge...',
  upserting: 'Salvando títulos no banco...',
  departments: 'Processando departamentos...',
  installments: 'Processando parcelas e despesas...',
  done: 'Sincronização concluída!',
  error: 'Erro durante a sincronização',
};

const syncPhaseLabel = computed(() =>
  syncPhaseLabels[syncStatus.value?.phase] || syncStatus.value?.phase || '...'
);

const syncProgressPct = computed(() => {
  const s = syncStatus.value;
  if (!s?.running) return 100;

  // Pesos por fase (estimativa visual)
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

// Para o polling quando sai da página
onUnmounted(() => stopPolling());

// Se mudar de empreendimento enquanto syncing, para o polling do anterior
watch(() => store.costCenterIds, () => {
  if (!isSyncing.value) {
    stopPolling();
    syncStatus.value = null;
  }
});

onMounted(async () => {
  try {
    await contractsStore.fetchEnterpriseCities();
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
