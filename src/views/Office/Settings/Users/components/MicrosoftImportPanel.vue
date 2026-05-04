<script setup>
import { ref, computed, reactive } from 'vue';
import { useToast } from 'vue-toastification';
import { useMicrosoftOrgUsersStore } from '@/stores/Microsoft/microsoftOrgUsersStore';

import Surface from '@/components/UI/Surface.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const store = useMicrosoftOrgUsersStore();
const toast = useToast();

const loaded = ref(false);
const search = ref('');
const filterStatus = ref('');
const selected = ref(new Set());
const inviteMap = reactive({});
const showConfirm = ref(false);

const emit = defineEmits(['reload']);

async function load() {
  await store.fetchOrgUsers();
  loaded.value = true;
  selected.value = new Set();
}

const availableCount = computed(() => store.users.filter(u => !u.imported).length);
const importedCount  = computed(() => store.users.filter(u => u.imported).length);

const statusOptions = computed(() => [
  { value: '',          label: `Todos (${store.users.length})` },
  { value: 'available', label: `Disponíveis (${availableCount.value})` },
  { value: 'imported',  label: `Já importados (${importedCount.value})` },
]);

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  return store.users.filter(u => {
    const matchSearch = !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q);
    const matchStatus =
      filterStatus.value === '' ||
      (filterStatus.value === 'available' && !u.imported) ||
      (filterStatus.value === 'imported' && u.imported);
    return matchSearch && matchStatus;
  });
});

const allVisibleAvailableSelected = computed(() => {
  const available = filtered.value.filter(u => !u.imported);
  return available.length > 0 && available.every(u => selected.value.has(u.microsoft_id));
});

function toggleSelectAll() {
  const available = filtered.value.filter(u => !u.imported);
  const next = new Set(selected.value);
  if (allVisibleAvailableSelected.value) {
    available.forEach(u => next.delete(u.microsoft_id));
  } else {
    available.forEach(u => {
      next.add(u.microsoft_id);
      if (inviteMap[u.microsoft_id] === undefined) inviteMap[u.microsoft_id] = false;
    });
  }
  selected.value = next;
}

function toggleUser(id) {
  const s = new Set(selected.value);
  if (s.has(id)) s.delete(id);
  else {
    s.add(id);
    if (inviteMap[id] === undefined) inviteMap[id] = false;
  }
  selected.value = s;
}

function toggleInvite(id) { inviteMap[id] = !inviteMap[id]; }

const selectedUsers = computed(() =>
  store.users.filter(u => selected.value.has(u.microsoft_id))
);
const inviteCount = computed(() =>
  selectedUsers.value.filter(u => inviteMap[u.microsoft_id]).length
);

async function confirmImport() {
  const payload = selectedUsers.value.map(u => ({
    microsoft_id: u.microsoft_id, name: u.name, email: u.email,
    phone: u.phone, city: u.city, sendInvite: !!inviteMap[u.microsoft_id],
  }));

  try {
    const res = await store.importUsers(payload);
    showConfirm.value = false;
    selected.value = new Set();

    const total   = res.created?.length ?? 0;
    const skipped = res.skipped?.length ?? 0;
    const errors  = res.errors?.length  ?? 0;

    if (total > 0)   toast.success(`${total} usuário(s) importado(s) com sucesso!`);
    if (skipped > 0) toast.info(`${skipped} usuário(s) já existia(m) e foi(ram) ignorado(s).`);
    if (errors > 0)  toast.error(`${errors} usuário(s) com erro ao importar.`);

    if (total > 0) emit('reload');
  } catch (err) {
    toast.error(err.message || 'Erro ao importar usuários.');
  }
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <Surface variant="raised" padding="md">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-9 w-9 rounded-lg bg-accent-soft border border-accent/20 grid place-items-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 21 21">
              <rect x="0"  y="0"  width="10" height="10" fill="#F25022" />
              <rect x="11" y="0"  width="10" height="10" fill="#7FBA00" />
              <rect x="0"  y="11" width="10" height="10" fill="#00A4EF" />
              <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-ink">Usuários Microsoft</p>
            <p class="text-xs text-ink-muted">
              Importe pessoas da sua organização Microsoft para o sistema
            </p>
          </div>
        </div>
        <Button :loading="store.loading" icon="fas fa-rotate-right" @click="load">
          {{ store.loading ? 'Carregando...' : (loaded ? 'Recarregar' : 'Carregar usuários') }}
        </Button>
      </div>

      <div v-if="store.error"
        class="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
        <i class="fas fa-circle-exclamation shrink-0 mt-0.5"></i>
        <span>{{ store.error }}</span>
      </div>
    </Surface>

    <!-- Filtros + lista -->
    <template v-if="loaded && !store.loading">
      <Surface variant="raised" padding="md">
        <div class="flex flex-col sm:flex-row gap-3 mb-3">
          <Input v-model="search" placeholder="Buscar por nome ou email..."
            iconLeft="fas fa-magnifying-glass" class="flex-1" />
          <Select v-model="filterStatus" :options="statusOptions" class="sm:w-64" />
        </div>

        <div class="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-line">
          <label class="flex items-center gap-2 cursor-pointer text-sm text-ink-muted select-none">
            <input type="checkbox" :checked="allVisibleAvailableSelected" @change="toggleSelectAll" />
            Selecionar disponíveis visíveis
          </label>
          <div class="flex items-center gap-2">
            <Badge v-if="selected.size > 0" variant="accent" size="sm">
              {{ selected.size }} selecionado{{ selected.size > 1 ? 's' : '' }}
            </Badge>
            <Button v-if="selected.size > 0" size="sm" icon="fas fa-user-plus"
              :loading="store.importing" @click="showConfirm = true">
              Importar
            </Button>
          </div>
        </div>
      </Surface>

      <EmptyState v-if="!filtered.length" size="md"
        icon="fas fa-users" title="Nenhum usuário encontrado"
        description="Tente ajustar a busca ou o filtro de status." />

      <div v-else class="space-y-2">
        <article v-for="user in filtered" :key="user.microsoft_id"
          class="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border transition-all duration-150
                 surface-gradient"
          :class="user.imported
            ? 'border-line bg-surface-raised opacity-60'
            : selected.has(user.microsoft_id)
              ? 'border-accent/40 bg-accent-soft/30 shadow-soft'
              : 'border-line bg-surface-raised hover:border-accent/30 hover:shadow-soft'">

          <!-- Checkbox / check -->
          <div class="shrink-0 w-5 grid place-items-center">
            <input v-if="!user.imported" type="checkbox"
              :checked="selected.has(user.microsoft_id)" @change="toggleUser(user.microsoft_id)" />
            <i v-else class="fas fa-check text-emerald-500 text-xs" v-tippy="'Já importado'"></i>
          </div>

          <!-- Avatar -->
          <div class="h-9 w-9 rounded-lg bg-surface-sunken border border-line text-ink-muted grid place-items-center shrink-0 text-xs font-bold uppercase select-none">
            {{ initials(user.name) }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-semibold text-ink truncate">{{ user.name || '—' }}</p>
              <Badge :variant="user.imported ? 'success' : 'neutral'" size="sm">
                {{ user.imported ? 'Importado' : 'Disponível' }}
              </Badge>
            </div>
            <p class="text-xs text-ink-muted truncate">{{ user.email || '—' }}</p>
            <p v-if="user.phone || user.city" class="text-[11px] text-ink-subtle font-mono truncate">
              <span v-if="user.phone">{{ user.phone }}</span>
              <span v-if="user.phone && user.city" class="mx-1">·</span>
              <span v-if="user.city">{{ user.city }}</span>
            </p>
          </div>

          <!-- Toggle convite -->
          <div v-if="selected.has(user.microsoft_id)" class="shrink-0">
            <label class="flex items-center gap-2 cursor-pointer select-none"
              v-tippy="'Enviar email de boas-vindas ao importar'">
              <span class="text-xs text-ink-muted hidden sm:inline">Enviar convite</span>
              <Switch :model-value="!!inviteMap[user.microsoft_id]"
                @update:model-value="toggleInvite(user.microsoft_id)" size="sm" />
            </label>
          </div>
        </article>
      </div>
    </template>

    <!-- Modal de confirmação -->
    <Modal :open="showConfirm" size="md" @close="showConfirm = false">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-user-plus text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">Confirmar importação</h3>
            <p class="text-xs text-ink-muted mt-0.5">
              <span class="font-mono text-ink">{{ selected.size }}</span> usuário(s) ·
              <span v-if="inviteCount > 0" class="font-mono text-accent">{{ inviteCount }}</span>
              <span v-if="inviteCount > 0" class="text-accent"> convite(s)</span>
            </p>
          </div>
        </div>
      </template>

      <div class="max-h-64 overflow-y-auto space-y-1.5">
        <div v-for="u in selectedUsers" :key="u.microsoft_id"
          class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-sunken border border-line">
          <div class="min-w-0">
            <p class="text-sm font-medium text-ink truncate">{{ u.name }}</p>
            <p class="text-xs text-ink-muted truncate font-mono">{{ u.email }}</p>
          </div>
          <Badge v-if="inviteMap[u.microsoft_id]" variant="accent" size="sm">
            <i class="fas fa-envelope text-[9px]"></i> convite
          </Badge>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="showConfirm = false">Cancelar</Button>
        <Button :loading="store.importing" icon="fas fa-check" @click="confirmImport">
          {{ store.importing ? 'Importando...' : 'Importar' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
