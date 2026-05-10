<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { addEvent } from '@/utils/Event/apiEvents';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { usePersistedRef, clearPersisted } from '@/utils/usePersistedRef';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import EventFormFields from './EventFormFields.vue';

const PERSIST_KEY = 'event:draft:add';

const authStore = useAuthStore();
const emit = defineEmits(['close']);

const emptyForm = () => ({
  title: '',
  eventDate: '',
  description: '',
  tags: [],
  images: [],
  address: { street: '', number: '', neighborhood: '', city: '', state: '', zip_code: '' },
  created_by: authStore.user?.username || '',
  organizers: [],
  notify_to: { users: [], positions: [], emails: [] },
  notification: false,
  enterprise_id: null,
  enterprise_name: '',
  enterprise_logo: '',
});

// Form persistido em localStorage — não perde se fechar sem querer
const form = usePersistedRef(PERSIST_KEY, emptyForm());

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
    if (payload.eventDate) payload.eventDate = new Date(payload.eventDate).toISOString();

    await addEvent(payload);
    // sucesso → limpa o draft persistido
    clearPersisted(PERSIST_KEY);
    form.value = emptyForm();
    emit('close');
  } catch {
    errors.value.submit = 'Erro ao criar evento.';
  } finally {
    isSubmitting.value = false;
  }
}

function discardDraft() {
  if (confirm('Descartar o rascunho deste evento?')) {
    clearPersisted(PERSIST_KEY);
    form.value = emptyForm();
  }
}

function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
}

onMounted(async () => {
  document.addEventListener('keydown', onKey);
  await nextTick();
  fieldsRef.value?.focusTitle?.();
  if (!authStore.users?.length) authStore.getAllUsers();
});

onUnmounted(() => document.removeEventListener('keydown', onKey));

// Indicador "rascunho carregado"
const hasDraft = ref(!!localStorage.getItem(PERSIST_KEY));
watch(form, () => { hasDraft.value = !!localStorage.getItem(PERSIST_KEY); }, { deep: true });
</script>

<template>
  <Modal :open="true" position="right" size="lg" @close="$emit('close')">
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <div class="h-9 w-9 rounded-lg bg-accent text-white grid place-items-center shrink-0">
          <i class="fas fa-calendar-plus text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-semibold text-ink leading-tight">Novo evento</h2>
          <p class="text-xs text-ink-muted mt-0.5 flex items-center gap-2">
            <kbd class="px-1.5 py-0.5 rounded border border-line bg-surface text-[10px] font-mono">⌘ Enter</kbd>
            para salvar
            <span v-if="hasDraft" class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              · <i class="fas fa-circle text-[6px]"></i> rascunho salvo
            </span>
          </p>
        </div>
      </div>
    </template>

    <EventFormFields ref="fieldsRef" :form="form" :errors="errors" :users="authStore.activeUsers" />

    <p v-if="errors.submit"
      class="mt-4 text-xs text-red-500 text-center flex items-center justify-center gap-1">
      <i class="fas fa-circle-exclamation"></i>{{ errors.submit }}
    </p>

    <template #footer>
      <Button v-if="hasDraft" variant="ghost" size="sm" @click="discardDraft" class="mr-auto">
        <i class="fas fa-trash text-[10px]"></i> Descartar rascunho
      </Button>
      <Button variant="ghost" @click="$emit('close')" :disabled="isSubmitting">Cancelar</Button>
      <Button :loading="isSubmitting" icon="fas fa-check" @click="submit">
        {{ isSubmitting ? 'Criando...' : 'Criar evento' }}
      </Button>
    </template>
  </Modal>
</template>
