<script setup>
// KPIs do relatório por período — com DELTA vs o período anterior de mesma
// duração (padrão dos dashboards de mercado). Mesmo visual dos SummaryCards
// (grid de cards, ícone colorido), + badge de variação.
//
// Métricas "menor é melhor" (CAC, CPM) invertem a cor do delta.

import { computed } from 'vue';

const props = defineProps({
    totals:      { type: Object, default: null },   // período atual (derive() do back)
    totalsPrev:  { type: Object, default: null },   // período anterior
    periodPrev:  { type: Object, default: null },   // { since, until }
    currency:    { type: String, default: 'BRL' },
    loading:     { type: Boolean, default: false },
});

const moneyFmt = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', maximumFractionDigits: 2,
}));
const moneyFmt0 = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', maximumFractionDigits: 0,
}));
const intFmt = new Intl.NumberFormat('pt-BR');

function delta(curr, prev) {
    const c = Number(curr), p = Number(prev);
    if (!isFinite(c) || !isFinite(p) || p === 0) return null;
    return ((c - p) / p) * 100;
}

const prevLabel = computed(() => {
    if (!props.periodPrev?.since) return 'período anterior';
    const f = (d) => d ? d.split('-').reverse().slice(0, 2).join('/') : '';
    return `vs ${f(props.periodPrev.since)}–${f(props.periodPrev.until)}`;
});

const kpis = computed(() => {
    const t = props.totals || {};
    const p = props.totalsPrev || {};
    return [
        {
            key: 'spend', label: 'Investido', icon: 'fas fa-sack-dollar',
            accent: 'text-blue-500 bg-blue-500/10',
            value: moneyFmt0.value.format(t.spend || 0),
            delta: delta(t.spend, p.spend), invert: false,
        },
        {
            key: 'leads', label: 'Leads', icon: 'fab fa-meta',
            accent: 'text-violet-500 bg-violet-500/10',
            value: intFmt.format(t.meta_leads_total || 0),
            delta: delta(t.meta_leads_total, p.meta_leads_total), invert: false,
            // Desdobramento form × pixel: só de formulário Meta chega pelo
            // webhook — leads de pixel convertem no site/LP e explicam a
            // diferença vs a tela de Captação.
            sub: (Number(t.meta_leads_form) || 0) + (Number(t.meta_leads_pixel) || 0) > 0
                ? `${intFmt.format(t.meta_leads_form || 0)} form · ${intFmt.format(t.meta_leads_pixel || 0)} pixel`
                : null,
        },
        {
            key: 'cac', label: 'CAC', icon: 'fas fa-coins',
            accent: 'text-amber-500 bg-amber-500/10',
            value: t.cac != null ? moneyFmt.value.format(t.cac) : '—',
            delta: delta(t.cac, p.cac), invert: true,     // menor = melhor
        },
        {
            key: 'ctr', label: 'CTR', icon: 'fas fa-arrow-pointer',
            accent: 'text-sky-500 bg-sky-500/10',
            value: t.ctr != null ? `${Number(t.ctr).toFixed(2)}%` : '—',
            delta: delta(t.ctr, p.ctr), invert: false,
        },
        {
            key: 'cpm', label: 'CPM', icon: 'fas fa-bullseye',
            accent: 'text-rose-500 bg-rose-500/10',
            value: t.cpm != null ? moneyFmt.value.format(t.cpm) : '—',
            delta: delta(t.cpm, p.cpm), invert: true,     // menor = melhor
        },
        {
            key: 'clicks', label: 'Cliques', icon: 'fas fa-hand-pointer',
            accent: 'text-emerald-500 bg-emerald-500/10',
            value: intFmt.format(t.clicks || 0),
            delta: delta(t.clicks, p.clicks), invert: false,
        },
        {
            key: 'impressions', label: 'Impressões', icon: 'fas fa-eye',
            accent: 'text-cyan-500 bg-cyan-500/10',
            value: intFmt.format(t.impressions || 0),
            delta: delta(t.impressions, p.impressions), invert: false,
        },
    ];
});

function deltaView(item) {
    if (item.delta == null) return null;
    const up = item.delta >= 0;
    const good = item.invert ? !up : up;
    return {
        text: `${up ? '+' : ''}${item.delta.toFixed(item.delta >= 100 ? 0 : 1)}%`,
        icon: up ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
        cls: good
            ? 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10'
            : 'text-red-600 dark:text-red-300 bg-red-500/10',
    };
}
</script>

<template>
  <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
    <div class="flex sm:grid gap-2.5 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 min-w-max sm:min-w-0">
      <div v-for="item in kpis" :key="item.key"
        class="group flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised
               shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
               transition-all duration-200 ease-out-expo w-40 sm:w-auto shrink-0 surface-gradient">
        <div class="flex items-center justify-between gap-2">
          <span class="h-7 w-7 rounded-lg grid place-items-center text-xs" :class="item.accent">
            <i :class="item.icon"></i>
          </span>
          <span v-if="deltaView(item)"
            :class="['inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', deltaView(item).cls]"
            :title="prevLabel">
            <i :class="['fas text-[8px]', deltaView(item).icon]"></i>{{ deltaView(item).text }}
          </span>
        </div>
        <span class="text-lg font-semibold text-ink tabular-nums tracking-tight leading-none mt-1"
          :class="{ 'opacity-40': loading }">
          {{ item.value }}
        </span>
        <span class="text-[11px] text-ink-muted">{{ item.label }}</span>
        <span v-if="item.sub" class="text-[10px] text-ink-muted/80 tabular-nums leading-none"
          title="Leads de formulário Meta (chegam na Captação) × leads de pixel (convertem no site/LP)">
          {{ item.sub }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
