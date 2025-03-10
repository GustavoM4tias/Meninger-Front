<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../../stores/Auth/authStore';
import { updateMeInfo } from '../../utils/Auth/apiAuth';
import Input from '../UI/Input.vue';
import Button from '../UI/Button.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();
const authStore = useAuthStore();

const editableUser = ref({
    username: '',
    email: '',
    city: '',
    position: '',
    birth_date: '',
    status: ''
});

const message = ref('');
const isDisabled = ref(true);

const preencherEditableUser = () => {
    if (authStore.user) {
        editableUser.value = {
            username: authStore.user.username,
            email: authStore.user.email,
            city: authStore.user.city,
            position: authStore.user.position,
            birth_date: authStore.user.birth_date ? authStore.user.birth_date.split('T')[0] : '',
            status: authStore.user.status
        };
    }
};

watch(() => authStore.user, preencherEditableUser);

onMounted(async () => {
    if (!authStore.user) {
        await authStore.fetchUserInfo();
    }
    preencherEditableUser();
});

const updateUser = async () => {
    try {
        const response = await updateMeInfo(
            editableUser.value.username,
            editableUser.value.email,
            editableUser.value.position,
            editableUser.value.city,
            new Date(editableUser.value.birth_date).toISOString(),
            editableUser.value.status
        );
        message.value = response.message;
        await authStore.fetchUserInfo();
        preencherEditableUser();
        toast.success("Atualizado com Sucesso!");
    } catch (error) {
        console.error(error);
    }
};

const toggleDisabled = () => {
    isDisabled.value = !isDisabled.value;
};
</script>

<template>
    <form @submit.prevent="updateUser">
        <div :class="{ 'hidden bg-red-400': !isDisabled }" class="absolute">
            <i class="fas fa-pen text-3xl ps-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="toggleDisabled"></i>
        </div>

        <div
            class="profile-img relative flex bg-gray-400 rounded-full w-28 h-28 m-auto mt-3 overflow-hidden shadow-sm group z-20">
            <!-- <div
                class="edit opacity-0 group-hover:opacity-75 duration-200 cursor-pointer bg-gray-900 absolute flex z-10 w-full h-full">
                <i class="fas fa-pen text-white m-auto text-4xl"></i>
            </div> -->
            <p class="text-gray-100 m-auto text-6xl">
                {{ authStore.user?.username?.split(" ").slice(0, 2).map(name => name[0].toUpperCase()).join("") }}
            </p>
        </div>
        <p class="text-center text-sm text-gray-700 dark:text-gray-200 font-semibold my-2">
            Criado em {{ new Date(authStore.user?.created_at).toLocaleDateString("pt-BR") }}
        </p>
        <Input v-model="editableUser.username" :disabled="isDisabled" type="text" placeholder="Nome" required />
        <Input v-model="editableUser.email" :disabled="isDisabled" type="email" placeholder="Email" required />
        <Input v-model="editableUser.birth_date" :disabled="isDisabled" type="date" placeholder="Data de Nascimento"
            required />
        <Input v-model="editableUser.city" :disabled="isDisabled" type="text" placeholder="Cidade" required />
        <Input v-model="editableUser.position" :disabled="isDisabled" type="text" placeholder="Cargo" required />

        <div class="flex gap-2 -mb-5" :class="{ 'hidden': isDisabled }">
            <Button :disabled="isDisabled" type="reset" @click="toggleDisabled">Cancelar</Button>
            <Button :disabled="isDisabled" type="submit">Atualizar</Button>
        </div>
    </form>
    <p v-if="message" class="success-message text-green-400">{{ message }}</p>
</template>
