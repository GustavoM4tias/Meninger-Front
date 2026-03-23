<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="event"
        class="fixed inset-0 z-[8500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="$emit('close')">

        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" @click.stop>

          <!-- Color bar -->
          <div :class="event.isOnlineMeeting ? 'bg-purple-600' : 'bg-blue-500'" class="h-1.5 rounded-t-2xl shrink-0"></div>

          <!-- Header -->
          <div class="px-6 pt-5 pb-3 shrink-0">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span v-if="event.isOnlineMeeting"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                    <i class="fas fa-video text-xs"></i> Teams
                  </span>
                  <span v-if="event.isCancelled"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold">
                    Cancelado
                  </span>
                  <span v-if="event.isRecurring"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs">
                    <i class="fas fa-rotate text-xs"></i> Recorrente
                  </span>
                </div>
                <h2 class="text-lg font-bold text-gray-900 dark:text-white leading-snug">{{ event.subject }}</h2>
              </div>
              <button @click="$emit('close')"
                class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 mt-0.5">
                <i class="fas fa-xmark text-sm"></i>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 pb-4 space-y-4">

            <!-- Time -->
            <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <i class="fas fa-clock w-4 text-center shrink-0"></i>
              <span>
                <span class="font-medium text-gray-800 dark:text-gray-200">{{ fmtDate(event.start) }}</span>
                · {{ fmtTime(event.start) }} – {{ fmtTime(event.end) }}
              </span>
            </div>

            <!-- Location -->
            <div v-if="event.location" class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <i class="fas fa-location-dot w-4 text-center shrink-0"></i>
              <span>{{ event.location }}</span>
            </div>

            <!-- Organizer -->
            <div v-if="event.organizer?.name" class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <i class="fas fa-user w-4 text-center shrink-0"></i>
              <span>{{ event.organizer.name }}
                <span v-if="event.organizer.email" class="text-gray-400 text-xs ml-1">{{ event.organizer.email }}</span>
              </span>
            </div>

            <!-- Attendees -->
            <div v-if="event.attendees?.length" class="flex items-start gap-3 text-sm">
              <i class="fas fa-users w-4 text-center text-gray-400 shrink-0 mt-0.5"></i>
              <div>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Participantes</p>
                <div class="flex flex-col gap-1">
                  <div v-for="a in event.attendees" :key="a.email"
                    class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ (a.name || a.email).charAt(0).toUpperCase() }}</span>
                    </div>
                    <span class="text-gray-700 dark:text-gray-300 text-sm">{{ a.name || a.email }}</span>
                    <span :class="statusClass(a.status)" class="text-xs ml-auto">{{ statusLabel(a.status) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Body preview -->
            <div v-if="event.bodyPreview" class="flex items-start gap-3 text-sm">
              <i class="fas fa-align-left w-4 text-center text-gray-400 shrink-0 mt-0.5"></i>
              <p class="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">{{ event.bodyPreview }}</p>
            </div>

          </div>

          <!-- Actions -->
          <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 shrink-0">

            <!-- Join Teams -->
            <a v-if="event.joinUrl" :href="event.joinUrl" target="_blank" rel="noopener"
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors">
              <i class="fas fa-video"></i> Entrar na reunião
            </a>

            <!-- Open in Outlook -->
            <a v-if="event.webLink" :href="event.webLink" target="_blank" rel="noopener"
              class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm transition-colors">
              <i class="fas fa-external-link-alt text-xs"></i> Abrir no Outlook
            </a>

            <!-- Copy link -->
            <button v-if="event.joinUrl" @click="copyLink"
              class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm transition-colors">
              <i class="fas fa-link text-xs"></i> Copiar link
            </button>

            <!-- Share by email -->
            <a v-if="event.joinUrl" :href="mailtoLink"
              class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm transition-colors">
              <i class="fas fa-envelope text-xs"></i> Convidar
            </a>

            <!-- Edit event -->
            <button v-if="!event.isCancelled" @click="$emit('edit', event); $emit('close')"
              class="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-sm transition-colors">
              <i class="fas fa-pen text-xs"></i> Editar
            </button>

            <!-- Spacer -->
            <div class="flex-1"></div>

            <!-- Cancel event -->
            <button v-if="!event.isCancelled" @click="confirmCancel = true"
              class="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm transition-colors">
              <i class="fas fa-ban text-xs"></i> Cancelar
            </button>
          </div>

          <!-- Cancel confirm -->
          <Transition name="confirm">
            <div v-if="confirmCancel" class="px-6 py-4 border-t border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/20 rounded-b-2xl shrink-0">
              <p class="text-sm text-red-700 dark:text-red-300 font-medium mb-3">Cancelar e notificar participantes?</p>
              <input v-model="cancelComment" type="text" placeholder="Motivo (opcional)"
                class="w-full px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 mb-3" />
              <div class="flex gap-2 justify-end">
                <button @click="confirmCancel = false"
                  class="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Voltar
                </button>
                <button @click="doCancel" :disabled="cancelling"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                  <i v-if="cancelling" class="fas fa-circle-notch animate-spin mr-1"></i>
                  Sim, cancelar
                </button>
              </div>
            </div>
          </Transition>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({ event: { type: Object, default: null } });
const emit = defineEmits(['close', 'cancelled', 'edit']);

const confirmCancel = ref(false);
const cancelComment = ref('');
const cancelling = ref(false);

function fmtTime(dt) {
  if (!dt) return '';
  const [, time] = dt.split('T');
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

function fmtDate(dt) {
  if (!dt) return '';
  const [date] = dt.split('T');
  const [y, mo, d] = date.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${parseInt(d)} de ${months[parseInt(mo) - 1]} de ${y}`;
}

const mailtoLink = computed(() => {
  if (!props.event) return '#';
  const subject = encodeURIComponent(`Convite: ${props.event.subject}`);
  const body = encodeURIComponent(
    `Você foi convidado para: ${props.event.subject}\n\n` +
    `Horário: ${fmtDate(props.event.start)} ${fmtTime(props.event.start)} – ${fmtTime(props.event.end)}\n\n` +
    `Entrar na reunião Teams:\n${props.event.joinUrl || props.event.webLink}`
  );
  return `mailto:?subject=${subject}&body=${body}`;
});

async function copyLink() {
  const url = props.event.joinUrl || props.event.webLink;
  if (!url) return;
  await navigator.clipboard.writeText(url).catch(() => {});
}

async function doCancel() {
  cancelling.value = true;
  try {
    emit('cancelled', { eventId: props.event.id, comment: cancelComment.value });
    emit('close');
  } finally {
    cancelling.value = false;
    confirmCancel.value = false;
  }
}

function statusLabel(s) {
  const map = { accepted: 'Aceito', declined: 'Recusou', tentativelyAccepted: 'Talvez', none: '' };
  return map[s] || '';
}
function statusClass(s) {
  const map = {
    accepted: 'text-green-600 dark:text-green-400',
    declined: 'text-red-500 dark:text-red-400',
    tentativelyAccepted: 'text-yellow-600 dark:text-yellow-400',
  };
  return map[s] || 'text-gray-400';
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.confirm-enter-active, .confirm-leave-active { transition: opacity 0.15s, transform 0.15s; }
.confirm-enter-from, .confirm-leave-to { opacity: 0; transform: translateY(8px); }
.line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
</style>
