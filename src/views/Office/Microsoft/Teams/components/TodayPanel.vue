<script setup>
// Faixa "Hoje" da Agenda — destaque da próxima reunião (entrar com 1 toque)
// e um resumo do dia. Fica escondida quando o usuário navegou para outro
// período (aí o botão "Hoje" da barra de controle é que resolve).

import { computed } from 'vue';
import { useTeamsStore, fmtDate } from '@/stores/Microsoft/teamsStore';

const ts = useTeamsStore();

const todayEvents = computed(() => {
  const list = ts.eventsByDay[fmtDate(new Date())] || [];
  return list.filter(e => !e.isCancelled);
});

const timedToday = computed(() =>
  todayEvents.value
    .filter(e => !e.isAllDay && e.start)
    .sort((a, b) => a.start.localeCompare(b.start))
);

const nextMeeting = computed(() => {
  const now = Date.now();
  return timedToday.value.find(e => new Date(e.end || e.start).getTime() >= now) || null;
});

// Reunião acontecendo agora (entre início e fim)
const isLive = computed(() => {
  const m = nextMeeting.value;
  if (!m) return false;
  const now = Date.now();
  return new Date(m.start).getTime() <= now && new Date(m.end).getTime() >= now;
});

const minutesUntil = computed(() => {
  if (!nextMeeting.value) return 0;
  return Math.max(0, Math.round((new Date(nextMeeting.value.start).getTime() - Date.now()) / 60000));
});

const whenLabel = computed(() => {
  if (isLive.value) return 'Acontecendo agora';
  const min = minutesUntil.value;
  if (min <= 60) return `Começa em ${min} min`;
  const h = Math.floor(min / 60);
  return `Começa em ${h}h${String(min % 60).padStart(2, '0')}`;
});

const remainingCount = computed(() =>
  timedToday.value.filter(e => new Date(e.end || e.start).getTime() >= Date.now()).length
);

function fmtTime(dt) {
  if (!dt) return '';
  return dt.split('T')[1]?.slice(0, 5) || '';
}
</script>

<template>
  <div v-if="ts.isCurrentPeriod" class="mb-4">

    <!-- Próxima reunião -->
    <div v-if="nextMeeting"
      class="rounded-xl border bg-surface-raised shadow-soft surface-gradient p-3.5
             flex flex-wrap items-center gap-x-4 gap-y-3"
      :class="isLive ? 'border-accent/50' : 'border-line'">

      <!-- Horário -->
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="shrink-0 grid place-items-center h-11 w-11 rounded-xl border"
          :class="isLive
            ? 'bg-accent text-white border-accent shadow-soft'
            : 'bg-surface-sunken text-accent border-line'">
          <span class="text-xs font-mono font-bold tabular-nums">{{ fmtTime(nextMeeting.start) }}</span>
        </div>

        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-micro font-mono uppercase tracking-wider"
              :class="isLive ? 'text-accent' : 'text-ink-subtle'">
              <span v-if="isLive" class="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse mr-1"></span>
              {{ whenLabel }}
            </span>
          </div>
          <p class="text-sm font-semibold text-ink truncate">{{ nextMeeting.subject }}</p>
          <p v-if="nextMeeting.location" class="text-micro text-ink-subtle truncate">
            <i class="fas fa-location-dot text-[9px] mr-1"></i>{{ nextMeeting.location }}
          </p>
        </div>
      </div>

      <!-- Resumo + ação -->
      <div class="flex items-center gap-3 shrink-0">
        <span class="text-micro text-ink-subtle hidden sm:block">
          <span class="font-mono tabular-nums font-semibold text-ink-muted">{{ remainingCount }}</span>
          reuniã{{ remainingCount === 1 ? 'o' : 'es' }} restante{{ remainingCount === 1 ? '' : 's' }} hoje
        </span>
        <a v-if="nextMeeting.joinUrl" :href="nextMeeting.joinUrl" target="_blank" rel="noopener"
          class="inline-flex items-center gap-2 px-4 min-h-10 rounded-lg text-xs font-semibold text-white
                 transition-colors shadow-soft"
          :class="isLive ? 'bg-accent hover:bg-accent-hover' : 'bg-purple-600 hover:bg-purple-700'">
          <i class="fas fa-video text-[10px]"></i> Entrar
        </a>
      </div>
    </div>

    <!-- Dia livre -->
    <div v-else
      class="rounded-xl border border-line bg-surface-raised/60 px-3.5 py-2.5 flex items-center gap-2.5">
      <i class="fas fa-mug-hot text-ink-subtle text-sm"></i>
      <p class="text-xs text-ink-muted">
        <span v-if="todayEvents.length">Nenhuma reunião restante hoje.</span>
        <span v-else>Nenhuma reunião hoje.</span>
      </p>
    </div>

  </div>
</template>
