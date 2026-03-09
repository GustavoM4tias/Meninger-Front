<script setup>
import { ref, watchEffect, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import UiSelect from '@/components/UI/Select.vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';

const authStore = useAuthStore();
const toast = useToast();

const props = defineProps({
  user: { type: Object, default: null },
});
const emit = defineEmits(['close', 'reload']);

const isEdit = computed(() => !!props.user);

const baseUser = {
  id: undefined, username: '', email: '', position: '', city: '',
  birth_date: '', status: true, role: 'user', manager_id: null, face_enabled: false,
};

const editableUser = ref(props.user ? { ...props.user } : { ...baseUser });
const allUsers = ref([]);
const password = ref('');
const passwordConfirm = ref('');
const positionsOptions = ref([]);
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
      positionsOptions.value = list.filter(p => p?.active && p?.is_internal)
        .map(p => ({ label: p.name, value: p.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
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

const saveUser = async () => {
  const u = editableUser.value;
  if (!u.username?.trim() || !u.email?.trim() || !u.position || !u.city || !u.birth_date) {
    toast.error('Preencha todos os campos obrigatórios.'); return;
  }
  try {
    if (isEdit.value) {
      await authStore.updateUser({ id: u.id, username: u.username, email: u.email, position: u.position, manager_id: u.manager_id, city: u.city, birth_date: u.birth_date, status: u.status, role: u.role });
      toast.success('Usuário atualizado com sucesso!');
    } else {
      if (!password.value || password.value.length < 6) { toast.error('Senha com pelo menos 6 caracteres.'); return; }
      if (password.value !== passwordConfirm.value) { toast.error('As senhas não conferem.'); return; }
      await authStore.createUser({ username: u.username, email: u.email, password: password.value, position: u.position, city: u.city, birth_date: u.birth_date });
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
      class="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
      @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl flex items-center justify-center"
            :class="isEdit ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'">
            <i class="text-sm"
              :class="isEdit ? 'fas fa-user-pen text-blue-600 dark:text-blue-400' : 'fas fa-user-plus text-green-600 dark:text-green-400'"></i>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {{ isEdit ? `Editando ${editableUser.username}` : 'Novo Usuário' }}
            </h3>
            <p v-if="isEdit" class="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <i class="fas fa-users-viewfinder text-xs"
                :class="editableUser.face_enabled ? 'text-green-500' : 'text-gray-400'"></i>
              Facial {{ editableUser.face_enabled ? 'ativo' : 'inativo' }}
            </p>
          </div>
        </div>

        <button type="button" @click="$emit('close')"
          class="w-8 h-8 rounded-xl grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <i class="fas fa-times text-sm"></i>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="saveUser" class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Nome -->
          <div class="sm:col-span-2 space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nome de
              usuário</label>
            <Input v-model="editableUser.username" type="text" placeholder="Nome completo" required />
          </div>

          <!-- Email -->
          <div class="sm:col-span-2 space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
            <Input v-model="editableUser.email" type="email" placeholder="email@exemplo.com" required />
          </div>

          <!-- Senha (criação) -->
          <template v-if="!isEdit">
            <div class="space-y-1.5">
              <label
                class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Senha</label>
              <Input v-model="password" type="password" placeholder="Mín. 6 caracteres" required />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Confirmar
                senha</label>
              <Input v-model="passwordConfirm" type="password" placeholder="Repita a senha" required />
            </div>
          </template>

          <!-- Cargo -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cargo</label>
            <UiSelect v-model="editableUser.position" :options="positionsOptions" placeholder="Selecione o cargo" />
          </div>

          <!-- Cidade -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cidade</label>
            <UiSelect v-model="editableUser.city" :options="citiesOptions" placeholder="Selecione a cidade" />
          </div>

          <!-- Nascimento -->
          <div class="space-y-1.5">
            <label
              class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nascimento</label>
            <Input v-model="editableUser.birth_date" type="date" required />
          </div>

          <!-- Superior -->
          <div class="space-y-1.5">
            <label
              class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Superior</label>
            <UiSelect v-model="managerIdProxy" :options="managerOptions" placeholder="Selecione o superior" />
          </div>

          <!-- Role (edit only) -->
          <div v-if="isEdit" class="space-y-1.5">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Perfil</label>
            <UiSelect v-model="editableUser.role"
              :options="[{ label: 'Usuário', value: 'user' }, { label: 'Admin', value: 'admin' }]"
              placeholder="Selecione" />
          </div>

          <!-- Status toggle -->
          <div class="sm:col-span-2">
            <div
              class="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div>
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Acesso ao sistema</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ editableUser.status ? 'Usuário pode realizar login' : 'Login bloqueado' }}
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="editableUser.status" class="sr-only peer" />
                <div class="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-blue-600
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                  after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                  peer-checked:after:translate-x-5 peer-focus:ring-2 peer-focus:ring-blue-500/30 relative"></div>
                <span class="ml-2 text-sm font-medium"
                  :class="editableUser.status ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
                  {{ editableUser.status ? 'Ativo' : 'Inativo' }}
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" outlined @click="$emit('close')">Cancelar</Button>
          <Button type="submit">
            <i class="fas fa-check text-xs mr-1.5"></i>
            {{ isEdit ? 'Salvar alterações' : 'Criar usuário' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>