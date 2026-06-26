<script setup>
// KPIs de campanhas — mesmo padrão visual do SummaryCards de Leads:
//   - Header com período + total (de campanhas exibidas)
//   - Grid de cards clicáveis com ícone colorido, valor grande, % do total
//   - Hover: -translate-y + border accent + shadow

import { computed } from 'vue';

const props = defineProps({
    periodo: { type: Object, default: () => ({}) },     // { data_inicio, data_fim }
    summary: { type: Object, required: true },          // métricas agregadas
    totalCampaigns: { type: Number, default: 0 },
    currency: { type: String, default: 'BRL' },
});

const emit = defineEmits(['focusKpi']);

const moneyFmt = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', maximumFractionDigits: 0,
}));
const intFmt = new Intl.NumberFormat('pt-BR');

const periodoLabel = computed(() => {
    const fmtDate = (s) => s ? s.slice(0, 10).split('-').reverse().join('/') : '—';
    return `${fmtDate(props.periodo?.data_inicio)} → ${fmtDate(props.periodo?.data_fim)}`;
});

// Defs dos KPIs — cada um com label, valor, sub, ícone, accent
const kpis = computed(() => {
    const s = props.summary || {};
    return [
        {
            key: 'spend',
            label: 'Investimento',
            value: moneyFmt.value.format(s.spend || 0),
            sub: 'gasto total',
            icon: 'fas fa-sack-dollar',
            accent: 'text-blue-500 bg-blue-500/10',
        },
        {
            key: 'leadsMeta',
            label: 'Leads (Meta)',
            value: intFmt.format(s.leadsMeta || 0),
            sub: 'segundo insights',
            icon: 'fab fa-meta',
            accent: 'text-violet-500 bg-violet-500/10',
        },
        {
            key: 'cac',
            label: 'CAC médio',
            value: s.cacMedio ? moneyFmt.value.format(s.cacMedio) : '—',
            sub: 'investimento / lead',
            icon: 'fas fa-coins',
            accent: 'text-amber-500 bg-amber-500/10',
        },
        {
            key: 'clicks',
            label: 'Cliques',
            value: intFmt.format(s.clicks || 0),
            sub: `CTR ${s.ctrAgg ? s.ctrAgg.toFixed(2) + '%' : '—'}`,
            icon: 'fas fa-hand-pointer',
            accent: 'text-sky-500 bg-sky-500/10',
        },
        {
            key: 'impressions',
            label: 'Impressões',
            value: intFmt.format(s.impressions || 0),
            sub: 'alcance × frequência',
            icon: 'fas fa-eye',
            accent: 'text-cyan-500 bg-cyan-500/10',
        },
        {
            key: 'campaigns',
            label: 'Campanhas',
            value: intFmt.format(props.totalCampaigns),
            sub: 'no filtro',
            icon: 'fas fa-bullhorn',
            accent: 'text-orange-500 bg-orange-500/10',
        },
    ];
});
</script>

<template>
  <section class="space-y-3">

    <!-- Header: período + total -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-3 min-w-0">
        <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Período</p>
        <span class="font-mono text-xs text-ink truncate">{{ periodoLabel }}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-semibold text-ink tabular-nums tracking-tight">{{ totalCampaigns }}</span>
        <span class="text-xs text-ink-muted">campanha{{ totalCampaigns === 1 ? '' : 's' }}</span>
      </div>
    </div>

    <!-- KPIs: scroll horizontal no mobile, grid no desktop -->
    <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
      <div class="flex sm:grid gap-2.5 sm:gap-3
                  sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4
                  min-w-max sm:min-w-0">
        <button v-for="item in kpis" :key="item.key"
          @click="emit('focusKpi', item.key)"
          class="group flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised
                 shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
                 transition-all duration-200 ease-out-expo text-left
                 w-44 sm:w-auto shrink-0 surface-gradient">
          <div class="flex items-center justify-between gap-2">
            <span class="h-7 w-7 rounded-lg grid place-items-center text-xs"
              :class="item.accent">
              <i :class="item.icon"></i>
            </span>
            <span class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">
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
