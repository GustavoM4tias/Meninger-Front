<script setup>
// Tabela de CONJUNTOS de anúncio (nível intermediário da hierarquia Meta) —
// métricas recortadas pelo período do relatório. Linha clicável = drill pros
// anúncios do conjunto.

import Surface from '@/components/UI/Surface.vue';
import * as fmt from '@/utils/format';

const props = defineProps({
    adsets:   { type: Array, default: () => [] },
    loading:  { type: Boolean, default: false },
    currency: { type: String, default: 'BRL' },
    showCampaign: { type: Boolean, default: true },   // esconde a coluna quando já drillado numa campanha
});
const emit = defineEmits(['drill']);

/* CTR da Meta já vem em pontos percentuais (2.5 = 2,5%), por isso `fmtPct`
   e não `fmtRatio` - ver utils/format.js. */
const fmtMoney = (v) => fmt.fmtMoney(v, { moeda: props.currency });
const fmtInt = fmt.fmtInt;
const fmtPct = fmt.fmtPct;

function statusBadge(a) {
    const s = String(a.effective_status || a.status || '').toUpperCase();
    if (s.includes('ACTIVE'))   return { label: 'Ativo',     cls: 'bg-data-pos/10 text-data-pos border-data-pos/20' };
    if (s.includes('PAUSED'))   return { label: 'Pausado',   cls: 'bg-data-warn/10 text-data-warn border-data-warn/20' };
    if (s.includes('DELETED'))  return { label: 'Excluído',  cls: 'bg-data-neg/10 text-data-neg border-data-neg/20' };
    if (s.includes('ARCHIVED')) return { label: 'Arquivado', cls: 'bg-slate-500/10 text-ink-muted border-line/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-ink-muted border-line/20' };
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

    <!-- Celular: cartao. Onze colunas nao cabem em 375px. -->
    <div class="md:hidden">
      <div v-if="loading" class="px-4 py-10 text-center text-ink-subtle text-sm">
        <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
      </div>
      <div v-else-if="!adsets.length" class="px-4 py-10 text-center text-ink-subtle text-sm">
        Nenhum conjunto com veiculação no período.
      </div>
      <ul v-else class="divide-y divide-line/60">
        <li v-for="a in adsets" :key="`m-${a.id}`" @click="emit('drill', a)"
          class="p-3 flex flex-col gap-2 cursor-pointer active:bg-surface-hover/40 transition-colors">

          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-ink font-medium leading-tight break-words">{{ a.name || '(não sincronizado)' }}</div>
              <div class="text-micro font-mono text-ink-subtle break-all mt-0.5">#{{ a.id }}</div>
              <div v-if="showCampaign && a.campaign?.name" class="text-micro text-ink-muted mt-0.5 break-words">
                {{ a.campaign.name }}
              </div>
            </div>
            <i class="fas fa-chevron-right text-[10px] text-ink-subtle mt-1.5 shrink-0"></i>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <span :class="['inline-flex rounded-md border px-2 py-0.5 text-micro font-medium', statusBadge(a).cls]">
              {{ statusBadge(a).label }}
            </span>
            <span class="text-micro text-ink-muted">{{ goalLabel(a.optimization_goal) }}</span>
          </div>

          <!-- Os tres numeros que decidem: quanto saiu, quantos vieram, a que custo -->
          <div class="grid grid-cols-3 gap-2 rounded-lg bg-surface-sunken/40 px-2.5 py-2">
            <div>
              <div class="metric-label">Investido</div>
              <div class="text-sm font-semibold text-ink tabular-nums">{{ fmtMoney(a.spend) }}</div>
            </div>
            <div>
              <div class="metric-label">Leads</div>
              <div class="text-sm font-semibold text-ink tabular-nums">{{ fmtInt(a.office_leads) }}</div>
            </div>
            <div>
              <div class="metric-label">CAC</div>
              <div class="text-sm font-semibold text-ink tabular-nums">
                {{ a.cac != null ? fmtMoney(a.cac) : '—' }}
              </div>
            </div>
          </div>

          <div class="text-micro text-ink-subtle tabular-nums">
            CTR {{ fmtPct(a.ctr) }} · CPM {{ a.cpm != null ? fmtMoney(a.cpm) : '—' }} ·
            {{ fmtInt(a.impressions) }} impressões
          </div>
        </li>
      </ul>
    </div>

    <div class="hidden md:block overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-surface-sunken/30 border-b border-line">
          <tr>
            <th class="px-3 py-2.5 text-left   text-micro font-mono uppercase tracking-wider text-ink-subtle">Conjunto</th>
            <th v-if="showCampaign" class="px-3 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle">Campanha</th>
            <th class="px-3 py-2.5 text-center text-micro font-mono uppercase tracking-wider text-ink-subtle">Status</th>
            <th class="px-3 py-2.5 text-left   text-micro font-mono uppercase tracking-wider text-ink-subtle">Otimização</th>
            <th class="px-3 py-2.5 text-right  text-micro font-mono uppercase tracking-wider text-ink-subtle">Investido</th>
            <th class="px-3 py-2.5 text-right  text-micro font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
            <th class="px-3 py-2.5 text-right  text-micro font-mono uppercase tracking-wider text-ink-subtle" title="Custo por lead no período">CAC</th>
            <th class="px-3 py-2.5 text-right  text-micro font-mono uppercase tracking-wider text-ink-subtle">CTR</th>
            <th class="px-3 py-2.5 text-right  text-micro font-mono uppercase tracking-wider text-ink-subtle">CPM</th>
            <th class="px-3 py-2.5 text-right  text-micro font-mono uppercase tracking-wider text-ink-subtle">Impressões</th>
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
              <div class="text-micro font-mono text-ink-subtle">#{{ a.id }}</div>
            </td>

            <td v-if="showCampaign" class="px-3 py-2.5 text-xs text-ink-muted truncate max-w-[200px]">
              {{ a.campaign?.name || '—' }}
            </td>

            <td class="px-3 py-2.5 text-center">
              <span :class="['inline-flex rounded-md border px-2 py-0.5 text-micro font-medium', statusBadge(a).cls]">
                {{ statusBadge(a).label }}
              </span>
            </td>

            <td class="px-3 py-2.5 text-xs text-ink-muted">{{ goalLabel(a.optimization_goal) }}</td>

            <td class="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-ink">{{ fmtMoney(a.spend) }}</td>
            <td class="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-ink">{{ fmtInt(a.office_leads) }}</td>
            <td class="px-3 py-2.5 text-right whitespace-nowrap">
              <span v-if="a.cac != null" class="font-medium text-ink">{{ fmtMoney(a.cac) }}</span>
              <span v-else class="text-ink-subtle italic text-xs">—</span>
            </td>
            <td class="px-3 py-2.5 text-right text-micro text-ink-muted">{{ fmtPct(a.ctr) }}</td>
            <td class="px-3 py-2.5 text-right text-micro text-ink-muted">{{ a.cpm != null ? fmtMoney(a.cpm) : '—' }}</td>
            <td class="px-3 py-2.5 text-right text-micro text-ink-muted">{{ fmtInt(a.impressions) }}</td>

            <td class="px-3 py-2.5 text-center text-ink-subtle">
              <i class="fas fa-chevron-right text-[10px]"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Surface>
</template>
