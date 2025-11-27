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
  user: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'reload']);

const isEdit = computed(() => !!props.user);

// estado base pro usuário novo
const baseUser = {
  id: undefined,
  username: '',
  email: '',
  position: '',
  city: '',
  birth_date: '',
  status: true,
  role: 'user',
  manager_id: null,
  face_enabled: false,
};

const editableUser = ref(props.user ? { ...props.user } : { ...baseUser });
const allUsers = ref([]);

// senha apenas para criação
const password = ref('');
const passwordConfirm = ref('');

// opções de cargo e cidade vindas do backend
const positionsOptions = ref([]);
const citiesOptions = ref([]);

// Normaliza birth_date para o <input type="date">
watchEffect(() => {
  if (editableUser.value && editableUser.value.birth_date) {
    const v = editableUser.value.birth_date;

    // Caso já esteja correto, não mexe
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return;

    // Se vier algo como 2005-03-02T00:00:00.000Z ou similar
    if (typeof v === 'string') {
      editableUser.value.birth_date = v.slice(0, 10);
    }
  }
});

// Carrega usuários (para superior), cargos e cidades
onMounted(async () => {
  try {
    // usuários para o select de superior
    const res = await authStore.getAllUsers();
    const dataUsers = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    allUsers.value = dataUsers || [];

    // posições
    try {
      const resPos = await fetch(`${API_URL}/admin/positions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const dataPos = await resPos.json();
      const listPos = Array.isArray(dataPos) ? dataPos : (dataPos && dataPos.data) || [];

      positionsOptions.value = listPos
        .filter(p => p && p.active && p.is_internal)
        .map(p => ({
          label: p.name,
          value: p.name, // gravamos o name em user.position
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch (e) {
      console.error('Erro ao carregar cargos:', e);
    }

    // cidades
    try {
      const resCity = await fetch(`${API_URL}/admin/user-cities`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const dataCity = await resCity.json();
      const listCity = Array.isArray(dataCity) ? dataCity : (dataCity && dataCity.data) || [];

      citiesOptions.value = listCity
        .filter(c => c && c.active)
        .map(c => ({
          label: c.uf ? `${c.name} - ${c.uf}` : c.name,
          value: c.name, // gravamos o name em user.city
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch (e) {
      console.error('Erro ao carregar cidades:', e);
    }
  } catch (e) {
    console.error(e);
  }
});

const availableManagers = computed(() =>
  allUsers.value.filter(u => u.id !== editableUser.value.id)
);

const managerOptions = computed(() => [
  { label: 'Sem superior', value: '' },
  ...availableManagers.value.map(u => ({
    label: `${u.username} (${u.position || 'Sem cargo'})`,
    value: String(u.id),
  })),
]);

const managerIdProxy = computed({
  get() {
    return String(editableUser.value.manager_id ?? '');
  },
  set(val) {
    if (val === '') {
      editableUser.value.manager_id = null;
    } else {
      editableUser.value.manager_id = Number(val);
    }
  },
});

const saveUser = async () => {
  try {
    if (
      !editableUser.value.username ||
      !editableUser.value.username.trim() ||
      !editableUser.value.email ||
      !editableUser.value.email.trim() ||
      !editableUser.value.position ||
      !editableUser.value.city ||
      !editableUser.value.birth_date
    ) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (isEdit.value) {
      // EDITAR
      await authStore.updateUser({
        id: editableUser.value.id,
        username: editableUser.value.username,
        email: editableUser.value.email,
        position: editableUser.value.position,
        manager_id: editableUser.value.manager_id,
        city: editableUser.value.city,
        birth_date: editableUser.value.birth_date,
        status: editableUser.value.status,
        role: editableUser.value.role,
      });
      toast.success('Usuário atualizado com sucesso!');
    } else {
      // CRIAR
      if (!password.value || password.value.length < 6) {
        toast.error('Defina uma senha com pelo menos 6 caracteres.');
        return;
      }
      if (password.value !== passwordConfirm.value) {
        toast.error('As senhas não conferem.');
        return;
      }

      await authStore.createUser({
        username: editableUser.value.username,
        email: editableUser.value.email,
        password: password.value,
        position: editableUser.value.position,
        city: editableUser.value.city,
        birth_date: editableUser.value.birth_date,
      });

      toast.success('Usuário criado com sucesso!');
    }

    emit('close');
    emit('reload');
  } catch (error) {
    const msg = error && error.message ? error.message : String(error);
    toast.error(`Erro ao salvar usuário: ${msg}`);
  }
};

const cancelEditing = () => emit('close');
</script>

<template>
  <div class="fixed top-0 left-0 w-full h-screen bg-gray-800 bg-opacity-75 flex justify-center items-center z-50"
    @click="cancelEditing">
    <div
      class="relative w-[300px] sm:w-[600px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pt-10 m-3 rounded-2xl shadow-lg"
      @click.stop>
      <div class="flex border-b p-2 border-gray-200 dark:border-gray-700">
        <h3 class="text-lg md:text-2xl font-semibold absolute top-1 md:top-0 left-0 p-3 ps-4">
          <template v-if="isEdit">
            Editando {{ editableUser.username }}
          </template>
          <template v-else>
            Criando Usuário
          </template>

          <i v-if="isEdit" class="fas fa-users-viewfinder text-2xl ps-2"
            :class="editableUser.face_enabled ? 'text-green-500' : 'text-red-500'"
            v-tippy="editableUser.face_enabled ? 'Reconhecimento facial ativo' : 'Reconhecimento facial inativo'" />
        </h3>
        <i class="fas fa-xmark absolute top-0 right-0 p-3 text-4xl cursor-pointer hover:text-gray-600 dark:hover:text-gray-400"
          @click="cancelEditing" />
      </div>

      <form @submit.prevent="saveUser" class="px-6 py-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <!-- Nome -->
          <div class="md:col-span-2">
            <Input v-model="editableUser.username" label="Nome de Usuário" type="text" placeholder="Nome" />
          </div>

          <!-- Email -->
          <div class="md:col-span-2">
            <Input v-model="editableUser.email" label="Email" type="email" placeholder="Email" />
          </div>

          <!-- Senha (apenas criação) -->
          <div v-if="!isEdit" class="md:col-span-2">
            <Input v-model="password" label="Senha" type="password" placeholder="Defina uma senha" required />
          </div>

          <div v-if="!isEdit" class="md:col-span-2">
            <Input v-model="passwordConfirm" label="Confirmar senha" type="password" placeholder="Repita a senha"
              required />
          </div>

          <!-- Cargo (select) -->
          <div>
            <UiSelect v-model="editableUser.position" :options="positionsOptions" label="Cargo"
              placeholder="Selecione o cargo" classes="w-full" />
          </div>

          <!-- Cidade (select) -->
          <div>
            <UiSelect v-model="editableUser.city" :options="citiesOptions" label="Cidade"
              placeholder="Selecione a cidade" classes="w-full" />
          </div>

          <!-- Data de Nascimento -->
          <div>
            <Input v-model="editableUser.birth_date" label="Data de Nascimento" type="date"
              placeholder="Data de Nascimento" required />
          </div>

          <!-- Superior -->
          <div>
            <UiSelect v-model="managerIdProxy" :options="managerOptions" label="Selecione o superior"
              placeholder="Selecione o superior" classes="w-full" />
          </div>

          <!-- Login ON/OFF -->
          <div class="md:col-span-2">
            <label class="block text-lg text-gray-700 dark:text-gray-200 font-semibold mt-2 mb-1">Login</label>
            <label class="relative inline-flex items-center cursor-pointer w-full">
              <input type="checkbox" v-model="editableUser.status" class="sr-only peer" />
              <div
                class="group text-xl md:text-2xl bg-rose-400 rounded-full after:duration-300 w-[300px] sm:w-full h-12 peer-checked:bg-emerald-500 after:rounded-full after:absolute after:bg-gray-50 after:h-10 after:w-32 md:after:w-36  after:top-1 after:left-1 peer-checked:after:translate-x-[115px] sm:peer-checked:after:translate-x-[24.9rem]">
                <i class="fas fa-lock-open absolute left-3.5 top-3"></i>
                <p class="absolute left-12 top-2.5 md:top-1.5">Ativo</p>
                <i class="fas fa-lock absolute right-3.5 top-3"></i>
                <p class="absolute right-12 top-2.5 md:top-1.5">Inativo</p>
              </div>
            </label>

            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Usuários inativos não conseguem fazer login no sistema
            </p>
          </div>
        </div>

        <!-- Botões -->
        <div class="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" @click="cancelEditing"
            customClass="bg-blue-400 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600">
            Cancelar
          </Button>

          <Button type="submit"
            :customClass="'bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600 truncate'">
            {{ isEdit ? 'Salvar alterações' : 'Criar usuário' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
