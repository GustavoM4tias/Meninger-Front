<script setup>
import { computed } from 'vue';

const props = defineProps({
  periodo: { type: Object, required: true },
  kpi: { type: Object, required: true },
});
const emit = defineEmits(['filtrarSituacao']);

const periodoLabel = computed(() => {
  const ini = props.periodo?.data_inicio
    ? props.periodo.data_inicio.slice(0, 10).split('-').reverse().join('/') : '—';
  const fim = props.periodo?.data_fim
    ? props.periodo.data_fim.slice(0, 10).split('-').reverse().join('/') : '—';
  return `${ini} → ${fim}`;
});

const iconFor = (status) => ({
  'Em Atendimento': 'fas fa-people-arrows',
  'Aguardando Atendimento Corretor': 'fas fa-stopwatch',
  'Com Reserva': 'fas fa-bookmark',
  '1ª Tentativa de Contato': 'fas fa-phone',
  'Novo Lead': 'fas fa-user-plus',
  'Descartado': 'fas fa-trash-can',
  'Em Análise de Crédito': 'fas fa-credit-card',
  'Lead Qualificado': 'fas fa-ranking-star',
  'Em Negociação': 'fas fa-handshake',
  'Venda Realizada': 'fas fa-coins',
  'Atendimento Externo': 'fas fa-briefcase',
}[status] || 'fas fa-circle');

const accentFor = (status) => ({
  'Em Atendimento':                  'text-orange-500 bg-orange-500/10',
  'Aguardando Atendimento Corretor': 'text-amber-500  bg-amber-500/10',
  'Com Reserva':                     'text-yellow-500 bg-yellow-500/10',
  '1ª Tentativa de Contato':         'text-sky-500    bg-sky-500/10',
  'Novo Lead':                       'text-blue-500   bg-blue-500/10',
  'Descartado':                      'text-red-500    bg-red-500/10',
  'Em Análise de Crédito':           'text-purple-500 bg-purple-500/10',
  'Lead Qualificado':                'text-emerald-500 bg-emerald-500/10',
  'Em Negociação':                   'text-emerald-500 bg-emerald-500/10',
  'Venda Realizada':                 'text-green-500  bg-green-500/10',
  'Atendimento Externo':             'text-indigo-500 bg-indigo-500/10',
}[status] || 'text-ink-muted bg-surface-sunken');

const totalLeads = computed(() => props.kpi.total ?? 0);
</script>

<template>
  <section class="space-y-3">
    <!-- Header com período + total -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-3 min-w-0">
        <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Período</p>
        <span class="font-mono text-xs text-ink truncate">{{ periodoLabel }}</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-semibold text-ink tabular-nums tracking-tight">{{ totalLeads }}</span>
        <span class="text-xs text-ink-muted">lead{{ totalLeads === 1 ? '' : 's' }}</span>
      </div>
    </div>

    <!-- KPIs compactos: scroll horizontal no mobile, grid no desktop -->
    <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
      <div class="flex sm:grid gap-2.5 sm:gap-3
                  sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
                  min-w-max sm:min-w-0">
        <button v-for="item in kpi.items" :key="item.key"
          @click="emit('filtrarSituacao', item.key)"
          class="group flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised
                 shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
                 transition-all duration-200 ease-out-expo text-left
                 w-44 sm:w-auto shrink-0 surface-gradient">
          <div class="flex items-center justify-between gap-2">
            <span class="h-7 w-7 rounded-lg grid place-items-center text-xs"
              :class="accentFor(item.key)">
              <i :class="iconFor(item.key)"></i>
            </span>
            <span class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">
              {{ totalLeads ? ((item.count / totalLeads) * 100).toFixed(0) : 0 }}%
            </span>
          </div>
          <span class="text-xl font-semibold text-ink tabular-nums tracking-tight leading-none mt-1">
            {{ item.count }}
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
