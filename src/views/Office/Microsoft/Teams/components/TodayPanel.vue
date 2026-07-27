<script setup>
// Central Microsoft › painel "Hoje" — resumo do dia acima do calendário:
// próximas reuniões (entrar com 1 clique), tarefas de hoje/atrasadas do To Do
// (clique leva à aba Tarefas) e ações rápidas. Empilha no mobile.

import { computed, inject, onMounted } from 'vue';
import { useTeamsStore, fmtDate } from '@/stores/Microsoft/teamsStore';
import { useTodoStore } from '@/stores/Microsoft/todoStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';

const emit = defineEmits(['new-event', 'instant']);

const ts = useTeamsStore();
const todo = useTodoStore();
const ms = useMicrosoftStore();
const setTab = inject('msSetTab', () => {});

// ── Próximas reuniões de hoje ─────────────────────────────────────────────────
const todayKey = fmtDate(new Date());

const nextMeetings = computed(() => {
  const now = Date.now();
  return (ts.eventsByDay[todayKey] || [])
    .filter(e => !e.isCancelled && !e.isAllDay && e.start && new Date(e.start).getTime() >= now)
    .slice(0, 3);
});

function fmtTime(dt) {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Tarefas (To Do) ───────────────────────────────────────────────────────────
onMounted(() => {
  // Lazy: carrega o To Do só se ainda não veio (a aba Tarefas reusa o mesmo store)
  if (ms.connected && !todo.tasks.length && !todo.loading) {
    todo.loadMy().catch(() => {}); // silencioso: o card mostra "—"
  }
});

const taskCounts = computed(() => ({
  today: todo.counts?.today ?? 0,
  overdue: todo.counts?.overdue ?? 0,
  loaded: todo.tasks.length > 0 || !todo.loading,
}));
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">

    <!-- Próximas reuniões de hoje -->
    <div class="lg:col-span-2 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-3.5">
      <div class="flex items-center justify-between gap-2 mb-2">
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">
          <i class="fas fa-video mr-1.5 text-accent"></i>Próximas reuniões de hoje
        </p>
      </div>

      <!-- Fora do período atual: os eventos de hoje não estão carregados -->
      <div v-if="!ts.isCurrentPeriod" class="flex items-center justify-between gap-3 py-1.5">
        <p class="text-xs text-ink-muted">Você está navegando em outro período.</p>
        <button @click="ts.goToToday()"
          class="shrink-0 inline-flex items-center gap-1.5 px-3 min-h-10 rounded-lg border border-line
                 text-xs font-medium text-ink hover:bg-surface-hover transition-colors">
          <i class="fas fa-circle-dot text-[10px] text-accent"></i> Voltar para hoje
        </button>
      </div>

      <template v-else>
        <div v-if="nextMeetings.length" class="space-y-1.5">
          <div v-for="m in nextMeetings" :key="m.id"
            class="flex items-center gap-2.5 min-h-10">
            <span class="font-mono text-xs font-bold text-accent tabular-nums shrink-0 w-11">{{ fmtTime(m.start) }}</span>
            <p class="text-sm text-ink truncate flex-1">{{ m.subject }}</p>
            <a v-if="m.joinUrl" :href="m.joinUrl" target="_blank" rel="noopener"
              class="shrink-0 inline-flex items-center gap-1.5 px-3 min-h-10 rounded-lg bg-accent hover:bg-accent-hover
                     text-white text-xs font-semibold transition-colors">
              <i class="fas fa-video text-[10px]"></i> Entrar
            </a>
          </div>
        </div>
        <p v-else class="text-xs text-ink-muted py-2.5">Sem mais reuniões hoje. 🎉</p>
      </template>
    </div>

    <!-- Tarefas de hoje (To Do) -->
    <button @click="setTab('tarefas')"
      class="text-left rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-3.5
             hover:bg-surface-hover transition-colors group">
      <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
        <i class="fas fa-list-check mr-1.5 text-accent"></i>Tarefas
      </p>
      <div class="flex items-end gap-4">
        <div>
          <p class="text-2xl font-bold tabular-nums leading-none text-ink">{{ taskCounts.today }}</p>
          <p class="text-[11px] text-ink-subtle mt-1">para hoje</p>
        </div>
        <div v-if="taskCounts.overdue">
          <p class="text-2xl font-bold tabular-nums leading-none text-red-500">{{ taskCounts.overdue }}</p>
          <p class="text-[11px] text-red-500/80 mt-1">atrasada{{ taskCounts.overdue !== 1 ? 's' : '' }}</p>
        </div>
      </div>
      <p class="text-[11px] text-ink-subtle mt-2 group-hover:text-accent transition-colors">
        Abrir aba Tarefas <i class="fas fa-arrow-right text-[9px] ml-0.5"></i>
      </p>
    </button>

    <!-- Ações rápidas -->
    <div class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-3.5 flex flex-col gap-2">
      <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">
        <i class="fas fa-bolt mr-1.5 text-accent"></i>Ações rápidas
      </p>
      <button @click="emit('new-event')"
        class="w-full inline-flex items-center justify-center gap-2 min-h-10 rounded-lg
               bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors">
        <i class="fas fa-plus text-[10px]"></i> Novo evento
      </button>
      <button @click="emit('instant')"
        class="w-full inline-flex items-center justify-center gap-2 min-h-10 rounded-lg
               bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
        <i class="fas fa-bolt text-[10px]"></i> Reunião instantânea
      </button>
    </div>
  </div>
</template>
