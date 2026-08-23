<script setup>
// Grade de horários — usada pelas visões Semana (7 colunas) e Dia (1 coluna).
// Eventos simultâneos são distribuídos lado a lado (algoritmo de colunas), a
// faixa de horas se adapta aos eventos do período e o scroll abre na hora atual.

import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue';

const props = defineProps({
  events:   { type: Array,   default: () => [] },
  weekDays: { type: Array,   default: () => [] },
  loading:  { type: Boolean, default: false },
});
const emit = defineEmits(['event-click', 'slot-click']);

const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SLOT_PX   = 56;   // altura de 1 hora
const MIN_EVENT_PX = 24;

const isSingleDay = computed(() => props.weekDays.length === 1);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear()
      && date.getMonth() === t.getMonth()
      && date.getDate() === t.getDate();
}
function isWeekend(date) { const d = date.getDay(); return d === 0 || d === 6; }
function fmtTime(dt) { return dt ? (dt.split('T')[1]?.slice(0, 5) || '') : ''; }
function eventDay(dt) { return dt ? dt.split('T')[0] : ''; }
function minutesOf(dt) {
  if (!dt) return 0;
  const [h, m] = (dt.split('T')[1] || '00:00').split(':');
  return parseInt(h) * 60 + parseInt(m);
}

// ── Agrupamento ───────────────────────────────────────────────────────────────
const allDayByDay = computed(() => {
  const map = {};
  for (const ev of props.events) {
    if (!ev.isAllDay) continue;
    (map[eventDay(ev.start)] ||= []).push(ev);
  }
  return map;
});

const timedByDay = computed(() => {
  const map = {};
  for (const ev of props.events) {
    if (ev.isAllDay) continue;
    (map[eventDay(ev.start)] ||= []).push(ev);
  }
  return map;
});

const hasAllDay = computed(() => Object.values(allDayByDay.value).some(a => a.length));
const hasAnyEvent = computed(() => props.events.length > 0);

// ── Faixa de horas dinâmica ───────────────────────────────────────────────────
// Padrão 7h–21h, mas expande para caber eventos fora dessa janela (antes,
// um evento às 5h simplesmente não aparecia).
const hourRange = computed(() => {
  let start = 7, end = 21;
  for (const ev of props.events) {
    if (ev.isAllDay || !ev.start) continue;
    start = Math.min(start, Math.floor(minutesOf(ev.start) / 60));
    end   = Math.max(end,   Math.ceil(minutesOf(ev.end || ev.start) / 60));
  }
  return { start: Math.max(0, start), end: Math.min(24, Math.max(end, start + 4)) };
});

const hours = computed(() => {
  const { start, end } = hourRange.value;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});
const totalHeight = computed(() => (hourRange.value.end - hourRange.value.start) * SLOT_PX);

function topFor(minutes) {
  return (minutes - hourRange.value.start * 60) * SLOT_PX / 60;
}

// ── Layout de eventos sobrepostos ─────────────────────────────────────────────
// Agrupa eventos que se cruzam no tempo e distribui em colunas lado a lado,
// para que reuniões simultâneas não fiquem uma escondendo a outra.
// Devolve wrappers { ev, col, cols } — nunca muta o evento da store.
function layoutDay(events) {
  const sorted = [...events].sort((a, b) =>
    minutesOf(a.start) - minutesOf(b.start) || minutesOf(b.end) - minutesOf(a.end)
  );

  const out = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const colEnds = [];                       // fim do último evento de cada coluna
    const placed = [];
    for (const ev of cluster) {
      const s = minutesOf(ev.start);
      let col = colEnds.findIndex(end => s >= end);
      if (col === -1) { col = colEnds.length; colEnds.push(0); }
      colEnds[col] = Math.max(minutesOf(ev.end), s + 15);
      placed.push({ ev, col });
    }
    for (const p of placed) out.push({ ...p, cols: colEnds.length });
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of sorted) {
    if (cluster.length && minutesOf(ev.start) >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, minutesOf(ev.end));
  }
  flush();
  return out;
}

const laidOutByDay = computed(() => {
  const map = {};
  for (const [day, evs] of Object.entries(timedByDay.value)) map[day] = layoutDay(evs);
  return map;
});

function eventStyle({ ev, col, cols }) {
  const { start: hStart, end: hEnd } = hourRange.value;
  const startMin = Math.max(minutesOf(ev.start), hStart * 60);
  const endMin   = Math.min(minutesOf(ev.end),   hEnd * 60);
  const widthPct = 100 / cols;
  return {
    top:    `${topFor(startMin)}px`,
    height: `${Math.max((endMin - startMin) * SLOT_PX / 60, MIN_EVENT_PX)}px`,
    left:   `calc(${col * widthPct}% + 2px)`,
    width:  `calc(${widthPct}% - 4px)`,
    zIndex: 10 + col,
  };
}

// Compacto = evento curto: esconde a linha de horário para não estourar
function isCompact(ev) {
  return (minutesOf(ev.end) - minutesOf(ev.start)) < 45;
}

function eventClass(ev) {
  if (ev.isCancelled)
    return 'bg-surface-sunken border-line text-ink-subtle line-through';
  if (ev.isOnlineMeeting)
    return 'bg-accent/15 border-accent/40 text-accent hover:bg-accent/25';
  return 'bg-accent-soft border-accent/40 text-accent hover:bg-accent/20';
}

// ── Clique em slot vazio ──────────────────────────────────────────────────────
function slotFromEvent(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const total = hourRange.value.start * 60 + (y / SLOT_PX) * 60;
  const snapped = Math.round(total / 30) * 30;                     // snap 30 min
  return { hour: Math.floor(snapped / 60), minute: snapped % 60, snapped };
}

function onColumnClick(e, day) {
  const { hour, minute } = slotFromEvent(e);
  emit('slot-click', { date: day, hour, minute });
}

// ── Ghost de hover (só no desktop) ────────────────────────────────────────────
const hoverDay = ref(null);
const hoverTop = ref(null);
const hoverTime = ref('');
let overEvent = false;

function onEventEnter() { overEvent = true; hoverDay.value = null; }
function onEventLeave() { overEvent = false; }

function onColumnMouseMove(e, day) {
  if (overEvent) return;
  const { hour, minute, snapped } = slotFromEvent(e);
  hoverDay.value  = fmtYMD(day);
  hoverTop.value  = Math.max(0, Math.min(topFor(snapped), totalHeight.value - 28));
  hoverTime.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
function onColumnMouseLeave() { hoverDay.value = null; hoverTop.value = null; overEvent = false; }

// ── Linha do horário atual ────────────────────────────────────────────────────
const nowOffset = ref(-1);
function updateNow() {
  const now = new Date();
  const min = now.getHours() * 60 + now.getMinutes();
  const { start, end } = hourRange.value;
  nowOffset.value = (min < start * 60 || min > end * 60) ? -1 : topFor(min);
}
let timer;

// ── Scroll inicial na hora atual ──────────────────────────────────────────────
const scroller = ref(null);
function scrollToNow() {
  if (!scroller.value) return;
  const target = nowOffset.value >= 0 ? nowOffset.value : topFor(8 * 60);
  scroller.value.scrollTop = Math.max(0, target - 120);
}

onMounted(async () => {
  updateNow();
  timer = setInterval(updateNow, 60_000);
  await nextTick();
  scrollToNow();
});
onUnmounted(() => clearInterval(timer));

watch(() => props.weekDays, () => nextTick(scrollToNow));

const gridCols = computed(() => `56px repeat(${props.weekDays.length}, minmax(0, 1fr))`);
</script>

<template>
  <div class="relative flex flex-col min-h-0">

    <!-- Cabeçalho dos dias -->
    <div class="grid border-b border-line bg-surface-sunken/60 shrink-0"
      :style="{ gridTemplateColumns: gridCols }">
      <div class="border-r border-line"></div>
      <div v-for="day in weekDays" :key="fmtYMD(day)"
        class="py-2 px-1 text-center border-r border-line last:border-r-0"
        :class="isWeekend(day) && !isToday(day) ? 'bg-surface-sunken/40' : ''">
        <div class="text-micro font-mono uppercase tracking-wider"
          :class="isToday(day) ? 'text-accent' : 'text-ink-subtle'">
          {{ isSingleDay ? DAY_SHORT[day.getDay()] : DAY_SHORT[day.getDay()] }}
        </div>
        <div class="mt-1 mx-auto flex items-center justify-center text-sm font-bold leading-none"
          :class="isToday(day)
            ? 'h-7 w-7 rounded-full bg-accent text-white shadow-soft'
            : 'h-7 text-ink'">
          {{ day.getDate() }}
        </div>
      </div>
    </div>

    <!-- Faixa de eventos de dia inteiro -->
    <div v-if="hasAllDay" class="grid border-b border-line bg-surface-raised shrink-0"
      :style="{ gridTemplateColumns: gridCols }">
      <div class="flex items-center justify-end pr-2 py-1.5 border-r border-line">
        <span class="text-micro font-mono uppercase tracking-wider text-ink-subtle">Dia</span>
      </div>
      <div v-for="day in weekDays" :key="fmtYMD(day)"
        class="border-r border-line last:border-r-0 p-1 space-y-1 min-h-[34px]">
        <button v-for="ev in allDayByDay[fmtYMD(day)]" :key="ev.id"
          @click="$emit('event-click', ev)"
          class="w-full truncate text-left text-micro px-2 py-1 rounded-md font-medium border transition-colors"
          :class="eventClass(ev)">
          {{ ev.subject }}
        </button>
      </div>
    </div>

    <!-- Grade de horários -->
    <div ref="scroller" class="flex-1 overflow-y-auto overscroll-contain"
      style="max-height: min(68vh, 620px)">
      <div class="relative" :style="{ height: totalHeight + 'px' }">
        <div class="absolute inset-0 grid" :style="{ gridTemplateColumns: gridCols }">

          <!-- Coluna de horas -->
          <div class="relative border-r border-line bg-surface-sunken/30">
            <div v-for="h in hours" :key="h"
              class="absolute right-2 -translate-y-1/2 text-micro font-mono tabular-nums text-ink-subtle select-none"
              :style="{ top: ((h - hourRange.start) * SLOT_PX) + 'px' }">
              {{ String(h).padStart(2, '0') }}:00
            </div>
          </div>

          <!-- Colunas dos dias -->
          <div v-for="day in weekDays" :key="fmtYMD(day)"
            class="relative border-r border-line last:border-r-0 cursor-pointer transition-colors"
            :class="isToday(day)
              ? 'bg-accent/[0.04]'
              : isWeekend(day) ? 'bg-surface-sunken/25' : ''"
            @click.self="onColumnClick($event, day)"
            @mousemove="onColumnMouseMove($event, day)"
            @mouseleave="onColumnMouseLeave">

            <!-- Meia hora (pontilhado) -->
            <div v-for="h in hours" :key="'half' + h"
              class="absolute inset-x-0 border-t border-dashed border-line/60 pointer-events-none"
              :style="{ top: ((h - hourRange.start) * SLOT_PX + SLOT_PX / 2) + 'px' }" />
            <!-- Hora cheia (sólido) -->
            <div v-for="h in hours" :key="'full' + h"
              class="absolute inset-x-0 border-t border-line pointer-events-none"
              :style="{ top: ((h - hourRange.start) * SLOT_PX) + 'px' }" />

            <!-- Ghost de criação -->
            <Transition name="ghost">
              <div v-if="hoverDay === fmtYMD(day) && hoverTop !== null"
                class="absolute inset-x-1 rounded-md border border-dashed border-accent/60 bg-accent-soft
                       pointer-events-none z-[5] flex items-center gap-1.5 px-2"
                :style="{ top: hoverTop + 'px', height: '26px' }">
                <i class="fas fa-plus text-accent text-[9px]"></i>
                <span class="text-micro font-mono font-semibold text-accent">{{ hoverTime }}</span>
              </div>
            </Transition>

            <!-- Linha do agora -->
            <div v-if="isToday(day) && nowOffset >= 0"
              class="absolute inset-x-0 flex items-center z-30 pointer-events-none"
              :style="{ top: nowOffset + 'px' }">
              <div class="h-2 w-2 rounded-full bg-data-neg -ml-1 shrink-0 ring-2 ring-surface-raised"></div>
              <div class="flex-1 h-px bg-data-neg"></div>
            </div>

            <!-- Eventos (posicionados lado a lado quando há sobreposição) -->
            <button v-for="slot in laidOutByDay[fmtYMD(day)]" :key="slot.ev.id"
              @click="$emit('event-click', slot.ev)"
              @mouseenter="onEventEnter"
              @mouseleave="onEventLeave"
              class="absolute rounded-lg border px-1.5 py-1 text-left overflow-hidden
                     transition-colors hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-accent-ring"
              :class="eventClass(slot.ev)"
              :style="eventStyle(slot)">
              <div class="flex items-start gap-1">
                <span class="text-micro font-semibold leading-tight truncate flex-1">{{ slot.ev.subject }}</span>
                <i v-if="slot.ev.isOnlineMeeting" class="fas fa-video text-[8px] mt-0.5 opacity-60 shrink-0"></i>
              </div>
              <div v-if="!isCompact(slot.ev)" class="text-micro font-mono tabular-nums opacity-70 truncate">
                {{ fmtTime(slot.ev.start) }}–{{ fmtTime(slot.ev.end) }}
              </div>
            </button>

          </div>
        </div>
      </div>
    </div>

    <!-- Vazio -->
    <div v-if="!loading && !hasAnyEvent"
      class="absolute inset-x-0 bottom-0 top-24 flex flex-col items-center justify-center pointer-events-none">
      <div class="grid place-items-center h-12 w-12 rounded-2xl bg-surface-sunken border border-line text-ink-subtle mb-3">
        <i class="fas fa-calendar-xmark"></i>
      </div>
      <p class="text-sm text-ink-muted">Nenhum evento neste período</p>
      <p class="text-xs text-ink-subtle mt-1">Clique em um horário para agendar</p>
    </div>

    <!-- Carregando -->
    <div v-if="loading"
      class="absolute inset-0 z-40 flex items-center justify-center bg-surface-raised/60 backdrop-blur-sm">
      <div class="flex items-center gap-2 text-ink-muted">
        <i class="fas fa-circle-notch animate-spin"></i>
        <span class="text-sm">Carregando...</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.ghost-enter-active { transition: opacity 0.1s, transform 0.1s; }
.ghost-leave-active { transition: opacity 0.08s; }
.ghost-enter-from   { opacity: 0; transform: scaleY(0.8); }
.ghost-leave-to     { opacity: 0; }
</style>
