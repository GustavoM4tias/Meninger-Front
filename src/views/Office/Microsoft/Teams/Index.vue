<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue';
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import CalendarWeek from './components/CalendarWeek.vue';
import CalendarMonth from './components/CalendarMonth.vue';
import EventListView from './components/EventListView.vue';
import EventDetailModal from './components/EventDetailModal.vue';
import CreateMeetingModal from './components/CreateMeetingModal.vue';

const ts = useTeamsStore();

onMounted(() => ts.fetchCurrent());

watch(() => ts.error, (msg) => {
  if (msg) { showToast(msg, 'error'); ts.error = null; }
});

// ── View modes ────────────────────────────────────────────────────────────────
const VIEWS = [
  { value: 'week',  label: 'Semana', icon: 'fas fa-calendar-week' },
  { value: 'month', label: 'Mês',    icon: 'fas fa-calendar' },
  { value: 'list',  label: 'Lista',  icon: 'fas fa-list' },
];

const viewProxy = computed({
  get: () => ts.currentView,
  set: (v) => ts.switchView(v),
});

// ── Period label ──────────────────────────────────────────────────────────────
const MONTHS_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const periodLabel = computed(() => {
  const vd = ts.viewDate;
  if (ts.currentView === 'month') {
    return `${MONTHS_LONG[vd.getMonth()]} ${vd.getFullYear()}`;
  }
  const days = ts.weekDays;
  if (!days.length) return '';
  const [first, last] = [days[0], days[6]];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} de ${MONTHS_LONG[first.getMonth()]} ${first.getFullYear()}`;
  }
  return `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`;
});

// ── Notifications (upcoming events ≤15 min) ───────────────────────────────────
const notifications = ref([]);
const dismissedIds = ref(new Set());
let notifTimer = null;

function minutesUntil(dt) {
  if (!dt) return 0;
  return Math.max(0, Math.round((new Date(dt).getTime() - Date.now()) / 60000));
}

function checkNotifications() {
  const upcoming = ts.upcomingEvents;
  for (const ev of upcoming) {
    if (dismissedIds.value.has(ev.id)) continue;
    if (notifications.value.find(n => n.id === ev.id)) continue;
    notifications.value.push({ id: ev.id, event: ev });
  }
  const upcomingIds = new Set(upcoming.map(e => e.id));
  notifications.value = notifications.value.filter(n => upcomingIds.has(n.id));
}

function dismissNotification(id) {
  dismissedIds.value.add(id);
  notifications.value = notifications.value.filter(n => n.id !== id);
}

onMounted(() => {
  checkNotifications();
  notifTimer = setInterval(checkNotifications, 60_000);
});
onUnmounted(() => clearInterval(notifTimer));

watch(() => ts.events, checkNotifications, { deep: false });

// ── Modals state ──────────────────────────────────────────────────────────────
const showCreateModal = ref(false);
const selectedEvent = ref(null);
const instantMeeting = ref(null);
const creatingInstant = ref(false);
const editingEvent = ref(null);
const slotPrefill = ref(null);

function openCreateModal(type) {
  if (type === 'instant') {
    handleInstantMeeting();
    return;
  }
  editingEvent.value = null;
  slotPrefill.value = null;
  showCreateModal.value = true;
}

async function handleInstantMeeting() {
  const subject = `Reunião instantânea · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  creatingInstant.value = true;
  try {
    instantMeeting.value = await ts.createInstantMeeting({ subject });
    showToast('Reunião criada! Link pronto para compartilhar.', 'success');
  } catch (err) {
    showToast(`Erro ao criar reunião: ${err.message}`, 'error');
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

async function onMeetingUpdated({ eventId, ...data }) {
  try {
    await ts.updateEvent(eventId, data);
    showToast('Evento atualizado com sucesso!', 'success');
    editingEvent.value = null;
  } catch (err) {
    showToast(`Erro ao atualizar: ${err.message}`, 'error');
  }
}

async function onInstantRequested(data) {
  creatingInstant.value = true;
  try {
    instantMeeting.value = await ts.createInstantMeeting(data);
    showToast('Reunião criada! Link pronto para compartilhar.', 'success');
  } catch (err) {
    showToast(`Erro ao criar reunião: ${err.message}`, 'error');
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
  showToast('Link copiado!', 'success');
}

async function onMeetingCreated(data) {
  try {
    await ts.createScheduledMeeting(data);
    showToast(
      data.attendees?.length
        ? `Reunião criada! Convite enviado para ${data.attendees.length} participante(s).`
        : 'Reunião criada com sucesso!',
      'success'
    );
  } catch (err) {
    showToast(`Erro ao criar reunião: ${err.message}`, 'error');
  }
}

async function onEventCancelled({ eventId, comment }) {
  try {
    await ts.cancelEvent(eventId, comment);
    showToast('Evento cancelado e participantes notificados.', 'success');
  } catch (err) {
    showToast(`Erro ao cancelar: ${err.message}`, 'error');
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' });
let toastTimer = null;

function showToast(message, type = 'success') {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.show = false; }, 3500);
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader
        subtitle="Reuniões, eventos e calendário do Microsoft Teams"
        icon-img="/icons/ms-teams.svg">
        <template #title>
          <span>Microsoft Teams</span>
        </template>
        <template #actions>
          <SegmentedControl v-model="viewProxy" :options="VIEWS" size="sm" />
          <Button variant="primary" size="sm" :icon="creatingInstant ? 'fas fa-circle-notch fa-spin' : 'fas fa-bolt'"
            :disabled="creatingInstant" class="!bg-emerald-600 hover:!bg-emerald-700"
            @click="openCreateModal('instant')">
            Instantânea
          </Button>
          <Button variant="primary" size="sm" icon="fas fa-plus"
            class="!bg-purple-600 hover:!bg-purple-700"
            @click="openCreateModal()">
            Novo evento
          </Button>
          <IconButton icon="fas fa-rotate-right" size="sm" label="Atualizar"
            :disabled="ts.loading" :class="{ 'animate-spin': ts.loading }"
            @click="ts.fetchCurrent()" />
        </template>
      </PageHeader>

      <!-- Notificações de eventos próximos -->
      <Transition name="slide">
        <div v-if="notifications.length" class="space-y-2 mb-4">
          <div v-for="notif in notifications" :key="notif.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl
                   bg-amber-500/10 border border-amber-500/30 surface-gradient">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="h-9 w-9 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                <i class="fas fa-bell text-white text-sm"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-amber-700 dark:text-amber-200 truncate">
                  {{ notif.event.subject }}
                </p>
                <p class="text-xs text-amber-600 dark:text-amber-400">
                  Começa em <span class="font-mono font-bold">{{ minutesUntil(notif.event.start) }}</span> min
                  <span v-if="notif.event.location"> · {{ notif.event.location }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <a v-if="notif.event.joinUrl" :href="notif.event.joinUrl" target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors">
                <i class="fas fa-video text-[10px]"></i> Entrar agora
              </a>
              <button @click="dismissNotification(notif.id)"
                class="h-7 w-7 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition-colors">
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Banner reunião instantânea -->
      <Transition name="slide">
        <div v-if="instantMeeting"
          class="flex flex-wrap items-center gap-3 p-4 rounded-xl
                 bg-emerald-500/10 border border-emerald-500/30 surface-gradient mb-4">
          <div class="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <i class="fas fa-video text-white"></i>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-200 truncate">
              {{ instantMeeting.subject }}
            </p>
            <p class="text-xs text-emerald-600 dark:text-emerald-400">
              Reunião ativa · link pronto para compartilhar
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0 flex-wrap">
            <a :href="instantMeeting.joinUrl" target="_blank" rel="noopener"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
              <i class="fas fa-video text-[10px]"></i> Entrar agora
            </a>
            <button @click="copyInstantLink"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     bg-surface-raised border border-emerald-500/30 text-emerald-700 dark:text-emerald-300
                     text-xs font-medium hover:bg-emerald-500/10 transition-colors">
              <i class="fas fa-link text-[10px]"></i> Copiar link
            </button>
            <a :href="instantMailto"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     bg-surface-raised border border-emerald-500/30 text-emerald-700 dark:text-emerald-300
                     text-xs font-medium hover:bg-emerald-500/10 transition-colors">
              <i class="fas fa-envelope text-[10px]"></i> Convidar
            </a>
            <button @click="instantMeeting = null"
              class="h-7 w-7 rounded-lg text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
              <i class="fas fa-xmark text-xs"></i>
            </button>
          </div>
        </div>
      </Transition>

      <!-- Toolbar de navegação de período -->
      <div class="flex items-center gap-2 mb-4">
        <IconButton icon="fas fa-chevron-left" size="sm" label="Período anterior"
          :disabled="ts.loading" @click="ts.prevPeriod()" />
        <IconButton icon="fas fa-chevron-right" size="sm" label="Próximo período"
          :disabled="ts.loading" @click="ts.nextPeriod()" />

        <h2 class="text-sm font-semibold text-ink px-2">{{ periodLabel }}</h2>

        <Button v-if="!ts.isCurrentPeriod" variant="ghost" size="sm" icon="fas fa-circle-dot"
          @click="ts.goToToday()">
          Hoje
        </Button>

        <Badge variant="neutral" size="sm" class="ml-auto">
          <span class="font-mono">{{ ts.events.length }}</span>
          evento{{ ts.events.length !== 1 ? 's' : '' }}
        </Badge>
      </div>

      <!-- Calendário -->
      <section class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden surface-gradient">
        <CalendarWeek v-if="ts.currentView === 'week'"
          :events="ts.events" :week-days="ts.weekDays" :loading="ts.loading"
          @event-click="selectedEvent = $event" @slot-click="onSlotClick" />

        <CalendarMonth v-else-if="ts.currentView === 'month'"
          :events="ts.events" :month-days="ts.monthDays" :view-date="ts.viewDate" :loading="ts.loading"
          @event-click="selectedEvent = $event" @slot-click="onSlotClick" />

        <EventListView v-else-if="ts.currentView === 'list'"
          :events="ts.events" :loading="ts.loading"
          @event-click="selectedEvent = $event" @slot-click="onSlotClick" />
      </section>
    </PageContainer>

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
      @cancelled="onEventCancelled"
      @edit="onEditEvent" />

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show"
          class="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-overlay border text-sm max-w-sm"
          :class="toast.type === 'success'
            ? 'bg-surface-raised border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
            : 'bg-surface-raised border-red-500/30 text-red-600 dark:text-red-400'">
          <i :class="toast.type === 'success'
            ? 'fas fa-circle-check text-emerald-500'
            : 'fas fa-circle-exclamation text-red-500'" class="text-base shrink-0"></i>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }

.toast-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.toast-enter-from { opacity: 0; transform: translateY(10px) scale(0.97); }
.toast-leave-to   { opacity: 0; transform: translateY(4px)  scale(0.97); }
</style>
