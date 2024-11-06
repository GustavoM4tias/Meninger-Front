<!-- src/components/Nav.vue -->
<template>

    <div class="h-full w-full relative">

        <div class="menu horizontal fixed top-0 left-16 h-16 flex items-center justify-between border-b border-gray-800 bg-gray-700 z-20"
            style="width: calc(100% - 4rem);">

            <div class="pl-4">
                <img src="/Meninger-logo.png" class="h-16 filter drop-shadow" alt="Logo" />
            </div>

            <div class="relative flex">

                <div class="search flex">
                    <div>
                        <input type="search" placeholder="Buscar..."
                            class="w-full h-10 pl-10 pr-4 text-md text-gray-700 placeholder-gray-400 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-blue-500 transition duration-200" />
                        <i class="fas fa-search absolute left-3 my-3 text-gray-400"></i>
                    </div>
                </div>

                <div class="notification flex mx-5">
                    <div class="text-3xl flex text-gray-200 m-auto">
                        <i class="far fa-bell"></i>
                        <i class="fa-solid fa-circle text-sm text-red-500 -ml-2.5 fa-bounce slow-animation"></i>
                        <!-- Adicionar condicional para notificar eventos -->
                    </div>
                </div>

                <div class="profile flex mr-6">

                    <div x-data="{ isActive: false }" class="relative dropdown m-auto">

                        <div class="flex cursor-pointer">
                            <div x-on:click="isActive = !isActive"
                                class="profile-img relative bg-gray-400 rounded-full p-4 overflow-hidden">
                                <p class="absolute text-gray-100 top-0 left-0 p-1">GD</p>
                            </div>
                        </div>

                        <div class="absolute right-0 z-10 w-auto rounded-md border border-gray-600 bg-gray-500 shadow-lg"
                            role="menu" x-cloak x-transition x-show="isActive" x-on:click.away="isActive = false"
                            x-on:keydown.escape.window="isActive = false">

                            <div class="account text-xl flex flex-col">

                                <div
                                    class="profile-img relative flex bg-gray-400 rounded-full w-16 h-16 m-auto my-3 overflow-hidden shadow-sm">
                                    <p class="text-gray-100 m-auto text-3xl m-auto">GD</p>
                                </div>

                                <hr class="border-gray-600">
                                <div class="m-auto p-2">
                                    <button @click="editProfile"
                                        class="flex w-full truncate justify-center rounded-lg cursor-pointer px-2 py-1 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                                        <i class="fa-solid fa-pen m-auto mr-3"></i>
                                        <p>Editar Conta</p>
                                    </button>
                                </div>

                                <hr class="border-gray-600">
                                <div class="m-auto p-2 w-full flex">
                                    <button @click="logout"
                                        class="flex w-full justify-center rounded-lg cursor-pointer px-2 py-1 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                                        <div class="m-auto flex truncate">
                                            <i class="fa-solid fa-arrow-right-from-bracket m-auto mr-3"></i>
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

        <div @click="toggleMenu"
            class="menu vertical fixed top-0 left-0 h-full w-16 flex flex-col justify-between cursor-pointer border-r border-gray-800 bg-gray-700 z-30">
            <div>
                <div class="flex size-16 items-center justify-center py-4 text-3xl">
                    <div
                        class="group relative flex justify-center rounded cursor-pointer pl-1 text-gray-300 hover:text-gray-100">
                        <i class="fas fa-house"></i>
                    </div>
                </div>
                <div class="px-2 text-2xl">
                    <ul class="space-y-1 border-t border-gray-500 pt-3">
                        <div
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fa-solid fa-calendar-days"></i>
                        </div>
                        <div
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fa-solid fa-chart-line"></i>
                        </div>
                        <div
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fa-solid fa-money-bills"></i>
                        </div>
                        <div
                            class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                            <i class="fa-solid fa-gear"></i>
                        </div>
                    </ul>
                </div>
            </div>
            <div class="sticky inset-x-0 bottom-0 border-t border-gray-800 p-2 text-2xl">
                <button @click="logout"
                    class="flex w-full justify-center rounded-lg cursor-pointer px-2 py-2 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
            </div>
        </div>


        <div ref="menu" :class="{ 'translate-x-0': menuOpen, '-translate-x-full': !menuOpen }"
            class="menu-hover fixed flex h-full top-16 flex-1 flex-col justify-between border-e bg-gray-700 z-20 transform transition-transform duration-300 ease-in-out">
            <div class="px-4 pb-6">
                <p class="text-gray-200 text-center font-bold text-xl leading-5 py-2.5">Bem vindo <br> {{ user?.username
                    }}
                </p>
                <ul class="mt- space-y-1">
                    <li>
                        <RouterLink to="/Events"
                            class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 text-sm font-medium">
                            Eventos
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink to="/"
                            class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 text-sm font-medium">
                            Relatórios
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink to=""
                            class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 text-sm font-medium">
                            Financeiro
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink to=""
                            class="block rounded-lg bg-gray-500 text-gray-300 hover:bg-gray-400 hover:text-gray-200 px-4 my-3 py-2 text-sm font-medium">
                            Configurações
                        </RouterLink>
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

onMounted(() => {
    if (userStore.isAuthenticated()) {
        fetchUserInfo();
    } else {
        errorMessage.value = 'Usuário não está autenticado.';
    }
    document.addEventListener('click', closeMenu);
});

onUnmounted(() => {
    document.removeEventListener('click', closeMenu);
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
