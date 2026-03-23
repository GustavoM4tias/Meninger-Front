<template>
  <div>

    <!-- Loading -->
    <div v-if="loading" class="py-16 flex items-center justify-center gap-2 text-gray-400">
      <i class="fas fa-circle-notch animate-spin"></i>
      <span class="text-sm">Carregando...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="!groupedEvents.length" class="py-16 text-center">
      <i class="fas fa-calendar-xmark text-4xl text-gray-200 dark:text-gray-700 mb-3 block"></i>
      <p class="text-sm text-gray-400">Nenhum evento neste período</p>
    </div>

    <!-- Event groups by day -->
    <div v-for="group in groupedEvents" :key="group.day">

      <!-- Sticky day header -->
      <div class="flex items-center gap-3 px-5 py-2.5 bg-gray-50 dark:bg-gray-800/60 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800">
        <div
          :class="group.isToday
            ? 'w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm'
            : 'w-8 h-8 flex items-center justify-center text-lg font-bold text-gray-300 dark:text-gray-600 shrink-0'">
          {{ group.dayNum }}
        </div>
        <div class="flex-1 min-w-0">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ group.dayName }}</span>
          <span v-if="group.isToday" class="ml-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">Hoje</span>
        </div>
        <span class="text-xs text-gray-400 shrink-0">
          {{ group.events.length }} evento{{ group.events.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Events -->
      <div>
        <div v-for="ev in group.events" :key="ev.id"
          @click="$emit('event-click', ev)"
          class="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors group border-b border-gray-50 dark:border-gray-800/50">

          <!-- Color indicator + time -->
          <div class="flex flex-col items-center gap-1 pt-0.5 shrink-0 w-14">
            <div class="w-2.5 h-2.5 rounded-full shrink-0" :class="dotClass(ev)"></div>
            <template v-if="!ev.isAllDay">
              <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ fmtTime(ev.start) }}</span>
              <span class="text-xs text-gray-400">{{ fmtTime(ev.end) }}</span>
            </template>
            <span v-else class="text-[10px] text-gray-400 font-medium text-center leading-tight">Dia<br>todo</span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center flex-wrap gap-1.5 mb-0.5">
              <span class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate" :class="ev.isCancelled ? 'line-through opacity-50' : ''">
                {{ ev.subject }}
              </span>
              <span v-if="ev.isOnlineMeeting" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-[10px] font-semibold shrink-0">
                <i class="fas fa-video text-[8px]"></i> Teams
              </span>
              <span v-if="ev.isRecurring" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 text-[10px] shrink-0">
                <i class="fas fa-rotate text-[8px]"></i> Recorrente
              </span>
              <span v-if="ev.isCancelled" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 text-[10px] font-semibold shrink-0">
                Cancelado
              </span>
            </div>
            <div v-if="ev.location" class="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
              <i class="fas fa-location-dot text-[9px]"></i> {{ ev.location }}
            </div>
            <div v-if="ev.organizer?.name || ev.organizer?.email" class="text-xs text-gray-400">
              <i class="fas fa-user text-[9px] mr-1"></i>{{ ev.organizer.name || ev.organizer.email }}
            </div>
            <div v-if="ev.attendees?.length" class="text-xs text-gray-400 mt-0.5">
              <i class="fas fa-users text-[9px] mr-1"></i>{{ ev.attendees.length }} participante{{ ev.attendees.length !== 1 ? 's' : '' }}
            </div>
          </div>

          <!-- Actions (appear on hover) -->
          <div class="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
            <a v-if="ev.joinUrl && !ev.isCancelled" :href="ev.joinUrl" target="_blank" rel="noopener"
              @click.stop
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shadow-sm">
              <i class="fas fa-video text-[10px]"></i> Entrar
            </a>
            <button @click.stop="$emit('event-click', ev)"
              class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <i class="fas fa-chevron-right text-xs"></i>
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  events:  { type: Array,   default: () => [] },
  loading: { type: Boolean, default: false },
});
defineEmits(['event-click', 'slot-click']);

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTHS    = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function fmtTime(dt) {
  if (!dt) return '';
  return dt.split('T')[1]?.slice(0, 5) || '';
}

function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() && date.getMonth() === t.getMonth() && date.getDate() === t.getDate();
}

const groupedEvents = computed(() => {
  const map = {};
  for (const ev of props.events) {
    if (!ev.start) continue;
    const day = ev.start.split('T')[0];
    if (!map[day]) map[day] = [];
    map[day].push(ev);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, evs]) => {
      const d = new Date(day + 'T12:00:00');
      return {
        day,
        events: [...evs].sort((a, b) => (a.start || '').localeCompare(b.start || '')),
        dayName: `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`,
        dayNum:  d.getDate(),
        isToday: isToday(d),
      };
    });
});

function dotClass(ev) {
  if (ev.isCancelled)     return 'bg-gray-300 dark:bg-gray-600';
  if (ev.isOnlineMeeting) return 'bg-purple-500';
  return 'bg-blue-500';
}
</script>
