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
              Busque os títulos no Sienge, selecione e vincule ao mês de competência
            </p>
          </div>

          <div class="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[220px]">
            <label class="text-xs font-medium text-indigo-50 mb-2 flex items-center gap-2">
              <i class="far fa-calendar-alt"></i>
              Mês de Competência
            </label>
            <input type="month" v-model="store.month"
              class="w-full px-3 py-2 bg-white dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all" />
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
          <MultiSelector :model-value="selectedCostCenterNames" @update:modelValue="handleCostCenterChange"
            :options="costCenterOptions" placeholder="Selecione empreendimentos" :page-size="200" />
        </div>

        <!-- Data Inicial -->
        <div class="md:col-span-2">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <i class="fas fa-calendar-day text-indigo-600"></i>
            Data Inicial
          </label>
          <input v-model="store.startDate" type="date"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all" />
        </div>

        <!-- Data Final -->
        <div class="md:col-span-2">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <i class="fas fa-calendar-check text-indigo-600"></i>
            Data Final
          </label>
          <input v-model="store.endDate" type="date"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all" />
        </div>

        <!-- Departamentos -->
        <div class="md:col-span-2">
          <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <i class="fas fa-sitemap text-indigo-600"></i>
            Departamento(s)
          </label>
          <MultiSelector :model-value="store.selectedDepartments"
            @update:modelValue="v => store.selectedDepartments = Array.isArray(v) ? v : []"
            :options="store.departmentsOptions" placeholder="Departamento" :page-size="200" />
        </div>

        <!-- Botão Filtrar -->
        <div class="md:col-span-2">
          <button @click="store.fetchBills"
            class="w-full px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300/50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="store.isLoading || !store.costCenterIds.length">
            <i class="fas fa-filter"></i>
            <span v-if="!store.isLoading">Filtrar</span>
            <span v-else>Carregando...</span>
          </button>
        </div>
      </div>

      <p v-if="store.error" class="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
        <i class="fas fa-exclamation-circle mr-2"></i>{{ store.error }}
      </p>
    </div>

    <!-- Summary & Actions Card -->
    <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-6 shadow-lg">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- Resumo -->
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

          <div v-if="store.selectedCount"
            class="flex items-center gap-3 pl-4 border-l border-gray-300 dark:border-gray-600">
            <div
              class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-md">
              <i class="fas fa-check-circle text-xl"></i>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {{ store.selectedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ store.selectedCount }} selecionado(s)
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2">
          <!-- <button @click="store.selectAllCurrentPage"
            class="px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!store.visibleBills.length">
            <i class="far fa-check-square"></i>
            Selecionar Todos
          </button>

          <button @click="store.clearSelection"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!store.selectedCount">
            <i class="fas fa-eraser"></i>
            Limpar Seleção
          </button> -->

          <button @click="handleLink"
            class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!store.selectedCount || store.isLoading || !store.month">
            <i class="fas fa-link"></i>
            Vincular ao Mês
          </button>
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
              <th class="px-4 py-3 text-center w-10">
                <label :aria-disabled="!selectableVisibleBills.length">
                  <input type="checkbox" :checked="isAllSelectedOnPage" @change="toggleSelectAllOnPage"
                    :disabled="!selectableVisibleBills.length"
                    class="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                </label>
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Documento
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Parcelas
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Valor
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Data
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Depto. Custo
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Categoria Custo
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Observação
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="bill in store.visibleBills" :key="bill.id"
              class="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors"
              :class="{ 'bg-gray-50/50 dark:bg-gray-900/20': store.billLinks[bill.id] }">
              <!-- Checkbox -->
              <td class="px-2 py-3 text-center align-middle">
                <input type="checkbox" :checked="store.selectedIds.includes(bill.id)"
                  :disabled="!!store.billLinks[bill.id]" @change="store.toggleSelect(bill.id)"
                  class="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" />
              </td>

              <!-- Documento -->
              <td class="px-2 py-3 align-middle">
                <div class="space-y-0.5 max-w-64">
                  <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {{
                      bill.creditor_json
                        ? (bill.creditor_json.tradeName || bill.creditor_json.name || 'Sem nome')
                        : '—'
                    }}
                  </div>

                  <div v-if="bill.creditor_json" class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    CNPJ: {{ bill.creditor_json.cnpj }}
                  </div>

                  <div class="text-xs text-gray-600 dark:text-gray-300 truncate flex items-center">
                    {{ bill.document_identification_id }} {{ bill.document_number }}
                    <i v-if="store.billLinks[bill.id]"
                      v-tippy="`Já vinculado: ${store.billLinks[bill.id].count} parcela(s) <BR> Total de ${Number(store.billLinks[bill.id].total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`"
                      class="fas fa-info-circle ms-2 cursor-pointer text-green-600 dark:text-green-400"></i>
                  </div>

                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Título: {{ bill.id }}
                  </div>
                </div>
              </td>

              <!-- Parcelas -->
              <td class="px-2 py-3 whitespace-nowrap text-center align-middle relative">
                <div v-if="bill.installments_number && bill.installments_number > 1"
                  class="inline-flex relative items-center gap-1 cursor-pointer" @click="openInstallments(bill)">
                  <span
                    class="inline-flex items-center px-2 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-800">
                    {{ bill.installments_number }}x
                  </span>
                  <i
                    class="fas fa-asterisk absolute top-0 right-0 fa-xs fa-beat text-indigo-600 dark:text-indigo-400"></i>
                </div>
                <span v-else
                  class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
                  1x
                </span>
              </td>

              <!-- Valor -->
              <td class="px-2 py-3 whitespace-nowrap text-right align-middle">
                <div class="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {{
                    Number(bill.total_invoice_amount || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })
                  }}
                </div>
              </td>

              <!-- Data -->
              <td class="px-2 py-3 whitespace-nowrap text-center align-middle">
                <div class="text-sm text-gray-700 dark:text-gray-300">
                  {{ bill.issue_date ? new Date(bill.issue_date).toLocaleDateString('pt-BR') : '—' }}
                </div>
              </td>

              <!-- Departamento Custo -->
              <td class="px-2 py-3 text-center align-middle">
                <div class="inline-flex relative flex-col items-center gap-1">
                  <span v-if="bill.main_department_name"
                    class="absolute -top-6 max-w-40 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <p class="truncate">Padrão: {{ bill.main_department_name }}</p>
                  </span>

                  <select v-model="store.expenseDepartments[bill.id]"
                    class="w-40 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all">
                    <option :value="bill.main_department_name || ''">
                      {{
                        bill.main_department_name
                          ? bill.main_department_name
                          : 'Definir departamento'
                      }}
                    </option>
                    <option v-for="dep in costDepartmentsOptions" :key="dep" :value="dep">
                      {{ dep }}
                    </option>
                  </select>
                </div>
              </td>

              <!-- Categoria Custo -->
              <td class="px-2 py-3 text-center align-middle">
                <select v-model.number="store.expenseCategories[bill.id]"
                  class="w-40 my-auto px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all">
                  <option value="">(Sem categoria)</option>
                  <option v-for="cat in costCategoriesOptions" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
              </td>

              <!-- Observação -->
              <td class="px-2 py-3 text-center align-middle">
                <div class="max-w-48">
                  <input v-model="store.notes[bill.id]" type="text" placeholder="Observação extra (opcional)"
                    class="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all" />
                  <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    Original: {{ bill.notes || 'N/A' }}
                  </p>
                </div>
              </td>
            </tr>

            <tr v-if="!store.visibleBills.length && !store.isLoading">
              <td colspan="8" class="px-6 py-12 text-center">
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

    <!-- Modal de Parcelas -->
    <div v-if="previewBill" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" @click="closeInstallments"></div>

        <div
          class="relative inline-block w-full max-w-3xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-2xl rounded-2xl">
          <!-- Modal Header -->
          <div class="px-6 py-5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-b border-purple-600">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold flex items-center gap-3">
                  <i class="fas fa-calendar-alt"></i>
                  Parcelas do Título {{ previewBill.id }}
                </h3>
                <div class="flex items-center gap-4 mt-2 text-sm text-purple-50">
                  <span>
                    <i class="fas fa-dollar-sign mr-1"></i>
                    Valor Total:
                    {{
                      Number(previewBill.total_invoice_amount || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })
                    }}
                  </span>
                  <span>
                    <i class="fas fa-list-ol mr-1"></i>
                    {{ previewBill.installments_number || 1 }} parcela(s)
                  </span>
                  <span>
                    <i class="fas fa-calendar-check mr-1"></i>
                    Base: {{ store.month || '—' }}
                  </span>
                </div>
              </div>
              <button @click="closeInstallments" class="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          <!-- Modal Body -->
          <div class="px-6 py-6 max-h-[60vh] overflow-y-auto">
            <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-900/60">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Parcela
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Mês de Competência
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  <tr v-for="row in previewInstallments" :key="row.index"
                    class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span
                        class="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-800">
                        #{{ row.index }}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <i class="far fa-calendar mr-2 text-gray-400"></i>
                      {{ row.month }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right">
                      <span class="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {{ row.amount.toLocaleString('pt-BR', {
                          style: 'currency', currency:
                            'BRL'
                        }) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
            <div class="flex justify-end">
              <button @click="closeInstallments"
                class="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import dayjs from 'dayjs';

import { useBillsStore } from '@/stores/Financeiro/Bills/billsStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useAdminMetaStore } from '@/stores/Settings/Admin/metaStore';
import { useToast } from 'vue-toastification';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const adminMeta = useAdminMetaStore();
const store = useBillsStore();
const contractsStore = useContractsStore();

const previewBill = ref(null);

/**
 * Preview das parcelas (como já estava), usando installments_number do Sienge
 */
const previewInstallments = computed(() => {
  if (!previewBill.value || !store.month) return [];

  const bill = previewBill.value;
  const installments = Number(bill.installments_number || 1);
  const parts = installments > 0 ? installments : 1;

  const total = Number(bill.total_invoice_amount || 0);
  const totalCents = Math.round(total * 100);
  const basePartCents = Math.floor(totalCents / parts);
  const diffCents = totalCents - basePartCents * parts;

  const startMonth = dayjs(`${store.month}-01`);
  const rows = [];

  for (let i = 0; i < parts; i++) {
    const thisPartCents = basePartCents + (i === parts - 1 ? diffCents : 0);
    const amount = thisPartCents / 100;
    const monthLabel = startMonth.add(i, 'month').format('YYYY-MM');

    rows.push({
      index: i + 1,
      month: monthLabel,
      amount,
    });
  }

  return rows;
});

function openInstallments(bill) {
  previewBill.value = bill;
}

function closeInstallments() {
  previewBill.value = null;
}

// 🔹 MultiSelector de centro de custo (até 3 nomes)
const selectedCostCenterNames = ref([]);

const costCenterOptions = computed(() =>
  (contractsStore.enterprises || []).map(e => e.name)
);

const costCenterIdByName = computed(() => {
  const m = new Map();
  for (const e of contractsStore.enterprises || []) {
    m.set(e.name, e.id);
  }
  return m;
});

function handleCostCenterChange(v) {
  const arr = Array.isArray(v) ? v.slice(0, 3) : [];
  selectedCostCenterNames.value = arr;

  const ids = arr
    .map(name => costCenterIdByName.value.get(name))
    .filter(id => Number.isFinite(id));

  store.costCenterIds = ids;
}

const toast = (() => {
  try {
    return useToast();
  } catch {
    return { success: console.log, error: console.error };
  }
})();

async function handleLink() {
  if (!store.selectedCount || !store.month) return;

  // Formata o mês de competência (YYYY-MM → MM/YYYY)
  const monthLabel = dayjs(`${store.month}-01`).format('MM/YYYY');

  const confirmed = confirm(
    `Deseja realmente vincular ${store.selectedCount} título(s) ao mês de ${monthLabel}?`
  );

  if (!confirmed) return;

  try {
    await store.linkSelectedToMonth();
    toast.success('Títulos vinculados com sucesso!');

    // Recarrega a lista para refletir vínculos / limpar seleção etc.
    await store.fetchBills();
  } catch (e) {
    toast.error(e.message || 'Erro ao vincular títulos.');
  }
}

const costDepartmentsOptions = computed(() =>
  adminMeta.departments.filter(d => d.active).map(d => d.name)
);

// ✅ Somente os títulos visíveis e NÃO bloqueados (sem billLinks)
const selectableVisibleBills = computed(() =>
  store.visibleBills.filter(bill => !store.billLinks[bill.id])
);

// ✅ Está tudo dessa página selecionado?
const isAllSelectedOnPage = computed(() => {
  if (!selectableVisibleBills.value.length) return false;

  return selectableVisibleBills.value.every(bill =>
    store.selectedIds.includes(bill.id)
  );
});

// ✅ Selecionar / desselecionar apenas o que é selecionável nesta página
function toggleSelectAllOnPage() {
  if (!selectableVisibleBills.value.length) return;

  const idsOnPage = selectableVisibleBills.value.map(bill => bill.id);

  if (isAllSelectedOnPage.value) {
    // Desmarca só os da página
    store.selectedIds = store.selectedIds.filter(id => !idsOnPage.includes(id));
  } else {
    // Marca apenas os selecionáveis da página que ainda não estão selecionados
    const toAdd = idsOnPage.filter(id => !store.selectedIds.includes(id));
    store.selectedIds = [...store.selectedIds, ...toAdd];
  }
}

// 👇 NOVO: categorias de departamento (somente ativas)
const costCategoriesOptions = computed(() =>
  (adminMeta.departmentCategories || [])
    .filter(c => c.active)
    .map(c => ({ id: c.id, name: c.name }))
);

onMounted(async () => {
  try {
    await Promise.all([
      contractsStore.fetchEnterprises(),
      adminMeta.fetchDepartments(),
      adminMeta.fetchDepartmentCategories(),
    ]);
  } catch (e) {
    console.error('Erro ao carregar metadados:', e);
  }
});

</script>
