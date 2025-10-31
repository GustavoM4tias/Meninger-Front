<template>
    <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-4">
        <!-- Total de Vendas -->
        <Card title="Total de Vendas" :value="metrics.totalSales" label="Total de vendas realizadas"
            icon="fas fa-chart-line" class="!bg-blue-300/30 !border-blue-400/30" />

        <!-- Total de Contratos -->
        <Card title="Total Contratos" :value="metrics.totalContracts" label="Quantidade total de contratos"
            icon="fas fa-file-signature" class="!bg-indigo-300/30 !border-indigo-400/30" />

        <!-- Valor Total (dinâmico: VGV/VGV+DC) -->
        <Card :title="valueTitle" :value="formatCurrency(totalValueDynamic)" :label="valueLabel" :icon="valueIcon"
            :class="valueCardColorClass" />

        <!-- Ticket Médio (dinâmico: VGV/VGV+DC) -->
        <Card :title="ticketTitle" :value="formatCurrency(avgTicketDynamic)" :label="ticketLabel" :icon="ticketIcon"
            :class="ticketCardColorClass" />

        <!-- Empreendimentos -->
        <Card title="Empreendimentos" :value="metrics.totalEnterprises" label="Quantidade de empreendimentos"
            icon="fas fa-building" class="!bg-orange-300/30 !border-orange-400/30" />
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import Card from '@/components/UI/Card.vue'

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
        ? 'VGV (descontos ignorados)'
        : 'VGV + DC (descontos somam)'
)
const ticketLabel = computed(() =>
    contractsStore.isNet
        ? 'VGV médio por venda'
        : 'VGV + DC médio por venda'
)

// Ícones dinâmicos
const valueIcon = computed(() => contractsStore.isNet ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar')
const ticketIcon = computed(() => contractsStore.isNet ? 'fas fa-receipt' : 'fas fa-file-invoice-dollar')

// Cores dinâmicas (opcional, só pra manter o mesmo “tema” visual de antes)
const valueCardColorClass = computed(() =>
    contractsStore.isNet ? '!bg-green-300/30 !border-green-400/30' : '!bg-amber-300/30 !border-amber-400/30'
)
const ticketCardColorClass = computed(() =>
    contractsStore.isNet ? '!bg-purple-300/30 !border-purple-400/30' : '!bg-cyan-300/30 !border-cyan-400/30'
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
