<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useSignatureStore } from '@/stores/Signature/signatureStore';

const authStore = useAuthStore();
const sigStore  = useSignatureStore();

const darkMode = ref(false);

const toggleTheme = () => {
    if (darkMode.value) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

onMounted(async () => {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    darkMode.value = prefersDarkScheme;

    // Carrega badge de pendentes
    await sigStore.fetchPendingCount();
});

const logout = () => authStore.logout();
</script>

<template>
    <div class="flex items-center">
        <div>
            <button
                type="button"
                class="relative flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
                aria-expanded="false"
                data-dropdown-toggle="dropdown-user"
            >
                <span class="sr-only">Abrir menu de usuário</span>
                <img
                    class="w-8 h-8 rounded-full"
                    :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(
                        (authStore.user?.username ?? '')
                            .split(' ')
                            .slice(0, 2)
                            .map(n => n[0]?.toUpperCase())
                            .join(' ')
                    )}&background=random`"
                    alt="foto do usuário"
                />
                <!-- Badge de pendentes -->
                <span
                    v-if="sigStore.pendingCount > 0"
                    class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900 pointer-events-none"
                >
                    {{ sigStore.pendingCount > 9 ? '9+' : sigStore.pendingCount }}
                </span>
            </button>
        </div>

        <div
            class="z-50 w-52 hidden my-4 text-base list-none bg-white divide-y divide-gray-100 rounded-xl shadow-lg dark:bg-gray-800 dark:divide-gray-700"
            id="dropdown-user"
        >
            <!-- Info do usuário -->
            <div class="px-4 py-3" role="none">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate" role="none">
                    {{ authStore.user?.username }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" role="none">
                    {{ authStore.user?.email }}
                </p>
            </div>

            <ul class="py-1 pb-2.5" role="none">
                <!-- Toggle de tema -->
                <div class="mx-10 my-1.5">
                    <label
                        class="flex items-center p-2 w-full cursor-pointer rounded-lg bg-gray-100 dark:bg-gray-700 hover:shadow transition-all ease-in-out"
                    >
                        <input
                            class="peer sr-only"
                            id="themeToggle"
                            type="checkbox"
                            v-model="darkMode"
                            @change="toggleTheme"
                        />
                        <i
                            :class="{
                                'far fa-sun translate-x-0': !darkMode,
                                'far fa-moon translate-x-[6rem]': darkMode
                            }"
                            class="transition-transform text-gray-700 dark:text-gray-200 duration-300 text-sm"
                        ></i>
                    </label>
                </div>

                <li>
                    <RouterLink
                        to="/"
                        class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition"
                        role="menuitem"
                    >
                        <i class="fas fa-house w-4 text-gray-400" />
                        Dashboard
                    </RouterLink>
                </li>

                <li>
                    <RouterLink
                        to="/settings/Account"
                        class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition"
                        role="menuitem"
                    >
                        <i class="fas fa-user-cog w-4 text-gray-400" />
                        Minha Conta
                    </RouterLink>
                </li>

                <!-- Assinaturas pendentes -->
                <li>
                    <RouterLink
                        to="/tools/signature"
                        class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition"
                        role="menuitem"
                    >
                        <i class="fas fa-pen-nib w-4 text-gray-400" />
                        <span class="flex-1">Assinaturas</span>
                        <span
                            v-if="sigStore.pendingCount > 0"
                            class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white"
                        >
                            {{ sigStore.pendingCount > 9 ? '9+' : sigStore.pendingCount }}
                        </span>
                    </RouterLink>
                </li>

                <li>
                    <a
                        @click="logout()"
                        class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer transition"
                        role="menuitem"
                    >
                        <i class="fas fa-arrow-right-from-bracket w-4 text-gray-400" />
                        Sair
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>
