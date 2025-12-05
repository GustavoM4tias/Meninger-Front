<template>
    <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <!-- Header Card -->
        <div
            class="rounded-2xl border dark:border-gray-700 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg overflow-hidden">
            <div class="p-6 text-white">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold mb-2 flex items-center gap-3">
                            <i class="fas fa-building"></i>
                            Custos por Empreendimento
                        </h1>
                        <p class="text-emerald-50 text-sm">
                            Acompanhe os gastos vinculados por centro de custo no mês de competência
                        </p>
                    </div>

                    <div class="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[220px]">
                        <label class="text-xs font-medium text-emerald-50 mb-2 flex items-center gap-2">
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
                <!-- Departamentos -->
                <div class="md:col-span-3">
                    <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <i class="fas fa-sitemap text-emerald-600"></i>
                        Departamento(s)
                    </label>
                    <MultiSelector :model-value="store.selectedDepartments"
                        @update:modelValue="v => (store.selectedDepartments = Array.isArray(v) ? v : [])"
                        :options="store.departmentOptions" placeholder="Selecione departamentos" :page-size="200" />
                </div>

                <!-- Search -->
                <div class="md:col-span-3">
                    <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <i class="fas fa-search text-emerald-600"></i>
                        Buscar Centro de Custo
                    </label>
                    <input type="text" v-model="searchTerm" placeholder="Digite para filtrar..."
                        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all" />
                </div>

                <!-- Filtro por Categoria -->
                <div class="md:col-span-3">
                    <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <i class="fas fa-tags text-emerald-600"></i>
                        Categoria
                    </label>
                    <select v-model.number="categoryFilterId"
                        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all">
                        <option :value="null">(Todas as categorias)</option>
                        <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                            {{ cat.name }}
                        </option>
                    </select>
                </div>

                <!-- Botão Filtrar -->
                <div class="md:col-span-3">
                    <button @click="store.fetchExpenses"
                        class="w-full px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-300/50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        :disabled="store.isLoading">
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

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg p-6 text-white">
                <div class="text-sm font-medium opacity-90 mb-2 flex items-center gap-2">
                    <i class="fas fa-dollar-sign"></i>
                    Total de Gastos
                </div>
                <div class="text-3xl font-bold">
                    {{ filteredTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                </div>
                <div class="text-xs opacity-75 mt-2">Período selecionado</div>
            </div>

            <div class="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-6">
                <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <i class="fas fa-building text-emerald-600"></i>
                    Centros de Custo
                </div>
                <div class="text-3xl font-bold text-gray-900 dark:text-white">
                    {{ filteredGroups.length }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Com lançamentos</div>
            </div>

            <div class="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-6">
                <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <i class="fas fa-list-ul text-emerald-600"></i>
                    Total de Lançamentos
                </div>
                <div class="text-3xl font-bold text-gray-900 dark:text-white">
                    {{filteredGroups.reduce((sum, g) => sum + g.expenses.length, 0)}}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Custas registradas</div>
            </div>
        </div>

        <!-- Table Card -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 shadow-lg overflow-hidden">
            <!-- Table Header -->
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <i class="fas fa-table text-emerald-600"></i>
                        Detalhamento por Centro de Custo
                    </h3>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        {{ filteredGroups.length }} registro(s)
                    </div>
                </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th @click="handleSort('costCenterId')"
                                class="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div class="flex items-center gap-2">
                                    Centro de Custo
                                    <i :class="getSortIcon('costCenterId')"></i>
                                </div>
                            </th>
                            <th @click="handleSort('total')"
                                class="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div class="flex items-center justify-end gap-2">
                                    Total no Mês
                                    <i :class="getSortIcon('total')"></i>
                                </div>
                            </th>
                            <th
                                class="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Lançamentos
                            </th>
                            <th
                                class="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                        <template v-for="group in sortedGroups" :key="group.costCenterId">
                            <tr
                                class="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-md">
                                            <i class="fas fa-building"></i>
                                        </div>
                                        <div>
                                            <div class="text-sm font-semibold text-gray-900 dark:text-white">
                                                {{ group.costCenterName || 'CC ' + group.costCenterId }}
                                            </div>
                                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                                {{ group.expenses.length }} item(ns)
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right">
                                    <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {{
                                            Number(group.total || 0).toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                        })
                                        }}
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-center">
                                    <span
                                        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        {{ group.expenses.length }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right">
                                    <button @click="openDetails(group)"
                                        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all">
                                        <i class="fas fa-eye"></i>
                                        Ver Detalhes
                                    </button>
                                </td>
                            </tr>
                        </template>

                        <tr v-if="!filteredGroups.length && !store.isLoading">
                            <td colspan="4" class="px-6 py-12 text-center">
                                <div class="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                                    <i class="fas fa-inbox text-4xl opacity-50"></i>
                                    <p class="text-sm font-medium">Nenhum gasto encontrado</p>
                                    <p class="text-xs">Ajuste os filtros e tente novamente</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal de detalhes -->
        <div v-if="selectedGroup" class="fixed inset-0 z-50 overflow-y-auto">
            <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div class="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" @click="closeDetails">
                </div>

                <div
                    class="relative inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-2xl rounded-2xl">
                    <!-- Modal Header -->
                    <div
                        class="px-6 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-b border-emerald-600">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-2xl font-bold flex items-center gap-3">
                                    <i class="fas fa-building"></i>
                                    Centro de Custo {{ selectedGroup.costCenterId }}
                                    <span v-if="selectedGroup.costCenterName" class="text-sm text-emerald-50 block">
                                        {{ selectedGroup.costCenterName }}
                                    </span>
                                </h3>

                                <p class="text-sm text-emerald-50 mt-1">
                                    {{ selectedGroup.expenses.length }} lançamento(s) — Total:
                                    {{
                                        Number(selectedGroup.total || 0).toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                    })
                                    }}
                                </p>
                            </div>
                            <button @click="closeDetails"
                                class="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div class="px-6 py-6 max-h-[70vh] overflow-y-auto">
                        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead class="bg-gray-50 dark:bg-gray-900/60">
                                    <tr>
                                        <!-- Checkbox geral -->
                                        <th class="px-4 py-3 text-center w-10">
                                            <input type="checkbox"
                                                :checked="modalExpenses.length && selectedExpenseIds.length === modalExpenses.length"
                                                @change="toggleSelectAllExpenses"
                                                class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                        </th>

                                        <th @click="handleModalSort('date')"
                                            class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer">
                                            <div class="flex items-center gap-1">
                                                Data
                                                <i :class="getModalSortIcon('date')"></i>
                                            </div>
                                        </th>

                                        <th @click="handleModalSort('title')"
                                            class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer">
                                            <div class="flex items-center gap-1">
                                                Título
                                                <i :class="getModalSortIcon('title')"></i>
                                            </div>
                                        </th>

                                        <th @click="handleModalSort('amount')"
                                            class="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer">
                                            <div class="flex items-center justify-end gap-1">
                                                Valor
                                                <i :class="getModalSortIcon('amount')"></i>
                                            </div>
                                        </th>

                                        <th @click="handleModalSort('department')"
                                            class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer">
                                            <div class="flex items-center gap-1">
                                                Departamento
                                                <i :class="getModalSortIcon('department')"></i>
                                            </div>
                                        </th>

                                        <th @click="handleModalSort('category')"
                                            class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer">
                                            <div class="flex items-center gap-1">
                                                Categoria
                                                <i :class="getModalSortIcon('category')"></i>
                                            </div>
                                        </th>

                                        <th
                                            class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                            Observação
                                        </th>
                                        <th
                                            class="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    <tr v-for="exp in modalExpenses" :key="exp.id"
                                        class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                                        <!-- Checkbox linha -->
                                        <td class="px-4 py-3 whitespace-nowrap text-center">
                                            <input type="checkbox" :checked="selectedExpenseIds.includes(exp.id)"
                                                @change="toggleExpenseSelection(exp.id)"
                                                class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                        </td>

                                        <!-- Data -->
                                        <td
                                            class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                            {{
                                                exp.bill?.issueDate
                                                    ? new Date(exp.bill.issueDate).toLocaleDateString('pt-BR')
                                            : '—'
                                            }}
                                        </td>

                                        <!-- Título / Fornecedor -->
                                        <td class="px-4 py-3">
                                            <div v-if="exp.bill" class="max-w-[260px]">
                                                <div
                                                    class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                    {{
                                                        exp.bill.creditor_json
                                                            ? exp.bill.creditor_json.tradeName ||
                                                            exp.bill.creditor_json.name ||
                                                    'Sem nome'
                                                    : '—'
                                                    }}
                                                    <div v-if="exp.bill.creditor_json"
                                                        class="text-[10px] -my-1 text-gray-500 dark:text-gray-400 truncate">
                                                        CNPJ: {{ exp.bill.creditor_json.cnpj }}
                                                    </div>
                                                </div>

                                                <div class="text-xs text-gray-600 dark:text-gray-300 truncate">
                                                    {{ exp.bill.document_identification_id }} {{
                                                    exp.bill.document_number }}
                                                </div>

                                                <div class="text-xs text-gray-500 dark:text-gray-400">
                                                    Título: {{ exp.bill.id }}
                                                </div>
                                            </div>

                                            <div v-else class="text-xs text-gray-500 dark:text-gray-400">(sem vínculo)
                                            </div>
                                        </td>

                                        <!-- Valor -->
                                        <td class="px-4 py-3 whitespace-nowrap text-right">
                                            <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                {{
                                                    Number(exp.amount || 0).toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL'
                                                })
                                                }}
                                            </span>
                                        </td>

                                        <!-- Departamento -->
                                        <td class="px-4 py-3 whitespace-nowrap">
                                            <span v-if="exp.departmentName || exp.bill?.mainDepartmentName"
                                                class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                {{ exp.departmentName || exp.bill.mainDepartmentName }}
                                            </span>
                                            <span v-else class="text-xs text-gray-500 dark:text-gray-400">—</span>
                                        </td>

                                        <!-- Categoria -->
                                        <td class="px-4 py-3 whitespace-nowrap">
                                            <span v-if="exp.departmentCategoryName"
                                                class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                {{ exp.departmentCategoryName }}
                                            </span>
                                            <span v-else class="text-xs text-gray-500 dark:text-gray-400">—</span>
                                        </td>

                                        <!-- Observação -->
                                        <td class="px-4 py-3 max-w-48">
                                            <div class="text-xs text-gray-700 dark:text-gray-300 truncate">
                                                {{ exp.description || '—' }}
                                            </div>
                                            <div class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                {{ exp.bill?.notes || '—' }}
                                            </div>
                                        </td>

                                        <!-- Ações -->
                                        <td class="px-4 py-3 whitespace-nowrap text-right">
                                            <div class="flex items-center justify-end gap-2">
                                                <button @click="startEdit(exp)"
                                                    class="p-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button @click="removeExpense(exp)"
                                                    class="p-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center gap-3">
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                <span v-if="selectedExpenseIds.length">
                                    {{ selectedExpenseIds.length }} lançamento(s) selecionado(s)
                                </span>
                            </div>
                            <div class="flex gap-3">
                                <button @click="removeSelectedExpenses" :disabled="!selectedExpenseIds.length"
                                    class="px-5 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <i class="fas fa-trash mr-2"></i>
                                    Excluir selecionadas
                                </button>
                                <button @click="closeDetails"
                                    class="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de edição -->
        <div v-if="editingExpense" class="fixed inset-0 z-50 overflow-y-auto">
            <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div class="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" @click="cancelEdit"></div>

                <div
                    class="relative inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-2xl rounded-2xl">
                    <!-- Edit Header -->
                    <div
                        class="px-6 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-b border-blue-600">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-xl font-bold flex items-center gap-2">
                                    <i class="fas fa-edit"></i>
                                    Editar Custa #{{ editingExpense.id }}
                                </h3>
                                <p class="text-sm text-blue-50 mt-1">
                                    <span v-if="editingExpense.bill">
                                        {{ editingExpense.bill.id }} — {{ editingExpense.bill.notes || '—' }}
                                    </span>
                                    <span v-else>(sem vínculo de título)</span>
                                </p>
                            </div>
                            <button @click="cancelEdit"
                                class="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                                <i class="fas fa-times text-lg"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Edit Body -->
                    <div class="px-6 py-6 space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-dollar-sign text-emerald-600 mr-2"></i>
                                Valor Gasto
                            </label>
                            <input v-model.number="editForm.amount" type="number" step="0.01"
                                class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all" />
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-sitemap text-emerald-600 mr-2"></i>
                                Departamento
                            </label>
                            <select v-model="editForm.departmentName"
                                class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all">
                                <option value="">(Manter / não definido)</option>
                                <option v-for="dep in store.departmentOptions" :key="dep" :value="dep">
                                    {{ dep }}
                                </option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-tags text-emerald-600 mr-2"></i>
                                Categoria
                            </label>
                            <select v-model.number="editForm.departmentCategoryId"
                                class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all">
                                <option value="">(Manter / não definido)</option>
                                <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                                    {{ cat.name }}
                                </option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-comment text-emerald-600 mr-2"></i>
                                Observação
                            </label>
                            <textarea v-model="editForm.description" rows="4"
                                class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all resize-none"></textarea>
                        </div>
                    </div>

                    <!-- Edit Footer -->
                    <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
                        <div class="flex justify-end gap-3">
                            <button @click="cancelEdit"
                                class="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                Cancelar
                            </button>
                            <button @click="saveEdit"
                                class="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300/50 transition-all shadow-md">
                                <i class="fas fa-save mr-2"></i>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useExpensesStore } from '@/stores/Financeiro/Expenses/expensesStore';
import { useAdminMetaStore } from '@/stores/Settings/Admin/metaStore';
import { useToast } from 'vue-toastification';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const store = useExpensesStore();
const adminMeta = useAdminMetaStore();

const toast = (() => {
    try {
        return useToast();
    } catch {
        return { success: console.log, error: console.error };
    }
})();

const selectedGroup = ref(null);
const editingExpense = ref(null);

const editForm = ref({
    amount: 0,
    description: '',
    departmentName: '',
    departmentCategoryId: null
});

const searchTerm = ref('');
const sortConfig = ref({ key: 'total', direction: 'desc' });

const categoryFilterId = ref(null);

// categorias ativas
const categoryOptions = computed(() =>
    (adminMeta.departmentCategories || [])
        .filter(c => c.active)
        .map(c => ({ id: c.id, name: c.name }))
);

// grupos filtrados (busca + categoria)
const filteredGroups = computed(() => {
    const base = store.groups || [];
    const term = (searchTerm.value || '').toLowerCase();
    const catId = categoryFilterId.value ? Number(categoryFilterId.value) : null;

    return base
        .map(g => {
            let exps = g.expenses || [];

            if (catId) {
                exps = exps.filter(e => e.departmentCategoryId === catId);
            }

            const total = exps.reduce((sum, e) => sum + Number(e.amount || 0), 0);

            return {
                ...g,
                expenses: exps,
                total
            };
        })
        .filter(g => (g.expenses || []).length > 0)
        .filter(g => {
            if (!term) return true;
            const idMatch = g.costCenterId?.toString().includes(term);
            const nameMatch = (g.costCenterName || '').toLowerCase().includes(term);
            return idMatch || nameMatch;
        });
});

// total respeitando filtros
const filteredTotal = computed(() =>
    filteredGroups.value.reduce((sum, g) => sum + Number(g.total || 0), 0)
);

const sortedGroups = computed(() => {
    const groups = [...filteredGroups.value];
    const { key, direction } = sortConfig.value;

    groups.sort((a, b) => {
        let aVal = a[key];
        let bVal = b[key];

        if (key === 'total') {
            aVal = Number(aVal || 0);
            bVal = Number(bVal || 0);
        }

        if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
    });

    return groups;
});

function handleSort(key) {
    if (sortConfig.value.key === key) {
        sortConfig.value.direction =
            sortConfig.value.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.value = { key, direction: 'desc' };
    }
}

function getSortIcon(key) {
    if (sortConfig.value.key !== key) return 'fas fa-sort text-gray-400';
    return sortConfig.value.direction === 'asc'
        ? 'fas fa-sort-up text-emerald-600'
        : 'fas fa-sort-down text-emerald-600';
}

function openDetails(group) {
    selectedGroup.value = group;
    selectedExpenseIds.value = [];
}

function closeDetails() {
    selectedGroup.value = null;
    selectedExpenseIds.value = [];
}

function startEdit(exp) {
    editingExpense.value = exp;
    editForm.value = {
        amount: exp.amount,
        description: exp.description || '',
        departmentName: exp.departmentName || exp.bill?.mainDepartmentName || '',
        departmentCategoryId: exp.departmentCategoryId ?? null
    };
}

function cancelEdit() {
    editingExpense.value = null;
}

async function saveEdit() {
    try {
        const chosenCategoryId = editForm.value.departmentCategoryId
            ? Number(editForm.value.departmentCategoryId)
            : null;

        let chosenCategoryName = null;
        if (chosenCategoryId) {
            const found = categoryOptions.value.find(c => c.id === chosenCategoryId);
            if (found) chosenCategoryName = found.name;
        }

        await store.updateExpense(editingExpense.value.id, {
            amount: Number(editForm.value.amount),
            description: editForm.value.description,
            departmentName: editForm.value.departmentName || null,
            departmentCategoryId: chosenCategoryId,
            departmentCategoryName: chosenCategoryName
        });

        toast.success('Custa atualizada com sucesso!');
        editingExpense.value = null;

        await store.fetchExpenses();

        if (selectedGroup.value) {
            const updated = store.groups.find(
                g => g.costCenterId === selectedGroup.value.costCenterId
            );
            selectedGroup.value = updated || null;
        }
    } catch (e) {
        toast.error(e.message || 'Erro ao atualizar custa.');
    }
}

async function removeExpense(exp) {
    if (!confirm('Deseja realmente excluir esta custa?')) return;

    try {
        await store.deleteExpense(exp.id);
        toast.success('Custa excluída com sucesso!');

        await store.fetchExpenses();

        if (selectedGroup.value) {
            const updated = store.groups.find(
                g => g.costCenterId === selectedGroup.value.costCenterId
            );
            selectedGroup.value = updated || null;
            if (updated && updated.expenses.length === 0) {
                selectedGroup.value = null;
            }
        }
    } catch (e) {
        toast.error(e.message || 'Erro ao excluir custa.');
    }
}

// ====== SELEÇÃO NO MODAL ======
const selectedExpenseIds = ref([]);
const modalSort = ref({ key: 'date', direction: 'asc' });

const modalExpenses = computed(() => {
    if (!selectedGroup.value) return [];
    const list = [...(selectedGroup.value.expenses || [])];
    const { key, direction } = modalSort.value;

    list.sort((a, b) => {
        let aVal;
        let bVal;

        switch (key) {
            case 'date':
                aVal = a.bill?.issueDate || '';
                bVal = b.bill?.issueDate || '';
                break;
            case 'title':
                aVal = a.bill?.creditor_json
                    ? a.bill.creditor_json.tradeName || a.bill.creditor_json.name || ''
                    : '';
                bVal = b.bill?.creditor_json
                    ? b.bill.creditor_json.tradeName || b.bill.creditor_json.name || ''
                    : '';
                break;
            case 'amount':
                aVal = Number(a.amount || 0);
                bVal = Number(b.amount || 0);
                break;
            case 'department':
                aVal = (a.departmentName || a.bill?.mainDepartmentName || '').toLowerCase();
                bVal = (b.departmentName || b.bill?.mainDepartmentName || '').toLowerCase();
                break;
            case 'category':
                aVal = (a.departmentCategoryName || '').toLowerCase();
                bVal = (b.departmentCategoryName || '').toLowerCase();
                break;
            default:
                aVal = 0;
                bVal = 0;
        }

        if (aVal === bVal) return 0;
        if (direction === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    return list;
});

function handleModalSort(key) {
    if (modalSort.value.key === key) {
        modalSort.value.direction =
            modalSort.value.direction === 'asc' ? 'desc' : 'asc';
    } else {
        modalSort.value = { key, direction: 'asc' };
    }
}

function getModalSortIcon(key) {
    if (modalSort.value.key !== key) return 'fas fa-sort text-gray-400';
    return modalSort.value.direction === 'asc'
        ? 'fas fa-sort-up text-emerald-600'
        : 'fas fa-sort-down text-emerald-600';
}

function toggleExpenseSelection(id) {
    if (selectedExpenseIds.value.includes(id)) {
        selectedExpenseIds.value = selectedExpenseIds.value.filter(x => x !== id);
    } else {
        selectedExpenseIds.value = [...selectedExpenseIds.value, id];
    }
}

function toggleSelectAllExpenses() {
    const allIds = modalExpenses.value.map(e => e.id);
    if (selectedExpenseIds.value.length === allIds.length) {
        selectedExpenseIds.value = [];
    } else {
        selectedExpenseIds.value = allIds;
    }
}

async function removeSelectedExpenses() {
    if (!selectedExpenseIds.value.length) return;

    const confirmed = confirm(
        `Deseja realmente excluir ${selectedExpenseIds.value.length} custa(s) selecionada(s)?`
    );
    if (!confirmed) return;

    try {
        await Promise.all(selectedExpenseIds.value.map(id => store.deleteExpense(id)));

        toast.success('Custas selecionadas excluídas com sucesso!');
        selectedExpenseIds.value = [];

        await store.fetchExpenses();

        if (selectedGroup.value) {
            const updated = store.groups.find(
                g => g.costCenterId === selectedGroup.value.costCenterId
            );
            selectedGroup.value = updated || null;
            if (updated && updated.expenses.length === 0) {
                selectedGroup.value = null;
            }
        }
    } catch (e) {
        toast.error(e.message || 'Erro ao excluir custas selecionadas.');
    }
}

onMounted(async () => {
    store.selectedDepartments = ['Marketing'];
    await Promise.all([
        adminMeta.fetchDepartmentCategories(),
        store.fetchExpenses()
    ]);
});
</script>
