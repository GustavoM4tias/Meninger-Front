<script setup>
import { ref, computed, onMounted } from 'vue';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { useToast } from 'vue-toastification';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
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
const route = useRoute();
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
const filterStatus = ref('active'); // '' (todos) | 'active' | 'inactive'
const editableUser = ref(null);
const showUserModal = ref(false);
const togglingOrgId = ref(null);

// Fonte autoritativa: permissoes confirmadas pelo servidor
// (/permissions/me), nao o authStore. Aqui nao cabe capacidade: tela admin por codigo.
const perm = usePermissionStore();
const isAdmin = computed(() => perm.isAdmin);
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
  { value: '',         label: 'Todos' },
  { value: 'active',   label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'pending',  label: 'Aguardando aprovação' },
];

// 'pending' = concluiu o formulário de primeiro acesso (fila de aprovação);
// 'incomplete' = criado pelo login Microsoft mas ainda NÃO enviou o formulário
// (não entra na fila nem no banner).
const isPendingUser = (u) => u.approval_status === 'pending';
const isIncompleteUser = (u) => u.approval_status === 'incomplete';
const pendingCount = computed(() => users.value.filter(isPendingUser).length);

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
    const matchesStatus = filterStatus.value === ''
      || (filterStatus.value === 'pending'
        ? isPendingUser(u)
        : (filterStatus.value === 'active' ? Boolean(u.status) : !u.status));
    // Pendentes de aprovação sempre aparecem no filtro padrão "Ativo":
    // são justamente os que o admin precisa ver para liberar.
    const visible = matchesStatus || (filterStatus.value === 'active' && isPendingUser(u));
    return matchesSearch && matchesCity && matchesPosition && visible;
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
  // Deep-link vindo da notificação/e-mail de cadastro pendente:
  // /settings/users?user=<id> abre o modal do usuário direto.
  const qid = Number(route.query.user);
  if (qid) {
    const found = users.value.find(u => u.id === qid);
    if (found) startEditing(found);
  }
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
          <PageHelp
            storage-key="usuarios"
            title="Como administrar usuários"
            intro="Quem tem acesso ao Office e como cada um entra. O que a pessoa VÊ não se decide aqui, e sim nas Alçadas — aqui é o cadastro."
            :steps="[
              { title: 'Encontre a pessoa', text: 'Busque por nome, e-mail, cidade ou cargo.' },
              { title: 'Crie ou edite', text: 'Departamento e cargo são o que outras telas usam para classificar e para montar alçada padrão.' },
              { title: 'Cuide do primeiro acesso', text: 'Conta Microsoft nova nasce pendente: alguém precisa aprovar e ativar para ela entrar.' },
            ]"
            :tips="[
              'Tipo de usuário é o provedor de autenticação, não o domínio do e-mail: gente de fora pode ter e-mail da casa.',
              'Desativar preserva o histórico da pessoa; excluir é o que deixa registro órfão.',
            ]" />
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
          class="border-data-warn/30 bg-data-warn/5">
          <div class="flex items-start gap-3">
            <div class="h-9 w-9 rounded-lg bg-data-warn/10 text-data-warn grid place-items-center shrink-0">
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

        <!-- Cadastros aguardando aprovação -->
        <Surface v-if="pendingCount" variant="raised" padding="md"
          class="mb-4 border-data-warn/30 bg-data-warn/5">
          <div class="flex items-center gap-3 flex-wrap">
            <div class="h-9 w-9 rounded-lg bg-data-warn/10 text-data-warn grid place-items-center shrink-0">
              <i class="fas fa-user-clock"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-ink">
                {{ pendingCount }} cadastro{{ pendingCount > 1 ? 's' : '' }} aguardando aprovação
              </p>
              <p class="text-xs text-ink-muted mt-0.5">
                Abra o usuário e clique em "Aprovar e ativar" para liberar o acesso.
              </p>
            </div>
            <Button size="sm" variant="outline" icon="fas fa-filter"
              @click="filterStatus = 'pending'">
              Ver pendentes
            </Button>
          </div>
        </Surface>

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
                :class="isPendingUser(user) ? 'bg-data-warn' : (user.status ? 'bg-data-pos' : 'bg-data-neg')"></span>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-ink truncate">{{ user.username }}</p>
                <Badge v-if="isPendingUser(user)" variant="warning" size="sm">
                  Aguardando aprovação
                </Badge>
                <Badge v-else-if="isIncompleteUser(user)" variant="neutral" size="sm">
                  Cadastro não concluído
                </Badge>
                <Badge v-else :variant="user.status ? 'success' : 'danger'" size="sm">
                  {{ user.status ? 'Ativo' : 'Inativo' }}
                </Badge>
              </div>
              <p class="text-xs text-ink-muted truncate">{{ user.email }}</p>
              <p v-if="user.city || user.position" class="text-micro text-ink-subtle font-mono truncate">
                <span v-if="user.position">{{ user.position }}</span>
                <span v-if="user.city && user.position" class="mx-1">·</span>
                <span v-if="user.city">{{ user.city }}</span>
              </p>
            </div>

            <!-- Status icons -->
            <div class="hidden sm:flex items-center gap-2 shrink-0 text-sm">
              <i class="fas fa-users-viewfinder transition-colors"
                :class="user.face_enabled ? 'text-data-pos' : 'text-ink-subtle/50'"
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
