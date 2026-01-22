<template>
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        
        <header class="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-md">
            <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <button
                            class="md:hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
                            @click="mobileOpen = !mobileOpen">
                            Menu
                        </button>

                        <div class="leading-tight">
                            <div class="text-sm font-semibold text-slate-900 dark:text-white">Menin Academy</div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">KB • Comunidade • Trilhas</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <div class="relative w-full md:w-[420px]">
                            <input v-model="search"
                                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                placeholder="Buscar (Artigos / trilhas / tópicos)..." @keyup.enter="goSearch" />
                            <button
                                class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                @click="goSearch">
                                ⌕
                            </button>
                        </div>

                        <button
                            class="hidden md:inline-flex rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white transition-all active:scale-95"
                            @click="router.push({ name: 'AcademyKBEditor' })">
                            Novo artigo
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 py-6">
                
                <aside class="md:col-span-3 lg:col-span-2" :class="mobileOpen ? '' : 'hidden md:block'">
                    <nav class="flex flex-col gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-2 sticky top-24">
                        <NavItem :to="{ name: 'AcademyPanel' }" label="Painel" group="panel" />
                        <NavItem :to="{ name: 'AcademyMe' }" label="Meu perfil" />
                        <NavItem :to="{ name: 'AcademyKB' }" label="Base de conhecimento" group="kb" />
                        <NavItem :to="{ name: 'AcademyCommunity' }" label="Comunidade" group="community" />
                        <NavItem :to="{ name: 'AcademyTracks' }" label="Trilhas" group="tracks" />
                        <NavItem :to="{ name: 'AcademyUsers' }" label="Usuários" />
                        <NavItem v-if="authStore?.user?.role === 'admin'" :to="{ name: 'AcademyAdmin' }" label="Admin" group="admin" />

                        <div class="my-2 border-t border-slate-100 dark:border-slate-800" />

                        <button
                            class="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            @click="goOffice">
                            Voltar ao Office
                        </button>
                    </nav>
                </aside>

                <main class="md:col-span-9 lg:col-span-10">
                    <router-view />
                </main>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavItem from '@/views/Academy/components/NavItem.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const authStore = useAuthStore();

const router = useRouter();
const route = useRoute();

const search = ref(String(route.query.q || ''));
const mobileOpen = ref(false);

watch(
    () => route.query.q,
    (v) => {
        search.value = String(v || '');
    }
);

function goSearch() {
    router.push({ name: 'AcademyKB', query: { q: search.value } });
    mobileOpen.value = false;
}

function goOffice() {
    window.location.href = '/';
}
</script>
