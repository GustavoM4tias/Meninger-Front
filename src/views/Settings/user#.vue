<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/Auth/authStore';
import { updateUserInfo } from '../../utils/Auth/apiAuth';
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
            editableUser.value.city,
            editableUser.value.status
        );
        const fetchedUsers = await store.getAllUsers();
        users.value = fetchedUsers.data;
        cancelEditing();
        console.log("Usuário atualizado com sucesso!")
    } catch (error) {
        console.error('Erro ao atualizar o usuário:', error);
    }
};
</script>

<template>
    <div class="bg-gray-300 dark:bg-gray-800">
        <ul v-if="users.length">
            <p class="lg:mx-48 mx-4 -mb-3">Total de Usuários: {{ users.length }}</p>
            <li v-for="user in users" :key="user.id">
                <div v-if="editableUser?.id !== user.id">
                    <div class="bg-gray-200 dark:bg-gray-600 flex justify-between items-center lg:mx-48 m-4 rounded-2xl p-4 md:px-8 shadow">
                        <div class="infos flex items-center overflow-hidden">
                            <div class="profile-img flex bg-gray-400 rounded-full min-w-12 h-12 md:w-16 md:h-16 text-xl md:text-3xl m-auto overflow-hidden shadow">
                                <p class="text-gray-100 m-auto">{{ user?.username?.split(" ").slice(0,
                                    2).map(name => name[0].toUpperCase()).join("") }}</p>
                            </div>
                            <div class="infos-user ms-2 md:ms-5 min-w-0">
                                <p class="text-gray-800 dark:text-gray-100 text-lg md:text-2xl font-semibold truncate">
                                    {{ user.username }} <br> </p>
                                <p class="text-gray-700 dark:text-gray-200 text-sm md:text-xl truncate">{{ user.email }}
                                </p>
                                <p v-if="user.city"
                                    class="text-gray-600 dark:text-gray-300 text-sm md:text-lg truncate">{{ user.city }}
                                    - {{ user.position }}</p>
                            </div>
                        </div>
                        <i class="fas fa-pen text-gray-500 dark:text-gray-300 text-xl md:text-3xl filter drop-shadow cursor-pointer" @click="startEditing(user)"></i>
                    </div>
                </div>

                <div v-else>
                    <div
                        class="fixed top-0 left-0 w-full h-screen bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
                        <div class="relative w-[300px] sm:w-auto bg-gray-200 dark:bg-gray-700 pt-10 p-4 m-3 rounded-2xl">
                            <form>
                                <i class="fas fa-xmark absolute top-0 left-0 p-3 text-4xl cursor-pointer hover:text-gray-600 dark:hover:text-gray-400"
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

                                <label class="block text-lg text-gray-700 dark:text-gray-200 font-semibold mt-2 mb-1">Login</label>
                                <label class="relative inline-flex items-center cursor-pointer w-full">
                                    <input 
                                        type="checkbox" v-model="editableUser.status"
                                        :true-value="1"
                                        :false-value="0"
                                        class="sr-only peer"
                                    >
                                    <div class="group text-2xl bg-rose-400 rounded-full after:duration-300 w-[300px] sm:w-full h-12 
                                    peer-checked:bg-emerald-500 after:rounded-full after:absolute after:bg-gray-50 
                                    after:h-10 after:w-36 after:top-1 after:left-1 peer-checked:after:translate-x-[115px] sm:peer-checked:after:translate-x-[20rem]">
                                        <i class="fas fa-lock-open absolute left-3.5 top-3"></i> <p class="absolute left-12 top-1.5">Ativo</p>
                                        <i class="fas fa-lock absolute right-3.5 top-3"></i> <p class="absolute right-12 top-1.5">Inativo</p>
                                    </div>
                                </label>
                                    {{ editableUser.status }}
                                    {{ editableUser.status === 1 ? 'Ativo' : 'Inativo' }}

                                <div class="flex gap-3">
                                    <Button type="submit" class="bg-emerald-500 hover:bg-emerald-600"
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
