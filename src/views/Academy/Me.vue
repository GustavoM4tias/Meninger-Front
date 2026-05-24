<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Meu perfil" subtitle="Produção e evolução no Menin Academy" :breadcrumbs="breadcrumbs"
            :backTo="{ name: 'AcademyPanel' }" />

        <div v-if="store.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ store.error }}
        </div>

        <!-- Identidade -->
        <section
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div class="flex min-w-0 items-center gap-4">
                    <span
                        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
                        {{ initials }}
                    </span>
                    <div class="min-w-0">
                        <div class="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                            {{ user?.username || 'Usuário' }}
                        </div>
                        <div class="truncate text-sm text-slate-500 dark:text-slate-400">
                            {{ user?.email || '' }}
                        </div>
                        <div class="mt-2 flex flex-wrap gap-2">
                            <span
                                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <i class="fa-solid fa-briefcase text-[10px] text-slate-400"></i>
                                {{ user?.position || 'Cargo' }}
                            </span>
                            <span
                                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <i class="fa-solid fa-location-dot text-[10px] text-slate-400"></i>
                                {{ user?.city || 'Cidade' }}
                            </span>
                            <span
                                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <i class="fa-regular fa-calendar text-[10px] text-slate-400"></i>
                                Desde {{ fmtDate(user?.createdAt) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    class="rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-4 text-center dark:border-indigo-900/40 dark:bg-indigo-950/40">
                    <div class="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                        Score
                    </div>
                    <div class="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{{ store.score }}</div>
                    <div class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">produção</div>
                </div>
            </div>
        </section>

        <!-- Gamificação (S5.1) -->
        <GamificationCard :stats="gamification.stats" :badges="gamification.badges" />

        <!-- Métricas -->
        <section class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div
                class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-2">
                    <span
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <i class="fa-solid fa-book text-xs"></i>
                    </span>
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Artigos
                    </div>
                </div>
                <div class="mt-3 text-sm text-slate-700 dark:text-slate-300">Publicados</div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ kb.published }}</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Rascunhos: {{ kb.drafts }} • Total: {{ kb.total }}
                </div>
                <button type="button" @click="router.push({ name: 'AcademyKBArticles' })"
                    class="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
                    Meus artigos
                </button>
            </div>

            <div
                class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-2">
                    <span
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                        <i class="fa-solid fa-comments text-xs"></i>
                    </span>
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Comunidade
                    </div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                    <div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Tópicos</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ community.topicsCreated }}
                        </div>
                    </div>
                    <div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Respostas</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ community.answersPosted }}
                        </div>
                    </div>
                </div>
                <button type="button" @click="router.push({ name: 'AcademyCommunity' })"
                    class="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    Abrir comunidade
                </button>
            </div>

            <div
                class="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-2">
                    <span
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <i class="fa-solid fa-route text-xs"></i>
                    </span>
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Trilhas
                    </div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                    <div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Em andamento</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ tracks.inProgress }}</div>
                    </div>
                    <div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Concluídas</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ tracks.completed }}</div>
                    </div>
                </div>
                <button type="button" @click="router.push({ name: 'AcademyTracks' })"
                    class="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    Ver trilhas
                </button>
            </div>
        </section>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <!-- Coluna esquerda: feed -->
            <section
                class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
                <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-rss text-indigo-500"></i>
                        Para você
                    </div>
                    <div class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        Novidades das categorias, tópicos e colegas que você segue
                    </div>
                </div>

                <div class="p-2">
                    <div v-if="!feed.items.length && feed.loaded"
                        class="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        Seu feed está vazio. Siga categorias, trilhas e colegas para ver novidades aqui.
                    </div>

                    <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                        <li v-for="(ev, idx) in feed.items" :key="`${ev.type}-${idx}`" @click="goTo(ev.link)"
                            class="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                :class="feedIconBg(ev.type)">
                                <i class="fa-solid" :class="feedIcon(ev.type)"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {{ ev.title }}
                                </div>
                                <div v-if="ev.snippet"
                                    class="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                                    {{ ev.snippet }}
                                </div>
                                <div class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                                    {{ feedLabel(ev) }} • {{ fmtRelative(ev.timestamp) }}
                                </div>
                            </div>
                        </li>
                    </ul>

                    <div v-if="feed.hasMore" class="px-3 py-3">
                        <button type="button" :disabled="feed.loading" @click="feed.loadMore()"
                            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            {{ feed.loading ? 'Carregando...' : 'Carregar mais' }}
                        </button>
                    </div>
                </div>
            </section>

            <!-- Coluna direita: certificados + progresso -->
            <div class="space-y-5 lg:col-span-5">
                <!-- Certificados (S1) -->
                <section
                    class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <div class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-award text-violet-500"></i>
                            Certificados
                            <span class="text-slate-400 dark:text-slate-500">({{ certificates.list.length }})</span>
                        </div>
                        <div class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Conclusões comprovadas</div>
                    </div>
                    <div class="space-y-2 p-3">
                        <div v-if="!certificates.list.length"
                            class="px-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            Nenhum certificado ainda. Conclua uma trilha 100% para emitir.
                        </div>
                        <CertificateCard v-for="c in certificates.list" :key="c.code" :cert="c" />
                    </div>
                </section>

                <!-- Progresso recente -->
                <section
                    class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <div class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-chart-line text-indigo-500"></i>
                            Progresso recente
                        </div>
                    </div>
                    <div class="p-2">
                        <div v-if="!tracks.list.length"
                            class="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            Nenhuma trilha iniciada ainda.
                        </div>
                        <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                            <li v-for="t in tracks.list.slice(0, 8)" :key="t.trackSlug"
                                @click="router.push({ name: 'AcademyTrackDetail', params: { trackSlug: t.trackSlug } })"
                                class="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <div class="min-w-0">
                                    <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">
                                        {{ t.trackTitle || t.trackSlug }}
                                    </div>
                                    <div class="text-xs text-slate-500 dark:text-slate-400">
                                        {{ fmtDate(t.updatedAt) }}
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="t.status === 'COMPLETED'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'">
                                        {{ t.status === 'COMPLETED' ? 'concluída' : 'em andamento' }}
                                    </span>
                                    <span class="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                        {{ Number(t.progressPercent || 0) }}%
                                    </span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import GamificationCard from '@/views/Academy/components/GamificationCard.vue';
import CertificateCard from '@/views/Academy/components/CertificateCard.vue';
import { useAcademyMeStore } from '@/stores/Academy/academyMeStore';
import { useAcademyGamificationStore } from '@/stores/Academy/academyGamificationStore';
import { useAcademyCertificatesStore } from '@/stores/Academy/academyCertificatesStore';
import { useAcademyFeedStore } from '@/stores/Academy/academyFeedStore';

const router = useRouter();
const store = useAcademyMeStore();
const gamification = useAcademyGamificationStore();
const certificates = useAcademyCertificatesStore();
const feed = useAcademyFeedStore();

const breadcrumbs = computed(() => [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Meu perfil' },
]);

const user = computed(() => store.user);
const kb = computed(() => store.kb);
const community = computed(() => store.community);
const tracks = computed(() => store.tracks);

const initials = computed(() =>
    String(user.value?.username || '?').slice(0, 2).toUpperCase()
);

function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fmtRelative(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'agora há pouco';
    if (h < 24) return `${h}h atrás`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days}d atrás`;
    return d.toLocaleDateString('pt-BR');
}

// ── Feed visual ──────────────────────────────────────────────────────
function feedIcon(type) {
    return {
        NEW_ARTICLE: 'fa-book',
        TOPIC_REPLY: 'fa-comment',
        NEW_TOPIC: 'fa-comments',
        TRACK_PUBLISHED: 'fa-route',
        USER_ACTIVITY: 'fa-user',
    }[type] || 'fa-bell';
}

function feedIconBg(type) {
    return {
        NEW_ARTICLE: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
        TOPIC_REPLY: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
        NEW_TOPIC: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
        TRACK_PUBLISHED: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
        USER_ACTIVITY: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    }[type] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
}

function feedLabel(ev) {
    return {
        NEW_ARTICLE: 'Novo artigo',
        TOPIC_REPLY: 'Resposta no fórum',
        NEW_TOPIC: 'Novo tópico',
        TRACK_PUBLISHED: 'Trilha',
        USER_ACTIVITY: ev.authorName || 'Atividade',
    }[ev.type] || 'Novidade';
}

function goTo(link) {
    if (!link) return;
    const path = String(link).replace(/^\/academy/, '');
    router.push(path || '/panel');
}

onMounted(() => {
    store.fetchSummary({ audience: 'BOTH' });
    gamification.fetchAll();
    certificates.fetchMine();
    feed.fetchFeed({ page: 1, pageSize: 15 });
});
</script>
