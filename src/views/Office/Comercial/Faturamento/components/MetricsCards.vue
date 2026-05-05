<script setup>
import { computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';

const props = defineProps({
  metrics: { type: Object, required: true },
});

const contractsStore = useContractsStore();

const valueModeLabel = computed(() => contractsStore.valueModeLabel);
const isNet = computed(() => contractsStore.isNet);

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('pt-BR').format(value || 0);

const totalValue = computed(() =>
  isNet.value ? props.metrics.totalValueNet : props.metrics.totalValueGross
);
const avgTicket = computed(() =>
  isNet.value ? props.metrics.avgSaleValueNet : props.metrics.avgSaleValueGross
);

const cards = computed(() => [
  {
    key: 'totalSales',
    label: 'Total de vendas',
    value: formatNumber(props.metrics.totalSales),
    sub: 'no período',
    icon: 'fas fa-chart-line',
    accent: 'text-accent bg-accent-soft',
    tooltip: 'Quantidade de vendas únicas no período filtrado',
  },
  {
    key: 'totalValue',
    label: `Valor ${valueModeLabel.value}`,
    value: formatCurrency(totalValue.value),
    sub: isNet.value ? 'VGV (descontos ignorados)' : 'VGV + DC (descontos somam)',
    icon: isNet.value ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar',
    accent: isNet.value
      ? 'text-emerald-500 bg-emerald-500/10'
      : 'text-amber-500 bg-amber-500/10',
    tooltip: isNet.value
      ? 'Soma do VGV das vendas (descontos não somam)'
      : 'Soma do VGV+DC (descontos somam ao valor total)',
  },
  {
    key: 'avgTicket',
    label: `Ticket médio ${valueModeLabel.value}`,
    value: formatCurrency(avgTicket.value),
    sub: isNet.value ? 'VGV médio por venda' : 'VGV + DC médio por venda',
    icon: isNet.value ? 'fas fa-receipt' : 'fas fa-file-invoice-dollar',
    accent: isNet.value
      ? 'text-purple-500 bg-purple-500/10'
      : 'text-cyan-500 bg-cyan-500/10',
    tooltip: 'Valor total dividido pela quantidade de vendas',
  },
]);
</script>

<template>
  <section class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div v-for="k in cards" :key="k.key" v-tippy="k.tooltip"
      class="flex items-center gap-3 p-4 rounded-xl border border-line bg-surface-raised
             shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
             transition-all duration-200 ease-out-expo surface-gradient">
      <span class="h-11 w-11 rounded-xl grid place-items-center text-base shrink-0" :class="k.accent">
        <i :class="k.icon"></i>
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">{{ k.label }}</p>
        <p class="text-2xl font-semibold text-ink tabular-nums tracking-tight leading-tight mt-0.5 truncate">
          {{ k.value }}
        </p>
        <p class="text-[11px] text-ink-muted mt-0.5 truncate" :title="k.sub">{{ k.sub }}</p>
      </div>
    </div>
  </section>
</template>
