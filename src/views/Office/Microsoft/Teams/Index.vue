<template>
  <div class="min-h-full py-8 px-4">
    <div class="max-w-7xl mx-auto space-y-5">

      <!-- ── Header ── -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <!-- Teams logo -->
          <div class="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center p-2 shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M20.5 5.75a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 0 1 5.5 0ZM17.75 10a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM13.5 8.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM10.5 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM15 14.5h-1a5.49 5.49 0 0 1 2 4.25V20h5.5a1 1 0 0 0 1-1v-1.5A3.5 3.5 0 0 0 19 14.5h-4ZM4 19.5A5.5 5.5 0 0 1 9.5 14h2a5.5 5.5 0 0 1 5.5 5.5V21a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1.5Z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Teams</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400">Reuniões e calendário Microsoft</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Instant meeting -->
          <button @click="handleInstantMeeting"
            :disabled="creatingInstant"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors">
            <i v-if="creatingInstant" class="fas fa-circle-notch animate-spin text-xs"></i>
            <i v-else class="fas fa-bolt text-xs"></i>
            Reunião Instantânea
          </button>

          <!-- New meeting -->
          <button @click="showCreateModal = true"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors">
            <i class="fas fa-calendar-plus text-xs"></i>
            Nova Reunião
          </button>

          <!-- Reload -->
          <button @click="ts.fetchWeek()" :disabled="ts.loading"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
            <i class="fas fa-rotate-right text-xs" :class="{ 'animate-spin': ts.loading }"></i>
          </button>
        </div>
      </div>

      <!-- ── Instant meeting banner ── -->
      <Transition name="slide">
        <div v-if="instantMeeting"
          class="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
              <i class="fas fa-video text-white text-lg"></i>
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-green-800 dark:text-green-200 truncate">{{ instantMeeting.subject }}</p>
              <p class="text-xs text-green-600 dark:text-green-400">Reunião ativa · link pronto para compartilhar</p>
            </div>
          </div>
          <div class="flex items-center gap-2 ml-auto shrink-0 flex-wrap">
            <a :href="instantMeeting.joinUrl" target="_blank" rel="noopener"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
              <i class="fas fa-video"></i> Entrar agora
            </a>
            <button @click="copyInstantLink"
              class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 text-sm hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
              <i class="fas fa-link"></i> Copiar link
            </button>
            <a :href="instantMailto" class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 text-sm hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
              <i class="fas fa-envelope"></i> Convidar
            </a>
            <button @click="instantMeeting = null"
              class="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-colors">
              <i class="fas fa-xmark"></i>
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── Week navigation ── -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <button @click="ts.prevWeek()" :disabled="ts.loading"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
            <i class="fas fa-chevron-left text-sm"></i>
          </button>
          <button @click="ts.nextWeek()" :disabled="ts.loading"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
            <i class="fas fa-chevron-right text-sm"></i>
          </button>
          <button v-if="!ts.isCurrentWeek" @click="ts.goToToday()"
            class="ml-1 px-3 py-1 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
            Hoje
          </button>
        </div>

        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {{ weekLabel }}
        </h2>

        <!-- Event count -->
        <div class="text-xs text-gray-400">
          {{ ts.events.length }} evento{{ ts.events.length !== 1 ? 's' : '' }}
        </div>
      </div>

      <!-- ── Calendar ── -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden relative">
        <CalendarWeek
          :events="ts.events"
          :week-days="ts.weekDays"
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
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';
import CalendarWeek    from './components/CalendarWeek.vue';
import EventDetailModal from './components/EventDetailModal.vue';
import CreateMeetingModal from './components/CreateMeetingModal.vue';

const ts = useTeamsStore();

onMounted(() => ts.fetchWeek());

// Watch store errors → toast
watch(() => ts.error, (msg) => {
  if (msg) { showToast(msg, 'error'); ts.error = null; }
});

// ── Week label ────────────────────────────────────────────────────────────────
const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const weekLabel = computed(() => {
  const days = ts.weekDays;
  if (!days.length) return '';
  const first = days[0], last = days[6];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} de ${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
  }
  return `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
});

// ── Modals state ──────────────────────────────────────────────────────────────
const showCreateModal = ref(false);
const selectedEvent   = ref(null);
const instantMeeting  = ref(null);
const creatingInstant = ref(false);
const editingEvent    = ref(null);
const slotPrefill     = ref(null);

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

// Calendar slot click → open create modal pre-filled with that date/time
function onSlotClick(slot) {
  editingEvent.value = null;
  slotPrefill.value = slot;
  showCreateModal.value = true;
}

// Edit event from EventDetailModal
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

// Called by CreateMeetingModal @instant (when user chose instant mode inside modal)
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

// ── Scheduled meeting created ─────────────────────────────────────────────────
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

// ── Event cancelled ───────────────────────────────────────────────────────────
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

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }

.toast-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.toast-enter-from { opacity: 0; transform: translateY(12px) scale(0.97); }
.toast-leave-to { opacity: 0; transform: translateY(6px) scale(0.97); }
</style>
