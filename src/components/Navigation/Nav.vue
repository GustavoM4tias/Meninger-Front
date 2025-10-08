<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../stores/Auth/authStore';
import { useNotificationStore } from '../../stores/Config/notificationStore';
import { useFavoritesStore } from '../../stores/Config/favoriteStore';
import Search from '@/components/Navigation/components/Search.vue';
import Notification from '@/components/Navigation/components/Notification.vue';
import Profile from '@/components/Navigation/components/Profile.vue';
import { RouterLink } from 'vue-router';

// Stores
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const notificationStore = useNotificationStore();

// Estado dos dropdowns principais
const dropdowns = ref({
    favorites: false,
    marketing: false,
    comercial: false,
    tools: false,
    settings: false
});

// Estado dos subdropdowns
const subDropdowns = ref({
    events: false,
    buildings: false
}); 

// Configuração dos menus com subcategorias
const menuItems = {
    marketing: {
        events: {
            name: 'Eventos',
            icon: 'fas fa-newspaper',
            items: [
                { router: '/events', section: 'Geral', name: 'Geral', icon: 'fas fa-list' },
                { router: '/events', section: 'Próximos', name: 'Próximos', icon: 'fas fa-calendar-plus' },
                { router: '/events', section: 'Finalizados', name: 'Finalizados', icon: 'fas fa-calendar-check' }
            ]
        },
        buildings: {
            name: 'Empreendimentos',
            icon: 'fas fa-building',
            items: [
                { router: '/buildings', section: 'Geral', name: 'Geral', icon: 'fas fa-list' },
                { router: '/buildings', section: 'Pré Lançamentos', name: 'Pré Lançamentos', icon: 'fas fa-rocket' },
                { router: '/buildings', section: 'Lançamentos', name: 'Lançamentos', icon: 'fas fa-play' },
                { router: '/buildings', section: 'Em Obras', name: 'Em Obras', icon: 'fas fa-hammer' },
                { router: '/buildings', section: 'Finalizados', name: 'Finalizados', icon: 'fas fa-check-circle' },
                { router: '/buildings', section: 'Portal do Cliente', name: 'Portal do Cliente', icon: 'fas fa-user-circle' }
            ]
        }
    },
    comercial: [
        { router: '/comercial/leads', section: 'Leads', name: 'Leads', icon: 'fas fa-user-plus' }, 
        { router: '/comercial/repasses', section: 'Repasses', name: 'Repasses', icon: 'fas fa-exchange-alt' },
        { router: '/comercial/faturamento', section: 'Faturamento', name: 'Faturamento', icon: 'fas fa-file-invoice-dollar' }
    ],
    tools: [
        { router: '/tools/validator', section: 'Validador', name: 'Validador', icon: 'fas fa-check-double' }
    ],
    settings: [
        { router: '/settings/Account', section: 'Minha Conta', name: 'Minha Conta', icon: 'fas fa-user-cog' },
        { router: '/settings/users', section: 'Usuários', name: 'Usuários', icon: 'fas fa-users' },
        { router: '/settings/organograma', section: 'Organograma', name: 'Organograma', icon: 'fas fa-sitemap' },
    ],
    supports: [
        { router: '/report', section: '', name: 'Reportar Problema', icon: 'fas fa-bug' },
        { router: '/support', section: '', name: 'Suporte', icon: 'fas fa-comments' }, 
    ]
};

// Agrupar favoritos por categoria
const groupedFavorites = computed(() => {
    return favoritesStore.favorites.reduce((groups, favorite) => {
        const category = getCategoryByRouter(favorite.router);
        const subcategory = getSubcategoryByRouterAndSection(favorite.router, favorite.section);

        if (!groups[category]) {
            groups[category] = {};
        }

        const key = subcategory || '__sem_subcategoria__';

        if (!groups[category][key]) {
            groups[category][key] = [];
        }

        groups[category][key].push(favorite);
        return groups;
    }, {});
});


// Função para determinar categoria baseada no router
const getCategoryByRouter = (router) => {
    if (router.startsWith('/comercial')) return 'Comercial';
    if (router.startsWith('/events') || router.startsWith('/buildings')) return 'Marketing';
    if (router.startsWith('/tools')) return 'Ferramentas';
    if (router.startsWith('/settings')) return 'Configurações';
    if (router.startsWith('/support')) return 'Suporte';
    return 'Outros';
};

const getSubcategoryByRouterAndSection = (router, section) => {
    const marketing = menuItems.marketing;

    for (const subKey in marketing) {
        const subcategory = marketing[subKey];
        if (subcategory.items.some(item => item.router === router && item.section === section)) {
            return subcategory.name;
        }
    }

    return null;
};

// Função para alternar dropdown principal
const toggleDropdown = (dropdownName) => {
    // Fechar todos os outros dropdowns principais
    Object.keys(dropdowns.value).forEach(key => {
        if (key !== dropdownName) {
            dropdowns.value[key] = false;
        }
    });
    // Fechar todos os subdropdowns quando um dropdown principal é fechado
    if (!dropdowns.value[dropdownName]) {
        Object.keys(subDropdowns.value).forEach(key => {
            subDropdowns.value[key] = false;
        });
    }
    // Alternar o dropdown atual
    dropdowns.value[dropdownName] = !dropdowns.value[dropdownName];
};

// Função para alternar subdropdown
const toggleSubDropdown = (subDropdownName) => {
    subDropdowns.value[subDropdownName] = !subDropdowns.value[subDropdownName];
};

// Função para verificar se item está favoritado
const isFavorited = (router, section) => {
    return favoritesStore.isFavorited(router, section);
};

// Função para alternar favorito
const toggleFavorite = async (router, section) => {
    try {
        if (isFavorited(router, section)) {
            await favoritesStore.removeFavorite(router, section);
        } else {
            await favoritesStore.addFavorite(router, section);
        }
        await favoritesStore.loadFavorites();
    } catch (error) {
        console.error("Erro ao atualizar favorito", error);
    }
};

// Inicialização
onMounted(async () => {
    await favoritesStore.loadFavorites();
    await notificationStore.fetchNotifications();

    // Inicializar Flowbite dropdowns
    if (typeof initFlowbite !== 'undefined') {
        initFlowbite();
    }
});
</script>

<template>
    <div class="sm:w-64">
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
                                    d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z">
                                </path>
                            </svg>
                        </button>
                        <a href="https://menin.com.br" target="_blank" class="flex ms-2 md:me-24">
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
        <aside id="logo-sidebar"
            class="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
            aria-label="Sidebar">
            <div class="flex flex-col justify-between h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
                <ul class="space-y-2 font-medium overflow-auto">
                    <!-- Dashboard -->
                    <li>
                        <RouterLink to="/"
                            class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                            <i
                                class="fas fa-house text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="ms-3">Dashboard</span>
                        </RouterLink>
                    </li>

                    <!-- Favoritos -->
                    <li>
                        <button type="button" @click="toggleDropdown('favorites')"
                            class="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :aria-expanded="dropdowns.favorites">
                            <i
                                class="fa fa-star text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap">Favoritos</span>
                            <i :class="dropdowns.favorites ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                        </button>
                        <ul v-show="dropdowns.favorites" class="py-2 space-y-2">
                            <template v-if="Object.keys(groupedFavorites).length > 0">
                                <li v-for="(subGroups, category) in groupedFavorites" :key="category" class="ml-4">
                                    <p class="font-semibold text-gray-600 dark:text-gray-400 mb-1">{{ category }}</p>
                                    <ul>
                                        <li v-for="(favorites, subcategory) in subGroups" :key="subcategory"
                                            class="ml-2">
                                            <!-- Exibe nome da subcategoria, exceto se for sem subcategoria -->
                                            <p v-if="subcategory !== '__sem_subcategoria__'"
                                                class="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                                {{ subcategory }}
                                            </p>
                                            <ul class="space-y-1">
                                                <li v-for="favorite in favorites"
                                                    :key="`${favorite.router}-${favorite.section}`">
                                                    <div
                                                        class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                                        <RouterLink
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


                    <!-- Marketing -->
                    <li>
                        <button type="button" @click="toggleDropdown('marketing')"
                            class="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :aria-expanded="dropdowns.marketing">
                            <i
                                class="fa fa-bullhorn text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap">Marketing</span>
                            <i :class="dropdowns.marketing ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                        </button>
                        <ul v-show="dropdowns.marketing" class="py-2 space-y-2 ml-4">
                            <!-- Eventos Subcategoria -->
                            <li>
                                <button type="button" @click="toggleSubDropdown('events')"
                                    class="flex items-center w-full p-2 text-gray-700 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                                    :aria-expanded="subDropdowns.events">
                                    <i :class="menuItems.marketing.events.icon"
                                        class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                                    <span class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap">{{
                                        menuItems.marketing.events.name
                                    }}</span>
                                    <i :class="subDropdowns.events ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                        class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                                </button>
                                <ul v-show="subDropdowns.events" class="py-1 space-y-1 ml-4">
                                    <li v-for="item in menuItems.marketing.events.items"
                                        :key="`${item.router}-${item.section}`">
                                        <div
                                            class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                            <RouterLink :to="{ path: item.router, query: { section: item.section } }"
                                                class="flex-1 flex items-center text-gray-900 dark:text-white">
                                                <i :class="item.icon" class="text-gray-500"></i>
                                                <span class="ms-3">{{ item.name }}</span>
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

                            <!-- Empreendimentos Subcategoria -->
                            <li>
                                <button type="button" @click="toggleSubDropdown('buildings')"
                                    class="flex items-center w-full p-2 text-gray-700 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
                                    :aria-expanded="subDropdowns.buildings">
                                    <i :class="menuItems.marketing.buildings.icon"
                                        class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                                    <span class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap">{{
                                        menuItems.marketing.buildings.name }}</span>
                                    <i :class="subDropdowns.buildings ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                        class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                                </button>
                                <ul v-show="subDropdowns.buildings" class="py-1 space-y-1 ml-4">
                                    <li v-for="item in menuItems.marketing.buildings.items"
                                        :key="`${item.router}-${item.section}`">
                                        <div
                                            class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                            <RouterLink :to="{ path: item.router, query: { section: item.section } }"
                                                class="flex-1 flex items-center text-gray-900 dark:text-white">
                                                <i :class="item.icon" class="text-gray-500"></i>
                                                <span class="ms-3">{{ item.name }}</span>
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
                    </li>

                    <!-- Comercial -->
                    <li>
                        <button type="button" @click="toggleDropdown('comercial')"
                            class="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :aria-expanded="dropdowns.comercial">
                            <i
                                class="fas fa-briefcase text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap">Comercial</span>
                            <i :class="dropdowns.comercial ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                        </button>
                        <ul v-show="dropdowns.comercial" class="py-2 space-y-2 ml-4">
                            <li v-for="item in menuItems.comercial" :key="`${item.router}-${item.section}`">
                                <div
                                    class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                    <RouterLink :to="{ path: item.router, query: { section: item.section } }"
                                        class="flex-1 flex items-center text-gray-900 dark:text-white">
                                        <i :class="item.icon" class="text-gray-500"></i>
                                        <span class="ms-3">{{ item.name }}</span>
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

                    <!-- Ferramentas -->
                    <li>
                        <button type="button" @click="toggleDropdown('tools')"
                            class="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :aria-expanded="dropdowns.tools">
                            <i
                                class="fas fa-wrench text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap">Ferramentas</span>
                            <i :class="dropdowns.tools ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                        </button>
                        <ul v-show="dropdowns.tools" class="py-2 space-y-2 ml-4">
                            <li v-for="item in menuItems.tools" :key="`${item.router}-${item.section}`">
                                <div
                                    class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                    <RouterLink :to="{ path: item.router, query: { section: item.section } }"
                                        class="flex-1 flex items-center text-gray-900 dark:text-white">
                                        <i :class="item.icon" class="text-gray-500"></i>
                                        <span class="ms-3">{{ item.name }}</span>
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

                    <!-- Configurações -->
                    <li>
                        <button type="button" @click="toggleDropdown('settings')"
                            class="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :aria-expanded="dropdowns.settings">
                            <i
                                class="fas fa-gear text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap">Configurações</span>
                            <i :class="dropdowns.settings ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                        </button>
                        <ul v-show="dropdowns.settings" class="py-2 space-y-2 ml-4">
                            <li v-for="item in menuItems.settings" :key="`${item.router}-${item.section}`">
                                <div
                                    class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                    <RouterLink :to="{ path: item.router, query: { section: item.section } }"
                                        class="flex-1 flex items-center text-gray-900 dark:text-white">
                                        <i :class="item.icon" class="text-gray-500"></i>
                                        <span class="ms-3">{{ item.name }}</span>
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
                <ul class="pt-4 mt-4 space-y-2 font-medium border-t border-gray-200 dark:border-gray-700">

                    <div class="block md:hidden">
                        <Search />
                    </div>

                    <!-- Configurações -->
                    <li v-if="authStore?.user?.role === 'admin' ">
                        <button type="button" @click="toggleDropdown('supports')"
                            class="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            :aria-expanded="dropdowns.supports">
                            <i
                                class="fas fa-circle-info text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="flex-1 ms-3 text-left rtl:text-right whitespace-nowrap">Suporte</span>
                            <i :class="dropdowns.supports ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
                                class="text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                        </button>
                        <ul v-show="dropdowns.supports" class="py-2 space-y-2 ml-4">
                            <li v-for="item in menuItems.supports" :key="`${item.router}-${item.section}`">
                                <div
                                    class="flex items-center justify-between group/item hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1">
                                    <RouterLink :to="{ path: item.router, query: { section: item.section } }"
                                        class="flex-1 flex items-center text-gray-900 dark:text-white">
                                        <i :class="item.icon" class="text-gray-500"></i>
                                        <span class="ms-3">{{ item.name }}</span>
                                    </RouterLink>
                                </div>
                            </li>
                        </ul>
                    </li>

                    <li v-else>
                        <RouterLink to="/report"
                            class="flex items-center p-2 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group">
                            <i
                                class="fas fa-bug text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="ms-3">Reportar Problema</span>
                        </RouterLink>
                    </li>


                    <li>
                        <RouterLink to="/docs"
                            class="flex items-center p-2 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white group">
                            <i
                                class="fas fa-book text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="ms-3">Documentação</span>
                        </RouterLink>
                    </li>
                    <li>
                        <button @click="authStore.logout()"
                            class="flex items-center w-full p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group">
                            <i
                                class="fas fa-arrow-right-from-bracket text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"></i>
                            <span class="flex-1 ms-3 whitespace-nowrap text-left">Sair</span>
                        </button>
                    </li>
                </ul>
            </div>
        </aside>
    </div>
</template>