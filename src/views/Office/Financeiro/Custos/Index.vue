<template>
    <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <!-- Header Card -->
        <div class="rounded-2xl border dark:border-gray-700 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg overflow-hidden">
            <div class="p-6 text-white">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold mb-2 flex items-center gap-3">
                            <i class="fas fa-building"></i>
                            Custos por Empreendimento
                        </h1>
                        <p class="text-emerald-50 text-sm">
                            Acompanhe os gastos por centro de custo no período selecionado
                        </p>
                    </div>

                    <div class="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex gap-3">
                        <div class="flex-1">
                            <label class="text-xs font-medium text-emerald-50 mb-1 flex items-center gap-1">
                                <i class="far fa-calendar-alt"></i> De
                            </label>
                            <input type="date" v-model="store.startDate"
                                class="w-full px-3 py-2 bg-white dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all" />
                        </div>
                        <div class="flex-1">
                            <label class="text-xs font-medium text-emerald-50 mb-1 flex items-center gap-1">
                                <i class="far fa-calendar-alt"></i> Até
                            </label>
                            <input type="date" v-model="store.endDate"
                                class="w-full px-3 py-2 bg-white dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filtros Card -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-6 shadow-lg">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <!-- Empreendimento -->
                <div class="md:col-span-3">
                    <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <i class="fas fa-city text-emerald-600"></i>
                        Empreendimento
                    </label>
                    <MultiSelector :model-value="selectedEnterpriseNames"
                        @update:modelValue="handleEnterpriseChange"
                        :options="enterpriseOptions" placeholder="Todos os empreendimentos" :page-size="200" />
                </div>

                <!-- Departamentos -->
                <div class="md:col-span-3">
                    <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <i class="fas fa-sitemap text-emerald-600"></i>
                        Departamento(s)
                    </label>
                    <MultiSelector :model-value="store.selectedDepartments"
                        @update:modelValue="v => (store.selectedDepartments = Array.isArray(v) ? v : [])"
                        :options="store.departmentOptions" placeholder="Todos os departamentos" :page-size="200" />
                </div>

                <!-- Categoria -->
                <div class="md:col-span-3">
                    <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <i class="fas fa-tags text-emerald-600"></i>
                        Categoria
                    </label>
                    <select v-model.number="categoryFilterId"
                        class="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all">
                        <option :value="null">(Todas)</option>
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
                    <i class="fas fa-dollar-sign"></i> Total de Gastos
                </div>
                <div class="text-3xl font-bold">
                    {{ filteredTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                </div>
                <div class="text-xs opacity-75 mt-2">Período selecionado</div>
            </div>

            <div class="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-6">
                <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <i class="fas fa-building text-emerald-600"></i> Empreendimentos
                </div>
                <div class="text-3xl font-bold text-gray-900 dark:text-white">{{ filteredGroups.length }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Com lançamentos</div>
            </div>

            <div class="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-6">
                <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <i class="fas fa-list-ul text-emerald-600"></i> Total de Lançamentos
                </div>
                <div class="text-3xl font-bold text-gray-900 dark:text-white">
                    {{ filteredGroups.reduce((sum, g) => sum + g.expenses.length, 0) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Custos registrados</div>
            </div>
        </div>

        <!-- Table Card -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 shadow-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <i class="fas fa-table text-emerald-600"></i>
                        Detalhamento por Empreendimento
                    </h3>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ filteredGroups.length }} empreendimento(s)</div>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th @click="handleSort('name')"
                                class="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div class="flex items-center gap-2">
                                    Empreendimento <i :class="getSortIcon('name')"></i>
                                </div>
                            </th>
                            <th @click="handleSort('total')"
                                class="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div class="flex items-center justify-end gap-2">
                                    Total <i :class="getSortIcon('total')"></i>
                                </div>
                            </th>
                            <th class="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Lançamentos
                            </th>
                            <th class="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                        <template v-for="group in sortedGroups" :key="group.costCenterId">
                            <tr class="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-md">
                                            <i class="fas fa-building"></i>
                                        </div>
                                        <div>
                                            <div class="text-sm font-semibold text-gray-900 dark:text-white">
                                                {{ resolveEnterpriseName(group.costCenterId) || group.costCenterName || '—' }}
                                            </div>
                                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                                CC {{ group.costCenterId }} · {{ group.expenses.length }} item(ns)
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right">
                                    <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        {{ Number(group.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-center">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        {{ group.expenses.length }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right">
                                    <button @click="openDetails(group)"
                                        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all">
                                        <i class="fas fa-eye"></i> Ver Detalhes
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

        <!-- ═══════════════════════════════════════════════════════════
             MODAL DE DETALHES
        ════════════════════════════════════════════════════════════ -->
        <Teleport to="body">
        <div v-if="selectedGroup" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" @click="closeDetails"></div>

            <!-- Panel -->
            <div class="relative w-full max-w-7xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style="max-height: calc(100vh - 4rem)">

                <!-- ── Header ── -->
                <div class="flex-none bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-white">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <h3 class="text-xl font-bold flex items-center gap-2">
                                <i class="fas fa-building"></i>
                                {{ resolveEnterpriseName(selectedGroup.costCenterId) || selectedGroup.costCenterName || 'Empreendimento' }}
                            </h3>
                            <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-emerald-50">
                                <span><i class="fas fa-hashtag text-xs mr-1"></i>CC {{ selectedGroup.costCenterId }}</span>
                                <span class="opacity-50">|</span>
                                <span><i class="fas fa-list-ul text-xs mr-1"></i>{{ modalExpenses.length }} de {{ selectedGroup.expenses.length }} lançamento(s)</span>
                                <span class="opacity-50">|</span>
                                <span class="font-semibold text-white">
                                    <i class="fas fa-dollar-sign text-xs mr-1"></i>
                                    {{ modalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                                </span>
                            </div>
                        </div>
                        <button @click="closeDetails" class="flex-none p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                            <i class="fas fa-times text-lg"></i>
                        </button>
                    </div>
                </div>

                <!-- ── Toolbar: busca + filtros ── -->
                <div class="flex-none border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-6 py-4 space-y-3">

                    <!-- Linha 1: busca + departamento + categoria + sem-categoria + limpar -->
                    <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                        <!-- Busca livre -->
                        <div class="flex-1 min-w-0">
                            <div class="relative">
                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                                <input v-model="modalSearch" type="text" placeholder="Buscar por fornecedor, documento, CNPJ, observação..."
                                    class="w-full pl-9 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all" />
                                <button v-if="modalSearch" @click="modalSearch = ''" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                    <i class="fas fa-times-circle"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Departamento -->
                        <div class="w-full md:w-44">
                            <select v-model="modalFilterDept"
                                class="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all">
                                <option value="">Todos departamentos</option>
                                <option v-for="d in modalDeptOptions" :key="d" :value="d">{{ d }}</option>
                            </select>
                        </div>

                        <!-- Categoria -->
                        <div class="w-full md:w-44">
                            <select v-model.number="modalFilterCat"
                                class="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all">
                                <option :value="null">Todas categorias</option>
                                <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                            </select>
                        </div>

                        <!-- Sem categoria -->
                        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer select-none px-1">
                            <input type="checkbox" v-model="modalFilterNoCat"
                                class="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600" />
                            Sem categoria
                        </label>

                        <!-- Limpar todos -->
                        <button v-if="hasModalFilters"
                            @click="clearModalFilters"
                            class="flex-none px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
                            <i class="fas fa-times mr-1"></i> Limpar
                        </button>
                    </div>

                    <!-- Linha 2: filtro de data (vencimento) -->
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                            <i class="fas fa-calendar-alt text-emerald-600"></i>
                            Vencimento entre
                        </span>
                        <div class="flex items-center gap-2 flex-1">
                            <input type="date" v-model="modalFilterDateFrom"
                                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all" />
                            <span class="text-gray-400 text-sm">até</span>
                            <input type="date" v-model="modalFilterDateTo"
                                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all" />
                            <button v-if="modalFilterDateFrom || modalFilterDateTo"
                                @click="modalFilterDateFrom = ''; modalFilterDateTo = ''"
                                class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Limpar datas">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        </div>

                        <!-- Chips de atalho rápido -->
                        <div class="flex items-center gap-1.5">
                            <button @click="setModalDatePreset('this-month')"
                                class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
                                :class="modalDatePreset === 'this-month'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                                Este mês
                            </button>
                            <button @click="setModalDatePreset('last-month')"
                                class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
                                :class="modalDatePreset === 'last-month'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                                Mês anterior
                            </button>
                            <button @click="setModalDatePreset('quarter')"
                                class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
                                :class="modalDatePreset === 'quarter'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                                Trimestre
                            </button>
                            <button @click="setModalDatePreset('all')"
                                class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
                                :class="modalDatePreset === 'all'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                                Todos
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ── Bulk action bar (aparece quando há seleção) ── -->
                <transition name="slide-down">
                <div v-if="selectedExpenseIds.length" class="flex-none bg-emerald-600 text-white px-6 py-3">
                    <div class="flex flex-wrap items-center gap-3">
                        <span class="text-sm font-semibold">
                            <i class="fas fa-check-square mr-1"></i>
                            {{ selectedExpenseIds.length }} selecionado(s)
                        </span>
                        <span class="opacity-40">|</span>

                        <!-- Bulk: aplicar categoria -->
                        <div class="flex items-center gap-2">
                            <select v-model.number="bulkCategoryId"
                                class="px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50">
                                <option :value="null" class="text-gray-800">Aplicar categoria...</option>
                                <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id" class="text-gray-800">{{ cat.name }}</option>
                            </select>
                            <button @click="applyBulkCategory" :disabled="bulkCategoryId === null"
                                class="px-3 py-1.5 bg-white text-emerald-700 font-semibold rounded-lg text-sm hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                <i class="fas fa-tag mr-1"></i> Aplicar
                            </button>
                        </div>

                        <!-- Bulk: aplicar departamento -->
                        <div class="flex items-center gap-2">
                            <select v-model="bulkDepartment"
                                class="px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50">
                                <option value="" class="text-gray-800">Aplicar departamento...</option>
                                <option v-for="d in store.departmentOptions" :key="d" :value="d" class="text-gray-800">{{ d }}</option>
                            </select>
                            <button @click="applyBulkDepartment" :disabled="!bulkDepartment"
                                class="px-3 py-1.5 bg-white text-emerald-700 font-semibold rounded-lg text-sm hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                <i class="fas fa-sitemap mr-1"></i> Aplicar
                            </button>
                        </div>

                        <span class="opacity-40">|</span>

                        <!-- Bulk: excluir -->
                        <button @click="removeSelectedExpenses"
                            class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm transition-colors">
                            <i class="fas fa-trash mr-1"></i> Excluir selecionados
                        </button>

                        <!-- Desmarcar -->
                        <button @click="selectedExpenseIds = []"
                            class="ml-auto px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors">
                            <i class="fas fa-times mr-1"></i> Desmarcar
                        </button>
                    </div>
                </div>
                </transition>

                <!-- ── Tabela ── -->
                <div class="flex-1 overflow-auto">
                    <table class="min-w-full text-sm">
                        <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th class="px-4 py-3 w-10">
                                    <input type="checkbox"
                                        :checked="modalExpenses.length > 0 && selectedExpenseIds.length === modalExpenses.length"
                                        :indeterminate="selectedExpenseIds.length > 0 && selectedExpenseIds.length < modalExpenses.length"
                                        @change="toggleSelectAllExpenses"
                                        class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer" />
                                </th>
                                <th @click="handleModalSort('date')" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white whitespace-nowrap">
                                    <span class="flex items-center gap-1">Vencimento <i :class="getModalSortIcon('date')"></i></span>
                                </th>
                                <th @click="handleModalSort('title')" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white">
                                    <span class="flex items-center gap-1">Fornecedor / Título <i :class="getModalSortIcon('title')"></i></span>
                                </th>
                                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Parcela</th>
                                <th @click="handleModalSort('amount')" class="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white whitespace-nowrap">
                                    <span class="flex items-center justify-end gap-1">Valor <i :class="getModalSortIcon('amount')"></i></span>
                                </th>
                                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">V. Título</th>
                                <th @click="handleModalSort('department')" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white">
                                    <span class="flex items-center gap-1">Departamento <i :class="getModalSortIcon('department')"></i></span>
                                </th>
                                <th @click="handleModalSort('category')" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white">
                                    <span class="flex items-center gap-1">Categoria <i :class="getModalSortIcon('category')"></i></span>
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider min-w-[80px]">Observação</th>
                                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-900">
                            <tr v-for="exp in modalExpenses" :key="exp.id"
                                class="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10 transition-colors group"
                                :class="{ 'bg-emerald-50/80 dark:bg-emerald-900/20': selectedExpenseIds.includes(exp.id) }">

                                <!-- Checkbox -->
                                <td class="px-4 py-3">
                                    <input type="checkbox" :checked="selectedExpenseIds.includes(exp.id)"
                                        @change="toggleExpenseSelection(exp.id)"
                                        class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer" />
                                </td>

                                <!-- Vencimento -->
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <div class="font-medium text-gray-800 dark:text-gray-200">
                                        {{ formatDate(exp.dueDate) }}
                                    </div>
                                    <div class="text-[10px] text-gray-400 mt-0.5">
                                        Competência: {{ formatMonth(exp.competenceMonth) }}
                                    </div>
                                    <div v-if="exp.bill?.issueDate" class="text-[10px] text-gray-400">
                                        Emissão: {{ formatDate(exp.bill.issueDate) }}
                                    </div>
                                </td>

                                <!-- Fornecedor / Título -->
                                <td class="px-4 py-3 max-w-[240px]">
                                    <div v-if="exp.bill">
                                        <div class="font-semibold text-gray-900 dark:text-white truncate" :title="exp.bill.creditor_json?.tradeName || exp.bill.creditor_json?.name">
                                            {{ exp.bill.creditor_json?.tradeName || exp.bill.creditor_json?.name || '—' }}
                                        </div>
                                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {{ exp.bill.document_identification_id }} {{ exp.bill.document_number }}
                                            <span class="text-gray-400">· #{{ exp.bill.id }}</span>
                                        </div>
                                        <div v-if="exp.bill.creditor_json?.cnpj" class="text-[10px] text-gray-400">
                                            CNPJ: {{ exp.bill.creditor_json.cnpj }}
                                        </div>
                                        <div v-if="exp.bill.notes" class="text-[10px] text-gray-400 truncate mt-0.5" :title="exp.bill.notes">
                                            <i class="fas fa-sticky-note mr-1"></i>{{ exp.bill.notes }}
                                        </div>
                                    </div>
                                    <div v-else class="text-xs text-gray-400 italic">sem vínculo</div>
                                </td>

                                <!-- Parcela -->
                                <td class="px-4 py-3 text-center whitespace-nowrap">
                                    <!-- Parcelado: badge roxa destacada -->
                                    <span v-if="exp.installmentsNumber > 1"
                                        class="inline-flex items-center gap-0.5 px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-sm">
                                        <i class="fas fa-layer-group text-[9px] mr-0.5 opacity-70"></i>
                                        {{ exp.installmentNumber }}/{{ exp.installmentsNumber }}
                                    </span>
                                    <!-- À vista: badge cinza discreta -->
                                    <span v-else
                                        class="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                        1/1
                                    </span>
                                </td>

                                <!-- Valor parcela -->
                                <td class="px-4 py-3 whitespace-nowrap text-right">
                                    <span class="font-bold text-emerald-600 dark:text-emerald-400">
                                        {{ Number(exp.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                                    </span>
                                </td>

                                <!-- Valor total título -->
                                <td class="px-4 py-3 whitespace-nowrap text-right text-xs text-gray-500 dark:text-gray-400">
                                    <span v-if="exp.bill?.totalInvoiceAmount">
                                        {{ Number(exp.bill.totalInvoiceAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                                    </span>
                                    <span v-else>—</span>
                                </td>

                                <!-- Departamento -->
                                <td class="px-4 py-3 max-w-20 whitespace-nowrap">
                                    <span v-if="exp.departmentName || exp.bill?.mainDepartmentName"
                                        class="inline-flex w-full items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        <p class="truncate">{{ exp.departmentName || exp.bill?.mainDepartmentName }}</p>
                                    </span>
                                    <span v-else class="text-xs text-gray-400">—</span>
                                </td>

                                <!-- Categoria -->
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <span v-if="exp.departmentCategoryName"
                                        class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        {{ exp.departmentCategoryName }}
                                    </span>
                                    <span v-else
                                        class="inline-flex items-center px-2 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full border border-dashed border-gray-300 dark:border-gray-600">
                                        sem categoria
                                    </span>
                                </td>

                                <!-- Observação -->
                                <td class="px-4 py-3">
                                    <div v-if="exp.description" class="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[80px]" :title="exp.description">
                                        {{ exp.description }}
                                    </div>
                                    <span v-else class="text-xs text-gray-400 italic">—</span>
                                </td>

                                <!-- Ações -->
                                <td class="px-4 py-3 whitespace-nowrap text-center">
                                    <div class="flex items-center justify-end gap-1">
                                        <button @click="openEditModal(exp)"
                                            class="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition-colors"
                                            title="Editar">
                                            <i class="fas fa-pen text-xs"></i>
                                        </button>
                                        <button @click="removeExpense(exp)"
                                            class="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
                                            title="Excluir">
                                            <i class="fas fa-trash text-xs"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>

                            <!-- Empty state -->
                            <tr v-if="!modalExpenses.length">
                                <td colspan="10" class="px-6 py-12 text-center">
                                    <div class="flex flex-col items-center gap-3 text-gray-400">
                                        <i class="fas fa-search text-3xl opacity-50"></i>
                                        <p class="text-sm font-medium">Nenhum lançamento encontrado</p>
                                        <p class="text-xs">Ajuste os filtros de busca acima</p>
                                        <button @click="clearModalFilters" class="text-xs text-emerald-600 hover:underline">
                                            Limpar filtros
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- ── Footer ── -->
                <div class="flex-none px-6 py-4 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between gap-3">
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            Mostrando {{ modalExpenses.length }} de {{ selectedGroup.expenses.length }} lançamentos ·
                            Total filtrado: <span class="font-semibold text-emerald-600">{{ modalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</span>
                        </div>
                        <button @click="closeDetails"
                            class="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </Teleport>

        <!-- ═══════════════════════════════════════════════════════════
             MODAL DE EDIÇÃO (sub-modal)
        ════════════════════════════════════════════════════════════ -->
        <Teleport to="body">
        <div v-if="editingExpense" class="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" @click="closeEditModal"></div>

            <!-- Card -->
            <div class="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                <!-- Header -->
                <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-lg font-bold flex items-center gap-2">
                                <i class="fas fa-pen"></i>
                                Editar Lançamento
                            </h4>
                            <p class="text-sm text-blue-100 mt-0.5">
                                {{ editingExpense.bill?.creditor_json?.tradeName || editingExpense.bill?.creditor_json?.name || editingExpense.description || '#' + editingExpense.id }}
                            </p>
                        </div>
                        <button @click="closeEditModal" class="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Info readonly -->
                <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <div class="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <div>
                            <span class="font-semibold text-gray-700 dark:text-gray-300 block mb-0.5">Vencimento</span>
                            {{ formatDate(editingExpense.dueDate) }}
                            <span class="text-gray-400 block">Competência: {{ formatMonth(editingExpense.competenceMonth) }}</span>
                        </div>
                        <div>
                            <span class="font-semibold text-gray-700 dark:text-gray-300 block mb-0.5">Parcela</span>
                            <span v-if="editingExpense.installmentsNumber > 1">
                                {{ editingExpense.installmentNumber }}/{{ editingExpense.installmentsNumber }}
                            </span>
                            <span v-else>—</span>
                        </div>
                        <div>
                            <span class="font-semibold text-gray-700 dark:text-gray-300 block mb-0.5">Documento</span>
                            {{ editingExpense.bill?.document_identification_id }} {{ editingExpense.bill?.document_number || '—' }}
                        </div>
                        <div>
                            <span class="font-semibold text-gray-700 dark:text-gray-300 block mb-0.5">V. Título</span>
                            {{ editingExpense.bill?.totalInvoiceAmount
                                ? Number(editingExpense.bill.totalInvoiceAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                : '—' }}
                        </div>
                    </div>
                </div>

                <!-- Formulário -->
                <div class="px-6 py-5 space-y-4">
                    <!-- Valor -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            <i class="fas fa-dollar-sign text-emerald-600 mr-1.5"></i> Valor da Parcela
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">R$</span>
                            <input v-model.number="editForm.amount" type="number" step="0.01" min="0"
                                class="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all" />
                        </div>
                    </div>

                    <!-- Departamento -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            <i class="fas fa-sitemap text-blue-600 mr-1.5"></i> Departamento
                        </label>
                        <select v-model="editForm.departmentName"
                            class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all">
                            <option value="">(sem departamento)</option>
                            <option v-for="dep in store.departmentOptions" :key="dep" :value="dep">{{ dep }}</option>
                        </select>
                    </div>

                    <!-- Categoria -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            <i class="fas fa-tag text-amber-600 mr-1.5"></i> Categoria
                        </label>
                        <select v-model.number="editForm.departmentCategoryId"
                            class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all">
                            <option :value="null">(sem categoria)</option>
                            <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                        </select>
                    </div>

                    <!-- Observação -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            <i class="fas fa-sticky-note text-indigo-600 mr-1.5"></i> Observação
                        </label>
                        <textarea v-model="editForm.description" rows="3"
                            placeholder="Digite uma observação sobre este lançamento..."
                            class="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition-all"></textarea>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button @click="closeEditModal"
                        class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        Cancelar
                    </button>
                    <button @click="saveEdit" :disabled="editSaving"
                        class="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                        <i v-if="editSaving" class="fas fa-spinner fa-spin"></i>
                        <i v-else class="fas fa-check"></i>
                        {{ editSaving ? 'Salvando...' : 'Salvar alterações' }}
                    </button>
                </div>
            </div>
        </div>
        </Teleport>

    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useExpensesStore } from '@/stores/Financeiro/Expenses/expensesStore';
import { useAdminMetaStore } from '@/stores/Settings/Admin/metaStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useToast } from 'vue-toastification';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const store = useExpensesStore();
const adminMeta = useAdminMetaStore();
const contractsStore = useContractsStore();

const toast = (() => {
    try { return useToast(); }
    catch { return { success: console.log, error: console.error }; }
})();

// ── Empreendimento filter ─────────────────────────────────
const selectedEnterpriseNames = ref([]);

const enterpriseOptions = computed(() =>
    (contractsStore.enterpriseCities || []).map(e => e.name)
);

const enterpriseIdByName = computed(() => {
    const m = new Map();
    for (const e of contractsStore.enterpriseCities || []) {
        m.set(e.name, Number(e.erp_id));
    }
    return m;
});

const enterpriseNameById = computed(() => {
    const m = new Map();
    for (const e of contractsStore.enterpriseCities || []) {
        m.set(Number(e.erp_id), e.name);
    }
    return m;
});

function resolveEnterpriseName(costCenterId) {
    return enterpriseNameById.value.get(Number(costCenterId)) || null;
}

function handleEnterpriseChange(v) {
    selectedEnterpriseNames.value = Array.isArray(v) ? v : [];
}

const selectedEnterpriseIds = computed(() =>
    selectedEnterpriseNames.value
        .map(name => enterpriseIdByName.value.get(name))
        .filter(Boolean)
);

// ── Categoria filter (página principal) ──────────────────
const categoryFilterId = ref(null);
const sortConfig = ref({ key: 'total', direction: 'desc' });

const categoryOptions = computed(() =>
    (adminMeta.departmentCategories || []).filter(c => c.active).map(c => ({ id: c.id, name: c.name }))
);

// ── Grupos filtrados (página principal) ──────────────────
const filteredGroups = computed(() => {
    const base = store.groups || [];
    const catId = categoryFilterId.value ? Number(categoryFilterId.value) : null;
    const selIds = selectedEnterpriseIds.value;

    return base
        .map(g => {
            let exps = g.expenses || [];
            if (catId) exps = exps.filter(e => e.departmentCategoryId === catId);
            const total = exps.reduce((sum, e) => sum + Number(e.amount || 0), 0);
            return { ...g, expenses: exps, total };
        })
        .filter(g => g.expenses.length > 0)
        .filter(g => !selIds.length || selIds.includes(Number(g.costCenterId)));
});

const filteredTotal = computed(() =>
    filteredGroups.value.reduce((sum, g) => sum + Number(g.total || 0), 0)
);

const sortedGroups = computed(() => {
    const groups = [...filteredGroups.value];
    const { key, direction } = sortConfig.value;

    groups.sort((a, b) => {
        let aVal = key === 'total' ? Number(a.total || 0)
            : key === 'name' ? (resolveEnterpriseName(a.costCenterId) || a.costCenterName || '').toLowerCase()
            : a[key];
        let bVal = key === 'total' ? Number(b.total || 0)
            : key === 'name' ? (resolveEnterpriseName(b.costCenterId) || b.costCenterName || '').toLowerCase()
            : b[key];
        if (direction === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    return groups;
});

function handleSort(key) {
    if (sortConfig.value.key === key) {
        sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.value = { key, direction: 'desc' };
    }
}

function getSortIcon(key) {
    if (sortConfig.value.key !== key) return 'fas fa-sort text-gray-400';
    return sortConfig.value.direction === 'asc' ? 'fas fa-sort-up text-emerald-600' : 'fas fa-sort-down text-emerald-600';
}

// ── Modal de detalhes ─────────────────────────────────────
const selectedGroup = ref(null);
const selectedExpenseIds = ref([]);
const modalSort = ref({ key: 'date', direction: 'asc' });

// Filtros do modal
const modalSearch = ref('');
const modalFilterDept = ref('');
const modalFilterCat = ref(null);
const modalFilterNoCat = ref(false);
const modalFilterDateFrom = ref('');
const modalFilterDateTo = ref('');
const modalDatePreset = ref('all');

const hasModalFilters = computed(() =>
    !!(modalSearch.value || modalFilterDept.value || modalFilterCat.value
        || modalFilterNoCat.value || modalFilterDateFrom.value || modalFilterDateTo.value)
);

// Bulk actions
const bulkCategoryId = ref(null);
const bulkDepartment = ref('');

const modalDeptOptions = computed(() => {
    if (!selectedGroup.value) return [];
    const set = new Set();
    for (const exp of selectedGroup.value.expenses || []) {
        const d = exp.departmentName || exp.bill?.mainDepartmentName;
        if (d) set.add(d);
    }
    return Array.from(set).sort();
});

function clearModalFilters() {
    modalSearch.value = '';
    modalFilterDept.value = '';
    modalFilterCat.value = null;
    modalFilterNoCat.value = false;
    modalFilterDateFrom.value = '';
    modalFilterDateTo.value = '';
    modalDatePreset.value = 'all';
}

function setModalDatePreset(preset) {
    modalDatePreset.value = preset;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'this-month') {
        modalFilterDateFrom.value = new Date(y, m, 1).toISOString().slice(0, 10);
        modalFilterDateTo.value = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    } else if (preset === 'last-month') {
        modalFilterDateFrom.value = new Date(y, m - 1, 1).toISOString().slice(0, 10);
        modalFilterDateTo.value = new Date(y, m, 0).toISOString().slice(0, 10);
    } else if (preset === 'quarter') {
        modalFilterDateFrom.value = new Date(y, m - 2, 1).toISOString().slice(0, 10);
        modalFilterDateTo.value = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    } else {
        modalFilterDateFrom.value = '';
        modalFilterDateTo.value = '';
    }
}

const modalExpenses = computed(() => {
    if (!selectedGroup.value) return [];
    let list = [...(selectedGroup.value.expenses || [])];

    // Busca livre
    const q = modalSearch.value.trim().toLowerCase();
    if (q) {
        list = list.filter(exp => {
            const name = (exp.bill?.creditor_json?.tradeName || exp.bill?.creditor_json?.name || '').toLowerCase();
            const doc = `${exp.bill?.document_identification_id || ''} ${exp.bill?.document_number || ''}`.toLowerCase();
            const obs = (exp.description || '').toLowerCase();
            const notes = (exp.bill?.notes || '').toLowerCase();
            const cnpj = (exp.bill?.creditor_json?.cnpj || '').toLowerCase();
            const dept = (exp.departmentName || exp.bill?.mainDepartmentName || '').toLowerCase();
            const cat = (exp.departmentCategoryName || '').toLowerCase();
            const billId = String(exp.bill?.id || '');
            const amount = String(exp.amount || '');
            return name.includes(q) || doc.includes(q) || obs.includes(q) || notes.includes(q)
                || cnpj.includes(q) || dept.includes(q) || cat.includes(q) || billId.includes(q) || amount.includes(q);
        });
    }

    // Filtro departamento
    if (modalFilterDept.value) {
        const d = modalFilterDept.value.toLowerCase();
        list = list.filter(exp =>
            (exp.departmentName || exp.bill?.mainDepartmentName || '').toLowerCase() === d
        );
    }

    // Filtro categoria
    if (modalFilterCat.value) {
        list = list.filter(exp => exp.departmentCategoryId === Number(modalFilterCat.value));
    }

    // Apenas sem categoria
    if (modalFilterNoCat.value) {
        list = list.filter(exp => !exp.departmentCategoryId && !exp.departmentCategoryName);
    }

    // Filtro de data (vencimento)
    if (modalFilterDateFrom.value) {
        list = list.filter(exp => {
            const d = exp.dueDate || exp.competenceMonth;
            return d && d >= modalFilterDateFrom.value;
        });
    }
    if (modalFilterDateTo.value) {
        list = list.filter(exp => {
            const d = exp.dueDate || exp.competenceMonth;
            return d && d <= modalFilterDateTo.value;
        });
    }

    // Ordenação
    const { key, direction } = modalSort.value;
    list.sort((a, b) => {
        let aVal, bVal;
        switch (key) {
            case 'date':
                aVal = a.dueDate || a.competenceMonth || '';
                bVal = b.dueDate || b.competenceMonth || '';
                break;
            case 'title':
                aVal = (a.bill?.creditor_json?.tradeName || a.bill?.creditor_json?.name || '').toLowerCase();
                bVal = (b.bill?.creditor_json?.tradeName || b.bill?.creditor_json?.name || '').toLowerCase();
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
                return 0;
        }
        if (aVal === bVal) return 0;
        return direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return list;
});

const modalTotal = computed(() =>
    modalExpenses.value.reduce((sum, e) => sum + Number(e.amount || 0), 0)
);

function handleModalSort(key) {
    if (modalSort.value.key === key) {
        modalSort.value.direction = modalSort.value.direction === 'asc' ? 'desc' : 'asc';
    } else {
        modalSort.value = { key, direction: 'asc' };
    }
}

function getModalSortIcon(key) {
    if (modalSort.value.key !== key) return 'fas fa-sort text-gray-400';
    return modalSort.value.direction === 'asc' ? 'fas fa-sort-up text-blue-500' : 'fas fa-sort-down text-blue-500';
}

function openDetails(group) {
    selectedGroup.value = group;
    selectedExpenseIds.value = [];
    clearModalFilters();
    // pré-seleciona "Todos" ao abrir (mostra o range do período global)
    modalDatePreset.value = 'all';
    bulkCategoryId.value = null;
    bulkDepartment.value = '';
}

function closeDetails() {
    selectedGroup.value = null;
    selectedExpenseIds.value = [];
    clearModalFilters();
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
    selectedExpenseIds.value = selectedExpenseIds.value.length === allIds.length ? [] : allIds;
}

// ── Bulk actions ──────────────────────────────────────────
async function applyBulkCategory() {
    if (bulkCategoryId.value === null || !selectedExpenseIds.value.length) return;
    const catId = Number(bulkCategoryId.value);
    const found = categoryOptions.value.find(c => c.id === catId);
    if (!confirm(`Aplicar categoria "${found?.name}" em ${selectedExpenseIds.value.length} lançamento(s)?`)) return;

    try {
        await Promise.all(
            selectedExpenseIds.value.map(id =>
                store.updateExpense(id, {
                    departmentCategoryId: catId,
                    departmentCategoryName: found?.name || null,
                })
            )
        );
        toast.success(`Categoria aplicada em ${selectedExpenseIds.value.length} lançamento(s)!`);
        bulkCategoryId.value = null;
        selectedExpenseIds.value = [];
        await refreshAfterEdit();
    } catch (e) {
        toast.error(e.message || 'Erro ao aplicar categoria.');
    }
}

async function applyBulkDepartment() {
    if (!bulkDepartment.value || !selectedExpenseIds.value.length) return;
    if (!confirm(`Aplicar departamento "${bulkDepartment.value}" em ${selectedExpenseIds.value.length} lançamento(s)?`)) return;

    try {
        await Promise.all(
            selectedExpenseIds.value.map(id =>
                store.updateExpense(id, { departmentName: bulkDepartment.value })
            )
        );
        toast.success(`Departamento aplicado em ${selectedExpenseIds.value.length} lançamento(s)!`);
        bulkDepartment.value = '';
        selectedExpenseIds.value = [];
        await refreshAfterEdit();
    } catch (e) {
        toast.error(e.message || 'Erro ao aplicar departamento.');
    }
}

// ── Modal de edição ───────────────────────────────────────
const editingExpense = ref(null);
const editSaving = ref(false);
const editForm = ref({
    amount: 0,
    departmentName: '',
    departmentCategoryId: null,
    description: '',
});

function openEditModal(exp) {
    editingExpense.value = exp;
    editForm.value = {
        amount: Number(exp.amount),
        departmentName: exp.departmentName || exp.bill?.mainDepartmentName || '',
        departmentCategoryId: exp.departmentCategoryId ?? null,
        description: exp.description || '',
    };
}

function closeEditModal() {
    editingExpense.value = null;
    editSaving.value = false;
}

async function saveEdit() {
    if (!editingExpense.value) return;
    editSaving.value = true;
    try {
        const catId = editForm.value.departmentCategoryId ? Number(editForm.value.departmentCategoryId) : null;
        const found = catId ? categoryOptions.value.find(c => c.id === catId) : null;

        await store.updateExpense(editingExpense.value.id, {
            amount: Number(editForm.value.amount),
            description: editForm.value.description || null,
            departmentName: editForm.value.departmentName || null,
            departmentCategoryId: catId,
            departmentCategoryName: found?.name || null,
        });

        toast.success('Lançamento atualizado!');
        closeEditModal();
        await refreshAfterEdit();
    } catch (e) {
        toast.error(e.message || 'Erro ao salvar.');
    } finally {
        editSaving.value = false;
    }
}

// ── Delete ────────────────────────────────────────────────
async function removeExpense(exp) {
    const billId = exp.billId ?? exp.bill?.id ?? null;
    const parts = Number(exp.installmentsNumber || 0);

    const msg = (billId && parts > 1)
        ? `Parcela ${exp.installmentNumber}/${parts} do Título ${billId}.\n\nAo excluir, TODAS as parcelas serão removidas. Confirmar?`
        : 'Deseja excluir este custo?';

    if (!confirm(msg)) return;

    try {
        await store.deleteExpense(exp.id);
        toast.success(billId && parts > 1 ? `Todas as parcelas do título ${billId} excluídas.` : 'Custo excluído!');
        await refreshAfterEdit();
    } catch (e) {
        toast.error(e.message || 'Erro ao excluir.');
    }
}

async function removeSelectedExpenses() {
    if (!selectedExpenseIds.value.length) return;
    if (!confirm(`Excluir ${selectedExpenseIds.value.length} custo(s) selecionado(s)?`)) return;

    try {
        await Promise.all(selectedExpenseIds.value.map(id => store.deleteExpense(id)));
        toast.success('Custos excluídos!');
        selectedExpenseIds.value = [];
        await refreshAfterEdit();
    } catch (e) {
        toast.error(e.message || 'Erro ao excluir.');
    }
}

// ── Refresh helper ────────────────────────────────────────
async function refreshAfterEdit() {
    await store.fetchExpenses();
    if (selectedGroup.value) {
        const updated = store.groups.find(g => g.costCenterId === selectedGroup.value.costCenterId);
        selectedGroup.value = updated?.expenses?.length ? updated : null;
    }
}

// ── Helpers ───────────────────────────────────────────────
function formatDate(d) {
    if (!d) return '—';
    const s = String(d);
    const date = new Date(s + (s.length === 10 ? 'T12:00:00' : ''));
    return date.toLocaleDateString('pt-BR');
}

function formatMonth(d) {
    if (!d) return '—';
    const s = String(d);
    const date = new Date(s + (s.length === 10 ? 'T12:00:00' : ''));
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

// ── Mount ─────────────────────────────────────────────────
onMounted(async () => {
    store.selectedDepartments = [];
    await Promise.all([
        adminMeta.fetchDepartmentCategories(),
        contractsStore.fetchEnterpriseCities(),
        store.fetchExpenses(),
    ]);
});
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
    max-height: 0;
    opacity: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
    max-height: 80px;
    opacity: 1;
}
</style>
