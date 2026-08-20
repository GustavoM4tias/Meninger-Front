<script setup>
import { ref, watchEffect, onMounted, computed } from 'vue';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { adminResetUserPassword, activateUser, rejectUser } from '@/utils/Auth/apiAuth';
import { managedRegistry, getDeptManagedPages } from '@/config/navRegistry';
import API_URL from '@/config/apiUrl';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import UiSelect from '@/components/UI/Select.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Switch from '@/components/UI/Switch.vue';

const authStore = useAuthStore();
const toast = useToast();
// Fonte autoritativa: permissoes confirmadas pelo servidor
// (/permissions/me), nao o authStore. Aqui nao cabe capacidade: tela admin por codigo.
const perm = usePermissionStore();
const isAdmin = computed(() => perm.isAdmin);

const props = defineProps({ user: { type: Object, default: null } });
const emit = defineEmits(['close', 'reload']);

const isEdit = computed(() => !!props.user);

const baseUser = {
  id: undefined, username: '', email: '', phone: '', position: '', city: '', city_id: null,
  birth_date: '', status: true, role: 'user',
  manager_id: null, face_enabled: false, show_in_organogram: false,
  daily_alert_limit: 5,
};

const editableUser = ref(props.user ? { ...props.user } : { ...baseUser });
const allUsers = ref([]);
const password = ref('');
const passwordConfirm = ref('');
const positionsOptions = ref([]);
const positionsRaw = ref([]);   // cargos com o departamento (para a ativação)
const positionDescMap = ref({});
const citiesRaw = ref([]);   // catálogo completo (IBGE) — busca no seletor
const permissionProfiles = ref([]);

// Rótulo "Cidade - UF" (único) ↔ registro do catálogo.
const cityLabel = (c) => (c.uf ? `${c.name} - ${c.uf}` : c.name);
const cityOptions = computed(() =>
  citiesRaw.value.map(cityLabel).sort((a, b) => a.localeCompare(b, 'pt-BR'))
);
const cityByLabel = computed(() => {
  const m = new Map();
  for (const c of citiesRaw.value) m.set(cityLabel(c), c);
  return m;
});

// MultiSelector trabalha com array; aqui é seleção única (single).
const citySelection = computed({
  get: () => {
    const u = editableUser.value;
    const found = u.city_id
      ? citiesRaw.value.find(c => Number(c.id) === Number(u.city_id))
      : citiesRaw.value.find(c => c.name === u.city);
    return found ? [cityLabel(found)] : [];
  },
  set: (arr) => {
    const label = Array.isArray(arr) ? arr[arr.length - 1] : null;
    const rec = label ? cityByLabel.value.get(label) : null;
    editableUser.value.city = rec?.name || '';
    editableUser.value.city_id = rec?.id ?? null;
  },
});

// Cadastro de primeiro acesso: 'pending' = formulário enviado, aguardando o
// admin; 'incomplete' = usuário ainda não concluiu o formulário (não ativável).
// Reprovar EXCLUI o cadastro (a pessoa pode solicitar acesso novamente).
const isPending = computed(() => isEdit.value && props.user?.approval_status === 'pending');
const isIncomplete = computed(() => isEdit.value && props.user?.approval_status === 'incomplete');

// Departamento escolhido pelo usuário no formulário de primeiro acesso
const departmentsList = ref([]);
const signupDepartmentName = computed(() => {
  const id = props.user?.signup_department_id;
  if (!id) return null;
  return departmentsList.value.find(d => Number(d.id) === Number(id))?.name || null;
});

watchEffect(() => {
  if (editableUser.value?.birth_date) {
    const v = editableUser.value.birth_date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) && typeof v === 'string') {
      editableUser.value.birth_date = v.slice(0, 10);
    }
  }
});

onMounted(async () => {
  try {
    const res = await authStore.getAllUsers();
    allUsers.value = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const [resPos, resCity] = await Promise.allSettled([
      fetch(`${API_URL}/admin/positions`,   { headers }),
      fetch(`${API_URL}/admin/user-cities`, { headers }),
    ]);

    if (resPos.status === 'fulfilled') {
      const data = await resPos.value.json();
      const list = Array.isArray(data) ? data : (data?.data || []);
      const active = list.filter(p => p?.active && p?.is_internal);
      positionsRaw.value = active;
      positionsOptions.value = active
        .map(p => ({ label: p.name, value: p.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      positionDescMap.value = Object.fromEntries(active.map(p => [p.name, p.description || '']));
    }

    if (resCity.status === 'fulfilled') {
      const data = await resCity.value.json();
      const list = Array.isArray(data) ? data : (data?.data || []);
      // Catálogo completo (municípios do IBGE): o seletor precisa de BUSCA, e o
      // valor trafega por ID — há municípios homônimos em UFs diferentes.
      citiesRaw.value = list.filter(c => c?.active);
    }

    // Perfis de alçada (para exibir as alçadas padrão do departamento na
    // ativação) + departamentos (para mostrar o escolhido no cadastro)
    if (isAdmin.value && isPending.value) {
      try {
        const [resProfiles, resDepts] = await Promise.allSettled([
          fetch(`${API_URL}/permissions/profiles`, { headers }),
          fetch(`${API_URL}/admin/departments`, { headers }),
        ]);
        if (resProfiles.status === 'fulfilled' && resProfiles.value.ok) {
          const data = await resProfiles.value.json();
          permissionProfiles.value = Array.isArray(data) ? data : [];
        }
        if (resDepts.status === 'fulfilled' && resDepts.value.ok) {
          const data = await resDepts.value.json();
          departmentsList.value = Array.isArray(data) ? data : (data?.data || []);
        }
      } catch { /* segue sem preview de alçadas */ }
    }
  } catch (e) {
    console.error(e);
  }
});

const positionDescription = computed(() =>
  editableUser.value.position ? positionDescMap.value[editableUser.value.position] || '' : ''
);

const managerOptions = computed(() => [
  { label: 'Sem superior', value: '' },
  ...allUsers.value
    .filter(u => u.id !== editableUser.value.id)
    .map(u => ({ label: `${u.username} (${u.position || 'Sem cargo'})`, value: String(u.id) })),
]);

const managerIdProxy = computed({
  get: () => String(editableUser.value.manager_id ?? ''),
  set: (v) => { editableUser.value.manager_id = v === '' ? null : Number(v); },
});

const avatarUrl = computed(() => {
  const name = editableUser.value.username || '?';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&rounded=true&background=random&bold=true&format=svg&size=96`;
});

// ── Reset de senha (admin) ──────────────────────────
const resetPwdModal = ref({ open: false, password: '', copied: false, loading: false });

async function handleResetPassword() {
  resetPwdModal.value.loading = true;
  try {
    const result = await adminResetUserPassword(editableUser.value.id);
    resetPwdModal.value.password = result.data?.password || result.password || '';
    resetPwdModal.value.open = true;
    resetPwdModal.value.copied = false;
  } catch (error) {
    toast.error(error?.message || 'Erro ao resetar senha.');
  } finally {
    resetPwdModal.value.loading = false;
  }
}

function copyResetPassword() {
  navigator.clipboard.writeText(resetPwdModal.value.password);
  resetPwdModal.value.copied = true;
  setTimeout(() => { resetPwdModal.value.copied = false; }, 2500);
}

function closeResetPwdModal() {
  resetPwdModal.value.open = false;
  resetPwdModal.value.password = '';
  resetPwdModal.value.copied = false;
}

const roleOptions = [
  { label: 'Usuário', value: 'user' },
  { label: 'Admin',   value: 'admin' },
];

// ── Ativação de cadastro pendente ────────────────────
const activateModal = ref({ open: false, loading: false });
const rejectModal = ref({ open: false, loading: false, reason: '' });

function openRejectConfirm() {
  rejectModal.value = { open: true, loading: false, reason: '' };
}

async function confirmReject() {
  if (rejectModal.value.loading) return;
  rejectModal.value.loading = true;
  try {
    const result = await rejectUser(editableUser.value.id, rejectModal.value.reason);
    const msg = result?.data?.message || result?.message || 'Cadastro reprovado.';
    if (result?.data?.emailSent === false) toast.warning(msg);
    else toast.success(msg);
    rejectModal.value.open = false;
    emit('close');
    emit('reload');
  } catch (error) {
    toast.error(error?.message || 'Erro ao reprovar cadastro.');
  } finally {
    rejectModal.value.loading = false;
  }
}

// Nome amigável de cada rota gerenciável (para listar as alçadas na confirmação)
const routeNameMap = (() => {
  const map = {};
  managedRegistry.forEach(cat => {
    getDeptManagedPages(cat).forEach(p => { map[p.route] = `${cat.label} · ${p.name}`; });
  });
  return map;
})();

// Departamento derivado do cargo escolhido no formulário
const activationDepartment = computed(() => {
  const pos = positionsRaw.value.find(p => p.name === editableUser.value.position);
  return pos?.department || null;
});

// Perfil de alçadas padrão vinculado ao departamento (se existir)
const activationProfile = computed(() => {
  const dept = activationDepartment.value;
  if (!dept) return null;
  return permissionProfiles.value.find(p => Number(p.department_id) === Number(dept.id)) || null;
});

const activationRouteNames = computed(() => {
  const routes = Array.isArray(activationProfile.value?.routes) ? activationProfile.value.routes : [];
  return routes.map(r => routeNameMap[r] || r).sort((a, b) => a.localeCompare(b));
});

function openActivateConfirm() {
  const u = editableUser.value;
  if (!u.username?.trim() || !u.email?.trim() || !u.position || !u.city || !u.birth_date) {
    toast.error('Preencha todos os campos obrigatórios antes de ativar.');
    return;
  }
  activateModal.value.open = true;
}

async function confirmActivate() {
  if (activateModal.value.loading) return;
  activateModal.value.loading = true;
  try {
    // 1) Persiste eventuais ajustes feitos no formulário (cargo, cidade, etc.)
    const u = editableUser.value;
    await authStore.updateUser({
      id: u.id, username: u.username, email: u.email, phone: u.phone || null,
      position: u.position, manager_id: u.manager_id, city: u.city, city_id: u.city_id ?? null,
      birth_date: u.birth_date, status: u.status, role: u.role,
      show_in_organogram: u.show_in_organogram ?? false,
      daily_alert_limit: Math.max(0, Number(u.daily_alert_limit) || 5),
    });
    // 2) Ativa: aplica alçadas padrão, gera senha provisória e envia o e-mail
    const result = await activateUser(u.id);
    const msg = result?.data?.message || result?.message || 'Usuário ativado com sucesso.';
    if (result?.data?.emailSent === false) toast.warning(msg);
    else toast.success(msg);
    activateModal.value.open = false;
    emit('close');
    emit('reload');
  } catch (error) {
    toast.error(error?.message || 'Erro ao ativar usuário.');
  } finally {
    activateModal.value.loading = false;
  }
}

async function saveUser() {
  const u = editableUser.value;
  if (!u.username?.trim() || !u.email?.trim() || !u.position || !u.city || !u.birth_date) {
    toast.error('Preencha todos os campos obrigatórios.');
    return;
  }
  try {
    if (isEdit.value) {
      await authStore.updateUser({
        id: u.id, username: u.username, email: u.email, phone: u.phone || null,
        position: u.position, manager_id: u.manager_id, city: u.city, city_id: u.city_id ?? null,
        birth_date: u.birth_date, status: u.status, role: u.role,
        show_in_organogram: u.show_in_organogram ?? false,
        daily_alert_limit: Math.max(0, Number(u.daily_alert_limit) || 5),
      });
      toast.success('Usuário atualizado com sucesso!');
    } else {
      if (!password.value || password.value.length < 6) {
        toast.error('Senha com pelo menos 6 caracteres.');
        return;
      }
      if (password.value !== passwordConfirm.value) {
        toast.error('As senhas não conferem.');
        return;
      }
      await authStore.createUser({
        username: u.username, email: u.email, password: password.value,
        position: u.position, city: u.city, city_id: u.city_id ?? null,
        birth_date: u.birth_date,
        phone: u.phone || null, manager_id: u.manager_id, status: u.status,
      });
      toast.success('Usuário criado com sucesso!');
    }
    emit('close');
    emit('reload');
  } catch (error) {
    toast.error(`Erro: ${error?.message || error}`);
  }
}
</script>

<template>
  <Modal :open="true" size="lg" hide-close @close="$emit('close')">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <img v-if="isEdit" :src="avatarUrl" :alt="editableUser.username"
          class="w-10 h-10 rounded-lg ring-1 ring-line shrink-0" />
        <div v-else
          class="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 grid place-items-center shrink-0">
          <i class="fas fa-user-plus text-sm"></i>
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-ink truncate">
            {{ isEdit ? editableUser.username : 'Novo usuário' }}
          </h2>
          <div v-if="isEdit" class="flex items-center gap-3 text-xs text-ink-muted mt-0.5">
            <span v-if="editableUser.position" class="text-accent truncate">{{ editableUser.position }}</span>
            <span class="inline-flex items-center gap-1"
              :class="editableUser.face_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-subtle'">
              <i class="fas fa-users-viewfinder text-[10px]"></i>
              Facial {{ editableUser.face_enabled ? 'ativo' : 'inativo' }}
            </span>
          </div>
        </div>
        <button type="button" @click="$emit('close')" aria-label="Fechar"
          class="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors shrink-0">
          <i class="fas fa-xmark text-sm"></i>
        </button>
      </div>
    </template>

    <form @submit.prevent="saveUser" class="space-y-5">

      <!-- Cadastro pendente de aprovação -->
      <div v-if="isPending"
        class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 flex items-start gap-2.5">
        <i class="fas fa-user-clock text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"></i>
        <div class="text-xs leading-relaxed">
          <p class="font-semibold text-amber-700 dark:text-amber-300">Cadastro aguardando aprovação</p>
          <p class="text-amber-700/80 dark:text-amber-300/80 mt-0.5">
            Este usuário concluiu o cadastro de primeiro acesso<template v-if="signupDepartmentName">
            e escolheu o departamento <strong>{{ signupDepartmentName }}</strong></template>.
            Defina o <strong>cargo</strong> e os demais pontos abaixo e clique em
            <strong>Aprovar e ativar</strong> para liberar o acesso.
          </p>
        </div>
      </div>

      <!-- Cadastro ainda não concluído pelo usuário -->
      <div v-else-if="isIncomplete"
        class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 flex items-start gap-2.5">
        <i class="fas fa-hourglass-half text-ink-muted mt-0.5 shrink-0"></i>
        <div class="text-xs leading-relaxed">
          <p class="font-semibold text-ink">Cadastro não concluído</p>
          <p class="text-ink-muted mt-0.5">
            Este usuário entrou com a conta Microsoft mas ainda não enviou o formulário de
            primeiro acesso. A ativação fica disponível quando ele concluir.
          </p>
        </div>
      </div>

      <!-- Identidade -->
      <section>
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2.5">Identidade</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="editableUser.username" label="Nome" placeholder="Nome completo"
            iconLeft="fas fa-user" required class="sm:col-span-2" />
          <Input v-model="editableUser.email" type="email" label="E-mail"
            placeholder="email@exemplo.com" iconLeft="fas fa-envelope" required />
          <Input v-model="editableUser.phone" type="tel" label="Telefone (com DDD)"
            placeholder="(11) 99999-9999" iconLeft="fas fa-phone" />
        </div>
      </section>

      <!-- Acesso (só criação) -->
      <section v-if="!isEdit">
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2.5">Acesso</p>
        <div class="grid grid-cols-2 gap-3">
          <Input v-model="password" type="password" label="Senha"
            placeholder="Mín. 6 caracteres" iconLeft="fas fa-lock" required />
          <Input v-model="passwordConfirm" type="password" label="Confirmar senha"
            placeholder="Repita a senha" iconLeft="fas fa-lock" required />
        </div>
      </section>

      <!-- Cargo e localização -->
      <section>
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2.5">Cargo e localização</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UiSelect v-model="editableUser.position" :options="positionsOptions"
            label="Cargo" placeholder="Selecione o cargo" />
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1.5">Cidade</label>
            <MultiSelector :model-value="citySelection"
              @update:modelValue="citySelection = $event"
              :options="cityOptions" placeholder="Busque a cidade…"
              :single="true" :overlay="true" :page-size="120" />
          </div>
          <div v-if="positionDescription"
            class="sm:col-span-2 rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2.5 flex items-start gap-2">
            <i class="fas fa-circle-info text-accent text-xs mt-0.5 shrink-0"></i>
            <p class="text-xs text-accent leading-relaxed">{{ positionDescription }}</p>
          </div>
          <Input v-model="editableUser.birth_date" type="date" label="Nascimento" required />
          <UiSelect v-model="managerIdProxy" :options="managerOptions"
            label="Superior direto" placeholder="Selecione o superior" />
        </div>
      </section>

      <!-- Configurações -->
      <section>
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2.5">Configurações</p>
        <div class="space-y-2">

          <div v-if="isAdmin && isEdit"
            class="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface-sunken">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="h-8 w-8 rounded-lg bg-surface text-ink-muted border border-line grid place-items-center shrink-0">
                <i class="fas fa-shield-halved text-xs"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink">Perfil de acesso</p>
                <p class="text-xs text-ink-muted">Define o nível administrativo</p>
              </div>
            </div>
            <UiSelect v-model="editableUser.role" :options="roleOptions" size="sm" class="max-w-24 md:max-w-32 shrink-0" />
          </div>

          <div v-if="isAdmin && isEdit"
            class="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface-sunken">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="h-8 w-8 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
                <i class="fas fa-sitemap text-xs"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink">Exibir no organograma</p>
                <p class="text-xs text-ink-muted">
                  {{ editableUser.show_in_organogram ? 'Aparece no organograma' : 'Não aparece' }}
                </p>
              </div>
            </div>
            <Switch v-model="editableUser.show_in_organogram" size="sm" />
          </div>

          <div v-if="isAdmin && isEdit"
            class="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface-sunken">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="h-8 w-8 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
                <i class="fas fa-bell-concierge text-xs"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink">Limite diário de alertas</p>
                <p class="text-xs text-ink-muted">
                  Máximo de disparos por dia somando todos os alertas do usuário
                </p>
              </div>
            </div>
            <input v-model.number="editableUser.daily_alert_limit" type="number" min="0" max="200"
              class="w-20 px-2 py-1 text-sm text-center bg-surface-raised text-ink border border-line rounded-md
                     focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring/20" />
          </div>

          <div v-if="!isPending && !isIncomplete"
            class="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface-sunken">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="h-8 w-8 rounded-lg grid place-items-center shrink-0"
                :class="editableUser.status
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400'">
                <i class="text-xs" :class="editableUser.status ? 'fas fa-circle-check' : 'fas fa-circle-xmark'"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink">Acesso ao sistema</p>
                <p class="text-xs text-ink-muted">
                  {{ editableUser.status ? 'Usuário pode realizar login' : 'Login bloqueado' }}
                </p>
              </div>
            </div>
            <Switch v-model="editableUser.status" size="sm" />
          </div>

          <div v-else
            class="flex items-center gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <div class="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
              <i class="fas fa-lock text-xs"></i>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-ink">Acesso bloqueado até a aprovação</p>
              <p class="text-xs text-ink-muted">
                {{ isPending ? 'Use "Aprovar e ativar" para liberar o login'
                  : 'Disponível após o usuário concluir o formulário de primeiro acesso' }}
              </p>
            </div>
          </div>

          <!-- Resetar senha (admin only, edição) -->
          <div v-if="isEdit && isAdmin"
            class="flex items-center justify-between gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="h-8 w-8 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 grid place-items-center shrink-0">
                <i class="fas fa-key text-xs"></i>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-ink">Resetar senha</p>
                <p class="text-xs text-ink-muted">Gera e substitui por uma senha aleatória segura</p>
              </div>
            </div>
            <Button variant="outline" size="sm" :loading="resetPwdModal.loading"
              icon="fas fa-arrows-rotate" @click="handleResetPassword">
              {{ resetPwdModal.loading ? 'Gerando...' : 'Resetar' }}
            </Button>
          </div>
        </div>
      </section>
    </form>

    <template #footer>
      <Button variant="ghost" @click="$emit('close')">Cancelar</Button>
      <Button v-if="(isPending || isIncomplete) && isAdmin" variant="outline" icon="fas fa-user-xmark"
        class="text-red-500" @click="openRejectConfirm">
        Reprovar
      </Button>
      <Button v-if="isPending && isAdmin" variant="secondary" icon="fas fa-floppy-disk" @click="saveUser">
        Salvar
      </Button>
      <Button v-if="isPending && isAdmin" icon="fas fa-user-check" @click="openActivateConfirm">
        Aprovar e ativar
      </Button>
      <Button v-else icon="fas fa-check" @click="saveUser">
        {{ isEdit ? 'Salvar alterações' : 'Criar usuário' }}
      </Button>
    </template>

    <!-- Submodal: confirmação de ativação -->
    <Modal :open="activateModal.open" size="md" @close="activateModal.open = false">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 grid place-items-center shrink-0">
            <i class="fas fa-user-check text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">Ativar este usuário?</h3>
            <p class="text-xs text-ink-muted mt-0.5">Confira as configurações que serão liberadas</p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="rounded-lg border border-line bg-surface-sunken divide-y divide-line text-sm">
          <div class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="text-xs text-ink-muted">Nome</span>
            <span class="text-ink font-medium truncate">{{ editableUser.username }}</span>
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="text-xs text-ink-muted">E-mail</span>
            <span class="text-ink truncate">{{ editableUser.email }}</span>
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="text-xs text-ink-muted">Cargo</span>
            <span class="text-ink truncate">{{ editableUser.position }}</span>
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="text-xs text-ink-muted">Departamento</span>
            <span class="text-ink truncate">{{ activationDepartment?.name || 'Sem departamento' }}</span>
          </div>
          <div class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="text-xs text-ink-muted">Cidade</span>
            <span class="text-ink truncate">{{ editableUser.city }}</span>
          </div>
        </div>

        <!-- Alçadas padrão do departamento -->
        <div>
          <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
            Alçadas de visualização aplicadas
            <span v-if="activationProfile" class="normal-case font-sans text-ink-muted">
              ({{ activationProfile.name }})
            </span>
          </p>
          <div v-if="activationRouteNames.length"
            class="rounded-lg border border-line bg-surface-sunken px-3 py-2 max-h-40 overflow-y-auto space-y-1">
            <p v-for="name in activationRouteNames" :key="name"
              class="text-xs text-ink flex items-center gap-1.5">
              <i class="fas fa-check text-emerald-500 text-[10px]"></i>{{ name }}
            </p>
          </div>
          <p v-else class="text-xs text-ink-muted rounded-lg border border-line bg-surface-sunken px-3 py-2">
            Nenhum perfil padrão de alçadas configurado para este departamento.
            O usuário será ativado sem telas liberadas; ajuste depois em Alçadas.
          </p>
        </div>

        <div class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <i class="fas fa-envelope shrink-0 mt-0.5"></i>
          <span>Ao confirmar, <strong>{{ editableUser.email }}</strong> receberá um e-mail informando a
          liberação do acesso com uma <strong>senha provisória</strong>.</span>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" :disabled="activateModal.loading" @click="activateModal.open = false">Cancelar</Button>
        <Button icon="fas fa-user-check" :loading="activateModal.loading" @click="confirmActivate">
          {{ activateModal.loading ? 'Ativando...' : 'Confirmar ativação' }}
        </Button>
      </template>
    </Modal>

    <!-- Submodal: confirmação de reprovação -->
    <Modal :open="rejectModal.open" size="sm" @close="rejectModal.open = false">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 grid place-items-center shrink-0">
            <i class="fas fa-user-xmark text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">Reprovar este cadastro?</h3>
            <p class="text-xs text-ink-muted mt-0.5">{{ editableUser.username }}</p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">Motivo (opcional)</label>
          <textarea v-model="rejectModal.reason" rows="3"
            placeholder="Ex.: cadastro não reconhecido, dados incorretos..."
            class="w-full px-3 py-2 text-sm bg-surface-raised text-ink border border-line rounded-lg
                   focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring/20 resize-none"></textarea>
        </div>

        <div class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <i class="fas fa-envelope shrink-0 mt-0.5"></i>
          <span><strong>{{ editableUser.email }}</strong> será avisado por e-mail que o cadastro não foi
          aprovado{{ rejectModal.reason ? ', com o motivo informado' : '' }}. O cadastro será
          <strong>removido</strong>; se necessário, a pessoa pode solicitar acesso novamente.</span>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" :disabled="rejectModal.loading" @click="rejectModal.open = false">Cancelar</Button>
        <Button variant="outline" class="text-red-500" icon="fas fa-user-xmark"
          :loading="rejectModal.loading" @click="confirmReject">
          {{ rejectModal.loading ? 'Reprovando...' : 'Confirmar reprovação' }}
        </Button>
      </template>
    </Modal>

    <!-- Submodal: senha gerada -->
    <Modal :open="resetPwdModal.open" size="sm" @close="closeResetPwdModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 grid place-items-center shrink-0">
            <i class="fas fa-key text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">Senha resetada</h3>
            <p class="text-xs text-ink-muted mt-0.5">Copie e compartilhe com o usuário</p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="p-3 rounded-lg bg-surface-sunken border border-line">
          <p class="text-center font-mono text-lg font-semibold text-ink tracking-wider break-all">
            {{ resetPwdModal.password }}
          </p>
        </div>

        <div class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
          <span>Esta senha <strong>não será exibida novamente</strong>. Copie antes de fechar.</span>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="closeResetPwdModal">Fechar</Button>
        <Button :variant="resetPwdModal.copied ? 'subtle' : 'primary'"
          :icon="resetPwdModal.copied ? 'fas fa-check' : 'fas fa-copy'"
          @click="copyResetPassword">
          {{ resetPwdModal.copied ? 'Copiado!' : 'Copiar senha' }}
        </Button>
      </template>
    </Modal>
  </Modal>
</template>
