<!-- src/components/Nav.vue -->
<template>

    <div class="h-full w-full relative">

        <div class="menu horizontal fixed top-0 left-16 h-16 flex items-center justify-between border-b border-gray-800 bg-gray-700 z-20" style="width: calc(100% - 4rem);">

            <div class="pl-4">
                <img src="/Meninger-logo.png" class="h-16 filter drop-shadow" alt="Logo" />
            </div>

            <div class="relative flex">

                <div class="busca">
                    <input type="search" placeholder="Buscar..."
                        class="w-full h-10 pl-10 pr-4 text-md text-gray-700 placeholder-gray-400 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-blue-500 transition duration-200" />
                    <i class="fas fa-search absolute left-3 my-3 text-gray-400"></i>
                </div>

                <div class="text-3xl flex text-gray-200">
                    <i class="far fa-bell m-auto"></i>
                </div>

                <div class="profile">
                    <!-- profile card in progress --> CARD
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
