<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <!-- ─────────────── Carregando ─────────────── -->
        <div v-if="loading" class="space-y-5">
            <div class="h-48 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/70"></div>
            <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div v-for="n in 4" :key="n"
                    class="h-28 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70"></div>
            </div>
        </div>

        <!-- ─────────────── Erro ─────────────── -->
        <div v-else-if="error"
            class="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/50 dark:bg-slate-900">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p class="text-sm font-medium text-rose-700 dark:text-rose-400">Falha ao carregar o painel</p>
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ error }}</p>
                </div>
                <button @click="load"
                    class="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                    Tentar novamente
                </button>
            </div>
        </div>

        <!-- ─────────────── Conteúdo ─────────────── -->
        <template v-else>
            <!-- HERO — Eme se apresenta e oferece o campo de conversa -->
            <section
                class="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 dark:border-indigo-900/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/30 sm:p-6 md:p-8">
                <div
                    class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-600/10">
                </div>
                <div
                    class="pointer-events-none absolute -bottom-24 right-40 hidden h-56 w-56 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-600/10 sm:block">
                </div>

                <div class="relative flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
                    <div
                        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 sm:h-16 sm:w-16">
                        <i class="fa-solid fa-graduation-cap text-xl text-white sm:text-2xl"></i>
                    </div>

                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Menin Academy · seu tutor Eme
                        </p>
                        <h1 class="mt-1 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
                            {{ greeting }}, {{ firstName }}! 👋
                        </h1>
                        <p
                            class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-[15px]">
                            {{ emeIntro }}
                        </p>

                        <!-- Campo grande de conversa com o Eme -->
                        <form id="tour-ask" class="mt-4 max-w-2xl" @submit.prevent="submitEme">
                            <div
                                class="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-white p-1.5 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 dark:border-indigo-900/50 dark:bg-slate-900 dark:focus-within:border-indigo-700 dark:focus-within:ring-indigo-950/60">
                                <input v-model="emeQuery" type="text" enterkeyhint="send"
                                    placeholder="Pergunte ao Eme: o que devo estudar hoje?"
                                    class="min-w-0 ps-4 flex-1 bg-transparent px-1 py-2.5 text-sm border-none text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 md:text-[15px]" />
                                <button type="submit" :disabled="!emeQuery.trim()" aria-label="Enviar pergunta"
                                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white transition hover:opacity-95 active:scale-95 disabled:opacity-40">
                                    <i class="fa-solid fa-arrow-up"></i>
                                </button>
                            </div>
                        </form>

                        <!-- Sugestões -->
                        <div class="mt-3 flex flex-wrap gap-2">
                            <button v-for="q in emeSuggestions" :key="q" type="button" @click="askEme(q)"
                                class="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-indigo-700 backdrop-blur transition hover:border-indigo-300 hover:bg-white dark:border-indigo-900/60 dark:bg-slate-900/60 dark:text-indigo-300 dark:hover:bg-slate-800">
                                <i class="fa-regular fa-comment-dots text-[11px]"></i>
                                {{ q }}
                            </button>
                        </div>

                        <!-- Tour da plataforma -->
                        <p
                            class="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <i class="fa-solid fa-wand-magic-sparkles text-indigo-400"></i>
                            Novo por aqui?
                            <button type="button" @click="runTour"
                                class="font-semibold text-indigo-600 transition hover:underline dark:text-indigo-400">
                                Faça o tour da plataforma com o Eme
                            </button>
                        </p>
                    </div>
                </div>
            </section>

            <!-- GUIA RÁPIDO — os 4 pilares -->
            <div id="tour-pillars" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <button v-for="g in guideCards" :key="g.key" type="button" @click="g.run"
                    class="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl" :class="g.tint">
                        <i :class="g.icon"></i>
                    </span>
                    <p class="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{{ g.title }}</p>
                    <p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{{ g.desc }}</p>
                </button>
            </div>

            <!-- GRADE PRINCIPAL -->
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <!-- Coluna esquerda -->
                <div class="space-y-5 lg:col-span-8">
                    <!-- Continue de onde parou -->
                    <section id="tour-continue"
                        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div
                            class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-route text-indigo-500"></i>
                                <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                                    Continue de onde parou
                                </h2>
                            </div>
                            <button type="button" @click="goToTracks"
                                class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50">
                                Ver todas
                            </button>
                        </div>

                        <div class="p-3">
                            <ul v-if="tracksPreview.length" class="space-y-2">
                                <li v-for="tr in tracksPreview" :key="tr.trackSlug" @click="openTrack(tr)"
                                    class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-800/60 dark:hover:bg-slate-700/50">
                                    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ tr.title }}
                                    </p>
                                    <div class="mt-2">
                                        <div
                                            class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                            <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                                :style="{ width: `${clampPercent(tr.progressPercent)}%` }" />
                                        </div>
                                        <div
                                            class="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                            <span class="font-medium text-indigo-600 dark:text-indigo-400">
                                                {{ clampPercent(tr.progressPercent) }}% concluído
                                            </span>
                                            <span>{{ formatDate(tr.updatedAt) }}</span>
                                        </div>
                                    </div>
                                </li>
                            </ul>

                            <div v-else class="px-3 py-8 text-center">
                                <i class="fa-solid fa-compass text-3xl text-slate-300 dark:text-slate-700"></i>
                                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    Você ainda não começou nenhuma trilha.
                                </p>
                                <button type="button" @click="goToTracks"
                                    class="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
                                    <i class="fa-solid fa-play text-xs"></i>
                                    Explorar trilhas
                                </button>
                            </div>
                        </div>
                    </section>

                    <!-- Material de boas-vindas -->
                    <section v-if="welcomeArticles.length"
                        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div class="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <i class="fa-solid fa-hand-sparkles text-violet-500"></i>
                            <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                                Material de boas-vindas
                            </h2>
                        </div>
                        <div class="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                            <button v-for="a in welcomeArticles" :key="a.id" type="button" @click="openArticle(a)"
                                class="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-violet-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-800/60 dark:hover:bg-slate-700/50">
                                <span
                                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
                                    <i class="fa-solid fa-file-lines"></i>
                                </span>
                                <span
                                    class="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {{ a.title }}
                                </span>
                                <i
                                    class="fa-solid fa-chevron-right text-xs text-slate-300 transition group-hover:text-violet-500 dark:text-slate-600"></i>
                            </button>
                        </div>
                    </section>

                    <!-- Atualizações recentes -->
                    <section
                        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div
                            class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-book text-emerald-500"></i>
                                <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                                    Atualizações recentes
                                </h2>
                            </div>
                            <button type="button" @click="goToKB"
                                class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50">
                                Ver tudo
                            </button>
                        </div>
                        <div class="p-2">
                            <ul v-if="recentArticles.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                                <li v-for="a in recentArticles" :key="a.id" @click="openArticle(a)"
                                    class="flex cursor-pointer items-start justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <div class="min-w-0">
                                        <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">
                                            {{ a.title }}
                                        </p>
                                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {{ a.categorySlug }} • {{ formatDate(a.updatedAt) }}
                                        </p>
                                    </div>
                                    <i
                                        class="fa-solid fa-chevron-right mt-0.5 text-xs text-slate-300 dark:text-slate-600"></i>
                                </li>
                            </ul>
                            <div v-else class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                                Sem artigos recentes por aqui.
                            </div>
                        </div>
                    </section>
                </div>

                <!-- Coluna direita -->
                <div class="space-y-5 lg:col-span-4">
                    <!-- Sua evolução -->
                    <section v-if="gamLoaded"
                        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div class="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <i class="fa-solid fa-bolt text-amber-500"></i>
                            <h2 class="text-base font-semibold text-slate-900 dark:text-white">Sua evolução</h2>
                        </div>
                        <div class="p-5">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span
                                        class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-white shadow-sm">
                                        {{ gam.stats.level }}
                                    </span>
                                    <div>
                                        <p class="text-sm font-semibold text-slate-900 dark:text-white">
                                            Nível {{ gam.stats.level }}
                                        </p>
                                        <p class="text-xs text-slate-500 dark:text-slate-400">
                                            {{ gam.stats.totalXp }} XP no total
                                        </p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="flex items-center justify-end gap-1.5">
                                        <i class="fa-solid fa-fire text-orange-500"></i>
                                        <span class="text-lg font-bold text-slate-900 dark:text-white">
                                            {{ gam.stats.currentStreak }}
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-500 dark:text-slate-400">dias seguidos</p>
                                </div>
                            </div>
                            <div class="mt-4">
                                <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div class="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                                        :style="{ width: `${xpPercent}%` }"></div>
                                </div>
                                <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    Faltam {{ gam.stats.xpToNextLevel }} XP para o nível {{ gam.stats.level + 1 }}
                                </p>
                            </div>
                        </div>
                    </section>

                    <!-- Destaques -->
                    <section
                        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div class="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <i class="fa-solid fa-star text-amber-500"></i>
                            <h2 class="text-base font-semibold text-slate-900 dark:text-white">Destaques</h2>
                        </div>
                        <div class="p-2">
                            <ul v-if="panel.highlights?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                                <li v-for="h in panel.highlights" :key="h.title + h.target" @click="openHighlight(h)"
                                    class="flex cursor-pointer items-start justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <div class="min-w-0">
                                        <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">
                                            {{ h.title }}
                                        </p>
                                        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            {{ highlightLabel(h.type) }}
                                        </p>
                                    </div>
                                    <i
                                        class="fa-solid fa-chevron-right mt-0.5 text-xs text-slate-300 dark:text-slate-600"></i>
                                </li>
                            </ul>
                            <div v-else class="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                                Sem destaques no momento.
                            </div>
                        </div>
                    </section>

                    <!-- Dúvidas abertas -->
                    <section
                        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div
                            class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-circle-question text-sky-500"></i>
                                <h2 class="text-base font-semibold text-slate-900 dark:text-white">Dúvidas abertas</h2>
                            </div>
                            <button type="button" @click="goToQuestions"
                                class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50">
                                Ver
                            </button>
                        </div>
                        <div class="p-2">
                            <ul v-if="panel.openQuestions?.length"
                                class="divide-y divide-slate-100 dark:divide-slate-800">
                                <li v-for="t in panel.openQuestions" :key="t.id" @click="openTopic(t)"
                                    class="cursor-pointer rounded-xl px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">
                                        {{ t.title }}
                                    </p>
                                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {{ formatDate(t.createdAt) }}
                                    </p>
                                </li>
                            </ul>
                            <div v-else class="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma dúvida pendente.
                            </div>
                        </div>
                    </section>

                    <!-- Dicas para você -->
                    <section
                        class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                        <div class="flex items-center gap-2">
                            <i :class="tips.icon" class="text-indigo-500"></i>
                            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">{{ tips.title }}</h2>
                        </div>
                        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ tips.body }}</p>
                        <button type="button" @click="askEme(tips.cta)"
                            class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition hover:underline dark:text-indigo-400">
                            <i class="fa-regular fa-comment-dots text-xs"></i>
                            {{ tips.ctaLabel }}
                        </button>
                    </section>
                </div>
            </div>

            <!-- ADMINISTRAÇÃO -->
            <section v-if="isAdmin"
                class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <i class="fa-solid fa-shield-halved text-slate-400"></i>
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Administração</h2>
                </div>
                <div class="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <button v-for="a in adminActions" :key="a.label" type="button" @click="a.run"
                        class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-800 dark:hover:bg-slate-700">
                        <div class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            <i :class="a.icon" class="text-slate-400"></i>
                            {{ a.label }}
                        </div>
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ a.desc }}</p>
                    </button>
                </div>
            </section>
        </template>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAcademyStore } from '@/stores/Academy/academyStore';
import { useAcademyTracksStore } from '@/stores/Academy/academyTracksStore';
import { useAcademyGamificationStore } from '@/stores/Academy/academyGamificationStore';
import { useAcademyTutorStore } from '@/stores/Academy/academyTutorStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { startAcademyTour, hasSeenAcademyTour } from '@/views/Academy/academyTour';

const router = useRouter();
const academy = useAcademyStore();
const tracksStore = useAcademyTracksStore();
const gam = useAcademyGamificationStore();
const tutor = useAcademyTutorStore();
const authStore = useAuthStore();

const loading = ref(false);
const gamLoaded = ref(false);
const tracksPreview = ref([]);
const emeQuery = ref('');

const panel = computed(() => academy.panel || {});
const error = computed(() => academy.error);

// ── Usuário e tipo de perfil ──────────────────────────────────────────────
const user = computed(() => authStore.user || {});
const firstName = computed(() => {
    const n = String(user.value?.username || user.value?.name || '').trim();
    return n ? n.split(/\s+/)[0] : 'pessoa';
});
const isAdmin = computed(() => user.value?.role === 'admin');
// Externo = corretor/imobiliária/correspondente (login Academy por código).
// Mesma regra do middleware requireInternal do backend.
const isExternal = computed(() => {
    const p = String(user.value?.auth_provider || 'INTERNAL').toUpperCase();
    return p === 'CVCRM' || !!user.value?.external_kind;
});

const greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
});

// ── Discurso do Eme, adaptado ao tipo de usuário ──────────────────────────
const emeIntro = computed(() => {
    if (isExternal.value) {
        return 'Sou o seu tutor aqui no Menin Academy. Recomendo trilhas, encontro materiais de estudo e acompanho o seu progresso até o certificado. É só me perguntar — estou sempre por perto.';
    }
    if (isAdmin.value) {
        return 'Sou o seu tutor do Academy. Oriento os estudos e ajudo a entender a aderência da equipe. Como você também tem acesso ao Office, posso responder sobre os dados de lá conforme as suas permissões.';
    }
    return 'Sou o seu tutor aqui no Academy. Recomendo trilhas, busco artigos e acompanho o seu progresso. Como você é da equipe Menin, também ajudo com informações do Office, sempre respeitando as suas permissões.';
});

const emeSuggestions = computed(() => {
    if (isAdmin.value) {
        return ['O que devo estudar agora?', 'Como crio uma trilha nova?', 'Como está a aderência da equipe?'];
    }
    if (isExternal.value) {
        return ['O que devo estudar agora?', 'Quais trilhas eu tenho?', 'Como funcionam os certificados?'];
    }
    return ['O que devo estudar agora?', 'Quais trilhas eu tenho?', 'Resuma o meu progresso'];
});

const tips = computed(() => {
    if (isAdmin.value) {
        return {
            icon: 'fa-solid fa-shield-halved',
            title: 'Você é administrador',
            body: 'Crie e edite trilhas, publique artigos na Base de Conhecimento e acompanhe a aderência da equipe pelo painel de Administração.',
            cta: 'Como acompanho a aderência da equipe?',
            ctaLabel: 'Perguntar ao Eme',
        };
    }
    if (isExternal.value) {
        return {
            icon: 'fa-solid fa-graduation-cap',
            title: 'Bons estudos!',
            body: 'Foque nas suas trilhas. Ao concluir 100% de uma trilha, um certificado verificável é emitido automaticamente para você.',
            cta: 'Como funcionam os certificados?',
            ctaLabel: 'Perguntar ao Eme',
        };
    }
    return {
        icon: 'fa-solid fa-people-group',
        title: 'Equipe Menin',
        body: 'Você tem acesso a todas as trilhas e à comunidade. Fique atento: trilhas obrigatórias têm prazo e você recebe lembretes conforme a data se aproxima.',
        cta: 'Tenho alguma trilha obrigatória pendente?',
        ctaLabel: 'Perguntar ao Eme',
    };
});

// ── Conteúdo derivado do painel ───────────────────────────────────────────
const welcomeArticles = computed(() =>
    (panel.value.kbUpdates || []).filter((a) => a.categorySlug === 'primeiros-passos')
);
const recentArticles = computed(() =>
    (panel.value.kbUpdates || []).filter((a) => a.categorySlug !== 'primeiros-passos')
);

const xpPercent = computed(() => {
    const inLvl = Number(gam.stats?.xpInCurrentLevel || 0);
    const toNext = Number(gam.stats?.xpToNextLevel || 0);
    const total = inLvl + toNext;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((inLvl / total) * 100)));
});

// ── Cards do guia rápido ──────────────────────────────────────────────────
const guideCards = computed(() => [
    {
        key: 'tracks', icon: 'fa-solid fa-route', title: 'Trilhas',
        tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
        desc: 'Cursos em sequência. Conclua e ganhe certificado.', run: goToTracks,
    },
    {
        key: 'kb', icon: 'fa-solid fa-book', title: 'Base de Conhecimento',
        tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
        desc: 'Artigos, procedimentos e materiais de apoio.', run: goToKB,
    },
    {
        key: 'community', icon: 'fa-solid fa-comments', title: 'Comunidade',
        tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
        desc: 'Dúvidas, discussões e troca com o time.', run: goToCommunity,
    },
    {
        key: 'me', icon: 'fa-solid fa-award', title: 'Conquistas',
        tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
        desc: 'Seu progresso, níveis e certificados.', run: goToMe,
    },
]);

const adminActions = computed(() => [
    { icon: 'fa-solid fa-circle-plus', label: 'Criar trilha', desc: 'Monte um novo curso', run: () => router.push({ name: 'AcademyTracksAdminCreate' }) },
    { icon: 'fa-solid fa-pen-to-square', label: 'Publicar artigo', desc: 'Escreva na Base de Conhecimento', run: () => router.push({ name: 'AcademyKBEditor' }) },
    { icon: 'fa-solid fa-chart-line', label: 'Aderência', desc: 'Acompanhe a equipe', run: () => router.push({ name: 'AcademyAdherence' }) },
    { icon: 'fa-solid fa-sliders', label: 'Painel Admin', desc: 'Todas as configurações', run: () => router.push({ name: 'AcademyAdmin' }) },
]);

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function clampPercent(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}
function highlightLabel(type) {
    const map = { TRACK: 'Trilha', ARTICLE: 'Artigo', TOPIC: 'Tópico', LINK: 'Link externo' };
    return map[type] || 'Destaque';
}
function toTrackPreviewItem(base, detail) {
    return {
        trackSlug: base?.slug,
        title: detail?.track?.title || base?.title || base?.slug,
        progressPercent: Number(detail?.progressPercent ?? 0),
        updatedAt: detail?.track?.updatedAt || base?.updatedAt,
    };
}

// ── Eme e tour ────────────────────────────────────────────────────────────
function askEme(q) { tutor.ask(q); }
function submitEme() {
    const q = emeQuery.value.trim();
    if (!q) return;
    tutor.ask(q);
    emeQuery.value = '';
}
function runTour() {
    startAcademyTour({ firstName: firstName.value });
}

// ── Navegação ─────────────────────────────────────────────────────────────
function goToKB() { router.push({ name: 'AcademyKB' }); }
function goToCommunity() { router.push({ name: 'AcademyCommunity' }); }
function goToQuestions() { router.push({ name: 'AcademyCommunityType', params: { type: 'questions' } }); }
function goToTracks() { router.push({ name: 'AcademyTracks' }); }
function goToMe() { router.push({ name: 'AcademyMe' }); }

function openArticle(a) {
    router.push({ name: 'AcademyKBArticle', params: { categorySlug: a.categorySlug, articleSlug: a.slug } });
}
function openTopic(t) {
    router.push({ name: 'AcademyCommunityTopic', params: { id: t.id }, query: { type: 'questions' } });
}
function openTrack(tr) {
    router.push({ name: 'AcademyTrackDetail', params: { trackSlug: tr.trackSlug } });
}
function openHighlight(h) {
    if (h.type === 'LINK') return window.open(h.target, '_blank');
    if (h.type === 'ARTICLE') {
        const [categorySlug, articleSlug] = String(h.target).split('/');
        if (categorySlug && articleSlug) {
            router.push({ name: 'AcademyKBArticle', params: { categorySlug, articleSlug } });
        }
        return;
    }
    if (h.type === 'TOPIC') {
        router.push({ name: 'AcademyCommunityTopic', params: { id: h.target }, query: { type: 'questions' } });
        return;
    }
    if (h.type === 'TRACK') {
        router.push({ name: 'AcademyTrackDetail', params: { trackSlug: h.target } });
    }
}

// ── Carregamento ──────────────────────────────────────────────────────────
async function loadTracksPreview() {
    try {
        const list = await tracksStore.fetchTracks({ audience: 'BOTH' });
        const top = (list || []).slice(0, 3);
        tracksPreview.value = await Promise.all(
            top.map(async (t) => {
                try {
                    const d = await tracksStore.fetchTrack(t.slug, { audience: 'BOTH' });
                    return toTrackPreviewItem(t, d);
                } catch {
                    return toTrackPreviewItem(t, null);
                }
            })
        );
    } catch {
        tracksPreview.value = [];
    }
}

async function loadGamification() {
    try {
        await gam.fetchMyStats();
        gamLoaded.value = gam.loaded;
    } catch {
        gamLoaded.value = false;
    }
}

async function load() {
    loading.value = true;
    try {
        await academy.fetchPanelSummary({ audience: 'BOTH' });
        await Promise.all([loadTracksPreview(), loadGamification()]);
    } catch {
        /* erro já fica em academy.error */
    } finally {
        loading.value = false;
        maybeStartTour();
    }
}

// Tour roda automaticamente só na primeira visita; depois, é via botão.
function maybeStartTour() {
    if (hasSeenAcademyTour() || error.value) return;
    nextTick(() => {
        setTimeout(() => {
            try { startAcademyTour({ firstName: firstName.value }); } catch { /* ignora */ }
        }, 250);
    });
}

onMounted(load);
</script>
