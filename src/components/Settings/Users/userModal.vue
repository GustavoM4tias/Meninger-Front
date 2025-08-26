<script setup>
import { ref, watchEffect, onMounted } from 'vue';
import { updateUserInfo } from '../../../utils/Auth/apiAuth';
import { useAuthStore } from '../../../stores/Auth/authStore';
import Input from '../../../components/UI/Input.vue';
import Button from '../../../components/UI/Button.vue';
import { useToast } from 'vue-toastification';

const authStore = useAuthStore();
const toast = useToast();
const props = defineProps({
  user: Object
});
const emit = defineEmits(['close', 'reload']);
const editableUser = ref({ ...props.user });
// console.log(editableUser)

watchEffect(() => {
  if (editableUser.value.birth_date) {
    editableUser.value.birth_date = editableUser.value.birth_date.split('T')[0];
  }
});

const saveUser = async () => {
  try {
    await updateUserInfo(
      editableUser.value.id,
      editableUser.value.username,
      editableUser.value.email,
      editableUser.value.position,
      editableUser.value.manager_id,
      editableUser.value.city,
      editableUser.value.birth_date,
      editableUser.value.status
    );
    emit('close');
    emit('reload');
    toast.success('Usuário atualizado com sucesso!');
  } catch (error) {
    toast.error(`Erro ao atualizar o usuário: ${error.message}`);
  }
};

const cancelEditing = () => {
  emit('close');
};

// Buscar informações do gerente e logar no console:
onMounted(async () => {
  if (editableUser.value.manager_id) {
    await authStore.fetchUserById(editableUser.value.manager_id);
  }
});

</script>

<template>
  <div class="fixed top-0 left-0 w-full h-screen bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
    <div class="relative w-[300px] sm:w-[600px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pt-10 m-3 rounded-2xl shadow-lg">

      <div class="flex border-b p-2 border-gray-200 dark:border-gray-700">
        <h3 class="text-lg md:text-2xl font-semibold absolute top-1 md:top-0 left-0 p-3 ps-4">
          Editando {{ editableUser.username }}
        </h3>
        <i class="fas fa-xmark absolute top-0 right-0 p-3 text-4xl cursor-pointer hover:text-gray-600 dark:hover:text-gray-400"
          @click="cancelEditing"></i>
      </div>

      <form @submit.prevent="saveUser" class="px-6 py-4">
        <Input v-model="editableUser.username" label="Nome de Usuário" type="text" placeholder="Nome" />
        <Input v-model="editableUser.email" label="Email" type="email" placeholder="Email" />
        <div class="flex gap-3">
          <Input v-model="editableUser.position" label="Cargo" type="text" placeholder="Cargo" />
          <Input v-model="editableUser.city" label="Cidade" type="text" placeholder="Cidade" />
        </div>
        <div class="flex gap-3">
          <Input v-if="editableUser.manager" v-model="editableUser.manager.username" label="Superior" type="text"
            placeholder="Superior" />
        </div>
        <Input v-model="editable" label="Data de Nascimento" type="date" placeholder="Data de Nascimento"
          required />

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

        <p class="text-xs text-gray-500 dark:text-gray-400">
          Usuários inativos não conseguem fazer login no sistema
        </p>

      </form>
      <div class="flex items-center justify-end p-3 border-t border-gray-200 dark:border-gray-700">
        <div class="flex gap-3">
          <Button type="button" @click="cancelEditing"
            customClass="bg-blue-400 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600">Cancelar</Button>
          <Button type="submit"
            customClass="bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600 truncate">Salvar alterações</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- <script setup>
import { ref, watchEffect, onMounted } from 'vue';
import { updateUserInfo } from '../../../utils/Auth/apiAuth';
import { useAuthStore } from '../../../stores/Auth/authStore';
import Input from '../../../components/UI/Input.vue';
import Button from '../../../components/UI/Button.vue';
import { useToast } from 'vue-toastification';

const authStore = useAuthStore();
const toast = useToast();

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'reload']);

const editableUser = ref({ ...props.user });
const isLoading = ref(false);

// Formatar data de nascimento
watchEffect(() => {
  if (editableUser.value.birth_date) {
    editableUser.value.birth_date = editableUser.value.birth_date.split('T')[0];
  }
});

const saveUser = async () => {
  if (isLoading.value) return;

  try {
    isLoading.value = true;
    await updateUserInfo(
      editableUser.value.id,
      editableUser.value.username,
      editableUser.value.email,
      editableUser.value.position,
      editableUser.value.manager_id,
      editableUser.value.city,
      editableUser.value.birth_date,
      editableUser.value.status
    );

    toast.success('Usuário atualizado com sucesso!');
    emit('close');
    emit('reload');
  } catch (error) {
    toast.error(`Erro ao atualizar o usuário: ${error.message}`);
  } finally {
    isLoading.value = false;
  }
};

const cancelEditing = () => {
  emit('close');
};

const handleBackdropClick = (event) => {
  if (event.target === event.currentTarget) {
    cancelEditing();
  }
};

// Buscar informações do gerente
onMounted(async () => {
  if (editableUser.value.manager_id) {
    await authStore.fetchUserById(editableUser.value.manager_id);
  }
});
</script>

<template>
  <div class="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4"
    @click="handleBackdropClick">
    <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
          Editar Usuário
        </h3>
        <button @click="cancelEditing"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <form @submit.prevent="saveUser" class="p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input v-model="editableUser.username" label="Nome de Usuário" type="text" placeholder="Nome completo"
            required />
          <Input v-model="editableUser.email" label="Email" type="email" placeholder="email@exemplo.com" required />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input v-model="editableUser.position" label="Cargo" type="text" placeholder="Cargo do usuário" />
          <Input v-model="editableUser.city" label="Cidade" type="text" placeholder="Cidade onde trabalha" />
        </div>
        <div v-if="editableUser.manager" class="grid grid-cols-1">
          <Input v-model="editableUser.manager.username" label="Superior" type="text" placeholder="Nome do superior"
            readonly class="bg-gray-50 dark:bg-gray-700" />
        </div>

        <div class="grid grid-cols-1">
          <Input v-model="editableUser.birth_date" label="Data de Nascimento" type="date" required />
        </div>

        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status da Conta
          </label>
          <div class="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="editableUser.status" class="sr-only peer" />
              <div
                class="relative w-16 h-8 bg-red-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-red-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500 dark:peer-checked:bg-green-600">
              </div>
              <span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ editableUser.status ? 'Conta Ativa' : 'Conta Inativa' }}
              </span>
            </label>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Usuários inativos não conseguem fazer login no sistema
          </p>
        </div>
      </form>

      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
        <button type="button" @click="cancelEditing"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
          Cancelar
        </button>
        <button @click="saveUser" :disabled="isLoading"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors flex items-center gap-2">
          <svg v-if="isLoading" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          {{ isLoading ? 'Salvando...' : 'Salvar Alterações' }}
        </button>
      </div>
    </div>
  </div>
</template> -->