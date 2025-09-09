<template>
    <!-- Modal Overlay -->
    <div class="fixed inset-0 z-50 overflow-y-auto" @click="$emit('close')">
        <div class="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <!-- Background overlay -->
            <div class="fixed inset-0 bg-gray-900/60 transition-opacity"></div>

            <!-- Modal panel -->
            <div class="relative inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-50 dark:bg-gray-800 shadow-xl rounded-2xl"
                @click.stop>
                <!-- Header -->
                <div class="px-6 py-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-xl font-bold">{{ enterprise.name }}</h3>
                            <p class="text-sm">Detalhes das vendas do empreendimento</p>
                        </div>
                        <div class="flex items-center gap-4">
                            <!-- Value Mode Toggle -->
                            <div class="inline-flex rounded-lg border dark:border-gray-600 overflow-hidden">
                                <button @click="contractsStore.setValueMode('net')"
                                    :class="['px-3 py-1 text-sm font-medium', contractsStore.valueMode === 'net' ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100']">
                                    Líquido
                                </button>
                                <button @click="contractsStore.setValueMode('gross')"
                                    :class="['px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-600', contractsStore.valueMode === 'gross' ? 'bg-blue-600 dark:bg-blue-700 text-white dark:text-gray-100' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-100']">
                                    Bruto
                                </button>
                            </div>
                            <button @click="$emit('close')"
                                class="text-dark hover:text-gray-700 dark:text-white dark:hover:text-blue-100 text-xl transition-colors">
                                <i class="fas fa-times text-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="max-h-[80vh] overflow-y-auto">
                    <!-- Summary Cards -->
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div
                                class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 hover:scale-[101%] duration-100 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-blue-500">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">Total de Vendas</p>
                                        <p class="text-2xl font-bold text-blue-400">{{ sales.length }}</p>
                                    </div>
                                    <div
                                        class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-chart-line text-blue-600"></i>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 hover:scale-[101%] duration-100 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-emerald-500">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">Valor Total</p>
                                        <p class="text-lg font-bold text-green-400">{{ formatCurrency(totalValue) }}</p>
                                        <p class="text-xs text-gray-500">({{ valueModeLabel }})</p>
                                        <p v-if="showLandOnlyNote" class="text-xs text-blue-500 mt-1">
                                            Calculo pelo "Observação"
                                        </p>
                                    </div>
                                    <div
                                        class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-money-bill-wave text-green-600"></i>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 hover:scale-[101%] duration-100 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-purple-500">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">Ticket Médio</p>
                                        <p class="text-lg font-bold text-purple-400">{{ formatCurrency(avgTicket) }}</p>
                                        <p class="text-xs text-gray-500">({{ valueModeLabel }})</p>
                                    </div>
                                    <div
                                        class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-receipt text-purple-600"></i>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 hover:scale-[101%] duration-100 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-orange-400">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">Clientes Únicos</p>
                                        <p class="text-2xl font-bold text-orange-400">{{ uniqueCustomers }}</p>
                                    </div>
                                    <div
                                        class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-users text-orange-600"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
                        <div class="flex flex-wrap gap-4 items-end">
                            <div class="flex-1">
                                <label class="block text-sm font-medium mb-2">
                                    Buscar Cliente ou
                                    Unidade
                                </label>
                                <input v-model="searchTerm" type="text" placeholder="Digite para buscar..."
                                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-start">
                            </div>
                            <div class="flex-none">
                                <label class="block text-sm font-medium mb-2">
                                    Itens por página
                                </label>
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

                    <!-- Sales Table -->
                    <div>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Cliente</th>
                                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                            Repasse</th>
                                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                            Etapa</th>
                                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                            Bloco</th>
                                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                            Unidade</th>
                                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                            Data</th>
                                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                            Valor <span class="text-gray-400">({{ valueModeLabel }})</span>
                                        </th>
                                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                            Contratos</th>
                                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                            Ações</th>
                                    </tr>
                                </thead>
                                <tbody
                                    class="bg-white divide-y divide-gray-200 dark:bg-gray-700/40 dark:divide-gray-700">
                                    <template v-for="sale in paginatedSales"
                                        :key="`${sale.customer_id}-${sale.unit_name}`">
                                        <!-- Linha principal -->
                                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td class="px-4 py-3">
                                                <div class="text-sm font-medium">
                                                    {{ sale.customer_name }}
                                                    <span class="text-sm text-gray-500">#{{ sale.customer_id }}</span>
                                                </div>
                                            </td>
                                            <td class="flex py-6">
                                                <a :href="`https://menin.cvcrm.com.br/gestor/financeiro/repasses/${sale.contracts?.[0]?.repasse?.[0]?.idrepasse}/administrar`"
                                                    target="_blank" class="cursor-pointer m-auto"
                                                    v-tippy="sale.contracts?.[0]?.repasse?.[0]?.status_repasse">
                                                    <img src="/CVLogo.png" alt="CV CRM" class="w-5 min-w-5" />
                                                </a>
                                            </td>
                                            <td class="px-4 py-3">
                                                <div class="text-sm">{{ sale.contracts?.[0]?.repasse?.[0]?.etapa || '—'
                                                }}</div>
                                            </td>
                                            <td class="px-4 py-3">
                                                <div class="text-sm">{{ sale.contracts?.[0]?.repasse?.[0]?.bloco || '—'
                                                }}</div>
                                            </td>
                                            <td class="px-4 py-3">
                                                <div class="text-sm">{{ sale.unit_name }}</div>
                                            </td>
                                            <td class="px-4 py-3">
                                                <div class="text-sm">{{ formatDate(sale.financial_institution_date) }}
                                                </div>
                                            </td>
                                            <td class="px-4 py-3 text-right">
                                                <div class="text-sm font-semibold text-green-600">
                                                    {{ formatCurrency(getSaleValue(sale)) }}
                                                </div>
                                            </td>
                                            <td class="px-4 py-3 text-center">
                                                <span
                                                    class="inline-flex items-center px-2.5 py-1 text-sm font-bold rounded-full bg-blue-100 text-blue-800">
                                                    {{ sale.contracts.length }}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3 text-center">
                                                <button @click="toggleDetails(sale)"
                                                    class="text-sm font-medium text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 transition-colors">
                                                    {{ expandedSales.has(`${sale.customer_id}-${sale.unit_name}`) ?
                                                        'Ocultar' : 'Detalhes' }}
                                                </button>
                                            </td>
                                        </tr>

                                        <!-- Linha de detalhes logo abaixo da linha principal -->
                                        <tr v-show="expandedSales.has(`${sale.customer_id}-${sale.unit_name}`)"
                                            class="bg-gray-50 dark:bg-gray-900/60">
                                            <td colspan="9">

                                                <div v-for="contract in sale.contracts" :key="contract.contract_id"
                                                    class="space-y-3">
                                                    <div class="bg-white dark:bg-gray-900/20 p-4 shadow">
                                                        <div class="flex items-center justify-between mb-3">
                                                            <span class="text-sm font-medium">
                                                                Contrato #{{ contract.contract_id }}
                                                            </span>
                                                            <span class="text-sm text-gray-500">
                                                                Participação: {{ contract.participation_percentage
                                                                }}%
                                                            </span>
                                                        </div>

                                                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
                                                            :key="`${contractsStore.valueMode}-${contract.contract_id}`">
                                                            <div v-for="(condition, idx) in displayedConditions(contract)"
                                                                :key="`${contract.contract_id}-${condition.synthetic ? 'SYNTH' : 'REAL'}-${condition.condition_type_id || 'NA'}-${idx}-${contractsStore.valueMode}`"
                                                                class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border-l-4 shadow-sm"
                                                                :class="isDiscount(condition) ? 'border-red-400' : 'border-emerald-400'">
                                                                <div class="text-sm font-medium mb-1">
                                                                    {{ condition.condition_type_name || 'Não informado'
                                                                    }}
                                                                    <span v-if="condition.synthetic"
                                                                        class="ml-2 inline-flex items-center px-2 py-0.5 shadow-sm rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800">
                                                                        Campo de Observação
                                                                    </span>
                                                                    <button v-if="condition.synthetic"
                                                                        class="ps-1 text-gray-400"
                                                                        v-tippy="`Atualização D-1 as 07h`">
                                                                        <i class="fas fa-circle-info"></i>
                                                                    </button>
                                                                </div>

                                                                <div class="text-lg font-semibold mb-1"
                                                                    :class="isDiscount(condition) ? 'text-red-600' : 'text-green-600'">
                                                                    {{ formatCurrency(condition.total_value) }}
                                                                    <span v-if="isDiscount(condition)"
                                                                        class="text-xs ml-1">
                                                                        (desconto)
                                                                    </span>
                                                                </div>
                                                                <div class="text-xs text-gray-500">
                                                                    Código: {{ condition.condition_type_id || '—' }}
                                                                </div>
                                                                <div v-if="condition.installments_number"
                                                                    class="text-xs text-gray-500">
                                                                    {{ condition.installments_number }}x parcelas
                                                                </div>
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

                        <!-- Pagination -->
                        <div v-if="totalPages > 1" class="m-4 flex items-center justify-between">
                            <div class="text-sm text-gray-500">
                                Mostrando {{ startItem }} a {{ endItem }} de {{ filteredSales.length }} vendas
                            </div>
                            <div class="flex items-center gap-2">
                                <button @click="currentPage = 1" :disabled="currentPage === 1"
                                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Primeira
                                </button>
                                <button @click="currentPage--" :disabled="currentPage === 1"
                                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <div class="flex gap-1">
                                    <button v-for="page in visiblePages" :key="page" @click="currentPage = page" :class="[
                                        'px-3 py-1 text-sm border rounded-md',
                                        page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900'
                                    ]">
                                        {{ page }}
                                    </button>
                                </div>
                                <button @click="currentPage++" :disabled="currentPage === totalPages"
                                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                                <button @click="currentPage = totalPages" :disabled="currentPage === totalPages"
                                    class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Última
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useContractsStore } from '@/stores/Reports/Contracts/contractsStore'

const props = defineProps({
    enterprise: { type: Object, required: true },
    sales: { type: Array, required: true },
})

// regra ativa para o empreendimento deste modal
const contractsStore = useContractsStore()
// Avise no header se houver qualquer contrato no dataset com LAND_VALUE_ONLY em modo Bruto
const showLandOnlyNote = computed(() =>
    contractsStore.isGross &&
    (props.sales ?? []).some(sale =>
        (sale.contracts ?? []).some(c => contractsStore.enterpriseRuleFor(c)?.gross === 'LAND_VALUE_ONLY')
    )
)

console.log(props.sales)
defineEmits(['close'])

const searchTerm = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(25)
const expandedSales = ref(new Set())

const valueModeLabel = computed(() => contractsStore.valueModeLabel)

const filteredSales = computed(() => {
    if (!searchTerm.value) return props.sales
    const term = searchTerm.value.toLowerCase()
    return props.sales.filter(sale =>
        (sale.customer_name || '').toLowerCase().includes(term) ||
        (sale.unit_name || '').toLowerCase().includes(term)
    )
})

const totalPages = computed(() => Math.ceil(filteredSales.value.length / itemsPerPage.value))
const startItem = computed(() => (currentPage.value - 1) * itemsPerPage.value + 1)
const endItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, filteredSales.value.length))

const paginatedSales = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredSales.value.slice(start, end)
})

const visiblePages = computed(() => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages.value, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
})

const totalValue = computed(() => {
    return filteredSales.value.reduce((sum, sale) => sum + getSaleValue(sale), 0)
})

const avgTicket = computed(() => {
    return filteredSales.value.length > 0 ? totalValue.value / filteredSales.value.length : 0
})

const uniqueCustomers = computed(() => {
    return new Set(filteredSales.value.map(sale => sale.customer_id)).size
})

const getSaleValue = (sale) => contractsStore.valuePicker(sale)

const isDiscount = (condition) =>
    contractsStore.discountCodes.has(String(condition?.condition_type_id || '').toUpperCase())

const toggleDetails = (sale) => {
    const key = `${sale.customer_id}-${sale.unit_name}`
    const next = new Set(expandedSales.value)
    next.has(key) ? next.delete(key) : next.add(key)
    expandedSales.value = next
}


const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('pt-BR')

// Condições para exibição no detalhe de cada contrato
// Condições para exibição no detalhe de cada contrato
const displayedConditions = (contract) => {
    const applyLandOnly = contractsStore.isGrossLandOnlyForContract(contract)
    const lv = Number(contract?.land_value) || 0

    // Em BRUTO  regra LAND_VALUE_ONLY para ESTE contrato:
    //   -> esconda quaisquer TR reais e exiba UM card 'synthetic' com o land_value
    if (applyLandOnly && lv > 0) {
        return [{
            condition_type_id: 'TR',
            condition_type_name: 'Terreno (TR)',
            total_value: lv,
            installments_number: 1,
            synthetic: true
        }]
    }

    // Caso normal: mantenha as condições originais
    return Array.isArray(contract?.payment_conditions)
        ? contract.payment_conditions
        : []
}
// Reset pagination when filters change
watch([searchTerm, itemsPerPage], () => {
    currentPage.value = 1
})

// Reset expanded sales when sales change
watch(() => props.sales, () => {
    expandedSales.value.clear()
})

</script>