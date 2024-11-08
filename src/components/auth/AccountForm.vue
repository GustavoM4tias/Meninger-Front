<template>
    <form @submit.prevent="updateUser">
        <div
            class="profile-img relative flex bg-gray-400 rounded-full w-28 h-28 m-auto mt-3 overflow-hidden shadow-sm group z-20">
            <div
                class="edit opacity-0 group-hover:opacity-75 duration-200 cursor-pointer bg-gray-900 absolute flex z-10 w-full h-full">
                <i class="fas fa-pen text-white m-auto text-4xl"></i>
            </div>
            <p class="text-gray-100 m-auto text-6xl">{{ user?.username?.split(" ").slice(0,
                2).map(name =>
                    name[0].toUpperCase()).join("") }}</p>
        </div>
        <p class="text-center text-sm text-gray-200 font-semibold my-2">Criado em {{ new
            Date(user?.created_at).toLocaleDateString("pt-BR") }}</p>
        <!-- <p class="text-center text-sm text-gray-200 font-semibold my-2">Criado em {{ new
            Date(user?.created_at).toLocaleDateString("pt-BR") }} às {{ new
                Date(user?.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) }}</p> -->
        <Input v-model="editableUser.username" type="text" placeholder="Nome" required />
        <Input v-model="editableUser.email" type="email" placeholder="Email" required />
        <Input v-model="editableUser.city" type="text" placeholder="Cidade" required />
        <Input v-model="editableUser.position" type="text" placeholder="Cargo" required />
        <Button type="submit">Atualizar</Button>
    </form>

    <p v-if="message" class="success-message text-green-400">{{ message }}</p>
    <p v-if="errorMessage" class="error-message text-red-500">{{ errorMessage }}</p>

</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useFetchUserInfo } from '../../utils/fetchUserInfo';
import { updateUserInfo } from '../../utils/apiAuth';
import Input from '../UI/Input.vue';
import Button from '../UI/Button.vue';

const userStore = useUserStore();
const router = useRouter();
const { user, errorMessage, fetchUserInfo } = useFetchUserInfo();

const editableUser = ref({
    username: '',
    email: '',
    city: '',
    position: ''
});
const message = ref('');
const errorMessageLocal = ref('');

// Atualiza editableUser com os dados do usuário quando user é carregado
watch(user, (newUser) => {
    if (newUser) {
        editableUser.value = { ...newUser };
    }
});

onMounted(() => {
    if (userStore.isAuthenticated()) {
        fetchUserInfo();
    } else {
        errorMessageLocal.value = 'Usuário não está autenticado.';
        router.push('/login');
    }
});

// Função para atualizar informações do usuário
const updateUser = async () => {
    try {
        const response = await updateUserInfo(
            editableUser.value.username,
            editableUser.value.email,
            editableUser.value.position,
            editableUser.value.city
        );
        message.value = response.message || 'Informações atualizadas com sucesso';
        await fetchUserInfo(); // Atualiza os dados do usuário após a atualização
    } catch (error) {
        errorMessageLocal.value = error.message;
    }
};
</script>
