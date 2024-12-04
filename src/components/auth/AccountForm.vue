<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { updateMeInfo } from '../../utils/apiAuth';
import Input from '../UI/Input.vue';
import Button from '../UI/Button.vue';

const authStore = useAuthStore();

const editableUser = ref({
    username: '',
    email: '',
    city: '',
    position: ''
});

const message = ref('');

const preencherEditableUser = () => {
    if (authStore.user) {
        editableUser.value = {
            username: authStore.user.username || '',
            email: authStore.user.email || '',
            city: authStore.user.city || '',
            position: authStore.user.position || '',
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
            editableUser.value.city
        );
        message.value = response.message;
        await authStore.fetchUserInfo();
        preencherEditableUser();
    } catch (error) {
        console.error(error);
    }
};
</script>

<template>
    <form @submit.prevent="updateUser">
        <div
            class="profile-img relative flex bg-gray-400 rounded-full w-28 h-28 m-auto mt-3 overflow-hidden shadow-sm group z-20">
            <div
                class="edit opacity-0 group-hover:opacity-75 duration-200 cursor-pointer bg-gray-900 absolute flex z-10 w-full h-full">
                <i class="fas fa-pen text-white m-auto text-4xl"></i>
            </div>
            <p class="text-gray-100 m-auto text-6xl">
                {{ authStore.user?.username?.split(" ").slice(0, 2).map(name => name[0].toUpperCase()).join("") }}
            </p>
        </div>
        <p class="text-center text-sm text-gray-200 font-semibold my-2">
            Criado em {{ new Date(authStore.user?.created_at).toLocaleDateString("pt-BR") }}
        </p>
        <Input v-model="editableUser.username" type="text" placeholder="Nome" required />
        <Input v-model="editableUser.email" type="email" placeholder="Email" required />
        <Input v-model="editableUser.city" type="text" placeholder="Cidade" required />
        <Input v-model="editableUser.position" type="text" placeholder="Cargo" required />
        <Button type="submit">Atualizar</Button>
    </form>
    <p v-if="message" class="success-message text-green-400">{{ message }}</p>
</template>
