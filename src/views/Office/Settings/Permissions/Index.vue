<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { managedRegistry, getDeptManagedPages } from '@/config/navRegistry';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Dropdown from '@/components/UI/Dropdown.vue';
import Favorite from '@/components/config/Favorite.vue';
import DepartmentVisibilityPanel from './DepartmentVisibilityPanel.vue';

const route = useRoute();

// ── Tabs ────────────────────────────────────────────
const mainTabs = [
  { value: 'users',    label: 'Usuários', icon: 'fas fa-users' },
  { value: 'profiles', label: 'Perfis',   icon: 'fas fa-layer-group' },
  { value: 'departments', label: 'Departamentos', icon: 'fas fa-eye-slash' },
];
const mainTab = ref('users');

// ── State ───────────────────────────────────────────
const users = ref([]);
const userSearch = ref('');
const selectedUser = ref(null);
const localRoutes = ref([]);
const originalRoutes = ref([]);
const saving = ref(false);
const feedbackMsg = ref('');
const feedbackOk = ref(true);

const profiles = ref([]);
const showProfileModal = ref(false);
const editingProfile = ref(null);
const savingProfile = ref(false);
const profileForm = ref({ name: '', description: '', routes: [] });

const clipboard = ref(null);

const totalManaged = managedRegistry.reduce((acc, d) => acc + getDeptManagedPages(d).length, 0);

const filteredUsers = computed(() => {
  const q = (userSearch.value || '').toLowerCase();
  return users.value.filter(u =>
    u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
});

const dirty = computed(() => {
  const a = [...localRoutes.value].sort().join(',');
  const b = [...originalRoutes.value].sort().join(',');
  return a !== b;
});

const countGranted = computed(() => localRoutes.value.length);
const countGrantedInDept = (dept) =>
  getDeptManagedPages(dept).filter(p => localRoutes.value.includes(p.route)).length;
const allGrantedInDept = (dept) =>
  getDeptManagedPages(dept).every(p => localRoutes.value.includes(p.route));
const someGrantedInDept = (dept) =>
  getDeptManagedPages(dept).some(p => localRoutes.value.includes(p.route));

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

// ── User actions ────────────────────────────────────
function selectUser(user) {
  selectedUser.value = user;
  feedbackMsg.value = '';
  if (user.role === 'admin') {
    localRoutes.value = []; originalRoutes.value = []; return;
  }
  const saved = user.permission?.routes ?? [];
  localRoutes.value = [...saved];
  originalRoutes.value = [...saved];
}

function toggleRoute(routePath) {
  const idx = localRoutes.value.indexOf(routePath);
  if (idx === -1) localRoutes.value.push(routePath);
  else localRoutes.value.splice(idx, 1);
}

function toggleDept(dept, grant) {
  const routes = getDeptManagedPages(dept).map(p => p.route);
  if (grant) routes.forEach(r => { if (!localRoutes.value.includes(r)) localRoutes.value.push(r); });
  else localRoutes.value = localRoutes.value.filter(r => !routes.includes(r));
}

function grantAll() {
  localRoutes.value = managedRegistry.flatMap(d => getDeptManagedPages(d).map(p => p.route));
}
function revokeAll() { localRoutes.value = []; }

function copyUserPermissions(user) {
  clipboard.value = {
    fromUser: user.username,
    routes: [...(user.permission?.routes ?? [])],
  };
}
function pastePermissions() {
  if (!clipboard.value) return;
  localRoutes.value = [...clipboard.value.routes];
}

function applyProfile(profile) {
  localRoutes.value = [...profile.routes];
}

async function savePermissions() {
  if (!selectedUser.value || saving.value) return;
  saving.value = true; feedbackMsg.value = '';
  try {
    await requestWithAuth(`/permissions/${selectedUser.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({ routes: localRoutes.value }),
    });
    const u = users.value.find(u => u.id === selectedUser.value.id);
    if (u) {
      if (!u.permission) u.permission = {};
      u.permission.routes = [...localRoutes.value];
    }
    originalRoutes.value = [...localRoutes.value];
    feedbackOk.value = true;
    feedbackMsg.value = `Permissões de ${selectedUser.value.username} salvas!`;
  } catch (err) {
    feedbackOk.value = false;
    feedbackMsg.value = err.message || 'Erro ao salvar permissões.';
  } finally {
    saving.value = false;
    setTimeout(() => { feedbackMsg.value = ''; }, 4000);
  }
}

// ── Profile modal ───────────────────────────────────
function openProfileModal(profile) {
  editingProfile.value = profile;
  profileForm.value = {
    name: profile?.name ?? '',
    description: profile?.description ?? '',
    routes: profile ? [...profile.routes] : [],
  };
  showProfileModal.value = true;
}

function closeProfileModal() {
  showProfileModal.value = false;
  editingProfile.value = null;
}

function profileToggleRoute(routePath) {
  const idx = profileForm.value.routes.indexOf(routePath);
  if (idx === -1) profileForm.value.routes.push(routePath);
  else profileForm.value.routes.splice(idx, 1);
}

function profileToggleDept(dept, grant) {
  const routes = getDeptManagedPages(dept).map(p => p.route);
  if (grant) routes.forEach(r => { if (!profileForm.value.routes.includes(r)) profileForm.value.routes.push(r); });
  else profileForm.value.routes = profileForm.value.routes.filter(r => !routes.includes(r));
}

function profileGrantAll() {
  profileForm.value.routes = managedRegistry.flatMap(d => getDeptManagedPages(d).map(p => p.route));
}
function profileRevokeAll() { profileForm.value.routes = []; }

async function saveProfile() {
  if (!profileForm.value.name.trim()) return;
  savingProfile.value = true;
  try {
    const body = {
      name: profileForm.value.name.trim(),
      description: profileForm.value.description.trim() || null,
      routes: profileForm.value.routes,
    };
    if (editingProfile.value) {
      const updated = await requestWithAuth(`/permissions/profiles/${editingProfile.value.id}`, {
        method: 'PUT', body: JSON.stringify(body),
      });
      const idx = profiles.value.findIndex(p => p.id === editingProfile.value.id);
      if (idx !== -1) profiles.value[idx] = updated;
    } else {
      const created = await requestWithAuth('/permissions/profiles', {
        method: 'POST', body: JSON.stringify(body),
      });
      profiles.value.push(created);
    }
    closeProfileModal();
  } catch (err) {
    alert(err.message || 'Erro ao salvar perfil.');
  } finally {
    savingProfile.value = false;
  }
}

async function confirmDeleteProfile(profile) {
  if (!confirm(`Excluir o perfil "${profile.name}"?`)) return;
  try {
    await requestWithAuth(`/permissions/profiles/${profile.id}`, { method: 'DELETE' });
    profiles.value = profiles.value.filter(p => p.id !== profile.id);
  } catch (err) {
    alert(err.message || 'Erro ao excluir perfil.');
  }
}

// ── Load ────────────────────────────────────────────
async function loadUsers() {
  try {
    const data = await requestWithAuth('/permissions');
    users.value = Array.isArray(data) ? data : [];
    const preselect = route.query.userId ? parseInt(route.query.userId) : null;
    if (preselect) {
      const found = users.value.find(u => u.id === preselect);
      if (found) selectUser(found);
    }
  } catch (err) {
    console.error('[Permissions] loadUsers error:', err);
  }
}

async function loadProfiles() {
  try {
    const data = await requestWithAuth('/permissions/profiles');
    profiles.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[Permissions] loadProfiles error:', err);
  }
}

onMounted(() => { loadUsers(); loadProfiles(); });
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <PageHeader
        title="Gestão de alçadas"
        subtitle="Controle quais módulos cada usuário pode visualizar. Administradores têm acesso total por padrão."
        icon="fas fa-shield-halved">
        <template #title>
          <span>Gestão de alçadas</span>
          <Favorite :router="'/settings/permissions'" :section="'Alçadas'" />
        </template>
        <template #actions>
          <SegmentedControl v-model="mainTab" :options="mainTabs" size="sm" />
        </template>
      </PageHeader>

      <!-- ───── Aba Usuários ───── -->
      <div v-if="mainTab === 'users'" class="grid grid-cols-1 lg:grid-cols-4 gap-4">

        <!-- Sidebar -->
        <aside class="lg:col-span-1">
          <Surface variant="raised" padding="none" class="overflow-hidden lg:sticky lg:top-20">
            <div class="px-3 py-3 border-b border-line bg-surface-sunken/40 space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-ink">Usuários</span>
                <span class="text-xs text-ink-subtle font-mono">
                  {{ filteredUsers.length }}/{{ users.length }}
                </span>
              </div>
              <Input v-model="userSearch" size="sm" placeholder="Buscar..."
                iconLeft="fas fa-magnifying-glass" />
            </div>

            <ul class="overflow-y-auto max-h-[58vh] divide-y divide-line">
              <li v-for="user in filteredUsers" :key="user.id"
                @click="selectUser(user)"
                class="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors group"
                :class="selectedUser?.id === user.id
                  ? 'bg-accent-soft/60 border-l-2 border-l-accent'
                  : 'hover:bg-surface-sunken/40'">
                <div class="h-7 w-7 rounded-full grid place-items-center text-[10px] font-bold shrink-0"
                  :class="user.role === 'admin'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-accent-soft text-accent border border-accent/20'">
                  {{ initials(user.username) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium text-ink truncate">{{ user.username }}</p>
                  <p class="text-[11px] text-ink-subtle truncate font-mono">{{ user.email }}</p>
                </div>
                <IconButton v-if="user.role !== 'admin'"
                  icon="fas fa-copy" size="sm"
                  :label="`Copiar permissões de ${user.username}`"
                  class="opacity-0 group-hover:opacity-100"
                  @click.stop="copyUserPermissions(user)" />
              </li>
              <li v-if="!filteredUsers.length" class="px-4 py-6 text-center text-sm text-ink-subtle">
                Nenhum usuário encontrado
              </li>
            </ul>
          </Surface>
        </aside>

        <!-- Painel -->
        <main class="lg:col-span-3">
          <EmptyState v-if="!selectedUser"
            icon="fas fa-user-shield" size="lg"
            title="Selecione um usuário"
            description="Escolha um usuário na lista ao lado para gerenciar suas permissões." />

          <Surface v-else-if="selectedUser.role === 'admin'" variant="raised" padding="lg">
            <div class="text-center py-6">
              <div class="h-14 w-14 grid place-items-center rounded-2xl
                          bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mx-auto mb-3">
                <i class="fas fa-crown text-xl"></i>
              </div>
              <h3 class="text-base font-semibold text-ink mb-1">{{ selectedUser.username }}</h3>
              <p class="text-sm text-ink-muted">
                Administradores têm acesso total. Permissões não podem ser restritas.
              </p>
            </div>
          </Surface>

          <div v-else class="space-y-3">
            <!-- Cabeçalho do usuário -->
            <Surface variant="raised" padding="md">
              <div class="flex flex-wrap items-center gap-3">
                <div class="h-10 w-10 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center font-bold shrink-0">
                  {{ initials(selectedUser.username) }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-semibold text-ink truncate">{{ selectedUser.username }}</h3>
                  <p class="text-xs text-ink-muted truncate font-mono">{{ selectedUser.email }}</p>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  <Dropdown v-if="profiles.length" align="right">
                    <template #trigger>
                      <Button variant="secondary" size="sm" icon="fas fa-layer-group"
                        icon-right="fas fa-chevron-down">
                        Aplicar perfil
                      </Button>
                    </template>
                    <div class="w-56 bg-surface-overlay border border-line rounded-xl shadow-overlay overflow-hidden">
                      <button v-for="profile in profiles" :key="profile.id"
                        @click="applyProfile(profile)"
                        data-dropdown-item
                        class="w-full text-left px-3 py-2 text-sm text-ink hover:bg-accent-soft/40 transition-colors flex items-center justify-between gap-2">
                        <span class="truncate">{{ profile.name }}</span>
                        <span class="text-[10px] text-ink-subtle font-mono">{{ profile.routes.length }}</span>
                      </button>
                    </div>
                  </Dropdown>

                  <Button v-if="clipboard" variant="secondary" size="sm" icon="fas fa-paste"
                    @click="pastePermissions">
                    Colar de {{ clipboard.fromUser }}
                  </Button>

                  <span class="text-xs text-ink-subtle font-mono hidden sm:inline">
                    {{ countGranted }}/{{ totalManaged }}
                  </span>

                  <Button :loading="saving" :disabled="!dirty"
                    icon="fas fa-floppy-disk" size="sm" @click="savePermissions">
                    {{ saving ? 'Salvando...' : 'Salvar' }}
                  </Button>
                </div>
              </div>

              <transition name="fade">
                <div v-if="feedbackMsg"
                  class="mt-3 rounded-lg border px-3 py-2 text-xs font-medium flex items-center gap-2"
                  :class="feedbackOk
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'">
                  <i :class="feedbackOk ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                  {{ feedbackMsg }}
                </div>
              </transition>
            </Surface>

            <!-- Ações rápidas -->
            <div class="flex gap-3 px-1">
              <button @click="grantAll" class="text-xs text-accent hover:underline flex items-center gap-1">
                <i class="fas fa-check-double"></i> Liberar tudo
              </button>
              <span class="text-line">|</span>
              <button @click="revokeAll" class="text-xs text-red-500 hover:underline flex items-center gap-1">
                <i class="fas fa-ban"></i> Revogar tudo
              </button>
            </div>

            <!-- Grupos -->
            <Surface v-for="dept in managedRegistry" :key="dept.key" variant="raised" padding="none" class="overflow-hidden">
              <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface-sunken/40 border-b border-line">
                <div class="flex items-center gap-2 min-w-0">
                  <i :class="dept.icon" class="text-ink-subtle text-xs w-4 text-center"></i>
                  <span class="text-sm font-medium text-ink truncate">{{ dept.label }}</span>
                  <span class="text-xs text-ink-subtle font-mono">
                    {{ countGrantedInDept(dept) }}/{{ getDeptManagedPages(dept).length }}
                  </span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button @click="toggleDept(dept, true)" class="text-xs text-accent hover:underline">Todos</button>
                  <button @click="toggleDept(dept, false)" class="text-xs text-red-500 hover:underline">Nenhum</button>
                  <Switch :model-value="allGrantedInDept(dept)" size="sm"
                    @update:model-value="(v) => toggleDept(dept, v)" />
                </div>
              </div>

              <div class="divide-y divide-line">
                <div v-for="page in getDeptManagedPages(dept)" :key="page.route"
                  class="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-sunken/30 transition-colors">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <i :class="page.icon" class="text-ink-subtle text-xs w-3.5 text-center"></i>
                    <div class="min-w-0">
                      <p class="text-sm text-ink truncate">{{ page.name }}</p>
                      <p class="text-[11px] font-mono text-ink-subtle truncate">{{ page.route }}</p>
                    </div>
                  </div>
                  <Switch :model-value="localRoutes.includes(page.route)" size="sm"
                    @update:model-value="() => toggleRoute(page.route)" />
                </div>
              </div>
            </Surface>
          </div>
        </main>
      </div>

      <!-- ───── Aba Departamentos ───── -->
      <div v-else-if="mainTab === 'departments'" class="space-y-4">
        <DepartmentVisibilityPanel />
      </div>

      <!-- ───── Aba Perfis ───── -->
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <p class="text-sm text-ink-muted">
            <span class="font-mono text-ink">{{ profiles.length }}</span>
            perfil{{ profiles.length !== 1 ? 'is' : '' }}
            cadastrado{{ profiles.length !== 1 ? 's' : '' }}
          </p>
          <Button icon="fas fa-plus" @click="openProfileModal(null)">Novo perfil</Button>
        </div>

        <EmptyState v-if="!profiles.length"
          icon="fas fa-layer-group" title="Nenhum perfil cadastrado"
          description="Crie um perfil para reutilizar conjuntos de permissões." />

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <Surface v-for="profile in profiles" :key="profile.id" variant="raised" padding="none" class="overflow-hidden">
            <div class="px-4 py-3.5 border-b border-line">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-ink truncate">{{ profile.name }}</h3>
                  <p class="text-xs text-ink-muted mt-0.5 line-clamp-2">{{ profile.description || 'Sem descrição' }}</p>
                </div>
                <Badge variant="accent" size="sm">{{ profile.routes.length }} rotas</Badge>
              </div>
            </div>

            <div class="px-4 py-3 space-y-1">
              <div v-for="r in profile.routes.slice(0, 4)" :key="r"
                class="text-[11px] font-mono text-ink-subtle truncate">
                <i class="fas fa-route mr-1 text-[9px]"></i>{{ r }}
              </div>
              <p v-if="profile.routes.length > 4" class="text-xs text-ink-subtle italic">
                + {{ profile.routes.length - 4 }} mais...
              </p>
            </div>

            <div class="px-4 py-3 border-t border-line flex items-center gap-2">
              <Button size="sm" variant="secondary" icon="fas fa-pen" block @click="openProfileModal(profile)">
                Editar
              </Button>
              <Button size="sm" variant="ghost" icon="fas fa-trash" class="text-red-500"
                @click="confirmDeleteProfile(profile)">
                Excluir
              </Button>
            </div>
          </Surface>
        </div>
      </div>
    </PageContainer>

    <!-- Modal Perfil -->
    <Modal :open="showProfileModal" size="lg" @close="closeProfileModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-layer-group text-sm"></i>
          </div>
          <div>
            <h2 class="text-base font-semibold text-ink">
              {{ editingProfile ? 'Editar perfil' : 'Novo perfil de alçada' }}
            </h2>
            <p class="text-xs text-ink-muted mt-0.5">
              <span class="font-mono">{{ profileForm.routes.length }}</span> rotas selecionadas
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid sm:grid-cols-2 gap-3">
          <Input v-model="profileForm.name" label="Nome do perfil" placeholder="Ex: Vendas - Padrão" required />
          <Input v-model="profileForm.description" label="Descrição" placeholder="Breve descrição do perfil" />
        </div>

        <div class="flex gap-3">
          <button @click="profileGrantAll" class="text-xs text-accent hover:underline flex items-center gap-1">
            <i class="fas fa-check-double"></i> Liberar tudo
          </button>
          <span class="text-line">|</span>
          <button @click="profileRevokeAll" class="text-xs text-red-500 hover:underline flex items-center gap-1">
            <i class="fas fa-ban"></i> Limpar tudo
          </button>
        </div>

        <div v-for="dept in managedRegistry" :key="dept.key"
          class="border border-line rounded-lg overflow-hidden bg-surface-raised">
          <div class="flex items-center justify-between gap-3 px-3 py-2 bg-surface-sunken/40">
            <div class="flex items-center gap-2 min-w-0">
              <i :class="dept.icon" class="text-ink-subtle text-xs w-4 text-center"></i>
              <span class="text-xs font-medium text-ink truncate">{{ dept.label }}</span>
              <span class="text-[10px] text-ink-subtle font-mono">
                {{ getDeptManagedPages(dept).filter(p => profileForm.routes.includes(p.route)).length }}/{{ getDeptManagedPages(dept).length }}
              </span>
            </div>
            <Switch
              :model-value="getDeptManagedPages(dept).every(p => profileForm.routes.includes(p.route))"
              size="sm"
              @update:model-value="(v) => profileToggleDept(dept, v)" />
          </div>
          <div class="divide-y divide-line">
            <div v-for="page in getDeptManagedPages(dept)" :key="page.route"
              class="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-sunken/30 transition-colors">
              <div class="flex items-center gap-2 min-w-0">
                <i :class="page.icon" class="text-ink-subtle text-xs w-3.5 text-center"></i>
                <span class="text-xs text-ink truncate">{{ page.name }}</span>
                <span class="text-[10px] font-mono text-ink-subtle truncate">{{ page.route }}</span>
              </div>
              <Switch :model-value="profileForm.routes.includes(page.route)" size="sm"
                @update:model-value="() => profileToggleRoute(page.route)" />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="closeProfileModal">Cancelar</Button>
        <Button :loading="savingProfile" :disabled="!profileForm.name.trim()"
          icon="fas fa-floppy-disk" @click="saveProfile">
          {{ savingProfile ? 'Salvando...' : 'Salvar perfil' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
