<template>
    <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">Vendas por Empreendimento</h3>
                    <p class="text-sm text-gray-600">Performance de cada empreendimento</p>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Modo de valor: Líquido / Bruto -->
                    <div class="inline-flex rounded-md border border-gray-200 overflow-hidden">
                        <button @click="valueMode = 'net'"
                            :class="['px-3 py-1 text-sm font-medium', valueMode === 'net' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700']"
                            title="Considera desconto como negativo">
                            Líquido
                        </button>
                        <button @click="valueMode = 'gross'"
                            :class="['px-3 py-1 text-sm font-medium border-l border-gray-200', valueMode === 'gross' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700']"
                            title="Considera desconto somando">
                            Bruto
                        </button>
                    </div>

                    <!-- Ordenação -->
                    <button @click="sortBy = sortBy === 'count' ? 'count-desc' : 'count'" :class="[
                        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                        sortBy.includes('count') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                    ]">
                        Quantidade
                        <svg v-if="sortBy === 'count'" class="w-3 h-3 inline ml-1" fill="currentColor"
                            viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                                clip-rule="evenodd" />
                        </svg>
                        <svg v-else-if="sortBy === 'count-desc'" class="w-3 h-3 inline ml-1" fill="currentColor"
                            viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clip-rule="evenodd" />
                        </svg>
                    </button>
                    <button @click="sortBy = sortBy === 'value' ? 'value-desc' : 'value'" :class="[
                        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                        sortBy.includes('value') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                    ]">
                        Valor
                        <svg v-if="sortBy === 'value'" class="w-3 h-3 inline ml-1" fill="currentColor"
                            viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                                clip-rule="evenodd" />
                        </svg>
                        <svg v-else-if="sortBy === 'value-desc'" class="w-3 h-3 inline ml-1" fill="currentColor"
                            viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <div v-if="sortedData.length === 0" class="p-12 text-center text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p>Nenhum empreendimento encontrado</p>
        </div>

        <div v-else class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Empreendimento</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vendas</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor Total <span class="text-gray-400">({{ valueModeLabel }})</span>
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ticket Médio <span class="text-gray-400">({{ valueModeLabel }})</span>
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participação</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="(enterprise, index) in sortedData" :key="enterprise.name"
                        class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div :style="{ backgroundColor: getColor(index) }" class="w-3 h-3 rounded-full mr-3">
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-gray-900 line-clamp-2">
                                        {{ enterprise.name }}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="text-sm font-semibold text-gray-900">
                                {{ enterprise.count }}
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="text-sm font-semibold text-green-600">
                                {{ formatCurrency(displayTotal(enterprise)) }}
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="text-sm text-gray-900">
                                {{ formatCurrency(displayTotal(enterprise) / (enterprise.count || 1)) }}
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="flex items-center justify-end">
                                <div class="text-sm text-gray-900 mr-2">
                                    {{ getPercentage(displayTotal(enterprise)) }}%
                                </div>
                                <div class="w-16 bg-gray-200 rounded-full h-2">
                                    <div :style="{ width: `${getPercentage(displayTotal(enterprise))}%`, backgroundColor: getColor(index) }"
                                        class="h-2 rounded-full transition-all duration-300" />
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <button @click="openEnterpriseModal(enterprise)"
                                class="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
                                <i class="fas fa-eye mr-1"></i>
                                Detalhes
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Modal de Detalhes do Empreendimento -->
        <EnterpriseDetailModal v-if="showModal" :enterprise="selectedEnterprise" :sales="enterpriseSales"
            :value-mode="valueMode" @close="closeModal" />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useContractsStore } from '@/stores/Reports/Contracts/contractsStore'
import EnterpriseDetailModal from './EnterpriseDetailModal.vue'

const props = defineProps({
    data: { type: Array, required: true }
})

const contractsStore = useContractsStore()
const sortBy = ref('value-desc')
const valueMode = ref('net')
const showModal = ref(false)
const selectedEnterprise = ref(null)

const valueModeLabel = computed(() => (valueMode.value === 'net' ? 'Líquido' : 'Bruto'))

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1']

const valOf = (item) => (valueMode.value === 'net' ? item.total_value_net : item.total_value_gross)

const sortedData = computed(() => {
    const data = [...props.data]
    switch (sortBy.value) {
        case 'count': return data.sort((a, b) => a.count - b.count)
        case 'count-desc': return data.sort((a, b) => b.count - a.count)
        case 'value': return data.sort((a, b) => valOf(a) - valOf(b))
        case 'value-desc':
        default: return data.sort((a, b) => valOf(b) - valOf(a))
    }
})

const totalValue = computed(() => props.data.reduce((sum, item) => sum + valOf(item), 0))

const enterpriseSales = computed(() => {
    if (!selectedEnterprise.value) return []
    return contractsStore.uniqueSales.filter(sale =>
        sale.enterprise_name === selectedEnterprise.value.name
    )
})

const displayTotal = (item) => valOf(item)
const getColor = (index) => colors[index % colors.length]
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0)
const getPercentage = (value) => totalValue.value === 0 ? 0 : Math.round((value / totalValue.value) * 100)

const openEnterpriseModal = (enterprise) => {
    selectedEnterprise.value = enterprise
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    selectedEnterprise.value = null
}
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>