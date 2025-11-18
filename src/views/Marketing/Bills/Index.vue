<!-- src/views/Marketing/Bills/Index.vue -->
<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
    <!-- Header -->
    <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-4 md:p-6 mt-4 shadow-sm">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
            Vincular Títulos de MKT
          </h1>
          <p class="text-md text-gray-600 dark:text-gray-400">
            Busque os títulos no Sienge, selecione e vincule ao mês de competência.
          </p>
        </div>

        <div class="flex flex-col gap-2 items-end">
          <label class="text-xs text-gray-500">Mês de competência</label>
          <input
            type="month"
            v-model="store.month"
            class="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 bg-gray-50 dark:bg-gray-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-4 shadow-sm space-y-4">
      <div class="grid md:grid-cols-4 gap-4 items-end">
        <div>
          <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">Centro de custo</label>
          <input
            v-model="store.costCenterId"
            type="number"
            placeholder="Ex.: 80001"
            class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-gray-50 dark:bg-gray-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">Data inicial</label>
          <input
            v-model="store.startDate"
            type="date"
            class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-gray-50 dark:bg-gray-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">Data final</label>
          <input
            v-model="store.endDate"
            type="date"
            class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-gray-50 dark:bg-gray-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
        <div class="flex gap-2 justify-end">
          <button
            @click="store.fetchBills"
            class="h-10 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 w-full md:w-auto"
            :disabled="store.isLoading"
          >
            <span v-if="!store.isLoading">Buscar títulos</span>
            <span v-else>Carregando...</span>
          </button>
        </div>
      </div>

      <!-- Filtro de departamento -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="text-sm text-gray-600 dark:text-gray-300">Departamento:</label>
        <select
          v-model="store.selectedDepartment"
          class="h-11 border border-gray-300 dark:border-gray-600 rounded-lg px-2 bg-gray-50 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
        >
          <option value="Todos">Todos</option>
          <option
            v-for="dep in store.departmentsOptions"
            :key="dep"
            :value="dep"
          >
            {{ dep }}
          </option>
        </select>
        <span class="text-xs text-gray-500">
          Por padrão filtrando por "Marketing" (quando existir nos títulos).
        </span>
      </div>

      <p v-if="store.error" class="text-sm text-red-600">
        {{ store.error }}
      </p>
    </div>

    <!-- Resumo seleção -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div class="text-sm text-gray-600 dark:text-gray-300">
        <span class="font-medium">{{ store.visibleBills.length }}</span> título(s) exibido(s)
        (de {{ store.bills.length }} carregados).
        <span v-if="store.selectedCount">
          — <span class="font-medium">{{ store.selectedCount }}</span> selecionado(s),
          total selecionado:
          <span class="font-semibold">
            {{ store.selectedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
          </span>
        </span>
      </div>
      <div class="flex gap-2">
        <button
          class="h-9 px-3 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800 hover:bg-gray-50"
          @click="store.selectAllCurrentPage"
          :disabled="!store.visibleBills.length"
        >
          Selecionar todos exibidos
        </button>
        <button
          class="h-9 px-3 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800 hover:bg-gray-50"
          @click="store.clearSelection"
          :disabled="!store.selectedCount"
        >
          Limpar seleção
        </button>
        <button
          class="h-9 px-3 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          @click="handleLink"
          :disabled="!store.selectedCount || store.isLoading || !store.month"
        >
          Vincular selecionados ao mês
        </button>
      </div>
    </div>

    <!-- Tabela de títulos -->
    <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-4 shadow-sm overflow-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
            <th class="py-2 pr-2"></th>
            <th class="py-2 pr-2">Data</th>
            <th class="py-2 pr-2">Documento</th>
            <th class="py-2 pr-2">Valor</th>
            <th class="py-2 pr-2">Departamento</th>
            <th class="py-2 pr-2">Observação (extra)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="bill in store.visibleBills"
            :key="bill.id"
            class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
          >
            <td class="py-2 pr-2">
              <input
                type="checkbox"
                :checked="store.selectedIds.includes(bill.id)"
                @change="store.toggleSelect(bill.id)"
                class="accent-indigo-600"
              />
            </td>
            <td class="py-2 pr-2 whitespace-nowrap">
              {{ bill.issue_date ? new Date(bill.issue_date).toLocaleDateString('pt-BR') : '-' }}
            </td>
            <td class="py-2 pr-2 whitespace-nowrap">
              <div class="font-medium">
                {{ bill.document_identification_id }} {{ bill.document_number }}
              </div>
              <div class="text-xs text-gray-500">
                ID: {{ bill.id }}
              </div>
            </td>
            <td class="py-2 pr-2 whitespace-nowrap">
              {{ Number(bill.total_invoice_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
            </td>
            <td class="py-2 pr-2 whitespace-nowrap">
              <div
                v-if="bill.main_department_name"
                class="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-300"
              >
                {{ bill.main_department_name }}
              </div>
              <div v-else class="text-xs text-gray-500">
                —
              </div>
            </td>
            <td class="py-2 pr-2 max-w-md">
              <input
                v-model="store.notes[bill.id]"
                type="text"
                placeholder="Observação extra (opcional)"
                class="w-full h-8 border border-gray-300 dark:border-gray-600 rounded px-2 text-xs bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-1 focus:ring-indigo-400/60"
              />
              <div class="text-[11px] text-gray-500 mt-1 line-clamp-1">
                Original: {{ bill.notes || '—' }}
              </div>
            </td>
          </tr>

          <tr v-if="!store.visibleBills.length && !store.isLoading">
            <td colspan="6" class="py-4 text-center text-gray-500 text-sm">
              Nenhum título exibido. Ajuste os filtros e clique em “Buscar títulos”.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useMktBillsStore } from '@/stores/Marketing/Bills/billsStore';
import { useToast } from 'vue-toastification';

const store = useMktBillsStore();
const toast = (() => {
  try {
    return useToast();
  } catch {
    return { success: console.log, error: console.error };
  }
})();

async function handleLink() {
  try {
    await store.linkSelectedToMonth();
    toast.success('Títulos vinculados com sucesso!');
  } catch (e) {
    toast.error(e.message || 'Erro ao vincular títulos.');
  }
}
</script>
