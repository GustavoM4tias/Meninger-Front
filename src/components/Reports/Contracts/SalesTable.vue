<template>
    <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">Vendas Detalhadas</h3>
                    <p class="text-sm text-gray-600">{{ filteredSales.length }} vendas encontradas</p>
                </div>
                <div class="inline-flex rounded-md border border-gray-200 overflow-hidden">
                    <button @click="valueMode = 'net'"
                        :class="['px-3 py-1 text-sm font-medium', valueMode === 'net' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700']"
                        title="Considera desconto como negativo">
                        VGV
                    </button>
                    <button @click="valueMode = 'gross'"
                        :class="['px-3 py-1 text-sm font-medium border-l border-gray-200', valueMode === 'gross' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700']"
                        title="Considera desconto somando">
                        VGV+DC
                    </button>
                </div>
            </div>
        </div>

        <div v-if="filteredSales.length === 0" class="p-12 text-center text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Nenhuma venda encontrada</p>
        </div>

        <div v-else class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unidade</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Empreendimento</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor Total <span class="text-gray-400">({{ valueModeLabel }})</span>
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contratos</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="sale in paginatedSales" :key="`${sale.customer_id}-${sale.unit_name}`"
                        class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4">
                            <div class="text-sm font-medium text-gray-900">{{ sale.customer_name }}</div>
                            <div class="text-sm text-gray-500">ID: {{ sale.customer_id }}</div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="text-sm text-gray-900">{{ sale.unit_name }}</div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="text-sm text-gray-900 max-w-xs truncate">{{ sale.enterprise_name }}</div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="text-sm text-gray-900">{{ formatDate(sale.financial_institution_date) }}</div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="text-sm font-semibold text-green-600">
                                {{ formatCurrency(displayTotal(sale)) }}
                            </div>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <span
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {{ sale.contracts.length }} {{ sale.contracts.length === 1 ? 'contrato' : 'contratos' }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <button @click="toggleDetails(sale)"
                                class="text-blue-600 hover:text-blue-900 text-sm font-medium">
                                {{ expandedSales.has(`${sale.customer_id}-${sale.unit_name}`) ? 'Ocultar' : 'Detalhes'
                                }}
                            </button>
                        </td>
                    </tr>

                    <!-- Linha expandida -->
                    <tr v-for="sale in paginatedSales" :key="`${sale.customer_id}-${sale.unit_name}-details`"
                        v-show="expandedSales.has(`${sale.customer_id}-${sale.unit_name}`)" class="bg-gray-50">
                        <td colspan="7" class="px-6 py-4">
                            <div class="space-y-4">
                                <h4 class="font-medium text-gray-900">Condições de Pagamento:</h4>

                                <div v-for="contract in sale.contracts" :key="contract.contract_id" class="space-y-2">
                                    <div class="flex items-center justify-between bg-white p-3 rounded-lg">
                                        <span class="text-sm font-medium text-gray-700">Contrato: {{
                                            contract.contract_id }}</span>
                                        <span class="text-sm text-gray-600">Participação: {{
                                            contract.participation_percentage }}%</span>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-4">
                                        <div v-for="condition in contract.payment_conditions"
                                            :key="`${contract.contract_id}-${condition.condition_type_id}`"
                                            class="bg-white p-3 rounded border-l-4"
                                            :class="isDiscount(condition) ? 'border-red-400' : 'border-blue-400'">
                                            <div class="text-sm font-medium text-gray-800">
                                                {{ condition.condition_type_name }}
                                            </div>
                                            <div class="text-lg font-semibold"
                                                :class="isDiscount(condition) ? 'text-red-600' : 'text-green-600'">
                                                {{ formatCurrency(condition.total_value) }}
                                                <span v-if="isDiscount(condition)"
                                                    class="text-xs text-gray-500 ml-1">(desconto)</span>
                                            </div>
                                            <div class="text-xs text-gray-500">
                                                {{ condition.condition_type_id }}
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

        <!-- Paginação -->
        <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200">
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-700">
                    Mostrando {{ startItem }} a {{ endItem }} de {{ filteredSales.length }} vendas
                </div>
                <div class="flex items-center gap-2">
                    <button @click="currentPage = 1" :disabled="currentPage === 1"
                        class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Primeira</button>
                    <button @click="currentPage--" :disabled="currentPage === 1"
                        class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                    <div class="flex gap-1">
                        <button v-for="page in visiblePages" :key="page" @click="currentPage = page" :class="[
                            'px-3 py-1 text-sm border rounded-md',
                            page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'
                        ]">
                            {{ page }}
                        </button>
                    </div>
                    <button @click="currentPage++" :disabled="currentPage === totalPages"
                        class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Próxima</button>
                    <button @click="currentPage = totalPages" :disabled="currentPage === totalPages"
                        class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Última</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
    // Agora cada venda tem: total_value_net, total_value_gross
    sales: { type: Array, required: true }
})

const searchTerm = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(100)
const expandedSales = ref(new Set())
const valueMode = ref('net') // 'net' | 'gross'
const valueModeLabel = computed(() => (valueMode.value === 'net' ? 'VGV' : 'VGV+DC'))

const filteredSales = computed(() => {
    if (!searchTerm.value) return props.sales
    const term = searchTerm.value.toLowerCase()
    return props.sales.filter(sale =>
        (sale.customer_name || '').toLowerCase().includes(term) ||
        (sale.unit_name || '').toLowerCase().includes(term) ||
        (sale.enterprise_name || '').toLowerCase().includes(term)
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

const toggleDetails = (sale) => {
    const key = `${sale.customer_id}-${sale.unit_name}`
    if (expandedSales.value.has(key)) expandedSales.value.delete(key)
    else expandedSales.value.add(key)
}

const displayTotal = (sale) => valueMode.value === 'net' ? sale.total_value_net : sale.total_value_gross

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR')

const discountCodes = new Set(['DC', 'DESCONTO_CONSTRUTORA'])
const isDiscount = (condition) =>
    discountCodes.has(String(condition.condition_type_id || '').toUpperCase())

// Reset paginação ao mudar filtros
watch([searchTerm, itemsPerPage, valueMode], () => { currentPage.value = 1 })

// Reset detalhes ao mudar dados
watch(() => props.sales, () => { expandedSales.value.clear() })
</script>
