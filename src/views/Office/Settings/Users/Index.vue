<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { useToast } from 'vue-toastification';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Surface from '@/components/UI/Surface.vue';
import Favorite from '@/components/config/Favorite.vue';

import userModal from '@/views/Office/Settings/Users/components/userModal.vue';
import MicrosoftImportPanel from '@/views/Office/Settings/Users/components/MicrosoftImportPanel.vue';

const router = useRouter();
const userStore = useAuthStore();
const microsoftStore = useMicrosoftStore();
const carregamento = useCarregamentoStore();
const toast = useToast();

// ─── State ───────────────────────────────────────────
const activeTab = ref('office');
const users = ref([]);
const searchQuery = ref('');
const searchField = ref('username');
const filterCity = ref('');
const filterPosition = ref('');
const filterStatus = ref(true);
const editableUser = ref(null);
const showUserModal = ref(false);
const togglingOrgId = ref(null);

const isAdmin = computed(() => userStore.user?.role === 'admin');
const isMicrosoftConnected = computed(() => microsoftStore.connected);

// ─── Tabs ────────────────────────────────────────────
const tabs = computed(() => [
  { value: 'office',    label: 'Office',    icon: 'fas fa-users' },
  { value: 'microsoft', label: 'Microsoft', icon: 'fab fa-microsoft' },
]);

// ─── Filters ─────────────────────────────────────────
const fieldOptions = [
  { value: 'username', label: 'Nome' },
  { value: 'email',    label: 'E-mail' },
];

const statusOptions = [
  { value: '',    label: 'Todos' },
  { value: true,  label: 'Ativos' },
  { value: false, label: 'Inativos' },
];

const cityOptions = computed(() => [
  { value: '', label: 'Todas' },
  ...[...new Set(users.value.map(u => u.city).filter(Boolean))].map(c => ({ value: c, label: c })),
]);

const positionOptions = computed(() => [
  { value: '', label: 'Todos' },
  ...[...new Set(users.value.map(u => u.position).filter(Boolean))].map(p => ({ value: p, label: p })),
]);

const filteredUsers = computed(() => {
  const q = (searchQuery.value || '').toLowerCase();
  const field = searchField.value;
  return users.value.filter(u => {
    const matchesSearch = String(u?.[field] ?? '').toLowerCase().includes(q);
    const matchesCity = !filterCity.value || u.city === filterCity.value;
    const matchesPosition = !filterPosition.value || u.position === filterPosition.value;
    const matchesStatus = filterStatus.value === '' || u.status === filterStatus.value;
    return matchesSearch && matchesCity && matchesPosition && matchesStatus;
  });
});

// ─── Actions ─────────────────────────────────────────
async function fetchUsers() {
  try {
    carregamento.iniciarCarregamento();
    const fetched = await userStore.getAllUsers();
    users.value = Array.isArray(fetched.data) ? fetched.data : fetched;
  } catch (e) {
    console.error('Erro ao carregar usuários:', e);
  } finally {
    carregamento.finalizarCarregamento();
  }
}

function startEditing(user) { editableUser.value = { ...user }; showUserModal.value = true; }
function startCreating() { editableUser.value = null; showUserModal.value = true; }
function closeModal() { editableUser.value = null; showUserModal.value = false; }
function clearFilters() {
  searchQuery.value = ''; filterCity.value = ''; filterPosition.value = ''; filterStatus.value = '';
}

function goToPermissions(user) {
  router.push({ path: '/settings/permissions', query: { userId: user.id } });
}

async function toggleOrganogram(user) {
  if (togglingOrgId.value) return;
  togglingOrgId.value = user.id;
  try {
    await userStore.updateUser({ ...user, show_in_organogram: !user.show_in_organogram });
    await fetchUsers();
  } catch {
    toast.error('Erro ao atualizar visibilidade no organograma.');
  } finally {
    togglingOrgId.value = null;
  }
}

function avatarUrl(user) {
  const initials = (user?.username ?? '').split(' ').slice(0, 2)
    .map(n => n[0]?.toUpperCase()).join(' ');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&size=80`;
}

onMounted(async () => {
  await Promise.all([fetchUsers(), microsoftStore.fetchStatus()]);
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <!-- Header -->
      <PageHeader
        title="Painel de usuários"
        subtitle="Gerencie e administre todos os usuários do sistema"
        icon="fas fa-users-gear">
        <template #title>
          <span>Painel de usuários</span>
          <Favorite :router="'/settings/users'" :section="'Usuários'" />
        </template>
        <template #actions>
          <SegmentedControl v-if="isAdmin"
            v-model="activeTab" :options="tabs" size="sm" />
          <Button v-if="activeTab === 'office'"
            icon="fas fa-user-plus" @click="startCreating">
            <span class="hidden sm:inline">Novo usuário</span>
          </Button>
        </template>
      </PageHeader>

      <!-- ───── Aba Microsoft ───── -->
      <template v-if="activeTab === 'microsoft'">
        <Surface v-if="!isMicrosoftConnected" variant="raised" padding="md"
          class="border-amber-500/30 bg-amber-500/5">
          <div class="flex items-start gap-3">
            <div class="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
              <i class="fas fa-triangle-exclamation"></i>
            </div>
            <div>
              <p class="text-sm font-semibold text-ink">Conta Microsoft não conectada</p>
              <p class="text-xs text-ink-muted mt-0.5">
                Vincule sua conta Microsoft em <strong class="text-ink">Minha Conta → Microsoft</strong>
                para acessar os usuários da organização.
              </p>
            </div>
          </div>
        </Surface>
        <MicrosoftImportPanel v-else @reload="fetchUsers" />
      </template>

      <!-- ───── Aba Office ───── -->
      <template v-if="activeTab === 'office'">

        <!-- Filtros -->
        <Surface variant="raised" padding="md" class="mb-4">
          <div class="space-y-3">
            <Input v-model="searchQuery" placeholder="Buscar usuário..."
              iconLeft="fas fa-magnifying-glass" />

            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Select v-model="searchField" :options="fieldOptions" label="Buscar por" />
              <Select v-model="filterCity" :options="cityOptions" label="Cidade" />
              <Select v-model="filterPosition" :options="positionOptions" label="Cargo" />
              <Select v-model="filterStatus" :options="statusOptions" label="Status" />
              <div class="flex items-end">
                <Button variant="ghost" icon="fas fa-eraser" block @click="clearFilters">
                  Limpar
                </Button>
              </div>
            </div>

            <p class="text-xs text-ink-subtle">
              <span class="font-mono text-ink">{{ filteredUsers.length }}</span>
              de <span class="font-mono">{{ users.length }}</span> usuário(s)
            </p>
          </div>
        </Surface>

        <!-- Lista -->
        <EmptyState v-if="!filteredUsers.length" size="md"
          icon="fas fa-users" title="Nenhum usuário encontrado"
          description="Tente ajustar os filtros de pesquisa." />

        <div v-else class="space-y-2">
          <article v-for="user in filteredUsers" :key="user.id"
            class="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3
                   rounded-xl bg-surface-raised border border-line shadow-soft surface-gradient
                   hover:border-accent/30 hover:shadow-elevated transition-all duration-200 ease-out-expo">

            <!-- Avatar -->
            <div class="relative shrink-0">
              <img :src="avatarUrl(user)" alt="avatar"
                class="w-10 h-10 rounded-lg object-cover ring-1 ring-line" />
              <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface-raised"
                :class="user.status ? 'bg-emerald-500' : 'bg-red-400'"></span>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-ink truncate">{{ user.username }}</p>
                <Badge :variant="user.status ? 'success' : 'danger'" size="sm">
                  {{ user.status ? 'Ativo' : 'Inativo' }}
                </Badge>
              </div>
              <p class="text-xs text-ink-muted truncate">{{ user.email }}</p>
              <p v-if="user.city || user.position" class="text-[11px] text-ink-subtle font-mono truncate">
                <span v-if="user.position">{{ user.position }}</span>
                <span v-if="user.city && user.position" class="mx-1">·</span>
                <span v-if="user.city">{{ user.city }}</span>
              </p>
            </div>

            <!-- Status icons -->
            <div class="hidden sm:flex items-center gap-2 shrink-0 text-sm">
              <i class="fas fa-users-viewfinder transition-colors"
                :class="user.face_enabled ? 'text-emerald-500' : 'text-ink-subtle/50'"
                v-tippy="user.face_enabled ? 'Reconhecimento facial ativo' : 'Reconhecimento facial inativo'"></i>

              <img src="/sienge.png" alt="Sienge" width="14" height="14"
                v-tippy="user.sienge_email ? 'Credenciais Sienge configuradas' : 'Sem credenciais Sienge'"
                :class="user.sienge_email ? 'opacity-100' : 'opacity-25'"
                class="object-contain transition-opacity" />

              <svg width="14" height="14" viewBox="0 0 21 21"
                v-tippy="user.microsoft_id ? 'Conta Microsoft conectada' : 'Sem conta Microsoft'"
                :class="user.microsoft_id ? 'opacity-100' : 'opacity-25'"
                class="transition-opacity">
                <rect x="0"  y="0"  width="10" height="10" fill="#F25022"/>
                <rect x="11" y="0"  width="10" height="10" fill="#7FBA00"/>
                <rect x="0"  y="11" width="10" height="10" fill="#00A4EF"/>
                <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
              </svg>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <IconButton v-if="isAdmin"
                icon="fas fa-sitemap" size="sm"
                :label="user.show_in_organogram ? 'Visível no organograma' : 'Oculto no organograma'"
                :active="user.show_in_organogram"
                :disabled="togglingOrgId === user.id"
                @click="toggleOrganogram(user)" />

              <IconButton v-if="isAdmin && user.role !== 'admin'"
                icon="fas fa-shield-halved" size="sm" label="Configurar alçadas"
                @click="goToPermissions(user)" />

              <IconButton icon="fas fa-pen" size="sm" label="Editar"
                @click="startEditing(user)" />
            </div>
          </article>
        </div>
      </template>
    </PageContainer>

    <userModal v-if="showUserModal" :user="editableUser" @close="closeModal" @reload="fetchUsers" />
  </div>
</template>
