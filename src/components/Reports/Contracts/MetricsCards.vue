<template>
    <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-5 gap-4">
        <!-- Total de Vendas -->
        <Card title="Total de Vendas" :value="metrics.totalSales" label="Total de vendas realizadas"
            icon="fas fa-chart-line" class="!bg-blue-100/20 !border-blue-200/20" />

        <!-- Total de Contratos -->
        <Card title="Total Contratos" :value="metrics.totalContracts" label="Quantidade total de contratos"
            icon="fas fa-file-signature" class="!bg-indigo-100/20 !border-indigo-200/20" />

        <!-- Valor Total (Líquido) -->
        <Card title="Valor Líquido" :value="formatCurrency(metrics.totalValueNet)"
            label="Soma líquida (descontos subtraem)" icon="fas fa-money-bill-wave"
            class="!bg-green-100/20 !border-green-200/20" />

        <!-- Valor Total (Bruto) -->
        <Card title="Valor Bruto" :value="formatCurrency(metrics.totalValueGross)" label="Soma bruta (descontos somam)"
            icon="fas fa-sack-dollar" class="!bg-amber-100/20 !border-amber-200/20" />

        <!-- Ticket Médio (Líquido) -->
        <Card title="Ticket Médio Líquido" :value="formatCurrency(metrics.avgSaleValueNet)"
            label="Valor médio líquido por venda" icon="fas fa-receipt"
            class="!bg-purple-100/20 !border-purple-200/20" />

        <!-- Ticket Médio (Bruto) -->
        <Card title="Ticket Médio Bruto" :value="formatCurrency(metrics.avgSaleValueGross)"
            label="Valor médio bruto por venda" icon="fas fa-file-invoice-dollar"
            class="!bg-cyan-100/20 !border-cyan-200/20" />

        <!-- Empreendimentos -->
        <Card title="Empreendimentos" :value="metrics.totalEnterprises" label="Quantidade de empreendimentos"
            icon="fas fa-building" class="!bg-orange-100/20 !border-orange-200/20" />

    </div>
</template>

<script setup>
import Card from '@/components/Reports/Reservas/Card.vue'

defineProps({
    metrics: { type: Object, required: true }
})

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
</script>
