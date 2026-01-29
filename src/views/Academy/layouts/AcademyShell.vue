<template>
    <div
        class="h-screen w-full overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <!-- Header -->
        <header ref="headerEl" class="sticky top-0 z-40 bg-white dark:bg-slate-900 dark:backdrop-blur-md">
            <div class="mx-auto p-3 pb-1 md:pb-3 md:pt-4 md:px-3">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <button
                            class="md:hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
                            @click="openMobile">

                            <i class="fa-regular fa-square-caret-left text-2xl transition-transform duration-200"
                                :class="{ 'fa-rotate-180': desktopCollapsed }">
                            </i>
                        </button>

                        <button
                            class="hidden md:inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
                            @click="desktopCollapsed = !desktopCollapsed" :aria-pressed="desktopCollapsed">

                            <i class="fa-regular fa-square-caret-left text-2xl transition-transform duration-200"
                                :class="{ 'fa-rotate-180': desktopCollapsed }">
                            </i>
                        </button>
                        <img src="/ACADEMY.png" class="h-10 invert dark:invert-0" alt="Menin Academy">

                    </div>

                    <div class="flex items-center justify-between md:pe-2 gap-4 w-auto">
                        <InputSearch />
                        <i @click="router.push({ name: 'AcademyKBEditor' })"
                            class="fas text-2xl cursor-pointer fa-book-open !hidden md:!block"></i>
                        <Profile />
                    </div>
                </div>
            </div>
        </header>

        <!-- Overlay (mobile) -->
        <div class="fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            :class="mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
            @click="closeMobile" aria-hidden="true" />

        <!-- BODY -->
        <div class="flex-1 min-h-0 overflow-hidden">
            <div class="h-full w-full">
                <div class="flex h-full min-h-0">
                    <!-- Sidebar -->
                    <aside :class="[
                        // Mobile drawer
                        'fixed md:static z-50 md:z-auto top-0 left-0 h-full',
                        'transform md:transform-none transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform',
                        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',

                        // Desktop: altura abaixo do header
                        'md:sticky md:top-[var(--header-h)] md:h-[calc(100vh-var(--header-h))] md:min-h-0 md:self-start',

                        // Desktop: animar largura
                        'md:transition-[width] md:duration-200 md:ease-[cubic-bezier(0.2,0.8,0.2,1)]',

                        // Largura
                        desktopCollapsed ? 'md:w-[72px] w-[280px]' : 'md:w-[280px] w-[280px]'
                    ]">
                        <!-- Nav: SEM scroll -->
                        <nav
                            class="h-full bg-white dark:bg-slate-900 shadow-sm ps-3 p-2 flex flex-col gap-2 overflow-hidden">
                            <div class="md:hidden flex items-center justify-between px-2 py-2">
                                <button
                                    class="rounded-xl bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100"
                                    @click="closeMobile">

                                    <i class="fa-regular fa-square-caret-left text-2xl transition-transform duration-200"
                                        :class="{ 'fa-rotate-180': desktopCollapsed }">
                                    </i>
                                </button>
                            </div>

                            <NavItem :to="{ name: 'AcademyPanel' }" label="Painel" :collapsed="desktopCollapsed">
                                <template #icon><i
                                        class="fa-solid fa-gauge text-slate-500 dark:text-slate-400"></i></template>
                            </NavItem>

                            <NavItem :to="{ name: 'AcademyMe' }" label="Meu perfil" :collapsed="desktopCollapsed">
                                <template #icon><i
                                        class="fa-solid fa-user text-slate-500 dark:text-slate-400"></i></template>
                            </NavItem>

                            <NavItem :to="{ name: 'AcademyKB' }" label="Base de conhecimento"
                                :collapsed="desktopCollapsed">
                                <template #icon><i
                                        class="fa-solid fa-book text-slate-500 dark:text-slate-400"></i></template>
                            </NavItem>

                            <NavItem :to="{ name: 'AcademyCommunity' }" label="Comunidade"
                                :collapsed="desktopCollapsed">
                                <template #icon><i
                                        class="fa-solid fa-comments text-slate-500 dark:text-slate-400"></i></template>
                            </NavItem>

                            <NavItem :to="{ name: 'AcademyTracks' }" label="Trilhas" :collapsed="desktopCollapsed">
                                <template #icon><i
                                        class="fa-solid fa-route text-slate-500 dark:text-slate-400"></i></template>
                            </NavItem>

                            <NavItem :to="{ name: 'AcademyUsers' }" label="Usuários" :collapsed="desktopCollapsed">
                                <template #icon><i
                                        class="fa-solid fa-users text-slate-500 dark:text-slate-400"></i></template>
                            </NavItem>

                            <NavItem v-if="authStore?.user?.role === 'admin'" :to="{ name: 'AcademyAdmin' }"
                                label="Admin" :collapsed="desktopCollapsed">
                                <template #icon><i
                                        class="fa-solid fa-shield-halved text-slate-500 dark:text-slate-400"></i></template>
                            </NavItem>

                            <div class="mt-auto"></div>

                            <div v-if="authStore.isInternal">
                                <div class="border-t border-slate-100 dark:border-slate-800" />

                                <button
                                    class="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                                    @click="goOffice">
                                    <span class="inline-flex h-6 w-6 items-center justify-center shrink-0">
                                        <i class="fa-solid fa-arrow-left text-slate-500 dark:text-slate-400"></i>
                                    </span>
                                    <span v-if="!desktopCollapsed">Voltar ao Office</span>
                                </button>

                            </div>
                        </nav>
                    </aside>

                    <!-- Main: SEM scroll -->
                    <main class="flex-1 min-w-0 min-h-0 overflow-hidden">
                        <!-- Card do conteúdo -->
                        <div class="h-full min-h-0 p-1 pe-2 pb-2 bg-white dark:bg-slate-900">
                            <div
                                class="h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-sm">
                                <!-- “borda interna” -->
                                <div
                                    class="h-full min-h-0 rounded-2xl ring-1 ring-inset ring-slate-100 dark:ring-slate-950">
                                    <!-- ÚNICO lugar com scroll -->
                                    <div class="h-full min-h-0 overflow-y-auto p-4">
                                        <router-view />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavItem from '@/views/Academy/components/NavItem.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import InputSearch from '@/views/Academy/layouts/InputSearch.vue'
import Profile from '@/views/Academy/components/Profile.vue';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const search = ref(String(route.query.q || ''));
const mobileOpen = ref(false);
const desktopCollapsed = ref(false);

const headerEl = ref(null);
let ro = null;

watch(() => route.query.q, (v) => (search.value = String(v || '')));

function goSearch() {
    router.push({ name: 'AcademyKB', query: { q: search.value } });
    closeMobile();
}

function goOffice() {
    window.location.href = 'https://office.menin.com.br/';
}

function lockScroll(lock) {
    document.documentElement.style.overflow = lock ? 'hidden' : '';
}

function openMobile() {
    mobileOpen.value = true;
    lockScroll(true);
}

function closeMobile() {
    mobileOpen.value = false;
    lockScroll(false);
}

watch(() => route.fullPath, () => {
    if (mobileOpen.value) closeMobile();
});

// seta var --header-h com altura real do header (inclui padding etc.)
function setHeaderVar(px) {
    document.documentElement.style.setProperty('--header-h', `${px}px`);
}

onMounted(() => {
    const el = headerEl.value;
    if (!el) return;

    setHeaderVar(Math.ceil(el.getBoundingClientRect().height));

    ro = new ResizeObserver((entries) => {
        const h = Math.ceil(entries?.[0]?.contentRect?.height || el.getBoundingClientRect().height);
        setHeaderVar(h);
    });
    ro.observe(el);
});

onBeforeUnmount(() => {
    lockScroll(false);
    if (ro) ro.disconnect();
});
</script>
