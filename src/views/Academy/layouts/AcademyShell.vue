<template>
    <div class="flex h-screen w-full flex-col overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
        <!-- ───────────── Header ───────────── -->
        <header ref="headerEl"
            class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85">
            <div class="flex items-center justify-between gap-3 px-3 py-3 md:px-4">
                <div class="flex items-center gap-2.5">
                    <!-- Toggle mobile -->
                    <button type="button" @click="openMobile"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 md:hidden">
                        <i class="fa-solid fa-bars-staggered"></i>
                    </button>

                    <!-- Toggle desktop (colapsar sidebar) -->
                    <button type="button" @click="desktopCollapsed = !desktopCollapsed" :aria-pressed="desktopCollapsed"
                        title="Recolher menu"
                        class="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 md:inline-flex">
                        <i class="fa-solid fa-angles-left transition-transform duration-200"
                            :class="{ 'rotate-180': desktopCollapsed }"></i>
                    </button>

                    <router-link :to="{ name: 'AcademyPanel' }" class="flex items-center gap-2.5">
                        <img src="/Mlogotext.png" class="h-8 invert dark:invert-0" alt="Menin" />
                        <span class="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block"></span>
                        <span class="font-display hidden text-lg font-semibold text-slate-900 dark:text-white sm:block">
                            Academy
                        </span>
                    </router-link>
                </div>

                <div class="flex items-center gap-2.5 md:gap-3">
                    <InputSearch />

                    <button type="button" @click="router.push({ name: 'AcademyKBEditor' })" title="Criar artigo"
                        class="hidden h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 active:scale-95 md:inline-flex">
                        <i class="fa-solid fa-feather-pointed text-xs"></i>
                        <span class="hidden lg:inline">Criar</span>
                    </button>

                    <Profile />
                </div>
            </div>
        </header>

        <!-- Overlay (mobile) -->
        <div class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 md:hidden"
            :class="mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
            @click="closeMobile" aria-hidden="true" />

        <!-- ───────────── Body ───────────── -->
        <div class="min-h-0 flex-1 overflow-hidden">
            <div class="flex h-full min-h-0">
                <!-- Sidebar -->
                <aside :class="[
                    'fixed left-0 top-0 z-50 h-full md:static md:z-auto',
                    'transform transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform md:transform-none',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
                    'md:sticky md:top-[var(--header-h)] md:h-[calc(100vh-var(--header-h))] md:min-h-0 md:self-start',
                    'md:transition-[width] md:duration-200 md:ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                    desktopCollapsed ? 'w-[280px] md:w-[76px]' : 'w-[280px]'
                ]">
                    <nav
                        class="flex h-full flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <!-- topo do drawer (mobile) -->
                        <div class="mb-1 flex items-center justify-between px-1 md:hidden">
                            <span class="font-display text-base font-semibold text-slate-900 dark:text-white">Academy</span>
                            <button type="button" @click="closeMobile"
                                class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <NavItem :to="{ name: 'AcademyPanel' }" label="Painel" :collapsed="desktopCollapsed">
                            <template #icon><i class="fa-solid fa-gauge-high"></i></template>
                        </NavItem>

                        <p v-if="!desktopCollapsed" class="nav-group">Aprender</p>
                        <div v-else class="nav-sep"></div>

                        <NavItem :to="{ name: 'AcademyTracks' }" label="Trilhas" data-tour="nav-tracks"
                            :collapsed="desktopCollapsed">
                            <template #icon><i class="fa-solid fa-route"></i></template>
                        </NavItem>
                        <NavItem :to="{ name: 'AcademyKB' }" label="Base de conhecimento" data-tour="nav-kb"
                            :collapsed="desktopCollapsed">
                            <template #icon><i class="fa-solid fa-book-open"></i></template>
                        </NavItem>
                        <!-- Comunidade: standby no MVP Office (rota segue montada). -->
                        <NavItem v-if="false" :to="{ name: 'AcademyCommunity' }" label="Comunidade" data-tour="nav-community"
                            :collapsed="desktopCollapsed">
                            <template #icon><i class="fa-solid fa-comments"></i></template>
                        </NavItem>

                        <!-- Grupo "Você" (Meu perfil + Pessoas): standby no MVP Office.
                             Rotas seguem montadas; para reativar, remover o v-if="false". -->
                        <template v-if="false">
                            <p v-if="!desktopCollapsed" class="nav-group">Você</p>
                            <div v-else class="nav-sep"></div>

                            <NavItem :to="{ name: 'AcademyMe' }" label="Meu perfil" :collapsed="desktopCollapsed">
                                <template #icon><i class="fa-solid fa-circle-user"></i></template>
                            </NavItem>
                            <NavItem :to="{ name: 'AcademyUsers' }" label="Pessoas" :collapsed="desktopCollapsed">
                                <template #icon><i class="fa-solid fa-users"></i></template>
                            </NavItem>
                        </template>

                        <template v-if="authStore?.user?.role === 'admin'">
                            <p v-if="!desktopCollapsed" class="nav-group">Gestão</p>
                            <div v-else class="nav-sep"></div>
                            <NavItem :to="{ name: 'AcademyAdmin' }" label="Administração" :collapsed="desktopCollapsed">
                                <template #icon><i class="fa-solid fa-shield-halved"></i></template>
                            </NavItem>
                        </template>

                        <div class="mt-auto"></div>

                        <div v-if="authStore.isInternal" class="border-t border-slate-100 pt-2 dark:border-slate-800">
                            <button type="button" @click="goOffice" :title="desktopCollapsed ? 'Voltar ao Office' : undefined"
                                class="group flex h-11 w-full items-center rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
                                :class="desktopCollapsed ? 'justify-center' : ''">
                                <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                                    <i class="fa-solid fa-arrow-left-long"></i>
                                </span>
                                <span v-if="!desktopCollapsed" class="ml-2.5">Voltar ao Office</span>
                            </button>
                        </div>
                    </nav>
                </aside>

                <!-- Main -->
                <main class="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                    <div class="h-full min-h-0 overflow-y-auto">
                        <div class="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-6">
                            <router-view />
                        </div>
                    </div>
                    <!-- Eme própria do Academy removida — o assistente é a Eme do
                         Office (OfficeChatFloat). Componente preservado, não montado. -->
                </main>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavItem from '@/views/Academy/components/NavItem.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import InputSearch from '@/views/Academy/layouts/InputSearch.vue';
import Profile from '@/views/Academy/components/Profile.vue';
import { officeUrl } from '@/utils/appContext';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const mobileOpen = ref(false);
const desktopCollapsed = ref(false);

const headerEl = ref(null);
let ro = null;

function goOffice() {
    window.location.href = officeUrl('/');
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

// seta var --header-h com altura real do header
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

<style scoped>
.nav-group {
    padding: 0.85rem 0.75rem 0.25rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: rgb(148 163 184);
}

:global(.dark) .nav-group {
    color: rgb(100 116 139);
}

.nav-sep {
    margin: 0.5rem 0.75rem;
    height: 1px;
    background: rgb(226 232 240);
}

:global(.dark) .nav-sep {
    background: rgb(30 41 59);
}
</style>
