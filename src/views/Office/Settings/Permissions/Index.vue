<template>
    <div class="h-auto min-h-full overflow-x-hidden">
        <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">

            <!-- Header -->
            <div class="flex items-center gap-2 mb-1">
                <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Gestão de Alçadas</h1>
                <Favorite :router="'/settings/permissions'" :section="'Alçadas'" />
            </div>
            <p class="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Controle quais módulos cada usuário pode visualizar. Administradores têm acesso total por padrão.
            </p>

            <!-- Tabs principais -->
            <div class="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                    v-for="tab in mainTabs"
                    :key="tab.value"
                    @click="mainTab = tab.value"
                    class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
                    :class="mainTab === tab.value
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
                >
                    <i :class="tab.icon" class="mr-1.5"></i>
                    {{ tab.label }}
                </button>
            </div>

            <!-- ════════════════════════════════════════════════════════════
                 ABA USUÁRIOS
            ════════════════════════════════════════════════════════════ -->
            <div v-if="mainTab === 'users'" class="grid grid-cols-1 lg:grid-cols-4 gap-5">

                <!-- Sidebar: lista de usuários -->
                <aside class="lg:col-span-1">
                    <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden sticky top-20">
                        <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">Usuários</span>
                                <span class="text-xs text-gray-400">{{ filteredUsers.length }}/{{ users.length }}</span>
                            </div>
                            <div class="relative">
                                <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                <input v-model="userSearch" type="text" placeholder="Buscar..."
                                    class="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                        </div>

                        <ul class="overflow-y-auto max-h-[58vh] divide-y divide-gray-100 dark:divide-gray-800">
                            <li v-for="user in filteredUsers" :key="user.id"
                                @click="selectUser(user)"
                                class="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors group"
                                :class="selectedUser?.id === user.id
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
                            >
                                <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    :class="user.role === 'admin'
                                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                                        : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'">
                                    {{ initials(user.username) }}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-xs font-medium text-gray-900 dark:text-white truncate">{{ user.username }}</p>
                                    <p class="text-[11px] text-gray-400 truncate">{{ user.email }}</p>
                                </div>
                                <!-- botão copiar permissões -->
                                <button
                                    v-if="user.role !== 'admin'"
                                    @click.stop="copyUserPermissions(user)"
                                    :title="`Copiar permissões de ${user.username}`"
                                    class="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-blue-500"
                                >
                                    <i class="fas fa-copy text-xs"></i>
                                </button>
                            </li>
                            <li v-if="!filteredUsers.length" class="px-4 py-6 text-center text-sm text-gray-400">
                                Nenhum usuário encontrado
                            </li>
                        </ul>
                    </div>
                </aside>

                <!-- Painel de permissões do usuário -->
                <main class="lg:col-span-3">

                    <!-- Nenhum selecionado -->
                    <div v-if="!selectedUser" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-16 text-center">
                        <i class="fas fa-user-shield text-4xl text-gray-200 dark:text-gray-700 mb-4"></i>
                        <p class="text-gray-400 dark:text-gray-500 text-sm">Selecione um usuário para gerenciar suas permissões</p>
                    </div>

                    <!-- Admin selecionado -->
                    <div v-else-if="selectedUser.role === 'admin'" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-10 text-center">
                        <i class="fas fa-crown text-3xl text-yellow-400 mb-3"></i>
                        <h3 class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">{{ selectedUser.username }}</h3>
                        <p class="text-sm text-gray-400">Administradores têm acesso total. Permissões não podem ser restritas.</p>
                    </div>

                    <!-- Painel de edição -->
                    <div v-else class="space-y-3">

                        <!-- Cabeçalho do usuário -->
                        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm px-5 py-4">
                            <div class="flex flex-wrap items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                                    {{ initials(selectedUser.username) }}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-semibold text-gray-900 dark:text-white">{{ selectedUser.username }}</h3>
                                    <p class="text-xs text-gray-400 truncate">{{ selectedUser.email }}</p>
                                </div>

                                <div class="flex flex-wrap items-center gap-2">
                                    <!-- Aplicar perfil -->
                                    <div class="relative" v-if="profiles.length">
                                        <button
                                            @click="showProfileDropdown = !showProfileDropdown"
                                            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
                                        >
                                            <i class="fas fa-layer-group"></i>
                                            Aplicar Perfil
                                            <i class="fas fa-chevron-down text-[10px]"></i>
                                        </button>
                                        <div v-if="showProfileDropdown"
                                            class="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg min-w-44 py-1"
                                            @mouseleave="showProfileDropdown = false"
                                        >
                                            <button
                                                v-for="profile in profiles"
                                                :key="profile.id"
                                                @click="applyProfile(profile)"
                                                class="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                <i class="fas fa-layer-group mr-2 text-purple-400"></i>
                                                {{ profile.name }}
                                                <span class="text-xs text-gray-400 ml-1">({{ profile.routes.length }})</span>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Colar permissões copiadas -->
                                    <button
                                        v-if="clipboard"
                                        @click="pastePermissions"
                                        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                                        :title="`Colar permissões de ${clipboard.fromUser}`"
                                    >
                                        <i class="fas fa-paste"></i>
                                        Colar de {{ clipboard.fromUser }}
                                    </button>

                                    <!-- Contador + Salvar -->
                                    <span class="text-xs text-gray-400 hidden sm:block">
                                        {{ countGranted }}/{{ totalManaged }}
                                    </span>
                                    <button
                                        @click="savePermissions"
                                        :disabled="saving || !dirty"
                                        class="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium text-xs transition-colors"
                                    >
                                        <i v-if="saving" class="fas fa-spinner fa-spin"></i>
                                        <i v-else class="fas fa-save"></i>
                                        {{ saving ? 'Salvando...' : 'Salvar' }}
                                    </button>
                                </div>
                            </div>

                            <!-- Feedback inline -->
                            <div v-if="feedbackMsg" class="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                                :class="feedbackOk ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'">
                                <i :class="feedbackOk ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                                {{ feedbackMsg }}
                            </div>
                        </div>

                        <!-- Ações rápidas -->
                        <div class="flex gap-3 px-1">
                            <button @click="grantAll" class="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                <i class="fas fa-check-square"></i> Liberar tudo
                            </button>
                            <span class="text-gray-300 dark:text-gray-600">|</span>
                            <button @click="revokeAll" class="text-xs text-red-500 dark:text-red-400 hover:underline flex items-center gap-1">
                                <i class="fas fa-times"></i> Revogar tudo
                            </button>
                        </div>

                        <!-- Grupos de rotas -->
                        <div v-for="dept in managedRegistry" :key="dept.key"
                            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                <div class="flex items-center gap-2">
                                    <i :class="dept.icon" class="text-gray-400 w-4 text-center text-xs"></i>
                                    <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ dept.label }}</span>
                                    <span class="text-xs text-gray-400">{{ countGrantedInDept(dept) }}/{{ getDeptManagedPages(dept).length }}</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <button @click="toggleDept(dept, true)" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Todos</button>
                                    <button @click="toggleDept(dept, false)" class="text-xs text-red-500 dark:text-red-400 hover:underline">Nenhum</button>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" class="sr-only peer"
                                            :checked="allGrantedInDept(dept)"
                                            :indeterminate.prop="someGrantedInDept(dept) && !allGrantedInDept(dept)"
                                            @change="toggleDept(dept, !allGrantedInDept(dept))" />
                                        <div class="w-8 h-4 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                            </div>

                            <div class="divide-y divide-gray-50 dark:divide-gray-800">
                                <div v-for="page in getDeptManagedPages(dept)" :key="page.route"
                                    class="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                    <div class="flex items-center gap-2.5">
                                        <i :class="page.icon" class="text-gray-300 dark:text-gray-600 w-3.5 text-center text-xs"></i>
                                        <div>
                                            <p class="text-sm text-gray-800 dark:text-gray-200">{{ page.name }}</p>
                                            <p class="text-[11px] font-mono text-gray-400">{{ page.route }}</p>
                                        </div>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" class="sr-only peer"
                                            :checked="localRoutes.includes(page.route)"
                                            @change="toggleRoute(page.route)" />
                                        <div class="w-8 h-4 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            <!-- ════════════════════════════════════════════════════════════
                 ABA PERFIS
            ════════════════════════════════════════════════════════════ -->
            <div v-else class="space-y-4">

                <!-- Barra de ação -->
                <div class="flex items-center justify-between">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ profiles.length }} perfil{{ profiles.length !== 1 ? 'is' : '' }} cadastrado{{ profiles.length !== 1 ? 's' : '' }}
                    </p>
                    <button
                        @click="openProfileModal(null)"
                        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <i class="fas fa-plus"></i>
                        Novo Perfil
                    </button>
                </div>

                <!-- Lista de perfis -->
                <div v-if="!profiles.length" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <i class="fas fa-layer-group text-4xl text-gray-200 dark:text-gray-700 mb-3"></i>
                    <p class="text-sm text-gray-400">Nenhum perfil cadastrado. Crie um para reutilizar conjuntos de permissões.</p>
                </div>

                <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div v-for="profile in profiles" :key="profile.id"
                        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div class="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <h3 class="font-semibold text-gray-900 dark:text-white truncate">{{ profile.name }}</h3>
                                    <p class="text-xs text-gray-400 mt-0.5 line-clamp-2">{{ profile.description || 'Sem descrição' }}</p>
                                </div>
                                <span class="flex-shrink-0 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                                    {{ profile.routes.length }} rotas
                                </span>
                            </div>
                        </div>

                        <!-- Amostra das rotas -->
                        <div class="px-4 py-3 space-y-1">
                            <div v-for="route in profile.routes.slice(0, 4)" :key="route"
                                class="text-xs font-mono text-gray-400 truncate">
                                <i class="fas fa-route mr-1 text-gray-300"></i>{{ route }}
                            </div>
                            <p v-if="profile.routes.length > 4" class="text-xs text-gray-400 italic">
                                + {{ profile.routes.length - 4 }} mais...
                            </p>
                        </div>

                        <div class="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <button @click="openProfileModal(profile)"
                                class="flex-1 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 transition-colors">
                                <i class="fas fa-pen mr-1"></i> Editar
                            </button>
                            <button @click="confirmDeleteProfile(profile)"
                                class="flex-1 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors">
                                <i class="fas fa-trash mr-1"></i> Excluir
                            </button>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════════
         MODAL — Criar/Editar Perfil
    ════════════════════════════════════════════════════════════════ -->
    <transition name="fade">
        <div v-if="showProfileModal" class="fixed inset-0 z-50 flex items-center justify-center">
            <div class="absolute inset-0 bg-gray-900/60" @click="closeProfileModal"></div>

            <div class="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                            {{ editingProfile ? 'Editar Perfil' : 'Novo Perfil de Alçada' }}
                        </h2>
                        <p class="text-xs text-gray-400 mt-0.5">{{ profileForm.routes.length }} rotas selecionadas</p>
                    </div>
                    <button @click="closeProfileModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Corpo -->
                <div class="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                    <div class="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do perfil *</label>
                            <input v-model="profileForm.name" type="text" placeholder="Ex: Vendas - Padrão"
                                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                            <input v-model="profileForm.description" type="text" placeholder="Breve descrição do perfil"
                                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <!-- Ações rápidas do modal -->
                    <div class="flex gap-3">
                        <button @click="profileGrantAll" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            <i class="fas fa-check-square mr-1"></i> Liberar tudo
                        </button>
                        <span class="text-gray-300 dark:text-gray-600">|</span>
                        <button @click="profileRevokeAll" class="text-xs text-red-500 dark:text-red-400 hover:underline">
                            <i class="fas fa-times mr-1"></i> Limpar tudo
                        </button>
                    </div>

                    <!-- Seleção de rotas -->
                    <div v-for="dept in managedRegistry" :key="dept.key"
                        class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800">
                            <div class="flex items-center gap-2">
                                <i :class="dept.icon" class="text-gray-400 text-xs w-4 text-center"></i>
                                <span class="text-xs font-medium text-gray-700 dark:text-gray-200">{{ dept.label }}</span>
                                <span class="text-xs text-gray-400">
                                    {{ getDeptManagedPages(dept).filter(p => profileForm.routes.includes(p.route)).length }}/{{ getDeptManagedPages(dept).length }}
                                </span>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only peer"
                                    :checked="getDeptManagedPages(dept).every(p => profileForm.routes.includes(p.route))"
                                    @change="profileToggleDept(dept, !getDeptManagedPages(dept).every(p => profileForm.routes.includes(p.route)))" />
                                <div class="w-8 h-4 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
                        </div>
                        <div class="divide-y divide-gray-50 dark:divide-gray-800">
                            <div v-for="page in getDeptManagedPages(dept)" :key="page.route"
                                class="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <div class="flex items-center gap-2">
                                    <i :class="page.icon" class="text-gray-300 w-3 text-center text-xs"></i>
                                    <span class="text-xs text-gray-700 dark:text-gray-300">{{ page.name }}</span>
                                    <span class="text-[11px] font-mono text-gray-400">{{ page.route }}</span>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" class="sr-only peer"
                                        :checked="profileForm.routes.includes(page.route)"
                                        @change="profileToggleRoute(page.route)" />
                                    <div class="w-8 h-4 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 flex-shrink-0">
                    <button @click="closeProfileModal"
                        class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancelar
                    </button>
                    <button @click="saveProfile" :disabled="savingProfile"
                        class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2">
                        <i v-if="savingProfile" class="fas fa-spinner fa-spin"></i>
                        <i v-else class="fas fa-save"></i>
                        {{ savingProfile ? 'Salvando...' : 'Salvar Perfil' }}
                    </button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { managedRegistry, getDeptManagedPages } from '@/config/navRegistry';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import Favorite from '@/components/config/Favorite.vue';

const route = useRoute();

// ── Tabs ──────────────────────────────────────────────────────────────────────
const mainTabs = [
    { value: 'users',    label: 'Usuários',  icon: 'fas fa-users' },
    { value: 'profiles', label: 'Perfis',    icon: 'fas fa-layer-group' },
];
const mainTab = ref('users');

// ── Estado: Usuários ──────────────────────────────────────────────────────────
const users          = ref([]);
const userSearch     = ref('');
const selectedUser   = ref(null);
const localRoutes    = ref([]);
const originalRoutes = ref([]);
const saving         = ref(false);
const feedbackMsg    = ref('');
const feedbackOk     = ref(true);

// ── Estado: Perfis ────────────────────────────────────────────────────────────
const profiles          = ref([]);
const showProfileModal  = ref(false);
const editingProfile    = ref(null);
const savingProfile     = ref(false);
const profileForm       = ref({ name: '', description: '', routes: [] });
const showProfileDropdown = ref(false);

// ── Clipboard (copiar/colar permissões) ───────────────────────────────────────
const clipboard = ref(null); // { fromUser: string, routes: string[] }

// ── Totais ────────────────────────────────────────────────────────────────────
const totalManaged = managedRegistry.reduce((acc, d) => acc + getDeptManagedPages(d).length, 0);

const filteredUsers = computed(() => {
    const q = (userSearch.value || '').toLowerCase();
    return users.value.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
});

const dirty = computed(() => {
    const a = [...localRoutes.value].sort().join(',');
    const b = [...originalRoutes.value].sort().join(',');
    return a !== b;
});

const countGranted = computed(() => localRoutes.value.length);

const countGrantedInDept = (dept) =>
    getDeptManagedPages(dept).filter(p => localRoutes.value.includes(p.route)).length;

const allGrantedInDept = (dept) =>
    getDeptManagedPages(dept).every(p => localRoutes.value.includes(p.route));

const someGrantedInDept = (dept) =>
    getDeptManagedPages(dept).some(p => localRoutes.value.includes(p.route));

const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

// ── Selecionar usuário ────────────────────────────────────────────────────────
function selectUser(user) {
    selectedUser.value = user;
    feedbackMsg.value  = '';
    showProfileDropdown.value = false;
    if (user.role === 'admin') {
        localRoutes.value    = [];
        originalRoutes.value = [];
        return;
    }
    const saved = user.permission?.routes ?? [];
    localRoutes.value    = [...saved];
    originalRoutes.value = [...saved];
}

// ── Togles de rota / departamento ─────────────────────────────────────────────
function toggleRoute(routePath) {
    const idx = localRoutes.value.indexOf(routePath);
    if (idx === -1) localRoutes.value.push(routePath);
    else localRoutes.value.splice(idx, 1);
}

function toggleDept(dept, grant) {
    const routes = getDeptManagedPages(dept).map(p => p.route);
    if (grant) {
        routes.forEach(r => { if (!localRoutes.value.includes(r)) localRoutes.value.push(r); });
    } else {
        localRoutes.value = localRoutes.value.filter(r => !routes.includes(r));
    }
}

function grantAll() {
    localRoutes.value = managedRegistry.flatMap(d => getDeptManagedPages(d).map(p => p.route));
}

function revokeAll() {
    localRoutes.value = [];
}

// ── Copiar / Colar permissões ─────────────────────────────────────────────────
function copyUserPermissions(user) {
    clipboard.value = {
        fromUser: user.username,
        routes: [...(user.permission?.routes ?? [])],
    };
}

function pastePermissions() {
    if (!clipboard.value) return;
    localRoutes.value = [...clipboard.value.routes];
}

// ── Aplicar perfil ────────────────────────────────────────────────────────────
function applyProfile(profile) {
    localRoutes.value = [...profile.routes];
    showProfileDropdown.value = false;
}

// ── Salvar permissões do usuário ──────────────────────────────────────────────
async function savePermissions() {
    if (!selectedUser.value || saving.value) return;
    saving.value    = true;
    feedbackMsg.value = '';

    try {
        await requestWithAuth(`/permissions/${selectedUser.value.id}`, {
            method: 'PUT',
            body: JSON.stringify({ routes: localRoutes.value }),
        });

        const u = users.value.find(u => u.id === selectedUser.value.id);
        if (u) {
            if (!u.permission) u.permission = {};
            u.permission.routes = [...localRoutes.value];
        }

        originalRoutes.value = [...localRoutes.value];
        feedbackOk.value    = true;
        feedbackMsg.value   = `Permissões de ${selectedUser.value.username} salvas!`;
    } catch (err) {
        feedbackOk.value  = false;
        feedbackMsg.value = err.message || 'Erro ao salvar permissões.';
    } finally {
        saving.value = false;
        setTimeout(() => { feedbackMsg.value = ''; }, 4000);
    }
}

// ── Modal de perfil ───────────────────────────────────────────────────────────
function openProfileModal(profile) {
    editingProfile.value = profile;
    profileForm.value = {
        name: profile?.name ?? '',
        description: profile?.description ?? '',
        routes: profile ? [...profile.routes] : [],
    };
    showProfileModal.value = true;
}

function closeProfileModal() {
    showProfileModal.value = false;
    editingProfile.value = null;
}

function profileToggleRoute(routePath) {
    const idx = profileForm.value.routes.indexOf(routePath);
    if (idx === -1) profileForm.value.routes.push(routePath);
    else profileForm.value.routes.splice(idx, 1);
}

function profileToggleDept(dept, grant) {
    const routes = getDeptManagedPages(dept).map(p => p.route);
    if (grant) {
        routes.forEach(r => { if (!profileForm.value.routes.includes(r)) profileForm.value.routes.push(r); });
    } else {
        profileForm.value.routes = profileForm.value.routes.filter(r => !routes.includes(r));
    }
}

function profileGrantAll() {
    profileForm.value.routes = managedRegistry.flatMap(d => getDeptManagedPages(d).map(p => p.route));
}

function profileRevokeAll() {
    profileForm.value.routes = [];
}

async function saveProfile() {
    if (!profileForm.value.name.trim()) return;
    savingProfile.value = true;
    try {
        const body = {
            name: profileForm.value.name.trim(),
            description: profileForm.value.description.trim() || null,
            routes: profileForm.value.routes,
        };

        if (editingProfile.value) {
            const updated = await requestWithAuth(`/permissions/profiles/${editingProfile.value.id}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });
            const idx = profiles.value.findIndex(p => p.id === editingProfile.value.id);
            if (idx !== -1) profiles.value[idx] = updated;
        } else {
            const created = await requestWithAuth('/permissions/profiles', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            profiles.value.push(created);
        }
        closeProfileModal();
    } catch (err) {
        alert(err.message || 'Erro ao salvar perfil.');
    } finally {
        savingProfile.value = false;
    }
}

async function confirmDeleteProfile(profile) {
    if (!confirm(`Excluir o perfil "${profile.name}"?`)) return;
    try {
        await requestWithAuth(`/permissions/profiles/${profile.id}`, { method: 'DELETE' });
        profiles.value = profiles.value.filter(p => p.id !== profile.id);
    } catch (err) {
        alert(err.message || 'Erro ao excluir perfil.');
    }
}

// ── Carga inicial ─────────────────────────────────────────────────────────────
async function loadUsers() {
    try {
        const data = await requestWithAuth('/permissions');
        users.value = Array.isArray(data) ? data : [];

        const preselect = route.query.userId ? parseInt(route.query.userId) : null;
        if (preselect) {
            const found = users.value.find(u => u.id === preselect);
            if (found) selectUser(found);
        }
    } catch (err) {
        console.error('[Permissions] loadUsers error:', err);
    }
}

async function loadProfiles() {
    try {
        const data = await requestWithAuth('/permissions/profiles');
        profiles.value = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('[Permissions] loadProfiles error:', err);
    }
}

onMounted(() => {
    loadUsers();
    loadProfiles();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
