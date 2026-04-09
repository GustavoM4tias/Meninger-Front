<template>
    <div class="h-auto min-h-full overflow-x-hidden">
        <div class="max-w-7xl mx-auto px-6 py-8">

            <!-- Header -->
            <div class="flex items-center gap-2 mb-1">
                <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Gestão de Alçadas</h1>
                <Favorite :router="'/settings/permissions'" :section="'Alçadas'" />
            </div>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                Controle quais módulos cada usuário pode visualizar e acessar.
                Administradores têm acesso total por padrão e não podem ser restritos.
            </p>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">

                <!-- ── Lista de usuários (sidebar esquerda) ─────────────────── -->
                <aside class="lg:col-span-1">
                    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm overflow-hidden sticky top-20">
                        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-2">
                            <div class="flex items-center justify-between">
                                <h2 class="font-semibold text-gray-800 dark:text-gray-200">Usuários</h2>
                                <span class="text-xs text-gray-400">
                                    {{ filteredUsers.length }}/{{ users.length }}
                                </span>
                            </div>

                            <!-- Campo de busca -->
                            <div class="relative">
                                <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                <input
                                    v-model="userSearch"
                                    type="text"
                                    placeholder="Buscar usuário..."
                                    class="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <!-- Buscar por -->
                            <select
                                v-model="searchField"
                                class="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="username">Buscar por nome</option>
                                <option value="email">Buscar por e-mail</option>
                            </select>
                        </div>

                        <ul class="overflow-y-auto max-h-[60vh]">
                            <li
                                v-for="user in filteredUsers"
                                :key="user.id"
                                @click="selectUser(user)"
                                class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors"
                                :class="selectedUser?.id === user.id
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
                            >
                                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    :class="user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'">
                                    {{ initials(user.username) }}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ user.username }}</p>
                                    <p class="text-xs text-gray-400 truncate">{{ user.email }}</p>
                                </div>
                                <span v-if="user.role === 'admin'"
                                    class="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded flex-shrink-0">
                                    admin
                                </span>
                            </li>
                            <li v-if="filteredUsers.length === 0" class="px-4 py-6 text-center text-sm text-gray-400">
                                Nenhum usuário encontrado
                            </li>
                        </ul>
                    </div>
                </aside>

                <!-- ── Painel de permissões (direita) ───────────────────────── -->
                <main class="lg:col-span-3">

                    <!-- Estado inicial: nenhum usuário selecionado -->
                    <div v-if="!selectedUser" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm p-16 text-center">
                        <i class="fas fa-user-shield text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                        <p class="text-gray-500 dark:text-gray-400">Selecione um usuário para gerenciar suas permissões</p>
                    </div>

                    <!-- Admin selecionado -->
                    <div v-else-if="selectedUser.role === 'admin'" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm p-10 text-center">
                        <i class="fas fa-crown text-4xl text-yellow-400 mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{{ selectedUser.username }}</h3>
                        <p class="text-gray-500 dark:text-gray-400">Administradores têm acesso total ao sistema.<br>Suas permissões não podem ser restritas.</p>
                    </div>

                    <!-- Painel de edição -->
                    <div v-else class="space-y-4">

                        <!-- Cabeçalho do painel -->
                        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm px-6 py-4 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300">
                                    {{ initials(selectedUser.username) }}
                                </div>
                                <div>
                                    <h3 class="font-semibold text-gray-900 dark:text-white">{{ selectedUser.username }}</h3>
                                    <p class="text-sm text-gray-400">{{ selectedUser.email }}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-sm text-gray-500 dark:text-gray-400">
                                    {{ countGranted }} de {{ totalManaged }} páginas liberadas
                                </span>
                                <button
                                    @click="savePermissions"
                                    :disabled="saving || !dirty"
                                    class="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                                >
                                    <i v-if="saving" class="fas fa-spinner fa-spin"></i>
                                    <i v-else class="fas fa-save"></i>
                                    {{ saving ? 'Salvando...' : 'Salvar' }}
                                </button>
                            </div>
                        </div>

                        <!-- Feedback -->
                        <div v-if="feedbackMsg" class="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium"
                            :class="feedbackOk ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'">
                            <i :class="feedbackOk ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                            {{ feedbackMsg }}
                        </div>

                        <!-- Ações rápidas -->
                        <div class="flex gap-2">
                            <button @click="grantAll" class="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                <i class="fas fa-check-square text-xs"></i> Liberar tudo
                            </button>
                            <span class="text-gray-300 dark:text-gray-600">|</span>
                            <button @click="revokeAll" class="text-sm text-red-500 dark:text-red-400 hover:underline flex items-center gap-1">
                                <i class="fas fa-times text-xs"></i> Revogar tudo
                            </button>
                        </div>

                        <!-- Departamentos e páginas -->
                        <div
                            v-for="dept in managedRegistry"
                            :key="dept.key"
                            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm overflow-hidden"
                        >
                            <!-- Cabeçalho do departamento -->
                            <div class="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <div class="flex items-center gap-3">
                                    <i :class="dept.icon" class="text-gray-500 dark:text-gray-400 w-5 text-center"></i>
                                    <span class="font-semibold text-gray-800 dark:text-gray-200">{{ dept.label }}</span>
                                    <span class="text-xs text-gray-400">
                                        {{ countGrantedInDept(dept) }}/{{ getDeptManagedPages(dept).length }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <button @click="toggleDept(dept, true)" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Todos</button>
                                    <button @click="toggleDept(dept, false)" class="text-xs text-red-500 dark:text-red-400 hover:underline">Nenhum</button>
                                    <!-- Toggle geral do depto -->
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            class="sr-only peer"
                                            :checked="allGrantedInDept(dept)"
                                            :indeterminate.prop="someGrantedInDept(dept) && !allGrantedInDept(dept)"
                                            @change="toggleDept(dept, !allGrantedInDept(dept))"
                                        />
                                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                            </div>

                            <!-- Páginas únicas do departamento (subcategorias já mescladas) -->
                            <div class="divide-y divide-gray-100 dark:divide-gray-800">
                                <div
                                    v-for="page in getDeptManagedPages(dept)"
                                    :key="page.route"
                                    class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                                >
                                    <div class="flex items-center gap-3">
                                        <i :class="page.icon" class="text-gray-400 w-4 text-center text-sm"></i>
                                        <div>
                                            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ page.name }}</p>
                                            <p class="text-xs font-mono text-gray-400">{{ page.route }}</p>
                                        </div>
                                    </div>

                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            class="sr-only peer"
                                            :checked="localRoutes.includes(page.route)"
                                            @change="toggleRoute(page.route)"
                                        />
                                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { managedRegistry, getDeptManagedPages } from '@/config/navRegistry';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import Favorite from '@/components/config/Favorite.vue'

const route = useRoute();

// ── Estado ────────────────────────────────────────────────────────────────────
const users          = ref([]);
const userSearch     = ref('');
const searchField    = ref('username');   // igual à página de Usuários
const selectedUser   = ref(null);
const localRoutes    = ref([]);
const originalRoutes = ref([]);
const saving         = ref(false);
const feedbackMsg    = ref('');
const feedbackOk     = ref(true);

// Total de rotas únicas gerenciáveis (considerando subcategorias)
const totalManaged = managedRegistry.reduce((acc, d) => acc + getDeptManagedPages(d).length, 0);

// ── Busca — mesma lógica da página de Usuários ────────────────────────────────
const filteredUsers = computed(() => {
    const q     = (userSearch.value || '').toLowerCase();
    const field = searchField.value;
    return users.value.filter(u =>
        String(u?.[field] ?? '').toLowerCase().includes(q)
    );
});

// ── Detecta alterações não salvas ─────────────────────────────────────────────
const dirty = computed(() => {
    const a = [...localRoutes.value].sort().join(',');
    const b = [...originalRoutes.value].sort().join(',');
    return a !== b;
});

// ── Contadores ────────────────────────────────────────────────────────────────
const countGranted = computed(() => localRoutes.value.length);

const countGrantedInDept = (dept) =>
    getDeptManagedPages(dept).filter(p => localRoutes.value.includes(p.route)).length;

const allGrantedInDept = (dept) =>
    getDeptManagedPages(dept).every(p => localRoutes.value.includes(p.route));

const someGrantedInDept = (dept) =>
    getDeptManagedPages(dept).some(p => localRoutes.value.includes(p.route));

// ── Helpers ───────────────────────────────────────────────────────────────────
const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

// ── Selecionar usuário ────────────────────────────────────────────────────────
function selectUser(user) {
    selectedUser.value = user;
    feedbackMsg.value  = '';

    if (user.role === 'admin') {
        localRoutes.value    = [];
        originalRoutes.value = [];
        return;
    }

    const saved = user.permission?.routes ?? [];
    localRoutes.value    = [...saved];
    originalRoutes.value = [...saved];
}

// ── Toggle de rota individual ─────────────────────────────────────────────────
function toggleRoute(route) {
    const idx = localRoutes.value.indexOf(route);
    if (idx === -1) localRoutes.value.push(route);
    else localRoutes.value.splice(idx, 1);
}

// ── Toggle de departamento inteiro ────────────────────────────────────────────
function toggleDept(dept, grant) {
    const routes = getDeptManagedPages(dept).map(p => p.route);
    if (grant) {
        routes.forEach(r => { if (!localRoutes.value.includes(r)) localRoutes.value.push(r); });
    } else {
        localRoutes.value = localRoutes.value.filter(r => !routes.includes(r));
    }
}

// ── Grant / Revoke all ────────────────────────────────────────────────────────
function grantAll() {
    localRoutes.value = managedRegistry.flatMap(d => getDeptManagedPages(d).map(p => p.route));
}

function revokeAll() {
    localRoutes.value = [];
}

// ── Salvar ────────────────────────────────────────────────────────────────────
async function savePermissions() {
    if (!selectedUser.value || saving.value) return;

    saving.value    = true;
    feedbackMsg.value = '';

    try {
        await requestWithAuth(`/permissions/${selectedUser.value.id}`, {
            method: 'PUT',
            body: JSON.stringify({ routes: localRoutes.value }),
        });

        // Atualiza o objeto do usuário na lista local para refletir sem reload
        const u = users.value.find(u => u.id === selectedUser.value.id);
        if (u) {
            if (!u.permission) u.permission = {};
            u.permission.routes = [...localRoutes.value];
        }

        originalRoutes.value = [...localRoutes.value];
        feedbackOk.value    = true;
        feedbackMsg.value   = `Permissões de ${selectedUser.value.username} salvas com sucesso!`;
    } catch (err) {
        feedbackOk.value  = false;
        feedbackMsg.value = err.message || 'Erro ao salvar permissões.';
    } finally {
        saving.value = false;
        setTimeout(() => { feedbackMsg.value = ''; }, 4000);
    }
}

// ── Carga inicial — auto-seleciona via ?userId= se vier da página de usuários ─
async function loadUsers() {
    try {
        const data = await requestWithAuth('/permissions');
        users.value = Array.isArray(data) ? data : [];

        // Se veio da página de usuários com ?userId=X, pré-seleciona
        const preselect = route.query.userId ? parseInt(route.query.userId) : null;
        if (preselect) {
            const found = users.value.find(u => u.id === preselect);
            if (found) selectUser(found);
        }
    } catch (err) {
        console.error('[Permissions page] loadUsers error:', err);
    }
}

onMounted(loadUsers);
</script>
