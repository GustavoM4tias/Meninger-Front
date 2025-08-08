<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/Auth/authStore'
const authStore = useAuthStore();

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
});

const logout = () => {
    authStore.logout();
};
</script>

<template>
    <div class="flex items-center">
        <div>
            <button type="button"
                class="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
                aria-expanded="false" data-dropdown-toggle="dropdown-user">
                <span class="sr-only">Abrir menu de usuário</span>
                <img class="w-8 h-8 rounded-full" :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(
                    (authStore.user?.username ?? '')
                        .split(' ')
                        .slice(0, 2)
                        .map(n => n[0]?.toUpperCase())
                        .join(' ')
                )}&background=random`" alt="usuario foto" />

                <!-- <div v-else
                    class="profile-img flex items-center justify-center bg-gray-400 rounded-full w-8 h-8 overflow-hidden shadow">
                    <span class="text-gray-100 text-lg font-semibold">
                        {{authStore.user?.username?.split(" ").slice(0, 2).map(n => n[0].toUpperCase()).join('')}}
                    </span>
                </div> -->

            </button>
        </div>
        <div class="z-50 w-42 hidden my-4 text-base list-none bg-white divide-y divide-gray-100 rounded-sm shadow-sm dark:bg-gray-700 dark:divide-gray-600"
            id="dropdown-user">
            <div class="px-4 py-3" role="none">
                <p class="text-sm text-gray-900 dark:text-white" role="none">
                    {{ authStore.user?.username }}
                </p>
                <p class="text-sm font-medium text-gray-900 truncate dark:text-gray-300" role="none">
                    {{ authStore.user?.email }}
                </p>
            </div>
            <ul class="py-1" role="none">

                <div class="m-auto w-full flex truncate py-2 px-8">
                    <label
                        class="flex m-auto p-2 w-full cursor-pointer rounded-full bg-gray-100 dark:bg-gray-800 hover:shadow transition-all ease-in-out">
                        <input class="peer sr-only" id="themeToggle" type="checkbox" v-model="darkMode"
                            @change="toggleTheme" />
                        <i :class="{
                            'far fa-sun translate-x-0': !darkMode,
                            'far fa-moon translate-x-[7.8rem]': darkMode
                        }" class="transition-transform text-gray-800 dark:text-gray-300 duration-400"></i>
                    </label>
                </div>
                <li>
                    <RouterLink to="/"
                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
                        role="menuitem">Dashboard</RouterLink>
                </li>
                <li>
                    <RouterLink to="/settings/Account"
                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
                        role="menuitem">Sua Conta</RouterLink>
                </li>
                <li>
                    <a @click="logout()"
                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
                        role="menuitem">Sair</a>
                </li>
            </ul>
        </div>
    </div>
</template>