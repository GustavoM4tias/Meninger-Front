<template>
    <!-- Modal Overlay -->
    <div class="fixed inset-0 z-50 overflow-y-auto" @click="$emit('close')">
        <div class="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <!-- Background overlay -->
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

            <!-- Modal panel -->
            <div class="relative inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
                @click.stop>
                <!-- Header -->
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <div class="flex items-center justify-between text-white">
                        <div>
                            <h3 class="text-xl font-bold">{{ enterprise.name }}</h3>
                            <p class="text-blue-100 text-sm">Detalhes das vendas do empreendimento</p>
                        </div>
                        <div class="flex items-center gap-4">
                            <!-- Value Mode Toggle -->
                            <div class="inline-flex rounded-lg border border-blue-400 overflow-hidden bg-blue-500">
                                <button @click="localValueMode = 'net'"
                                    :class="['px-3 py-1 text-sm font-medium transition-colors', localValueMode === 'net' ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-400']">
                                    Líquido
                                </button>
                                <button @click="localValueMode = 'gross'"
                                    :class="['px-3 py-1 text-sm font-medium transition-colors border-l border-blue-400', localValueMode === 'gross' ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-400']">
                                    Bruto
                                </button>
                            </div>
                            <button @click="$emit('close')" class="text-white hover:text-blue-200 transition-colors">
                                <i class="fas fa-times text-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="max-h-[80vh] overflow-y-auto">
                    <!-- Summary Cards -->
                    <div class="p-6 border-b border-gray-200 bg-gray-50">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div class="bg-white rounded-lg p-4 shadow-sm border">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Total de Vendas</p>
                                        <p class="text-2xl font-bold text-gray-900">{{ sales.length }}</p>
                                    </div>
                                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-chart-line text-blue-600"></i>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-lg p-4 shadow-sm border">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Valor Total</p>
                                        <p class="text-lg font-bold text-green-600">{{ formatCurrency(totalValue) }}</p>
                                        <p class="text-xs text-gray-500">({{ valueModeLabel }})</p>
                                    </div>
                                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-money-bill-wave text-green-600"></i>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-lg p-4 shadow-sm border">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Ticket Médio</p>
                                        <p class="text-lg font-bold text-purple-600">{{ formatCurrency(avgTicket) }}</p>
                                        <p class="text-xs text-gray-500">({{ valueModeLabel }})</p>
                                    </div>
                                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-receipt text-purple-600"></i>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white rounded-lg p-4 shadow-sm border">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Clientes Únicos</p>
                                        <p class="text-2xl font-bold text-gray-900">{{ uniqueCustomers }}</p>
                                    </div>
                                    <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-users text-orange-600"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex flex-wrap gap-4 items-end">
                            <div class="flex-1 min-w-64">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Buscar Cliente ou
                                    Unidade</label>
                                <input v-model="searchTerm" type="text" placeholder="Digite para buscar..."
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            <div class="flex-none">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Itens por página</label>
                                <select v-model="itemsPerPage"
                                    class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Sales Table -->
                    <div class="p-6">
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th
                                            class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cliente</th>
                                        <th
                                            class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Unidade</th>
                                        <th
                                            class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data</th>
                                        <th
                                            class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Valor <span class="text-gray-400">({{ valueModeLabel }})</span>
                                        </th>
                                        <th
                                            class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contratos</th>
                                        <th
                                            class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ações</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-for="sale in paginatedSales" :key="`${sale.customer_id}-${sale.unit_name}`"
                                        class="hover:bg-gray-50 transition-colors">
                                        <td class="px-4 py-3">
                                            <div class="text-sm font-medium text-gray-900">{{ sale.customer_name }}
                                            </div>
                                            <div class="text-sm text-gray-500">ID: {{ sale.customer_id }}</div>
                                        </td>
                                        <td class="px-4 py-3">
                                            <div class="text-sm text-gray-900">{{ sale.unit_name }}</div>
                                        </td>
                                        <td class="px-4 py-3">
                                            <div class="text-sm text-gray-900">{{
                                                formatDate(sale.financial_institution_date) }}</div>
                                        </td>
                                        <td class="px-4 py-3 text-right">
                                            <div class="text-sm font-semibold text-green-600">
                                                {{ formatCurrency(getSaleValue(sale)) }}
                                            </div>
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <span
                                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {{ sale.contracts.length }}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <button @click="toggleDetails(sale)"
                                                class="text-sm font-medium text-blue-600 hover:text-blue-900 transition-colors">
                                                {{ expandedSales.has(`${sale.customer_id}-${sale.unit_name}`) ?
                                                'Ocultar' : 'Detalhes' }}
                                            </button>
                                        </td>
                                    </tr>

                                    <!-- Expanded Details Row -->
                                    <tr v-for="sale in paginatedSales"
                                        :key="`${sale.customer_id}-${sale.unit_name}-details`"
                                        v-show="expandedSales.has(`${sale.customer_id}-${sale.unit_name}`)"
                                        class="bg-blue-50">
                                        <td colspan="6" class="px-4 py-4">
                                            <div class="space-y-4">
                                                <h4 class="font-medium text-gray-900 mb-3">Detalhes dos Contratos:</h4>

                                                <div v-for="contract in sale.contracts" :key="contract.contract_id"
                                                    class="space-y-3">
                                                    <div class="bg-white rounded-lg p-4 border border-gray-200">
                                                        <div class="flex items-center justify-between mb-3">
                                                            <span class="text-sm font-medium text-gray-700">
                                                                Contrato #{{ contract.contract_id }}
                                                            </span>
                                                            <span class="text-sm text-gray-600">
                                                                Participação: {{ contract.participation_percentage }}%
                                                            </span>
                                                        </div>

                                                        <div
                                                            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            <div v-for="condition in contract.payment_conditions"
                                                                :key="`${contract.contract_id}-${condition.condition_type_id}`"
                                                                class="bg-gray-50 rounded-lg p-3 border-l-4"
                                                                :class="isDiscount(condition) ? 'border-red-400' : 'border-blue-400'">
                                                                <div class="text-sm font-medium text-gray-800 mb-1">
                                                                    {{ condition.condition_type_name || 'Não informado'
                                                                    }}
                                                                </div>
                                                                <div class="text-lg font-semibold mb-1"
                                                                    :class="isDiscount(condition) ? 'text-red-600' : 'text-green-600'">
                                                                    {{ formatCurrency(condition.total_value) }}
                                                                    <span v-if="isDiscount(condition)"
                                                                        class="text-xs text-gray-500 ml-1">
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
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination -->
                        <div v-if="totalPages > 1" class="mt-6 flex items-center justify-between">
                            <div class="text-sm text-gray-700">
                                Mostrando {{ startItem }} a {{ endItem }} de {{ filteredSales.length }} vendas
                            </div>
                            <div class="flex items-center gap-2">
                                <button @click="currentPage = 1" :disabled="currentPage === 1"
                                    class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Primeira
                                </button>
                                <button @click="currentPage--" :disabled="currentPage === 1"
                                    class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Anterior
                                </button>
                                <div class="flex gap-1">
                                    <button v-for="page in visiblePages" :key="page" @click="currentPage = page" :class="[
                                        'px-3 py-1 text-sm border rounded-md',
                                        page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'
                                    ]">
                                        {{ page }}
                                    </button>
                                </div>
                                <button @click="currentPage++" :disabled="currentPage === totalPages"
                                    class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Próxima
                                </button>
                                <button @click="currentPage = totalPages" :disabled="currentPage === totalPages"
                                    class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
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

const props = defineProps({
    enterprise: { type: Object, required: true },
    sales: { type: Array, required: true },
    valueMode: { type: String, default: 'net' }
})

defineEmits(['close'])

const localValueMode = ref(props.valueMode)
const searchTerm = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(25)
const expandedSales = ref(new Set())

const valueModeLabel = computed(() => (localValueMode.value === 'net' ? 'Líquido' : 'Bruto'))

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

const getSaleValue = (sale) => {
    return localValueMode.value === 'net' ? sale.total_value_net : sale.total_value_gross
}

const toggleDetails = (sale) => {
    const key = `${sale.customer_id}-${sale.unit_name}`
    if (expandedSales.value.has(key)) {
        expandedSales.value.delete(key)
    } else {
        expandedSales.value.add(key)
    }
}

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('pt-BR')

const discountCodes = new Set(['DC', 'DESCONTO_CONSTRUTORA'])
const isDiscount = (condition) =>
    discountCodes.has(String(condition.condition_type_id || '').toUpperCase())

// Reset pagination when filters change
watch([searchTerm, itemsPerPage], () => {
    currentPage.value = 1
})

// Reset expanded sales when sales change
watch(() => props.sales, () => {
    expandedSales.value.clear()
})

// Sync local value mode with prop
watch(() => props.valueMode, (newValue) => {
    localValueMode.value = newValue
})

</script>