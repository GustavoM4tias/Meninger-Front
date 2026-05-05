<script setup>
import { computed } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';

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
  new Intl.NumberFormat('pt-BR').format(value || 0);

// ── Achievement % helpers ──────────────────────────────────
const achievementStr = computed(() => {
  const a = props.metrics.achievementPct;
  if (a == null) return '—';
  return `${a.toFixed(1)}%`;
});

const achievementLabel = computed(() => {
  const pct = props.metrics.achievementPct;
  const elapsed = props.metrics.timeElapsedPct ?? 0;
  if (pct == null) return 'Sem projeção definida';
  if (elapsed === 0) return pct >= 100 ? 'Acima da meta' : 'Abaixo da meta';
  const ratio = pct / elapsed;
  if (ratio >= 1.1) return 'Acima da meta';
  if (ratio >= 0.8) return 'Na meta';
  if (ratio >= 0.4) return 'Em alerta';
  return 'Em risco';
});

const achievementAccent = computed(() => {
  const pct = props.metrics.achievementPct;
  const elapsed = props.metrics.timeElapsedPct ?? 0;
  if (pct == null) return 'text-ink-muted bg-surface-sunken';
  if (elapsed === 0) {
    return pct >= 100
      ? 'text-emerald-500 bg-emerald-500/10'
      : 'text-yellow-500 bg-yellow-500/10';
  }
  const ratio = pct / elapsed;
  if (ratio >= 1.1) return 'text-emerald-500 bg-emerald-500/10';
  if (ratio >= 0.8) return 'text-blue-500 bg-blue-500/10';
  if (ratio >= 0.4) return 'text-yellow-500 bg-yellow-500/10';
  return 'text-red-500 bg-red-500/10';
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

// ── Cards ────────────────────────────────────────────────
const realizedCards = computed(() => [
  {
    key: 'totalSales',
    label: 'Total de vendas',
    value: formatNumber(props.metrics.totalSales),
    sub: 'realizadas no período',
    icon: 'fas fa-chart-line',
    accent: 'text-accent bg-accent-soft',
  },
  {
    key: 'realizedVgv',
    label: `Realizado ${valueModeLabel.value}`,
    value: formatCurrency(realizedVgv.value),
    sub: isNet.value ? 'VGV (descontos ignorados)' : 'VGV + DC (descontos somam)',
    icon: isNet.value ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar',
    accent: isNet.value
      ? 'text-emerald-500 bg-emerald-500/10'
      : 'text-amber-500 bg-amber-500/10',
  },
  {
    key: 'projectedUnits',
    label: 'Vendas projetadas',
    value: formatNumber(props.metrics.projectedUnits ?? 0),
    sub: 'unidades projetadas no período',
    icon: 'fas fa-key',
    accent: 'text-violet-500 bg-violet-500/10',
  },
  {
    key: 'projectedVgv',
    label: 'Meta projetada',
    value: formatCurrency(props.metrics.projectedVgv),
    sub: 'VGV total projetado no período',
    icon: 'fas fa-bullseye',
    accent: 'text-sky-500 bg-sky-500/10',
  },
]);

const ticketsCards = computed(() => [
  {
    key: 'avgTicket',
    label: `Ticket médio ${valueModeLabel.value}`,
    value: formatCurrency(avgTicket.value),
    sub: isNet.value ? 'VGV médio por venda' : 'VGV + DC médio por venda',
    icon: isNet.value ? 'fas fa-receipt' : 'fas fa-file-invoice-dollar',
    accent: isNet.value
      ? 'text-purple-500 bg-purple-500/10'
      : 'text-cyan-500 bg-cyan-500/10',
  },
  {
    key: 'avgProjectedTicket',
    label: 'Ticket médio proj.',
    value: formatCurrency(props.metrics.avgProjectedTicket),
    sub: 'VGV projetado ÷ unidades projetadas',
    icon: 'fas fa-tag',
    accent: 'text-teal-500 bg-teal-500/10',
  },
  {
    key: 'achievement',
    label: '% Atingida',
    value: achievementStr.value,
    sub: achievementLabel.value,
    icon: achievementIcon.value,
    accent: achievementAccent.value,
  },
]);
</script>

<template>
  <section class="space-y-3">
    <!-- Realizado vs projetado -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div v-for="k in realizedCards" :key="k.key"
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
    </div>

    <!-- Tickets + % Atingida -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="k in ticketsCards" :key="k.key"
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
    </div>
  </section>
</template>
