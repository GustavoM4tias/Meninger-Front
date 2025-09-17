<template>
  <div class="fixed inset-0 z-50 overflow-y-auto" @click="$emit('close')">
    <div class="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
      <div class="fixed inset-0 bg-gray-900/60 transition-opacity"></div>

      <div
        class="relative inline-block w-full max-w-7xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-50 dark:bg-gray-800 shadow-xl rounded-2xl"
        @click.stop>
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold">{{ enterprise.name }}</h3>
              <p class="text-sm">Detalhes das vendas do empreendimento</p>
            </div>

            <div class="flex items-center gap-2">
              <!-- Líquido/Bruto -->
              <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
                <button type="button" @click="contractsStore.setValueMode('net')"
                  :class="['px-3 py-1 text-sm font-medium', contractsStore.valueMode === 'net' ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100']">
                  Líquido
                </button>
                <button type="button" @click="contractsStore.setValueMode('gross')"
                  :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', contractsStore.valueMode === 'gross' ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100']">
                  Bruto
                </button>
              </div>

              <!-- Visualização -->
              <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
                <button type="button" @click="viewMode = 'list'"
                  :class="['px-3 py-1 text-sm font-medium', viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">
                  Listagem
                </button>
                <button type="button" @click="viewMode = 'pie'"
                  :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', viewMode === 'pie' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">
                  Pizza
                </button>
                <button type="button" @click="viewMode = 'bar'"
                  :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700', viewMode === 'bar' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600']">
                  Colunas
                </button>
              </div>

              <button type="button" @click="$emit('close')"
                class="text-dark hover:text-gray-700 dark:text-white dark:hover:text-blue-100 text-xl transition-colors">
                <i class="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="max-h=[80vh] overflow-y-auto">
          <!-- Cards (computados a partir de filteredSales) -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-blue-500">
                <div class="flex items-center justify-between h-full">
                  <div>
                    <p class="text-sm font-medium">Total de Vendas</p>
                    <p class="text-2xl font-bold text-blue-400">{{ totalSales }}</p>
                  </div>
                  <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl"><i
                      class="fas fa-chart-line text-blue-600"></i></div>
                </div>
              </div>

              <div
                class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-emerald-500">
                <div class="flex items-center justify-between h-full">
                  <div>
                    <p class="text-sm font-medium">Valor Total</p>
                    <p class="text-lg font-bold text-green-400">{{ formatCurrency(totalValue) }}</p>
                    <p class="text-xs text-gray-500">({{ valueModeLabel }})</p>
                    <p v-if="showLandOnlyNote" class="text-xs text-blue-500 mt-1">Cálculo pelo "Observação"</p>
                  </div>
                  <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl"><i
                      class="fas fa-money-bill-wave text-green-600"></i></div>
                </div>
              </div>

              <div
                class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-purple-500">
                <div class="flex items-center justify-between h-full">
                  <div>
                    <p class="text-sm font-medium">Ticket Médio</p>
                    <p class="text-lg font-bold text-purple-400">{{ formatCurrency(avgTicket) }}</p>
                    <p class="text-xs text-gray-500">({{ valueModeLabel }})</p>
                  </div>
                  <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl"><i
                      class="fas fa-receipt text-purple-600"></i></div>
                </div>
              </div>

              <div
                class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-orange-400">
                <div class="flex items-center justify-between h-full">
                  <div>
                    <p class="text-sm font-medium">Clientes Únicos</p>
                    <p class="text-2xl font-bold text-orange-400">{{ uniqueCustomers }}</p>
                  </div>
                  <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl"><i
                      class="fas fa-users text-orange-600"></i></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Filtros (busca original permanece) -->
          <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
            <div class="flex flex-wrap gap-4 items-end">
              <div class="flex-1">
                <label class="block text-sm font-medium mb-2">Busque por Cliente | Repasse | Empreendimento | Etapa |
                  Bloco | Unidade | Data | Valor</label>
                <input v-model="searchTerm" type="text" placeholder="Digite para buscar..."
                  class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-start">
              </div>
              <div class="flex-none">
                <label class="block text-sm font-medium mb-2">Itens por página</label>
                <select v-model="itemsPerPage"
                  class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-center">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>

          <!-- VIEW: LIST -->
          <template v-if="viewMode === 'list'">
            <!-- Tabela padrão -->
            <div>
              <div class="overflow-x-auto">
                <!-- === TABELA PADRÃO (reutilizada também no modo de gráficos) === -->
                <table class="w-full">
                  <thead class="border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cliente</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" v-if="hasRepasse">
                        Repasse</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" v-if="hasRepasse">
                        Empreendimento</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" v-if="hasRepasse">
                        Etapa</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" v-if="hasRepasse">
                        Bloco</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Unidade</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Data</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Valor <span
                          class="text-gray-400">({{ valueModeLabel }})</span></th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Contratos</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>

                  <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-700/40 dark:divide-gray-700">
                    <template v-for="sale in paginatedSales" :key="`${sale.customer_id}-${sale.unit_name}`">
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td class="px-4 py-3">
                          <div class="text-sm font-medium">
                            {{ sale.customer_name }} <span class="text-sm text-gray-500">#{{ sale.customer_id }}</span>
                          </div>
                        </td>
                        <td class="px-4 py-3 flex" v-if="hasRepasse">
                          <a :href="`https://menin.cvcrm.com.br/gestor/financeiro/repasses/${sale.contracts?.[0]?.repasse?.[0]?.idrepasse}/administrar`"
                            target="_blank" class="cursor-pointer my-auto"
                            v-tippy="sale.contracts?.[0]?.repasse?.[0]?.status_repasse">
                            <img src="/CVLogo.png" alt="CV CRM" class="w-5 min-w-5" />
                          </a>
                          <div class="text-sm ps-2">{{ sale.contracts?.[0]?.repasse?.[0]?.status_repasse || '—' }}</div>
                        </td>
                        <td class="px-4 py-3 truncate" v-if="hasRepasse">
                          <div class="text-sm">{{ sale.contracts?.[0]?.repasse?.[0]?.empreendimento || '—' }}</div>
                        </td>
                        <td class="px-4 py-3 truncate" v-if="hasRepasse">
                          <div class="text-sm">{{ sale.contracts?.[0]?.repasse?.[0]?.etapa || '—' }}</div>
                        </td>
                        <td class="px-4 py-3 truncate" v-if="hasRepasse">
                          <div class="text-sm">{{ sale.contracts?.[0]?.repasse?.[0]?.bloco || '—' }}</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <div class="text-sm">{{ sale.unit_name }}</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <div class="text-sm">{{ formatDate(sale.financial_institution_date) }}</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <div class="text-sm font-semibold text-green-600">{{ formatCurrency(getSaleValue(sale)) }}
                          </div>
                        </td>
                        <td class="px-4 py-3 text-center"><span
                            class="inline-flex items-center px-2.5 py-1 text-sm font-bold rounded-full bg-blue-100 text-blue-800">{{
                              sale.contracts.length }}</span></td>
                        <td class="px-4 py-3 text-center">
                          <button @click="toggleDetails(sale)"
                            class="text-sm font-medium text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 transition-colors">
                            {{ expandedSales.has(`${sale.customer_id}-${sale.unit_name}`) ? 'Ocultar' : 'Detalhes' }}
                          </button>
                        </td>
                      </tr>

                      <tr v-show="expandedSales.has(`${sale.customer_id}-${sale.unit_name}`)"
                        class="bg-gray-50 dark:bg-gray-900/60">
                        <td colspan="10">
                          <div v-for="contract in sale.contracts" :key="contract.contract_id" class="space-y-3">
                            <div class="bg-white dark:bg-gray-900/20 p-4 shadow">
                              <div class="flex items-center justify-between mb-3">
                                <span class="text-sm font-medium">Contrato #{{ contract.contract_id }}</span>
                                <span class="text-sm text-gray-500">Participação: {{ contract.participation_percentage
                                }}%</span>
                              </div>

                              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
                                :key="`${contractsStore.valueMode}-${contract.contract_id}`">
                                <div v-for="(condition, idx) in displayedConditions(contract)"
                                  :key="`${contract.contract_id}-${condition.synthetic ? 'SYNTH' : 'REAL'}-${condition.condition_type_id || 'NA'}-${idx}-${contractsStore.valueMode}`"
                                  class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border-l-4 shadow-sm"
                                  :class="isDiscount(condition) ? 'border-red-400' : 'border-emerald-400'">
                                  <div class="text-sm font-medium mb-1">
                                    {{ condition.condition_type_name || 'Não informado' }}
                                    <span v-if="condition.synthetic"
                                      class="ml-2 inline-flex items-center px-2 py-0.5 shadow-sm rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800">Campo
                                      de Observação</span>
                                    <button v-if="condition.synthetic" class="ps-1 text-gray-400"
                                      v-tippy="`Atualização D-1 as 07h`"><i class="fas fa-circle-info"></i></button>
                                  </div>
                                  <div class="text-lg font-semibold mb-1"
                                    :class="isDiscount(condition) ? 'text-red-600' : 'text-green-600'">
                                    {{ formatCurrency(condition.total_value) }}
                                    <span v-if="isDiscount(condition)" class="text-xs ml-1">(desconto)</span>
                                  </div>
                                  <div class="text-xs text-gray-500">Código: {{ condition.condition_type_id || '—' }}
                                  </div>
                                  <div v-if="condition.installments_number" class="text-xs text-gray-500">{{
                                    condition.installments_number }}x parcelas</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
                <!-- === /TABELA PADRÃO === -->
              </div>

              <!-- Paginação -->
              <div v-if="totalPages > 1" class="m-4 flex items-center justify-between">
                <div class="text-sm text-gray-500">Mostrando {{ startItem }} a {{ endItem }} de {{ filteredSales.length
                }} vendas
                </div>
                <div class="flex items-center gap-2">
                  <button @click="currentPage = 1" :disabled="currentPage === 1"
                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">Primeira</button>
                  <button @click="currentPage--" :disabled="currentPage === 1"
                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"><i
                      class="fas fa-chevron-left"></i></button>
                  <div class="flex gap-1">
                    <button v-for="page in visiblePages" :key="page" @click="currentPage = page"
                      :class="['px-3 py-1 text-sm border rounded-md', page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900']">{{
                        page }}</button>
                  </div>
                  <button @click="currentPage++" :disabled="currentPage === totalPages"
                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"><i
                      class="fas fa-chevron-right"></i></button>
                  <button @click="currentPage = totalPages" :disabled="currentPage === totalPages"
                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">Última</button>
                </div>
              </div>
            </div>
          </template>

          <!-- VIEW: CHARTS (pizza/colunas) -->
          <template v-else>
            <!-- Gráfico em tela cheia (largura total) -->
            <div class="p-6">
              <div class="min-h-[360px]">
                <VChart :option="chartOption" autoresize style="height: 360px; width: 100%;" />
              </div>
              <div class="flex justify-end mt-2">
                <ChartActions filename="vendas-por-imobiliaria" />
              </div>
            </div>

            <!-- Reuso da TABELA PADRÃO abaixo do gráfico -->
            <div>
              <div class="overflow-x-auto">
                <!-- (copiado da seção de listagem para manter layout idêntico) -->
                <table class="w-full">
                  <thead class="border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cliente</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" v-if="hasRepasse">
                        Repasse</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" v-if="hasRepasse">
                        Empreendimento</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" v-if="hasRepasse">
                        Etapa</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" v-if="hasRepasse">
                        Bloco</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Unidade</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Data</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Valor <span
                          class="text-gray-400">({{ valueModeLabel }})</span></th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Contratos</th>
                      <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>

                  <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-700/40 dark:divide-gray-700">
                    <template v-for="sale in paginatedSales" :key="`${sale.customer_id}-${sale.unit_name}`">
                      <!-- (mesmas linhas/expansão que a listagem) -->
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td class="px-4 py-3">
                          <div class="text-sm font-medium">
                            {{ sale.customer_name }} <span class="text-sm text-gray-500">#{{ sale.customer_id }}</span>
                          </div>
                        </td>
                        <td class="px-4 py-3 flex" v-if="hasRepasse">
                          <a :href="`https://menin.cvcrm.com.br/gestor/financeiro/repasses/${sale.contracts?.[0]?.repasse?.[0]?.idrepasse}/administrar`"
                            target="_blank" class="cursor-pointer my-auto"
                            v-tippy="sale.contracts?.[0]?.repasse?.[0]?.status_repasse">
                            <img src="/CVLogo.png" alt="CV CRM" class="w-5 min-w-5" />
                          </a>
                          <div class="text-sm ps-2">{{ sale.contracts?.[0]?.repasse?.[0]?.status_repasse || '—' }}</div>
                        </td>
                        <td class="px-4 py-3 truncate" v-if="hasRepasse">
                          <div class="text-sm">{{ sale.contracts?.[0]?.repasse?.[0]?.empreendimento || '—' }}</div>
                        </td>
                        <td class="px-4 py-3 truncate" v-if="hasRepasse">
                          <div class="text-sm">{{ sale.contracts?.[0]?.repasse?.[0]?.etapa || '—' }}</div>
                        </td>
                        <td class="px-4 py-3 truncate" v-if="hasRepasse">
                          <div class="text-sm">{{ sale.contracts?.[0]?.repasse?.[0]?.bloco || '—' }}</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <div class="text-sm">{{ sale.unit_name }}</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <div class="text-sm">{{ formatDate(sale.financial_institution_date) }}</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <div class="text-sm font-semibold text-green-600">{{ formatCurrency(getSaleValue(sale)) }}
                          </div>
                        </td>
                        <td class="px-4 py-3 text-center"><span
                            class="inline-flex items-center px-2.5 py-1 text-sm font-bold rounded-full bg-blue-100 text-blue-800">{{
                              sale.contracts.length }}</span></td>
                        <td class="px-4 py-3 text-center">
                          <button @click="toggleDetails(sale)"
                            class="text-sm font-medium text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 transition-colors">
                            {{ expandedSales.has(`${sale.customer_id}-${sale.unit_name}`) ? 'Ocultar' : 'Detalhes' }}
                          </button>
                        </td>
                      </tr>

                      <tr v-show="expandedSales.has(`${sale.customer_id}-${sale.unit_name}`)"
                        class="bg-gray-50 dark:bg-gray-900/60">
                        <td colspan="10">
                          <div v-for="contract in sale.contracts" :key="contract.contract_id" class="space-y-3">
                            <div class="bg-white dark:bg-gray-900/20 p-4 shadow">
                              <div class="flex items-center justify-between mb-3">
                                <span class="text-sm font-medium">Contrato #{{ contract.contract_id }}</span>
                                <span class="text-sm text-gray-500">Participação: {{ contract.participation_percentage
                                }}%</span>
                              </div>

                              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
                                :key="`${contractsStore.valueMode}-${contract.contract_id}`">
                                <div v-for="(condition, idx) in displayedConditions(contract)"
                                  :key="`${contract.contract_id}-${condition.synthetic ? 'SYNTH' : 'REAL'}-${condition.condition_type_id || 'NA'}-${idx}-${contractsStore.valueMode}`"
                                  class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border-l-4 shadow-sm"
                                  :class="isDiscount(condition) ? 'border-red-400' : 'border-emerald-400'">
                                  <div class="text-sm font-medium mb-1">
                                    {{ condition.condition_type_name || 'Não informado' }}
                                    <span v-if="condition.synthetic"
                                      class="ml-2 inline-flex items-center px-2 py-0.5 shadow-sm rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800">Campo
                                      de Observação</span>
                                    <button v-if="condition.synthetic" class="ps-1 text-gray-400"
                                      v-tippy="`Atualização D-1 as 07h`"><i class="fas fa-circle-info"></i></button>
                                  </div>
                                  <div class="text-lg font-semibold mb-1"
                                    :class="isDiscount(condition) ? 'text-red-600' : 'text-green-600'">
                                    {{ formatCurrency(condition.total_value) }}
                                    <span v-if="isDiscount(condition)" class="text-xs ml-1">(desconto)</span>
                                  </div>
                                  <div class="text-xs text-gray-500">Código: {{ condition.condition_type_id || '—' }}
                                  </div>
                                  <div v-if="condition.installments_number" class="text-xs text-gray-500">{{
                                    condition.installments_number }}x parcelas</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>

              <!-- Paginação -->
              <div v-if="totalPages > 1" class="m-4 flex items-center justify-between">
                <div class="text-sm text-gray-500">Mostrando {{ startItem }} a {{ endItem }} de {{ filteredSales.length
                }} vendas
                </div>
                <div class="flex items-center gap-2">
                  <button @click="currentPage = 1" :disabled="currentPage === 1"
                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">Primeira</button>
                  <button @click="currentPage--" :disabled="currentPage === 1"
                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"><i
                      class="fas fa-chevron-left"></i></button>
                  <div class="flex gap-1">
                    <button v-for="page in visiblePages" :key="page" @click="currentPage = page"
                      :class="['px-3 py-1 text-sm border rounded-md', page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900']">{{
                        page }}</button>
                  </div>
                  <button @click="currentPage++" :disabled="currentPage === totalPages"
                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"><i
                      class="fas fa-chevron-right"></i></button>
                  <button @click="currentPage = totalPages" :disabled="currentPage === totalPages"
                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">Última</button>
                </div>
              </div>
            </div>
          </template>
        </div> <!-- /content -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useContractsStore } from '@/stores/Reports/Contracts/contractsStore'
import ChartActions from '@/components/config/ChartActions.vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const props = defineProps({
  enterprise: { type: Object, required: true },
  sales: { type: Array, required: true },
  initialMode: { type: String, default: 'list' } // 'list' | 'pie' | 'bar'
})
defineEmits(['close'])

const contractsStore = useContractsStore()
const viewMode = ref(['list', 'pie', 'bar'].includes(props.initialMode) ? props.initialMode : 'list')

/* utils */
const valueModeLabel = computed(() => contractsStore.valueModeLabel)
const getSaleValue = (sale) => contractsStore.valuePicker(sale)
const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0)
const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR')
const isDiscount = (c) => contractsStore.discountCodes.has(String(c?.condition_type_id || '').toUpperCase())

/* busca/paginação */
const searchTerm = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(25)
const expandedSales = ref(new Set())

const normalizedSearch = computed(() => (searchTerm.value || '').toLowerCase())
const filteredSales = computed(() => {
  if (!normalizedSearch.value) return props.sales
  const t = normalizedSearch.value
  const has = (s = '') => String(s).toLowerCase().includes(t)
  return props.sales.filter(sale =>
    has(sale.customer_name) ||
    has(sale.unit_name) ||
    has(sale.contracts?.[0]?.repasse?.[0]?.bloco) ||
    has(sale.contracts?.[0]?.repasse?.[0]?.etapa) ||
    has(sale.contracts?.[0]?.repasse?.[0]?.empreendimento) ||
    has(sale.contracts?.[0]?.repasse?.[0]?.status_repasse) ||
    has(formatDate(sale.financial_institution_date)) ||
    has(formatCurrency(getSaleValue(sale)))
  )
})

/* cards -> filteredSales */
const showLandOnlyNote = computed(() =>
  contractsStore.isGross &&
  (filteredSales.value ?? []).some(s => (s.contracts ?? []).some(c => contractsStore.enterpriseRuleFor(c)?.gross === 'LAND_VALUE_ONLY'))
)
const totalSales = computed(() => filteredSales.value.length)
const totalValue = computed(() => filteredSales.value.reduce((s, sale) => s + getSaleValue(sale), 0))
const avgTicket = computed(() => totalSales.value ? totalValue.value / totalSales.value : 0)
const uniqueCustomers = computed(() => new Set(filteredSales.value.map(s => s.customer_id)).size)

/* paginação (reutilizada em ambos modos) */
const totalPages = computed(() => Math.ceil(filteredSales.value.length / itemsPerPage.value) || 1)
const startItem = computed(() => (currentPage.value - 1) * itemsPerPage.value + 1)
const endItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, filteredSales.value.length))
const paginatedSales = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredSales.value.slice(start, start + itemsPerPage.value)
})
const visiblePages = computed(() => {
  const max = 5
  let start = Math.max(1, currentPage.value - Math.floor(max / 2))
  let end = Math.min(totalPages.value, start + max - 1)
  if (end - start + 1 < max) start = Math.max(1, end - max + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const hasRepasse = computed(() => paginatedSales.value.some(s => s.contracts?.[0]?.repasse?.[0]))

watch([searchTerm, itemsPerPage], () => { currentPage.value = 1 })
watch(() => props.sales, () => { expandedSales.value.clear() })

const toggleDetails = (sale) => {
  const key = `${sale.customer_id}-${sale.unit_name}`
  const next = new Set(expandedSales.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expandedSales.value = next
}

/* detalhe/condições */
const displayedConditions = (contract) => {
  const landOnly = contractsStore.isGrossLandOnlyForContract(contract)
  const lv = Number(contract?.land_value) || 0
  if (landOnly && lv > 0) {
    return [{ condition_type_id: 'TR', condition_type_name: 'Terreno (TR)', total_value: lv, installments_number: 1, synthetic: true }]
  }
  return Array.isArray(contract?.payment_conditions) ? contract.payment_conditions : []
}

/* charts (sobre filteredSales) */
const brokerNameOf = (sale) => {
  const c = [
    sale?.contracts?.[0]?.reserva?.corretor?.imobiliaria,
    sale?.reserva?.corretor?.imobiliaria,
    sale?.contracts?.[0]?.corretor?.imobiliaria,
    sale?.corretor?.imobiliaria,
    typeof sale?.imobiliaria === 'string'
      ? sale?.imobiliaria
      : sale?.imobiliaria?.nomefantasia || sale?.imobiliaria?.razaosocial || sale?.imobiliaria?.email || sale?.imobiliaria?.cnpj
  ].find(v => typeof v === 'string' && v.trim())
  return c ? String(c).trim() : 'Sem imobiliária'
}
const keyOf = (n) => (n || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

const rowsByBroker = computed(() => {
  const map = new Map()
  for (const sale of filteredSales.value) {
    const name = brokerNameOf(sale)
    const key = keyOf(name)
    const prev = map.get(key) ?? { name, count: 0, value: 0 }
    const v = getSaleValue(sale) || 0
    prev.count += 1
    prev.value += v
    map.set(key, prev)
  }
  return [...map.values()].sort((a, b) => b.value - a.value)
})

const totals = computed(() => ({
  count: rowsByBroker.value.reduce((s, r) => s + r.count, 0),
  value: rowsByBroker.value.reduce((s, r) => s + r.value, 0)
}))

/* ECharts */
const chartOption = computed(() => {
  if (viewMode.value === 'pie') {
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p) => `${p.name}<br/><b>${formatCurrency(p.value)}</b> (${p.percent}%)`
      },
      legend: {
        type: 'scroll',                 // ativa scroll
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 6,
        textStyle: {
          fontSize: 10,                 // menor
          color: '#9CA3AF'              // cinza fixo
        },
        pageTextStyle: { color: '#9CA3AF' },
        pageIconColor: '#9CA3AF',
        pageIconInactiveColor: '#D1D5DB'
      },
      series: [{
        name: 'Vendas por Imobiliária',
        type: 'pie',
        radius: ['40%', '70%'],
        padAngle: 1,
        itemStyle: { borderRadius: 6 },
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 'bold' } },
        data: rowsByBroker.value.map(r => ({
          name: `${r.name} (${r.count})`,
          value: r.value
        }))
      }]
    }
  }

  // BARRAS
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => formatCurrency(v)
    },
    grid: { left: 64, right: 64, top: 42, bottom: 64, containLabel: true },
    xAxis: {
      type: 'category',
      data: rowsByBroker.value.map(r => r.name),
      axisLabel: {
        interval: 0,
        rotate: 20,
        fontSize: 10,          // menor texto
        color: '#9CA3AF',
        formatter: (val) => {
          return val.length > 12 ? val.slice(0, 12) + '…' : val // corta texto longo
        }
      },
      axisLine: { lineStyle: { color: '#9CA3AF' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        formatter: (v) =>
          new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
          }).format(v)
      },
      splitLine: { lineStyle: { color: '#E5E7EB' } }
    },
    series: [{
      name: `Valor (${valueModeLabel.value})`,
      type: 'bar',
      barWidth: '70%',
      data: rowsByBroker.value.map(r => ({
        value: r.value,
        count: r.count   // quantidade de vendas
      })),
      itemStyle: { borderRadius: [6, 6, 0, 0] },
      label: {
        show: true,
        position: 'top',
        fontSize: 10,
        color: '#9CA3AF',
        formatter: (params) => `${params.data.count}`
      }
    }]
  }
})

</script>
