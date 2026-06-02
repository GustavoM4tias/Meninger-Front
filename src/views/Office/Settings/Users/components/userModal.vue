<script setup>
import { ref, watchEffect, onMounted, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { adminResetUserPassword } from '@/utils/Auth/apiAuth';
import API_URL from '@/config/apiUrl';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import UiSelect from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';

const authStore = useAuthStore();
const toast = useToast();
const isAdmin = computed(() => authStore.user?.role === 'admin');

const props = defineProps({ user: { type: Object, default: null } });
const emit = defineEmits(['close', 'reload']);

const isEdit = computed(() => !!props.user);

const baseUser = {
  id: undefined, username: '', email: '', phone: '', position: '', city: '',
  birth_date: '', status: true, role: 'user',
  manager_id: null, face_enabled: false, show_in_organogram: false,
  daily_alert_limit: 5,
};

const editableUser = ref(props.user ? { ...props.user } : { ...baseUser });
const allUsers = ref([]);
const password = ref('');
const passwordConfirm = ref('');
const positionsOptions = ref([]);
const positionDescMap = ref({});
const citiesOptions = ref([]);

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
      positionsOptions.value = active
        .map(p => ({ label: p.name, value: p.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      positionDescMap.value = Object.fromEntries(active.map(p => [p.name, p.description || '']));
    }

    if (resCity.status === 'fulfilled') {
      const data = await resCity.value.json();
      const list = Array.isArray(data) ? data : (data?.data || []);
      citiesOptions.value = list.filter(c => c?.active)
        .map(c => ({ label: c.uf ? `${c.name} - ${c.uf}` : c.name, value: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
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
        position: u.position, manager_id: u.manager_id, city: u.city,
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
        position: u.position, city: u.city, birth_date: u.birth_date,
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
          <UiSelect v-model="editableUser.city" :options="citiesOptions"
            label="Cidade" placeholder="Selecione a cidade" />
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

          <div class="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface-sunken">
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
      <Button icon="fas fa-check" @click="saveUser">
        {{ isEdit ? 'Salvar alterações' : 'Criar usuário' }}
      </Button>
    </template>

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
