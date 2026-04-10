<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">

    <!-- Total de Vendas -->
    <Card title="Total de Vendas" :value="metrics.totalSales" label="Total de vendas realizadas"
      icon="fas fa-chart-line" class="!bg-blue-300/30 !border-blue-400/30" />

    <!-- Valor VGV / VGV+DC -->
    <Card :title="`Valor ${valueModeLabel}`" :value="formatCurrency(realizedVgv)" :label="vgvLabel"
      :icon="isNet ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar'"
      :class="isNet ? '!bg-green-300/30 !border-green-400/30' : '!bg-amber-300/30 !border-amber-400/30'" />

    <!-- Empreendimentos -->
    <!-- <Card
      title="Empreendimentos"
      :value="metrics.totalEnterprises"
      label="Quantidade de empreendimentos"
      icon="fas fa-building"
      class="!bg-orange-300/30 !border-orange-400/30" /> -->

    <!-- Vendas Projetadas (unidades) -->
    <Card title="Vendas Projetadas" :value="metrics.projectedUnits ?? 0" label="Unidades projetadas no período"
      icon="fas fa-key" class="!bg-violet-300/30 !border-violet-400/30" />

    <!-- Meta Projetada (VGV) -->
    <Card title="Meta Projetada" :value="formatCurrency(metrics.projectedVgv)" label="VGV total projetado no período"
      icon="fas fa-bullseye" class="!bg-sky-300/30 !border-sky-400/30" />

  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

    <!-- Ticket Médio Realizado -->
    <Card :title="`Ticket Médio ${valueModeLabel}`" :value="formatCurrency(avgTicket)" :label="ticketLabel"
      :icon="isNet ? 'fas fa-receipt' : 'fas fa-file-invoice-dollar'"
      :class="isNet ? '!bg-purple-300/30 !border-purple-400/30' : '!bg-cyan-300/30 !border-cyan-400/30'" />

    <!-- Ticket Médio Projetado -->
    <Card title="Ticket Médio Proj." :value="formatCurrency(metrics.avgProjectedTicket)"
      label="VGV projetado ÷ unidades projetadas" icon="fas fa-tag" class="!bg-teal-300/30 !border-teal-400/30" />

    <!-- % Atingida -->
    <Card title="% Atingida" :value="achievementStr" :label="achievementLabel" icon="fas fa-trophy"
      :class="achievementColorClass" />

  </div>

</template>

<script setup>
import { computed } from 'vue'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import Card from '@/components/UI/Card.vue'

const props = defineProps({
  metrics: { type: Object, required: true },
})

const contractsStore = useContractsStore()

const isNet = computed(() => contractsStore.isNet)
const valueModeLabel = computed(() => contractsStore.valueModeLabel)

const realizedVgv = computed(() =>
  isNet.value ? props.metrics.totalValueNet : props.metrics.totalValueGross
)

const avgTicket = computed(() =>
  isNet.value ? props.metrics.avgSaleValueNet : props.metrics.avgSaleValueGross
)

const vgvLabel = computed(() =>
  isNet.value ? 'VGV (descontos ignorados)' : 'VGV + DC (descontos somam)'
)

const ticketLabel = computed(() =>
  isNet.value ? 'VGV médio por venda' : 'VGV + DC médio por venda'
)

const achievementStr = computed(() => {
  const a = props.metrics.achievementPct
  if (a == null) return '—'
  return `${a.toFixed(1)}%`
})

const achievementLabel = computed(() => {
  const pct = props.metrics.achievementPct
  const elapsed = props.metrics.timeElapsedPct ?? 0
  if (pct == null) return 'Sem projeção definida'
  if (elapsed === 0) return pct >= 100 ? 'Acima da meta' : 'Abaixo da meta'
  const ratio = pct / elapsed
  if (ratio >= 1.1) return 'Acima da meta'
  if (ratio >= 0.8) return 'Na meta'
  if (ratio >= 0.4) return 'Em alerta'
  return 'Em risco'
})

const achievementColorClass = computed(() => {
  const pct = props.metrics.achievementPct
  const elapsed = props.metrics.timeElapsedPct ?? 0
  if (pct == null) return '!bg-gray-300/30 !border-gray-400/30'
  if (elapsed === 0) return pct >= 100
    ? '!bg-emerald-300/30 !border-emerald-400/30'
    : '!bg-yellow-300/30 !border-yellow-400/30'
  const ratio = pct / elapsed
  if (ratio >= 1.1) return '!bg-emerald-300/30 !border-emerald-400/30'
  if (ratio >= 0.8) return '!bg-blue-300/30 !border-blue-400/30'
  if (ratio >= 0.4) return '!bg-yellow-300/30 !border-yellow-400/30'
  return '!bg-red-300/30 !border-red-400/30'
})

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
</script>
