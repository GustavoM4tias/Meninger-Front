<script setup>
import { ref, watchEffect, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import UiSelect from '@/components/UI/Select.vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { adminResetUserPassword } from '@/utils/Auth/apiAuth';

const authStore = useAuthStore();
const toast = useToast();
const isAdmin = computed(() => authStore.user?.role === 'admin');

const props = defineProps({
  user: { type: Object, default: null },
});
const emit = defineEmits(['close', 'reload']);

const isEdit = computed(() => !!props.user);

const baseUser = {
  id: undefined, username: '', email: '', phone: '', position: '', city: '',
  birth_date: '', status: true, role: 'user', manager_id: null, face_enabled: false, show_in_organogram: false,
};

const editableUser = ref(props.user ? { ...props.user } : { ...baseUser });
const allUsers = ref([]);
const password = ref('');
const passwordConfirm = ref('');
const positionsOptions = ref([]);
const positionDescMap = ref({});   // positionName → description
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

    const [resPos, resCity] = await Promise.allSettled([
      fetch(`${API_URL}/admin/positions`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
      fetch(`${API_URL}/admin/user-cities`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
    ]);

    if (resPos.status === 'fulfilled') {
      const data = await resPos.value.json();
      const list = Array.isArray(data) ? data : (data?.data || []);
      const active = list.filter(p => p?.active && p?.is_internal);
      positionsOptions.value = active
        .map(p => ({ label: p.name, value: p.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      positionDescMap.value = Object.fromEntries(
        active.map(p => [p.name, p.description || ''])
      );
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

// ── Reset de Senha (admin) ────────────────────────────────────────────────────
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

const saveUser = async () => {
  const u = editableUser.value;
  if (!u.username?.trim() || !u.email?.trim() || !u.position || !u.city || !u.birth_date) {
    toast.error('Preencha todos os campos obrigatórios.'); return;
  }
  try {
    if (isEdit.value) {
      await authStore.updateUser({
        id: u.id, username: u.username, email: u.email, phone: u.phone || null,
        position: u.position, manager_id: u.manager_id, city: u.city,
        birth_date: u.birth_date, status: u.status, role: u.role,
        show_in_organogram: u.show_in_organogram ?? false,
      });
      toast.success('Usuário atualizado com sucesso!');
    } else {
      if (!password.value || password.value.length < 6) { toast.error('Senha com pelo menos 6 caracteres.'); return; }
      if (password.value !== passwordConfirm.value) { toast.error('As senhas não conferem.'); return; }
      await authStore.createUser({
        username: u.username, email: u.email, password: password.value,
        position: u.position, city: u.city, birth_date: u.birth_date,
      });
      toast.success('Usuário criado com sucesso!');
    }
    emit('close'); emit('reload');
  } catch (error) {
    toast.error(`Erro: ${error?.message || error}`);
  }
};
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="$emit('close')">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

    <!-- Modal -->
    <div
      class="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
      @click.stop>

      <!-- Banner + avatar -->
      <div class="flex justify-end  h-12 bg-gradient-to-r from-blue-700 to-blue-500">
        <button type="button" @click="$emit('close')"
          class="my-auto me-2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>

      <div class="px-6 pb-0 my-2 flex items-end gap-4">
        <img v-if="isEdit" :src="avatarUrl" :alt="editableUser.username"
          class="w-16 h-16 rounded-2xl ring-4 ring-white dark:ring-gray-900 shadow-md shrink-0" />
        <div v-else
          class="w-16 h-16 rounded-2xl ring-4 ring-white dark:ring-gray-900 shadow-md shrink-0 bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <i class="fas fa-user-plus text-green-600 dark:text-green-400 text-xl"></i>
        </div>
        <div class="pb-2 min-w-0">
          <h3 class="text-base font-bold text-gray-900 dark:text-white truncate leading-tight">
            {{ isEdit ? editableUser.username : 'Novo Usuário' }}
          </h3>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <span v-if="isEdit && editableUser.position" class="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
              {{ editableUser.position }}
            </span>
            <span v-if="isEdit" class="flex items-center gap-1 text-xs"
              :class="editableUser.face_enabled ? 'text-green-500' : 'text-gray-400'">
              <i class="fas fa-users-viewfinder text-[10px]"></i>
              Facial {{ editableUser.face_enabled ? 'ativo' : 'inativo' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="saveUser" class="p-6 pt-4 space-y-5 max-h-[65vh] overflow-y-auto">

        <!-- Seção: Identidade -->
        <div>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Identidade</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2 space-y-1.5">
              <label class="field-label">Nome</label>
              <Input v-model="editableUser.username" type="text" placeholder="Nome completo" required />
            </div>
            <div class="space-y-1.5">
              <label class="field-label">Email</label>
              <Input v-model="editableUser.email" type="email" placeholder="email@exemplo.com" required />
            </div>
            <div class="space-y-1.5">
              <label class="field-label">Telefone <span class="text-gray-400 font-normal normal-case tracking-normal">(com DDD)</span></label>
              <Input v-model="editableUser.phone" type="tel" placeholder="(11) 99999-9999" />
            </div>
          </div>
        </div>

        <!-- Seção: Senha (criação) -->
        <div v-if="!isEdit">
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Acesso</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="field-label">Senha</label>
              <Input v-model="password" type="password" placeholder="Mín. 6 caracteres" required />
            </div>
            <div class="space-y-1.5">
              <label class="field-label">Confirmar senha</label>
              <Input v-model="passwordConfirm" type="password" placeholder="Repita a senha" required />
            </div>
          </div>
        </div>

        <!-- Seção: Cargo e localização -->
        <div>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Cargo e localização</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="field-label">Cargo</label>
              <UiSelect v-model="editableUser.position" :options="positionsOptions" placeholder="Selecione o cargo" />
            </div>
            <div class="space-y-1.5">
              <label class="field-label">Cidade</label>
              <UiSelect v-model="editableUser.city" :options="citiesOptions" placeholder="Selecione a cidade" />
            </div>
            <!-- Descrição do cargo -->
            <div v-if="positionDescription" class="sm:col-span-2">
              <div class="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                <i class="fas fa-circle-info text-blue-400 text-xs mt-0.5 shrink-0"></i>
                <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{{ positionDescription }}</p>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="field-label">Nascimento</label>
              <Input v-model="editableUser.birth_date" type="date" required />
            </div>
            <div class="space-y-1.5">
              <label class="field-label">Superior direto</label>
              <UiSelect v-model="managerIdProxy" :options="managerOptions" placeholder="Selecione o superior" />
            </div>
          </div>
        </div>

        <!-- Seção: Configurações (edit only) -->
        <div v-if="isEdit">
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Configurações</p>
          <div class="space-y-2.5">

            <!-- Perfil (admin only) -->
            <div v-if="isAdmin" class="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <i class="fas fa-shield-halved text-gray-500 dark:text-gray-400 text-xs"></i>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Perfil de acesso</p>
                </div>
              </div>
              <UiSelect v-model="editableUser.role"
                :options="[{ label: 'Usuário', value: 'user' }, { label: 'Admin', value: 'admin' }]"
                placeholder="Selecione" class="w-32" />
            </div>

            <!-- Organograma (admin only) -->
            <div v-if="isAdmin" class="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <i class="fas fa-sitemap text-purple-500 text-xs"></i>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Exibir no organograma</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ editableUser.show_in_organogram ? 'Aparece no organograma' : 'Não aparece' }}
                  </p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" v-model="editableUser.show_in_organogram" class="sr-only peer" />
                <div class="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-purple-600
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                  after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                  peer-checked:after:translate-x-5 peer-focus:ring-2 peer-focus:ring-purple-500/30 relative"></div>
              </label>
            </div>

            <!-- Status -->
            <div class="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  :class="editableUser.status ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
                  <i class="text-xs" :class="editableUser.status ? 'fas fa-circle-check text-green-500' : 'fas fa-circle-xmark text-red-400'"></i>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Acesso ao sistema</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ editableUser.status ? 'Usuário pode realizar login' : 'Login bloqueado' }}
                  </p>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" v-model="editableUser.status" class="sr-only peer" />
                <div class="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-green-500
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                  after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                  peer-checked:after:translate-x-5 peer-focus:ring-2 peer-focus:ring-green-500/30 relative"></div>
              </label>
            </div>

          </div>
        </div>

        <!-- Status toggle (criação) -->
        <div v-if="!isEdit" class="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              :class="editableUser.status ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'">
              <i class="text-xs" :class="editableUser.status ? 'fas fa-circle-check text-green-500' : 'fas fa-circle-xmark text-red-400'"></i>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Acesso ao sistema</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ editableUser.status ? 'Usuário pode realizar login' : 'Login bloqueado' }}
              </p>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" v-model="editableUser.status" class="sr-only peer" />
            <div class="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-green-500
              after:content-[''] after:absolute after:top-[2px] after:left-[2px]
              after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
              peer-checked:after:translate-x-5 peer-focus:ring-2 peer-focus:ring-green-500/30 relative"></div>
          </label>
        </div>

        <!-- Resetar Senha (admin only, somente contas INTERNAL, apenas em edição) -->
        <div v-if="isEdit && isAdmin"
          class="flex items-center justify-between px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-900/10">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <i class="fas fa-key text-red-500 text-xs"></i>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Resetar Senha</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gera e substitui por uma senha aleatória segura</p>
            </div>
          </div>
          <button
            type="button"
            :disabled="resetPwdModal.loading"
            @click.prevent="handleResetPassword"
            class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed">
            <i :class="resetPwdModal.loading ? 'fas fa-spinner animate-spin' : 'fas fa-arrows-rotate'" class="text-xs"></i>
            {{ resetPwdModal.loading ? 'Gerando...' : 'Resetar' }}
          </button>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" outlined @click="$emit('close')">Cancelar</Button>
          <Button type="submit">
            <i class="fas fa-check text-xs mr-1.5"></i>
            {{ isEdit ? 'Salvar alterações' : 'Criar usuário' }}
          </Button>
        </div>
      </form>
    </div>
  </div>

  <!-- ── Modal: senha gerada pelo admin ── -->
  <Teleport to="body">
    <div v-if="resetPwdModal.open"
      class="fixed inset-0 z-[70] flex items-center justify-center p-4"
      @click="closeResetPwdModal">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        class="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6"
        @click.stop>

        <!-- Header -->
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <i class="fas fa-key text-red-500 text-base"></i>
          </div>
          <div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white">Senha Resetada</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Copie e compartilhe com o usuário</p>
          </div>
        </div>

        <!-- Senha gerada -->
        <div class="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-4">
          <p class="flex-1 text-center font-mono text-lg font-bold text-gray-900 dark:text-white tracking-widest break-all">
            {{ resetPwdModal.password }}
          </p>
        </div>

        <!-- Aviso -->
        <div class="flex items-start gap-2 p-3 mb-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
          <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
          <span>Esta senha <strong>não será exibida novamente</strong>. Copie antes de fechar.</span>
        </div>

        <!-- Ações -->
        <div class="flex gap-3">
          <Button type="button" class="flex-1" @click="copyResetPassword">
            <i :class="resetPwdModal.copied ? 'fas fa-check' : 'fas fa-copy'" class="mr-2 text-xs"></i>
            {{ resetPwdModal.copied ? 'Copiado!' : 'Copiar senha' }}
          </Button>
          <Button type="button" outlined @click="closeResetPwdModal">Fechar</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.field-label {
  @apply text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide;
}
</style>
