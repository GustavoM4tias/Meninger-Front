<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import userModal from '@/views/Settings/Users/components/userModal.vue';
import Favorite from "@/components/config/Favorite.vue";


const userStore = useAuthStore();
const carregamento = useCarregamentoStore();
const users = ref([]);
const searchQuery = ref('');
const searchField = ref('username');
const filterCity = ref('');
const filterPosition = ref('');
const filterStatus = ref('');
const editableUser = ref(null);

const fetchUsers = async () => {
  try {
    carregamento.iniciarCarregamento();
    const fetchedUsers = await userStore.getAllUsers();
    users.value = fetchedUsers.data;
    console.log(users.value);
    carregamento.finalizarCarregamento();
  } catch (error) {
    console.error('Erro ao carregar os usuários:', error);
    carregamento.finalizarCarregamento();
  }
};

// computed filteredUsers – torne a busca defensiva
const filteredUsers = computed(() => {
  const query = (searchQuery.value || '').toLowerCase();
  const field = searchField.value;

  return users.value.filter(user => {
    const target = String(user?.[field] ?? '').toLowerCase();
    const matchesSearch = target.includes(query);
    const matchesCity = !filterCity.value || user.city === filterCity.value;
    const matchesPosition = !filterPosition.value || user.position === filterPosition.value;
    const matchesStatus = filterStatus.value === '' || user.status === filterStatus.value;
    return matchesSearch && matchesCity && matchesPosition && matchesStatus;
  });
});

const uniqueCities = computed(() => [...new Set(users.value.map(user => user.city).filter(Boolean))]);
const uniquePositions = computed(() => [...new Set(users.value.map(user => user.position).filter(Boolean))]);


const startEditing = (user) => {
  editableUser.value = { ...user };
};

const closeModal = () => {
  editableUser.value = null;
};

const clearFilters = () => {
  searchQuery.value = '';
  filterCity.value = '';
  filterPosition.value = '';
  filterStatus.value = '';
};

onMounted(fetchUsers);
</script>

<template>
  <div class="h-full py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="flex text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Painel de Usuários
          <Favorite class="my-auto" :router="'/settings/users'" :section="'Usuários'" />
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Gerencie e administre todos os usuários do sistema
        </p>
      </div>

      <!-- Filtros -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <!-- Barra de pesquisa -->
        <div class="relative mb-6">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input v-model="searchQuery" type="text" placeholder="Buscar usuário..."
            class="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        <!-- Filtros em linha -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <!-- Campo de busca -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar por
            </label>
            <select v-model="searchField"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="username">Nome</option>
              <option value="email">Email</option>
            </select>
          </div>

          <!-- Filtro cidade -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cidade
            </label>
            <select v-model="filterCity"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas</option>
              <option v-for="city in uniqueCities" :key="city" :value="city">
                {{ city }}
              </option>
            </select>
          </div>

          <!-- Filtro cargo -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cargo
            </label>
            <select v-model="filterPosition"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option v-for="position in uniquePositions" :key="position" :value="position">
                {{ position }}
              </option>
            </select>
          </div>

          <!-- Filtro status -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select v-model="filterStatus"
              class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option :value="true">Ativo</option>
              <option :value="false">Inativo</option>
            </select>
          </div>

          <!-- Botão limpar -->
          <div class="flex items-end">
            <button @click="clearFilters"
              class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-50 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                </path>
              </svg>
              Limpar
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de usuários -->
      <div class="space-y-4">
        <div v-if="filteredUsers.length === 0" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z">
            </path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum usuário encontrado</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Tente ajustar os filtros de pesquisa.</p>
        </div>

        <div v-for="user in filteredUsers" :key="user.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- Avatar -->
              <div class="flex-shrink-0">
                <img class="w-12 h-12 rounded-full" :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  (user?.username ?? '')
                    .split(' ')
                    .slice(0, 2)
                    .map(n => n[0]?.toUpperCase())
                    .join(' ')
                )}&background=random`" alt="usuario foto" />
              </div>

              <!-- Informações do usuário -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center space-x-3">
                  <p class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {{ user.username }}
                  </p>
                  <span :class="[
                    'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                    user.status
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  ]">
                    {{ user.status ? 'Ativo' : 'Inativo' }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {{ user.email }}
                </p>
                <p v-if="user.city || user.position" class="text-sm text-gray-500 dark:text-gray-500">
                  <span v-if="user.city">{{ user.city }}</span>
                  <span v-if="user.city && user.position"> • </span>
                  <span v-if="user.position">{{ user.position }}</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Ícone: Facial ativo/inativo (apenas visual) -->
              <i class="fas fa-users-viewfinder text-2xl" :class="user.face_enabled ? 'text-green-500' : 'text-red-500'"
                v-tippy="user.face_enabled ? 'Reconhecimento facial ativo' : 'Reconhecimento facial inativo'"></i>

              <!-- Botão de edição (já existente) -->
              <button @click="startEditing(user)"
                class="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200">
                <i class="fas fa-pen-to-square text-2xl"></i>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <userModal v-if="editableUser" :user="editableUser" @close="closeModal" @reload="fetchUsers" />
  </div>
</template>
