<script setup>
/**
 * Cartões de número do Dashboard de vendas.
 *
 * Passaram a usar `StatRow`/`StatCard`, o cartão único do Office, em vez da
 * grade própria que existia aqui: era uma das quatro implementações
 * independentes de "cartão de KPI" que o sistema tinha, cada uma com um tamanho
 * de ícone e um comportamento diferente no celular.
 *
 * `raw` + `format` (em vez de valor já formatado) é o que liga o count-up: o
 * número conta até o valor na chegada, que é o movimento de maior efeito e
 * menor risco da linguagem visual.
 */
import { computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import StatRow from '@/components/UI/StatRow.vue';

const props = defineProps({
  metrics: { type: Object, required: true },
});

const contractsStore = useContractsStore();

const valueModeLabel = computed(() => contractsStore.valueModeLabel);
const isNet = computed(() => contractsStore.isNet);

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('pt-BR').format(Math.round(value) || 0);

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
    raw: Number(props.metrics.totalSales) || 0,
    format: formatNumber,
    hint: 'vendas únicas no período',
    icon: 'fas fa-chart-line',
    tone: 'accent',
  },
  {
    key: 'totalValue',
    label: `Valor ${valueModeLabel.value}`,
    raw: Number(totalValue.value) || 0,
    format: formatCurrency,
    hint: isNet.value ? 'VGV (descontos ignorados)' : 'VGV + DC (descontos somam)',
    icon: isNet.value ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar',
    tone: 'pos',
  },
  {
    key: 'avgTicket',
    label: `Ticket médio ${valueModeLabel.value}`,
    raw: Number(avgTicket.value) || 0,
    format: formatCurrency,
    hint: 'valor total dividido pela quantidade de vendas',
    icon: 'fas fa-receipt',
    tone: 'accent',
  },
]);
</script>

<template>
  <!-- Três cartões: grade nas duas larguras, sem faixa rolável. -->
  <StatRow :items="cards" :cols="{ sm: 3, md: 3, lg: 3 }" :scroll-mobile="false" />
</template>
