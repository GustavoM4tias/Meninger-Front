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
    const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map(p => (p[0] || '').toUpperCase()).join('') || 'U';
});

const firstName = computed(() => {
    const n = String(authStore.user?.username || '').trim();
    return n ? n.split(/\s+/)[0] : 'Você';
});

const roleLabel = computed(() => {
    const u = authStore.user || {};
    if (String(u.role || '').toLowerCase() === 'admin') return 'Administrador';
    const provider = String(u.auth_provider || 'INTERNAL').toUpperCase();
    const kind = String(u.external_kind || '').toUpperCase();
    if (provider === 'CVCRM' || kind) {
        return ({ BROKER: 'Corretor', REALESTATE: 'Imobiliária', CORRESPONDENT: 'Correspondente' }[kind]) || 'Parceiro';
    }
    return u.position ? String(u.position) : 'Equipe Menin';
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

function go(to) {
    open.value = false;
    router.push(to);
}

function logout() {
    open.value = false;
    authStore.academyLogout();
}

function onDocClick(e) {
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
    if (!v) return;
    const onKey = (e) => { if (e.key === 'Escape') open.value = false; };
    window.addEventListener('keydown', onKey, { once: true });
});
</script>

<template>
    <div class="relative" data-profile-root>
        <!-- Trigger -->
        <button type="button" @click="open = !open" aria-label="Abrir menu de usuário" :aria-expanded="open"
            class="group flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
            <span class="profile-avatar h-8 w-8 text-xs">{{ initials }}</span>
            <span class="hidden max-w-[8rem] truncate text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">
                {{ firstName }}
            </span>
            <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform"
                :class="{ 'rotate-180': open }"></i>
        </button>

        <!-- Dropdown -->
        <Transition name="profile-pop">
            <div v-if="open"
                class="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_-12px_rgb(15_23_42/0.30)] dark:border-slate-800 dark:bg-slate-900">
                <!-- Header -->
                <div class="profile-header relative px-4 py-4">
                    <div class="relative flex items-center gap-3">
                        <span class="profile-avatar h-11 w-11 text-sm shadow-md">{{ initials }}</span>
                        <div class="min-w-0">
                            <div class="font-display truncate text-base font-semibold text-slate-900 dark:text-white">
                                {{ authStore.user?.username || 'Usuário' }}
                            </div>
                            <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                                {{ authStore.user?.email }}
                            </div>
                        </div>
                    </div>
                    <span
                        class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        <i class="fa-solid fa-id-badge text-[10px]"></i>
                        {{ roleLabel }}
                    </span>
                </div>

                <!-- Menu -->
                <div class="border-t border-slate-100 p-1.5 dark:border-slate-800">
                    <button type="button" class="profile-item" @click="go({ name: 'AcademyMe' })">
                        <i class="fa-regular fa-user profile-item__icon"></i>
                        Meu perfil
                        <i class="fa-solid fa-chevron-right ml-auto text-[10px] text-slate-300 dark:text-slate-600"></i>
                    </button>
                    <button type="button" class="profile-item" @click="go({ name: 'AcademyTracks' })">
                        <i class="fa-solid fa-route profile-item__icon"></i>
                        Minhas trilhas
                        <i class="fa-solid fa-chevron-right ml-auto text-[10px] text-slate-300 dark:text-slate-600"></i>
                    </button>
                </div>

                <!-- Tema -->
                <div class="border-t border-slate-100 p-1.5 dark:border-slate-800">
                    <button type="button" class="profile-item" @click="toggleTheme">
                        <i class="fa-regular profile-item__icon" :class="darkMode ? 'fa-moon' : 'fa-sun'"></i>
                        Modo escuro
                        <span class="ml-auto inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors"
                            :class="darkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'">
                            <span class="h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                                :class="darkMode ? 'translate-x-5' : 'translate-x-0'"></span>
                        </span>
                    </button>
                </div>

                <!-- Sair -->
                <div class="border-t border-slate-100 p-1.5 dark:border-slate-800">
                    <button type="button" @click="logout"
                        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30">
                        <i class="fa-solid fa-arrow-right-from-bracket w-4 text-center"></i>
                        Sair da conta
                    </button>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.profile-avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border-radius: 9999px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(135deg, rgb(99 102 241), rgb(139 92 246));
}

.profile-header {
    background:
        radial-gradient(120% 120% at 0% 0%, rgb(99 102 241 / 0.12), transparent 60%),
        radial-gradient(120% 120% at 100% 0%, rgb(139 92 246 / 0.10), transparent 55%);
}

.profile-item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.75rem;
    border-radius: 0.75rem;
    padding: 0.55rem 0.75rem;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(51 65 85);
    transition: background-color .15s ease, color .15s ease;
}

:global(.dark) .profile-item {
    color: rgb(203 213 225);
}

.profile-item:hover {
    background: rgb(241 245 249);
    color: rgb(15 23 42);
}

:global(.dark) .profile-item:hover {
    background: rgb(30 41 59 / 0.7);
    color: rgb(241 245 249);
}

.profile-item__icon {
    width: 1rem;
    text-align: center;
    color: rgb(148 163 184);
}

.profile-item:hover .profile-item__icon {
    color: rgb(99 102 241);
}

.profile-pop-enter-active,
.profile-pop-leave-active {
    transition: opacity .14s ease, transform .14s ease;
    transform-origin: top right;
}

.profile-pop-enter-from,
.profile-pop-leave-to {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
}
</style>
