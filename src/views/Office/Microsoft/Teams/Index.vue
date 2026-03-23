<template>
  <div class="min-h-full py-6 px-4">
    <div class="max-w-7xl mx-auto space-y-4">

      <!-- ── Header ── -->
      <div class="flex flex-wrap items-center gap-3">

        <!-- Logo + title -->
        <div class="flex items-center gap-3 mr-auto">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
            <img class="p-2" src="https://support.microsoft.com/images/pt-br/d09f346e-3b3f-4bbc-b4cd-ad6f9df1ab6e" alt="Teams">
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Microsoft Teams</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400">Reuniões, eventos e calendário</p>
          </div>
        </div>

        <!-- View mode switcher -->
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
          <button v-for="v in VIEWS" :key="v.value"
            @click="setView(v.value)"
            :class="ts.currentView === v.value
              ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
            <i :class="v.icon" class="text-[11px]"></i>
            {{ v.label }}
          </button>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button @click="openCreateModal('instant')" :disabled="creatingInstant"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
            <i v-if="creatingInstant" class="fas fa-circle-notch animate-spin text-xs"></i>
            <i v-else class="fas fa-bolt text-xs"></i>
            Instantânea
          </button>
          <button @click="openCreateModal()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm">
            <i class="fas fa-plus text-xs"></i>
            Novo evento
          </button>
          <button @click="ts.fetchCurrent()" :disabled="ts.loading"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
            <i class="fas fa-rotate-right text-xs" :class="{ 'animate-spin': ts.loading }"></i>
          </button>
        </div>
      </div>

      <!-- ── Upcoming event notifications ── -->
      <Transition name="slide">
        <div v-if="notifications.length" class="space-y-2">
          <div v-for="notif in notifications" :key="notif.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 shadow-sm">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                <i class="fas fa-bell text-white text-sm"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-orange-800 dark:text-orange-200 truncate">{{ notif.event.subject }}</p>
                <p class="text-xs text-orange-600 dark:text-orange-400">
                  Começa em {{ minutesUntil(notif.event.start) }} min
                  <span v-if="notif.event.location"> · {{ notif.event.location }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <a v-if="notif.event.joinUrl" :href="notif.event.joinUrl" target="_blank" rel="noopener"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors">
                <i class="fas fa-video text-[10px]"></i> Entrar agora
              </a>
              <button @click="dismissNotification(notif.id)"
                class="w-7 h-7 rounded-lg flex items-center justify-center text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ── Instant meeting banner ── -->
      <Transition name="slide">
        <div v-if="instantMeeting"
          class="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 shadow-sm">
          <div class="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
            <i class="fas fa-video text-white"></i>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-green-800 dark:text-green-200 truncate">{{ instantMeeting.subject }}</p>
            <p class="text-xs text-green-600 dark:text-green-400">Reunião ativa · link pronto para compartilhar</p>
          </div>
          <div class="flex items-center gap-2 shrink-0 flex-wrap">
            <a :href="instantMeeting.joinUrl" target="_blank" rel="noopener"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors">
              <i class="fas fa-video text-[10px]"></i> Entrar agora
            </a>
            <button @click="copyInstantLink"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
              <i class="fas fa-link text-[10px]"></i> Copiar link
            </button>
            <a :href="instantMailto"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
              <i class="fas fa-envelope text-[10px]"></i> Convidar
            </a>
            <button @click="instantMeeting = null"
              class="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-colors">
              <i class="fas fa-xmark text-xs"></i>
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── Navigation bar ── -->
      <div class="flex items-center gap-2">
        <!-- Prev / Next -->
        <button @click="ts.prevPeriod()" :disabled="ts.loading"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
          <i class="fas fa-chevron-left text-xs"></i>
        </button>
        <button @click="ts.nextPeriod()" :disabled="ts.loading"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
          <i class="fas fa-chevron-right text-xs"></i>
        </button>

        <!-- Period label -->
        <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100 px-1">{{ periodLabel }}</h2>

        <!-- Today button -->
        <button v-if="!ts.isCurrentPeriod" @click="ts.goToToday()"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
          Hoje
        </button>

        <!-- Spacer + event count -->
        <div class="ml-auto text-xs text-gray-400">
          {{ ts.events.length }} evento{{ ts.events.length !== 1 ? 's' : '' }}
        </div>
      </div>

      <!-- ── Calendar area ── -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden relative">

        <!-- Week view -->
        <CalendarWeek v-if="ts.currentView === 'week'"
          :events="ts.events"
          :week-days="ts.weekDays"
          :loading="ts.loading"
          @event-click="selectedEvent = $event"
          @slot-click="onSlotClick"
        />

        <!-- Month view -->
        <CalendarMonth v-else-if="ts.currentView === 'month'"
          :events="ts.events"
          :month-days="ts.monthDays"
          :view-date="ts.viewDate"
          :loading="ts.loading"
          @event-click="selectedEvent = $event"
          @slot-click="onSlotClick"
        />

        <!-- List view -->
        <EventListView v-else-if="ts.currentView === 'list'"
          :events="ts.events"
          :loading="ts.loading"
          @event-click="selectedEvent = $event"
          @slot-click="onSlotClick"
        />

      </div>

    </div>

    <!-- ── Modals ── -->
    <CreateMeetingModal
      v-model="showCreateModal"
      :edit-event="editingEvent"
      :prefill="slotPrefill"
      @created="onMeetingCreated"
      @updated="onMeetingUpdated"
      @instant="onInstantRequested"
    />

    <EventDetailModal
      :event="selectedEvent"
      @close="selectedEvent = null"
      @cancelled="onEventCancelled"
      @edit="onEditEvent"
    />

    <!-- ── Toast ── -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show"
          class="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm max-w-sm"
          :class="toast.type === 'success'
            ? 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'">
          <i :class="toast.type === 'success' ? 'fas fa-circle-check text-green-500' : 'fas fa-circle-exclamation text-red-500'" class="text-base shrink-0"></i>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue';
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';
import CalendarWeek       from './components/CalendarWeek.vue';
import CalendarMonth      from './components/CalendarMonth.vue';
import EventListView      from './components/EventListView.vue';
import EventDetailModal   from './components/EventDetailModal.vue';
import CreateMeetingModal from './components/CreateMeetingModal.vue';

const ts = useTeamsStore();

onMounted(() => ts.fetchCurrent());

// Watch store errors → toast
watch(() => ts.error, (msg) => {
  if (msg) { showToast(msg, 'error'); ts.error = null; }
});

// ── View modes ────────────────────────────────────────────────────────────────
const VIEWS = [
  { value: 'week',  label: 'Semana', icon: 'fas fa-calendar-week' },
  { value: 'month', label: 'Mês',    icon: 'fas fa-calendar' },
  { value: 'list',  label: 'Lista',  icon: 'fas fa-list' },
];

async function setView(view) {
  await ts.switchView(view);
}

// ── Period label ──────────────────────────────────────────────────────────────
const MONTHS_LONG  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DAY_NAMES    = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

const periodLabel = computed(() => {
  const vd = ts.viewDate;
  if (ts.currentView === 'month') {
    return `${MONTHS_LONG[vd.getMonth()]} ${vd.getFullYear()}`;
  }
  // week / list
  const days = ts.weekDays;
  if (!days.length) return '';
  const [first, last] = [days[0], days[6]];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} de ${MONTHS_LONG[first.getMonth()]} ${first.getFullYear()}`;
  }
  return `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`;
});

// ── Notifications (upcoming events ≤15 min) ───────────────────────────────────
const notifications  = ref([]);
const dismissedIds   = ref(new Set());
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
  // Remove notifications whose events are no longer upcoming
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

// Re-check when events change
watch(() => ts.events, checkNotifications, { deep: false });

// ── Modals state ──────────────────────────────────────────────────────────────
const showCreateModal = ref(false);
const selectedEvent   = ref(null);
const instantMeeting  = ref(null);
const creatingInstant = ref(false);
const editingEvent    = ref(null);
const slotPrefill     = ref(null);

function openCreateModal(type) {
  if (type === 'instant') {
    handleInstantMeeting();
    return;
  }
  editingEvent.value = null;
  slotPrefill.value  = null;
  showCreateModal.value = true;
}

// ── Instant meeting ───────────────────────────────────────────────────────────
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
  editingEvent.value    = null;
  slotPrefill.value     = slot;
  showCreateModal.value = true;
}

function onEditEvent(event) {
  selectedEvent.value   = null;
  editingEvent.value    = event;
  slotPrefill.value     = null;
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
  await navigator.clipboard.writeText(instantMeeting.value.joinUrl).catch(() => {});
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
  toast.type    = type;
  toast.show    = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.show = false; }, 3500);
}
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }

.toast-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.toast-enter-from { opacity: 0; transform: translateY(10px) scale(0.97); }
.toast-leave-to   { opacity: 0; transform: translateY(4px)  scale(0.97); }
</style>
