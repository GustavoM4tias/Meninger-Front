<script setup>
import { ref, computed } from 'vue';
import Input from '@/components/UI/Input.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ users: [], positions: [], emails: [] }),
  },
  users: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const userQuery = ref('');
const emailInput = ref('');
const posQuery = ref('');

const ensureMV = (mv) => ({
  users: Array.isArray(mv?.users) ? mv.users : [],
  positions: Array.isArray(mv?.positions) ? mv.positions : [],
  emails: Array.isArray(mv?.emails) ? mv.emails : [],
});

const mv = computed(() => ensureMV(props.modelValue));

const normalizeText = (v) =>
  String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const uniquePositions = computed(() => {
  const set = new Set((props.users || []).map(u => u?.position).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
});

const filteredUsers = computed(() => {
  const q = normalizeText(userQuery.value);
  const list = !q
    ? props.users
    : props.users.filter(u =>
        normalizeText([u.username, u.email, u.position].filter(Boolean).join(' ')).includes(q)
      );
  return list.filter(u => !mv.value.users.includes(u.id)).slice(0, 8);
});

const filteredPositions = computed(() => {
  const q = normalizeText(posQuery.value);
  const list = !q ? uniquePositions.value
                  : uniquePositions.value.filter(p => normalizeText(p).includes(q));
  return list.filter(p => !mv.value.positions.includes(p)).slice(0, 8);
});

function modelUpdate(partial) { emit('update:modelValue', { ...mv.value, ...partial }); }
const resolveUser = (id) => props.users.find(u => u.id === id);

function addUserId(id) {
  const set = new Set(mv.value.users); set.add(id);
  modelUpdate({ users: Array.from(set) }); userQuery.value = '';
}
function removeUserId(id) { modelUpdate({ users: mv.value.users.filter(u => u !== id) }); }

const isValidEmail = (e) => /\S+@\S+\.\S+/.test(e);
function addEmail() {
  const email = emailInput.value.trim().toLowerCase();
  if (!email || !isValidEmail(email)) return;
  const set = new Set(mv.value.emails); set.add(email);
  modelUpdate({ emails: Array.from(set) }); emailInput.value = '';
}
function removeEmail(email) { modelUpdate({ emails: mv.value.emails.filter(x => x !== email) }); }

function addPosition(p) {
  const set = new Set(mv.value.positions); set.add(p);
  modelUpdate({ positions: Array.from(set) }); posQuery.value = '';
}
function removePosition(p) { modelUpdate({ positions: mv.value.positions.filter(x => x !== p) }); }
</script>

<template>
  <div class="space-y-5">
    <!-- Usuários -->
    <div class="space-y-2">
      <Input v-model="userQuery" label="Usuários"
        placeholder="Buscar por nome, e-mail ou cargo"
        iconLeft="fas fa-magnifying-glass" />

      <div v-if="userQuery && filteredUsers.length"
        class="rounded-lg border border-line bg-surface-overlay shadow-elevated overflow-hidden">
        <div class="max-h-56 overflow-y-auto divide-y divide-line">
          <button v-for="u in filteredUsers" :key="u.id" type="button"
            @mousedown.prevent="addUserId(u.id)"
            class="w-full px-3 py-2.5 text-left hover:bg-accent-soft/40 transition-colors">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink truncate">{{ u.username }}</p>
                <p class="text-xs text-ink-muted truncate">{{ u.email || 'Sem e-mail' }}</p>
              </div>
              <Badge v-if="u.position" variant="accent" size="sm">{{ u.position }}</Badge>
            </div>
          </button>
        </div>
      </div>

      <div v-if="mv.users.length" class="flex flex-wrap gap-1.5">
        <span v-for="id in mv.users" :key="id"
          class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-xs rounded-md
                 bg-accent-soft text-accent border border-accent/20">
          <i class="fas fa-user text-[9px]"></i>
          <span class="truncate max-w-56">
            {{ resolveUser(id)?.username || `ID ${id}` }}
            <span v-if="resolveUser(id)?.position" class="opacity-70"> · {{ resolveUser(id)?.position }}</span>
          </span>
          <button type="button" @click="removeUserId(id)"
            class="h-4 w-4 grid place-items-center rounded hover:bg-accent/20 leading-none">
            <i class="fas fa-xmark text-[9px]"></i>
          </button>
        </span>
      </div>
    </div>

    <!-- Cargos -->
    <div class="space-y-2">
      <Input v-model="posQuery" label="Cargos" placeholder="Buscar cargo"
        iconLeft="fas fa-id-badge"
        hint="Todos os usuários com os cargos selecionados receberão notificação." />

      <div v-if="posQuery && filteredPositions.length"
        class="rounded-lg border border-line bg-surface-overlay shadow-elevated overflow-hidden">
        <div class="max-h-56 overflow-y-auto divide-y divide-line">
          <button v-for="position in filteredPositions" :key="position" type="button"
            @mousedown.prevent="addPosition(position)"
            class="w-full px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-accent-soft/40 transition-colors">
            {{ position }}
          </button>
        </div>
      </div>

      <div v-if="mv.positions.length" class="flex flex-wrap gap-1.5">
        <span v-for="position in mv.positions" :key="position"
          class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-xs rounded-md
                 bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
          <i class="fas fa-id-badge text-[9px]"></i>
          {{ position }}
          <button type="button" @click="removePosition(position)"
            class="h-4 w-4 grid place-items-center rounded hover:bg-sky-500/20 leading-none">
            <i class="fas fa-xmark text-[9px]"></i>
          </button>
        </span>
      </div>
    </div>

    <!-- Emails -->
    <div class="space-y-2">
      <p class="text-xs font-medium text-ink-muted">E-mails externos</p>
      <div class="flex gap-2">
        <Input v-model="emailInput" type="email" placeholder="email@dominio.com"
          iconLeft="fas fa-envelope" class="flex-1"
          @keydown.enter.prevent="addEmail" />
        <IconButton icon="fas fa-plus" variant="secondary" size="lg"
          @click="addEmail" :disabled="!isValidEmail(emailInput.trim())" label="Adicionar e-mail" />
      </div>

      <div v-if="mv.emails.length" class="flex flex-wrap gap-1.5">
        <span v-for="email in mv.emails" :key="email"
          class="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-xs rounded-md
                 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
          <i class="fas fa-envelope text-[9px]"></i>
          <span class="truncate max-w-64">{{ email }}</span>
          <button type="button" @click="removeEmail(email)"
            class="h-4 w-4 grid place-items-center rounded hover:bg-purple-500/20 leading-none">
            <i class="fas fa-xmark text-[9px]"></i>
          </button>
        </span>
      </div>
    </div>
  </div>
</template>
