<script setup>
// View Cards: grid de cartões grandes por campanha — pra escaneamento visual.
// Mostra status, gasto, leads, CAC, datas.

defineProps({
    campaigns: { type: Array, required: true },
    currency: { type: String, default: 'BRL' },
});
const emit = defineEmits(['select']);

function fmtMoney(v, currency = 'BRL') {
    if (v == null) return '—';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(v)); }
    catch { return `R$ ${v}`; }
}
function fmtInt(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR').format(Number(v));
}
function fmtShortDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    catch { return '—'; }
}
function statusBadge(c) {
    const s = String(c.effective_status || c.status || '').toUpperCase();
    if (s.includes('ACTIVE'))   return { label: 'Ativa',     cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
    if (s.includes('PAUSED'))   return { label: 'Pausada',   cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
    if (s.includes('DELETED'))  return { label: 'Excluída',  cls: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' };
    if (s.includes('ARCHIVED')) return { label: 'Arquivada', cls: 'bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30' };
    return { label: s || '—', cls: 'bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30' };
}
function isActive(c) {
    return String(c.effective_status || c.status || '').toUpperCase().includes('ACTIVE');
}
function deliveryRate(c) {
    const meta = Number(c.meta_leads_total) || 0;
    const office = c.lead_stats?.total || 0;
    const ref = office > 0 ? office : meta;
    if (!ref) return null;
    const delivered = c.lead_stats?.delivered || 0;
    return Math.round((delivered / ref) * 100);
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
    <button v-for="c in campaigns" :key="c.id"
      @click="emit('select', c)"
      class="text-left rounded-xl border border-line bg-surface hover:border-accent/40 hover:shadow-md transition-all overflow-hidden flex flex-col">

      <!-- Top: status + Lead Ads + nome -->
      <div class="px-3 pt-3 pb-2 flex items-start gap-2 flex-wrap">
        <span :class="['inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium', statusBadge(c).cls]">
          {{ statusBadge(c).label }}
        </span>
        <span v-if="isLeadAds(c)"
          class="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2 py-0.5 text-[10px] font-medium"
          title="Campanha de Lead Ads — coleta leads via formulário Meta. Os leads chegam pela Captação se a integração estiver configurada.">
          <i class="fas fa-file-lines text-[9px]"></i>Lead Ads
        </span>
        <div class="flex-1 min-w-0 w-full mt-1">
          <div class="text-sm font-medium text-ink leading-tight truncate" :title="c.name">{{ c.name }}</div>
          <div class="text-[10px] text-ink-subtle truncate">
            {{ c.account_name }}<span v-if="c.objective"> · {{ objectiveLabel(c.objective) }}</span>
          </div>
        </div>
      </div>

      <!-- Período (destaque) -->
      <div class="px-3 pb-2 grid grid-cols-2 gap-2">
        <div class="rounded bg-surface-sunken/30 px-2 py-1.5">
          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-play text-[7px] mr-0.5"></i>Início
          </div>
          <div class="text-xs font-mono text-ink">{{ fmtShortDate(c.start_time) }}</div>
          <div v-if="daysRunning(c) != null" class="text-[9px] text-ink-subtle">
            há {{ daysRunning(c) }} dia{{ daysRunning(c) === 1 ? '' : 's' }}
          </div>
        </div>
        <div class="rounded bg-surface-sunken/30 px-2 py-1.5">
          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">
            <i class="fas fa-flag-checkered text-[7px] mr-0.5"></i>Encerramento
          </div>
          <div v-if="c.stop_time" class="text-xs font-mono text-ink">{{ fmtShortDate(c.stop_time) }}</div>
          <div v-else-if="isActive(c)" class="text-xs font-medium text-emerald-600 dark:text-emerald-300">
            <i class="fas fa-circle-play text-[8px]"></i> em andamento
          </div>
          <div v-else class="text-xs text-ink-subtle italic">sem data</div>
        </div>
      </div>

      <!-- KPIs grandes -->
      <div class="grid grid-cols-3 gap-1 px-3 pb-3 mt-auto">
        <div class="rounded bg-surface-sunken/40 p-2">
          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">Gasto</div>
          <div class="text-sm font-semibold text-blue-600 dark:text-blue-300 leading-tight">{{ fmtMoney(c.spend, c.currency || currency) }}</div>
        </div>
        <div class="rounded bg-surface-sunken/40 p-2">
          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">Leads</div>
          <div class="text-sm font-semibold text-emerald-600 dark:text-emerald-300 leading-tight">{{ fmtInt(c.meta_leads_total || 0) }}</div>
          <div class="text-[9px] text-ink-subtle leading-tight">Office: {{ fmtInt(c.lead_stats?.total || 0) }}</div>
        </div>
        <div class="rounded bg-surface-sunken/40 p-2">
          <div class="text-[9px] uppercase tracking-wider text-ink-subtle">CAC</div>
          <div class="text-sm font-semibold text-ink leading-tight">{{ c.cac != null ? fmtMoney(c.cac, c.currency || currency) : '—' }}</div>
          <div class="text-[9px] text-ink-subtle leading-tight">{{ c.cac_source === 'meta' ? 'via Meta' : c.cac_source === 'office' ? 'via Office' : '—' }}</div>
        </div>
      </div>

      <!-- Footer: entrega -->
      <div v-if="deliveryRate(c) != null" class="px-3 py-2 border-t border-line/60 bg-surface-sunken/20">
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
            <div class="h-full bg-emerald-500" :style="{ width: deliveryRate(c) + '%' }"></div>
          </div>
          <span class="text-[10px] font-mono text-ink-muted">{{ deliveryRate(c) }}% entregue</span>
        </div>
      </div>
    </button>
  </div>
</template>
