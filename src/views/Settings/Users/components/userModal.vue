<script setup>
import { ref, watchEffect, onMounted, computed } from 'vue';
import { updateUserInfo } from '@/utils/Auth/apiAuth';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import UiSelect from '@/components/UI/Select.vue';
import { useToast } from 'vue-toastification';

const authStore = useAuthStore();
const toast = useToast();

const props = defineProps({ user: Object });
const emit = defineEmits(['close', 'reload']);

const editableUser = ref({ ...props.user });
const allUsers = ref([]);

// Normaliza birth_date para o <input type="date">
watchEffect(() => {
  if (editableUser.value?.birth_date) {
    const d = new Date(editableUser.value.birth_date);
    if (!isNaN(d)) {
      const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        .toISOString().split('T')[0];
      editableUser.value.birth_date = iso;
    }
  }
});

// Carrega usuários para popular o select de manager
onMounted(async () => {
  try {
    const res = await authStore.getAllUsers();
    allUsers.value = res?.data || [];
  } catch (e) {
    console.error(e);
  }
});

const availableManagers = computed(() =>
  allUsers.value.filter(u => u.id !== editableUser.value.id)
);

// Opções para o UiSelect (value como STRING p/ bater com <select> nativo)
const managerOptions = computed(() => [
  { label: 'Sem superior', value: '' },
  ...availableManagers.value.map(u => ({
    label: `${u.username} (${u.position || 'Sem cargo'})`,
    value: String(u.id),
  })),
]);

// Proxy p/ o v-model do UiSelect (STRING do select -> number/null no state)
const managerIdProxy = computed({
  get: () => String(editableUser.value.manager_id ?? ''),
  set: (val) => {
    if (val === '') editableUser.value.manager_id = null;
    else editableUser.value.manager_id = Number(val);
  }
});

const saveUser = async () => {
  try {
    await updateUserInfo(
      editableUser.value.id,
      editableUser.value.username,
      editableUser.value.email,
      editableUser.value.position,
      editableUser.value.manager_id,   // number ou null
      editableUser.value.city,
      editableUser.value.birth_date,
      editableUser.value.status,
      editableUser.value.role          // mantenha se o backend exigir
    );
    emit('close');
    emit('reload');
    toast.success('Usuário atualizado com sucesso!');
  } catch (error) {
    toast.error(`Erro ao atualizar o usuário: ${error.message}`);
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
          Editando {{ editableUser.username }}
          <i class="fas fa-users-viewfinder text-2xl"
            :class="editableUser.face_enabled ? 'text-green-500' : 'text-red-500'"
            v-tippy="editableUser.face_enabled ? 'Reconhecimento facial ativo' : 'Reconhecimento facial inativo'" />
        </h3>
        <i class="fas fa-xmark absolute top-0 right-0 p-3 text-4xl cursor-pointer hover:text-gray-600 dark:hover:text-gray-400"
          @click="cancelEditing" />
      </div>

      <!-- Botão Salvar dentro do form para garantir submit -->
      <form @submit.prevent="saveUser" class="px-6 py-4">
        <!-- Grid dos campos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">

          <!-- Nome -->
          <div class="md:col-span-2">
            <Input v-model="editableUser.username" label="Nome de Usuário" type="text" placeholder="Nome" />
          </div>

          <!-- Email -->
          <div class="md:col-span-2">
            <Input v-model="editableUser.email" label="Email" type="email" placeholder="Email" />
          </div>

          <!-- Cargo -->
          <div>
            <Input v-model="editableUser.position" label="Cargo" type="text" placeholder="Cargo" />
          </div>

          <!-- Cidade -->
          <div>
            <Input v-model="editableUser.city" label="Cidade" type="text" placeholder="Cidade" />
          </div>

          <!-- Data de Nascimento -->
          <div>
            <Input v-model="editableUser.birth_date" label="Data de Nascimento" type="date"
              placeholder="Data de Nascimento" required />
          </div>

          <!-- Manager -->
          <div>
            <UiSelect v-model="managerIdProxy" :options="managerOptions" label="Selecione o superior"
              placeholder="Selecione o superior" classes="w-full" />
          </div>

          <!-- Login -->
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
            customClass="bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600 truncate">
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
