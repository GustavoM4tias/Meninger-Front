<script setup>
import { ref, watchEffect } from 'vue';
import { updateUserInfo } from '../../utils/apiAuth';
import Input from '../../components/UI/Input.vue';
import Button from '../../components/UI/Button.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();
const props = defineProps({
  user: Object
});
const emit = defineEmits(['close', 'reload']);
const editableUser = ref({ ...props.user });

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

</script>

<template>
  <div class="fixed top-0 left-0 w-full h-screen bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
    <div class="relative w-[300px] sm:w-[600px] bg-gray-200 dark:bg-gray-700 pt-10 px-4 m-3 rounded-2xl">
      <i class="fas fa-xmark absolute top-0 left-0 p-3 text-4xl cursor-pointer hover:text-gray-600 dark:hover:text-gray-400"
        @click="cancelEditing"></i>
      <form @submit.prevent="saveUser">
        <Input v-model="editableUser.username" label="Nome de Usuário" type="text" placeholder="Nome" required />
        <Input v-model="editableUser.email" label="Email" type="email" placeholder="Email" required />
        <div class="flex gap-3">
          <Input v-model="editableUser.position" label="Cargo" type="text" placeholder="Cargo" required />
          <Input v-model="editableUser.city" label="Cidade" type="text" placeholder="Cidade" required />
        </div>
        <Input v-model="editableUser.birth_date" label="Data de Nascimento" type="date" placeholder="Data de Nascimento"
          required />
        <label class="block text-lg text-gray-700 dark:text-gray-200 font-semibold mt-2 mb-1">Login</label>
        <label class="relative inline-flex items-center cursor-pointer w-full">
          <input type="checkbox" v-model="editableUser.status" :true-value="1" :false-value="0" class="sr-only peer" />
          <div
            class="group text-xl md:text-2xl bg-rose-400 rounded-full after:duration-300 w-[300px] sm:w-full h-12 peer-checked:bg-emerald-500 after:rounded-full after:absolute after:bg-gray-50 after:h-10 after:w-36 after:top-1 after:left-1 peer-checked:after:translate-x-[115px] sm:peer-checked:after:translate-x-[26rem]">
            <i class="fas fa-lock-open absolute left-3.5 top-3"></i>
            <p class="absolute left-12 top-2.5 md:top-1.5">Ativo</p>
            <i class="fas fa-lock absolute right-3.5 top-3"></i>
            <p class="absolute right-12 top-2.5 md:top-1.5">Inativo</p>
          </div>
        </label>
        <!-- {{ editableUser.status }}
        {{ editableUser.status === 1 ? 'Ativo' : 'Inativo' }} -->
        <div class="flex gap-3">
          <Button type="submit"
            class="bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600">Salvar</Button>
        </div>
      </form>
    </div>
  </div>
</template>