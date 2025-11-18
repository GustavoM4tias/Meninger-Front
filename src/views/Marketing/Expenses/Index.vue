<template>
    <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        <!-- Header -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-4 md:p-6 mt-4 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
                        Custos de MKT por Empreendimento
                    </h1>
                    <p class="text-md text-gray-600 dark:text-gray-400">
                        Consulte os gastos vinculados por centro de custo no mês de competência.
                    </p>
                </div>

                <div class="flex flex-col gap-2 items-end">
                    <label class="text-xs text-gray-500">Mês de competência</label>
                    <input type="month" v-model="store.month"
                        class="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 bg-gray-50 dark:bg-gray-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
                </div>
            </div>
        </div>

        <!-- Filtro (só mês mesmo) -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-4 shadow-sm space-y-3">
            <div class="flex justify-end">
                <button @click="store.fetchExpenses"
                    class="h-10 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60 w-full md:w-auto"
                    :disabled="store.isLoading">
                    <span v-if="!store.isLoading">Buscar custos</span>
                    <span v-else>Carregando...</span>
                </button>
            </div>

            <p v-if="store.error" class="text-sm text-red-600">
                {{ store.error }}
            </p>
        </div>

        <!-- Resumo geral -->
        <div
            class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
                <div class="text-xs text-gray-500 uppercase tracking-wide">Total de gastos no mês</div>
                <div class="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                    {{ store.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                    Mês: <span class="font-medium">{{ store.month || '-' }}</span>
                </div>
            </div>
            <div class="text-sm text-gray-500">
                {{ store.groups.length }} centro(s) de custo com lançamentos.
            </div>
        </div>

        <!-- Tabela por empreendimento (centro de custo) -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-4 shadow-sm overflow-auto">
            <table class="min-w-full text-sm">
                <thead>
                    <tr class="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                        <th class="py-2 pr-2">Centro de custo</th>
                        <th class="py-2 pr-2">Total no mês</th>
                        <th class="py-2 pr-2">Lançamentos</th>
                        <th class="py-2 pr-2"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="group in store.groups" :key="group.costCenterId"
                        class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-900/40">
                        <td class="py-2 pr-2 whitespace-nowrap">
                            <div class="font-semibold">CC {{ group.costCenterId }}</div>
                        </td>
                        <td class="py-2 pr-2 whitespace-nowrap">
                            {{ Number(group.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            }}
                        </td>
                        <td class="py-2 pr-2 whitespace-nowrap">
                            {{ group.expenses.length }}
                        </td>
                        <td class="py-2 pr-2 whitespace-nowrap text-right">
                            <button
                                class="h-8 px-3 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/70 hover:bg-gray-50"
                                @click="openDetails(group)">
                                Ver detalhes
                            </button>
                        </td>
                    </tr>

                    <tr v-if="!store.groups.length && !store.isLoading">
                        <td colspan="4" class="py-4 text-center text-gray-500 text-sm">
                            Nenhum gasto encontrado para o mês informado.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Modal de detalhes por empreendimento -->
        <div v-if="selectedGroup" class="fixed inset-0 z-[60]">
            <div class="absolute inset-0 bg-black/40" @click="closeDetails"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4 z-[61]">
                <div
                    class="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-4xl shadow-xl border dark:border-gray-700">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h3 class="font-semibold text-lg">
                                Detalhes do Centro de Custo {{ selectedGroup.costCenterId }}
                            </h3>
                            <p class="text-xs text-gray-500">
                                {{ selectedGroup.expenses.length }} lançamento(s) —
                                Total:
                                {{ Number(selectedGroup.total || 0).toLocaleString('pt-BR', {
                                    style: 'currency',
                                currency: 'BRL' }) }}
                            </p>
                        </div>
                        <button @click="closeDetails" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="max-h-[70vh] overflow-auto">
                        <table class="min-w-full text-xs">
                            <thead>
                                <tr class="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                    <th class="py-2 pr-2">Data</th>
                                    <th class="py-2 pr-2">Título</th>
                                    <th class="py-2 pr-2">Valor gasto</th>
                                    <th class="py-2 pr-2">Departamento</th>
                                    <th class="py-2 pr-2">Observação</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="exp in selectedGroup.expenses" :key="exp.id"
                                    class="border-b border-gray-100 dark:border-gray-700">
                                    <td class="py-2 pr-2 whitespace-nowrap">
                                        {{ exp.bill?.issueDate ? new
                                            Date(exp.bill.issueDate).toLocaleDateString('pt-BR') : '-' }}
                                    </td>
                                    <td class="py-2 pr-2 whitespace-nowrap">
                                        <div v-if="exp.bill">
                                            <div class="font-medium">
                                                {{ exp.bill.id }}
                                            </div>
                                            <div class="text-[11px] text-gray-500">
                                                {{ exp.bill.notes || '—' }}
                                            </div>
                                        </div>
                                        <div v-else class="text-[11px] text-gray-500">
                                            (sem vínculo de título)
                                        </div>
                                    </td>
                                    <td class="py-2 pr-2 whitespace-nowrap">
                                        {{ Number(exp.amount || 0).toLocaleString('pt-BR', {
                                            style: 'currency',
                                        currency: 'BRL' }) }}
                                    </td>
                                    <td class="py-2 pr-2 whitespace-nowrap">
                                        <div v-if="exp.bill?.mainDepartmentName"
                                            class="inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                                            {{ exp.bill.mainDepartmentName }}
                                        </div>
                                        <div v-else class="text-[11px] text-gray-500">
                                            —
                                        </div>
                                    </td>
                                    <td class="py-2 pr-2 max-w-xs">
                                        <div class="text-[11px] text-gray-700 dark:text-gray-200">
                                            {{ exp.description || '—' }}
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-4 flex justify-end">
                        <button @click="closeDetails"
                            class="h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/70 hover:bg-gray-50">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useMktExpensesStore } from '@/stores/Marketing/Expenses/expensesStore';

const store = useMktExpensesStore();

const selectedGroup = ref(null);

function openDetails(group) {
    selectedGroup.value = group;
}

function closeDetails() {
    selectedGroup.value = null;
}
</script>
