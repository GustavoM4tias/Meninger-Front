<template>
    <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-4">
        <!-- Total de Vendas -->
        <Card title="Total de Vendas" :value="metrics.totalSales" label="Total de vendas realizadas"
            icon="fas fa-chart-line" class="!bg-blue-100/30 !border-blue-200/30" />

        <!-- Total de Contratos -->
        <Card title="Total Contratos" :value="metrics.totalContracts" label="Quantidade total de contratos"
            icon="fas fa-file-signature" class="!bg-indigo-100/30 !border-indigo-200/30" />

        <!-- Valor Total (dinâmico: Líquido/Bruto) -->
        <Card :title="valueTitle" :value="formatCurrency(totalValueDynamic)" :label="valueLabel" :icon="valueIcon"
            :class="valueCardColorClass" />

        <!-- Ticket Médio (dinâmico: Líquido/Bruto) -->
        <Card :title="ticketTitle" :value="formatCurrency(avgTicketDynamic)" :label="ticketLabel" :icon="ticketIcon"
            :class="ticketCardColorClass" />

        <!-- Empreendimentos -->
        <Card title="Empreendimentos" :value="metrics.totalEnterprises" label="Quantidade de empreendimentos"
            icon="fas fa-building" class="!bg-orange-100/30 !border-orange-200/30" />
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useContractsStore } from '@/stores/Reports/Contracts/contractsStore'
import Card from '@/components/Reports/Reservas/Card.vue'

const props = defineProps({
    metrics: { type: Object, required: true }
})

const contractsStore = useContractsStore()

// Títulos / rótulos dinâmicos
const valueModeLabel = computed(() => contractsStore.valueModeLabel)
const valueTitle = computed(() => `Valor ${valueModeLabel.value}`)
const ticketTitle = computed(() => `Ticket Médio ${valueModeLabel.value}`)

const valueLabel = computed(() =>
    contractsStore.isNet
        ? 'Soma líquida (descontos subtraem)'
        : 'Soma bruta (descontos somam)'
)
const ticketLabel = computed(() =>
    contractsStore.isNet
        ? 'Valor médio líquido por venda'
        : 'Valor médio bruto por venda'
)

// Ícones dinâmicos
const valueIcon = computed(() => contractsStore.isNet ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar')
const ticketIcon = computed(() => contractsStore.isNet ? 'fas fa-receipt' : 'fas fa-file-invoice-dollar')

// Cores dinâmicas (opcional, só pra manter o mesmo “tema” visual de antes)
const valueCardColorClass = computed(() =>
    contractsStore.isNet ? '!bg-green-100/30 !border-green-200/30' : '!bg-amber-100/30 !border-amber-200/30'
)
const ticketCardColorClass = computed(() =>
    contractsStore.isNet ? '!bg-purple-100/30 !border-purple-200/30' : '!bg-cyan-100/30 !border-cyan-200/30'
)

// Valores exibidos conforme o modo global
const totalValueDynamic = computed(() =>
    contractsStore.isNet ? props.metrics.totalValueNet : props.metrics.totalValueGross
)
const avgTicketDynamic = computed(() =>
    contractsStore.isNet ? props.metrics.avgSaleValueNet : props.metrics.avgSaleValueGross
)

// Util
const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
</script>
