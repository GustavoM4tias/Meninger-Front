<!-- src/components/Nav.vue -->
<template>

    <div class="h-full w-full relative">

        <div class="menu horizontal fixed top-0 left-16 h-16 flex items-center justify-between border-b border-gray-300 bg-gray-100 dark:border-gray-800 dark:bg-gray-700 z-20"
            style="width: calc(100% - 4rem);">

            <div class="pl-2 md:pl-4">
                <img src="/Mlogo.png"
                    class="h-12 md:h-14 object-cover filter opacity-80 drop-shadow invert dark:invert-0" alt="Logo" />
            </div>

            <div class="relative w-full flex justify-end">

                <Search />

                <div x-data="{ isActive: false }" class="notification flex px-3 md:px-5">
                    <!-- Botão de notificações -->
                    <div x-on:click="isActive = !isActive"
                        class="text-3xl flex text-gray-600 dark:text-gray-200 m-auto cursor-pointer">
                        <i class="far fa-bell"></i>
                        <i v-if="notificationStore.notifications.length > 0"
                            class="fas fa-circle text-sm text-red-500 -ml-2.5 fa-bounce slow-animation"></i>
                    </div>

                    <!-- Menu de notificações --> <!-- AJUSTAR JS IMPORT -->
                    <div class="absolute right-4 md:right-14 top-12 z-10 w-64 max-h-72 overflow-y-auto rounded-md dark:bg-gray-500 bg-gray-300 shadow-lg"
                        role="menu" x-cloak x-transition x-show="isActive" x-on:click.away="isActive = false"
                        x-on:keydown.escape.window="isActive = false">
                        <!-- Lista de notificações -->
                        <div v-if="notificationStore.notifications.length > 0"
                            v-for="(notification, index) in notificationStore.notifications" :key="index"
                            class="notification text-xl flex flex-col text-gray-700 dark:text-gray-300">
                            <NotificationItem :notification="notification" />
                        </div>
                        <div v-else
                            class="notification text-xl flex flex-col text-gray-700 dark:text-gray-300 text-center">
                            <p class="py-4 px-4">Sem Notificações</p>
                        </div>
                    </div>
                </div>

                <div class="profile flex pe-4 md:pe-6"><!-- AJUSTAR JS IMPORT -->

                    <div x-data="{ isActive: false }" class="relative dropdown m-auto">

                        <div class="flex cursor-pointer">
                            <div x-on:click="isActive = !isActive"
                                class="profile-img flex bg-gray-400 rounded-full w-10 h-10 overflow-hidden">
                                <p v-if="authStore.user" class="text-gray-100 m-auto font-semibold">
                                    {{authStore.user?.username?.split(" ").slice
                                        (0, 2).map(name => name[0].toUpperCase()).join("")}}
                                </p>
                            </div>
                        </div>

                        <div class="absolute right-0 z-10 w-48 rounded-md border dark:border-gray-600 border-gray-400 dark:bg-gray-500 bg-gray-300 shadow-lg"
                            role="menu" x-cloak x-transition x-show="isActive" x-on:click.away="isActive = false"
                            x-on:keydown.escape.window="isActive = false">

                            <div class="account text-xl flex flex-col text-gray-700 dark:text-gray-300">


                                <div
                                    class="profile-img relative flex bg-gray-400 rounded-full w-16 h-16 m-auto mt-3 overflow-hidden shadow">
                                    <p class="text-gray-100 m-auto text-3xl">
                                        {{authStore.user?.username?.split(" ").slice(0, 2).map(name =>
                                            name[0].toUpperCase()).join("")}}
                                    </p>
                                </div>

                                <p class="font-semibold text-center my-1 px-3 truncate">
                                    {{authStore.user?.username?.split(" ").filter(name => !["de", "da", "do", "dos",
                                        "das", "e"].includes(name.toLowerCase())).slice(0, 2).join(" ")}}
                                </p>


                                <hr class="border-gray-400 dark:border-gray-600">

                                <div class="m-auto w-full flex truncate py-2 px-8">
                                    <label
                                        class="flex m-auto p-2 w-full cursor-pointer rounded-full bg-gray-100 dark:bg-gray-800 hover:shadow transition-all ease-in-out">
                                        <input class="peer sr-only" id="themeToggle" type="checkbox" v-model="darkMode"
                                            @change="toggleTheme" />
                                        <i :class="{
                                            'far fa-sun translate-x-0': !darkMode,
                                            'far fa-moon translate-x-24': darkMode
                                        }"
                                            class="transition-transform text-gray-800 dark:text-gray-300 duration-400"></i>
                                    </label>
                                </div>

                                <hr class="border-gray-400 dark:border-gray-600">

                                <div class="m-auto p-2 w-full flex">
                                    <button @click="editProfile"
                                        class="flex w-full truncate justify-center rounded-lg cursor-pointer px-2 py-1 duration-100 hover:bg-gray-400 hover:text-gray-200">
                                        <div class="m-auto flex truncate">
                                            <i class="fas fa-pen m-auto mr-3"></i>
                                            <RouterLink to="/settings/Account">Editar Conta</RouterLink>
                                        </div>
                                    </button>
                                </div>

                                <hr class="border-gray-400 dark:border-gray-600">
                                <div class="m-auto p-2 w-full flex">
                                    <button @click="logout"
                                        class="flex w-full justify-center rounded-lg cursor-pointer px-2 py-1 duration-100 hover:bg-gray-400 hover:text-gray-200">
                                        <div class="m-auto flex truncate">
                                            <i class="fas fa-arrow-right-from-bracket m-auto mr-3"></i>
                                            <p>Logout</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            class="menu vertical fixed top-0 left-0 h-full w-16 flex flex-col justify-between border-r dark:border-gray-800 dark:bg-gray-700 border-gray-300 bg-gray-100 z-30">
            <div>
                <div
                    class="flex size-16 items-center justify-center py-4 text-3xl dark:text-gray-300 dark:hover:text-gray-100 text-gray-800 hover:text-gray-900">
                    <div class="group relative flex justify-center rounded cursor-pointer pl-1">
                        <RouterLink to="/">
                            <i class="fas fa-house"></i>
                        </RouterLink>
                    </div>
                </div>
                <div class="px-2 text-2xl">
                    <ul class="space-y-3 border-t border-gray-400 dark:border-gray-800 pt-3">
                        <div @click="openFavorites" v-tippy="'Favoritos'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.favorites }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fa fa-star"></i>
                        </div>
                        <div @click="openEvents" v-tippy="'Eventos'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.events }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-newspaper"></i>
                        </div>
                        <div @click="openEnterprise" v-tippy="'Empreendimentos'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.enterprise }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-building"></i>
                        </div>
                        <div @click="openComercial" v-tippy="'Comercial'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.comercial }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-briefcase"></i>
                        </div>
                        <!-- <div @click="openEngineering" v-tippy="'Engenharia'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.engineering }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-helmet-safety"></i>
                        </div>
                        <div @click="openMarketing" v-tippy="'Marketing'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.marketing }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-bullhorn"></i>
                        </div>
                        <div @click="openReports" v-tippy="'Relatórios'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.reports }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-chart-line"></i>
                        </div> 
                        <div @click="openFinance" v-tippy="'Financeiro'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.finance }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-money-bills"></i>
                        </div> -->
                        <div @click="openTools" v-tippy="'Ferramentas'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.tools }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-wrench"></i>
                        </div>
                        <div @click="openSettings" v-tippy="'Configurações'"
                            :class="{ 'bg-gray-300 dark:bg-gray-500 text-gray-50': dropdowns.settings }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                            <i class="fas fa-gear"></i>
                        </div>
                    </ul>
                </div>
            </div>

            <div>
                <div class="w-full flex p-2">
                    <label
                        class="flex m-auto cursor-pointer rounded-full bg-gray-300 dark:bg-gray-800 transition-all ease-in-out">
                        <input class="peer sr-only" id="themeToggle" type="checkbox" v-model="darkMode"
                            @change="toggleTheme" />
                        <i :class="{
                            'far fa-sun mx-2 my-2': !darkMode,
                            'far fa-moon mx-3 my-2': darkMode
                        }"
                            class="m-auto text-3xl text-gray-700 dark:text-gray-300 transition-transform duration-300"></i>
                    </label>
                </div>
                <div class="sticky inset-x-0 bottom-0 border-t border-gray-200 dark:border-gray-800 p-2 text-2xl">
                    <button
                        class="flex w-full justify-center rounded-lg cursor-pointer px-2 py-2 text-gray-700 hover:text-gray-600 hover:bg-gray-300 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 duration-200">
                        <i class="fas fa-circle-info"></i>
                    </button>
                </div>

            </div>
        </div>

        <div ref="menu" :class="{ 'translate-x-0': menuOpen, '-translate-x-full': !menuOpen }"
            class="menu-hover fixed flex h-full top-16 flex-1 flex-col justify-between border-r filter drop-shadow-xl border-gray-300 dark:border-gray-800 bg-gray-200 dark:bg-gray-700 z-20 transform transition-transform duration-300 ease-in-out">

            <div class="flex pt-4 pb-32 text-xl overflow-y-scroll">

                <ul class="space-y-[12px] ps-3 mx-auto">
                    <li :class="{ '': dropdowns.favorites }">
                        <button @click="toggleDropdown('favorites')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Favoritos
                            <i class="my-auto"
                                :class="dropdowns.favorites ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>

                        <ul v-if="dropdowns.favorites" class="mt-2 text-gray-600 dark:text-gray-300">
                            <li v-for="(favoritesGroup, category) in groupedFavorites" :key="category">
                                <p class="font-semibold text-xl -my-1">{{ category }}</p>
                                <ul>
                                    <MenuLink v-for="favorite in favoritesGroup" :key="favorite.id"
                                        :router="favorite.router" :section="favorite.section" :name="favorite.section"
                                        :isFavorited="true" />
                                </ul>
                            </li>
                        </ul>

                    </li>
                    <li :class="{ '': dropdowns.events }">
                        <button @click="toggleDropdown('events')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Eventos
                            <i class="my-auto"
                                :class="dropdowns.events ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.events" class="mt-2 text-gray-600 dark:text-gray-300">
                            <MenuLink :router="'/events'" :section="'Geral'" :name="'Geral'" :isFavorited="false" />
                            <MenuLink :router="'/events'" :section="'Próximos'" :name="'Próximos'"
                                :isFavorited="false" />
                            <MenuLink :router="'/events'" :section="'Finalizados'" :name="'Finalizados'"
                                :isFavorited="false" />
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.enterprise }">
                        <button @click="toggleDropdown('enterprise')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Empreendimentos
                            <i class="my-auto"
                                :class="dropdowns.enterprise ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.enterprise" class="mt-2 text-gray-600 dark:text-gray-300">
                            <MenuLink :router="'/buildings'" :section="'Geral'" :name="'Geral'" :isFavorited="false" />
                            <MenuLink :router="'/buildings'" :section="'Pré Lançamentos'" :name="'Pré Lançamentos'"
                                :isFavorited="false" />
                            <MenuLink :router="'/buildings'" :section="'Lançamentos'" :name="'Lançamentos'"
                                :isFavorited="false" />
                            <MenuLink :router="'/buildings'" :section="'Em Obras'" :name="'Em Obras'"
                                :isFavorited="false" />
                            <MenuLink :router="'/buildings'" :section="'Finalizados'" :name="'Finalizados'"
                                :isFavorited="false" />
                            <MenuLink :router="'/buildings'" :section="'Portal do Cliente'" :name="'Portal do Cliente'"
                                :isFavorited="false" />
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.comercial }">
                        <button @click="toggleDropdown('comercial')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Comercial
                            <i class="my-auto"
                                :class="dropdowns.comercial ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.comercial" class="mt-2 text-gray-600 dark:text-gray-300">
                            <MenuLink :router="'/comercial/leads'" :section="'Leads'" :name="'Leads'"
                                :isFavorited="false" />
                            <MenuLink :router="'/comercial/reservas'" :section="'Reservas'" :name="'Reservas'"
                                :isFavorited="false" />
                            <MenuLink :router="'/comercial/reservas'" :section="'Imobiliarias'" :name="'Imobiliarias'"
                                :isFavorited="false" />
                            <MenuLink :router="'/comercial/repasses'" :section="'Repasses'" :name="'Repasses'"
                                :isFavorited="false" />
                            <MenuLink :router="'/comercial/faturamento'" :section="'Faturamento'" :name="'Faturamento'"
                                :isFavorited="false" />
                        </ul>
                    </li>

                    <!-- <li :class="{ 'mt-10': dropdowns.engineering }">
                        <button @click="toggleDropdown('engineering')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Engenharia
                            <i class="my-auto"
                                :class="dropdowns.engineering ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.engineering" class="mt-2 text-gray-600 dark:text-gray-300"> 
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.marketing }">
                        <button @click="toggleDropdown('marketing')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Marketing
                            <i class="my-auto"
                                :class="dropdowns.marketing ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.marketing" class="mt-2 text-gray-600 dark:text-gray-300"> 
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.reports }">
                        <button @click="toggleDropdown('reports')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                       sua contaeditar     Relatórios
                            <i class="my-auto"
                                :class="dropdowns.reports ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.reports" class="mt-2 text-gray-600 dark:text-gray-300"> 
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.finance }">
                        <button @click="toggleDropdown('finance')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Financeiro
                            <i class="my-auto"
                                :class="dropdowns.finance ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.finance" class="mt-2 text-gray-600 dark:text-gray-300">
                        </ul>
                    </li> -->

                    <li :class="{ 'mt-10': dropdowns.tools }">
                        <button @click="toggleDropdown('tools')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Ferramentas
                            <i class="my-auto"
                                :class="dropdowns.tools ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.tools" class="mt-2 text-gray-600 dark:text-gray-300">
                            <MenuLink :router="'/tools/validator'" :section="'Validador'" :name="'Validador'"
                                :isFavorited="false" />
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.settings }">
                        <button @click="toggleDropdown('settings')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-600 dark:bg-gray-500 dark:text-gray-300 dark:hover:bg-gray-400 dark:hover:text-gray-200 px-4 py-2 font-medium">
                            Configurações
                            <i class="my-auto"
                                :class="dropdowns.settings ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.settings" class="mt-2 text-gray-600 dark:text-gray-300">
                            <MenuLink :router="'/settings/users'" :section="'Usuários'" :name="'Usuários'"
                                :isFavorited="false" />
                            <MenuLink :router="'/settings/organograma'" :section="'Organograma'" :name="'Organograma'"
                                :isFavorited="false" />
                            <MenuLink :router="'/settings/Account'" :section="'Account'" :name="'Sua Conta'"
                                :isFavorited="false" />
                        </ul>
                    </li>
                </ul>
            </div>

        </div>

        <div @click="toggleMenu()"
            class="closeOnClick absolute bg-transparent z-20 w-[calc(100vw-4rem)] h-[calc(100vh-4rem)] bottom-0 transition-all duration-300"
            :class="{
                'closeMenuTrue': menuOpen,
                'left-[4rem] hidden': !menuOpen
            }">
        </div>


    </div>

</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/Auth/authStore';
import { useNotificationStore } from '../../stores/Config/notificationStore';
import { useFavoritesStore } from '../../stores/Config/favoriteStore';
import NotificationItem from './components/NotificationItem.vue'
import MenuLink from './components/MenuLink.vue'
import Search from './components/Search.vue'

const menuOpen = ref(false);
const menuRef = ref(null);
const authStore = useAuthStore();
const router = useRouter();
const favoritesStore = useFavoritesStore();
const notificationStore = useNotificationStore();

// Agrupar favoritos por 'router'
const groupedFavorites = computed(() => {
    return favoritesStore.favorites.reduce((groups, favorite) => {
        const category = getCategoryByRouter(favorite.router);
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(favorite);
        return groups;
    }, {});
});

// Function to determine category based on router
const getCategoryByRouter = (router) => {
    if (router.startsWith('/comercial')) {
        return 'Comercial';
    } else if (router.startsWith('/reports')) {
        return 'Relatórios';
    } else if (router.startsWith('/events')) {
        return 'Eventos';
    } else if (router.startsWith('/buildings')) {
        return 'Empreendimentos';
    } else if (router.startsWith('/tools')) {
        return 'Ferramentas';
    } else if (router.startsWith('/settings')) {
        return 'Configurações';
    }
    return router.charAt(0).toUpperCase() + router.slice(1).replace('/', ' ');
};

const toggleMenu = () => {
    menuOpen.value = !menuOpen.value;
};

const closeMenu = (event) => {
    if (menuRef.value && !menuRef.value.contains(event.target)) {
        menuOpen.value = false;
    }
};

const logout = () => {
    authStore.logout();
};

const dropdowns = ref({
    favorites: false,
    events: false,
    enterprise: false,
    comercial: false,
    engineering: false,
    marketing: false,
    reports: false,
    finance: false,
    tools: false,
    settings: false,
});

function toggleDropdown(menu) {
    if (dropdowns.value[menu]) {
        dropdowns.value[menu] = false;
    } else {
        for (const key in dropdowns.value) {
            if (dropdowns.value.hasOwnProperty(key)) {
                dropdowns.value[key] = false;
            }
        }
        dropdowns.value[menu] = true;
    }
}

function openFavorites() {
    toggleMenu()
    toggleDropdown('favorites')
}
function openEvents() {
    toggleMenu()
    toggleDropdown('events')
}
function openEnterprise() {
    toggleMenu()
    toggleDropdown('enterprise')
}
function openComercial() {
    toggleMenu()
    toggleDropdown('comercial')
}
function openEngineering() {
    toggleMenu()
    toggleDropdown('engineering')
}
function openMarketing() {
    toggleMenu()
    toggleDropdown('marketing')
}
function openReports() {
    toggleMenu()
    toggleDropdown('reports')
}
function openFinance() {
    toggleMenu()
    toggleDropdown('finance')
}

function openTools() {
    toggleMenu()
    toggleDropdown('tools')
}

function openSettings() {
    toggleMenu()
    toggleDropdown('settings')
}

const darkMode = ref(false);

// Função para alternar o tema
const toggleTheme = () => {
    if (darkMode.value) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

// Verifica a preferência inicial do sistema e aplica o tema
onMounted(async () => {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    darkMode.value = prefersDarkScheme;
    document.addEventListener('click', closeMenu);
    favoritesStore.loadFavorites();
    notificationStore.fetchNotifications();
});

</script>

<style scoped>
.menu-hover {
    transform: translateX(-10);
}

.menu-hover.translate-x-0 {
    transform: translateX(63px);
}

.closeMenuTrue {
    width: calc(100vw - 20rem);
    left: 20rem;
}
</style>
