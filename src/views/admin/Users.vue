<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { updateUserInfo } from '../../utils/apiAuth';
import { useToast } from 'vue-toastification';
import Input from '../../components/UI/Input.vue';
import Button from '../../components/UI/Button.vue';

const toast = useToast();
const store = useAuthStore();
const users = ref([]);
const editableUser = ref(null); // Armazena o usuário atualmente sendo editado

onMounted(async () => {
    try {
        const fetchedUsers = await store.getAllUsers();
        users.value = fetchedUsers.data;
    } catch (error) {
        console.error('Erro ao carregar os usuários:', error);
    }
});

const startEditing = (user) => {
    editableUser.value = { ...user }; // Clona os dados do usuário para edição
};

const cancelEditing = () => {
    editableUser.value = null; // Fecha o formulário de edição
};

const saveUser = async () => {
    try {
        await updateUserInfo(
            editableUser.value.id,
            editableUser.value.username,
            editableUser.value.email,
            editableUser.value.position,
            editableUser.value.city
        );
        toast.success("Usuário atualizado com sucesso!")
        // Atualizar a lista de usuários
        const fetchedUsers = await store.getAllUsers();
        users.value = fetchedUsers.data;

        cancelEditing(); // Fecha o formulário de edição
    } catch (error) {
        toast.error('Erro ao atualizar o usuário:', error);
    }
};
</script>

<template>
    <div class="bg-gray-300 dark:bg-gray-800">
        <h1>Lista de Usuários</h1>

        <ul v-if="users.length">
            <li v-for="user in users" :key="user.id" class="">
                <!-- <div v-if="editableUser?.id !== user.id">
                    <p>ID: {{ user.id }} - Username: {{ user.username }} - Email: {{ user.email }} - Cargo: {{
                        user.position }} - Cidade: {{ user.city }}</p>
                    <button class="text-blue-500 underline" @click="startEditing(user)">Editar</button>
                </div> -->

                <div v-if="editableUser?.id !== user.id">
                    <div class="bg-gray-600 lg:mx-48 m-4 rounded-2xl p-4">
                        <div
                            class="profile-img relative flex bg-gray-400 rounded-full w-16 h-16 m-auto mt-3 overflow-hidden shadow">
                            <p class="text-gray-100 m-auto text-3xl">{{ authStore.user?.username?.split(" ").slice(0,
                                2).map(name =>
                                    name[0].toUpperCase()).join("") }}</p>
                        </div>

                        <p>ID: {{ user.id }} - Username: {{ user.username }} - Email: {{ user.email }} - Cargo: {{
                            user.position }} - Cidade: {{ user.city }}</p>
                        <button class="text-blue-500 underline" @click="startEditing(user)">Editar</button>

                    </div>
                </div>

                <div v-else>
                    <div
                        class="fixed top-0 left-0 h-screen w-full bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
                        <div class="relative bg-gray-700 pt-10 px-4 rounded-2xl">
                            <form>
                                <i class="fas fa-xmark absolute top-0 left-0 p-3 text-4xl cursor-pointer hover:text-gray-400"
                                    @click="cancelEditing"></i>

                                <Input v-model="editableUser.username" label="Nome de Usuário" type="text"
                                    placeholder="Nome" required />
                                <Input v-model="editableUser.email" label="Email" type="email" placeholder="Email"
                                    required />

                                <div class="flex gap-3">
                                    <Input v-model="editableUser.position" label="Cargo" type="text" placeholder="Cargo"
                                        required />
                                    <Input v-model="editableUser.city" label="Cidade" type="text" placeholder="Cidade"
                                        required />
                                </div>

                                <div class="flex gap-3">
                                    <Button type="submit" class="bg-green-500 hover:bg-green-600"
                                        @click="saveUser">Salvar</Button>
                                </div>

                            </form>
                        </div>
                    </div>
                </div>

            </li>
        </ul>

    </div>
</template>
