<script setup>
// Compartilhar um alerta com outro usuário. O destinatário recebe um convite
// (tela de Alertas + notificação) e decide aceitar ou recusar. Ao aceitar, ganha
// uma cópia própria do alerta.

import { ref, computed, onMounted } from 'vue';
import { useAlertStore } from '@/stores/Alerts/alertStore';
import * as api from '@/utils/Alerts/apiAlerts';
import { useToast } from 'vue-toastification';

import Modal from '@/components/UI/Modal.vue';
import Spinner from '@/components/UI/Spinner.vue';

const props = defineProps({ rule: { type: Object, required: true } });
const emit = defineEmits(['close', 'shared']);

const store = useAlertStore();
const toast = useToast();

const loadingUsers = ref(true);
const users = ref([]);
const search = ref('');
const sending = ref(false);

const form = ref({
  to_user_id: null,
  note: '',
  channels: { inapp: true, email: true, whatsapp: false },
});

onMounted(async () => {
  try {
    const r = await api.fetchShareableUsers();
    users.value = Array.isArray(r?.items) ? r.items : [];
  } catch (e) {
    toast.error('Falha ao carregar usuários.');
  } finally { loadingUsers.value = false; }
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(u =>
    (u.username || '').toLowerCase().includes(q) ||
    (u.position || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q));
});

const selectedUser = computed(() => users.value.find(u => u.id === form.value.to_user_id) || null);

function pick(u) { form.value.to_user_id = u.id; }

async function submit() {
  if (!form.value.to_user_id) { toast.error('Escolha um destinatário.'); return; }
  sending.value = true;
  try {
    await store.share(props.rule.id, {
      to_user_id: form.value.to_user_id,
      note: form.value.note?.trim() || null,
      channels: form.value.channels,
    });
    toast.success(`Convite enviado para ${selectedUser.value?.username || 'o usuário'}.`);
    emit('shared');
  } catch (e) {
    const msg = String(e.message || '').includes('HTTP 400')
      ? 'Não foi possível compartilhar (talvez já exista um convite pendente).'
      : (e.message || 'Falha ao compartilhar.');
    toast.error(msg);
  } finally { sending.value = false; }
}

const channelDefs = [
  { key: 'inapp',    icon: 'fas fa-bell',           name: 'Sino',     desc: 'no painel' },
  { key: 'email',    icon: 'fas fa-envelope',       name: 'E-mail',   desc: 'caixa de entrada' },
  { key: 'whatsapp', icon: 'fa-brands fa-whatsapp', name: 'WhatsApp', desc: 'com SIM/NÃO' },
];
</script>

<template>
  <Modal :open="true" @close="emit('close')" size="lg"
    title="Compartilhar alerta" :subtitle="rule.name">

    <div class="space-y-5">
      <!-- Destinatário -->
      <section>
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
          01 · para quem
        </p>

        <div class="relative mb-2">
          <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs"></i>
          <input v-model="search" type="text" placeholder="buscar por nome, cargo ou e-mail"
            class="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-sunken border border-line text-sm text-ink
                   focus:outline-none focus:border-accent/50 transition" />
        </div>

        <div v-if="loadingUsers" class="py-8 grid place-items-center"><Spinner size="sm" /></div>

        <div v-else-if="!filtered.length" class="py-6 text-center text-xs text-ink-muted">
          Nenhum usuário encontrado.
        </div>

        <ul v-else class="max-h-56 overflow-y-auto rounded-lg border border-line divide-y divide-line">
          <li v-for="u in filtered" :key="u.id">
            <button type="button" @click="pick(u)"
              :class="['w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                       form.to_user_id === u.id ? 'bg-accent-soft' : 'hover:bg-surface-sunken']">
              <span class="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-surface-sunken
                           text-[11px] font-semibold text-ink-muted uppercase">
                {{ (u.username || '?').slice(0, 2) }}
              </span>
              <span class="flex-1 min-w-0">
                <span class="block text-sm text-ink truncate">{{ u.username }}</span>
                <span v-if="u.position" class="block text-[11px] text-ink-subtle truncate">{{ u.position }}</span>
              </span>
              <i v-if="form.to_user_id === u.id" class="fas fa-circle-check text-accent text-sm"></i>
            </button>
          </li>
        </ul>
      </section>

      <!-- Nota -->
      <section>
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
          02 · mensagem (opcional)
        </p>
        <textarea v-model="form.note" rows="2" maxlength="1000"
          placeholder="ex: acho que esse alerta te ajuda no acompanhamento semanal"
          class="w-full rounded-lg bg-surface-sunken border border-line px-3 py-2 text-sm text-ink
                 focus:outline-none focus:border-accent/50 transition resize-y"></textarea>
      </section>

      <!-- Canais -->
      <section>
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
          03 · avisar por
        </p>
        <div class="grid grid-cols-3 gap-2">
          <label v-for="c in channelDefs" :key="c.key"
            :class="['flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all',
                     form.channels[c.key] ? 'bg-accent-soft border-accent/50' : 'bg-surface border-line hover:border-accent/30']">
            <input v-model="form.channels[c.key]" type="checkbox" class="sr-only" />
            <i :class="[c.icon, form.channels[c.key] ? 'text-accent' : 'text-ink-subtle', 'text-sm']"></i>
            <span class="min-w-0">
              <span class="block text-[12.5px] font-medium text-ink leading-tight">{{ c.name }}</span>
              <span class="block text-[10.5px] text-ink-subtle">{{ c.desc }}</span>
            </span>
          </label>
        </div>
        <p v-if="form.channels.whatsapp" class="mt-2 text-[11px] text-ink-subtle flex items-start gap-1.5">
          <i class="fas fa-circle-info mt-0.5"></i>
          O WhatsApp só é enviado se o destinatário tiver opt-in ativo e o template estiver aprovado;
          caso contrário, o convite continua valendo pelo sino e e-mail.
        </p>
      </section>
    </div>

    <template #footer>
      <button @click="emit('close')"
        class="px-4 py-2 rounded-lg border border-line text-sm text-ink-muted hover:text-ink hover:bg-surface transition">
        cancelar
      </button>
      <button @click="submit" :disabled="sending || !form.to_user_id"
        class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-60
               hover:bg-accent-hover transition inline-flex items-center gap-2">
        <Spinner v-if="sending" size="xs" />
        <template v-else><i class="fas fa-paper-plane"></i> enviar convite</template>
      </button>
    </template>
  </Modal>
</template>
