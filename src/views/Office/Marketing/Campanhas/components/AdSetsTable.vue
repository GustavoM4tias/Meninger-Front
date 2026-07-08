<script setup>
// Tabela de CONJUNTOS de anúncio (nível intermediário da hierarquia Meta) —
// métricas recortadas pelo período do relatório. Linha clicável = drill pros
// anúncios do conjunto.

import Surface from '@/components/UI/Surface.vue';

const props = defineProps({
    adsets:   { type: Array, default: () => [] },
    loading:  { type: Boolean, default: false },
    currency: { type: String, default: 'BRL' },
    showCampaign: { type: Boolean, default: true },   // esconde a coluna quando já drillado numa campanha
});
const emit = defineEmits(['drill']);

function fmtMoney(v) {
    if (v == null) return '—';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: props.currency }).format(Number(v)); }
    catch { return `R$ ${v}`; }
}
function fmtInt(v) { return v == null ? '—' : new Intl.NumberFormat('pt-BR').format(Number(v)); }
function fmtPct(v) { return v == null ? '—' : `${Number(v).toFixed(2)}%`; }

function statusBadge(a) {
    const s = String(a.effective_status || a.status || '').toUpperCase();
    if (s.includes('ACTIVE'))   return { label: 'Ativo',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (s.includes('PAUSED'))   return { label: 'Pausado',   cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (s.includes('DELETED'))  return { label: 'Excluído',  cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (s.includes('ARCHIVED')) return { label: 'Arquivado', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

// Otimização legível (LEAD_GENERATION → Leads, etc.)
const GOAL_LABELS = {
    LEAD_GENERATION: 'Leads', LINK_CLICKS: 'Cliques', OFFSITE_CONVERSIONS: 'Conversões',
    REACH: 'Alcance', IMPRESSIONS: 'Impressões', LANDING_PAGE_VIEWS: 'Visitas LP',
    THRUPLAY: 'ThruPlay', POST_ENGAGEMENT: 'Engajamento', CONVERSATIONS: 'Conversas',
};
function goalLabel(g) { return GOAL_LABELS[g] || g || '—'; }
</script>

<template>
  <Surface variant="raised" padding="none" class="overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-surface-sunken/30 border-b border-line">
          <tr>
            <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Conjunto</th>
            <th v-if="showCampaign" class="px-3 py-2.5 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Campanha</th>
            <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
            <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Otimização</th>
            <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Investido</th>
            <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
            <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle" title="Custo por lead no período">CAC</th>
            <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">CTR</th>
            <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">CPM</th>
            <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Impressões</th>
            <th class="px-3 py-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line/60">
          <tr v-if="loading">
            <td :colspan="showCampaign ? 11 : 10" class="px-4 py-10 text-center text-ink-subtle">
              <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
            </td>
          </tr>
          <tr v-else-if="!adsets.length">
            <td :colspan="showCampaign ? 11 : 10" class="px-4 py-10 text-center text-ink-subtle">
              Nenhum conjunto com veiculação no período.
            </td>
          </tr>
          <tr v-else v-for="a in adsets" :key="a.id"
            @click="emit('drill', a)"
            class="hover:bg-surface-hover/40 cursor-pointer transition-colors">

            <td class="px-3 py-2.5">
              <div class="text-ink font-medium leading-tight truncate max-w-[280px]" :title="a.name || a.id">
                {{ a.name || '(não sincronizado)' }}
              </div>
              <div class="text-[10px] font-mono text-ink-subtle">#{{ a.id }}</div>
            </td>

            <td v-if="showCampaign" class="px-3 py-2.5 text-xs text-ink-muted truncate max-w-[200px]">
              {{ a.campaign?.name || '—' }}
            </td>

            <td class="px-3 py-2.5 text-center">
              <span :class="['inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium', statusBadge(a).cls]">
                {{ statusBadge(a).label }}
              </span>
            </td>

            <td class="px-3 py-2.5 text-xs text-ink-muted">{{ goalLabel(a.optimization_goal) }}</td>

            <td class="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-ink">{{ fmtMoney(a.spend) }}</td>
            <td class="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-ink">{{ fmtInt(a.meta_leads_total) }}</td>
            <td class="px-3 py-2.5 text-right whitespace-nowrap">
              <span v-if="a.cac != null" class="font-medium text-ink">{{ fmtMoney(a.cac) }}</span>
              <span v-else class="text-ink-subtle italic text-xs">—</span>
            </td>
            <td class="px-3 py-2.5 text-right text-[11px] text-ink-muted">{{ fmtPct(a.ctr) }}</td>
            <td class="px-3 py-2.5 text-right text-[11px] text-ink-muted">{{ a.cpm != null ? fmtMoney(a.cpm) : '—' }}</td>
            <td class="px-3 py-2.5 text-right text-[11px] text-ink-muted">{{ fmtInt(a.impressions) }}</td>

            <td class="px-3 py-2.5 text-center text-ink-subtle">
              <i class="fas fa-chevron-right text-[10px]"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Surface>
</template>
