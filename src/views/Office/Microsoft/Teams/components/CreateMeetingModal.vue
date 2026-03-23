<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue"
        class="fixed inset-0 z-[8500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="$emit('update:modelValue', false)">

        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" @click.stop>

          <!-- Header -->
          <div class="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                <i class="fas fa-calendar-plus text-white text-sm"></i>
              </div>
              <div>
                <h2 class="text-base font-bold text-gray-900 dark:text-white">
                  {{ isEdit ? 'Editar Evento' : 'Novo Evento' }}
                </h2>
                <!-- Tipo de evento -->
                <div class="flex gap-1 mt-0.5" v-if="!isEdit">
                  <button v-for="t in EVENT_TYPES" :key="t.value" @click="form.type = t.value"
                    :class="form.type === t.value ? t.activeClass : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
                    class="text-xs px-2 py-0.5 rounded-full transition-colors">
                    {{ t.label }}
                  </button>
                </div>
              </div>
            </div>
            <button @click="$emit('update:modelValue', false)"
              class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <i class="fas fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Form body (scrollable) -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            <!-- Assunto -->
            <div>
              <label class="field-label">Assunto <span class="text-red-500">*</span></label>
              <input v-model="form.subject" type="text" placeholder="Título do evento..."
                class="field-input" />
            </div>

            <!-- All-day toggle -->
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <div @click="form.isAllDay = !form.isAllDay"
                :class="form.isAllDay ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'"
                class="w-9 h-5 rounded-full transition-colors relative shrink-0">
                <div :class="form.isAllDay ? 'translate-x-4' : 'translate-x-0.5'"
                  class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"></div>
              </div>
              <span class="text-sm text-gray-600 dark:text-gray-300">Evento de dia inteiro</span>
            </label>

            <!-- Date / Time -->
            <div class="grid gap-3" :class="form.isAllDay ? 'grid-cols-2' : 'grid-cols-3'">
              <div>
                <label class="field-label">Data início</label>
                <input v-model="form.date" type="date" class="field-input" />
              </div>
              <template v-if="!form.isAllDay">
                <div>
                  <label class="field-label">Início</label>
                  <input v-model="form.startTime" type="time" class="field-input" />
                </div>
                <div>
                  <label class="field-label">Fim</label>
                  <input v-model="form.endTime" type="time" class="field-input" />
                </div>
              </template>
              <div v-else>
                <label class="field-label">Data fim</label>
                <input v-model="form.endDate" type="date" class="field-input" />
              </div>
            </div>

            <!-- Recorrência -->
            <div>
              <label class="field-label">Recorrência</label>
              <select v-model="form.recurrenceType" class="field-input">
                <option value="">Não se repete</option>
                <option value="daily">Diariamente</option>
                <option value="weekly">Semanalmente (mesmo dia)</option>
                <option value="monthly">Mensalmente (mesmo dia)</option>
              </select>
            </div>

            <template v-if="form.recurrenceType">
              <div class="grid grid-cols-2 gap-3 pl-3 border-l-2 border-purple-200 dark:border-purple-800">
                <div>
                  <label class="field-label">Intervalo</label>
                  <div class="flex items-center gap-2">
                    <input v-model.number="form.recurrenceInterval" type="number" min="1" max="99" class="field-input w-20" />
                    <span class="text-xs text-gray-500">{{ recurrenceUnitLabel }}</span>
                  </div>
                </div>
                <div>
                  <label class="field-label">Termina</label>
                  <select v-model="form.recurrenceEndType" class="field-input">
                    <option value="noEnd">Nunca</option>
                    <option value="endDate">Em uma data</option>
                    <option value="count">Após N ocorrências</option>
                  </select>
                </div>
                <div v-if="form.recurrenceEndType === 'endDate'">
                  <label class="field-label">Data de fim</label>
                  <input v-model="form.recurrenceEndDate" type="date" class="field-input" />
                </div>
                <div v-if="form.recurrenceEndType === 'count'">
                  <label class="field-label">Ocorrências</label>
                  <input v-model.number="form.recurrenceOccurrences" type="number" min="1" max="365" class="field-input" />
                </div>
              </div>
            </template>

            <!-- Local -->
            <div>
              <label class="field-label">Local <span class="text-gray-400 font-normal">(opcional)</span></label>
              <input v-model="form.location" type="text" placeholder="Sala de reunião, endereço..."
                class="field-input" />
            </div>

            <!-- Participantes -->
            <div v-if="form.type !== 'instant'">
              <label class="field-label">Participantes</label>
              <div class="flex gap-2 mb-2">
                <input v-model="attendeeInput" type="email"
                  @keydown.enter.prevent="addAttendee"
                  placeholder="email@empresa.com"
                  class="flex-1 field-input" />
                <button @click="addAttendee"
                  class="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm transition-colors">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
              <div v-if="form.attendees.length" class="flex flex-wrap gap-1.5">
                <span v-for="(a, i) in form.attendees" :key="i"
                  class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
                  {{ a }}
                  <button @click="form.attendees.splice(i, 1)" class="ml-0.5 hover:text-red-500 transition-colors">
                    <i class="fas fa-xmark text-xs"></i>
                  </button>
                </span>
              </div>
              <p v-else class="text-xs text-gray-400 mt-1">
                {{ form.type === 'meeting' ? 'O convite Teams será enviado automaticamente por e-mail.' : 'Adicione participantes para enviar convite.' }}
              </p>
            </div>

            <!-- Descrição -->
            <div>
              <label class="field-label">Descrição <span class="text-gray-400 font-normal">(opcional)</span></label>
              <textarea v-model="form.body" rows="3" placeholder="Pauta, detalhes..."
                class="field-input resize-none" />
            </div>

            <!-- Instant info -->
            <div v-if="form.type === 'instant'"
              class="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
              <i class="fas fa-bolt mt-0.5 shrink-0"></i>
              <p>A reunião será criada agora e você receberá o link para compartilhar. Duração padrão: 1 hora.</p>
            </div>

          </div>

          <!-- Footer -->
          <div class="flex gap-2 justify-end px-6 py-4 shrink-0 border-t border-gray-100 dark:border-gray-800">
            <button @click="$emit('update:modelValue', false)"
              class="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button @click="submit" :disabled="!canSubmit || submitting"
              :class="form.type === 'instant' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'"
              class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors">
              <i v-if="submitting" class="fas fa-circle-notch animate-spin"></i>
              <i v-else :class="submitIcon"></i>
              {{ submitLabel }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // Para edição: passa o evento existente
  editEvent: { type: Object, default: null },
  // Para pré-preenchimento por click no calendário
  prefill: { type: Object, default: null }, // { date, hour, minute }
});
const emit = defineEmits(['update:modelValue', 'created', 'updated', 'instant']);

const EVENT_TYPES = [
  { value: 'meeting',  label: 'Reunião Teams', activeClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold' },
  { value: 'event',    label: 'Evento',        activeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold' },
  { value: 'instant',  label: 'Instantânea',   activeClass: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold' },
];

const isEdit = computed(() => !!props.editEvent);
const submitting = ref(false);
const attendeeInput = ref('');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function pad2(n) { return String(n).padStart(2, '0'); }

function defaultForm() {
  return {
    type: 'meeting',
    subject: '',
    date: todayStr(),
    endDate: todayStr(),
    startTime: '09:00',
    endTime: '10:00',
    isAllDay: false,
    location: '',
    attendees: [],
    body: '',
    recurrenceType: '',
    recurrenceInterval: 1,
    recurrenceEndType: 'noEnd',
    recurrenceEndDate: '',
    recurrenceOccurrences: 10,
  };
}

const form = ref(defaultForm());

// Pre-fill from edit event
watch(() => props.editEvent, (ev) => {
  if (!ev) return;
  form.value = {
    type: ev.isOnlineMeeting ? 'meeting' : 'event',
    subject: ev.subject || '',
    date: ev.start ? ev.start.split('T')[0] : todayStr(),
    endDate: ev.end   ? ev.end.split('T')[0]   : todayStr(),
    startTime: ev.start ? ev.start.split('T')[1]?.slice(0,5) : '09:00',
    endTime:   ev.end   ? ev.end.split('T')[1]?.slice(0,5)   : '10:00',
    isAllDay: ev.isAllDay || false,
    location: ev.location || '',
    attendees: (ev.attendees || []).map(a => a.email).filter(Boolean),
    body: ev.bodyPreview || '',
    recurrenceType: '',
    recurrenceInterval: 1,
    recurrenceEndType: 'noEnd',
    recurrenceEndDate: '',
    recurrenceOccurrences: 10,
  };
}, { immediate: true });

// Pre-fill from calendar slot click
watch(() => props.prefill, (pf) => {
  if (!pf || isEdit.value) return;
  const d = pf.date instanceof Date ? pf.date : new Date(pf.date);
  const dateStr = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const h = pf.hour ?? 9;
  const m = pf.minute ?? 0;
  form.value.date = dateStr;
  form.value.endDate = dateStr;
  form.value.startTime = `${pad2(h)}:${pad2(m)}`;
  form.value.endTime   = `${pad2(h+1)}:${pad2(m)}`;
});

// Reset when modal opens without edit
watch(() => props.modelValue, (v) => {
  if (v && !props.editEvent) {
    form.value = defaultForm();
    if (props.prefill) {
      const pf = props.prefill;
      const d  = pf.date instanceof Date ? pf.date : new Date(pf.date);
      form.value.date = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      form.value.endDate = form.value.date;
      form.value.startTime = `${pad2(pf.hour ?? 9)}:${pad2(pf.minute ?? 0)}`;
      form.value.endTime   = `${pad2((pf.hour ?? 9)+1)}:${pad2(pf.minute ?? 0)}`;
    }
    attendeeInput.value = '';
    submitting.value = false;
  }
});

const recurrenceUnitLabel = computed(() => {
  const map = { daily: 'dia(s)', weekly: 'semana(s)', monthly: 'mês(es)' };
  return map[form.value.recurrenceType] || '';
});

const canSubmit = computed(() => {
  if (!form.value.subject.trim()) return false;
  if (form.value.type === 'instant') return true;
  return !!(form.value.date && (form.value.isAllDay || (form.value.startTime && form.value.endTime)));
});

const submitLabel = computed(() => {
  if (isEdit.value) return 'Salvar';
  if (form.value.type === 'instant') return 'Criar e Entrar';
  return 'Criar Evento';
});
const submitIcon = computed(() => {
  if (isEdit.value) return 'fas fa-floppy-disk';
  if (form.value.type === 'instant') return 'fas fa-bolt';
  return 'fas fa-calendar-plus';
});

function addAttendee() {
  const email = attendeeInput.value.trim();
  if (!email || form.value.attendees.includes(email)) return;
  form.value.attendees.push(email);
  attendeeInput.value = '';
}

function buildRecurrence() {
  if (!form.value.recurrenceType) return null;
  return {
    type: form.value.recurrenceType,
    interval: form.value.recurrenceInterval || 1,
    endType: form.value.recurrenceEndType,
    endDate: form.value.recurrenceEndDate || undefined,
    occurrences: form.value.recurrenceOccurrences,
  };
}

async function submit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  try {
    if (form.value.type === 'instant') {
      emit('instant', { subject: form.value.subject.trim() });
    } else {
      const start = form.value.isAllDay
        ? `${form.value.date}T00:00:00`
        : `${form.value.date}T${form.value.startTime}:00`;
      const end = form.value.isAllDay
        ? `${form.value.endDate || form.value.date}T23:59:59`
        : `${form.value.date}T${form.value.endTime}:00`;

      const payload = {
        subject: form.value.subject.trim(),
        start, end,
        attendees: form.value.attendees,
        body: form.value.body,
        isOnlineMeeting: form.value.type === 'meeting',
        location: form.value.location,
        isAllDay: form.value.isAllDay,
        recurrence: buildRecurrence(),
      };

      if (isEdit.value) {
        emit('updated', { eventId: props.editEvent.id, ...payload });
      } else {
        emit('created', payload);
      }
    }
    emit('update:modelValue', false);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.field-label { @apply block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1; }
.field-input  { @apply w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
