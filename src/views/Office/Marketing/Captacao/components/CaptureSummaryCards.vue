<script setup>
// KPIs principais da Captação — espelham os agregados que o backend devolve em
// /capture/health?period=24h|7d|30d|all. Cada card é clicável: ao clicar, aplica
// o filtro de status correspondente. Mesma linguagem visual do SummaryCards de
// Campanhas (ícone colorido, tabular-nums, hover translate).

import { computed } from 'vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
    health: { type: Object, default: null },
    period: { type: String, default: '7d' },
});

const emit = defineEmits(['focus-status', 'change-period']);

const intFmt = new Intl.NumberFormat('pt-BR');

function fmtSeconds(s) {
    if (s == null) return '—';
    if (s < 60) return `${Math.round(s)}s`;
    const m = s / 60;
    if (m < 60) return `${m.toFixed(1)}m`;
    const h = m / 60;
    if (h < 24) return `${h.toFixed(1)}h`;
    return `${(h / 24).toFixed(1)}d`;
}

const PERIOD_OPTIONS = [
    { value: '24h', label: '24h' },
    { value: '7d',  label: '7 dias' },
    { value: '30d', label: '30 dias' },
    { value: 'all', label: 'Tudo' },
];

const periodLabel = computed(() => PERIOD_OPTIONS.find(o => o.value === props.period)?.label || props.period);

const kpis = computed(() => {
    const h = props.health;
    if (!h) return [];
    const pc = h.period_counts || {};
    const total = h.period_total || 0;
    const inDispatch = (pc.routed || 0) + (pc.dispatching || 0);
    const withError = (pc.failed || 0) + (pc.rejected || 0);

    return [
        {
            key: 'total',
            label: `Leads (${periodLabel.value})`,
            value: intFmt.format(total),
            sub: 'no período',
            icon: 'fas fa-arrow-trend-up',
            accent: 'text-indigo-500 bg-indigo-500/10',
            filter: null,
        },
        {
            key: 'delivered',
            label: 'Entregues ao CV',
            value: intFmt.format(pc.delivered || 0),
            sub: h.delivery_rate != null ? `${h.delivery_rate}% taxa` : 'sem base',
            icon: 'fas fa-circle-check',
            accent: 'text-emerald-500 bg-emerald-500/10',
            filter: 'delivered',
        },
        {
            key: 'held',
            label: 'Aguardando vínculo',
            value: intFmt.format(pc.held || 0),
            sub: 'requer roteamento',
            icon: 'fas fa-hourglass-half',
            accent: 'text-amber-500 bg-amber-500/10',
            filter: 'held',
            highlight: (pc.held || 0) > 0,
        },
        {
            key: 'in_dispatch',
            label: 'Em despacho',
            value: intFmt.format(inDispatch),
            sub: `${pc.routed || 0} routed · ${pc.dispatching || 0} sending`,
            icon: 'fas fa-paper-plane',
            accent: 'text-sky-500 bg-sky-500/10',
            filter: 'routed,dispatching',
        },
        {
            key: 'error',
            label: 'Com erro',
            value: intFmt.format(withError),
            sub: `${pc.failed || 0} falha · ${pc.rejected || 0} recusa`,
            icon: 'fas fa-circle-exclamation',
            accent: 'text-red-500 bg-red-500/10',
            filter: 'failed,rejected',
            highlight: withError > 0,
        },
        {
            key: 'deadletter',
            label: 'Dead-letter',
            value: intFmt.format(h.dead_letter || 0),
            sub: 'sem retry (geral)',
            icon: 'fas fa-skull',
            accent: 'text-rose-500 bg-rose-500/10',
            filter: null,
            highlight: (h.dead_letter || 0) > 0,
        },
        {
            key: 'latency',
            label: 'Latência média',
            value: fmtSeconds(h.avg_dispatch_seconds),
            sub: `máx ${fmtSeconds(h.max_dispatch_seconds)}`,
            icon: 'fas fa-stopwatch',
            accent: 'text-cyan-500 bg-cyan-500/10',
            filter: null,
        },
        {
            key: 'spam',
            label: 'Spam',
            value: intFmt.format(pc.spam || 0),
            sub: 'no período',
            icon: 'fas fa-trash',
            accent: 'text-slate-500 bg-slate-500/10',
            filter: 'spam',
        },
    ];
});

function onClick(k) {
    if (k.filter) emit('focus-status', k.filter);
}
</script>

<template>
  <section class="space-y-3">
    <!-- Header: seletor de período -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2 min-w-0">
        <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Período do recorte</p>
      </div>
      <SegmentedControl :model-value="period"
        @change="v => emit('change-period', v)"
        :options="PERIOD_OPTIONS" size="sm" />
    </div>

    <!-- KPIs: scroll horizontal no mobile, grid no desktop -->
    <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
      <div class="flex sm:grid gap-2.5 sm:gap-3
                  sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8
                  min-w-max sm:min-w-0">
        <button v-for="item in kpis" :key="item.key"
          @click="onClick(item)"
          :disabled="!item.filter"
          class="group flex flex-col gap-1 p-3 rounded-xl border bg-surface-raised
                 shadow-soft hover:shadow-elevated hover:-translate-y-0.5
                 transition-all duration-200 ease-out-expo text-left
                 w-44 sm:w-auto shrink-0 surface-gradient
                 disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-soft"
          :class="item.highlight ? 'border-current/30 ring-1 ring-current/10' : 'border-line hover:border-accent/30'"
          :style="item.highlight ? `color: var(--c-${item.key === 'held' ? 'amber' : item.key === 'deadletter' || item.key === 'error' ? 'red' : 'accent'});` : ''">
          <div class="flex items-center justify-between gap-2">
            <span class="h-7 w-7 rounded-lg grid place-items-center text-xs" :class="item.accent">
              <i :class="item.icon"></i>
            </span>
            <span class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle truncate" :title="item.sub">
              {{ item.sub }}
            </span>
          </div>
          <span class="text-xl font-semibold text-ink tabular-nums tracking-tight leading-none mt-1">
            {{ item.value }}
          </span>
          <span class="text-xs text-ink-muted truncate" :title="item.label">{{ item.label }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
