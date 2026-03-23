<template>
  <div class="relative select-none" @click="closePopup">

    <!-- Loading overlay -->
    <div v-if="loading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-b-2xl">
      <div class="flex items-center gap-2 text-gray-400">
        <i class="fas fa-circle-notch animate-spin"></i>
        <span class="text-sm">Carregando...</span>
      </div>
    </div>

    <!-- Day-of-week headers -->
    <div class="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
      <div v-for="(name, i) in DAY_NAMES" :key="name"
        class="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        <span class="hidden sm:inline">{{ name }}</span>
        <span class="sm:hidden">{{ name[0] }}</span>
      </div>
    </div>

    <!-- Month grid -->
    <div class="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-800">
      <div v-for="day in monthDays" :key="fmtYMD(day)"
        class="relative min-h-[80px] sm:min-h-[108px] border-b border-gray-100 dark:border-gray-800 transition-colors cursor-pointer group/cell"
        :class="[
          !isCurMonth(day)
            ? 'bg-gray-50/60 dark:bg-gray-800/20'
            : isToday(day)
              ? '!bg-blue-50/40 dark:!bg-blue-900/10'
              : 'hover:bg-violet-50/30 dark:hover:bg-violet-900/10',
        ]"
        @click="$emit('slot-click', { date: day, hour: 9, minute: 0 })">

        <!-- Day header row -->
        <div class="flex items-center justify-between px-1 sm:px-1.5 pt-1 sm:pt-1.5 mb-0.5 sm:mb-1">
          <!-- Day number -->
          <span class="text-[11px] sm:text-sm font-semibold leading-none inline-flex items-center justify-center"
            :class="[
              isToday(day)
                ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white shadow-sm'
                : isCurMonth(day)
                  ? 'text-gray-700 dark:text-gray-300'
                  : 'text-gray-300 dark:text-gray-600',
            ]">
            {{ day.getDate() }}
          </span>

          <!-- "+" create hint (só aparece no hover) -->
          <button
            @click.stop="$emit('slot-click', { date: day, hour: 9, minute: 0 })"
            class="opacity-0 group-hover/cell:opacity-100 w-4 h-4 rounded flex items-center justify-center text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all text-[9px]">
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <!-- Events (max 3 visible) -->
        <div class="px-1 sm:px-1.5 space-y-0.5 pb-1">
          <div
            v-for="ev in visibleEvents(day)" :key="ev.id"
            :title="ev.subject"
            @click.stop="$emit('event-click', ev)"
            class="truncate text-[10px] sm:text-[11px] px-1 sm:px-1.5 py-0.5 rounded cursor-pointer font-medium leading-snug transition-all hover:brightness-95 dark:hover:brightness-110 hover:shadow-sm"
            :class="chipClass(ev)">
            <i v-if="ev.isOnlineMeeting && !ev.isAllDay" class="fas fa-video text-[7px] sm:text-[8px] mr-0.5 opacity-70"></i>
            <span v-if="!ev.isAllDay" class="opacity-70 mr-0.5 hidden sm:inline">{{ fmtTime(ev.start) }}</span>
            {{ ev.subject }}
          </div>

          <!-- "+N overflow" → popup (não cria evento) -->
          <button
            v-if="overflowCount(day) > 0"
            @click.stop="showPopup(day, $event)"
            class="w-full text-left text-[10px] text-violet-600 dark:text-violet-400 px-1 sm:px-1.5 py-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors font-semibold">
            +{{ overflowCount(day) }} mais
          </button>
        </div>

      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && !hasAnyEvent" class="py-16 text-center pointer-events-none">
      <i class="fas fa-calendar-xmark text-4xl text-gray-200 dark:text-gray-700 mb-3 block"></i>
      <p class="text-sm text-gray-400">Nenhum evento neste mês</p>
    </div>

  </div>

  <!-- ── Popup de eventos do dia ── -->
  <Teleport to="body">
    <Transition name="popup">
      <div v-if="popupDay" class="fixed inset-0 z-[9990]" @click="closePopup">
        <div
          class="absolute bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-56 max-h-72 overflow-hidden flex flex-col"
          :style="popupStyle"
          @click.stop>

          <!-- Header -->
          <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">{{ popupDayLabel }}</span>
            <button @click="closePopup"
              class="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <i class="fas fa-times text-[9px]"></i>
            </button>
          </div>

          <!-- Events list -->
          <div class="overflow-y-auto flex-1 py-0.5">
            <div
              v-for="ev in popupEvents" :key="ev.id"
              @click="onPopupEventClick(ev)"
              class="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors">
              <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" :class="dotClass(ev)"></div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug"
                  :class="{ 'line-through text-gray-400 dark:text-gray-500': ev.isCancelled }">
                  {{ ev.subject }}
                </p>
                <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  <i v-if="ev.isOnlineMeeting" class="fas fa-video mr-1 text-[8px]"></i>
                  <span v-if="ev.isAllDay">Dia inteiro</span>
                  <span v-else>{{ fmtTime(ev.start) }}{{ ev.end ? ' – ' + fmtTime(ev.end) : '' }}</span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>

</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  events:    { type: Array,   default: () => [] },
  monthDays: { type: Array,   default: () => [] },
  viewDate:  { type: Date,    default: () => new Date() },
  loading:   { type: Boolean, default: false },
});

const emit = defineEmits(['event-click', 'slot-click']);

const DAY_NAMES   = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_NAMES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MAX_VISIBLE = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() && date.getMonth() === t.getMonth() && date.getDate() === t.getDate();
}

function isCurMonth(date) {
  return date.getMonth() === props.viewDate.getMonth() && date.getFullYear() === props.viewDate.getFullYear();
}

function fmtTime(dt) {
  if (!dt) return '';
  return dt.split('T')[1]?.slice(0, 5) || '';
}

// ── Events map ────────────────────────────────────────────────────────────────
const eventsByDay = computed(() => {
  const map = {};
  for (const ev of props.events) {
    if (!ev.start) continue;
    const day = ev.start.split('T')[0];
    if (!map[day]) map[day] = [];
    map[day].push(ev);
  }
  return map;
});

const hasAnyEvent = computed(() => props.events.length > 0);

function visibleEvents(day) {
  return (eventsByDay.value[fmtYMD(day)] || []).slice(0, MAX_VISIBLE);
}

function overflowCount(day) {
  const total = (eventsByDay.value[fmtYMD(day)] || []).length;
  return Math.max(0, total - MAX_VISIBLE);
}

// ── Chip / dot colors ─────────────────────────────────────────────────────────
function chipClass(ev) {
  if (ev.isCancelled)     return 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through';
  if (ev.isAllDay)        return 'bg-blue-500 text-white';
  if (ev.isOnlineMeeting) return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300';
  return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
}

function dotClass(ev) {
  if (ev.isCancelled)     return 'bg-gray-300 dark:bg-gray-600';
  if (ev.isAllDay)        return 'bg-blue-500';
  if (ev.isOnlineMeeting) return 'bg-purple-500';
  return 'bg-blue-400';
}

// ── Popup ─────────────────────────────────────────────────────────────────────
const popupDay = ref(null);
const popupPos = ref({ top: 0, left: 0 });

const popupEvents = computed(() =>
  popupDay.value ? (eventsByDay.value[popupDay.value] || []) : []
);

const popupDayLabel = computed(() => {
  if (!popupDay.value) return '';
  const [y, m, d] = popupDay.value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
});

const popupStyle = computed(() => ({
  position: 'fixed',
  top:  popupPos.value.top  + 'px',
  left: popupPos.value.left + 'px',
}));

function showPopup(day, e) {
  const rect     = e.currentTarget.getBoundingClientRect();
  const popupW   = 224;  // w-56
  const popupH   = 288;  // max-h-72

  let top  = rect.bottom + 4;
  let left = rect.left;

  if (left + popupW > window.innerWidth  - 8) left = window.innerWidth  - popupW - 8;
  if (left < 8)                                left = 8;
  if (top  + popupH > window.innerHeight - 8) top  = rect.top - popupH - 4;
  if (top  < 8)                                top  = 8;

  popupPos.value = { top, left };
  popupDay.value = fmtYMD(day);
}

function closePopup() {
  popupDay.value = null;
}

function onPopupEventClick(ev) {
  closePopup();
  emit('event-click', ev);
}
</script>

<style scoped>
.popup-enter-active { transition: opacity 0.15s, transform 0.15s; }
.popup-leave-active { transition: opacity 0.1s; }
.popup-enter-from   { opacity: 0; transform: scale(0.95) translateY(-4px); }
.popup-leave-to     { opacity: 0; }
</style>
