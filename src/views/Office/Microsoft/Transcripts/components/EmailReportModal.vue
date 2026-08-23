<template>
  <Modal :open="show" size="lg" :padded="false" hide-close @close="$emit('close')">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent flex items-center justify-center">
                <i class="fas fa-envelope text-white text-sm"></i>
              </div>
              <div>
                <h2 class="text-base font-bold text-ink">Enviar Relatório por E-mail</h2>
                <p class="text-xs text-ink-muted truncate max-w-xs">{{ meeting?.subject }}</p>
              </div>
            </div>
            <button @click="$emit('close')" class="w-8 h-8 rounded-lg flex items-center justify-center text-ink-subtle hover:bg-surface-hover transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            <!-- Destinatários -->
            <div>
              <label class="block text-xs font-semibold text-ink-muted mb-2">
                <i class="fas fa-users mr-1 text-accent"></i> Destinatários
              </label>
              <!-- Chips -->
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(email, i) in recipients" :key="email"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                  <i class="fas fa-circle-user text-xs opacity-60"></i>
                  {{ email }}
                  <button @click="removeRecipient(i)" class="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-accent/10  transition-colors">
                    <i class="fas fa-times text-[9px]"></i>
                  </button>
                </span>
              </div>
              <!-- Input para adicionar -->
              <div class="flex gap-2">
                <input
                  v-model="newEmail"
                  @keydown.enter.prevent="addEmail"
                  @keydown.tab.prevent="addEmail"
                  type="email"
                  placeholder="nome@empresa.com"
                  class="flex-1 px-3 py-2 rounded-xl border border-line bg-surface-sunken text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-ink-subtle dark:placeholder:text-ink-muted"
                />
                <button @click="addEmail" :disabled="!newEmail.trim()"
                  class="px-3 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40 shrink-0">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
              <p class="text-xs text-ink-subtle mt-1.5">Pressione Enter para adicionar · Participantes da reunião são pré-selecionados</p>
            </div>

            <!-- Assunto -->
            <div>
              <label class="block text-xs font-semibold text-ink-muted mb-2">
                <i class="fas fa-pen mr-1 text-accent"></i> Assunto
              </label>
              <input v-model="subject" type="text"
                class="w-full px-3 py-2 rounded-xl border border-line bg-surface-sunken text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent" />
            </div>

            <!-- Observações -->
            <div>
              <label class="block text-xs font-semibold text-ink-muted mb-2">
                <i class="fas fa-comment-alt mr-1 text-accent"></i> Observações <span class="font-normal text-ink-subtle">(opcional)</span>
              </label>
              <textarea v-model="observations" rows="3"
                placeholder="Adicione um comentário ou nota que será incluído no e-mail..."
                class="w-full px-3 py-2 rounded-xl border border-line bg-surface-sunken text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-ink-subtle dark:placeholder:text-ink-muted resize-none" />
            </div>

            <!-- Preview do que será enviado -->
            <div class="bg-surface-sunken/60 rounded-xl border border-line p-4">
              <p class="text-xs font-semibold text-ink-muted mb-2">O e-mail incluirá:</p>
              <ul class="space-y-1">
                <li v-if="report?.resumo" class="flex items-center gap-2 text-xs text-ink-muted">
                  <i class="fas fa-check text-data-pos w-3"></i> Resumo executivo
                </li>
                <li v-if="report?.decisoes?.length" class="flex items-center gap-2 text-xs text-ink-muted">
                  <i class="fas fa-check text-data-pos w-3"></i> {{ report.decisoes.length }} decisões
                </li>
                <li v-if="report?.acoes?.length" class="flex items-center gap-2 text-xs text-ink-muted">
                  <i class="fas fa-check text-data-pos w-3"></i> {{ report.acoes.length }} ações & responsabilidades
                </li>
                <li v-if="report?.kpis?.length" class="flex items-center gap-2 text-xs text-ink-muted">
                  <i class="fas fa-check text-data-pos w-3"></i> {{ report.kpis.length }} KPIs
                </li>
                <li v-if="report?.proximos_passos?.length" class="flex items-center gap-2 text-xs text-ink-muted">
                  <i class="fas fa-check text-data-pos w-3"></i> Próximos passos
                </li>
              </ul>
            </div>

            <!-- Erro -->
            <div v-if="error" class="flex items-start gap-2 p-3 rounded-xl bg-data-neg/10 border border-data-neg/25 text-xs text-data-neg">
              <i class="fas fa-circle-exclamation shrink-0 mt-0.5"></i>
              {{ error }}
            </div>

          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between gap-3 px-6 py-4 border-t border-line shrink-0">
            <p class="text-xs text-ink-subtle">{{ recipients.length }} destinatário(s)</p>
            <div class="flex gap-2">
              <button @click="$emit('close')"
                class="px-4 py-2 rounded-xl border border-line text-sm text-ink-muted hover:bg-surface-hover transition-colors">
                Cancelar
              </button>
              <button @click="send" :disabled="sending || !recipients.length"
                class="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-accent to-accent hover:from-accent hover:to-accent text-white text-sm font-semibold transition-all shadow-md shadow-accent/20 disabled:opacity-40 disabled:cursor-not-allowed">
                <i class="fas" :class="sending ? 'fa-circle-notch animate-spin' : 'fa-paper-plane'"></i>
                {{ sending ? 'Enviando...' : 'Enviar' }}
              </button>
            </div>
          </div>

  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';
import Modal from '@/components/UI/Modal.vue';

const props = defineProps({
  show:       { type: Boolean, default: false },
  meeting:    { type: Object, default: null },
  report:     { type: Object, default: null },
  reportId:   { type: [Number, String], default: null },  // Teams: transcript DB id
  meetingId:  { type: [Number, String], default: null },  // InPerson: meeting id
  isInPerson: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'sent']);

const recipients  = ref([]);
const newEmail    = ref('');
const subject     = ref('');
const observations = ref('');
const sending     = ref(false);
const error       = ref(null);

// Preenche ao abrir
watch(() => props.show, (v) => {
  if (!v) return;
  error.value = null;
  observations.value = '';
  newEmail.value = '';
  // Destinatários: participantes da reunião com e-mail
  const attendeeEmails = (props.meeting?.attendees || [])
    .map(a => a.email)
    .filter(Boolean);
  recipients.value = [...new Set(attendeeEmails)];
  // Assunto
  subject.value = `Relatório: ${props.meeting?.subject || 'Reunião'}`;
});

function addEmail() {
  const e = newEmail.value.trim().toLowerCase();
  if (!e || !e.includes('@')) return;
  if (!recipients.value.includes(e)) recipients.value.push(e);
  newEmail.value = '';
}

function removeRecipient(i) {
  recipients.value.splice(i, 1);
}

async function send() {
  if (!recipients.value.length) return;
  sending.value = true;
  error.value   = null;
  try {
    const url = props.isInPerson
      ? `${API_URL}/microsoft/inperson/meetings/${props.meetingId}/email`
      : `${API_URL}/microsoft/transcripts/reports/${props.reportId}/email`;
    await requestWithAuth(url, {
      method: 'POST',
      body: JSON.stringify({
        recipients:   recipients.value,
        subject:      subject.value,
        observations: observations.value || null,
      }),
    });
    emit('sent');
    emit('close');
  } catch (err) {
    error.value = err.message || 'Erro ao enviar o e-mail. Tente novamente.';
  } finally {
    sending.value = false;
  }
}
</script>

<style scoped>
</style>
