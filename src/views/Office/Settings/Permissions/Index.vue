<script setup>
// Gestão de Alçadas — modelo "perfil vivo + exceções + empreendimentos" (2026-07-28)
//
//   - O usuário APONTA para um perfil: editar o perfil propaga na hora para
//     todos os vinculados (perfil vivo).
//   - Exceções por usuário: rotas extras (além do perfil) e rotas negadas
//     (removidas do perfil). Efetivas = (perfil ∪ extras) − negadas.
//   - Dados: liberação por EMPREENDIMENTO (GrantsModal), por usuário e por
//     perfil, com atalhos por empresa e por cidade.
//   - Somente admin: o admin trava qualquer tela delegável aqui mesmo
//     (route_policies). A tela sai das alçadas efetivas de todo não-admin na
//     hora — menu, guard de rota, API e tools da Eme fecham juntos, sem deploy.

import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { managedRegistry, getDeptManagedPages, getAdminOnlyPages, getAlwaysFreePages } from '@/config/navRegistry';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Dropdown from '@/components/UI/Dropdown.vue';
import Favorite from '@/components/config/Favorite.vue';
import DepartmentVisibilityPanel from './DepartmentVisibilityPanel.vue';
import GrantsModal from './GrantsModal.vue';

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
const saving = ref(false);
const feedbackMsg = ref('');
const feedbackOk = ref(true);

// Estado local do usuário selecionado (perfil vivo + exceções)
const localProfileId = ref('');
const localExtra = ref([]);
const localRemoved = ref([]);
const original = ref({ profileId: '', extra: [], removed: [] });

const profiles = ref([]);
const showProfileModal = ref(false);
const editingProfile = ref(null);
const savingProfile = ref(false);
const profileForm = ref({ name: '', description: '', routes: [], department_id: '' });

const departments = ref([]);
const departmentOptions = computed(() => [
  { value: '', label: 'Nenhum (perfil avulso)' },
  ...departments.value.map(d => ({ value: String(d.id), label: d.name })),
]);
const departmentName = (id) =>
  departments.value.find(d => Number(d.id) === Number(id))?.name || null;

const profileOptions = computed(() => [
  { value: '', label: 'Sem perfil' },
  ...profiles.value.map(p => ({ value: String(p.id), label: p.name })),
]);
const profileById = (id) => profiles.value.find(p => Number(p.id) === Number(id)) || null;

// Grants (empreendimentos)
const grantsModal = ref({ open: false, type: 'user', id: null, name: '' });
function openGrants(type, id, name) {
  grantsModal.value = { open: true, type, id, name };
}

const clipboard = ref(null);

// Visibilidade TOTAL: telas não-delegáveis também aparecem (informativas).
const adminOnlyPages = getAdminOnlyPages();
const alwaysFreePages = getAlwaysFreePages();

// ── Telas travadas como "somente admin" pela própria tela ────────────────────
// route_policies no backend: travar remove a rota das alçadas efetivas de todo
// não-admin (menu, guard, API e tools da Eme fecham juntos). Reversível aqui.
const routePolicies = ref([]);
const lockBusy = ref('');
const lockModal = ref({ open: false, page: null, lock: true, note: '' });

const normRoute = (r) => String(r || '').toLowerCase().replace(/\/+$/, '');

const lockedRoutes = computed(() =>
  new Set(routePolicies.value.filter(p => p.adminOnly).map(p => normRoute(p.route))));
const isLocked = (route) => lockedRoutes.value.has(normRoute(route));
const policyFor = (route) =>
  routePolicies.value.find(p => normRoute(p.route) === normRoute(route)) || null;

// Telas realmente delegáveis de uma categoria (as travadas saem das contas e
// das ações em massa — ligar o switch delas não daria acesso nenhum).
const delegablePages = (dept) => getDeptManagedPages(dept).filter(p => !isLocked(p.route));

const totalManaged = computed(() =>
  managedRegistry.reduce((acc, d) => acc + delegablePages(d).length, 0));

// Travadas pela tela, agrupadas para o bloco informativo.
const lockedPages = computed(() => {
  const out = [];
  for (const cat of managedRegistry) {
    for (const p of getDeptManagedPages(cat)) {
      if (isLocked(p.route)) out.push({ ...p, catLabel: cat.label, policy: policyFor(p.route) });
    }
  }
  return out;
});

// Política apontando para rota que não existe mais no menu (tela renomeada):
// fica visível para poder destravar, senão viraria trava fantasma.
const orphanPolicies = computed(() => {
  const known = new Set(managedRegistry.flatMap(d => getDeptManagedPages(d).map(p => normRoute(p.route))));
  return routePolicies.value.filter(p => p.adminOnly && !known.has(normRoute(p.route)));
});

// Travar tira a tela de todo mundo de uma vez: pede confirmação e um motivo
// opcional (fica registrado no validador de integridade).
function askLock(page) {
  lockModal.value = { open: true, page, lock: true, note: '' };
}

async function confirmLock() {
  const { page, note } = lockModal.value;
  if (!page) return;
  lockBusy.value = page.route;
  try {
    await requestWithAuth('/permissions/route-policies', {
      method: 'PUT',
      body: JSON.stringify({ route: page.route, adminOnly: true, note: note?.trim() || null }),
    });
    await loadRoutePolicies();
    feedbackOk.value = true;
    feedbackMsg.value = `"${page.name}" agora é exclusiva de administradores.`;
  } catch (err) {
    feedbackOk.value = false;
    feedbackMsg.value = err.message || 'Erro ao alterar a política da tela.';
  } finally {
    lockBusy.value = '';
    lockModal.value = { open: false, page: null, lock: true, note: '' };
    setTimeout(() => { feedbackMsg.value = ''; }, 5000);
  }
}

// Destravar é reversível e sem risco de acesso indevido (a tela volta a
// depender do perfil de cada um) — vai direto, sem confirmação.
async function unlockRoute(route) {
  lockBusy.value = route;
  try {
    await requestWithAuth('/permissions/route-policies', {
      method: 'PUT', body: JSON.stringify({ route, adminOnly: false }),
    });
    await loadRoutePolicies();
  } catch (err) {
    // Pode ser acionado fora do painel de um usuário (bloco de panorama), onde
    // não há área de feedback — alerta direto, igual às outras ações globais.
    alert(err.message || 'Erro ao destravar a tela.');
  } finally {
    lockBusy.value = '';
  }
}

const filteredUsers = computed(() => {
  const q = (userSearch.value || '').toLowerCase();
  return users.value.filter(u =>
    u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
});

// ── Semântica perfil vivo + exceções ─────────────────
const profileRoutes = computed(() => {
  const p = profileById(localProfileId.value);
  return new Set(p && p.active !== false ? (p.routes || []) : []);
});
const extraSet = computed(() => new Set(localExtra.value));
const removedSet = computed(() => new Set(localRemoved.value));

function routeState(r) {
  const inProfile = profileRoutes.value.has(r);
  const inExtra = extraSet.value.has(r);
  const inRemoved = removedSet.value.has(r);
  const effective = (inProfile || inExtra) && !inRemoved;
  return { inProfile, inExtra, inRemoved, effective };
}

function setRoute(r, grant) {
  const st = routeState(r);
  if (grant) {
    if (st.inRemoved) localRemoved.value = localRemoved.value.filter(x => x !== r);
    if (!profileRoutes.value.has(r) && !extraSet.value.has(r)) localExtra.value = [...localExtra.value, r];
  } else {
    if (st.inExtra) localExtra.value = localExtra.value.filter(x => x !== r);
    if (profileRoutes.value.has(r) && !removedSet.value.has(r)) localRemoved.value = [...localRemoved.value, r];
  }
}

const effectiveRoutes = computed(() =>
  managedRegistry.flatMap(d => delegablePages(d).map(p => p.route))
    .filter(r => routeState(r).effective)
);

const dirty = computed(() => {
  const norm = (arr) => [...arr].sort().join(',');
  return String(localProfileId.value || '') !== String(original.value.profileId || '')
    || norm(localExtra.value) !== norm(original.value.extra)
    || norm(localRemoved.value) !== norm(original.value.removed);
});

const countGranted = computed(() => effectiveRoutes.value.length);
const countGrantedInDept = (dept) =>
  delegablePages(dept).filter(p => routeState(p.route).effective).length;
const allGrantedInDept = (dept) => {
  const pages = delegablePages(dept);
  return pages.length > 0 && pages.every(p => routeState(p.route).effective);
};

const exceptionsCount = computed(() => localExtra.value.length + localRemoved.value.length);

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

// ── User actions ────────────────────────────────────
function selectUser(user) {
  selectedUser.value = user;
  feedbackMsg.value = '';
  if (user.role === 'admin') {
    localProfileId.value = ''; localExtra.value = []; localRemoved.value = [];
    original.value = { profileId: '', extra: [], removed: [] };
    return;
  }
  const pid = user.permission_profile_id ? String(user.permission_profile_id) : '';
  const extra = [...(user.permission?.routes_extra ?? [])];
  const removed = [...(user.permission?.routes_removed ?? [])];
  localProfileId.value = pid;
  localExtra.value = extra;
  localRemoved.value = removed;
  original.value = { profileId: pid, extra: [...extra], removed: [...removed] };
}

function toggleDept(dept, grant) {
  for (const p of delegablePages(dept)) setRoute(p.route, grant);
}
function grantAll() {
  for (const d of managedRegistry) toggleDept(d, true);
}
function revokeAll() {
  for (const d of managedRegistry) toggleDept(d, false);
}
function clearExceptions() {
  localExtra.value = [];
  localRemoved.value = [];
}

function applyProfile(profile) {
  localProfileId.value = String(profile.id);
}

function copyUserPermissions(user) {
  clipboard.value = {
    fromUser: user.username,
    profileId: user.permission_profile_id ? String(user.permission_profile_id) : '',
    extra: [...(user.permission?.routes_extra ?? [])],
    removed: [...(user.permission?.routes_removed ?? [])],
  };
}
function pastePermissions() {
  if (!clipboard.value) return;
  localProfileId.value = clipboard.value.profileId;
  localExtra.value = [...clipboard.value.extra];
  localRemoved.value = [...clipboard.value.removed];
}

async function savePermissions() {
  if (!selectedUser.value || saving.value) return;
  saving.value = true; feedbackMsg.value = '';
  try {
    await requestWithAuth(`/permissions/${selectedUser.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        profileId: localProfileId.value ? Number(localProfileId.value) : null,
        routesExtra: localExtra.value,
        routesRemoved: localRemoved.value,
      }),
    });
    const u = users.value.find(u => u.id === selectedUser.value.id);
    if (u) {
      u.permission_profile_id = localProfileId.value ? Number(localProfileId.value) : null;
      if (!u.permission) u.permission = {};
      u.permission.routes_extra = [...localExtra.value];
      u.permission.routes_removed = [...localRemoved.value];
    }
    original.value = {
      profileId: localProfileId.value,
      extra: [...localExtra.value],
      removed: [...localRemoved.value],
    };
    feedbackOk.value = true;
    feedbackMsg.value = `Alçadas de ${selectedUser.value.username} salvas!`;
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
    department_id: profile?.department_id ? String(profile.department_id) : '',
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
  const routes = delegablePages(dept).map(p => p.route);
  if (grant) routes.forEach(r => { if (!profileForm.value.routes.includes(r)) profileForm.value.routes.push(r); });
  else profileForm.value.routes = profileForm.value.routes.filter(r => !routes.includes(r));
}

function profileGrantAll() {
  profileForm.value.routes = managedRegistry.flatMap(d => delegablePages(d).map(p => p.route));
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
      department_id: profileForm.value.department_id ? Number(profileForm.value.department_id) : null,
    };
    if (editingProfile.value) {
      await requestWithAuth(`/permissions/profiles/${editingProfile.value.id}`, {
        method: 'PUT', body: JSON.stringify(body),
      });
    } else {
      await requestWithAuth('/permissions/profiles', {
        method: 'POST', body: JSON.stringify(body),
      });
    }
    await loadProfiles();
    closeProfileModal();
  } catch (err) {
    alert(err.message || 'Erro ao salvar perfil.');
  } finally {
    savingProfile.value = false;
  }
}

// Volta o perfil para o conjunto padrão do departamento (e devolve o perfil ao
// seed, que passa a mantê-lo em dia quando o sistema ganhar telas novas).
async function resetProfileDefault(profile) {
  if (!confirm(`Restaurar as telas padrão do departamento no perfil "${profile.name}"? As telas escolhidas à mão são substituídas.`)) return;
  try {
    await requestWithAuth(`/permissions/profiles/${profile.id}/reset-default`, { method: 'POST' });
    await loadProfiles();
  } catch (err) {
    alert(err.message || 'Erro ao restaurar o padrão.');
  }
}

async function confirmDeleteProfile(profile) {
  if (!confirm(`Excluir o perfil "${profile.name}"? Usuários vinculados perdem as rotas do perfil (mantêm exceções).`)) return;
  try {
    await requestWithAuth(`/permissions/profiles/${profile.id}`, { method: 'DELETE' });
    profiles.value = profiles.value.filter(p => p.id !== profile.id);
  } catch (err) {
    alert(err.message || 'Erro ao excluir perfil.');
  }
}

// Quantos usuários usam cada perfil (perfil vivo)
const usersByProfile = computed(() => {
  const m = new Map();
  for (const u of users.value) {
    if (!u.permission_profile_id) continue;
    m.set(u.permission_profile_id, (m.get(u.permission_profile_id) || 0) + 1);
  }
  return m;
});

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

async function loadRoutePolicies() {
  try {
    const data = await requestWithAuth('/permissions/route-policies');
    routePolicies.value = Array.isArray(data?.policies) ? data.policies : [];
  } catch (err) {
    console.error('[Permissions] loadRoutePolicies error:', err);
  }
}

async function loadDepartments() {
  try {
    const data = await requestWithAuth('/admin/departments');
    const list = Array.isArray(data) ? data : (data?.data || []);
    departments.value = list.filter(d => d.active !== false);
  } catch (err) {
    console.error('[Permissions] loadDepartments error:', err);
  }
}

onMounted(() => { loadUsers(); loadProfiles(); loadDepartments(); loadRoutePolicies(); });
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <PageHeader
        title="Gestão de alçadas"
        subtitle="Perfil vivo + exceções por usuário e liberação de dados por empreendimento. Administradores têm acesso total por padrão."
        icon="fas fa-shield-halved">
        <template #title>
          <span>Gestão de alçadas</span>
          <Favorite :router="'/settings/permissions'" :section="'Alçadas'" />
        </template>
        <template #actions>
          <PageHelp
            title="Como usar a Gestão de alçadas"
            :steps="[
              { title: 'Escolha o usuário', text: 'Na aba Usuários, selecione a pessoa na lista.' },
              { title: 'Aplique um perfil', text: 'O perfil é VIVO: editar o perfil depois muda o acesso de todos os vinculados na hora.' },
              { title: 'Ajuste exceções', text: 'Ligue/desligue telas individualmente. Tela do perfil desligada vira NEGADA; tela fora do perfil ligada vira EXTRA.' },
              { title: 'Libere empreendimentos', text: 'Em Empreendimentos liberados, marque o que a pessoa pode ver - com atalhos por empresa e por cidade. Sem liberação, o usuário não vê dado nenhum.' },
              { title: 'Salvar', text: 'Nada vale até clicar em Salvar.' },
              { title: 'Tornar uma tela exclusiva de admin', text: 'Na lista de telas (aba Usuários, com alguém selecionado), clique no cadeado ao lado da tela. O servidor passa a negar os dados para todo não-admin na hora e o item some do menu de cada um na próxima carga da página. Para devolver a tela às alçadas, clique no cadeado de novo ou use o bloco Travadas como somente admin no fim da página.' },
            ]"
            :tips="[
              'Clonar acesso: use o ícone de copiar na lista e depois Colar - ou simplesmente aplique o mesmo perfil.',
              'Liberações no PERFIL propagam para todos os usuários daquele perfil.',
              'A alçada vale de verdade no servidor: sem a tela liberada a API nega os dados, inclusive para a Eme.',
              'Tela travada no cadeado continua marcada nos perfis, mas não dá acesso: destravar devolve tudo como estava.',
            ]" />
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
                  <p class="text-[11px] text-ink-subtle truncate">
                    {{ user.role === 'admin' ? 'Administrador'
                      : (profileById(user.permission_profile_id)?.name || 'Sem perfil') }}
                  </p>
                </div>
                <IconButton v-if="user.role !== 'admin'"
                  icon="fas fa-copy" size="sm"
                  :label="`Copiar alçadas de ${user.username}`"
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
            description="Escolha um usuário na lista ao lado para gerenciar suas alçadas e liberações." />

          <Surface v-else-if="selectedUser.role === 'admin'" variant="raised" padding="lg">
            <div class="text-center py-6">
              <div class="h-14 w-14 grid place-items-center rounded-2xl
                          bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mx-auto mb-3">
                <i class="fas fa-crown text-xl"></i>
              </div>
              <h3 class="text-base font-semibold text-ink mb-1">{{ selectedUser.username }}</h3>
              <p class="text-sm text-ink-muted">
                Administradores têm acesso total a telas e dados. Permissões não podem ser restritas.
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

              <!-- Perfil vivo -->
              <div class="mt-4 grid sm:grid-cols-2 gap-3">
                <div>
                  <Select v-model="localProfileId" :options="profileOptions" label="Perfil aplicado (vivo)" />
                  <p class="text-[11px] text-ink-muted mt-1.5">
                    Editar o perfil na aba Perfis muda o acesso deste usuário na hora.
                  </p>
                </div>
                <div class="flex flex-col justify-end gap-1.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <Badge v-if="exceptionsCount" variant="warning" size="sm">
                      {{ localExtra.length }} extra(s) · {{ localRemoved.length }} negada(s)
                    </Badge>
                    <Badge v-else variant="neutral" size="sm">Sem exceções</Badge>
                    <button v-if="exceptionsCount" @click="clearExceptions"
                      class="text-xs text-red-500 hover:underline">
                      Limpar exceções
                    </button>
                  </div>
                  <Button variant="secondary" size="sm" icon="fas fa-building-lock"
                    @click="openGrants('user', selectedUser.id, selectedUser.username)">
                    Empreendimentos liberados
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

            <!-- Grupos de telas -->
            <Surface v-for="dept in managedRegistry" :key="dept.key" variant="raised" padding="none" class="overflow-hidden">
              <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface-sunken/40 border-b border-line">
                <div class="flex items-center gap-2 min-w-0">
                  <i :class="dept.icon" class="text-ink-subtle text-xs w-4 text-center"></i>
                  <span class="text-sm font-medium text-ink truncate">{{ dept.label }}</span>
                  <span class="text-xs text-ink-subtle font-mono">
                    {{ countGrantedInDept(dept) }}/{{ delegablePages(dept).length }}
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
                    <Badge v-if="isLocked(page.route)" variant="warning" size="sm">
                      <i class="fas fa-crown text-[9px] mr-1"></i>somente admin
                    </Badge>
                    <template v-else>
                      <Badge v-if="routeState(page.route).inRemoved" variant="danger" size="sm">negada</Badge>
                      <Badge v-else-if="routeState(page.route).inExtra && !routeState(page.route).inProfile"
                        variant="warning" size="sm">extra</Badge>
                      <Badge v-else-if="routeState(page.route).inProfile" variant="accent" size="sm">perfil</Badge>
                    </template>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <IconButton
                      :icon="isLocked(page.route) ? 'fas fa-lock' : 'fas fa-lock-open'"
                      size="sm"
                      :disabled="lockBusy === page.route"
                      :label="isLocked(page.route)
                        ? `Devolver ${page.name} às alçadas`
                        : `Tornar ${page.name} exclusiva de administradores`"
                      :class="isLocked(page.route) ? 'text-amber-500' : ''"
                      @click="isLocked(page.route) ? unlockRoute(page.route) : askLock(page)" />
                    <Switch :model-value="!isLocked(page.route) && routeState(page.route).effective" size="sm"
                      :disabled="isLocked(page.route)"
                      @update:model-value="(v) => setRoute(page.route, v)" />
                  </div>
                </div>
              </div>
            </Surface>

          </div>
        </main>

        <!-- Panorama das telas do sistema — vale para TODOS os usuários, então
             fica fora do painel de um usuário só (visível com ou sem seleção). -->
        <section class="lg:col-span-4 space-y-3">
          <Surface v-if="lockedPages.length || orphanPolicies.length" variant="raised" padding="none" class="overflow-hidden">
            <div class="px-4 py-2.5 bg-surface-sunken/40 border-b border-line flex items-center gap-2 flex-wrap">
              <i class="fas fa-lock text-amber-500 text-xs w-4 text-center"></i>
              <span class="text-sm font-medium text-ink">Travadas como somente admin</span>
              <span class="text-xs text-ink-subtle font-mono">{{ lockedPages.length + orphanPolicies.length }}</span>
              <span class="text-[11px] text-ink-subtle sm:ml-auto">definidas nesta tela - clique no cadeado para devolver às alçadas</span>
            </div>
            <div class="divide-y divide-line">
              <div v-for="p in lockedPages" :key="p.route"
                class="flex items-center justify-between gap-3 px-4 py-2.5">
                <div class="flex items-center gap-2.5 min-w-0">
                  <i :class="p.icon" class="text-amber-500 text-xs w-3.5 text-center"></i>
                  <div class="min-w-0">
                    <p class="text-sm text-ink truncate">{{ p.catLabel }} · {{ p.name }}</p>
                    <p class="text-[11px] text-ink-subtle truncate">
                      <span class="font-mono">{{ p.route }}</span>
                      <template v-if="p.policy?.updatedBy"> · por {{ p.policy.updatedBy }}</template>
                      <template v-if="p.policy?.note"> · {{ p.policy.note }}</template>
                    </p>
                  </div>
                </div>
                <IconButton icon="fas fa-lock-open" size="sm" :disabled="lockBusy === p.route"
                  :label="`Devolver ${p.name} às alçadas`" @click="unlockRoute(p.route)" />
              </div>

              <div v-for="p in orphanPolicies" :key="p.route"
                class="flex items-center justify-between gap-3 px-4 py-2.5">
                <div class="min-w-0">
                  <p class="text-sm text-ink truncate font-mono">{{ p.route }}</p>
                  <p class="text-[11px] text-red-500">tela travada que não existe mais no menu (renomeada ou removida)</p>
                </div>
                <IconButton icon="fas fa-lock-open" size="sm" :disabled="lockBusy === p.route"
                  label="Remover trava órfã" @click="unlockRoute(p.route)" />
              </div>
            </div>
          </Surface>

          <!-- Telas não-delegáveis (informativo — visibilidade total) -->
          <Surface variant="raised" padding="none" class="overflow-hidden">
            <div class="px-4 py-2.5 bg-surface-sunken/40 border-b border-line flex items-center gap-2 flex-wrap">
              <i class="fas fa-crown text-amber-500 text-xs w-4 text-center"></i>
              <span class="text-sm font-medium text-ink">Exclusivas de admin no código</span>
              <span class="text-xs text-ink-subtle font-mono">{{ adminOnlyPages.length }}</span>
              <span class="text-[11px] text-ink-subtle sm:ml-auto">administração do sistema - não podem ser delegadas nem por aqui</span>
            </div>
            <div class="px-4 py-2.5 flex flex-wrap gap-1.5">
              <Badge v-for="p in adminOnlyPages" :key="p.route" variant="neutral" size="sm" :title="p.route">
                <i :class="p.icon" class="text-[9px] mr-1 opacity-70"></i>{{ p.name }}
              </Badge>
            </div>
          </Surface>

          <Surface variant="raised" padding="none" class="overflow-hidden">
            <div class="px-4 py-2.5 bg-surface-sunken/40 border-b border-line flex items-center gap-2 flex-wrap">
              <i class="fas fa-unlock text-emerald-500 text-xs w-4 text-center"></i>
              <span class="text-sm font-medium text-ink">Sempre liberadas</span>
              <span class="text-xs text-ink-subtle font-mono">{{ alwaysFreePages.length }}</span>
              <span class="text-[11px] text-ink-subtle sm:ml-auto">pessoais/broadcast - todos os usuários têm acesso</span>
            </div>
            <div class="px-4 py-2.5 flex flex-wrap gap-1.5">
              <Badge v-for="p in alwaysFreePages" :key="p.route" variant="neutral" size="sm" :title="p.route">
                <i :class="p.icon" class="text-[9px] mr-1 opacity-70"></i>{{ p.name }}
              </Badge>
            </div>
          </Surface>
        </section>
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
            · perfis são VIVOS: editar aqui muda o acesso de todos os usuários vinculados na hora
          </p>
          <Button icon="fas fa-plus" @click="openProfileModal(null)">Novo perfil</Button>
        </div>

        <EmptyState v-if="!profiles.length"
          icon="fas fa-layer-group" title="Nenhum perfil cadastrado"
          description="Crie um perfil para reutilizar conjuntos de alçadas e liberações." />

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <Surface v-for="profile in profiles" :key="profile.id" variant="raised" padding="none" class="overflow-hidden">
            <div class="px-4 py-3.5 border-b border-line">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-ink truncate">{{ profile.name }}</h3>
                  <p class="text-xs text-ink-muted mt-0.5 line-clamp-2">{{ profile.description || 'Sem descrição' }}</p>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="accent" size="sm">{{ profile.routes.length }} telas</Badge>
                  <Badge variant="neutral" size="sm">
                    <i class="fas fa-users text-[9px] mr-1"></i>{{ usersByProfile.get(profile.id) || 0 }} usuário(s)
                  </Badge>
                  <Badge v-if="profile.department_id && departmentName(profile.department_id)"
                    variant="warning" size="sm">
                    Padrão: {{ departmentName(profile.department_id) }}
                  </Badge>
                  <Badge v-if="profile.department_id"
                    :variant="profile.routes_customized ? 'neutral' : 'success'" size="sm"
                    :title="profile.routes_customized
                      ? 'Telas escolhidas à mão — o sistema não atualiza mais este perfil sozinho'
                      : 'Telas mantidas pelo padrão do departamento — acompanham as telas novas do sistema'">
                    {{ profile.routes_customized ? 'editado' : 'padrão do sistema' }}
                  </Badge>
                </div>
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
              <Button size="sm" variant="secondary" icon="fas fa-building-lock"
                @click="openGrants('profile', profile.id, profile.name)">
                Empreend.
              </Button>
              <IconButton v-if="profile.department_id && profile.routes_customized"
                icon="fas fa-rotate-left" size="sm"
                :label="`Restaurar as telas padrão do departamento em ${profile.name}`"
                @click="resetProfileDefault(profile)" />
              <Button size="sm" variant="ghost" icon="fas fa-trash" class="text-red-500"
                @click="confirmDeleteProfile(profile)">
              </Button>
            </div>
          </Surface>
        </div>
      </div>
    </PageContainer>

    <!-- Modal: tornar uma tela exclusiva de admin -->
    <Modal :open="lockModal.open" size="md" @close="lockModal.open = false">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400
                      border border-amber-500/20 grid place-items-center shrink-0">
            <i class="fas fa-lock text-sm"></i>
          </div>
          <div>
            <h2 class="text-base font-semibold text-ink">Tornar exclusiva de administradores</h2>
            <p class="text-xs text-ink-muted mt-0.5 font-mono">{{ lockModal.page?.route }}</p>
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <p class="text-sm text-ink-muted">
          <strong class="text-ink">{{ lockModal.page?.name }}</strong> passa a valer só para
          administradores. O servidor bloqueia na hora: as APIs da tela negam os dados de qualquer
          não-admin, inclusive quando pedidos pela Eme.
        </p>
        <ul class="text-xs text-ink-muted space-y-1 pl-1">
          <li><i class="fas fa-check text-emerald-500 mr-1.5"></i>O item some do menu e o acesso pela URL é barrado na próxima carga da página de cada usuário.</li>
          <li><i class="fas fa-check text-emerald-500 mr-1.5"></i>Os perfis continuam com a tela marcada; ela só deixa de valer.</li>
          <li><i class="fas fa-check text-emerald-500 mr-1.5"></i>Reversível: basta clicar no cadeado de novo.</li>
        </ul>
        <Input v-model="lockModal.note" label="Motivo (opcional)"
          placeholder="Ex: tela em revisão pela diretoria" />
      </div>

      <template #footer>
        <Button variant="ghost" @click="lockModal.open = false">Cancelar</Button>
        <Button icon="fas fa-lock" :loading="!!lockBusy" @click="confirmLock">
          Tornar exclusiva de admin
        </Button>
      </template>
    </Modal>

    <!-- Modal de liberação de empreendimentos -->
    <GrantsModal
      :open="grantsModal.open"
      :subject-type="grantsModal.type"
      :subject-id="grantsModal.id"
      :subject-name="grantsModal.name"
      @close="grantsModal.open = false" />

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
              <span class="font-mono">{{ profileForm.routes.length }}</span> telas
              <template v-if="editingProfile">
                · alterações valem NA HORA para {{ usersByProfile.get(editingProfile.id) || 0 }} usuário(s)
              </template>
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid sm:grid-cols-2 gap-3">
          <Input v-model="profileForm.name" label="Nome do perfil" placeholder="Ex: Padrão - Comercial" required />
          <Input v-model="profileForm.description" label="Descrição" placeholder="Breve descrição do perfil" />
        </div>

        <div>
          <Select v-model="profileForm.department_id" :options="departmentOptions"
            label="Perfil padrão do departamento" placeholder="Nenhum (perfil avulso)" />
          <p class="text-xs text-ink-muted mt-1.5 flex items-start gap-1.5">
            <i class="fas fa-circle-info text-accent mt-0.5 shrink-0"></i>
            <span>Vinculado a um departamento, este perfil é aplicado automaticamente ao
            <strong>ativar usuários novos</strong> daquele departamento
            (cada departamento aceita um único perfil padrão).</span>
          </p>
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
                {{ delegablePages(dept).filter(p => profileForm.routes.includes(p.route)).length }}/{{ delegablePages(dept).length }}
              </span>
            </div>
            <Switch
              :model-value="delegablePages(dept).length > 0 && delegablePages(dept).every(p => profileForm.routes.includes(p.route))"
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
                <Badge v-if="isLocked(page.route)" variant="warning" size="sm">
                  <i class="fas fa-crown text-[9px] mr-1"></i>somente admin
                </Badge>
              </div>
              <Switch :model-value="!isLocked(page.route) && profileForm.routes.includes(page.route)" size="sm"
                :disabled="isLocked(page.route)"
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
