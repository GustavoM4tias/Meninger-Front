<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import { useFavoritesStore } from '@/stores/Config/favoriteStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { navRegistry, allManagedRoutes } from '@/config/navRegistry';
import Search from '@/components/Navigation/components/Search.vue';
import Notification from '@/components/Navigation/components/Notification.vue';
import Profile from '@/components/Navigation/components/Profile.vue';
import { RouterLink } from 'vue-router';

// Stores
const authStore       = useAuthStore();
const favoritesStore  = useFavoritesStore();
const notificationStore = useNotificationStore();
const microsoftStore  = useMicrosoftStore();
const permissionStore = usePermissionStore();

// ─── Reatividade de usuário ───────────────────────────────────────────────────
const isAdmin = computed(() => authStore?.user?.role === 'admin');

// ─── Lookup rápido por key ────────────────────────────────────────────────────
const getCat = (key) => navRegistry.find(c => c.key === key);

// ─── Visibilidade por permissão/role ─────────────────────────────────────────

// Verifica se um item individual pode ser exibido.
// - adminOnly: oculta para não-admin
// - rotas não gerenciadas (ex: settings): sempre visíveis
// - rotas gerenciadas: verifica alçada
const canSeeItem = (item) => {
    if (isAdmin.value) return true;
    if (item.adminOnly) return false;
    if (!allManagedRoutes.includes(item.route)) return true;
    return permissionStore.hasAccess(item.route);
};

// Verifica se uma subcategoria tem pelo menos 1 item visível
const subcatHasVisible = (sub) => (sub.pages || []).some(it => canSeeItem(it));

// Verifica se uma categoria tem pelo menos 1 item/subitem visível
const categoryHasVisible = (key) => {
    if (isAdmin.value) return true;
    const cat = getCat(key);
    if (!cat) return false;
    const flatOk   = (cat.pages || []).some(it => canSeeItem(it));
    const subcatOk = (cat.subcategories || []).some(sub => subcatHasVisible(sub));
    return flatOk || subcatOk;
};

// ─── Categorias visíveis (ordem preservada do navRegistry) ───────────────────
// Categorias com permissionManaged:false (ex: settings) são controladas por role,
// não por alçadas — sempre incluídas sem verificação de permissão.
const categoryKeys = computed(() =>
    navRegistry
        .filter(cat => !cat.requiresMicrosoft || microsoftStore.connected)
        .filter(cat => cat.permissionManaged === false || categoryHasVisible(cat.key))
        .map(cat => cat.key)
);

// ─── Subcategorias visíveis de uma categoria ─────────────────────────────────
const subcatEntries = (key) => {
    const cat = getCat(key);
    const subs = cat?.subcategories || [];
    return isAdmin.value ? subs : subs.filter(sub => subcatHasVisible(sub));
};

// ─── Itens planos visíveis de uma categoria ──────────────────────────────────
const categoryFlatItems = (key) => {
    const items = getCat(key)?.pages || [];
    return isAdmin.value ? items : items.filter(it => canSeeItem(it));
};

// ─── Itens visíveis dentro de uma subcategoria ───────────────────────────────
const subcatVisibleItems = (sub) => {
    const items = sub?.pages || [];
    return isAdmin.value ? items : items.filter(it => canSeeItem(it));
};

// ─── Estados de dropdown ─────────────────────────────────────────────────────
const dropdowns    = ref({});
const subDropdowns = ref({});

function initDropdownStates() {
    const d = {};
    const s = {};
    for (const key of categoryKeys.value) {
        d[key] = false;
        for (const sub of subcatEntries(key)) {
            s[`${key}.${sub.key}`] = false;
        }
    }
    d.favorites = false;
    dropdowns.value    = d;
    subDropdowns.value = s;
}
initDropdownStates();

// Reinicializa quando auth carrega e categoryKeys muda (ex: settings aparece)
watch(categoryKeys, () => { initDropdownStates(); });

// ─── Toggles ─────────────────────────────────────────────────────────────────
const toggleDropdown = (name) => {
    Object.keys(dropdowns.value).forEach(k => { if (k !== name) dropdowns.value[k] = false; });
    if (!dropdowns.value[name]) {
        Object.keys(subDropdowns.value).forEach(k => {
            if (k.startsWith(`${name}.`)) subDropdowns.value[k] = false;
        });
    }
    dropdowns.value[name] = !dropdowns.value[name];
};

const toggleSubDropdown = (cat, subKey) => {
    const key = `${cat}.${subKey}`;
    subDropdowns.value[key] = !subDropdowns.value[key];
};

// ─── Sidebar collapse ────────────────────────────────────────────────────────
const isCollapsed = ref(false);
const sidebarWidthClass = computed(() => isCollapsed.value ? 'sm:w-12 w-12' : 'w-auto sm:w-72');

const collapseSidebar = () => {
    isCollapsed.value = true;
    Object.keys(dropdowns.value).forEach(k => (dropdowns.value[k] = false));
    Object.keys(subDropdowns.value).forEach(k => (subDropdowns.value[k] = false));
};
const expandSidebar = () => { isCollapsed.value = false; };
const toggleSidebar = () => { isCollapsed.value ? expandSidebar() : collapseSidebar(); };

// Expande a sidebar antes de executar a ação, se estiver colapsada
const withExpand = (fn) => (...args) => {
    if (isCollapsed.value) { expandSidebar(); requestAnimationFrame(() => fn(...args)); return; }
    fn(...args);
};
const toggleDropdownSafe    = withExpand(toggleDropdown);
const toggleSubDropdownSafe = withExpand(toggleSubDropdown);

// ─── Índice para favoritos ────────────────────────────────────────────────────
const routeIndex = computed(() => {
    const idx = {};
    const add = (catKey, subcatName, item) => {
        const k = `${item.route}@@${item.section ?? ''}`;
        idx[k] = { category: getCat(catKey)?.label || catKey, subcategory: subcatName || null };
    };
    for (const catKey of categoryKeys.value) {
        for (const it of categoryFlatItems(catKey)) add(catKey, null, it);
        for (const sub of subcatEntries(catKey)) {
            for (const it of sub.pages || []) add(catKey, sub.name, it);
        }
    }
    return idx;
});

const getCategoryByRouter = (router) => {
    const found = Object.keys(routeIndex.value).find(k => k.startsWith(`${router}@@`));
    return found ? routeIndex.value[found].category : 'Outros';
};
const getSubcategoryByRouterAndSection = (router, section) =>
    routeIndex.value[`${router}@@${section ?? ''}`]?.subcategory ?? null;

// ─── Favoritos ───────────────────────────────────────────────────────────────
const groupedFavorites = computed(() => {
    const list = Array.isArray(favoritesStore.favorites) ? favoritesStore.favorites : [];
    return list.reduce((groups, fav) => {
        const category    = getCategoryByRouter(fav.router);
        const subcategory = getSubcategoryByRouterAndSection(fav.router, fav.section);
        if (!groups[category]) groups[category] = {};
        const key = subcategory || '__sem_subcategoria__';
        if (!groups[category][key]) groups[category][key] = [];
        groups[category][key].push(fav);
        return groups;
    }, {});
});

const isFavorited   = (route, section) => favoritesStore.isFavorited(route, section);
const toggleFavorite = async (route, section) => {
    try {
        if (isFavorited(route, section)) await favoritesStore.removeFavorite(route, section);
        else                             await favoritesStore.addFavorite(route, section);
        await favoritesStore.loadFavorites();
    } catch (error) {
        console.error('Erro ao atualizar favorito', error);
    }
};

// ─── Inicialização ────────────────────────────────────────────────────────────
onMounted(async () => {
    await Promise.all([
        favoritesStore.loadFavorites(),
        microsoftStore.fetchStatus(),
    ]);
    // await notificationStore.fetchNotifications(); REATIVAR NOTIFICAÇÃO
    if (typeof initFlowbite !== 'undefined') initFlowbite();
});
</script>

<template>
    <!-- wrapper acompanha a largura da sidebar (expanded/colapsed) -->
    <div :class="['transition-[width] duration-200 ease-in-out', sidebarWidthClass]">
        <!-- Top Navigation Bar -->
        <nav class="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
            <div class="px-3 py-3 lg:px-5 lg:pl-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center justify-start rtl:justify-end">
                        <button data-drawer-target="logo-sidebar" data-drawer-toggle="logo-sidebar"
                            aria-controls="logo-sidebar" type="button"
                            class="inline-flex items-center p-2 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600">
                            <span class="sr-only">Open sidebar</span>
                            <svg class="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                                <path clip-rule="evenodd" fill-rule="evenodd"
                                    d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                            </svg>
                        </button>

                        <!-- LOGO: clique para recolher/abrir -->
                        <a href="" @click.prevent="toggleSidebar" class="flex ms-2 md:me-24 cursor-pointer select-none">
                            <img src="/Mlogotext.png" class="h-10 sm:h-12 -my-4 dark:invert-0 invert"
                                alt="Menin Logo" />
                        </a>
                    </div>

                    <div class="flex items-center">
                        <div class="hidden md:block">
                            <Search />
                        </div>
                        <Notification />
                        <Profile />
                    </div>
                </div>
            </div>
        </nav>

        <!-- Sidebar -->
        <main id="logo-sidebar" :class="[
            'fixed top-0 left-0 z-40 h-screen pt-20 bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-900 dark:border-gray-700 -translate-x-full',
            'transition-[width] duration-200 ease-in-out',
            isCollapsed ? 'w-12' : 'w-72'
        ]" aria-label="Sidebar">
            <div :class="[
                'flex flex-col justify-between h-full pb-4 overflow-y-auto bg-white dark:bg-gray-900',
                isCollapsed ? 'px-1' : 'px-3',
                'transition-[padding] duration-200 ease-in-out'
            ]">
                <ul class="space-y-2 font-medium overflow-auto">
                    <!-- Dashboard -->
                    <li>
                        <RouterLink to="/" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i class="fas fa-house w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed" class="ms-3 transition-opacity duration-200 ease-in-out">Dashboard</span>
                        </RouterLink>
                    </li>

                    <!-- Favoritos -->
                    <li>
                        <button type="button" @click="toggleDropdownSafe('favorites')"
                            class="flex items-center w-full p-2 h-10 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
                            :class="isCollapsed ? 'justify-center' : ''" :aria-expanded="dropdowns.favorites">
                            <i class="fa fa-star w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed" class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap transition-opacity duration-200 ease-in-out">Favoritos</span>
                            <i v-show="!isCollapsed" :class="dropdowns.favorites ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white transition-opacity duration-200 ease-in-out"></i>
                        </button>

                        <ul v-show="!isCollapsed && dropdowns.favorites" class="py-2 space-y-2">
                            <template v-if="Object.keys(groupedFavorites).length > 0">
                                <li v-for="(subGroups, category) in groupedFavorites" :key="category" class="ml-4">
                                    <p class="font-semibold text-gray-600 dark:text-gray-400 mb-1">{{ category }}</p>
                                    <ul>
                                        <li v-for="(favorites, subcategory) in subGroups" :key="subcategory" class="ml-2">
                                            <p v-if="subcategory !== '__sem_subcategoria__'"
                                                class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ subcategory }}</p>
                                            <ul class="space-y-1">
                                                <li v-for="favorite in favorites" :key="`${favorite.router}-${favorite.section}`">
                                                    <div class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                                        <RouterLink @click="expandSidebar"
                                                            :to="{ path: favorite.router, query: { section: favorite.section } }"
                                                            class="flex-1 flex items-center text-gray-900 dark:text-white">
                                                            <span class="truncate">{{ favorite.section }}</span>
                                                        </RouterLink>
                                                        <button @click="toggleFavorite(favorite.router, favorite.section)"
                                                            class="ml-2 p-1 transition-opacity duration-200 text-amber-400 hover:text-amber-400">
                                                            <i class="fas fa-star"></i>
                                                        </button>
                                                    </div>
                                                </li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                            </template>
                            <li v-else class="ml-4">
                                <p class="text-sm text-gray-500 dark:text-gray-400 p-2">Nenhum favorito adicionado</p>
                            </li>
                        </ul>
                    </li>

                    <!-- CATEGORIAS DINÂMICAS (geradas pelo navRegistry) -->
                    <li v-for="catKey in categoryKeys" :key="catKey">
                        <button type="button" @click="toggleDropdownSafe(catKey)"
                            class="flex items-center w-full h-10 px-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :class="isCollapsed ? 'justify-center' : ''" :aria-expanded="dropdowns[catKey]">

                            <!-- Ícone especial Microsoft -->
                            <template v-if="getCat(catKey)?.requiresMicrosoft">
                                <svg width="20" height="20" viewBox="0 0 21 21" fill="none"
                                    xmlns="http://www.w3.org/2000/svg" class="w-5 shrink-0">
                                    <rect x="0"  y="0"  width="10" height="10" fill="#F25022" />
                                    <rect x="11" y="0"  width="10" height="10" fill="#7FBA00" />
                                    <rect x="0"  y="11" width="10" height="10" fill="#00A4EF" />
                                    <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
                                </svg>
                            </template>
                            <i v-else :class="getCat(catKey)?.icon || 'far fa-folder'"
                                class="w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>

                            <span v-show="!isCollapsed"
                                class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap transition-opacity duration-200 ease-in-out">
                                {{ getCat(catKey)?.label }}
                            </span>
                            <i v-show="!isCollapsed"
                                :class="dropdowns[catKey] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white transition-opacity duration-200 ease-in-out"></i>
                        </button>

                        <ul v-show="!isCollapsed && dropdowns[catKey]" class="py-2 space-y-2 ml-4">

                            <!-- SUBCATEGORIAS -->
                            <li v-for="sub in subcatEntries(catKey)" :key="`${catKey}.${sub.key}`">
                                <button type="button" @click="toggleSubDropdownSafe(catKey, sub.key)"
                                    class="flex items-center w-full p-1.5 text-gray-700 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600"
                                    :aria-expanded="subDropdowns[`${catKey}.${sub.key}`]">
                                    <i :class="sub.icon || 'far fa-folder'"
                                        class="w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                                    <span v-show="!isCollapsed"
                                        class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap transition-opacity duration-200 ease-in-out">
                                        {{ sub.name }}
                                    </span>
                                    <i v-show="!isCollapsed"
                                        :class="subDropdowns[`${catKey}.${sub.key}`] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                        class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white transition-opacity duration-200 ease-in-out"></i>
                                </button>

                                <ul v-show="!isCollapsed && subDropdowns[`${catKey}.${sub.key}`]"
                                    class="py-1 space-y-1 ml-4">
                                    <li v-for="item in subcatVisibleItems(sub)" :key="`${item.route}-${item.section}`">
                                        <div class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                            <RouterLink @click="expandSidebar"
                                                :to="{ path: item.route, query: item.section ? { section: item.section } : undefined }"
                                                class="flex-1 flex items-center text-gray-900 dark:text-white">
                                                <i :class="item.icon || 'far fa-file'" class="w-5 text-gray-500"></i>
                                                <span v-show="!isCollapsed" class="ms-3 transition-opacity duration-200 ease-in-out">{{ item.name }}</span>
                                            </RouterLink>
                                            <button @click="toggleFavorite(item.route, item.section)"
                                                class="ml-2 p-1 transition-opacity duration-200"
                                                :class="isFavorited(item.route, item.section) ? 'text-amber-400 hover:text-amber-400' : 'text-gray-400 hover:text-amber-400'">
                                                <i :class="isFavorited(item.route, item.section) ? 'fas fa-star' : 'far fa-star'" class="text-lg"></i>
                                            </button>
                                        </div>
                                    </li>
                                </ul>
                            </li>

                            <!-- ITENS PLANOS -->
                            <li v-for="item in categoryFlatItems(catKey)" :key="`${item.route}-${item.section}`">
                                <div class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                    <RouterLink @click="expandSidebar"
                                        :to="{ path: item.route, query: item.section ? { section: item.section } : undefined }"
                                        class="flex-1 flex items-center text-gray-900 dark:text-white">
                                        <i :class="item.icon || 'far fa-file'" class="w-5 text-gray-500"></i>
                                        <span v-show="!isCollapsed" class="ms-3 transition-opacity duration-200 ease-in-out">{{ item.name }}</span>
                                    </RouterLink>
                                    <button @click="toggleFavorite(item.route, item.section)"
                                        class="ml-2 p-1 transition-opacity duration-200"
                                        :class="isFavorited(item.route, item.section) ? 'text-amber-400 hover:text-amber-400' : 'text-gray-400 hover:text-amber-400'">
                                        <i :class="isFavorited(item.route, item.section) ? 'fas fa-star' : 'far fa-star'" class="text-lg"></i>
                                    </button>
                                </div>
                            </li>

                        </ul>
                    </li>
                </ul>

                <!-- Bottom Section -->
                <ul class="space-y-2 font-medium border-t border-gray-200 dark:border-gray-700">
                    <div class="block md:hidden">
                        <Search />
                    </div>

                    <li v-if="authStore?.user?.role === 'admin'">
                        <RouterLink to="/support" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i class="fas fa-circle-info w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed" class="ms-3 transition-opacity duration-200 ease-in-out">Suporte</span>
                        </RouterLink>
                    </li>

                    <li>
                        <RouterLink to="/report" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i class="fas fa-bug w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed" class="ms-3 transition-opacity duration-200 ease-in-out">Reportar Problema</span>
                        </RouterLink>
                    </li>

                    <li>
                        <RouterLink to="/docs" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i class="fas fa-book w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed" class="ms-3 transition-opacity duration-200 ease-in-out">Documentação</span>
                        </RouterLink>
                    </li>

                    <li>
                        <a href="https://academy.menin.com.br/panel" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i class="fas fa-graduation-cap w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed" class="ms-3 transition-opacity duration-200 ease-in-out">Academy</span>
                        </a>
                    </li>

                    <li>
                        <button @click="authStore.logout()"
                            class="flex items-center w-full p-2 h-10 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i class="fas fa-arrow-right-from-bracket w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed" class="flex-1 ms-3 whitespace-nowrap text-left transition-opacity duration-200 ease-in-out">Sair</span>
                        </button>
                    </li>
                </ul>
            </div>
        </main>
    </div>
</template>
