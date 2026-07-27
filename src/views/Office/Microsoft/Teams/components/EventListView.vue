<script setup>
// Visão Lista (agenda) — a mais confortável no celular. Agrupa por dia com
// cabeçalho fixo; o botão "Entrar" fica sempre visível no toque (no desktop
// aparece no hover para não poluir).

import { computed } from 'vue';

const props = defineProps({
  events:  { type: Array,   default: () => [] },
  loading: { type: Boolean, default: false },
});
defineEmits(['event-click', 'slot-click']);

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTHS    = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function fmtTime(dt) { return dt ? (dt.split('T')[1]?.slice(0, 5) || '') : ''; }

function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() && date.getMonth() === t.getMonth() && date.getDate() === t.getDate();
}

const groupedEvents = computed(() => {
  const map = {};
  for (const ev of props.events) {
    if (!ev.start) continue;
    (map[ev.start.split('T')[0]] ||= []).push(ev);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, evs]) => {
      const d = new Date(day + 'T12:00:00');
      return {
        day,
        events: [...evs].sort((a, b) => (a.start || '').localeCompare(b.start || '')),
        dayName:  DAY_NAMES[d.getDay()],
        dayDate:  `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`,
        dayNum:   d.getDate(),
        isToday:  isToday(d),
      };
    });
});

function barClass(ev) {
  if (ev.isCancelled)     return 'bg-ink-subtle/40';
  if (ev.isOnlineMeeting) return 'bg-purple-500';
  return 'bg-accent';
}
</script>

<template>
  <div>

    <!-- Carregando -->
    <div v-if="loading" class="py-16 flex items-center justify-center gap-2 text-ink-muted">
      <i class="fas fa-circle-notch animate-spin"></i>
      <span class="text-sm">Carregando...</span>
    </div>

    <!-- Vazio -->
    <div v-else-if="!groupedEvents.length" class="py-16 flex flex-col items-center text-center px-6">
      <div class="grid place-items-center h-12 w-12 rounded-2xl bg-surface-sunken border border-line text-ink-subtle mb-3">
        <i class="fas fa-calendar-xmark"></i>
      </div>
      <p class="text-sm text-ink-muted">Nenhum evento neste período</p>
      <p class="text-xs text-ink-subtle mt-1">Use "Novo evento" para agendar</p>
    </div>

    <!-- Grupos por dia -->
    <div v-for="group in groupedEvents" :key="group.day">

      <!-- Cabeçalho do dia (fixo no scroll) -->
      <div class="flex items-center gap-3 px-4 sm:px-5 py-2.5 bg-surface-sunken/80 backdrop-blur-sm
                  sticky top-0 z-10 border-b border-line">
        <div class="shrink-0 flex items-center justify-center text-sm font-bold"
          :class="group.isToday
            ? 'h-8 w-8 rounded-full bg-accent text-white shadow-soft'
            : 'h-8 w-8 text-ink-subtle'">
          {{ group.dayNum }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-ink truncate">{{ group.dayName }}</span>
            <span v-if="group.isToday"
              class="shrink-0 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent-soft text-accent">
              Hoje
            </span>
          </div>
          <p class="text-[11px] text-ink-subtle truncate">{{ group.dayDate }}</p>
        </div>
        <span class="shrink-0 text-[11px] font-mono tabular-nums text-ink-subtle">
          {{ group.events.length }}
        </span>
      </div>

      <!-- Eventos do dia -->
      <button v-for="ev in group.events" :key="ev.id"
        @click="$emit('event-click', ev)"
        class="w-full flex items-stretch gap-3 px-4 sm:px-5 py-3 text-left border-b border-line/60
               hover:bg-surface-hover/40 transition-colors group">

        <!-- Horário + barra de cor -->
        <div class="shrink-0 flex items-stretch gap-2.5">
          <div class="w-16 pt-0.5">
            <template v-if="!ev.isAllDay">
              <p class="text-sm font-mono font-semibold tabular-nums leading-tight"
                :class="ev.isCancelled ? 'text-ink-subtle line-through' : 'text-ink'">
                {{ fmtTime(ev.start) }}
              </p>
              <p class="text-[11px] font-mono tabular-nums text-ink-subtle leading-tight">
                {{ fmtTime(ev.end) }}
              </p>
            </template>
            <p v-else class="text-[11px] font-medium text-ink-subtle leading-tight">Dia inteiro</p>
          </div>
          <div class="w-1 rounded-full shrink-0" :class="barClass(ev)"></div>
        </div>

        <!-- Conteúdo -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center flex-wrap gap-1.5">
            <span class="text-sm font-semibold text-ink"
              :class="ev.isCancelled ? 'line-through opacity-60' : ''">
              {{ ev.subject }}
            </span>
            <span v-if="ev.isOnlineMeeting"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-semibold shrink-0">
              <i class="fas fa-video text-[8px]"></i> Teams
            </span>
            <span v-if="ev.isRecurring"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-sunken text-ink-subtle text-[10px] shrink-0">
              <i class="fas fa-rotate text-[8px]"></i> Recorrente
            </span>
            <span v-if="ev.isCancelled"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-semibold shrink-0">
              Cancelado
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-ink-subtle">
            <span v-if="ev.location" class="inline-flex items-center gap-1 min-w-0">
              <i class="fas fa-location-dot text-[9px] shrink-0"></i>
              <span class="truncate">{{ ev.location }}</span>
            </span>
            <span v-if="ev.organizer?.name || ev.organizer?.email" class="inline-flex items-center gap-1 min-w-0">
              <i class="fas fa-user text-[9px] shrink-0"></i>
              <span class="truncate">{{ ev.organizer.name || ev.organizer.email }}</span>
            </span>
            <span v-if="ev.attendees?.length" class="inline-flex items-center gap-1">
              <i class="fas fa-users text-[9px]"></i>
              {{ ev.attendees.length }}
            </span>
          </div>
        </div>

        <!-- Ações: sempre visíveis no celular, no hover no desktop -->
        <div class="shrink-0 flex items-center gap-1.5 self-center">
          <a v-if="ev.joinUrl && !ev.isCancelled" :href="ev.joinUrl" target="_blank" rel="noopener"
            @click.stop
            class="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-lg bg-purple-600 hover:bg-purple-700
                   text-white text-xs font-semibold transition-all shadow-soft
                   sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
            <i class="fas fa-video text-[10px]"></i>
            <span class="hidden sm:inline">Entrar</span>
          </a>
          <i class="fas fa-chevron-right text-xs text-ink-subtle hidden sm:block
                    opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </div>

      </button>
    </div>

  </div>
</template>
