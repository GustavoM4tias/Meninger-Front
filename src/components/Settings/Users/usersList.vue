<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../../stores/Auth/authStore';
import UserModal from './userModal.vue';
import UserList from './userList.vue';

const userStore = useAuthStore();
const users = ref([]);
const searchQuery = ref(''); // Campo para armazenar o texto de busca
const searchField = ref('username'); // Campo de busca (name ou email)
const filterCity = ref(''); // Filtro por cidade
const filterPosition = ref(''); // Filtro por cargo
const filterStatus = ref(''); // Filtro por status (ativo ou inativo)
const editableUser = ref(null);

const fetchUsers = async () => {
    try {
        const fetchedUsers = await userStore.getAllUsers();
        users.value = fetchedUsers.data;
        console.log(users.value) // console usuarios
    } catch (error) {
        console.error('Erro ao carregar os usuários:', error);
    }
};

// Computed property para filtrar os usuários com base no texto de busca
const filteredUsers = computed(() => {
    const query = searchQuery.value.toLowerCase();
    const field = searchField.value;

    return users.value.filter(user => {
        const matchesSearch = user[field]?.toLowerCase().includes(query);
        const matchesCity = !filterCity.value || user.city === filterCity.value;
        const matchesPosition = !filterPosition.value || user.position === filterPosition.value;
        const matchesStatus = filterStatus.value === '' || user.status === parseInt(filterStatus.value);

        return matchesSearch && matchesCity && matchesPosition && matchesStatus;
    });
});

onMounted(fetchUsers);

const startEditing = (user) => {
    editableUser.value = { ...user };
};

const closeModal = () => {
    editableUser.value = null;
};
</script>

<template>
    <div class="pt-5">

        <!-- Campo de busca e seleção de campo -->
        <div class="mx-4 lg:mx-36 mb-5 bg-gray-200 dark:bg-gray-500 shadow-sm px-8 py-2 md:px-20 md:py-4 rounded-3xl md:rounded-full">
            <!-- Campo de busca -->
            <div class="flex items-center">
                <input v-model="searchQuery" type="text" placeholder="Buscar usuário"
                    class="w-full bg-transparent border-b md:pb-2 border-gray-400 text-2xl md:text-3xl text-center focus:outline-none text-gray-700 placeholder-gray-500 dark:text-gray-100 dark:placeholder-gray-300" />
            </div>

            <!-- Filtros adicionais -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <!-- Campo de seleção para Nome ou Email -->
                <div class="relative">
                    <select v-model="searchField"
                        class="w-full bg-transparent text-md md:text-lg border-b border-gray-400 focus:outline-none text-gray-600 dark:text-gray-100 dark:placeholder-gray-300 cursor-pointer appearance-none">
                        <option value="username"
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            Nome
                        </option>
                        <option value="email"
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            Email
                        </option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <i class="fas fa-chevron-down text-gray-400 dark:text-gray-300"></i>
                    </div>
                </div>

                <!-- Filtros para Cidade -->
                <div class="relative">
                    <select v-model="filterCity"
                        class="w-full bg-transparent text-md md:text-lg border-b border-gray-400 focus:outline-none text-gray-600 dark:text-gray-100 dark:placeholder-gray-300 cursor-pointer appearance-none">
                        <option value=""
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            Cidade
                        </option>
                        <option v-for="city in [...new Set(users.map(user => user.city))]" :key="city" :value="city"
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            {{ city }}
                        </option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <i class="fas fa-chevron-down text-gray-400 dark:text-gray-300"></i>
                    </div>
                </div>

                <!-- Filtros para Cargo -->
                <div class="relative">
                    <select v-model="filterPosition"
                        class="w-full bg-transparent text-md md:text-lg border-b border-gray-400 focus:outline-none text-gray-600 dark:text-gray-100 dark:placeholder-gray-300 cursor-pointer appearance-none">
                        <option value=""
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            Cargo
                        </option>
                        <option v-for="position in [...new Set(users.map(user => user.position))]" :key="position"
                            :value="position"
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            {{ position }}
                        </option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <i class="fas fa-chevron-down text-gray-400 dark:text-gray-300"></i>
                    </div>
                </div>

                <!-- Filtros para Status -->
                <div class="relative">
                    <select v-model="filterStatus"
                        class="w-full bg-transparent text-md md:text-lg border-b border-gray-400 focus:outline-none text-gray-600 dark:text-gray-100 dark:placeholder-gray-300 cursor-pointer appearance-none">
                        <option value=""
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            Status
                        </option>
                        <option value="1"
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            Ativo
                        </option>
                        <option value="0"
                            class="text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                            Inativo
                        </option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <i class="fas fa-chevron-down text-gray-400 dark:text-gray-300"></i>
                    </div>
                </div>
            </div>

        </div>



        <!-- Usando o componente UserList -->
        <UserList class="pb-10" :users="filteredUsers" :startEditing="startEditing" />

        <!-- Modal -->
        <UserModal v-if="editableUser" :user="editableUser" @close="closeModal" @reload="fetchUsers" />
    </div>
</template>
