<script setup>
import { computed } from 'vue';
import { iconForStage, clsForStage, STAGE_ORDER } from '../stages.js';

const props = defineProps({
  periodo: { type: Object, required: true },
  kpi: { type: Object, required: true },
  tempoMedio: { type: Number, default: 0 },
  tempoMedioFinalizar: { type: Number, default: 0 },
  outcome: {
    type: Object,
    default: () => ({ vendidas: 0, canceladas: 0, ativas: 0, emRepasse: 0, total: 0, pct_vendidas: 0, pct_canceladas: 0, pct_ativas: 0, pct_em_repasse: 0 })
  },
  taxaConversao: { type: Number, default: 0 },
  bucketCounts: { type: Array, default: () => [] },
});
const emit = defineEmits(['filtrarSituacao', 'filtrarGrupo']);

const periodoLabel = computed(() => {
  const ini = props.periodo?.data_inicio
    ? props.periodo.data_inicio.slice(0, 10).split('-').reverse().join('/') : '—';
  const fim = props.periodo?.data_fim
    ? props.periodo.data_fim.slice(0, 10).split('-').reverse().join('/') : '—';
  return `${ini} → ${fim}`;
});

const total = computed(() => props.kpi.total ?? 0);
const pctStr = (v) => `${(v * 100).toFixed(1)}%`;

// 5 KPIs do topo
const headlineKpis = computed(() => [
  {
    key: 'total',
    label: 'Total',
    value: total.value,
    sub: 'no período',
    icon: 'fas fa-bookmark',
    accent: 'text-accent bg-accent-soft',
  },
  {
    key: 'tempo',
    label: 'Tempo até finalizar',
    value: `${props.tempoMedioFinalizar.toFixed(1)}d`,
    sub: `Em curso: ${props.tempoMedio.toFixed(1)}d`,
    icon: 'fas fa-stopwatch',
    accent: 'text-amber-500 bg-amber-500/10',
  },
  {
    key: 'vendidas',
    label: '% Vendida (CRM)',
    value: pctStr(props.outcome.pct_vendidas),
    sub: `${props.outcome.vendidas} de ${props.outcome.total} reservas`,
    icon: 'fas fa-flag-checkered',
    accent: 'text-emerald-500 bg-emerald-500/10',
  },
  {
    key: 'repasse',
    label: '% Em Repasse',
    value: pctStr(props.outcome.pct_em_repasse),
    sub: `${props.outcome.emRepasse} em repasse`,
    icon: 'fas fa-money-bill-transfer',
    accent: 'text-sky-500 bg-sky-500/10',
  },
  {
    key: 'canceladas',
    label: '% Canceladas',
    value: pctStr(props.outcome.pct_canceladas),
    sub: `${props.outcome.canceladas} canceladas / distratadas`,
    icon: 'fas fa-ban',
    accent: 'text-red-500 bg-red-500/10',
  },
]);

const groupCards = computed(() => {
  const t = total.value || 0;
  return (props.bucketCounts || []).map(g => ({
    ...g,
    percent: t > 0 ? Math.round((g.count / t) * 100) : 0,
  }));
});

const sortedItems = computed(() => {
  const orderIdx = (k) => {
    const i = STAGE_ORDER.indexOf(k);
    return i === -1 ? 999 : i;
  };
  return [...(props.kpi.items || [])].sort((a, b) => {
    const ia = orderIdx(a.key), ib = orderIdx(b.key);
    if (ia !== ib) return ia - ib;
    return b.count - a.count;
  });
});
</script>

<template>
  <section class="space-y-3">
    <!-- Período + total -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-3 min-w-0">
        <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Período</p>
        <span class="font-mono text-xs text-ink truncate">{{ periodoLabel }}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-semibold text-ink tabular-nums tracking-tight">{{ total }}</span>
        <span class="text-xs text-ink-muted">reserva{{ total === 1 ? '' : 's' }}</span>
      </div>
    </div>

    <!-- KPIs compactos -->
    <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
      <div class="flex sm:grid gap-2.5 sm:gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 min-w-max sm:min-w-0">
        <div v-for="k in headlineKpis" :key="k.key"
          class="flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised
                 shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
                 transition-all duration-200 ease-out-expo
                 w-44 sm:w-auto shrink-0 surface-gradient">
          <div class="flex items-center justify-between gap-2">
            <span class="h-7 w-7 rounded-lg grid place-items-center text-xs" :class="k.accent">
              <i :class="k.icon"></i>
            </span>
            <span class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">{{ k.label }}</span>
          </div>
          <span class="text-xl font-semibold text-ink tabular-nums tracking-tight leading-none mt-1">
            {{ k.value }}
          </span>
          <span class="text-[11px] text-ink-muted truncate" :title="k.sub">{{ k.sub }}</span>
        </div>
      </div>
    </div>

    <!-- Buckets agrupados -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
      <button v-for="g in groupCards" :key="g.key" @click="emit('filtrarGrupo', g)"
        class="group text-left rounded-xl px-4 py-3 border border-line bg-surface-raised
               shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
               transition-all duration-200 ease-out-expo surface-gradient">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <i :class="[g.icon, g.text, 'text-base shrink-0']"></i>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted truncate">{{ g.label }}</span>
          </div>
          <span class="text-[10px] font-mono text-ink-subtle">{{ g.percent }}%</span>
        </div>
        <div class="mt-2 text-2xl font-semibold tabular-nums text-ink leading-none">{{ g.count }}</div>
        <div class="mt-2 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" :class="g.bar"
            :style="{ width: `${g.percent}%` }"></div>
        </div>
      </button>
    </div>

    <!-- Detalhamento por situação -->
    <details class="group rounded-xl border border-line bg-surface-raised overflow-hidden" :open="kpi.items?.length <= 8">
      <summary class="cursor-pointer flex items-center justify-between gap-2 px-4 py-2.5 select-none hover:bg-surface-sunken/40 transition-colors">
        <span class="text-sm font-medium text-ink flex items-center gap-2">
          <i class="fas fa-layer-group text-xs text-ink-subtle"></i>
          Detalhamento por situação
          <span class="text-[10px] font-mono text-ink-subtle">({{ kpi.items?.length ?? 0 }})</span>
        </span>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle group-open:rotate-180 transition-transform duration-200"></i>
      </summary>
      <div class="border-t border-line p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
        <button v-for="item in sortedItems" :key="item.key" @click="emit('filtrarSituacao', item.key)"
          :class="['relative text-left rounded-lg px-3 py-2.5 border transition-all hover:scale-[1.02] hover:shadow-soft cursor-pointer', clsForStage(item.key)]">
          <div class="flex items-center gap-2 mb-1">
            <i :class="[iconForStage(item.key), 'text-xs text-ink-muted']"></i>
            <span class="text-[11px] font-medium leading-tight text-ink-muted line-clamp-2">{{ item.label }}</span>
          </div>
          <div class="text-xl font-bold tabular-nums text-ink">{{ item.count }}</div>
        </button>
      </div>
    </details>
  </section>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
