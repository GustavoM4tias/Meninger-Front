<template>
    <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-4">
        <!-- Total de Vendas -->
        <Card title="Total de Vendas" :value="metrics.totalSales" label="Total de vendas realizadas"
            icon="fas fa-chart-line" class="!bg-blue-100/20 !border-blue-200/20" />

        <!-- Valor Total -->
        <Card title="Valor Total" :value="formatCurrency(metrics.totalValue)" label="Soma de todas as vendas"
            icon="fas fa-money-bill-wave" class="!bg-green-100/20 !border-green-200/20" />

        <!-- Ticket Médio -->
        <Card title="Ticket Médio" :value="formatCurrency(metrics.avgSaleValue)" label="Valor médio por venda"
            icon="fas fa-receipt" class="!bg-purple-100/20 !border-purple-200/20" />

        <!-- Empreendimentos -->
        <Card title="Empreendimentos" :value="metrics.totalEnterprises" label="Quantidade de empreendimentos"
            icon="fas fa-building" class="!bg-orange-100/20 !border-orange-200/20" />

        <!-- Total de Contratos -->
        <Card title="Total Contratos" :value="metrics.totalContracts" label="Quantidade total de contratos"
            icon="fas fa-file-signature" class="!bg-indigo-100/20 !border-indigo-200/20" />
    </div>
</template>

<script setup>
import Card from '@/components/Reports/Reservas/Card.vue'

defineProps({
    metrics: {
        type: Object,
        required: true
    }
})

const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}
</script>
