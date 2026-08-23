<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue"
        class="fixed inset-0 z-[8500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="close">

        <div class="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden
                    max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none" @click.stop>

          <!-- ── Colored header ── -->
          <div :class="headerGradient" class="px-6 pt-5 pb-4 shrink-0">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-surface-raised/20 flex items-center justify-center shrink-0 shadow-sm">
                  <i :class="headerIcon" class="text-white text-base"></i>
                </div>
                <h2 class="text-base font-bold text-white tracking-tight">
                  {{ isEdit ? 'Editar Evento' : 'Novo Evento' }}
                </h2>
              </div>
              <button @click="close"
                class="w-8 h-8 rounded-xl bg-surface-raised/15 hover:bg-surface-raised/25 flex items-center justify-center text-white/80 hover:text-white transition-colors">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <!-- Type selector (only for new events) -->
            <div v-if="!isEdit" class="grid grid-cols-3 gap-2">
              <button v-for="t in EVENT_TYPES" :key="t.value"
                @click="form.type = t.value"
                :class="form.type === t.value
                  ? 'bg-surface-raised/25 text-white ring-1 ring-white/30 shadow-inner'
                  : 'bg-surface-raised/8 text-white/50 hover:bg-surface-raised/15 hover:text-white/80'"
                class="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all">
                <i :class="t.icon" class="text-base"></i>
                <span>{{ t.label }}</span>
              </button>
            </div>
          </div>

          <!-- ── Form body ── -->
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            <!-- Edição de evento recorrente: escolher alcance -->
            <div v-if="isEdit && props.editEvent?.isRecurring"
              class="p-3 rounded-xl bg-accent/10 border border-accent/25">
              <p class="text-xs font-semibold text-accent mb-2">
                <i class="fas fa-rotate mr-1"></i> Este evento é recorrente. O que você quer editar?
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" @click="setEditScope('occurrence')"
                  :class="editScope === 'occurrence'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-accent/25 text-accent hover:bg-accent/10 '"
                  class="min-h-10 px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors">
                  <i class="fas fa-calendar-day mr-1.5 text-xs"></i> Somente esta ocorrência
                </button>
                <button type="button" @click="setEditScope('series')"
                  :class="editScope === 'series'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-accent/25 text-accent hover:bg-accent/10 '"
                  class="min-h-10 px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors">
                  <i class="fas fa-rotate mr-1.5 text-xs"></i> Toda a série
                </button>
              </div>
              <p v-if="seriesLoading" class="text-xs text-accent mt-2">
                <i class="fas fa-circle-notch animate-spin mr-1"></i> Carregando dados da série...
              </p>
            </div>

            <!-- Instant info card -->
            <div v-if="form.type === 'instant'"
              class="flex items-start gap-3 p-4 rounded-xl bg-data-pos/10 border border-data-pos/25">
              <div class="w-8 h-8 rounded-lg bg-data-pos flex items-center justify-center shrink-0">
                <i class="fas fa-bolt text-white text-sm"></i>
              </div>
              <div>
                <p class="text-sm font-semibold text-data-pos">Reunião instantânea</p>
                <p class="text-xs text-data-pos mt-0.5">
                  Criada imediatamente. Você receberá o link para compartilhar com os participantes.
                </p>
              </div>
            </div>

            <!-- Assunto -->
            <div>
              <label class="field-label">
                Assunto <span class="text-data-neg font-bold">*</span>
              </label>
              <input v-model="form.subject" type="text"
                :placeholder="subjectPlaceholder"
                class="field-input" />
            </div>

            <!-- Fields only for non-instant -->
            <template v-if="form.type !== 'instant'">

              <!-- All-day toggle -->
              <label class="flex items-center gap-3 cursor-pointer group select-none">
                <button @click="form.isAllDay = !form.isAllDay" type="button"
                  :class="form.isAllDay ? 'bg-accent' : 'bg-surface-sunken'"
                  class="relative w-10 h-5 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1">
                  <div :class="form.isAllDay ? 'translate-x-5' : 'translate-x-0.5'"
                    class="absolute top-0.5 w-4 h-4 rounded-full bg-surface-raised shadow-sm transition-transform duration-150"></div>
                </button>
                <span class="text-sm text-ink-muted group-hover:text-ink dark:group-hover:text-ink transition-colors">
                  Evento de dia inteiro
                </span>
              </label>

              <!-- Date / Time -->
              <div class="grid gap-3" :class="form.isAllDay ? 'grid-cols-2' : 'grid-cols-3'">
                <div>
                  <label class="field-label">{{ form.isAllDay ? 'Data início' : 'Data' }}</label>
                  <input v-model="form.date" type="date" class="field-input" />
                </div>
                <template v-if="!form.isAllDay">
                  <div>
                    <label class="field-label">Início</label>
                    <input v-model="form.startTime" type="time" class="field-input" />
                  </div>
                  <div>
                    <label class="field-label">Término</label>
                    <input v-model="form.endTime" type="time" class="field-input" />
                  </div>
                </template>
                <div v-else>
                  <label class="field-label">Data término</label>
                  <input v-model="form.endDate" type="date" class="field-input" />
                </div>
              </div>

              <!-- Recorrência (oculta ao editar só uma ocorrência; read-only se o
                   padrão da série veio de fora do subset suportado) -->
              <div v-if="recurrenceUnsupported"
                class="p-3 rounded-xl bg-surface-sunken border border-line text-xs text-ink-muted">
                <i class="fas fa-rotate mr-1.5"></i>
                Esta série usa uma recorrência avançada (criada no Outlook). Para alterá-la, edite no Outlook -
                os demais campos podem ser salvos normalmente.
              </div>
              <div v-else-if="showRecurrenceSection" class="space-y-3">
                <div>
                  <label class="field-label">Recorrência</label>
                  <select v-model="form.recurrenceType" class="field-input">
                    <option value="">Não se repete</option>
                    <option value="daily">Diariamente</option>
                    <option value="weekly">Semanalmente (mesmo dia)</option>
                    <option value="monthly">Mensalmente (mesmo dia)</option>
                  </select>
                </div>
                <Transition name="expand">
                  <div v-if="form.recurrenceType"
                    class="grid grid-cols-2 gap-3 pl-4 border-l-2 border-accent/25">
                    <div>
                      <label class="field-label">A cada</label>
                      <div class="flex items-center gap-2">
                        <input v-model.number="form.recurrenceInterval" type="number" min="1" max="99"
                          class="field-input w-16 text-center" />
                        <span class="text-xs text-ink-muted whitespace-nowrap">{{ recurrenceUnitLabel }}</span>
                      </div>
                    </div>
                    <div>
                      <label class="field-label">Termina</label>
                      <select v-model="form.recurrenceEndType" class="field-input">
                        <option value="noEnd">Nunca</option>
                        <option value="endDate">Em uma data</option>
                        <option value="count">Após ocorrências</option>
                      </select>
                    </div>
                    <div v-if="form.recurrenceEndType === 'endDate'" class="col-span-2">
                      <label class="field-label">Data de término</label>
                      <input v-model="form.recurrenceEndDate" type="date" class="field-input" />
                    </div>
                    <div v-if="form.recurrenceEndType === 'count'" class="col-span-2">
                      <label class="field-label">Nº de ocorrências</label>
                      <input v-model.number="form.recurrenceOccurrences" type="number" min="1" max="365" class="field-input" />
                    </div>
                  </div>
                </Transition>
              </div>

              <!-- Local -->
              <div>
                <label class="field-label">Local <span class="text-ink-subtle font-normal text-micro">(opcional)</span></label>
                <div class="relative">
                  <i class="fas fa-location-dot absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm pointer-events-none"></i>
                  <input v-model="form.location" type="text" placeholder="Sala de reunião, endereço, link externo..."
                    class="field-input pl-9" />
                </div>
              </div>

              <!-- Participantes -->
              <div>
                <label class="field-label flex items-center gap-2">
                  Participantes
                  <span v-if="form.attendees.length"
                    class="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-micro font-bold">
                    {{ form.attendees.length }}
                  </span>
                </label>
                <div class="flex gap-2 mb-2">
                  <div class="relative flex-1">
                    <i class="fas fa-at absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm pointer-events-none"></i>
                    <input v-model="attendeeInput" type="email"
                      @keydown.enter.prevent="addAttendee"
                      @keydown.comma.prevent="addAttendee"
                      placeholder="email@empresa.com"
                      class="field-input pl-9" />
                  </div>
                  <button @click="addAttendee" type="button"
                    class="px-3.5 rounded-xl border border-line bg-surface-sunken text-ink-muted hover:bg-surface-hover transition-colors text-sm">
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
                <div v-if="form.attendees.length" class="flex flex-wrap gap-1.5">
                  <span v-for="(a, i) in form.attendees" :key="i"
                    class="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium border border-accent/25 ">
                    <i class="fas fa-user text-[9px] opacity-60"></i>
                    {{ a }}
                    <button @click="form.attendees.splice(i, 1)"
                      class="w-4 h-4 rounded-full flex items-center justify-center hover:bg-data-neg/10  hover:text-data-neg transition-colors">
                      <i class="fas fa-xmark text-[9px]"></i>
                    </button>
                  </span>
                </div>
                <p v-else class="text-xs text-ink-subtle mt-1.5 flex items-center gap-1">
                  <i class="fas fa-info-circle text-[10px]"></i>
                  <span v-if="form.type === 'meeting'">Convite Teams será enviado automaticamente por e-mail.</span>
                  <span v-else>Adicione participantes para enviar convites.</span>
                </p>
              </div>

              <!-- Descrição -->
              <div>
                <label class="field-label">Descrição <span class="text-ink-subtle font-normal text-micro">(opcional)</span></label>
                <textarea v-model="form.body" rows="3" placeholder="Pauta, links, notas importantes..."
                  class="field-input resize-none" />
              </div>

            </template>
          </div>

          <!-- ── Footer ── -->
          <div class="flex items-center gap-3 px-6 py-4 shrink-0 border-t border-line bg-surface">
            <button @click="close"
              class="px-4 py-2 rounded-xl text-sm text-ink-muted border border-line hover:bg-surface-hover transition-colors">
              Cancelar
            </button>
            <div class="flex-1"></div>
            <p v-if="!canSubmit && form.subject.trim() === ''" class="text-xs text-ink-subtle">
              Preencha o assunto para continuar
            </p>
            <button @click="submit" :disabled="!canSubmit || submitting || seriesLoading"
              :class="submitBtnClass"
              class="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
              <i v-if="submitting" class="fas fa-circle-notch animate-spin text-xs"></i>
              <i v-else :class="submitIcon" class="text-xs"></i>
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
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editEvent:  { type: Object,  default: null },
  prefill:    { type: Object,  default: null }, // { date, hour, minute }
});
const emit = defineEmits(['update:modelValue', 'created', 'updated', 'instant']);

const ts = useTeamsStore();

const EVENT_TYPES = [
  {
    value: 'meeting',
    label: 'Reunião Teams',
    icon:  'fas fa-video',
  },
  {
    value: 'event',
    label: 'Evento',
    icon:  'fas fa-calendar-day',
  },
  {
    value: 'instant',
    label: 'Instantânea',
    icon:  'fas fa-bolt',
  },
];

const isEdit     = computed(() => !!props.editEvent);
const submitting = ref(false);
const attendeeInput = ref('');

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function pad2(n) { return String(n).padStart(2, '0'); }

function defaultForm() {
  return {
    type: 'meeting',
    subject: '',
    date: todayStr(),
    endDate: todayStr(),
    startTime: '09:00',
    endTime: '09:30',
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

// ── Edição: alcance (ocorrência × série) e recorrência ────────────────────────
// Ao editar só a ocorrência, a seção de recorrência fica oculta e a chave
// `recurrence` NUNCA vai no PATCH (antes ia `recurrence: null` e destruía a
// série). No modo série, os campos são hidratados do seriesMaster e a chave só
// vai se o usuário mexer neles (recurrenceTouched).
const editScope = ref('occurrence');      // 'occurrence' | 'series'
const seriesMaster = ref(null);            // evento master carregado sob demanda
const seriesLoading = ref(false);
const recurrenceTouched = ref(false);
let hydrating = false;                     // evita marcar touched durante hidratação

const isRecurringEdit = computed(() => isEdit.value && !!props.editEvent?.isRecurring);

const recurrenceUnsupported = computed(() =>
  isRecurringEdit.value && editScope.value === 'series' && seriesMaster.value?.recurrence?.unsupported === true
);

// Cria: sempre mostra. Edita evento único: mostra. Edita recorrente: só no modo série.
const showRecurrenceSection = computed(() =>
  !isRecurringEdit.value || editScope.value === 'series'
);

function hydrateForm(ev, { keepType = false } = {}) {
  hydrating = true;
  const rec = ev.recurrence && !ev.recurrence.unsupported ? ev.recurrence : null;
  form.value = {
    type: keepType ? form.value.type : (ev.isOnlineMeeting ? 'meeting' : 'event'),
    subject:   ev.subject || '',
    date:      ev.start ? ev.start.split('T')[0] : todayStr(),
    endDate:   ev.end   ? ev.end.split('T')[0]   : todayStr(),
    startTime: ev.start ? (ev.start.split('T')[1] || '').slice(0, 5) : '09:00',
    endTime:   ev.end   ? (ev.end.split('T')[1]   || '').slice(0, 5) : '10:00',
    isAllDay:  ev.isAllDay || false,
    location:  ev.location || '',
    attendees: (ev.attendees || []).map(a => a.email).filter(Boolean),
    body:      ev.bodyPreview || '',
    recurrenceType:        rec?.type || '',
    recurrenceInterval:    rec?.interval || 1,
    recurrenceEndType:     rec?.endType || 'noEnd',
    recurrenceEndDate:     rec?.endDate || '',
    recurrenceOccurrences: rec?.occurrences || 10,
  };
  // libera o flag no próximo tick de watchers
  setTimeout(() => { hydrating = false; }, 0);
}

async function setEditScope(scope) {
  if (editScope.value === scope) return;
  editScope.value = scope;
  recurrenceTouched.value = false;

  if (scope === 'series') {
    // Hidrata do master (datas/recorrência valem para a série toda)
    if (!seriesMaster.value && props.editEvent?.seriesMasterId) {
      seriesLoading.value = true;
      try {
        seriesMaster.value = await ts.getEvent(props.editEvent.seriesMasterId);
      } catch { /* mantém dados da ocorrência */ }
      seriesLoading.value = false;
    }
    if (seriesMaster.value) hydrateForm(seriesMaster.value, { keepType: true });
  } else if (props.editEvent) {
    hydrateForm(props.editEvent, { keepType: true });
  }
}

// Qualquer mexida manual nos campos de recorrência marca touched
watch(
  () => [form.value.recurrenceType, form.value.recurrenceInterval, form.value.recurrenceEndType,
         form.value.recurrenceEndDate, form.value.recurrenceOccurrences],
  () => { if (!hydrating) recurrenceTouched.value = true; }
);

// ── Watchers ──────────────────────────────────────────────────────────────────

// Populate from edit event
watch(() => props.editEvent, (ev) => {
  if (!ev) return;
  editScope.value = 'occurrence';
  seriesMaster.value = null;
  recurrenceTouched.value = false;
  hydrateForm(ev);
}, { immediate: true });

// Pre-fill from calendar slot click
watch(() => props.prefill, (pf) => {
  if (!pf || isEdit.value) return;
  applyPrefill(pf);
});

function applyPrefill(pf) {
  if (!pf) return;
  const d = pf.date instanceof Date ? pf.date : new Date(pf.date);
  const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const h = pf.hour ?? 9, m = pf.minute ?? 0;
  const endTotal = h * 60 + m + 30;
  form.value.date      = dateStr;
  form.value.endDate   = dateStr;
  form.value.startTime = `${pad2(h)}:${pad2(m)}`;
  form.value.endTime   = `${pad2(Math.floor(endTotal / 60))}:${pad2(endTotal % 60)}`;
}

// Reset when modal opens (non-edit)
watch(() => props.modelValue, (v) => {
  if (v && !props.editEvent) {
    form.value = defaultForm();
    applyPrefill(props.prefill);
    attendeeInput.value = '';
    submitting.value = false;
    editScope.value = 'occurrence';
    seriesMaster.value = null;
    recurrenceTouched.value = false;
  }
});

// ── Computed UI ───────────────────────────────────────────────────────────────

const headerGradient = computed(() => {
  if (form.value.type === 'instant') return 'bg-gradient-to-br from-data-pos to-data-pos';
  if (form.value.type === 'event')   return 'bg-gradient-to-br from-accent to-accent';
  return 'bg-gradient-to-br from-accent to-accent';
});

const headerIcon = computed(() => {
  if (isEdit.value)                  return 'fas fa-pen';
  if (form.value.type === 'instant') return 'fas fa-bolt';
  if (form.value.type === 'event')   return 'fas fa-calendar-day';
  return 'fas fa-video';
});

const submitBtnClass = computed(() => {
  if (form.value.type === 'instant') return 'bg-data-pos hover:bg-data-pos/85';
  if (form.value.type === 'event')   return 'bg-accent hover:bg-accent-hover';
  return 'bg-accent hover:bg-accent-hover';
});

const submitLabel = computed(() => {
  if (isEdit.value)                  return 'Salvar alterações';
  if (form.value.type === 'instant') return 'Criar e copiar link';
  return 'Criar evento';
});

const submitIcon = computed(() => {
  if (isEdit.value)                  return 'fas fa-floppy-disk';
  if (form.value.type === 'instant') return 'fas fa-bolt';
  return 'fas fa-calendar-plus';
});

const subjectPlaceholder = computed(() => {
  if (form.value.type === 'meeting') return 'Ex.: Reunião de sprint, 1:1 com equipe...';
  if (form.value.type === 'instant') return 'Ex.: Reunião rápida, papo de 5 min...';
  return 'Ex.: Entrega do projeto, prazo Q2...';
});

const recurrenceUnitLabel = computed(() => {
  return { daily: 'dia(s)', weekly: 'semana(s)', monthly: 'mês(es)' }[form.value.recurrenceType] || '';
});

const canSubmit = computed(() => {
  if (!form.value.subject.trim()) return false;
  if (form.value.type === 'instant') return true;
  return !!(form.value.date && (form.value.isAllDay || (form.value.startTime && form.value.endTime)));
});

// ── Actions ───────────────────────────────────────────────────────────────────

function addAttendee() {
  const email = attendeeInput.value.trim().replace(/,$/, '');
  if (!email || form.value.attendees.includes(email)) { attendeeInput.value = ''; return; }
  form.value.attendees.push(email);
  attendeeInput.value = '';
}

function buildRecurrence() {
  if (!form.value.recurrenceType) return null;
  return {
    type:        form.value.recurrenceType,
    interval:    form.value.recurrenceInterval || 1,
    endType:     form.value.recurrenceEndType,
    endDate:     form.value.recurrenceEndDate || undefined,
    occurrences: form.value.recurrenceOccurrences,
  };
}

function close() { emit('update:modelValue', false); }

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
        subject:         form.value.subject.trim(),
        start, end,
        attendees:       form.value.attendees,
        body:            form.value.body,
        isOnlineMeeting: form.value.type === 'meeting',
        location:        form.value.location,
        isAllDay:        form.value.isAllDay,
      };

      if (isEdit.value) {
        // A chave `recurrence` só entra no PATCH se o usuário mexeu nela
        // (e nunca no modo "somente esta ocorrência" nem em séries unsupported).
        if (recurrenceTouched.value && showRecurrenceSection.value && !recurrenceUnsupported.value) {
          payload.recurrence = buildRecurrence();
        }
        const isSeries = isRecurringEdit.value && editScope.value === 'series';
        const targetId = isSeries
          ? (props.editEvent.seriesMasterId || props.editEvent.id)
          : props.editEvent.id;
        emit('updated', { eventId: targetId, editScope: isSeries ? 'series' : 'occurrence', ...payload });
      } else {
        payload.recurrence = buildRecurrence();
        emit('created', payload);
      }
    }
    close();
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.field-label {
  @apply block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1;
}
.field-input {
  @apply w-full px-3 py-2 rounded-xl border border-line bg-surface-raised text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-shadow;
}

.modal-enter-active { transition: opacity 0.15s, transform 0.15s; }
.modal-leave-active { transition: opacity 0.12s, transform 0.12s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.97); }

.expand-enter-active, .expand-leave-active { transition: opacity 0.2s, max-height 0.25s; max-height: 200px; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
</style>
