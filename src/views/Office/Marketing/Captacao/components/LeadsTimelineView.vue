<script setup>
// Visão Timeline — agrupa por dia de entrada no Office, mostrando picos e
// distribuição temporal. Cada item é uma linha compacta dentro do dia.

import { computed } from 'vue';
import LeadStatusBadge from './LeadStatusBadge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
    leads: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
});

const emit = defineEmits(['open-detail']);

const dayKey = (iso) => {
    if (!iso) return 'sem-data';
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
};

const fmtDay = (key) => {
    if (key === 'sem-data') return 'Sem data';
    const [y, m, d] = key.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    const today = new Date();
    const yest  = new Date(); yest.setDate(today.getDate() - 1);
    const sameDay = (a, b) => a.toDateString() === b.toDateString();
    if (sameDay(date, today))  return `Hoje · ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    if (sameDay(date, yest))   return `Ontem · ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

const days = computed(() => {
    const map = new Map();
    for (const l of props.leads) {
        const k = dayKey(l.created_at);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(l);
    }
    // Ordem: mais recentes primeiro; dentro do dia, mais recentes primeiro.
    return [...map.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, items]) => ({
            key, label: fmtDay(key), items: items.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        }));
});

const contato = (l) => l.email || l.telefone || '(sem contato)';
</script>

<template>
  <section>
    <div v-if="loading" class="py-16 text-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando leads...
    </div>

    <EmptyState v-else-if="!leads.length"
      icon="fas fa-clock-rotate-left" title="Nenhum lead encontrado"
      description="Ajuste os filtros ou aguarde o próximo lead chegar pelo webhook." />

    <div v-else class="space-y-5">
      <div v-for="day in days" :key="day.key">
        <!-- Header do dia -->
        <div class="sticky top-0 z-10 flex items-baseline justify-between gap-3 mb-2 py-1
                    border-b border-line bg-surface/80 backdrop-blur">
          <h3 class="text-sm font-semibold text-ink capitalize">{{ day.label }}</h3>
          <span class="text-[11px] font-mono text-ink-subtle tabular-nums">
            {{ day.items.length }} lead{{ day.items.length > 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Itens -->
        <ol class="relative border-l border-line/60 ml-2 space-y-2">
          <li v-for="lead in day.items" :key="lead.id" class="ml-4">
            <span class="absolute -left-[5px] mt-2 h-2.5 w-2.5 rounded-full bg-accent border-2 border-surface-raised"></span>
            <button type="button" @click="emit('open-detail', lead.id)"
              class="w-full text-left rounded-lg border border-line bg-surface-raised hover:bg-surface-hover/30
                     hover:border-accent/40 hover:shadow-soft transition-all px-3 py-2 flex items-center gap-3 min-w-0">
              <span class="text-[11px] font-mono tabular-nums text-ink-subtle w-14 shrink-0">
                {{ fmtTime(lead.created_at) }}
              </span>
              <LeadStatusBadge :status="lead.status" size="sm" :dot="false" />
              <div class="flex-1 min-w-0">
                <div class="text-sm text-ink truncate">{{ lead.nome || contato(lead) }}</div>
                <div class="text-[11px] text-ink-subtle truncate">
                  <span v-if="lead.meta_campaign_name">
                    <i class="fas fa-bullhorn text-[9px] mr-1"></i>{{ lead.meta_campaign_name }}
                  </span>
                  <span v-else-if="lead.meta_form_name">
                    <i class="fas fa-square-poll-vertical text-[9px] mr-1"></i>{{ lead.meta_form_name }}
                    <span class="text-ink-subtle/70 italic"> · sem campanha</span>
                  </span>
                  <span v-else-if="lead.lead_form_name">
                    <i class="fas fa-globe text-[9px] mr-1"></i>{{ lead.lead_form_name }}
                  </span>
                  <span v-else-if="lead.midia_slug" class="font-mono">{{ lead.midia_slug }}</span>
                  <span v-else>—</span>
                </div>
              </div>
              <i v-if="lead.meta_is_organic === true || lead.meta_is_organic === 'true'"
                class="fas fa-seedling text-teal-500 text-[11px]"
                title="Lead orgânico — sem campanha rastreada"></i>
              <i v-if="lead.last_error" class="fas fa-triangle-exclamation text-red-500"
                :title="lead.last_error"></i>
            </button>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
