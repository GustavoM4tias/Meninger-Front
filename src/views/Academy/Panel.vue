<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Painel" subtitle="Visão geral do Academy" :breadcrumbs="[
            { label: 'Academy', to: { name: 'AcademyPanel' } },
            { label: 'Painel' }
        ]" />

        <div v-if="loading"
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div class="flex items-center gap-3">
                <div class="h-2 w-2 animate-pulse rounded-full bg-slate-900 dark:bg-slate-100"></div>
                <p class="text-sm text-slate-600 dark:text-slate-400">Carregando painel...</p>
            </div>
        </div>

        <div v-else-if="error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-sm font-medium text-rose-700 dark:text-rose-400">Falha ao carregar painel</p>
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ error }}</p>
                </div>
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    @click="load">
                    Tentar novamente
                </button>
            </div>
        </div>

        <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div class="lg:col-span-8 space-y-4">
                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                    <div
                        class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-slate-900 dark:text-white">Últimos Artigos</h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400">Últimos artigos publicados/atualizados
                            </p>
                        </div>
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            @click="goToKB">
                            Ver tudo
                        </button>
                    </div>

                    <div class="p-2">
                        <ul v-if="panel.kbUpdates?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <li v-for="a in panel.kbUpdates" :key="a.id"
                                class="flex items-start justify-between gap-3 rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                @click="openArticle(a)">
                                <div class="min-w-0">
                                    <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">{{
                                        a.title }}</p>
                                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {{ a.categorySlug }} • {{ formatDate(a.updatedAt) }}
                                    </p>
                                </div>
                                <span class="text-slate-400 dark:text-slate-600">›</span>
                            </li>
                        </ul>

                        <div v-else class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                            Sem artigos recentes.
                        </div>
                    </div>
                </section>

                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                    <div
                        class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-slate-900 dark:text-white">Dúvidas abertas</h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400">Tópicos sem solução aceita</p>
                        </div>
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            @click="goToQuestions">
                            Ver dúvidas
                        </button>
                    </div>

                    <div class="p-2">
                        <ul v-if="panel.openQuestions?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <li v-for="t in panel.openQuestions" :key="t.id"
                                class="rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                @click="openTopic(t)">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">{{
                                            t.title }}</p>

                                        <div class="mt-2 flex flex-wrap items-center gap-2">
                                            <span v-for="tag in normalizeTags(t.tags).slice(0, 3)" :key="tag"
                                                class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                {{ tag }}
                                            </span>

                                            <span class="text-xs text-slate-500 dark:text-slate-400">
                                                • {{ formatDate(t.createdAt) }}
                                            </span>
                                        </div>
                                    </div>

                                    <span class="text-slate-400 dark:text-slate-600">›</span>
                                </div>
                            </li>
                        </ul>

                        <div v-else class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                            Sem dúvidas pendentes.
                        </div>
                    </div>
                </section>
            </div>

            <div class="lg:col-span-4 space-y-4">
                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                    <div
                        class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-slate-900 dark:text-white">Trilhas</h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400">Em andamento</p>
                        </div>
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            @click="goToTracks">
                            Ver trilhas
                        </button>
                    </div>

                    <div class="p-3">
                        <ul v-if="tracksPreview?.length" class="space-y-3">
                            <li v-for="tr in tracksPreview" :key="tr.trackSlug"
                                class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                @click="openTrack(tr)">
                                <p class="text-sm font-semibold text-slate-900 dark:text-slate-200">{{ tr.title }}</p>
                                <!-- <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ tr.trackSlug }}</p> -->
                                <div class="mt-2">
                                    <div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                                        <div class="h-2 rounded-full bg-slate-900 dark:bg-slate-100"
                                            :style="{ width: `${clampPercent(tr.progressPercent)}%` }" />
                                    </div>
                                    <div
                                        class="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <span>{{ clampPercent(tr.progressPercent) }}%</span>
                                        <span>{{ formatDate(tr.updatedAt) }}</span>
                                    </div>
                                </div>
                            </li>
                        </ul>

                        <div v-else class="py-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                            Sem trilhas em andamento.
                        </div>
                    </div>
                </section>

                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Destaques</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Links e itens recomendados</p>
                    </div>

                    <div class="p-2">
                        <ul v-if="panel.highlights?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <li v-for="h in panel.highlights" :key="h.title + h.target"
                                class="flex items-start justify-between gap-3 rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                @click="openHighlight(h)">
                                <div class="min-w-0">
                                    <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">{{
                                        h.title }}</p>
                                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ h.type }}</p>
                                </div>
                                <span class="text-slate-400 dark:text-slate-600">›</span>
                            </li>
                        </ul>

                        <div v-else class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                            Sem destaques cadastrados.
                        </div>
                    </div>
                </section>

                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                    <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Ações rápidas</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Atalhos operacionais</p>
                    </div>

                    <div class="grid grid-cols-1 gap-2 p-3">
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                            @click="router.push({ name: 'AcademyKBEditor' })">
                            Criar / Editar artigos
                            <div class="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">Padronize processos
                                e soluções</div>
                        </button>

                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                            @click="goToQuestions">
                            Abrir uma dúvida
                            <div class="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">Centralize
                                perguntas e respostas</div>
                        </button>

                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                            @click="goToCommunity">
                            Ver discussões ativas
                            <div class="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">Melhores práticas
                                do time</div>
                        </button>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyStore } from '@/stores/Academy/academyStore';
import { useAcademyTracksStore } from '@/stores/Academy/academyTracksStore';

const router = useRouter();
const academy = useAcademyStore();
const tracksStore = useAcademyTracksStore();

const loading = ref(false);
const panel = computed(() => academy.panel || {});
const error = computed(() => academy.error);

const tracksPreview = ref([]);

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function clampPercent(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeTags(tags) {
    return Array.isArray(tags) ? tags : [];
}

function toTrackPreviewItem(base, detail) {
    return {
        trackSlug: base?.slug,
        title: detail?.track?.title || base?.title || base?.slug,
        progressPercent: Number(detail?.progressPercent ?? 0),
        updatedAt: detail?.track?.updatedAt || base?.updatedAt
    };
}

async function loadTracksPreview() {
    const list = await tracksStore.fetchTracks({ audience: 'BOTH' });
    const top = (list || []).slice(0, 3);

    const details = await Promise.all(
        top.map(async (t) => {
            try {
                const d = await tracksStore.fetchTrack(t.slug, { audience: 'BOTH' });
                return toTrackPreviewItem(t, d);
            } catch {
                return toTrackPreviewItem(t, null);
            }
        })
    );

    tracksPreview.value = details;
}

async function load() {
    loading.value = true;
    try {
        await academy.fetchPanelSummary({ audience: 'BOTH' });
        await loadTracksPreview();
    } finally {
        loading.value = false;
    }
}

function goToKB() { router.push({ name: 'AcademyKB' }); }
function goToCommunity() { router.push({ name: 'AcademyCommunity' }); }
function goToQuestions() { router.push({ name: 'AcademyCommunityType', params: { type: 'questions' } }); }
function goToTracks() { router.push({ name: 'AcademyTracks' }); }

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
        return;
    }
}

onMounted(load);
</script>
