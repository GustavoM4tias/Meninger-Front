<script setup>
// Central Microsoft › aba Agenda — calendário Teams (panel do hub, sem
// PageContainer próprio).
//
// Layout: faixa "Hoje" (próxima reunião) → barra de controle única (período à
// esquerda, visão + ações à direita) → calendário.
// Visões: Semana/Mês/Lista no desktop; Dia/Lista/Mês no celular (a visão Dia
// reusa o CalendarWeek com uma única coluna; Lista é o padrão mobile).

import { ref, computed, onMounted } from 'vue';
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';

import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import TodayPanel from './TodayPanel.vue';
import CalendarWeek from './CalendarWeek.vue';
import CalendarMonth from './CalendarMonth.vue';
import EventListView from './EventListView.vue';
import EventDetailModal from './EventDetailModal.vue';
import CreateMeetingModal from './CreateMeetingModal.vue';

const emit = defineEmits(['toast']);
const ts = useTeamsStore();

const isMobile = window.matchMedia('(max-width: 767px)').matches;

// ── Visões ────────────────────────────────────────────────────────────────────
const VIEWS = isMobile
  ? [
      { value: 'day',   label: 'Dia',   icon: 'fas fa-calendar-day' },
      { value: 'list',  label: 'Lista', icon: 'fas fa-list' },
      { value: 'month', label: 'Mês',   icon: 'fas fa-calendar' },
    ]
  : [
      { value: 'week',  label: 'Semana', icon: 'fas fa-calendar-week' },
      { value: 'month', label: 'Mês',    icon: 'fas fa-calendar' },
      { value: 'list',  label: 'Lista',  icon: 'fas fa-list' },
    ];

const viewProxy = computed({
  get: () => ts.currentView,
  set: (v) => ts.switchView(v),
});

onMounted(() => {
  // Semana não existe no celular; se o estado veio de uma sessão desktop, cai p/ Lista.
  if (isMobile && ts.currentView === 'week') ts.switchView('list');
});

// ── Rótulo do período ─────────────────────────────────────────────────────────
const MONTHS_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const periodLabel = computed(() => {
  const vd = ts.viewDate;
  if (ts.currentView === 'month') return `${MONTHS_LONG[vd.getMonth()]} ${vd.getFullYear()}`;
  if (ts.currentView === 'day') {
    return `${WEEKDAYS_LONG[vd.getDay()]}, ${vd.getDate()} de ${MONTHS_LONG[vd.getMonth()].toLowerCase()}`;
  }
  const days = ts.weekDays;
  if (!days.length) return '';
  const [first, last] = [days[0], days[6]];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} a ${last.getDate()} de ${MONTHS_LONG[first.getMonth()].toLowerCase()}`;
  }
  return `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} a ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
});

const periodYear = computed(() => {
  const days = ts.weekDays;
  if (ts.currentView === 'week' || ts.currentView === 'list') return days.length ? days[0].getFullYear() : '';
  return ts.viewDate.getFullYear();
});

// ── Modais ────────────────────────────────────────────────────────────────────
const showCreateModal = ref(false);
const selectedEvent = ref(null);
const instantMeeting = ref(null);
const creatingInstant = ref(false);
const editingEvent = ref(null);
const slotPrefill = ref(null);

function openCreateModal(type) {
  if (type === 'instant') { handleInstantMeeting(); return; }
  editingEvent.value = null;
  slotPrefill.value = null;
  showCreateModal.value = true;
}

async function handleInstantMeeting() {
  const subject = `Reunião instantânea · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  creatingInstant.value = true;
  try {
    instantMeeting.value = await ts.createInstantMeeting({ subject });
    emit('toast', 'Reunião criada! Link pronto para compartilhar.', 'success');
  } catch (err) {
    emit('toast', `Erro ao criar reunião: ${err.message}`, 'error');
  } finally {
    creatingInstant.value = false;
  }
}

function onSlotClick(slot) {
  editingEvent.value = null;
  slotPrefill.value = slot;
  showCreateModal.value = true;
}

function onEditEvent(event) {
  selectedEvent.value = null;
  editingEvent.value = event;
  slotPrefill.value = null;
  showCreateModal.value = true;
}

async function onMeetingUpdated({ eventId, editScope, ...data }) {
  try {
    await ts.updateEvent(eventId, data);
    // Editar a série muda o conjunto de ocorrências (e o PATCH devolve o master,
    // cujo id não bate com as ocorrências em tela) — refetch obrigatório.
    if (editScope === 'series') await ts.fetchCurrent();
    emit('toast', 'Evento atualizado com sucesso!', 'success');
    editingEvent.value = null;
  } catch (err) {
    emit('toast', `Erro ao atualizar: ${err.message}`, 'error');
  }
}

async function onInstantRequested(data) {
  creatingInstant.value = true;
  try {
    instantMeeting.value = await ts.createInstantMeeting(data);
    emit('toast', 'Reunião criada! Link pronto para compartilhar.', 'success');
  } catch (err) {
    emit('toast', `Erro ao criar reunião: ${err.message}`, 'error');
  } finally {
    creatingInstant.value = false;
  }
}

const instantMailto = computed(() => {
  if (!instantMeeting.value) return '#';
  const s = encodeURIComponent(`Convite: ${instantMeeting.value.subject}`);
  const b = encodeURIComponent(`Você foi convidado para uma reunião.\n\nEntrar: ${instantMeeting.value.joinUrl}`);
  return `mailto:?subject=${s}&body=${b}`;
});

async function copyInstantLink() {
  await navigator.clipboard.writeText(instantMeeting.value.joinUrl).catch(() => { });
  emit('toast', 'Link copiado!', 'success');
}

async function onMeetingCreated(data) {
  try {
    await ts.createScheduledMeeting(data);
    emit('toast',
      data.attendees?.length
        ? `Reunião criada! Convite enviado para ${data.attendees.length} participante(s).`
        : 'Reunião criada com sucesso!',
      'success'
    );
  } catch (err) {
    emit('toast', `Erro ao criar reunião: ${err.message}`, 'error');
  }
}

// Ação destrutiva concluída no EventDetailModal (cancelar/remover, ocorrência/série)
const DONE_MESSAGES = {
  'cancel:single':     'Evento cancelado e participantes notificados.',
  'cancel:occurrence': 'Ocorrência cancelada e participantes notificados.',
  'cancel:series':     'Série cancelada e participantes notificados.',
  'delete:occurrence': 'Evento removido do seu calendário.',
  'delete:series':     'Série removida do seu calendário.',
};
function onEventDone({ kind, scope }) {
  emit('toast', DONE_MESSAGES[`${kind}:${scope}`] || 'Evento removido.', 'success');
}
function onEventError(message) { emit('toast', `Erro: ${message}`, 'error'); }
</script>

<template>
  <div>
    <!-- Faixa "Hoje": próxima reunião -->
    <TodayPanel />

    <!-- Banner reunião instantânea -->
    <Transition name="slide">
      <div v-if="instantMeeting"
        class="flex flex-wrap items-center gap-3 p-3.5 rounded-xl mb-4
               bg-emerald-500/10 border border-emerald-500/30 surface-gradient">
        <div class="h-10 w-10 rounded-xl bg-emerald-600 grid place-items-center shrink-0">
          <i class="fas fa-video text-white"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-200 truncate">
            {{ instantMeeting.subject }}
          </p>
          <p class="text-xs text-emerald-600 dark:text-emerald-400">Reunião ativa · link pronto para compartilhar</p>
        </div>
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <a :href="instantMeeting.joinUrl" target="_blank" rel="noopener"
            class="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
            <i class="fas fa-video text-[10px]"></i> Entrar agora
          </a>
          <button @click="copyInstantLink"
            class="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-lg bg-surface-raised border border-emerald-500/30
                   text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-500/10 transition-colors">
            <i class="fas fa-link text-[10px]"></i> Copiar link
          </button>
          <a :href="instantMailto"
            class="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-lg bg-surface-raised border border-emerald-500/30
                   text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-500/10 transition-colors">
            <i class="fas fa-envelope text-[10px]"></i> Convidar
          </a>
          <button @click="instantMeeting = null" aria-label="Fechar"
            class="h-10 w-10 rounded-lg text-emerald-500 hover:bg-emerald-500/20 grid place-items-center transition-colors">
            <i class="fas fa-xmark text-xs"></i>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Barra de controle única: período à esquerda, visão + ações à direita -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2.5 mb-3">

      <!-- Navegação de período -->
      <div class="flex items-center gap-1">
        <IconButton icon="fas fa-chevron-left" size="sm" label="Período anterior"
          :disabled="ts.loading" class="max-sm:!h-10 max-sm:!w-10" @click="ts.prevPeriod()" />
        <IconButton icon="fas fa-chevron-right" size="sm" label="Próximo período"
          :disabled="ts.loading" class="max-sm:!h-10 max-sm:!w-10" @click="ts.nextPeriod()" />
        <Button v-if="!ts.isCurrentPeriod" variant="ghost" size="sm"
          class="ml-1 max-sm:!min-h-10" @click="ts.goToToday()">
          Hoje
        </Button>
      </div>

      <!-- Título do período -->
      <div class="min-w-0 flex items-baseline gap-2">
        <h2 class="text-base font-semibold text-ink capitalize truncate">{{ periodLabel }}</h2>
        <span class="text-xs font-mono text-ink-subtle tabular-nums shrink-0">{{ periodYear }}</span>
      </div>

      <div class="flex-1 min-w-0"></div>

      <!-- Visão + ações -->
      <div class="flex items-center gap-2 flex-wrap">
        <SegmentedControl v-model="viewProxy" :options="VIEWS" size="sm" />
        <IconButton icon="fas fa-rotate-right" size="sm" label="Atualizar"
          :disabled="ts.loading" :class="{ 'animate-spin': ts.loading }"
          class="max-sm:!h-10 max-sm:!w-10" @click="ts.fetchCurrent()" />
        <IconButton :icon="creatingInstant ? 'fas fa-circle-notch fa-spin' : 'fas fa-bolt'"
          size="sm" label="Reunião instantânea" :disabled="creatingInstant"
          class="max-sm:!h-10 max-sm:!w-10 !text-emerald-600 dark:!text-emerald-400"
          @click="openCreateModal('instant')" />
        <Button variant="primary" size="sm" icon="fas fa-plus"
          class="!bg-purple-600 hover:!bg-purple-700 max-sm:!min-h-10"
          @click="openCreateModal()">
          Novo evento
        </Button>
      </div>
    </div>

    <!-- Calendário -->
    <section class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden surface-gradient">
      <CalendarWeek v-if="ts.currentView === 'week' || ts.currentView === 'day'"
        :events="ts.events" :week-days="ts.currentView === 'day' ? ts.dayDays : ts.weekDays" :loading="ts.loading"
        @event-click="selectedEvent = $event" @slot-click="onSlotClick" />

      <CalendarMonth v-else-if="ts.currentView === 'month'"
        :events="ts.events" :month-days="ts.monthDays" :view-date="ts.viewDate" :loading="ts.loading"
        @event-click="selectedEvent = $event" @slot-click="onSlotClick" />

      <EventListView v-else-if="ts.currentView === 'list'"
        :events="ts.events" :loading="ts.loading"
        @event-click="selectedEvent = $event" @slot-click="onSlotClick" />
    </section>

    <!-- Modais -->
    <CreateMeetingModal
      v-model="showCreateModal"
      :edit-event="editingEvent"
      :prefill="slotPrefill"
      @created="onMeetingCreated"
      @updated="onMeetingUpdated"
      @instant="onInstantRequested" />

    <EventDetailModal
      :event="selectedEvent"
      @close="selectedEvent = null"
      @done="onEventDone"
      @error="onEventError"
      @edit="onEditEvent" />
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
