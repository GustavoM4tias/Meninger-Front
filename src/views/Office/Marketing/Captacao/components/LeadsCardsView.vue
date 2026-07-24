<script setup>
// Visão Kanban — agrupa leads por estado em 5 colunas. Útil pra ter ideia rápida
// de onde está o gargalo (held / em despacho / entregue / com erro / spam).

import { computed } from 'vue';
import LeadStatusBadge from './LeadStatusBadge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
    leads: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
});

const emit = defineEmits(['open-detail']);

const COLUMNS = [
    { key: 'held',        title: 'Aguardando vínculo', statuses: ['held'],                   accent: 'border-amber-500/40 bg-amber-500/5',  icon: 'fas fa-hourglass-half' },
    { key: 'dispatch',    title: 'Em despacho',        statuses: ['routed', 'dispatching'],  accent: 'border-sky-500/40 bg-sky-500/5',      icon: 'fas fa-paper-plane' },
    { key: 'delivered',   title: 'Entregues ao CV',    statuses: ['delivered'],              accent: 'border-emerald-500/40 bg-emerald-500/5', icon: 'fas fa-circle-check' },
    { key: 'error',       title: 'Com erro',           statuses: ['failed', 'rejected'],     accent: 'border-red-500/40 bg-red-500/5',      icon: 'fas fa-circle-exclamation' },
    { key: 'other',       title: 'Outros',             statuses: ['received', 'validated', 'spam', 'historical'], accent: 'border-line bg-surface-sunken/40', icon: 'fas fa-ellipsis' },
];

const grouped = computed(() => {
    const out = {};
    for (const c of COLUMNS) out[c.key] = [];
    for (const l of props.leads) {
        const col = COLUMNS.find(c => c.statuses.includes(l.status));
        if (col) out[col.key].push(l);
    }
    return out;
});

const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const contato = (l) => l.email || l.telefone || '(sem contato)';
</script>

<template>
  <section>
    <div v-if="loading" class="py-16 text-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando leads...
    </div>

    <EmptyState v-else-if="!leads.length"
      icon="fas fa-inbox" title="Nenhum lead encontrado"
      description="Ajuste os filtros ou aguarde o próximo lead chegar pelo webhook." />

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      <div v-for="col in COLUMNS" :key="col.key"
        class="rounded-xl border bg-surface-raised flex flex-col min-h-[200px]"
        :class="col.accent">
        <!-- Header da coluna -->
        <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-line/60">
          <div class="flex items-center gap-2 min-w-0">
            <i :class="col.icon" class="text-xs text-ink-muted"></i>
            <span class="text-sm font-medium text-ink truncate">{{ col.title }}</span>
          </div>
          <span class="text-xs font-mono tabular-nums text-ink-subtle">{{ grouped[col.key].length }}</span>
        </div>

        <!-- Cards -->
        <div class="p-2 space-y-2 overflow-y-auto max-h-[680px]">
          <div v-if="!grouped[col.key].length" class="text-center text-[11px] text-ink-subtle py-6">
            sem leads
          </div>
          <button v-for="lead in grouped[col.key]" :key="lead.id"
            @click="emit('open-detail', lead.id)"
            class="w-full text-left rounded-lg border border-line bg-surface px-2.5 py-2
                   transition-all duration-200 ease-out-expo
                   hover:border-accent/60 hover:-translate-y-0.5 hover:ring-2 hover:ring-accent-ring/25 hover:shadow-glow-blue">
            <div class="flex items-center justify-between gap-2">
              <LeadStatusBadge :status="lead.status" size="sm" :dot="false" />
              <span class="flex items-center gap-1">
                <i v-if="lead.meta_is_organic === true || lead.meta_is_organic === 'true'"
                  class="fas fa-seedling text-teal-500 text-[10px]"
                  title="Lead orgânico — sem campanha rastreada"></i>
                <i v-if="lead.last_error" class="fas fa-triangle-exclamation text-red-500 text-[10px]"
                  :title="lead.last_error"></i>
              </span>
            </div>
            <div class="mt-1.5 text-sm font-medium text-ink truncate" :title="lead.nome || contato(lead)">
              {{ lead.nome || contato(lead) }}
            </div>
            <div v-if="lead.nome" class="text-[11px] text-ink-muted truncate">{{ contato(lead) }}</div>
            <div v-if="lead.meta_campaign_name || lead.meta_form_name || lead.lead_form_name"
              class="mt-1 text-[10px] text-ink-subtle truncate"
              :title="lead.meta_campaign_name || lead.meta_form_name || lead.lead_form_name">
              <i :class="lead.meta_campaign_name ? 'fas fa-bullhorn' : lead.meta_form_name ? 'fas fa-square-poll-vertical' : 'fas fa-globe'"
                class="text-[9px] mr-0.5"></i>
              {{ lead.meta_campaign_name || lead.meta_form_name || lead.lead_form_name }}
            </div>
            <div class="mt-1 text-[10px] font-mono text-ink-subtle tabular-nums">
              {{ fmt(lead.created_at) }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
