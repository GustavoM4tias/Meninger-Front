<script setup>
import { computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import StatRow from '@/components/UI/StatRow.vue';

const props = defineProps({
  metrics: { type: Object, required: true },
});

const contractsStore = useContractsStore();

const isNet = computed(() => contractsStore.isNet);
const valueModeLabel = computed(() => contractsStore.valueModeLabel);

const realizedVgv = computed(() =>
  isNet.value ? props.metrics.totalValueNet : props.metrics.totalValueGross
);

const avgTicket = computed(() =>
  isNet.value ? props.metrics.avgSaleValueNet : props.metrics.avgSaleValueGross
);

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('pt-BR').format(Math.round(value) || 0);

// ── Achievement % helpers ──────────────────────────────────
const achievementStr = computed(() => {
  const a = props.metrics.achievementPct;
  if (a == null) return '—';
  return `${a.toFixed(1)}%`;
});

const aggregateModeLabel = computed(() => {
  const mode = props.metrics.aggregateMode;
  if (mode === 'units') return 'Unidades';
  if (mode === 'vgv')   return 'VGV';
  if (mode === 'mixed') return 'Misto';
  return null;
});

const achievementLabel = computed(() => {
  const pct = props.metrics.achievementPct;
  const elapsed = props.metrics.timeElapsedPct ?? 0;
  if (pct == null) return 'Sem projeção definida';

  let status;
  if (elapsed === 0) {
    status = pct >= 100 ? 'Acima da meta' : 'Abaixo da meta';
  } else {
    const ratio = pct / elapsed;
    if (ratio >= 1.1) status = 'Acima da meta';
    else if (ratio >= 0.8) status = 'Na meta';
    else if (ratio >= 0.4) status = 'Em alerta';
    else status = 'Em risco';
  }

  const mode = aggregateModeLabel.value;
  return mode ? `${status} · base ${mode}` : status;
});

// Tom do cartão no vocabulário do StatCard. `data-pos/neg/warn` são cores de
// JUÍZO e nunca viram série - é exatamente o uso aqui.
const achievementTone = computed(() => {
  const pct = props.metrics.achievementPct;
  const elapsed = props.metrics.timeElapsedPct ?? 0;
  if (pct == null) return 'neutral';
  if (elapsed === 0) return pct >= 100 ? 'pos' : 'warn';
  const ratio = pct / elapsed;
  if (ratio >= 1.1) return 'pos';
  if (ratio >= 0.8) return 'accent';
  if (ratio >= 0.4) return 'warn';
  return 'neg';
});

const achievementIcon = computed(() => {
  const pct = props.metrics.achievementPct;
  const elapsed = props.metrics.timeElapsedPct ?? 0;
  if (pct == null) return 'fas fa-trophy';
  if (elapsed === 0) return pct >= 100 ? 'fas fa-fire' : 'fas fa-exclamation';
  const ratio = pct / elapsed;
  if (ratio >= 1.1) return 'fas fa-fire';
  if (ratio >= 0.8) return 'fas fa-trophy';
  if (ratio >= 0.4) return 'fas fa-triangle-exclamation';
  return 'fas fa-skull';
});

// ── Cartões ──────────────────────────────────────────────
// `raw` + `format` ligam o count-up; `value` só onde contar não faz sentido
// (a % atingida pode ser "—" quando não há projeção definida).
const realizedCards = computed(() => [
  {
    key: 'totalSales', label: 'Total de vendas', icon: 'fas fa-chart-line', tone: 'accent',
    raw: Number(props.metrics.totalSales) || 0, format: formatNumber,
    hint: 'realizadas no período',
  },
  {
    key: 'realizedVgv', label: `Realizado ${valueModeLabel.value}`, tone: 'pos',
    icon: isNet.value ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar',
    raw: Number(realizedVgv.value) || 0, format: formatCurrency,
    hint: isNet.value ? 'VGV (descontos ignorados)' : 'VGV + DC (descontos somam)',
  },
  {
    key: 'projectedUnits', label: 'Vendas projetadas', icon: 'fas fa-key', tone: 'accent',
    raw: Number(props.metrics.projectedUnits) || 0, format: formatNumber,
    hint: 'unidades projetadas no período',
  },
  {
    key: 'projectedVgv', label: 'Meta projetada', icon: 'fas fa-bullseye', tone: 'accent',
    raw: Number(props.metrics.projectedVgv) || 0, format: formatCurrency,
    hint: 'VGV total projetado no período',
  },
]);

const ticketsCards = computed(() => [
  {
    key: 'avgTicket', label: `Ticket médio ${valueModeLabel.value}`, tone: 'accent',
    icon: isNet.value ? 'fas fa-receipt' : 'fas fa-file-invoice-dollar',
    raw: Number(avgTicket.value) || 0, format: formatCurrency,
    hint: isNet.value ? 'VGV médio por venda' : 'VGV + DC médio por venda',
  },
  {
    // Era `text-teal-500`, cor crua fora da paleta. Série 4 é cor de DADO, que
    // é o que este número é: o par projetado do ticket realizado.
    key: 'avgProjectedTicket', label: 'Ticket médio proj.', icon: 'fas fa-tag', tone: 4,
    raw: Number(props.metrics.avgProjectedTicket) || 0, format: formatCurrency,
    hint: 'VGV projetado ÷ unidades projetadas',
  },
  {
    key: 'achievement', label: '% Atingida', icon: achievementIcon.value,
    tone: achievementTone.value, value: achievementStr.value,
    hint: achievementLabel.value,
  },
]);
</script>

<template>
  <section class="space-y-3">
    <!-- Realizado x projetado -->
    <StatRow :items="realizedCards" :cols="{ sm: 2, md: 2, lg: 4 }" />
    <!-- Tickets + % atingida -->
    <StatRow :items="ticketsCards" :cols="{ sm: 2, md: 3, lg: 3 }" />
  </section>
</template>
