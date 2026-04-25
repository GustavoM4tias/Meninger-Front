<template>
  <div class="min-h-full py-6 md:py-8 px-4 bg-gray-50 dark:bg-gray-950">
    <div class="max-w-7xl mx-auto">

      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Painel de Usuários
          </h1>
          <Favorite class="my-auto" :router="'/settings/users'" :section="'Usuários'" />
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Gerencie e administre todos os usuários do sistema
        </p>
      </div>

      <!-- FAB (só na aba Office) -->
      <button
        v-if="activeTab === 'office'"
        class="fixed bottom-6 right-6 z-30 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200"
        title="Criar novo usuário" @click="startCreating">
        <i class="fas fa-user-plus text-sm"></i>
      </button>

      <!-- Abas (só para admin) -->
      <div v-if="isAdmin" class="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-fit">
        <button
          @click="activeTab = 'office'"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
          :class="activeTab === 'office'
            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
        >
          <i class="fas fa-users text-xs"></i>
          Usuários Office
        </button>
        <button
          @click="activeTab = 'microsoft'"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
          :class="activeTab === 'microsoft'
            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
        >
          <svg width="13" height="13" viewBox="0 0 21 21" fill="none" class="shrink-0">
            <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
            <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
            <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
            <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
          </svg>
          Usuários Microsoft
          <span v-if="!isMicrosoftConnected" class="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            Desconectado
          </span>
        </button>
      </div>

      <!-- Aba Microsoft -->
      <template v-if="activeTab === 'microsoft'">
        <div v-if="!isMicrosoftConnected" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5 flex items-start gap-3">
          <i class="fas fa-triangle-exclamation text-yellow-500 mt-0.5 shrink-0"></i>
          <div>
            <p class="text-sm font-medium text-yellow-800 dark:text-yellow-300">Conta Microsoft não conectada</p>
            <p class="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
              Vincule sua conta Microsoft em <strong>Minha Conta → Microsoft</strong> para acessar os usuários da organização.
            </p>
          </div>
        </div>
        <MicrosoftImportPanel v-else @reload="fetchUsers" />
      </template>

      <!-- Aba Office -->
      <template v-if="activeTab === 'office'">

      <!-- Filtros -->
      <div
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 mb-6 space-y-4">

        <!-- Busca -->
        <div class="relative">
          <i
            class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
          <input v-model="searchQuery" type="text" placeholder="Buscar usuário..."
            class="w-full pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 placeholder:text-gray-400 transition" />
        </div>

        <!-- Filtros secundários -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Buscar
              por</label>
            <select v-model="searchField"
              class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition">
              <option value="username">Nome</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cidade</label>
            <select v-model="filterCity"
              class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition">
              <option value="">Todas</option>
              <option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cargo</label>
            <select v-model="filterPosition"
              class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition">
              <option value="">Todos</option>
              <option v-for="position in uniquePositions" :key="position" :value="position">{{ position }}</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</label>
            <select v-model="filterStatus"
              class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition">
              <option value="">Todos</option>
              <option :value="true">Ativo</option>
              <option :value="false">Inativo</option>
            </select>
          </div>

          <div class="flex items-end">
            <button @click="clearFilters"
              class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <i class="fas fa-eraser text-xs"></i>
              Limpar
            </button>
          </div>
        </div>

        <!-- Contagem -->
        <div class="flex items-center gap-1.5 pt-1">
          <span class="text-xs text-gray-400">
            <span class="font-medium text-gray-600 dark:text-gray-300">{{ filteredUsers.length }}</span>
            de {{ users.length }} usuários
          </span>
        </div>
      </div>

      <!-- Lista -->
      <div class="space-y-2">

        <!-- Empty state -->
        <div v-if="filteredUsers.length === 0"
          class="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-users text-gray-400 text-lg"></i>
          </div>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Nenhum usuário encontrado</p>
          <p class="text-xs text-gray-400 mt-1">Tente ajustar os filtros de pesquisa.</p>
        </div>

        <!-- User rows -->
        <div v-for="user in filteredUsers" :key="user.id"
          class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3.5 hover:shadow-sm transition-all duration-150 group">
          <div class="flex items-center gap-4">
            <!-- Avatar -->
            <div class="relative shrink-0">
              <img class="w-10 h-10 rounded-lg object-cover" :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(
                (user?.username ?? '').split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join(' ')
              )}&background=random&size=80`" alt="avatar" />
              <!-- status dot -->
              <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900"
                :class="user.status ? 'bg-green-500' : 'bg-red-300 dark:bg-red-600'"></span>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {{ user.username }}
                </p>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" :class="user.status
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-500 dark:bg-red-900 dark:text-red-400'">
                  {{ user.status ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ user.email }}</p>
              <p v-if="user.city || user.position" class="text-xs text-gray-400 dark:text-gray-500">
                <span v-if="user.position">{{ user.position }}</span>
                <span v-if="user.city && user.position" class="mx-1">·</span>
                <span v-if="user.city">{{ user.city }}</span>
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <i class="fas fa-users-viewfinder text-base"
                :class="user.face_enabled ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'"
                v-tippy="user.face_enabled ? 'Reconhecimento facial ativo' : 'Reconhecimento facial inativo'"></i>

              <!-- Ícone Sienge -->
              <img
                src="/sienge.png"
                alt="Sienge"
                width="14" height="14"
                v-tippy="user.sienge_email ? 'Credenciais Sienge configuradas' : 'Sem credenciais Sienge'"
                :class="user.sienge_email ? 'opacity-100' : 'opacity-20'"
                class="object-contain"
              />

              <!-- Ícone Microsoft -->
              <svg
                v-tippy="user.microsoft_id ? 'Conta Microsoft conectada' : 'Sem conta Microsoft'"
                width="14" height="14" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"
                :class="user.microsoft_id ? 'opacity-100' : 'opacity-20'">
                <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
                <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
                <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
                <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
              </svg>

              <!-- Toggle organograma (admin only) -->
              <button
                v-if="isAdmin"
                @click.stop="toggleOrganogram(user)"
                :disabled="togglingOrgId === user.id"
                v-tippy="user.show_in_organogram ? 'Visível no organograma' : 'Oculto no organograma'"
                class="p-1.5 rounded-lg transition-all duration-150"
                :class="user.show_in_organogram
                  ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                  : 'text-gray-300 dark:text-gray-600 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'">
                <i class="fas fa-sitemap text-xs" :class="togglingOrgId === user.id ? 'animate-pulse' : ''"></i>
              </button>

              <!-- Botão Alçadas (admin only, não aparece para outros admins) -->
              <button
                v-if="isAdmin && user.role !== 'admin'"
                @click="goToPermissions(user)"
                v-tippy="'Configurar alçadas'"
                class="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-all duration-150">
                <i class="fas fa-shield-halved text-xs"></i>
              </button>

              <button @click="startEditing(user)"
                class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-all duration-150">
                <i class="fas fa-pen text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      </template><!-- /aba office -->

    <!-- Modal -->
    <userModal v-if="showUserModal" :user="editableUser" @close="closeModal" @reload="fetchUsers" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { useToast } from 'vue-toastification';
import userModal from '@/views/Office/Settings/Users/components/userModal.vue';
import MicrosoftImportPanel from '@/views/Office/Settings/Users/components/MicrosoftImportPanel.vue';
import Favorite from '@/components/config/Favorite.vue';

const router = useRouter();

const userStore = useAuthStore();
const microsoftStore = useMicrosoftStore();
const carregamento = useCarregamentoStore();
const toast = useToast();

const activeTab = ref('office'); // 'office' | 'microsoft'

const users = ref([]);
const searchQuery = ref('');
const searchField = ref('username');
const filterCity = ref('');
const filterPosition = ref('');
const filterStatus = ref(true);
const editableUser = ref(null);
const showUserModal = ref(false);
const togglingOrgId = ref(null);

const isAdmin = computed(() => userStore.user?.role === 'admin');
const isMicrosoftConnected = computed(() => microsoftStore.connected);

const fetchUsers = async () => {
  try {
    carregamento.iniciarCarregamento();
    const fetched = await userStore.getAllUsers();
    users.value = Array.isArray(fetched.data) ? fetched.data : fetched;
  } catch (e) {
    console.error('Erro ao carregar usuários:', e);
  } finally {
    carregamento.finalizarCarregamento();
  }
};

const filteredUsers = computed(() => {
  const q = (searchQuery.value || '').toLowerCase();
  const field = searchField.value;
  return users.value.filter(u => {
    const matchesSearch = String(u?.[field] ?? '').toLowerCase().includes(q);
    const matchesCity = !filterCity.value || u.city === filterCity.value;
    const matchesPosition = !filterPosition.value || u.position === filterPosition.value;
    const matchesStatus = filterStatus.value === '' || u.status === filterStatus.value;
    return matchesSearch && matchesCity && matchesPosition && matchesStatus;
  });
});

const uniqueCities = computed(() => [...new Set(users.value.map(u => u.city).filter(Boolean))]);
const uniquePositions = computed(() => [...new Set(users.value.map(u => u.position).filter(Boolean))]);

const startEditing = (user) => { editableUser.value = { ...user }; showUserModal.value = true; };
const startCreating = () => { editableUser.value = null; showUserModal.value = true; };
const closeModal = () => { editableUser.value = null; showUserModal.value = false; };
const clearFilters = () => { searchQuery.value = ''; filterCity.value = ''; filterPosition.value = ''; filterStatus.value = ''; };

const goToPermissions = (user) => {
  router.push({ path: '/settings/permissions', query: { userId: user.id } });
};

const toggleOrganogram = async (user) => {
  if (togglingOrgId.value) return;
  togglingOrgId.value = user.id;
  try {
    await userStore.updateUser({ ...user, show_in_organogram: !user.show_in_organogram });
    await fetchUsers();
  } catch (e) {
    toast.error('Erro ao atualizar visibilidade no organograma.');
  } finally {
    togglingOrgId.value = null;
  }
};

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    microsoftStore.fetchStatus(),
  ]);
});
</script>