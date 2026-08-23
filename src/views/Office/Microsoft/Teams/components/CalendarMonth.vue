<script setup>
// Visão Mês — grade de 7 colunas. Dias fora do mês ficam recuados, o dia atual
// é destacado e o excedente de eventos abre num popup posicionado na tela.

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
function isWeekend(date) { const d = date.getDay(); return d === 0 || d === 6; }
function fmtTime(dt) { return dt ? (dt.split('T')[1]?.slice(0, 5) || '') : ''; }

// ── Eventos por dia ───────────────────────────────────────────────────────────
const eventsByDay = computed(() => {
  const map = {};
  for (const ev of props.events) {
    if (!ev.start) continue;
    (map[ev.start.split('T')[0]] ||= []).push(ev);
  }
  // dia inteiro primeiro, depois por horário
  for (const list of Object.values(map)) {
    list.sort((a, b) =>
      (b.isAllDay ? 1 : 0) - (a.isAllDay ? 1 : 0) || (a.start || '').localeCompare(b.start || '')
    );
  }
  return map;
});

const hasAnyEvent = computed(() => props.events.length > 0);

function dayEvents(day) { return eventsByDay.value[fmtYMD(day)] || []; }
function visibleEvents(day) { return dayEvents(day).slice(0, MAX_VISIBLE); }
function overflowCount(day) { return Math.max(0, dayEvents(day).length - MAX_VISIBLE); }

// ── Cores ─────────────────────────────────────────────────────────────────────
function chipClass(ev) {
  if (ev.isCancelled)     return 'bg-surface-sunken text-ink-subtle line-through border-line';
  if (ev.isAllDay)        return 'bg-accent text-white border-accent';
  if (ev.isOnlineMeeting) return 'bg-purple-500/15 text-purple-700 dark:text-purple-200 border-purple-500/30';
  return 'bg-accent-soft text-accent border-accent/30';
}
function dotClass(ev) {
  if (ev.isCancelled)     return 'bg-ink-subtle';
  if (ev.isOnlineMeeting) return 'bg-purple-500';
  return 'bg-accent';
}

// ── Popup do "+N mais" ────────────────────────────────────────────────────────
const popupDay = ref(null);
const popupPos = ref({ top: 0, left: 0 });

const popupEvents = computed(() => popupDay.value ? (eventsByDay.value[popupDay.value] || []) : []);

const popupDayLabel = computed(() => {
  if (!popupDay.value) return '';
  const [y, m, d] = popupDay.value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
});

const popupStyle = computed(() => ({
  position: 'fixed',
  top:  popupPos.value.top + 'px',
  left: popupPos.value.left + 'px',
}));

function showPopup(day, e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const popupW = 240, popupH = 288;
  let top = rect.bottom + 4;
  let left = rect.left;
  if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
  if (left < 8) left = 8;
  if (top + popupH > window.innerHeight - 8) top = Math.max(8, rect.top - popupH - 4);
  popupPos.value = { top, left };
  popupDay.value = fmtYMD(day);
}
function closePopup() { popupDay.value = null; }
function onPopupEventClick(ev) { closePopup(); emit('event-click', ev); }
</script>

<template>
  <div class="relative select-none" @click="closePopup">

    <!-- Carregando -->
    <div v-if="loading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-surface-raised/60 backdrop-blur-sm">
      <div class="flex items-center gap-2 text-ink-muted">
        <i class="fas fa-circle-notch animate-spin"></i>
        <span class="text-sm">Carregando...</span>
      </div>
    </div>

    <!-- Cabeçalho dos dias da semana -->
    <div class="grid grid-cols-7 border-b border-line bg-surface-sunken/60">
      <div v-for="name in DAY_NAMES" :key="name"
        class="py-2 text-center text-micro font-mono uppercase tracking-wider text-ink-subtle">
        <span class="hidden sm:inline">{{ name }}</span>
        <span class="sm:hidden">{{ name[0] }}</span>
      </div>
    </div>

    <!-- Grade do mês -->
    <div class="grid grid-cols-7">
      <div v-for="day in monthDays" :key="fmtYMD(day)"
        class="relative flex flex-col min-h-[92px] sm:min-h-[116px] border-b border-r border-line
               [&:nth-child(7n)]:border-r-0 transition-colors cursor-pointer group/cell"
        :class="[
          !isCurMonth(day)
            ? 'bg-surface-sunken/40'
            : isToday(day)
              ? 'bg-accent/[0.06]'
              : isWeekend(day)
                ? 'bg-surface-sunken/20 hover:bg-surface-hover/40'
                : 'hover:bg-surface-hover/40',
        ]"
        @click="$emit('slot-click', { date: day, hour: 9, minute: 0 })">

        <!-- Número do dia -->
        <div class="flex items-center justify-between px-1.5 pt-1.5 pb-1">
          <span class="text-xs sm:text-sm font-semibold leading-none inline-flex items-center justify-center"
            :class="isToday(day)
              ? 'h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-accent text-white shadow-soft'
              : isCurMonth(day) ? 'text-ink' : 'text-ink-subtle'">
            {{ day.getDate() }}
          </span>

          <button
            @click.stop="$emit('slot-click', { date: day, hour: 9, minute: 0 })"
            aria-label="Criar evento neste dia"
            class="h-5 w-5 rounded grid place-items-center text-micro text-ink-subtle
                   opacity-0 group-hover/cell:opacity-100 focus:opacity-100
                   hover:text-accent hover:bg-accent-soft transition-all">
            <i class="fas fa-plus"></i>
          </button>
        </div>

        <!-- Eventos -->
        <div class="px-1 pb-1 space-y-0.5">
          <button v-for="ev in visibleEvents(day)" :key="ev.id"
            :title="ev.subject"
            @click.stop="$emit('event-click', ev)"
            class="w-full flex items-center gap-1 text-left truncate text-micro sm:text-micro
                   px-1.5 py-0.5 rounded border font-medium leading-snug transition-colors hover:shadow-soft"
            :class="chipClass(ev)">
            <i v-if="ev.isOnlineMeeting && !ev.isAllDay" class="fas fa-video text-[7px] opacity-70 shrink-0"></i>
            <span v-if="!ev.isAllDay" class="font-mono tabular-nums opacity-70 hidden sm:inline shrink-0">
              {{ fmtTime(ev.start) }}
            </span>
            <span class="truncate">{{ ev.subject }}</span>
          </button>

          <button v-if="overflowCount(day) > 0"
            @click.stop="showPopup(day, $event)"
            class="w-full text-left text-micro font-semibold text-accent px-1.5 py-0.5 rounded
                   hover:bg-accent-soft transition-colors">
            +{{ overflowCount(day) }} mais
          </button>
        </div>

      </div>
    </div>

    <!-- Vazio -->
    <div v-if="!loading && !hasAnyEvent"
      class="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
      <div class="grid place-items-center h-12 w-12 rounded-2xl bg-surface-raised border border-line text-ink-subtle mb-3 shadow-soft">
        <i class="fas fa-calendar-xmark"></i>
      </div>
      <p class="text-sm text-ink-muted">Nenhum evento neste mês</p>
      <p class="text-xs text-ink-subtle mt-1">Clique em um dia para agendar</p>
    </div>

  </div>

  <!-- Popup dos eventos do dia -->
  <Teleport to="body">
    <Transition name="popup">
      <div v-if="popupDay" class="fixed inset-0 z-[9990]" @click="closePopup">
        <div class="absolute bg-surface-raised rounded-xl shadow-overlay border border-line w-60 max-h-72 overflow-hidden flex flex-col"
          :style="popupStyle" @click.stop>

          <div class="flex items-center justify-between px-3 py-2 border-b border-line shrink-0">
            <span class="text-xs font-semibold text-ink">{{ popupDayLabel }}</span>
            <button @click="closePopup"
              class="h-6 w-6 rounded grid place-items-center text-ink-subtle hover:bg-surface-hover transition-colors">
              <i class="fas fa-times text-[10px]"></i>
            </button>
          </div>

          <div class="overflow-y-auto flex-1 py-0.5">
            <button v-for="ev in popupEvents" :key="ev.id"
              @click="onPopupEventClick(ev)"
              class="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-surface-hover transition-colors">
              <div class="h-2 w-2 rounded-full mt-1.5 shrink-0" :class="dotClass(ev)"></div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-ink leading-snug"
                  :class="{ 'line-through text-ink-subtle': ev.isCancelled }">
                  {{ ev.subject }}
                </p>
                <p class="text-micro text-ink-subtle mt-0.5">
                  <i v-if="ev.isOnlineMeeting" class="fas fa-video mr-1 text-[8px]"></i>
                  <span v-if="ev.isAllDay">Dia inteiro</span>
                  <span v-else class="font-mono tabular-nums">
                    {{ fmtTime(ev.start) }}{{ ev.end ? ' – ' + fmtTime(ev.end) : '' }}
                  </span>
                </p>
              </div>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>

</template>

<style scoped>
.popup-enter-active { transition: opacity 0.15s, transform 0.15s; }
.popup-leave-active { transition: opacity 0.1s; }
.popup-enter-from   { opacity: 0; transform: scale(0.95) translateY(-4px); }
.popup-leave-to     { opacity: 0; }
</style>
