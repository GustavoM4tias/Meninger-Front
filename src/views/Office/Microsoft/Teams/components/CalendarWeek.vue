<template>
  <div class="flex flex-col min-h-0">

    <!-- Day headers -->
    <div class="grid grid-cols-[48px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0">
      <div></div>
      <div v-for="day in weekDays" :key="fmtYMD(day)"
        :class="isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'"
        class="py-2 text-center text-xs font-semibold uppercase tracking-wide border-l border-gray-100 dark:border-gray-800">
        <div>{{ DAY_NAMES[day.getDay()] }}</div>
        <div :class="isToday(day)
          ? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mt-0.5 text-sm font-bold'
          : 'text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5'">
          {{ day.getDate() }}
        </div>
      </div>
    </div>

    <!-- All-day events row -->
    <div v-if="hasAllDay"
      class="grid grid-cols-[48px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
      <div class="text-xs text-gray-400 flex items-center justify-end pr-2 py-1">Todo dia</div>
      <div v-for="day in weekDays" :key="fmtYMD(day)"
        class="border-l border-gray-100 dark:border-gray-800 p-0.5 min-h-[28px]">
        <div v-for="ev in allDayByDay[fmtYMD(day)]" :key="ev.id"
          @click="$emit('event-click', ev)"
          class="truncate text-xs px-1.5 py-0.5 rounded-md cursor-pointer mb-0.5 font-medium"
          :class="ev.isOnlineMeeting
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/60'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40'">
          {{ ev.subject }}
        </div>
      </div>
    </div>

    <!-- Time grid -->
    <div class="flex-1 overflow-y-auto" style="max-height: 600px">
      <div class="grid grid-cols-[48px_repeat(7,1fr)] relative" :style="{ height: TOTAL_HEIGHT + 'px' }">

        <!-- Hour lines + labels -->
        <template v-for="h in hours" :key="h">
          <div class="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800 flex items-start"
            :style="{ top: ((h - HOUR_START) * SLOT_PX) + 'px' }">
            <span class="text-xs text-gray-400 dark:text-gray-500 w-11 text-right pr-2 -mt-2 select-none">
              {{ h === 12 ? '12:00' : h > 12 ? `${h-12}pm` : `${h}am` }}
            </span>
          </div>
        </template>

        <!-- Day columns -->
        <div></div><!-- spacer for time label column -->
        <div v-for="day in weekDays" :key="fmtYMD(day)"
          class="relative border-l border-gray-100 dark:border-gray-800 cursor-pointer"
          :class="isToday(day) ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''"
          @click.self="onColumnClick($event, day)">

          <!-- Current time indicator -->
          <div v-if="isToday(day) && nowOffset >= 0"
            class="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
            :style="{ top: nowOffset + 'px' }">
            <div class="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
            <div class="flex-1 h-px bg-red-500"></div>
          </div>

          <!-- Events -->
          <div v-for="ev in timedByDay[fmtYMD(day)]" :key="ev.id"
            @click="$emit('event-click', ev)"
            class="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-0.5 cursor-pointer overflow-hidden transition-opacity hover:opacity-90 group"
            :class="eventClass(ev)"
            :style="eventStyle(ev)">
            <div class="text-xs font-semibold truncate leading-tight">{{ ev.subject }}</div>
            <div class="text-xs opacity-75 truncate">{{ fmtTime(ev.start) }} – {{ fmtTime(ev.end) }}</div>
            <i v-if="ev.isOnlineMeeting" class="fas fa-video absolute top-1 right-1 text-xs opacity-50 group-hover:opacity-100"></i>
          </div>

        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && !hasAnyEvent"
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-24">
      <i class="fas fa-calendar-xmark text-4xl text-gray-200 dark:text-gray-700 mb-3"></i>
      <p class="text-sm text-gray-400">Nenhum evento nesta semana</p>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <i class="fas fa-circle-notch animate-spin"></i>
        <span class="text-sm">Carregando...</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  events:   { type: Array,   default: () => [] },
  weekDays: { type: Array,   default: () => [] },
  loading:  { type: Boolean, default: false },
});
const emit = defineEmits(['event-click', 'slot-click']);

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOUR_START = 6;
const HOUR_END   = 22;
const SLOT_PX    = 64; // px per hour
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * SLOT_PX;
const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate();
}

function fmtTime(dt) {
  if (!dt) return '';
  return dt.split('T')[1]?.slice(0, 5) || '';
}

function eventMinutes(dt) {
  if (!dt) return 0;
  const time = dt.split('T')[1] || '00:00:00';
  const [h, m] = time.split(':');
  return parseInt(h) * 60 + parseInt(m);
}

function eventDay(dt) {
  if (!dt) return '';
  return dt.split('T')[0];
}

// ── Slot click (click on empty area → create event) ───────────────────────────
function onColumnClick(e, day) {
  const rect = e.currentTarget.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const minutesFromStart = (y / SLOT_PX) * 60;
  const totalMinutes = HOUR_START * 60 + minutesFromStart;
  const hour   = Math.floor(totalMinutes / 60);
  const minute = Math.round((totalMinutes % 60) / 15) * 15; // snap to 15min
  emit('slot-click', { date: day, hour, minute });
}

// ── Current time indicator ────────────────────────────────────────────────────
const nowOffset = ref(-1);
function updateNow() {
  const now = new Date();
  const min = now.getHours() * 60 + now.getMinutes();
  if (min < HOUR_START * 60 || min > HOUR_END * 60) { nowOffset.value = -1; return; }
  nowOffset.value = (min - HOUR_START * 60) * SLOT_PX / 60;
}
let timer;
onMounted(() => { updateNow(); timer = setInterval(updateNow, 60000); });
onUnmounted(() => clearInterval(timer));

// ── Event grouping ────────────────────────────────────────────────────────────
const allDayByDay = computed(() => {
  const map = {};
  for (const ev of props.events) {
    if (!ev.isAllDay) continue;
    const day = eventDay(ev.start);
    if (!map[day]) map[day] = [];
    map[day].push(ev);
  }
  return map;
});

const timedByDay = computed(() => {
  const map = {};
  for (const ev of props.events) {
    if (ev.isAllDay) continue;
    const day = eventDay(ev.start);
    if (!map[day]) map[day] = [];
    map[day].push(ev);
  }
  return map;
});

const hasAllDay = computed(() => Object.values(allDayByDay.value).some(a => a.length));
const hasAnyEvent = computed(() => props.events.length > 0);

// ── Event positioning ─────────────────────────────────────────────────────────
function eventStyle(ev) {
  const startMin = Math.max(eventMinutes(ev.start), HOUR_START * 60);
  const endMin   = Math.min(eventMinutes(ev.end),   HOUR_END   * 60);
  const top    = (startMin - HOUR_START * 60) * SLOT_PX / 60;
  const height = Math.max((endMin - startMin) * SLOT_PX / 60, 28);
  return { top: `${top}px`, height: `${height}px`, minHeight: '28px' };
}

function eventClass(ev) {
  if (ev.isCancelled) return 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through border border-gray-200 dark:border-gray-700';
  if (ev.isOnlineMeeting) return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700/50';
  return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700/50';
}
</script>
