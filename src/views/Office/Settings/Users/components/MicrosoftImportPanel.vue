<template>
  <div class="space-y-5">

    <!-- Cabeçalho do painel -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
              <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
              <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
              <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
              <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Usuários Microsoft</p>
            <p class="text-xs text-gray-400 mt-0.5">Importe pessoas da sua organização Microsoft para o sistema</p>
          </div>
        </div>
        <button
          @click="load"
          :disabled="store.loading"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <i class="fas fa-rotate-right text-xs" :class="{ 'animate-spin': store.loading }"></i>
          {{ store.loading ? 'Carregando...' : loaded ? 'Recarregar' : 'Carregar usuários' }}
        </button>
      </div>

      <!-- Erro -->
      <div v-if="store.error" class="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
        <i class="fas fa-triangle-exclamation mt-0.5 shrink-0"></i>
        <span>{{ store.error }}</span>
      </div>
    </div>

    <!-- Filtros + lista (só exibe após carregar) -->
    <template v-if="loaded && !store.loading">

      <!-- Filtros -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <!-- Busca -->
          <div class="relative flex-1">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            <input
              v-model="search"
              type="text"
              placeholder="Buscar por nome ou email..."
              class="w-full pl-8 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition"
            />
          </div>
          <!-- Filtro status -->
          <select
            v-model="filterStatus"
            class="px-3 py-2 text-sm bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 text-gray-900 dark:text-gray-100 transition"
          >
            <option value="">Todos ({{ store.users.length }})</option>
            <option value="available">Disponíveis ({{ availableCount }})</option>
            <option value="imported">Já importados ({{ importedCount }})</option>
          </select>
        </div>

        <!-- Ações em batch -->
        <div class="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-300 select-none">
              <input type="checkbox" :checked="allVisibleAvailableSelected" @change="toggleSelectAll" class="rounded accent-blue-600" />
              Selecionar disponíveis visíveis
            </label>
            <span v-if="selected.size > 0" class="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {{ selected.size }} selecionado{{ selected.size > 1 ? 's' : '' }}
            </span>
          </div>
          <button
            v-if="selected.size > 0"
            @click="openConfirm"
            :disabled="store.importing"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-60"
          >
            <i class="fas fa-user-plus text-xs"></i>
            Importar {{ selected.size }} usuário{{ selected.size > 1 ? 's' : '' }}
          </button>
        </div>
      </div>

      <!-- Lista de usuários -->
      <div v-if="filtered.length === 0" class="py-14 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
          <i class="fas fa-users text-gray-400 text-lg"></i>
        </div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhum usuário encontrado</p>
        <p class="text-xs text-gray-400 mt-1">Tente ajustar a busca ou o filtro de status.</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="user in filtered"
          :key="user.microsoft_id"
          class="bg-white dark:bg-gray-900 rounded-2xl border px-4 py-3.5 transition-all duration-150 group"
          :class="user.imported
            ? 'border-gray-100 dark:border-gray-800/50 opacity-60'
            : selected.has(user.microsoft_id)
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10 shadow-sm'
              : 'border-gray-200 dark:border-gray-800 hover:shadow-sm'"
        >
          <div class="flex items-center gap-3">

            <!-- Checkbox (só para não importados) -->
            <div class="shrink-0 w-5">
              <input
                v-if="!user.imported"
                type="checkbox"
                :checked="selected.has(user.microsoft_id)"
                @change="toggleUser(user.microsoft_id)"
                class="rounded accent-blue-600 cursor-pointer"
              />
              <i v-else class="fas fa-check text-green-500 text-xs" v-tippy="'Já importado'"></i>
            </div>

            <!-- Avatar -->
            <div class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase select-none">
              {{ initials(user.name) }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ user.name || '—' }}</p>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  :class="user.imported
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'"
                >
                  {{ user.imported ? 'Importado' : 'Disponível' }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ user.email || '—' }}</p>
              <p v-if="user.phone || user.city" class="text-xs text-gray-400 dark:text-gray-500">
                <span v-if="user.phone">{{ user.phone }}</span>
                <span v-if="user.phone && user.city" class="mx-1">·</span>
                <span v-if="user.city">{{ user.city }}</span>
              </p>
            </div>

            <!-- Toggle convite (só para selecionados e não importados) -->
            <div v-if="selected.has(user.microsoft_id)" class="shrink-0 flex items-center gap-2">
              <label class="flex items-center gap-1.5 cursor-pointer select-none" v-tippy="'Enviar email de boas-vindas ao importar'">
                <span class="text-xs text-gray-500 dark:text-gray-400">Enviar convite</span>
                <button
                  type="button"
                  @click="toggleInvite(user.microsoft_id)"
                  class="relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none"
                  :class="inviteMap[user.microsoft_id] ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200"
                    :class="inviteMap[user.microsoft_id] ? 'translate-x-4' : 'translate-x-0'"
                  ></span>
                </button>
              </label>
            </div>

          </div>
        </div>
      </div>
    </template>

    <!-- Modal de confirmação -->
    <Teleport to="body">
      <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
          <div class="p-6">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Confirmar importação</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Serão criados <strong class="text-gray-900 dark:text-white">{{ selected.size }}</strong> usuário{{ selected.size > 1 ? 's' : '' }} no sistema.
              <template v-if="inviteCount > 0">
                <br/>
                <span class="text-blue-600 dark:text-blue-400">{{ inviteCount }} receberá{{ inviteCount > 1 ? 'ão' : '' }} email de convite.</span>
              </template>
            </p>

            <!-- Preview dos selecionados -->
            <div class="max-h-48 overflow-y-auto space-y-1.5 mb-5">
              <div
                v-for="u in selectedUsers"
                :key="u.microsoft_id"
                class="flex items-center justify-between gap-2 py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div class="min-w-0">
                  <p class="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{{ u.name }}</p>
                  <p class="text-[11px] text-gray-400 truncate">{{ u.email }}</p>
                </div>
                <span v-if="inviteMap[u.microsoft_id]" class="text-[10px] text-blue-500 shrink-0 flex items-center gap-1">
                  <i class="fas fa-envelope"></i> convite
                </span>
              </div>
            </div>

            <div class="flex gap-3">
              <button
                @click="showConfirm = false"
                class="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                @click="confirmImport"
                :disabled="store.importing"
                class="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-60"
              >
                <span v-if="store.importing"><i class="fas fa-spinner animate-spin mr-1.5"></i>Importando...</span>
                <span v-else>Importar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { useToast } from 'vue-toastification';
import { useMicrosoftOrgUsersStore } from '@/stores/Microsoft/microsoftOrgUsersStore';

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
  if (allVisibleAvailableSelected.value) {
    available.forEach(u => selected.value.delete(u.microsoft_id));
  } else {
    available.forEach(u => {
      selected.value.add(u.microsoft_id);
      if (inviteMap[u.microsoft_id] === undefined) inviteMap[u.microsoft_id] = false;
    });
  }
  selected.value = new Set(selected.value);
}

function toggleUser(id) {
  const s = new Set(selected.value);
  if (s.has(id)) {
    s.delete(id);
  } else {
    s.add(id);
    if (inviteMap[id] === undefined) inviteMap[id] = false;
  }
  selected.value = s;
}

function toggleInvite(id) {
  inviteMap[id] = !inviteMap[id];
}

const selectedUsers = computed(() =>
  store.users.filter(u => selected.value.has(u.microsoft_id))
);

const inviteCount = computed(() =>
  selectedUsers.value.filter(u => inviteMap[u.microsoft_id]).length
);

function openConfirm() {
  showConfirm.value = true;
}

async function confirmImport() {
  const payload = selectedUsers.value.map(u => ({
    microsoft_id: u.microsoft_id,
    name:         u.name,
    email:        u.email,
    phone:        u.phone,
    city:         u.city,
    sendInvite:   !!inviteMap[u.microsoft_id],
  }));

  try {
    const res = await store.importUsers(payload);
    showConfirm.value = false;
    selected.value = new Set();

    const total   = res.created?.length ?? 0;
    const skipped = res.skipped?.length ?? 0;
    const errors  = res.errors?.length  ?? 0;

    if (total > 0)   toast.success(`${total} usuário${total > 1 ? 's' : ''} importado${total > 1 ? 's' : ''} com sucesso!`);
    if (skipped > 0) toast.info(`${skipped} usuário${skipped > 1 ? 's' : ''} já existia${skipped > 1 ? 'm' : ''} e foi${skipped > 1 ? 'ram' : ''} ignorado${skipped > 1 ? 's' : ''}.`);
    if (errors > 0)  toast.error(`${errors} usuário${errors > 1 ? 's' : ''} com erro ao importar.`);

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
