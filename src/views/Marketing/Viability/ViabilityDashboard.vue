<template>
    <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <!-- HEADER -->
        <div
            class="rounded-2xl border dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg overflow-hidden">
            <div class="p-6 text-white">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold mb-2 flex items-center gap-3">
                            <i class="fas fa-chart-line"></i>
                            Viabilidade de Marketing
                        </h1>
                        <p class="text-emerald-50 text-sm max-w-2xl">
                            Controle de orçamento de marketing por empreendimento:
                            <strong>quanto podemos gastar por unidade</strong>, considerando
                            <strong>vendas realizadas, estoque atual</strong> e o
                            <strong>mês de competência {{ monthLabel }}</strong>.
                        </p>
                    </div>

                    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        <!-- Mês de competência -->
                        <div class="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[220px]">
                            <label class="text-xs font-medium text-emerald-50 mb-2 flex items-center gap-2">
                                <i class="far fa-calendar-alt"></i>
                                Mês de Competência
                            </label>
                            <input type="month" v-model="month"
                                class="w-full px-3 py-2 bg-white dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all" />
                        </div>

                        <!-- Botão atualizar -->
                        <button @click="load"
                            class="h-11 px-4 rounded-xl bg-white text-emerald-700 font-semibold flex items-center gap-2 shadow hover:bg-emerald-50 transition-all self-end md:self-center"
                            :disabled="store.isLoading">
                            <i class="fas" :class="store.isLoading ? 'fa-circle-notch fa-spin' : 'fa-sync-alt'"></i>
                            <span>{{ store.isLoading ? 'Atualizando...' : 'Atualizar' }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- FILTROS -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-6 shadow-lg">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <!-- Empreendimentos (MultiSelector) -->
                <div class="md:col-span-5">
                    <label class="text-sm font-semibold text-gray-700  dark:text-gray-300 mb-2 flex items-center gap-2">
                        <i class="fas fa-city text-emerald-600"></i>
                        Empreendimento(s) da projeção
                    </label>

                    <MultiSelector :model-value="selectedErpIds" @update:modelValue="onEnterprisesChange"
                        :options="enterpriseOptions" placeholder="Selecione empreendimentos" :page-size="200"
                        :select-all="true" />
                </div>

                <div class="md:col-span-4">
                    <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <i class="fas fa-traffic-light text-emerald-600"></i>
                        Status do Orçamento (mês)
                    </label>
                    <select v-model="statusFilter"
                        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/60 text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60">
                        <option value="all">(Todos)</option>
                        <option value="UNDER">Abaixo do orçamento</option>
                        <option value="ON_TRACK">Dentro do planejado</option>
                        <option value="OVER">Acima do orçamento</option>
                    </select>
                </div>

                <!-- Switch MÊS / ANO -->
                <div class="md:col-span-3 flex items-center justify-between md:justify-end gap-3">
                    <div class="flex flex-col items-start md:items-end gap-1">
                        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Visão (Mês / Ano)
                        </span>
                        <div class="flex items-center bg-gray-100 dark:bg-gray-900 rounded-xl p-1 text-xs">
                            <button type="button" @click="unitScope = 'MONTH'" :class="scopeBtnClass('MONTH')">
                                Mês
                            </button>
                            <button type="button" @click="unitScope = 'YEAR'" :class="scopeBtnClass('YEAR')">
                                Ano
                            </button>
                        </div>
                    </div>

                    <Favorite :router="'/marketing/viabilidade'" :section="'Viabilidade Marketing'" />
                </div>
            </div>

            <p v-if="store.error" class="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                <i class="fas fa-exclamation-circle mr-2"></i>{{ store.error }}
            </p>
        </div>

        <!-- RESUMO GLOBAL (MÊS / ANO) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- ORÇAMENTO (MÊS / ANO) -->
            <div class="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 shadow-lg p-6 text-white">
                <div class="text-sm font-medium opacity-90 mb-2 flex items-center gap-2">
                    <i class="fas fa-wallet"></i>
                    <span>
                        {{
                            unitScope === 'MONTH'
                                ? `Orçamento do mês ${monthLabel}`
                                : 'Orçamento anual'
                        }}
                        ({{ kpiPctUsed.toFixed(1) }}% {{ unitScope === 'MONTH' ? 'usado' : 'do orçamento' }})
                    </span>
                </div>
                <div class="text-3xl font-bold">
                    {{ formatCurrency(kpiBudget) }}
                </div>
                <div class="text-md opacity-80 mt-2">
                    <span>
                        {{ unitScope === 'MONTH' ? 'Gasto no mês:' : 'Gasto acumulado:' }}
                    </span>
                    <strong class="ps-1"> {{ formatCurrency(kpiSpent) }} </strong>
                </div>
                <div class="text-md opacity-80 mt-1">
                    <span>
                        {{ unitScope === 'MONTH' ? 'Saldo do mês:' : 'Saldo anual estimado:' }}
                    </span>
                    <strong class="ps-1" :class="moneyClass(kpiBalance)">
                        {{ formatCurrency(kpiBalance) }}
                    </strong>
                </div>
            </div>

            <!-- UNIDADES (MÊS / ANO) -->
            <div class="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-6">
                <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <i class="fas fa-cubes text-emerald-600"></i>
                    <span>Unidades ({{ unitScope === 'MONTH' ? 'mês' : 'ano' }})</span>
                </div>
                <div class="text-xl font-bold text-gray-900 dark:text-white">
                    Meta: {{ unitsTargetScope }} Unidades
                </div>
                <div class="mt-1 text-md font-semibold text-emerald-700 dark:text-emerald-300">
                    Realizadas até {{ monthLabel }}: {{ unitsRealScope }} Unidades
                </div>
                <div class="text-md text-gray-500 dark:text-gray-400 mt-1">
                    <span>
                        {{ unitScope === 'MONTH' ? 'Restante no mês:' : 'Restante no ano:' }}
                    </span>
                    <span class="ps-1" :class="remainingUnitsClass(unitsRemainingScope)">
                        {{ unitsRemainingScope }} unid.
                    </span>
                </div>
            </div>

            <!-- ESTOQUE / SNAPSHOT CV (GLOBAL) -->
            <div class="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-6">
                <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <i class="fas fa-warehouse text-emerald-600"></i>
                    Estoque (snapshot CV)
                </div>

                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Total de unidades (vendidas + não vendidas):
                </div>
                <div class="text-xl font-bold text-gray-900 dark:text-white">
                    {{ totals.availableInventory + totals.soldUnitsStock }} unid.
                </div>

                <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Não vendidas (estoque de viabilidade):
                    <span class="font-semibold" :class="moneyClass(totals.availableInventory, true)">
                        {{ totals.availableInventory }} unid.
                    </span>
                </div>

                <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                    <div class="flex flex-wrap gap-2">
                        <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            v-tippy="'Unidades disponíveis para venda <br>(não reservadas nem bloqueadas)'">
                            <span class="min-w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>
                            {{ totals.availableUnits }}
                        </span>

                        <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            v-tippy="'Unidades reservadas <br>(início ou ativa)'">
                            <span class="min-w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                            {{ totals.reservedUnits }}
                        </span>

                        <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                            v-tippy="'Unidades bloqueadas para venda'">
                            <span class="min-w-2 h-2 rounded-full bg-gray-500 mr-1"></span>
                            {{ totals.blockedUnits }}
                        </span>

                        <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            v-tippy="'Unidades vendidas (snapshot)'">
                            <span class="min-w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                            {{ totals.soldUnitsStock }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- RESUMO GLOBAL DE CUSTO POR UNIDADE (MÊS / ANO) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Planejado por unidade -->
            <div class="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-6">
                <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <i class="fas fa-bullseye text-emerald-600"></i>
                    Custo planejado por unidade ({{ unitScope === 'MONTH' ? 'mês' : 'ano' }})
                </div>
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(plannedCostPerUnitScope) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{
                        unitScope === 'MONTH'
                            ? 'Base: orçamento recomendado do mês / unidades alvo do mês.'
                            : 'Base: orçamento anual / unidades alvo do ano.'
                    }}
                </div>
            </div>

            <!-- Real por unidade -->
            <div class="rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-6">
                <div class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <i class="fas fa-chart-area text-emerald-600"></i>
                    Custo real por unidade ({{ unitScope === 'MONTH' ? 'mês' : `vendas até ${monthLabel}` }})
                </div>
                <div class="text-2xl font-bold" :class="realUnitScopeClass">
                    {{ formatCurrency(realCostPerUnitScope) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{
                        unitScope === 'MONTH'
                            ? 'Base: gasto do mês / unidades vendidas no mês.'
                            : 'Base: gasto acumulado / unidades vendidas no ano.'
                    }}
                </div>
            </div>
        </div>

        <!-- TABELA DE EMPREENDIMENTOS -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 shadow-lg overflow-hidden">
            <div
                class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <i class="fas fa-table text-emerald-600"></i>
                    Empreendimentos com projeção
                </h3>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ activeItems.length }} registro(s)
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th
                                class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Empreendimento
                            </th>
                            <th
                                class="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Mês (R$)
                            </th>
                            <th
                                class="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Ano (R$)
                            </th>
                            <th
                                class="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Unidades
                            </th>
                            <th
                                class="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Viabilidade
                            </th>
                            <th
                                class="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Estoque
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr v-for="item in activeItems" :key="item.erpId + '-' + (item.cvEnterpriseId || 'cv0')"
                            class="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors">
                            <!-- EMPREENDIMENTO -->
                            <td class="px-6 py-4 align-top">
                                <div class="flex items-start gap-3">
                                    <div
                                        class="w-10 h-10 mt-1 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                                        <i class="fas fa-building"></i>
                                    </div>
                                    <div>
                                        <div class="text-sm font-semibold text-gray-900 dark:text-white">
                                            {{ item.enterpriseName || '—' }}
                                        </div>
                                        <div class="text-xs font-light text-gray-400">
                                            ERP: {{ item.erpId }}
                                            <span v-if="item.cvEnterpriseId">
                                                • CV: {{ item.cvEnterpriseId }}
                                            </span>
                                        </div>
                                        <div class="text-[10px] text-gray-500 dark:text-gray-400">
                                            Projeção {{ item.header?.year }} • ID Proj:
                                            {{ item.header?.projectionId || '-' }}
                                            <span v-if="item.header?.upToMonth">
                                                • Até {{ formatMonth(item.header.upToMonth) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <!-- MÊS (recomendado + gasto vs recomendado) -->
                            <td class="px-6 py-4 align-top text-right text-xs text-gray-700 dark:text-gray-300">
                                <div class="flex flex-col items-end gap-1">
                                    <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                        Recom. p/ mês:
                                        <strong :class="moneyClass(recommendedMonthBudget(item))">
                                            {{ formatCurrency(recommendedMonthBudget(item)) }}
                                        </strong>
                                    </div>

                                    <p class="text-[11px]">
                                        Gasto:
                                        <strong>
                                            {{ formatCurrency(item.header?.monthContext?.monthSpent || 0) }}
                                        </strong>
                                        <span :class="recommendedTextClass(item)">
                                            ({{ recommendedSpendPct(item).toFixed(1) }}%)
                                        </span>
                                    </p>
                                </div>
                            </td>

                            <!-- ANO (projeção até mês OU ano cheio, conforme unitScope) -->
                            <td class="px-6 py-4 align-top text-right text-xs text-gray-700 dark:text-gray-300">
                                <div class="flex flex-col items-end gap-1">
                                    <!-- Visão por MÊS: só até o mês de competência -->
                                    <template v-if="unitScope === 'MONTH'">
                                        <div class="text-xs">
                                            Projetado até {{ monthLabel }}:
                                            <strong class="text-sm">{{ formatCurrency(projectedBudgetToMonth(item)) }}</strong>
                                        </div>

                                        <div class="text-xs relative flex pb-3 flex-col">
                                            Gasto até {{ monthLabel }}:<br>
                                            <strong class="text-sm">{{ formatCurrency(item.header?.spentTotal || 0) }}</strong>
                                            <strong class="absolute bottom-0 right-0 text-xs" :class="moneyClass(balanceToMonth(item))">
                                                {{ formatCurrency(balanceToMonth(item)) }}
                                            </strong>
                                        </div>

                                    </template>

                                    <!-- Visão ANO: ano cheio -->
                                    <template v-else>
                                        <div class="text-xs">
                                            Orçamento anual:
                                            <strong class="text-sm">{{ formatCurrency(item.header?.budgetTotal || 0) }}</strong>
                                        </div>

                                        <div class="text-xs relative flex pb-3 flex-col">
                                            Gasto até {{ monthLabel }}:
                                            <strong class="text-sm">{{ formatCurrency(item.header?.spentTotal || 0) }}</strong>
                                            <strong class="absolute bottom-0 right-0 text-xs" :class="moneyClass(annualBalance(item))">
                                                {{ formatCurrency(annualBalance(item)) }}
                                            </strong>
                                        </div>
 
                                    </template>
                                </div>
                            </td>

                            <!-- UNIDADES (meta/realizadas + custo próxima) -->
                            <td class="px-6 py-4 align-top text-center text-xs text-gray-700 dark:text-gray-300">
                                <div class="space-y-1">
                                    <div class="font-semibold text-gray-900 dark:text-white">
                                        <span class="text-gray-400 text-[11px]">Projetado / Realizado</span><br>
                                        <template v-if="unitScope === 'MONTH'">
                                            {{ item.header?.monthContext?.unitsTargetMonth || 0 }} /
                                            {{ item.header?.monthContext?.unitsSoldRealMonth || 0 }}
                                        </template>
                                        <template v-else>
                                            {{ item.header?.unitsTargetTotal || 0 }} /
                                            {{ item.header?.soldUnitsRealYtd || 0 }}
                                        </template>
                                    </div>

                                    <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                        Restante:
                                        <strong :class="remainingUnitsClass(
                                            unitScope === 'MONTH'
                                                ? unitsRemainingMonth(item)
                                                : unitsRemainingYear(item)
                                        )">
                                            {{
                                                unitScope === 'MONTH'
                                                    ? unitsRemainingMonth(item)
                                                    : unitsRemainingYear(item)
                                            }}
                                            unid.
                                        </strong>
                                    </div>

                                    <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                        Custo p/ próxima:
                                        <strong :class="moneyClass(remainingBudgetPerUnsoldUnit(item))">
                                            {{ formatCurrency(remainingBudgetPerUnsoldUnit(item)) }}
                                        </strong>
                                    </div>
                                </div>
                            </td>

                            <!-- VIABILIDADE (alvo / real / próxima) -->
                            <td class="px-6 py-4 align-top text-center text-xs text-gray-700 dark:text-gray-300">
                                <div class="space-y-2">
                                    <div>
                                        <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                            Proj p/ unid.
                                        </div>
                                        <div class="font-semibold text-gray-900 dark:text-white">
                                            {{ formatCurrency(item.header?.plannedCostPerUnit || 0) }}
                                        </div>
                                    </div>

                                    <div>
                                        <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                            Custo p/ unid.
                                        </div>
                                        <div class="font-semibold" :class="realUnitClass(item)">
                                            {{ formatCurrency(item.header?.currentRealCostPerUnit || 0) }}
                                        </div>
                                    </div>

                                    <!-- <div>
                                        <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                            Próximas unidades
                                        </div>
                                        <div class="font-semibold"
                                            :class="moneyClass(remainingBudgetPerUnsoldUnit(item))">
                                            {{ formatCurrency(remainingBudgetPerUnsoldUnit(item)) }}
                                        </div>
                                    </div> -->
                                </div>
                            </td>

                            <!-- ESTOQUE / SNAPSHOT -->
                            <td class="px-6 py-4 align-top text-center text-xs text-gray-700 dark:text-gray-300">
                                <div class="space-y-2">
                                    <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                        Total de unidades:
                                        <span class="font-semibold text-gray-900 dark:text-white">
                                            {{ item.header?.totalUnits || 0 }} unid.
                                        </span>
                                    </div>

                                    <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                        Não vendidas:
                                        <span class="font-semibold text-gray-900 dark:text-white"
                                            :class="moneyClass(remainingUnitsToSell(item), true)">
                                            {{ remainingUnitsToSell(item) }} unid.
                                        </span>
                                    </div>

                                    <div
                                        class="text-[11px] text-gray-500 dark:text-gray-400 grid grid-cols-4 gap-2 mt-1 justify-items-center">
                                        <span
                                            class="w-full flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                            v-tippy="'Unidades disponíveis para venda (não reservadas nem bloqueadas)'">
                                            <span
                                                class="min-w-2 h-2 rounded-full text-center bg-emerald-500 mr-1"></span>
                                            {{ item.header?.availableUnits || 0 }}
                                        </span>

                                        <span
                                            class="w-full flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                            v-tippy="'Unidades reservadas (início ou ativa)'">
                                            <span class="min-w-2 h-2 rounded-full text-center bg-blue-500 mr-1"></span>
                                            {{ item.header?.reservedUnits || 0 }}
                                        </span>

                                        <span
                                            class="w-full flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                                            v-tippy="'Unidades bloqueadas para venda'">
                                            <span class="min-w-2 h-2 rounded-full text-center bg-gray-500 mr-1"></span>
                                            {{ item.header?.blockedUnits || 0 }}
                                        </span>

                                        <span
                                            class="w-full flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                            v-tippy="'Unidades já vendidas (fora do estoque de viabilidade)'">
                                            <span class="min-w-2 h-2 rounded-full text-center bg-red-500 mr-1"></span>
                                            {{ item.header?.soldUnits || 0 }}
                                        </span>
                                    </div>

                                    <!-- <div v-if="item.header?.inventoryShortfallUnits > 0"
                                        class="mt-1 text-[11px] text-red-600 dark:text-red-400">
                                        Falta de {{ item.header.inventoryShortfallUnits }} unid. para a projeção.
                                    </div> -->
                                    <!-- Sobra removida conforme pedido -->
                                </div>
                            </td>
                        </tr>

                        <tr v-if="!activeItems.length && !store.isLoading">
                            <td colspan="7" class="px-6 py-12 text-center">
                                <div class="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                                    <i class="fas fa-inbox text-4xl opacity-50"></i>
                                    <p class="text-sm font-medium">
                                        Nenhum empreendimento com projeção encontrado.
                                    </p>
                                    <p class="text-xs">Verifique o mês/ano, filtros de status ou seleção.</p>
                                </div>
                            </td>
                        </tr>

                        <tr v-if="store.isLoading">
                            <td colspan="7" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                <i class="fas fa-circle-notch fa-spin mr-2"></i>
                                Carregando dados de viabilidade...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useViabilityStore } from '@/stores/Marketing/Viability/viabilityStore';
import Favorite from '@/components/config/Favorite.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import dayjs from 'dayjs';

const store = useViabilityStore();

// proxies locais
const aliasId = ref(store.selectedAliasId);
const month = ref(store.selectedMonth);
const statusFilter = ref(store.statusFilter);

// visão global: 'MONTH' (mês) | 'YEAR' (ano)
const unitScope = ref('MONTH');

// Empreendimentos selecionados no MultiSelector (labels)
const selectedErpIds = ref([]);

// Label amigável para cada empreendimento
const enterpriseLabel = item =>
    `${item.enterpriseName || '—'} (ERP ${item.erpId})`;

// Opções para o MultiSelector
const enterpriseOptions = computed(() =>
    store.sorted.map(enterpriseLabel)
);

// quando o usuário marca/desmarca no MultiSelector
function onEnterprisesChange(v) {
    selectedErpIds.value = Array.isArray(v) ? v : [];
}

// Itens ativos = interseção entre sorted e seleção do MultiSelector
const activeItems = computed(() => {
    if (!selectedErpIds.value.length) return store.sorted;
    const set = new Set(selectedErpIds.value);
    return store.sorted.filter(item => set.has(enterpriseLabel(item)));
});

// ===== TOTAIS agregados com base APENAS nos activeItems =====
const totals = computed(() => {
    let monthBudget = 0;
    let monthSpent = 0;
    let monthRemaining = 0;

    let monthUnitsTarget = 0;
    let soldUnitsMonth = 0;

    let availableInventory = 0;
    let availableUnits = 0;
    let reservedUnits = 0;
    let blockedUnits = 0;
    let soldUnitsStock = 0;

    let budgetTotal = 0;
    let spentTotal = 0;
    let remainingBudgetTotal = 0;

    let unitsTargetTotal = 0;
    let soldUnitsYear = 0;
    let remainingUnitsYear = 0;

    // soma do orçamento recomendado do mês
    let recommendedMonthTotal = 0;

    for (const item of activeItems.value) {
        const h = item.header || {};
        const ctx = h.monthContext || {};

        // visão mensal (valores do backend)
        monthBudget += Number(ctx.monthBudget || 0);
        monthSpent += Number(ctx.monthSpent || 0);
        monthRemaining += Number(ctx.monthRemaining || 0);

        monthUnitsTarget += Number(ctx.unitsTargetMonth || 0);
        soldUnitsMonth += Number(ctx.unitsSoldRealMonth || 0);

        // recomendado do mês (calculado)
        recommendedMonthTotal += Number(recommendedMonthBudget(item) || 0);

        // estoque (snapshot)
        availableInventory += Number(h.availableInventory || 0);
        availableUnits += Number(h.availableUnits || 0);
        reservedUnits += Number(h.reservedUnits || 0);
        blockedUnits += Number(h.blockedUnits || 0);
        soldUnitsStock += Number(h.soldUnitsStock ?? h.soldUnits ?? 0);

        // visão global anual
        budgetTotal += Number(h.budgetTotal || 0);
        spentTotal += Number(h.spentTotal || 0);
        remainingBudgetTotal += Number(h.remainingBudgetTotal || 0);

        unitsTargetTotal += Number(h.unitsTargetTotal || 0);
        soldUnitsYear += Number(h.soldUnitsRealYtd || 0);
        remainingUnitsYear += Number(h.remainingUnitsPlan || 0);
    }

    const monthSpentPct = monthBudget > 0 ? (monthSpent / monthBudget) * 100 : 0;
    const yearSpentPct = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0;

    return {
        // visão mensal
        monthBudget,
        monthSpent,
        monthRemaining,
        monthSpentPct,

        monthUnitsTarget,
        soldUnitsMonth,

        // recomendado agregado do mês
        recommendedMonthTotal,

        // estoque (snapshot)
        availableInventory,
        availableUnits,
        reservedUnits,
        blockedUnits,
        soldUnitsStock,

        // visão global anual
        budgetTotal,
        spentTotal,
        remainingBudgetTotal,
        unitsTargetTotal,
        soldUnitsYear,
        remainingUnitsYear,
        yearSpentPct,

        // extras para os KPIs
        unitsTargetMonth: monthUnitsTarget,
        soldUnitsMonth,
        remainingUnitsMonth: monthUnitsTarget - soldUnitsMonth
    };
});

const monthLabel = computed(() => {
    if (!store.selectedMonth) return 'o período';
    return formatMonth(store.selectedMonth);
});

// saldo anual global (sempre budget - gasto)
const globalAnnualBalance = computed(() => {
    const t = totals.value;
    const budget = Number(t.budgetTotal || 0);
    const spent = Number(t.spentTotal || 0);
    return budget - spent;
});

// ====== KPIs ORÇAMENTO (MÊS / ANO) ======
const kpiBudget = computed(() => {
    const t = totals.value;
    // MÊS = orçamento recomendado total
    return unitScope.value === 'MONTH'
        ? Number(t.recommendedMonthTotal || 0)
        : Number(t.budgetTotal || 0);
});

const kpiSpent = computed(() => {
    const t = totals.value;
    return unitScope.value === 'MONTH'
        ? Number(t.monthSpent || 0)
        : Number(t.spentTotal || 0);
});

const kpiPctUsed = computed(() => {
    const t = totals.value;
    if (unitScope.value === 'MONTH') {
        const budget = Number(t.recommendedMonthTotal || 0);
        const spent = Number(t.monthSpent || 0);
        return budget > 0 ? (spent / budget) * 100 : 0;
    }
    return Number(t.yearSpentPct || 0);
});

const kpiBalance = computed(() => {
    const t = totals.value;
    if (unitScope.value === 'MONTH') {
        const budget = Number(t.recommendedMonthTotal || 0);
        const spent = Number(t.monthSpent || 0);
        // saldo = recomendado - gasto
        return budget - spent;
    }
    return globalAnnualBalance.value;
});

// ====== UNIDADES GLOBAIS (MÊS / ANO) ======

// meta de unidades (escopo mês/ano)
const unitsTargetScope = computed(() => {
    const t = totals.value;
    if (unitScope.value === 'MONTH') {
        if (t.unitsTargetMonth !== undefined && t.unitsTargetMonth !== null) {
            return Number(t.unitsTargetMonth);
        }
        return Number(t.monthUnitsTarget || 0);
    }
    return Number(t.unitsTargetTotal || 0);
});

// realizadas (escopo mês/ano)
const unitsRealScope = computed(() => {
    const t = totals.value;
    if (unitScope.value === 'MONTH') {
        if (t.soldUnitsMonth !== undefined && t.soldUnitsMonth !== null) {
            return Number(t.soldUnitsMonth);
        }
        return Number(t.soldUnitsMonth || 0);
    }
    return Number(t.soldUnitsYear || 0);
});

// restante (escopo mês/ano)
const unitsRemainingScope = computed(() => {
    const t = totals.value;
    if (unitScope.value === 'MONTH') {
        if (t.remainingUnitsMonth !== undefined && t.remainingUnitsMonth !== null) {
            return Number(t.remainingUnitsMonth);
        }
        return unitsTargetScope.value - unitsRealScope.value;
    }
    return Number(t.remainingUnitsYear || 0);
});

// ===== MÉTRICAS GLOBAIS DE CUSTO POR UNIDADE (ANO BASE + MÊS DERIVADO) =====

const totalPlannedCostPerUnit = computed(() => {
    const t = totals.value;
    const units = Number(t.unitsTargetTotal || 0);
    const budget = Number(t.budgetTotal || 0);
    if (!units) return 0;
    return budget / units;
});

const totalRealCostPerUnitYtd = computed(() => {
    const t = totals.value;
    const sold = Number(t.soldUnitsYear || 0);
    const spent = Number(t.spentTotal || 0);
    if (!sold) return 0;
    return spent / sold;
});

const remainingCostPerUnitGlobal = computed(() => {
    const t = totals.value;
    const remainingUnits = Number(t.remainingUnitsYear || 0);
    const remainingBudget =
        t.remainingBudgetTotal !== undefined && t.remainingBudgetTotal !== null
            ? Number(t.remainingBudgetTotal)
            : Number(t.budgetTotal || 0) - Number(t.spentTotal || 0);
    if (!remainingUnits) return 0;
    return remainingBudget / remainingUnits;
});

// custos reativos ao escopo (mês/ano)
const plannedCostPerUnitScope = computed(() => {
    const t = totals.value;

    if (unitScope.value === 'MONTH') {
        const units = unitsTargetScope.value || 0;
        const recommended = Number(t.recommendedMonthTotal || 0);
        if (!units) return 0;
        // Custo planejado = orçamento recomendado / unidades alvo
        return recommended / units;
    }

    // visão ANO segue usando orçamento anual
    return totalPlannedCostPerUnit.value;
});

const realCostPerUnitScope = computed(() => {
    const t = totals.value;

    if (unitScope.value === 'MONTH') {
        const soldMonth = unitsRealScope.value || 0;     // vendidas no mês
        const spentMonth = Number(t.monthSpent || 0);    // gasto no mês

        if (soldMonth > 0) {
            // caso normal: gasto do mês / vendidas no mês
            return spentMonth / soldMonth;
        }

        // sem vendas no mês → usa custo real YTD (backend / visão anual)
        return totalRealCostPerUnitYtd.value;
    }

    // visão ANO: já era YTD
    return totalRealCostPerUnitYtd.value;
});

const realUnitScopeClass = computed(() => {
    const planned = Number(plannedCostPerUnitScope.value || 0);
    const real = Number(realCostPerUnitScope.value || 0);

    if (!planned || !real) return 'text-gray-700 dark:text-gray-300';

    if (real > planned) return 'text-red-600 dark:text-red-400';
    if (real < planned) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-gray-700 dark:text-gray-300';
});

// ===== Helpers de layout/calculo =====

function formatCurrency(v) {
    return Number(v || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatMonth(ym) {
    if (!ym) return '';
    return dayjs(`${ym}-01`).format('MM/YYYY');
}

// classe de cor para valores monetários (positivo/negativo)
function moneyClass(value, isUnits = false) {
    const v = Number(value || 0);
    if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
    if (v < 0) return 'text-red-600 dark:text-red-400';
    return isUnits ? 'text-gray-700 dark:text-gray-300' : 'text-gray-700 dark:text-gray-300';
}

// restante de unidades: positivo = ruim (vermelho), negativo = bom (verde)
function remainingUnitsClass(delta) {
    const v = Number(delta || 0);
    if (v > 0) return 'text-red-600 dark:text-red-400';
    if (v < 0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-gray-700 dark:text-gray-300';
}

// botão do switch Mês/Ano
function scopeBtnClass(mode) {
    return [
        'px-3 py-1 rounded-lg font-medium transition-all',
        unitScope.value === mode
            ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 shadow'
            : 'text-gray-500 dark:text-gray-400'
    ];
}

// unidades restantes (meta - realizadas) por empreendimento (mês)
function unitsRemainingMonth(item) {
    const t = Number(item.header?.monthContext?.unitsTargetMonth || 0);
    const s = Number(item.header?.monthContext?.unitsSoldRealMonth || 0);
    return t - s;
}

// unidades restantes (ano)
function unitsRemainingYear(item) {
    const h = item.header || {};
    if (h.remainingUnitsPlan !== undefined && h.remainingUnitsPlan !== null) {
        return Number(h.remainingUnitsPlan || 0);
    }
    const target = Number(h.unitsTargetTotal || 0);
    const sold = Number(h.soldUnitsRealYtd || 0);
    return target - sold;
}

// saldo anual por empreendimento (sempre budget - gasto)
function annualBalance(item) {
    const budget = Number(item.header?.budgetTotal || 0);
    const spent = Number(item.header?.spentTotal || 0);
    return budget - spent;
}

/**
 * Orçamento projetado até o mês de competência.
 */
function projectedBudgetToMonth(item) {
    const upTo = Number(item.header?.budgetUpToMonth || 0);
    if (upTo) return upTo;
    return Number(item.header?.budgetTotal || 0);
}

function balanceToMonth(item) {
    const projected = projectedBudgetToMonth(item);
    const spent = Number(item.header?.spentTotal || 0);
    return projected - spent;
}

/**
 * % do gasto em relação ao RECOMENDADO do mês.
 */
function recommendedSpendPct(item) {
    const rec = recommendedMonthBudget(item);
    if (!rec) return 0;
    const spent = Number(item.header?.monthContext?.monthSpent || 0);
    return (spent / rec) * 100;
}

/**
 * Texto do Gasto vs Recomendado (mês)
 */
function recommendedTextClass(item) {
    const pct = recommendedSpendPct(item);
    if (!pct) return 'text-gray-700 dark:text-gray-300';
    if (pct <= 100) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-red-600 dark:text-red-400';
}

/**
 * Viabilidade total do empreendimento
 */
function viabilityTotal(item) {
    const plannedPerUnit = Number(item.header?.plannedCostPerUnit || 0);
    const header = item.header || {};

    let totalUnits = Number(header.totalUnits || 0);

    // se por algum motivo não tiver totalUnits, tenta recompor: estoque + vendidas
    if (!totalUnits) {
        const availableInventory = Number(header.availableInventory || 0);
        const soldSnap = Number(header.soldUnitsStock ?? header.soldUnits ?? 0);
        const maybeTotal = availableInventory + soldSnap;
        if (maybeTotal > 0) {
            totalUnits = maybeTotal;
        }
    }

    if (plannedPerUnit && totalUnits) {
        return plannedPerUnit * totalUnits;
    }
    return Number(header.budgetTotal || 0);
}

/**
 * Unidades restantes a vender (estoque de viabilidade)
 */
function remainingUnitsToSell(item) {
    const header = item.header || {};

    // Estoque de viabilidade explícito vindo do backend
    const availableInventory = Number(header.availableInventory ?? 0);
    if (availableInventory > 0) {
        return availableInventory;
    }

    // Fallback: total - vendidas (snapshot)
    const totalUnits = Number(header.totalUnits || 0);
    const soldSnap = Number(header.soldUnitsStock ?? header.soldUnits ?? 0);

    if (totalUnits > 0) {
        const unsold = totalUnits - soldSnap;
        return unsold >= 0 ? unsold : 0;
    }

    return 0;
}

/**
 * Viabilidade por unidade remanescente
 * = (viabilidade total - gasto até agora) / unidades ainda não vendidas
 */
function remainingBudgetPerUnsoldUnit(item) {
    const totalViability = viabilityTotal(item);
    const spent = Number(item.header?.spentTotal || 0);
    const remainingBudget = totalViability - spent;
    const unitsToSell = remainingUnitsToSell(item);
    if (!unitsToSell) return 0;
    return remainingBudget / unitsToSell;
}

/**
 * Orçamento recomendado para o MÊS
 * = custo remanescente por unidade * meta de unidades do mês
 */
function recommendedMonthBudget(item) {
    const perUnit = remainingBudgetPerUnsoldUnit(item);
    const unitsTargetMonth = Number(item.header?.monthContext?.unitsTargetMonth || 0);
    if (!unitsTargetMonth) return 0;
    return perUnit * unitsTargetMonth;
}

// cor para Real / unid comparando com planejado (por empreendimento / ano)
function realUnitClass(item) {
    const planned = Number(item.header?.plannedCostPerUnit || 0);
    const real = Number(item.header?.currentRealCostPerUnit || 0);
    if (!planned || !real) return 'text-gray-700 dark:text-gray-300';

    if (real > planned) return 'text-red-600 dark:text-red-400';
    if (real < planned) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-gray-700 dark:text-gray-300';
}

// ===== LOAD / WATCHERS =====

async function load() {
    const ym = month.value || dayjs().format('YYYY-MM');
    const y = Number(String(ym).slice(0, 4));
    if (y) {
        store.setYear(y);
    }

    store.setAlias(aliasId.value);
    store.setMonth(month.value);
    await store.fetchList();
}

watch(aliasId, v => {
    store.setAlias(v);
});

watch(month, v => {
    store.setMonth(v);
    if (v && String(v).length >= 4) {
        const y = Number(String(v).slice(0, 4));
        if (y) {
            store.setYear(y);
        }
    }
});

watch(statusFilter, v => {
    store.setStatusFilter(v);
});

onMounted(async () => {
    aliasId.value = store.selectedAliasId;
    month.value = store.selectedMonth;

    await load();
});
</script>
