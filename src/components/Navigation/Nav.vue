<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import { useFavoritesStore } from '@/stores/Config/favoriteStore';
import Search from '@/components/Navigation/components/Search.vue';
import Notification from '@/components/Navigation/components/Notification.vue';
import Profile from '@/components/Navigation/components/Profile.vue';
import { RouterLink } from 'vue-router';

// Stores
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const notificationStore = useNotificationStore();

/**
 * MENU FLEXÍVEL
 * - Categoria pode ser:
 *    1) Array:   categoria: [ {router, section, name, icon}, ... ]
 *    2) Objeto:  categoria: {
 *          items?: [ ...itens planos ],
 *          subkey1: { name, icon, items: [ ... ] },
 *          subkey2: { name, icon, items: [ ... ] },
 *       }
 */
const menuItems = {
    marketing: {
        events: {
            name: 'Eventos',
            icon: 'fas fa-newspaper',
            items: [
                { router: '/marketing/events', section: 'Geral', name: 'Geral', icon: 'fas fa-list' },
                { router: '/marketing/events', section: 'Próximos', name: 'Próximos', icon: 'fas fa-calendar-plus' },
                { router: '/marketing/events', section: 'Finalizados', name: 'Finalizados', icon: 'fas fa-calendar-check' }
            ]
        },
        items: [
            { router: '/marketing/leads', section: 'Leads', name: 'Leads', icon: 'fas fa-user-plus' },
            { router: '/marketing/viability', section: 'Viability', name: 'Viabilidade', icon: 'fas fa-scale-balanced' }
        ]
    },
    comercial: {
        buildings: {
            name: 'Empreendimentos',
            icon: 'fas fa-building',
            items: [
                { router: '/comercial/buildings', section: 'Geral', name: 'Geral', icon: 'fas fa-list' },
                { router: '/comercial/buildings', section: 'Pré Lançamentos', name: 'Pré Lançamentos', icon: 'fas fa-rocket' },
                { router: '/comercial/buildings', section: 'Lançamentos', name: 'Lançamentos', icon: 'fas fa-play' },
                { router: '/comercial/buildings', section: 'Em Obras', name: 'Em Obras', icon: 'fas fa-hammer' },
                { router: '/comercial/buildings', section: 'Finalizados', name: 'Finalizados', icon: 'fas fa-check-circle' },
                { router: '/comercial/buildings', section: 'Portal do Cliente', name: 'Portal do Cliente', icon: 'fas fa-user-circle' }
            ]
        },
        sales: {
            name: 'Vendas',
            icon: 'fas fa-credit-card',
            items: [
                { router: '/comercial/faturamento', section: 'Faturamento', name: 'Faturamento', icon: 'fas fa-file-invoice-dollar' }, 
                { router: '/comercial/projections', section: 'Projeção', name: 'Projeção vendas', icon: 'fas fa-chart-line' }, 
            ]
        },
        items: [ 
            { router: '/comercial/awards', section: 'Premiações', name: 'Premiação', icon: 'fas fa-award' }, 
            { router: '/comercial/workflow/groups', section: 'Workflow', name: 'Grupos Workflow', icon: 'fas fa-chart-diagram' }
        ]
    },
    financeiro: {
        items: [
            { router: '/financeiro/titulos', section: 'Títulos', name: 'Títulos', icon: 'fas fa-money-bill-transfer' },
            { router: '/financeiro/custos', section: 'Custos', name: 'Custos', icon: 'fas fa-coins' }
        ]
    },
    tools: [{ router: '/tools/validator', section: 'Validador', name: 'Validador', icon: 'fas fa-check-double' }],
    settings: [
        { router: '/settings/Account', section: 'Minha Conta', name: 'Minha Conta', icon: 'fas fa-user-cog' },
        { router: '/settings/users', section: 'Usuários', name: 'Usuários', icon: 'fas fa-users' },
        { router: '/settings/organograma', section: 'Organograma', name: 'Organograma', icon: 'fas fa-sitemap' },
        { router: '/settings/cidades', section: 'Cidades', name: 'Cidades', icon: 'fas fa-city' },
        { router: '/settings/management', section: 'Cargos', name: 'Departamentos', icon: 'fas fa-gears' }
    ]
    // supports: [...]
};

// ---- Helpers de forma/estrutura ----
const isArrayCategory = (cat) => Array.isArray(menuItems[cat]);
const categoryKeys = computed(() => Object.keys(menuItems));

const categoryLabelMap = {
    marketing: 'Marketing',
    comercial: 'Comercial',
    financeiro: 'Financeiro',
    tools: 'Ferramentas',
    settings: 'Configurações'
};
const catLabel = (key) => categoryLabelMap[key] || (key.charAt(0).toUpperCase() + key.slice(1));

// Subcategorias de um objeto-categoria (ignora "items")
const subcatEntries = (catKey) => {
    const node = menuItems[catKey];
    if (Array.isArray(node)) return [];
    return Object.entries(node || {}).filter(([k, v]) => k !== 'items' && v && Array.isArray(v.items));
};

const isAdmin = computed(() => authStore?.user?.role === 'admin');

const categoryFlatItems = (catKey) => {
    const node = menuItems[catKey];
    const items = Array.isArray(node) ? node : (Array.isArray(node?.items) ? node.items : []);

    if (catKey === 'settings' && !isAdmin.value) {
        return items.filter(
            (it) =>
                it.router !== '/settings/cidades' &&
                it.router !== '/settings/users' &&
                it.router !== '/settings/management'
        );
    }

    if (catKey === 'comercial' && !isAdmin.value) {
        return items.filter((it) => it.router !== '/ccomercial/workflow');
    }

    return items;
};

// ---- Estados de dropdowns (dinâmicos) ----
const dropdowns = ref({});
const subDropdowns = ref({}); // chave: `${cat}.${subKey}`

function initDropdownStates() {
    const d = {};
    const s = {};
    for (const cat of categoryKeys.value) {
        d[cat] = false;
        if (!isArrayCategory(cat)) {
            for (const [subKey] of subcatEntries(cat)) {
                s[`${cat}.${subKey}`] = false;
            }
        }
    }
    // garante favorites
    d.favorites = false;

    dropdowns.value = d;
    subDropdowns.value = s;
}
initDropdownStates();

// Toggles (lógica original)
const toggleDropdown = (dropdownName) => {
    Object.keys(dropdowns.value).forEach((k) => {
        if (k !== dropdownName) dropdowns.value[k] = false;
    });

    if (!dropdowns.value[dropdownName]) {
        Object.keys(subDropdowns.value).forEach((k) => {
            if (k.startsWith(`${dropdownName}.`)) subDropdowns.value[k] = false;
        });
    }

    dropdowns.value[dropdownName] = !dropdowns.value[dropdownName];
};

const toggleSubDropdown = (cat, subKey) => {
    const key = `${cat}.${subKey}`;
    subDropdowns.value[key] = !subDropdowns.value[key];
};

// ---- Sidebar collapse (somente UI) ----
const isCollapsed = ref(false);

// largura expandida e recolhida (Tailwind padrão):
// w-72 = 18rem | w-12 = 3rem (ainda menor e acompanha só ícones)
const sidebarWidthClass = computed(() => (isCollapsed.value ? 'sm:w-12 w-12' : 'w-auto sm:w-72'));

const collapseSidebar = () => {
    isCollapsed.value = true;

    // fecha tudo visualmente (não muda sua lógica de favoritos/index, só estados de dropdown)
    Object.keys(dropdowns.value).forEach((k) => (dropdowns.value[k] = false));
    Object.keys(subDropdowns.value).forEach((k) => (subDropdowns.value[k] = false));
};

const expandSidebar = () => {
    isCollapsed.value = false;
};

const toggleSidebar = () => {
    if (isCollapsed.value) expandSidebar();
    else collapseSidebar();
};

// Quando estiver colapsado, expande antes e depois executa a ação original
const withExpand = (fn) => {
    return (...args) => {
        if (isCollapsed.value) {
            expandSidebar();
            requestAnimationFrame(() => fn(...args));
            return;
        }
        fn(...args);
    };
};

const toggleDropdownSafe = withExpand(toggleDropdown);
const toggleSubDropdownSafe = withExpand(toggleSubDropdown);

// ---- Índice para favoritos (router+section -> categoria/subcategoria) ----
const routeIndex = computed(() => {
    const idx = {};

    const add = (catKey, subcatName, item) => {
        const k = `${item.router}@@${item.section ?? ''}`;
        idx[k] = { category: catLabel(catKey), subcategory: subcatName || null };
    };

    for (const catKey of categoryKeys.value) {
        if (isArrayCategory(catKey)) {
            for (const it of menuItems[catKey]) add(catKey, null, it);
        } else {
            for (const it of categoryFlatItems(catKey)) add(catKey, null, it);
            for (const [, subObj] of subcatEntries(catKey)) {
                const subName = subObj.name;
                for (const it of subObj.items || []) add(catKey, subName, it);
            }
        }
    }
    return idx;
});

const getCategoryByRouter = (router) => {
    const keys = Object.keys(routeIndex.value);
    const found = keys.find((k) => k.startsWith(`${router}@@`));
    return found ? routeIndex.value[found].category : 'Outros';
};

const getSubcategoryByRouterAndSection = (router, section) => {
    const key = `${router}@@${section ?? ''}`;
    return routeIndex.value[key]?.subcategory ?? null;
};

const groupedFavorites = computed(() => {
    const list = Array.isArray(favoritesStore.favorites) ? favoritesStore.favorites : [];

    return list.reduce((groups, fav) => {
        const category = getCategoryByRouter(fav.router);
        const subcategory = getSubcategoryByRouterAndSection(fav.router, fav.section);

        if (!groups[category]) groups[category] = {};
        const key = subcategory || '__sem_subcategoria__';
        if (!groups[category][key]) groups[category][key] = [];
        groups[category][key].push(fav);
        return groups;
    }, {});
});

// Favoritos
const isFavorited = (router, section) => favoritesStore.isFavorited(router, section);

const toggleFavorite = async (router, section) => {
    try {
        if (isFavorited(router, section)) {
            await favoritesStore.removeFavorite(router, section);
        } else {
            await favoritesStore.addFavorite(router, section);
        }
        await favoritesStore.loadFavorites();
    } catch (error) {
        console.error('Erro ao atualizar favorito', error);
    }
};

// Inicialização
onMounted(async () => {
    await favoritesStore.loadFavorites();
    // await notificationStore.fetchNotifications(); REATIVAR NOTIFICAÇÃO
    if (typeof initFlowbite !== 'undefined') initFlowbite();
});
</script>

<template>
    <!-- wrapper acompanha a largura da sidebar (expanded/colapsed) -->
    <div :class="['transition-[width] duration-200 ease-in-out', sidebarWidthClass]">
        <!-- Top Navigation Bar -->
        <nav class="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
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
            'fixed top-0 left-0 z-40 h-screen pt-20 bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700 -translate-x-full',
            // animação suave ao mudar a largura (evita corte seco)
            'transition-[width] duration-200 ease-in-out',
            isCollapsed ? 'w-12' : 'w-72'
        ]" aria-label="Sidebar">
            <div :class="[
                'flex flex-col justify-between h-full pb-4 overflow-y-auto bg-white dark:bg-gray-800',
                isCollapsed ? 'px-1' : 'px-3',
                // animação leve de padding junto com a largura
                'transition-[padding] duration-200 ease-in-out'
            ]">
                <ul class="space-y-2 font-medium overflow-auto">
                    <!-- Dashboard -->
                    <li>
                        <RouterLink to="/" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <!-- ÍCONE não muda de tamanho -->
                            <i
                                class="fas fa-house w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>

                            <!-- texto some com fade simples -->
                            <span v-show="!isCollapsed" class="ms-3 transition-opacity duration-200 ease-in-out">
                                Dashboard
                            </span>
                        </RouterLink>
                    </li>

                    <!-- Favoritos -->
                    <li>
                        <button type="button" @click="toggleDropdownSafe('favorites')"
                            class="flex items-center w-full p-2 h-10 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :class="isCollapsed ? 'justify-center' : ''" :aria-expanded="dropdowns.favorites">
                            <i
                                class="fa fa-star w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>

                            <span v-show="!isCollapsed"
                                class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap transition-opacity duration-200 ease-in-out">
                                Favoritos
                            </span>

                            <i v-show="!isCollapsed"
                                :class="dropdowns.favorites ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white transition-opacity duration-200 ease-in-out"></i>
                        </button>

                        <ul v-show="!isCollapsed && dropdowns.favorites" class="py-2 space-y-2">
                            <template v-if="Object.keys(groupedFavorites).length > 0">
                                <li v-for="(subGroups, category) in groupedFavorites" :key="category" class="ml-4">
                                    <p class="font-semibold text-gray-600 dark:text-gray-400 mb-1">{{ category }}</p>
                                    <ul>
                                        <li v-for="(favorites, subcategory) in subGroups" :key="subcategory"
                                            class="ml-2">
                                            <p v-if="subcategory !== '__sem_subcategoria__'"
                                                class="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                                {{ subcategory }}
                                            </p>
                                            <ul class="space-y-1">
                                                <li v-for="favorite in favorites"
                                                    :key="`${favorite.router}-${favorite.section}`">
                                                    <div
                                                        class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                                        <RouterLink @click="expandSidebar"
                                                            :to="{ path: favorite.router, query: { section: favorite.section } }"
                                                            class="flex-1 flex items-center text-gray-900 dark:text-white">
                                                            <span class="truncate">{{ favorite.section }}</span>
                                                        </RouterLink>
                                                        <button
                                                            @click="toggleFavorite(favorite.router, favorite.section)"
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

                    <!-- CATEGORIAS DINÂMICAS -->
                    <li v-for="catKey in categoryKeys" :key="catKey">
                        <button type="button" @click="toggleDropdownSafe(catKey)"
                            class="flex items-center w-full h-10 px-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :class="isCollapsed ? 'justify-center' : ''" :aria-expanded="dropdowns[catKey]">
                            <i :class="{
                                marketing: 'fa fa-bullhorn',
                                comercial: 'fas fa-briefcase',
                                financeiro: 'fas fa-money-bill-wave',
                                tools: 'fas fa-wrench',
                                settings: 'fas fa-gear',
                                supports: 'fas fa-circle-info'
                            }[catKey] || 'far fa-folder'"
                                class="w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>

                            <span v-show="!isCollapsed"
                                class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap transition-opacity duration-200 ease-in-out">
                                {{ catLabel(catKey) }}
                            </span>

                            <i v-show="!isCollapsed"
                                :class="dropdowns[catKey] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white transition-opacity duration-200 ease-in-out"></i>
                        </button>

                        <ul v-show="!isCollapsed && dropdowns[catKey]" class="py-2 space-y-2 ml-4">
                            <!-- SUBCATEGORIAS -->
                            <template v-if="!isArrayCategory(catKey)">
                                <li v-for="[subKey, subObj] in subcatEntries(catKey)" :key="`${catKey}.${subKey}`">
                                    <button type="button" @click="toggleSubDropdownSafe(catKey, subKey)"
                                        class="flex items-center w-full p-1.5 text-gray-700 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600"
                                        :aria-expanded="subDropdowns[`${catKey}.${subKey}`]">
                                        <i :class="subObj.icon || 'far fa-folder'"
                                            class="w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>

                                        <span v-show="!isCollapsed"
                                            class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap transition-opacity duration-200 ease-in-out">
                                            {{ subObj.name || subKey }}
                                        </span>

                                        <i v-show="!isCollapsed"
                                            :class="subDropdowns[`${catKey}.${subKey}`] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                            class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white transition-opacity duration-200 ease-in-out"></i>
                                    </button>

                                    <ul v-show="!isCollapsed && subDropdowns[`${catKey}.${subKey}`]"
                                        class="py-1 space-y-1 ml-4">
                                        <li v-for="item in subObj.items" :key="`${item.router}-${item.section}`">
                                            <div
                                                class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                                <RouterLink @click="expandSidebar"
                                                    :to="{ path: item.router, query: { section: item.section } }"
                                                    class="flex-1 flex items-center text-gray-900 dark:text-white">
                                                    <i :class="item.icon || 'far fa-file'"
                                                        class="w-5 text-gray-500"></i>
                                                    <span v-show="!isCollapsed"
                                                        class="ms-3 transition-opacity duration-200 ease-in-out">{{
                                                        item.name }}</span>
                                                </RouterLink>

                                                <button @click="toggleFavorite(item.router, item.section)"
                                                    class="ml-2 p-1 transition-opacity duration-200"
                                                    :class="isFavorited(item.router, item.section) ? 'text-amber-400 hover:text-amber-400' : 'text-gray-400 hover:text-amber-400'">
                                                    <i :class="isFavorited(item.router, item.section) ? 'fas fa-star' : 'far fa-star'"
                                                        class="text-lg"></i>
                                                </button>
                                            </div>
                                        </li>
                                    </ul>
                                </li>
                            </template>

                            <!-- ITENS PLANOS -->
                            <li v-for="item in categoryFlatItems(catKey)" :key="`${item.router}-${item.section}`">
                                <div
                                    class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                    <RouterLink @click="expandSidebar"
                                        :to="{ path: item.router, query: { section: item.section } }"
                                        class="flex-1 flex items-center text-gray-900 dark:text-white">
                                        <i :class="item.icon || 'far fa-file'" class="w-5 text-gray-500"></i>
                                        <span v-show="!isCollapsed"
                                            class="ms-3 transition-opacity duration-200 ease-in-out">{{ item.name
                                            }}</span>
                                    </RouterLink>

                                    <button @click="toggleFavorite(item.router, item.section)"
                                        class="ml-2 p-1 transition-opacity duration-200"
                                        :class="isFavorited(item.router, item.section) ? 'text-amber-400 hover:text-amber-400' : 'text-gray-400 hover:text-amber-400'">
                                        <i :class="isFavorited(item.router, item.section) ? 'fas fa-star' : 'far fa-star'"
                                            class="text-lg"></i>
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
                            <i
                                class="fas fa-circle-info w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed"
                                class="ms-3 transition-opacity duration-200 ease-in-out">Suporte</span>
                        </RouterLink>
                    </li>

                    <li>
                        <RouterLink to="/report" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i
                                class="fas fa-bug w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed"
                                class="ms-3 transition-opacity duration-200 ease-in-out">Reportar
                                Problema</span>
                        </RouterLink>
                    </li>

                    <li>
                        <RouterLink to="/docs" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i
                                class="fas fa-book w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed"
                                class="ms-3 transition-opacity duration-200 ease-in-out">Documentação</span>
                        </RouterLink>
                    </li>

                    <li>
                        <RouterLink to="/academy" @click="expandSidebar"
                            class="flex items-center p-2 h-10 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i
                                class="fas fa-graduation-cap w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed"
                                class="ms-3 transition-opacity duration-200 ease-in-out">Academy</span>
                        </RouterLink>
                    </li>

                    <li>
                        <button @click="authStore.logout()"
                            class="flex items-center w-full p-2 h-10 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                            :class="isCollapsed ? 'justify-center' : ''">
                            <i
                                class="fas fa-arrow-right-from-bracket w-5 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span v-show="!isCollapsed"
                                class="flex-1 ms-3 whitespace-nowrap text-left transition-opacity duration-200 ease-in-out">Sair</span>
                        </button>
                    </li>
                </ul>
            </div>
        </main>
    </div>
</template>
