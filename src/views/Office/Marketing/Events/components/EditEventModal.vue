<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { updateEvent } from '@/utils/Event/apiEvents';
import { useEventStore } from '@/stores/Marketing/Event/eventStore';
import { usePersistedRef, clearPersisted } from '@/utils/usePersistedRef';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import EventFormFields from './EventFormFields.vue';

const props = defineProps({
  event: { type: Object, required: true },
  users: { type: Array, default: () => [] },
});

const emit = defineEmits(['close']);

// chave por evento (cada edição tem seu próprio rascunho)
const persistKey = computed(() => `event:draft:edit:${props.event.id}`);

const toLocal = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
};

const toUTC = (s) => {
  if (!s) return null;
  const full = s.length === 16 ? `${s}:00` : s;
  const [date, time] = full.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss || 0).toISOString();
};

const initialForm = () => ({
  id: props.event.id,
  title: props.event.title || '',
  description: props.event.description || '',
  eventDate: toLocal(props.event.event_date),
  tags: Array.isArray(props.event.tags) ? [...props.event.tags] : [],
  images: Array.isArray(props.event.images) ? [...props.event.images] : [],
  address: {
    street: '', number: '', neighborhood: '', city: '', state: '', zip_code: '',
    ...(props.event.address || {}),
  },
  created_by: props.event.created_by || '',
  organizers: Array.isArray(props.event.organizers) ? [...props.event.organizers] : [],
  notify_to: props.event.notify_to || { users: [], positions: [], emails: [] },
  notification: !!props.event.notification,
  enterprise_id: props.event.enterprise_id ?? null,
  enterprise_name: props.event.enterprise_name || '',
  enterprise_logo: props.event.enterprise_logo || '',
});

const form = usePersistedRef(persistKey.value, initialForm());

const isSubmitting = ref(false);
const errors = ref({});
const fieldsRef = ref(null);

function validate() {
  errors.value = {};
  if (!form.value.title.trim()) errors.value.title = 'Obrigatório';
  if (!form.value.eventDate) errors.value.eventDate = 'Obrigatório';
  if (form.value.notification) {
    const { users = [], positions = [], emails = [] } = form.value.notify_to;
    if (users.length + positions.length + emails.length === 0) {
      errors.value.notify_to = 'Selecione ao menos um destinatário.';
    }
  }
  return !Object.keys(errors.value).length;
}

async function submit() {
  if (!validate()) return;
  isSubmitting.value = true;
  try {
    const payload = {
      ...form.value,
      eventDate: toUTC(form.value.eventDate),
      address: { ...form.value.address },
      tags: [...form.value.tags],
      images: [...form.value.images],
      organizers: [...form.value.organizers],
      notify_to: {
        users: [...(form.value.notify_to?.users || [])],
        positions: [...(form.value.notify_to?.positions || [])],
        emails: [...(form.value.notify_to?.emails || [])],
      },
    };
    if ((!payload.images || !payload.images.length) && payload.enterprise_logo) {
      payload.images = [payload.enterprise_logo];
    }

    await updateEvent(payload);
    // Recarrega a store antes de fechar: o EventModal (pai) continua aberto
    // e precisa exibir o evento já atualizado, sem esperar o close geral.
    await useEventStore().fetchEvents();
    clearPersisted(persistKey.value);
    emit('close');
  } catch {
    errors.value.submit = 'Erro ao salvar alterações.';
  } finally {
    isSubmitting.value = false;
  }
}

function discardDraft() {
  if (confirm('Descartar as alterações e voltar ao original?')) {
    clearPersisted(persistKey.value);
    form.value = initialForm();
  }
}

function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
}

onMounted(async () => {
  document.addEventListener('keydown', onKey);
  await nextTick();
  fieldsRef.value?.focusTitle?.();
});

onUnmounted(() => document.removeEventListener('keydown', onKey));

const hasDraft = ref(!!localStorage.getItem(persistKey.value));
watch(form, () => { hasDraft.value = !!localStorage.getItem(persistKey.value); }, { deep: true });
</script>

<template>
  <Modal :open="true" position="right" size="lg" @close="$emit('close')">
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <div class="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 grid place-items-center shrink-0">
          <i class="fas fa-pen text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-semibold text-ink leading-tight truncate">{{ event.title || 'Editar evento' }}</h2>
          <p class="text-xs text-ink-muted mt-0.5 flex items-center gap-2">
            <kbd class="px-1.5 py-0.5 rounded border border-line bg-surface text-[10px] font-mono">⌘ Enter</kbd>
            para salvar
            <span v-if="hasDraft" class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              · <i class="fas fa-circle text-[6px]"></i> alterações pendentes
            </span>
          </p>
        </div>
      </div>
    </template>

    <EventFormFields ref="fieldsRef" :form="form" :errors="errors" :users="users" />

    <p v-if="errors.submit"
      class="mt-4 text-xs text-red-500 text-center flex items-center justify-center gap-1">
      <i class="fas fa-circle-exclamation"></i>{{ errors.submit }}
    </p>

    <template #footer>
      <Button v-if="hasDraft" variant="ghost" size="sm" @click="discardDraft" class="mr-auto">
        <i class="fas fa-rotate-left text-[10px]"></i> Descartar alterações
      </Button>
      <Button variant="ghost" @click="$emit('close')" :disabled="isSubmitting">Cancelar</Button>
      <Button :loading="isSubmitting" icon="fas fa-floppy-disk" @click="submit">
        {{ isSubmitting ? 'Salvando...' : 'Salvar alterações' }}
      </Button>
    </template>
  </Modal>
</template>
