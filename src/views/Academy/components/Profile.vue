<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const router = useRouter();
const authStore = useAuthStore();

const open = ref(false);
const darkMode = ref(false);

const initials = computed(() => {
    const name = String(authStore.user?.username || '').trim();
    const parts = name.split(' ').filter(Boolean).slice(0, 2);
    return parts.map(p => (p[0] || '').toUpperCase()).join('') || 'U';
});

const avatarUrl = computed(() => {
    const name = encodeURIComponent(initials.value);
    return `https://ui-avatars.com/api/?name=${name}&background=random`;
});

function applyTheme(isDark) {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function toggleTheme() {
    darkMode.value = !darkMode.value;
    applyTheme(darkMode.value);
}

function go(path) {
    open.value = false;
    router.push(path);
}

function logout() {
    open.value = false;
    authStore.academyLogout();
}

function onDocClick(e) {
    // fecha ao clicar fora
    if (!e.target?.closest?.('[data-profile-root]')) open.value = false;
}

onMounted(() => {
    const saved = localStorage.getItem('theme');
    if (saved) darkMode.value = saved === 'dark';
    else darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;

    applyTheme(darkMode.value);
    document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick);
});

watch(open, (v) => {
    // opcional: esc fecha
    if (!v) return;
    const onKey = (e) => {
        if (e.key === 'Escape') open.value = false;
    };
    window.addEventListener('keydown', onKey, { once: true });
});
</script>

<template>
    <div class="relative" data-profile-root>
        <!-- trigger -->
        <button type="button"
            class="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            @click="open = !open" aria-label="Abrir menu de usuário" :aria-expanded="open">
            <img class="w-full h-full object-cover" :src="avatarUrl" alt="avatar" />
        </button>

        <!-- dropdown -->
        <div v-if="open"
            class="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-50">
            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {{ authStore.user?.username }}
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {{ authStore.user?.email }}
                </div>
            </div>

            <div class="p-2 space-y-1">
                <!-- dark mode -->
                <button type="button"
                    class="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    @click="toggleTheme">
                    <span class="flex items-center gap-2">
                        <i class="fa-regular" :class="darkMode ? 'fa-moon' : 'fa-sun'"></i>
                        Modo escuro
                    </span>

                    <span class="inline-flex items-center h-6 w-10 rounded-full transition"
                        :class="darkMode ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'">
                        <span class="h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow transition-transform"
                            :class="darkMode ? 'translate-x-4' : 'translate-x-1'" />
                    </span>
                </button>

                <!-- /me -->
                <button type="button"
                    class="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                     @click="router.push({ name: 'AcademyMe' })">
                    <i class="fa-regular fa-user text-slate-500 dark:text-slate-400"></i>
                    Ver meu perfil
                </button>

                <!-- /tracks -->
                <button type="button"
                    class="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                     @click="router.push({ name: 'AcademyTracks' })">
                    <i class="fa-solid fa-route text-slate-500 dark:text-slate-400"></i>
                    Trilhas
                </button>

                <div class="my-1 border-t border-slate-100 dark:border-slate-800" />

                <!-- logout -->
                <button type="button"
                    class="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                    @click="logout">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                    Sair
                </button>
            </div>
        </div>
    </div>
</template>
