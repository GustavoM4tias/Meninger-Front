<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Acompanhe os gastos por centro de custo no período selecionado"
        icon="fas fa-building">
        <template #title>
          Custos por Empreendimento
          <Favorite :router="'/financeiro/custos'" :section="'Custos'" />
        </template>
        <template #actions>
          <div class="flex flex-wrap items-end gap-2">
            <div>
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1 block">De</label>
              <Input v-model="store.startDate" type="date" size="sm" />
            </div>
            <div>
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1 block">Até</label>
              <Input v-model="store.endDate" type="date" size="sm" />
            </div>
            <Button v-if="isAdmin" variant="ghost" icon="fas fa-gear" size="sm"
              @click="adminSettingsOpen = true">
              Configurações
            </Button>
          </div>
        </template>
      </PageHeader>

      <AdminSettingsModal v-if="isAdmin" :open="adminSettingsOpen"
        :cost-center-groups="store.rawGroups"
        @close="adminSettingsOpen = false"
        @changed="store.fetchExpenses()" />

      <!-- Filtros Card -->
      <Surface variant="raised" padding="md" class="mb-5 surface-gradient">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div class="md:col-span-3">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-city text-emerald-500 text-[10px]"></i>
              Empreendimento
            </label>
            <MultiSelector :model-value="selectedEnterpriseNames" @update:modelValue="handleEnterpriseChange"
              :options="enterpriseOptions" placeholder="Todos os empreendimentos" :page-size="200" />
          </div>

          <div class="md:col-span-3">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-sitemap text-emerald-500 text-[10px]"></i>
              Departamento(s)
            </label>
            <MultiSelector :model-value="store.selectedDepartments"
              @update:modelValue="v => (store.selectedDepartments = Array.isArray(v) ? v : [])"
              :options="store.departmentOptions" placeholder="Todos os departamentos" :page-size="200" />
          </div>

          <div class="md:col-span-3">
            <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1.5">
              <i class="fas fa-tags text-emerald-500 text-[10px]"></i>
              Categoria
            </label>
            <Select
              v-model.number="categoryFilterId"
              :options="categoryFilterOptions"
              placeholder="Todas as categorias"
              size="sm" />
          </div>

          <div class="md:col-span-3">
            <Button variant="primary" icon="fas fa-filter" block
              class="!bg-emerald-600 hover:!bg-emerald-700"
              :loading="store.isLoading"
              :disabled="store.isLoading"
              @click="store.fetchExpenses">
              {{ store.isLoading ? 'Carregando...' : 'Filtrar' }}
            </Button>
          </div>
        </div>

        <Surface v-if="store.error" variant="raised" padding="sm"
          class="mt-3 border-red-500/30 bg-red-500/10">
          <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ store.error }}
          </div>
        </Surface>
      </Surface>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <Surface variant="raised" padding="md" class="border-emerald-500/30 bg-emerald-500/10 surface-gradient">
          <div class="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-2">
            <i class="fas fa-dollar-sign"></i> Total de Gastos
          </div>
          <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-200 font-mono tabular-nums">
            {{ filteredTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
          </div>
          <div class="text-[10px] text-emerald-700/70 dark:text-emerald-300/70 mt-1">Período selecionado</div>
        </Surface>

        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
            <i class="fas fa-building text-emerald-500"></i> Empreendimentos
          </div>
          <div class="text-2xl font-bold text-ink font-mono tabular-nums">{{ filteredGroups.length }}</div>
          <div class="text-[10px] text-ink-subtle mt-1">Com lançamentos</div>
        </Surface>

        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
            <i class="fas fa-list-ul text-emerald-500"></i> Total de Lançamentos
          </div>
          <div class="text-2xl font-bold text-ink font-mono tabular-nums">
            {{ filteredGroups.reduce((sum, g) => sum + g.expenses.length, 0) }}
          </div>
          <div class="text-[10px] text-ink-subtle mt-1">Custos registrados</div>
        </Surface>
      </div>

      <!-- Table Card -->
      <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
        <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h3 class="text-base font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-table text-emerald-500"></i>
              Detalhamento por Empreendimento
            </h3>
            <span class="text-xs text-ink-muted">
              <span class="font-mono tabular-nums">{{ filteredGroups.length }}</span> empreendimento(s)
            </span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-surface-sunken/60 border-b border-line">
              <tr>
                <th @click="handleSort('name')"
                  class="px-5 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink transition-colors">
                  <div class="flex items-center gap-2">
                    Empreendimento <i :class="getSortIcon('name')"></i>
                  </div>
                </th>
                <th @click="handleSort('total')"
                  class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink transition-colors">
                  <div class="flex items-center justify-end gap-2">
                    Total <i :class="getSortIcon('total')"></i>
                  </div>
                </th>
                <th class="px-5 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">
                  Lançamentos
                </th>
                <th class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="group in sortedGroups" :key="group.costCenterId"
                class="hover:bg-surface-hover/40 transition-colors">
                <td class="px-5 py-3 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <i class="fas fa-building"></i>
                    </div>
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-ink">
                        {{ group.costCenterName || resolveEnterpriseName(group.costCenterId) || '—' }}
                      </div>
                      <div class="text-xs text-ink-subtle font-mono">
                        CC {{ group.costCenterId }} · {{ group.expenses.length }} item(ns)
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-3 whitespace-nowrap text-right">
                  <div class="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {{ Number(group.total || 0).toLocaleString('pt-BR', {
                      style: 'currency', currency: 'BRL'
                    }) }}
                  </div>
                </td>
                <td class="px-5 py-3 whitespace-nowrap text-center">
                  <Badge variant="info" size="sm">
                    <span class="font-mono tabular-nums">{{ group.expenses.length }}</span>
                  </Badge>
                </td>
                <td class="px-5 py-3 whitespace-nowrap text-right">
                  <Button variant="secondary" size="sm" icon="fas fa-eye" @click="openDetails(group)">
                    Ver Detalhes
                  </Button>
                </td>
              </tr>

              <tr v-if="!filteredGroups.length && !store.isLoading">
                <td colspan="4" class="px-6 py-12">
                  <EmptyState
                    icon="fas fa-inbox"
                    title="Nenhum gasto encontrado"
                    description="Ajuste os filtros e tente novamente." />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>
    </PageContainer>

    <!-- ═══════════════════════════════════════════════════════════
         MODAL DE DETALHES
    ════════════════════════════════════════════════════════════ -->
    <Modal :open="!!selectedGroup"
      size="full"
      :title="selectedGroup ? (resolveEnterpriseName(selectedGroup.costCenterId) || selectedGroup.costCenterName || 'Empreendimento') : ''"
      @close="closeDetails">

      <template #subtitle>
        <div v-if="selectedGroup" class="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          <span><i class="fas fa-hashtag text-[10px] mr-1"></i>CC <span class="font-mono">{{ selectedGroup.costCenterId }}</span></span>
          <span class="opacity-50">|</span>
          <span><i class="fas fa-list-ul text-[10px] mr-1"></i><span class="font-mono tabular-nums">{{ modalExpenses.length }}</span> de <span class="font-mono tabular-nums">{{ selectedGroup.expenses.length }}</span> lançamento(s)</span>
          <span class="opacity-50">|</span>
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">
            <i class="fas fa-dollar-sign text-[10px] mr-1"></i>
            <span class="font-mono tabular-nums">{{ modalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</span>
          </span>
        </div>
      </template>

      <div v-if="selectedGroup" class="space-y-4 -m-4 sm:-m-5">

        <!-- Toolbar: busca + filtros -->
        <div class="border-b border-line bg-surface-sunken/40 px-4 sm:px-5 py-3 space-y-3">

          <div class="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
            <div class="flex-1 min-w-0">
              <Input
                v-model="modalSearch"
                placeholder="Buscar por fornecedor, documento, CNPJ, observação..."
                icon-left="fas fa-magnifying-glass" />
            </div>

            <div class="w-full md:w-44">
              <Select
                v-model="modalFilterDept"
                :options="modalDeptSelectOptions"
                placeholder="Todos departamentos"
                size="sm" />
            </div>

            <div class="w-full md:w-44">
              <Select
                v-model.number="modalFilterCat"
                :options="categoryFilterOptions"
                placeholder="Todas categorias"
                size="sm" />
            </div>

            <label class="flex items-center gap-2 text-sm text-ink-muted whitespace-nowrap cursor-pointer select-none px-1">
              <input type="checkbox" v-model="modalFilterNoCat"
                class="w-4 h-4 text-emerald-600 border-line rounded focus:ring-emerald-500" />
              Sem categoria
            </label>

            <Button v-if="hasModalFilters" variant="ghost" size="sm" icon="fas fa-times" @click="clearModalFilters">
              Limpar
            </Button>
          </div>

          <!-- Filtro de data -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle whitespace-nowrap flex items-center gap-1.5">
              <i class="fas fa-calendar-days text-emerald-500 text-[10px]"></i>
              Vencimento entre
            </span>
            <div class="flex items-center gap-2 flex-1">
              <Input v-model="modalFilterDateFrom" type="date" size="sm" />
              <span class="text-ink-subtle text-sm">até</span>
              <Input v-model="modalFilterDateTo" type="date" size="sm" />
              <IconButton v-if="modalFilterDateFrom || modalFilterDateTo"
                icon="fas fa-times-circle"
                label="Limpar datas"
                variant="ghost"
                size="sm"
                @click="modalFilterDateFrom = ''; modalFilterDateTo = ''" />
            </div>

            <!-- Chips de atalho rápido -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <button v-for="preset in datePresets" :key="preset.value"
                @click="setModalDatePreset(preset.value)"
                class="px-2.5 py-1 text-[11px] rounded-lg border transition-colors"
                :class="modalDatePreset === preset.value
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-line text-ink-muted hover:bg-surface-hover'">
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Bulk action bar -->
        <transition name="slide-down">
          <div v-if="selectedExpenseIds.length"
            class="bg-emerald-600 text-white px-4 sm:px-5 py-3 -mt-4">
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-sm font-semibold">
                <i class="fas fa-square-check mr-1"></i>
                <span class="font-mono tabular-nums">{{ selectedExpenseIds.length }}</span> selecionado(s)
              </span>
              <span class="opacity-40">|</span>

              <div class="flex items-center gap-2 flex-wrap">
                <select v-model="bulkDepartment"
                  class="px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50">
                  <option value="" class="text-gray-800">Departamento (opcional)...</option>
                  <option v-for="d in store.departmentOptions" :key="d" :value="d" class="text-gray-800">
                    {{ d }}
                  </option>
                </select>
                <select v-model.number="bulkCategoryId"
                  class="px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50">
                  <option :value="null" class="text-gray-800">Categoria (opcional)...</option>
                  <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id" class="text-gray-800">
                    {{ cat.name }}
                  </option>
                </select>
                <button @click="applyBulkBoth"
                  :disabled="bulkCategoryId === null && !bulkDepartment"
                  class="px-3 py-1.5 bg-white text-emerald-700 font-semibold rounded-lg text-sm hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <i class="fas fa-check mr-1"></i> Aplicar
                </button>
              </div>

              <span class="opacity-40">|</span>

              <button @click="removeSelectedExpenses"
                class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm transition-colors">
                <i class="fas fa-trash mr-1"></i> Excluir
              </button>

              <button @click="selectedExpenseIds = []"
                class="ml-auto px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors">
                <i class="fas fa-times mr-1"></i> Desmarcar
              </button>
            </div>
          </div>
        </transition>

        <!-- Tabela -->
        <div class="overflow-auto" style="max-height: calc(92vh - 280px)">
          <table class="min-w-full text-sm">
            <thead class="sticky top-0 z-10 bg-surface-sunken/95 backdrop-blur-sm border-b border-line">
              <tr>
                <th class="px-3 py-3 w-10">
                  <input type="checkbox"
                    :checked="modalExpenses.length > 0 && selectedExpenseIds.length === modalExpenses.length"
                    :indeterminate="selectedExpenseIds.length > 0 && selectedExpenseIds.length < modalExpenses.length"
                    @change="toggleSelectAllExpenses"
                    class="w-4 h-4 text-emerald-600 border-line rounded focus:ring-emerald-500 cursor-pointer" />
                </th>
                <th @click="handleModalSort('date')"
                  class="px-3 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink whitespace-nowrap">
                  <span class="flex items-center gap-1">Vencimento <i :class="getModalSortIcon('date')"></i></span>
                </th>
                <th @click="handleModalSort('title')"
                  class="px-3 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink">
                  <span class="flex items-center gap-1">Fornecedor / Título <i :class="getModalSortIcon('title')"></i></span>
                </th>
                <th class="px-3 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle whitespace-nowrap">
                  Parcela
                </th>
                <th @click="handleModalSort('amount')"
                  class="px-3 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink whitespace-nowrap">
                  <span class="flex items-center justify-end gap-1">Valor <i :class="getModalSortIcon('amount')"></i></span>
                </th>
                <th class="px-3 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle whitespace-nowrap">V. Título</th>
                <th @click="handleModalSort('department')"
                  class="px-3 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink">
                  <span class="flex items-center gap-1">Departamento <i :class="getModalSortIcon('department')"></i></span>
                </th>
                <th @click="handleModalSort('category')"
                  class="px-3 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink">
                  <span class="flex items-center gap-1">Categoria <i :class="getModalSortIcon('category')"></i></span>
                </th>
                <th class="px-3 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle min-w-[80px]">Observação</th>
                <th class="px-3 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/60">
              <tr v-for="exp in modalExpenses" :key="exp.id"
                class="hover:bg-surface-hover/40 transition-colors group"
                :class="{ 'bg-emerald-500/10': selectedExpenseIds.includes(exp.id) }">

                <td class="px-3 py-3">
                  <input type="checkbox" :checked="selectedExpenseIds.includes(exp.id)"
                    @change="toggleExpenseSelection(exp.id)"
                    class="w-4 h-4 text-emerald-600 border-line rounded focus:ring-emerald-500 cursor-pointer" />
                </td>

                <td class="px-3 py-3 whitespace-nowrap">
                  <div class="font-medium text-ink font-mono tabular-nums">
                    {{ formatDate(exp.dueDate) }}
                  </div>
                  <div class="text-[10px] text-ink-subtle mt-0.5">
                    Competência: {{ formatMonth(exp.competenceMonth) }}
                  </div>
                  <div v-if="exp.bill?.issueDate" class="text-[10px] text-ink-subtle">
                    Emissão: {{ formatDate(exp.bill.issueDate) }}
                  </div>
                </td>

                <td class="px-3 py-3 max-w-[240px]">
                  <div v-if="exp.bill">
                    <div class="font-semibold text-ink truncate"
                      :title="exp.bill.creditor_json?.tradeName || exp.bill.creditor_json?.name">
                      {{ exp.bill.creditor_json?.tradeName || exp.bill.creditor_json?.name || '—' }}
                    </div>
                    <div class="text-xs text-ink-muted mt-0.5">
                      {{ exp.bill.document_identification_id }} {{ exp.bill.document_number }}
                      <span class="text-ink-subtle">· #{{ exp.bill.id }}</span>
                    </div>
                    <div v-if="exp.bill.creditor_json?.cnpj" class="text-[10px] text-ink-subtle font-mono">
                      CNPJ: {{ exp.bill.creditor_json.cnpj }}
                    </div>
                    <div v-if="exp.bill.notes" class="text-[10px] text-ink-subtle truncate mt-0.5"
                      :title="exp.bill.notes">
                      <i class="fas fa-sticky-note mr-1"></i>{{ exp.bill.notes }}
                    </div>
                  </div>
                  <div v-else class="text-xs text-ink-subtle italic">sem vínculo</div>
                </td>

                <td class="px-3 py-3 text-center whitespace-nowrap">
                  <Badge v-if="exp.installmentsNumber > 1" variant="accent" size="sm" class="font-mono">
                    <i class="fas fa-layer-group text-[9px] mr-0.5 opacity-70"></i>
                    {{ exp.installmentNumber }}/{{ exp.installmentsNumber }}
                  </Badge>
                  <Badge v-else variant="neutral" size="sm" class="font-mono">1/1</Badge>
                </td>

                <td class="px-3 py-3 whitespace-nowrap text-right">
                  <span class="font-bold font-mono tabular-nums"
                    :class="{
                      'text-emerald-600 dark:text-emerald-400': exp.status !== 'cancelled',
                      'text-ink-subtle line-through': exp.status === 'cancelled',
                    }">
                    {{ Number(exp.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                  </span>
                  <div class="mt-1">
                    <Badge :variant="expStatusVariant(exp.status)" size="sm">
                      {{ expStatusLabel(exp.status) }}
                    </Badge>
                  </div>
                </td>

                <td class="px-3 py-3 whitespace-nowrap text-right text-xs text-ink-muted font-mono tabular-nums">
                  <span v-if="exp.bill?.totalInvoiceAmount">
                    {{ Number(exp.bill.totalInvoiceAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
                  </span>
                  <span v-else>—</span>
                </td>

                <td class="px-3 py-3 max-w-20 whitespace-nowrap">
                  <Badge v-if="exp.departmentName || exp.bill?.mainDepartmentName" variant="info" size="sm">
                    <span class="truncate max-w-[120px]">{{ exp.departmentName || exp.bill?.mainDepartmentName }}</span>
                  </Badge>
                  <span v-else class="text-xs text-ink-subtle">—</span>
                </td>

                <td class="px-3 py-3 whitespace-nowrap">
                  <Badge v-if="exp.departmentCategoryName" variant="warning" size="sm">
                    {{ exp.departmentCategoryName }}
                  </Badge>
                  <span v-else
                    class="inline-flex items-center px-2 py-0.5 text-[10px] text-ink-subtle bg-surface-sunken rounded-full border border-dashed border-line">
                    sem categoria
                  </span>
                </td>

                <td class="px-3 py-3">
                  <div v-if="exp.description"
                    class="text-xs text-ink-muted truncate max-w-[120px]"
                    :title="exp.description">
                    {{ exp.description }}
                  </div>
                  <span v-else class="text-xs text-ink-subtle italic">—</span>
                </td>

                <td class="px-3 py-3 whitespace-nowrap text-center">
                  <div class="flex items-center justify-end gap-1">
                    <IconButton icon="fas fa-pen" label="Editar"
                      variant="ghost" size="sm" class="!h-7 !w-7"
                      @click="openEditModal(exp)" />
                    <IconButton icon="fas fa-trash" label="Excluir"
                      variant="danger" size="sm" class="!h-7 !w-7"
                      @click="removeExpense(exp)" />
                  </div>
                </td>
              </tr>

              <tr v-if="!modalExpenses.length">
                <td colspan="10" class="px-6 py-12">
                  <EmptyState
                    icon="fas fa-magnifying-glass"
                    title="Nenhum lançamento encontrado"
                    description="Ajuste os filtros de busca acima.">
                    <button @click="clearModalFilters"
                      class="text-xs text-emerald-600 hover:underline mt-2">
                      Limpar filtros
                    </button>
                  </EmptyState>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-3 w-full">
          <div class="text-xs text-ink-muted">
            Mostrando <span class="font-mono tabular-nums">{{ modalExpenses.length }}</span>
            de <span class="font-mono tabular-nums">{{ selectedGroup?.expenses.length }}</span> lançamentos
            · Total filtrado:
            <span class="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {{ modalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}
            </span>
          </div>
          <Button variant="ghost" @click="closeDetails">Fechar</Button>
        </div>
      </template>
    </Modal>

    <!-- ═══════════════════════════════════════════════════════════
         MODAL DE EDIÇÃO
    ════════════════════════════════════════════════════════════ -->
    <Modal :open="!!editingExpense"
      size="md"
      title="Editar Lançamento"
      :subtitle="editingExpense ? (editingExpense.bill?.creditor_json?.tradeName || editingExpense.bill?.creditor_json?.name || editingExpense.description || '#' + editingExpense.id) : ''"
      @close="closeEditModal">

      <div v-if="editingExpense" class="space-y-4">
        <!-- Info readonly -->
        <Surface variant="raised" padding="sm" class="bg-surface-sunken/40">
          <div class="grid grid-cols-2 gap-3 text-xs text-ink-muted">
            <div>
              <span class="font-mono uppercase text-[10px] tracking-wider text-ink-subtle block mb-0.5">Vencimento</span>
              <span class="font-mono tabular-nums">{{ formatDate(editingExpense.dueDate) }}</span>
              <span class="text-ink-subtle block">Competência: {{ formatMonth(editingExpense.competenceMonth) }}</span>
            </div>
            <div>
              <span class="font-mono uppercase text-[10px] tracking-wider text-ink-subtle block mb-0.5">Parcela</span>
              <span v-if="editingExpense.installmentsNumber > 1" class="font-mono tabular-nums">
                {{ editingExpense.installmentNumber }}/{{ editingExpense.installmentsNumber }}
              </span>
              <span v-else>—</span>
            </div>
            <div>
              <span class="font-mono uppercase text-[10px] tracking-wider text-ink-subtle block mb-0.5">Documento</span>
              {{ editingExpense.bill?.document_identification_id }} {{ editingExpense.bill?.document_number || '—' }}
            </div>
            <div>
              <span class="font-mono uppercase text-[10px] tracking-wider text-ink-subtle block mb-0.5">V. Título</span>
              <span class="font-mono tabular-nums">
                {{ editingExpense.bill?.totalInvoiceAmount
                  ? Number(editingExpense.bill.totalInvoiceAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : '—' }}
              </span>
            </div>
          </div>
        </Surface>

        <!-- Departamento -->
        <Select
          v-model="editForm.departmentName"
          :options="editDepartmentOptions"
          placeholder="(sem departamento)"
          label="Departamento" />

        <!-- Categoria -->
        <Select
          v-model.number="editForm.departmentCategoryId"
          :options="editCategoryOptions"
          placeholder="(sem categoria)"
          label="Categoria" />

        <!-- Observação -->
        <div>
          <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
            <i class="fas fa-note-sticky text-accent mr-1"></i> Observação
          </label>
          <textarea v-model="editForm.description" rows="3"
            placeholder="Digite uma observação sobre este lançamento..."
            class="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-raised text-sm text-ink placeholder:text-ink-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent-ring/40 focus:border-accent transition-colors">
          </textarea>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="closeEditModal">Cancelar</Button>
        <Button variant="primary" icon="fas fa-check"
          :loading="editSaving"
          :disabled="editSaving"
          @click="saveEdit">
          {{ editSaving ? 'Salvando...' : 'Salvar alterações' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useExpensesStore } from '@/stores/Financeiro/Expenses/expensesStore';
import { useAdminMetaStore } from '@/stores/Settings/Admin/metaStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useToast } from 'vue-toastification';

import AdminSettingsModal from './AdminSettingsModal.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useExpensesStore();
const adminMeta = useAdminMetaStore();
const contractsStore = useContractsStore();
const auth = useAuthStore();
const isAdmin = computed(() => auth?.user?.role === 'admin');
const adminSettingsOpen = ref(false);

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

const categoryFilterOptions = computed(() => [
  { value: null, label: '(Todas)' },
  ...categoryOptions.value.map(c => ({ value: c.id, label: c.name })),
]);

const editCategoryOptions = computed(() => [
  { value: null, label: '(sem categoria)' },
  ...categoryOptions.value.map(c => ({ value: c.id, label: c.name })),
]);

const editDepartmentOptions = computed(() => [
  { value: '', label: '(sem departamento)' },
  ...(store.departmentOptions || []).map(d => ({ value: d, label: d })),
]);

// ── Date presets ──────────────────────────────────────────
const datePresets = [
  { value: 'this-month', label: 'Este mês' },
  { value: 'last-month', label: 'Mês anterior' },
  { value: 'quarter',    label: 'Trimestre' },
  { value: 'all',        label: 'Todos' },
];

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
      : key === 'name' ? (a.costCenterName || resolveEnterpriseName(a.costCenterId) || '').toLowerCase()
        : a[key];
    let bVal = key === 'total' ? Number(b.total || 0)
      : key === 'name' ? (b.costCenterName || resolveEnterpriseName(b.costCenterId) || '').toLowerCase()
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
  if (sortConfig.value.key !== key) return 'fas fa-sort text-ink-subtle';
  return sortConfig.value.direction === 'asc' ? 'fas fa-sort-up text-emerald-500' : 'fas fa-sort-down text-emerald-500';
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
  const hidden = new Set((store.data?.hiddenDepartments || []).map(d => (d || '').toLowerCase()));
  const set = new Set();
  for (const exp of selectedGroup.value.expenses || []) {
    const d = exp.departmentName || exp.bill?.mainDepartmentName;
    if (d && !hidden.has(d.toLowerCase())) set.add(d);
  }
  return Array.from(set).sort();
});

const modalDeptSelectOptions = computed(() => [
  { value: '', label: 'Todos departamentos' },
  ...modalDeptOptions.value.map(d => ({ value: d, label: d })),
]);

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

  if (modalFilterDept.value) {
    const d = modalFilterDept.value.toLowerCase();
    list = list.filter(exp =>
      (exp.departmentName || exp.bill?.mainDepartmentName || '').toLowerCase() === d
    );
  }

  if (modalFilterCat.value) {
    list = list.filter(exp => exp.departmentCategoryId === Number(modalFilterCat.value));
  }

  if (modalFilterNoCat.value) {
    list = list.filter(exp => !exp.departmentCategoryId && !exp.departmentCategoryName);
  }

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
  if (modalSort.value.key !== key) return 'fas fa-sort text-ink-subtle';
  return modalSort.value.direction === 'asc' ? 'fas fa-sort-up text-accent' : 'fas fa-sort-down text-accent';
}

function openDetails(group) {
  selectedGroup.value = group;
  selectedExpenseIds.value = [];
  clearModalFilters();
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

// ── Bulk action unificada: aplica departamento E/OU categoria de uma vez ──────
async function applyBulkBoth() {
  const n = selectedExpenseIds.value.length;
  if (!n) return;
  const hasDept = !!bulkDepartment.value;
  const hasCat = bulkCategoryId.value !== null;
  if (!hasDept && !hasCat) return;

  const catId = hasCat ? Number(bulkCategoryId.value) : null;
  const foundCat = hasCat ? categoryOptions.value.find(c => c.id === catId) : null;

  const partes = [
    hasDept ? `departamento "${bulkDepartment.value}"` : null,
    hasCat ? `categoria "${foundCat?.name}"` : null,
  ].filter(Boolean).join(' e ');

  if (!confirm(`Aplicar ${partes} em ${n} lançamento(s)?`)) return;

  // Monta 1 único payload por expense — backend grava ambos numa só requisição
  const payload = {};
  if (hasDept) payload.departmentName = bulkDepartment.value;
  if (hasCat) {
    payload.departmentCategoryId = catId;
    payload.departmentCategoryName = foundCat?.name || null;
  }

  try {
    await Promise.all(
      selectedExpenseIds.value.map(id => store.updateExpense(id, { ...payload }))
    );
    toast.success(`Aplicado em ${n} lançamento(s)!`);
    bulkCategoryId.value = null;
    bulkDepartment.value = '';
    selectedExpenseIds.value = [];
    await refreshAfterEdit();
  } catch (e) {
    toast.error(e.message || 'Erro ao aplicar.');
  }
}

// ── Modal de edição ───────────────────────────────────────
const editingExpense = ref(null);
const editSaving = ref(false);
const editForm = ref({
  departmentName: '',
  departmentCategoryId: null,
  description: '',
});

function openEditModal(exp) {
  editingExpense.value = exp;
  editForm.value = {
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

// ── Status helpers ────────────────────────────────────────
function expStatusVariant(status) {
  switch (status) {
    case 'paid':      return 'success';
    case 'cancelled': return 'danger';
    default:          return 'neutral';
  }
}
function expStatusLabel(status) {
  switch (status) {
    case 'paid':      return 'Pago';
    case 'cancelled': return 'Cancelado';
    case 'open':      return 'Em aberto';
    default:          return '—';
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
