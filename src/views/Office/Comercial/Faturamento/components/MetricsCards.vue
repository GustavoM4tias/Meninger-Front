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

// Com o interruptor "Sem distratos", o cartão diz quantas ficaram de fora -
// senão o total cai sem explicação e a pessoa procura venda que sumiu.
const foraDaConta = computed(() => Number(props.metrics.distratosForaDaConta) || 0);
const hintVendas = computed(() => foraDaConta.value > 0
  ? `vendas únicas no período · ${foraDaConta.value} distratada(s) fora da conta`
  : 'vendas únicas no período');

const cards = computed(() => [
  {
    key: 'totalSales',
    label: 'Total de vendas',
    raw: Number(props.metrics.totalSales) || 0,
    format: formatNumber,
    hint: hintVendas.value,
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
