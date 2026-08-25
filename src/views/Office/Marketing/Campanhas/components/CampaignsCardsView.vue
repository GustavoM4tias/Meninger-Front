<script setup>
// View Cards: grid de cartões grandes por campanha — pra escaneamento visual.
// Mostra status, gasto, leads, CAC, datas.

import * as fmt from '@/utils/format';

defineProps({
    campaigns: { type: Array, required: true },
    currency: { type: String, default: 'BRL' },
});
const emit = defineEmits(['select']);

const fmtMoney = (v, currency = 'BRL') => fmt.fmtMoney(v, { moeda: currency });
const fmtInt = fmt.fmtInt;
const fmtShortDate = fmt.fmtDateCurta;
function statusBadge(c) {
    const s = String(c.effective_status || c.status || '').toUpperCase();
    if (s.includes('ACTIVE'))   return { label: 'Ativa',     cls: 'bg-data-pos/15 text-data-pos border-data-pos/30' };
    if (s.includes('PAUSED'))   return { label: 'Pausada',   cls: 'bg-data-warn/15 text-data-warn border-data-warn/30' };
    if (s.includes('DELETED'))  return { label: 'Excluída',  cls: 'bg-data-neg/15 text-data-neg border-data-neg/30' };
    if (s.includes('ARCHIVED')) return { label: 'Arquivada', cls: 'bg-slate-500/15 text-ink-muted border-line/30' };
    return { label: s || '—', cls: 'bg-slate-500/15 text-ink-muted border-line/30' };
}
function isActive(c) {
    return String(c.effective_status || c.status || '').toUpperCase().includes('ACTIVE');
}

// Dias rodando até hoje (ou até stop_time)
function daysRunning(c) {
    if (!c.start_time) return null;
    const start = new Date(c.start_time);
    const end = c.stop_time ? new Date(c.stop_time) : new Date();
    return Math.max(0, Math.floor((end - start) / 86400000));
}

// Campanha de Lead Ads? — verificamos pelo objective oficial da Meta
function isLeadAds(c) {
    const o = String(c.objective || '').toUpperCase();
    return o === 'OUTCOME_LEADS' || o === 'LEAD_GENERATION';
}

// Rótulo amigável do objetivo
function objectiveLabel(o) {
    const map = {
        OUTCOME_LEADS: 'Geração de Leads',
        LEAD_GENERATION: 'Geração de Leads',
        OUTCOME_TRAFFIC: 'Tráfego',
        OUTCOME_AWARENESS: 'Reconhecimento',
        OUTCOME_ENGAGEMENT: 'Engajamento',
        OUTCOME_SALES: 'Vendas',
        OUTCOME_APP_PROMOTION: 'Instalação de App',
        LINK_CLICKS: 'Cliques no link',
        PAGE_LIKES: 'Curtidas na Página',
    };
    return map[String(o).toUpperCase()] || o || '—';
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <button v-for="(c, i) in campaigns" :key="c.id"
      @click="emit('select', c)"
      :style="{ '--i': Math.min(i, 14) }"
      class="text-left card-interactive card-enter surface-gradient overflow-hidden flex flex-col">

      <!-- Top: status + Lead Ads + nome -->
      <div class="px-3 pt-3 pb-2 flex items-start gap-2 flex-wrap">
        <span :class="['inline-flex shrink-0 rounded-md border px-2 py-0.5 text-micro font-medium', statusBadge(c).cls]">
          {{ statusBadge(c).label }}
        </span>
        <span v-if="isLeadAds(c)"
          class="inline-flex shrink-0 items-center gap-1 rounded-md border border-accent/30 bg-accent/10 text-accent px-2 py-0.5 text-micro font-medium"
          title="Campanha de Lead Ads — coleta leads via formulário Meta. Os leads chegam pela Captação se a integração estiver configurada.">
          <i class="fas fa-file-lines text-[9px]"></i>Lead Ads
        </span>
        <div class="flex-1 min-w-0 w-full mt-1">
          <div class="text-sm font-medium text-ink leading-tight truncate" :title="c.name">{{ c.name }}</div>
          <div class="text-micro text-ink-subtle truncate">
            {{ c.account_name }}<span v-if="c.objective"> · {{ objectiveLabel(c.objective) }}</span>
          </div>
        </div>
      </div>

      <!-- Período (destaque) -->
      <div class="px-3 pb-2 grid grid-cols-2 gap-2">
        <div class="rounded bg-surface-sunken/30 px-2 py-1.5">
          <div class="text-micro uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-play text-[7px] mr-0.5"></i>Início
          </div>
          <div class="text-xs font-mono text-ink">{{ fmtShortDate(c.start_time) }}</div>
          <div v-if="daysRunning(c) != null" class="text-micro text-ink-subtle">
            há {{ daysRunning(c) }} dia{{ daysRunning(c) === 1 ? '' : 's' }}
          </div>
        </div>
        <div class="rounded bg-surface-sunken/30 px-2 py-1.5">
          <div class="text-micro uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-flag-checkered text-[7px] mr-0.5"></i>Encerramento
          </div>
          <div v-if="c.stop_time" class="text-xs font-mono text-ink">{{ fmtShortDate(c.stop_time) }}</div>
          <div v-else-if="isActive(c)" class="text-xs font-medium text-data-pos">
            <i class="fas fa-circle-play text-[8px]"></i> em andamento
          </div>
          <div v-else class="text-xs text-ink-subtle italic">sem data</div>
        </div>
      </div>

      <!-- KPIs grandes -->
      <div class="grid grid-cols-3 gap-1 px-3 pb-3 mt-auto">
        <div class="rounded bg-surface-sunken/40 p-2">
          <div class="text-micro uppercase tracking-wider text-ink-subtle">Gasto</div>
          <div class="text-sm font-semibold text-accent leading-tight">{{ fmtMoney(c.spend, c.currency || currency) }}</div>
        </div>
        <div class="rounded bg-surface-sunken/40 p-2">
          <div class="text-micro uppercase tracking-wider text-ink-subtle">Leads</div>
          <div class="text-sm font-semibold text-data-pos leading-tight">{{ fmtInt(c.office_leads || 0) }}</div>
          <div class="text-micro text-ink-subtle leading-tight">nossa base</div>
        </div>
        <div class="rounded bg-surface-sunken/40 p-2">
          <div class="text-micro uppercase tracking-wider text-ink-subtle">CAC</div>
          <div class="text-sm font-semibold text-ink leading-tight">{{ c.cac != null ? fmtMoney(c.cac, c.currency || currency) : '—' }}</div>
          <div class="text-micro text-ink-subtle leading-tight">nossa base</div>
        </div>
      </div>
    </button>
  </div>
</template>
