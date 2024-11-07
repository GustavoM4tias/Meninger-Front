<!-- src/components/Nav.vue -->
<template>

    <div class="h-full w-full relative">

        <div class="menu horizontal fixed top-0 left-16 h-16 flex items-center justify-between border-b border-gray-800 bg-gray-700 z-20"
            style="width: calc(100% - 4rem);">

            <div class="pl-2 md:pl-4">
                <img src="/Meninger-logo.png" class="h-14 md:h-16 object-cover filter drop-shadow" alt="Logo" />
            </div>

            <div class="relative flex">

                <div class="search flex">
                    <div class="hidden md:block">
                        <input type="search" placeholder="Buscar..."
                            class="w-full h-10 pl-10 pr-4 text-md text-gray-700 placeholder-gray-400 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-blue-500 transition duration-200" />
                        <i class="fas fa-search absolute left-3 my-3 text-gray-400"></i>
                    </div>
                </div>

                <div class="notification flex mx-3 md:mx-5">
                    <div class="text-3xl flex text-gray-200 m-auto">
                        <i class="far fa-bell"></i>
                        <i class="fas fa-circle text-sm text-red-500 -ml-2.5 fa-bounce slow-animation"></i>
                        <!-- Adicionar condicional para notificar eventos -->
                    </div>
                </div>

                <div class="profile flex mr-4 md:mr-6">

                    <div x-data="{ isActive: false }" class="relative dropdown m-auto">

                        <div class="flex cursor-pointer">
                            <div x-on:click="isActive = !isActive"
                                class="profile-img flex bg-gray-400 rounded-full w-10 h-10 overflow-hidden">
                                <p class="text-gray-100 m-auto font-semibold"> {{ user?.username?.split(" ").slice(0,
                                    2).map(name =>
                                        name[0].toUpperCase()).join("") }}
                                </p>
                            </div>
                        </div>

                        <div class="absolute right-0 z-10 w-auto rounded-md border border-gray-600 bg-gray-500 shadow-lg"
                            role="menu" x-cloak x-transition x-show="isActive" x-on:click.away="isActive = false"
                            x-on:keydown.escape.window="isActive = false">

                            <div class="account text-xl flex flex-col">

                                <div
                                    class="profile-img relative flex bg-gray-400 rounded-full w-16 h-16 m-auto mt-3 overflow-hidden shadow-sm">
                                    <p class="text-gray-100 m-auto text-3xl">{{ user?.username?.split(" ").slice(0,
                                        2).map(name =>
                                            name[0].toUpperCase()).join("") }}</p>

                                </div>

                                <p class="text-gray-200 font-semibold text-center my-1 px-3 truncate">{{
                                    user?.username?.split(" ").filter(name => !["de", "da", "do", "dos", "das",
                                        "e"].includes(name.toLowerCase())).slice(0, 2).join(" ") }}</p>

                                <hr class="border-gray-600">
                                <div class="m-auto p-2 w-full flex">
                                    <button @click="editProfile"
                                        class="flex w-full truncate justify-center rounded-lg cursor-pointer px-2 py-1 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                                        <div class="m-auto flex truncate">
                                            <i class="fas fa-pen m-auto mr-3"></i>
                                            <p>Editar Conta</p>
                                        </div>
                                    </button>
                                </div>

                                <hr class="border-gray-600">
                                <div class="m-auto p-2 w-full flex">
                                    <button @click="logout"
                                        class="flex w-full justify-center rounded-lg cursor-pointer px-2 py-1 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
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

        <div class="menu vertical fixed top-0 left-0 h-full w-16 flex flex-col justify-between cursor-pointer border-r border-gray-800 bg-gray-700 z-30">
            <div>
                <div class="flex size-16 items-center justify-center py-4 text-3xl">
                    <div
                        class="group relative flex justify-center rounded cursor-pointer pl-1 text-gray-300 hover:text-gray-100">
                        <RouterLink to="/">
                            <i class="fas fa-house"></i>
                        </RouterLink>
                    </div>
                </div>
                <div class="px-2 text-2xl">
                    <ul class="space-y-3 border-t border-gray-500 pt-3">
                        <div @click="openEvents" :class="{ 'bg-gray-500 text-gray-50': dropdowns.events }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fas fa-calendar-days"></i>
                        </div>
                        <div @click="openEnterprise" :class="{ 'bg-gray-500 text-gray-50': dropdowns.enterprise }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fas fa-helmet-safety"></i>
                        </div>
                        <div @click="openReports" :class="{ 'bg-gray-500 text-gray-50': dropdowns.reports }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div @click="openFinance" :class="{ 'bg-gray-500 text-gray-50': dropdowns.finance }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fas fa-money-bills"></i>
                        </div>
                        <div @click="openSettings" :class="{ 'bg-gray-500 text-gray-50': dropdowns.settings }"
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fas fa-gear"></i>
                        </div>
                    </ul>
                </div>
            </div>
            <div class="sticky inset-x-0 bottom-0 border-t border-gray-800 p-2 text-2xl">
                <button
                    class="flex w-full justify-center rounded-lg cursor-pointer px-2 py-2 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                    <i class="fas fa-circle-info"></i>
                </button>
            </div>
        </div>

        <div ref="menu" :class="{ 'translate-x-0': menuOpen, '-translate-x-full': !menuOpen }"
            class="menu-hover fixed flex h-full top-16 flex-1 flex-col justify-between bg-gray-700 z-20 transform transition-transform duration-300 ease-in-out">

            <div class="px-4 pb-6 text-xl min-w-64 w-64 max-w-64">

                <ul class="space-y-1">
                    <li :class="{ '': dropdowns.events }">
                        <button @click="toggleDropdown('events')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 font-medium">
                            Eventos
                            <i class="my-auto"
                                :class="dropdowns.events ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.events" class=" mt-2 text-gray-300">
                            <li>
                                <RouterLink :to="{ path: '/events', query: { section: 'geral' } }"
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Eventos Geral
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink :to="{ path: '/events', query: { section: 'proximos' } }"
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Eventos Próximos
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink :to="{ path: '/events', query: { section: 'finalizados' } }"
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Eventos Finalizados
                                </RouterLink>
                            </li>
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.enterprise }">
                        <button @click="toggleDropdown('enterprise')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 font-medium">
                            Empreendimentos
                            <i class="my-auto"
                                :class="dropdowns.enterprise ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.enterprise" class="mt-2 text-gray-300">
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 1
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 2
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 3
                                </RouterLink>
                            </li>
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.reports }">
                        <button @click="toggleDropdown('reports')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 font-medium">
                            Relatórios
                            <i class="my-auto"
                                :class="dropdowns.reports ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.reports" class="mt-2 text-gray-300">
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 1
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 2
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 3
                                </RouterLink>
                            </li>
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.finance }">
                        <button @click="toggleDropdown('finance')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 font-medium">
                            Financeiro
                            <i class="my-auto"
                                :class="dropdowns.finance ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.finance" class="mt-2 text-gray-300">
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 1
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 2
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 3
                                </RouterLink>
                            </li>
                        </ul>
                    </li>

                    <li :class="{ 'mt-10': dropdowns.settings }">
                        <button @click="toggleDropdown('settings')"
                            class="flex justify-between truncate w-full rounded-md bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 font-medium">
                            Configurações
                            <i class="my-auto"
                                :class="dropdowns.settings ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                        </button>
                        <ul v-if="dropdowns.settings" class="mt-2 text-gray-300">
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 1
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 2
                                </RouterLink>
                            </li>
                            <li>
                                <RouterLink to=""
                                    class="block px-4 py-1.5 my-1.5 bg-gray-600 hover:bg-gray-500 rounded-md">
                                    Submenu 3
                                </RouterLink>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>

    </div>

</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useFetchUserInfo } from '../utils/fetchUserInfo';

const menuOpen = ref(false);
const menuRef = ref(null);
const userStore = useUserStore();
const router = useRouter();
const { user, errorMessage, fetchUserInfo } = useFetchUserInfo();

const toggleMenu = () => {
    menuOpen.value = !menuOpen.value;
};

const closeMenu = (event) => {
    if (menuRef.value && !menuRef.value.contains(event.target)) {
        menuOpen.value = false;
    }
};

const logout = () => {
    userStore.clearUser();
    router.push('/login');
};

const dropdowns = ref({
    events: false,
    enterprise: false,
    reports: false,
    finance: false,
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

function openEvents() {
    toggleMenu()
    toggleDropdown('events')
}
function openEnterprise() {
    toggleMenu()
    toggleDropdown('enterprise')
}
function openReports() {
    toggleMenu()
    toggleDropdown('reports')
}
function openFinance() {
    toggleMenu()
    toggleDropdown('finance')
}

function openSettings() {
    toggleMenu()
    toggleDropdown('settings')
}

onMounted(() => {
    if (userStore.isAuthenticated()) {
        fetchUserInfo();
    } else {
        errorMessage.value = 'Usuário não está autenticado.';
    }
    document.addEventListener('click', closeMenu);
});
</script>

<style scoped>
.menu-hover {
    transform: translateX(-10);
}

.menu-hover.translate-x-0 {
    transform: translateX(63px);
}
</style>
