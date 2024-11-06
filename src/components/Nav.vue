<!-- src/components/Nav.vue -->
<template>
    <div @click="toggleMenu" class="menu fixed flex h-screen w-16 flex-col justify-between cursor-pointer border border-gray-800 bg-gray-700 z-30">
        <div>
            <div class="inline-flex size-16 items-center justify-center p-2">
                <img src="/public/logo.png" class="filter drop-shadow" />
            </div>
            <div class="px-2 text-2xl">
                <ul class="space-y-1 border-t border-gray-500 pt-3">
                    <div class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                        <i class="fa-solid fa-calendar-days"></i>
                    </div>
                    <div class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>
                    <div class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
                        <i class="fa-solid fa-money-bills"></i>
                    </div>
                    <div class="group relative flex justify-center rounded cursor-pointer px-2 py-2.5 text-gray-300 hover:bg-gray-400 hover:text-gray-200">
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
        class="menu-hover fixed flex h-screen flex-1 flex-col justify-between border-e bg-gray-700 z-20 transform transition-transform duration-300 ease-in-out">
        <div class="px-4 pb-6">
            <p class="text-gray-200 text-center font-bold text-xl leading-5 py-2.5">Bem vindo <br> {{ user?.username }}
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
