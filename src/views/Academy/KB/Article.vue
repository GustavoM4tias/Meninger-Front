<template>
    <div class="mx-auto max-w-4xl space-y-5 pb-6">
        <AcademyPageHeader :title="title" subtitle="Base de Conhecimento" :breadcrumbs="breadcrumbs" :backTo="backTo">
            <template #actions>
                <div class="flex items-center gap-2">
                    <!-- Seguir a categoria do artigo (S4.4) -->
                    <FollowButton v-if="article?.categorySlug" target-type="CATEGORY"
                        :target-ref="`kb:${article.categorySlug}`" />

                    <button type="button" @click="goBack"
                        class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                        <i class="fa-solid fa-chevron-left text-[10px]"></i>
                        Voltar
                    </button>

                    <button type="button" @click="router.push({ name: 'AcademyKBEditor' })"
                        class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 active:scale-95">
                        <i class="fa-solid fa-plus text-xs"></i>
                        Novo artigo
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div v-if="store.article.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ store.article.error }}
        </div>

        <article
            class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <!-- Cabeçalho do artigo -->
            <header class="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                <div class="flex flex-wrap items-center gap-2">
                    <span
                        class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <i class="fa-regular fa-folder mr-1 text-[10px]"></i>
                        {{ article?.categorySlug || categorySlug }}
                    </span>
                    <span v-if="article?.slug"
                        class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {{ article.slug }}
                    </span>
                    <span v-if="store.article.loaded && !article"
                        class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Não encontrado
                    </span>
                </div>

                <h1 class="mt-2.5 text-2xl font-bold text-slate-900 dark:text-white">
                    {{ article?.title || 'Artigo' }}
                </h1>

                <!-- Metadados -->
                <div v-if="article" class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div v-if="article?.updatedBy?.username"
                        class="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/30">
                        <div class="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            <i class="fa-solid fa-pen-nib mr-1"></i> Última edição
                        </div>
                        <div class="mt-0.5 text-xs text-slate-700 dark:text-slate-200">
                            <span class="font-medium">{{ article?.updatedBy?.username }}</span>
                            <span class="mx-1 text-slate-400">•</span>
                            <span v-if="article.updatedAt">{{ fmtDate(article.updatedAt) }}</span>
                        </div>
                    </div>

                    <div v-if="article?.createdBy?.username"
                        class="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/30">
                        <div class="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            <i class="fa-regular fa-user mr-1"></i> Criado por
                        </div>
                        <div class="mt-0.5 text-xs text-slate-700 dark:text-slate-200">
                            <button v-if="article?.createdBy?.id" type="button"
                                class="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                @click="router.push({ name: 'AcademyUserProfile', params: { id: article.createdBy.id } })">
                                {{ article.createdBy.username }}
                            </button>
                            <span v-else class="text-slate-500 dark:text-slate-400">—</span>
                            <span class="mx-1 text-slate-400">•</span>
                            <span v-if="article.updatedAt">{{ fmtDate(article.createdAt) }}</span>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Corpo -->
            <div class="px-6 py-6">
                <div v-if="!store.article.loaded"
                    class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <i class="fa-solid fa-spinner fa-spin text-indigo-500"></i>
                    Carregando...
                </div>

                <div v-else-if="!article" class="text-sm text-slate-500 dark:text-slate-400">
                    Artigo não encontrado ou indisponível para seu perfil.
                </div>

                <div v-else class="prose prose-slate max-w-none dark:prose-invert">
                    <TokenRenderer :content="article.body || ''" :payload="article.payload || null" item-type=""
                        item-key="" />
                </div>
            </div>

            <!-- Avaliação do artigo (S4.2) -->
            <div v-if="article" class="border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div class="text-sm font-semibold text-slate-900 dark:text-white">Este artigo foi útil?</div>
                        <div class="mt-1 flex items-center gap-2">
                            <StarRating :model-value="ratingAvg" readonly show-value :count="ratingTotal" size="sm" />
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-slate-500 dark:text-slate-400">Sua nota:</span>
                        <StarRating :model-value="myStars" size="md" @rate="onRate" />
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <button type="button" @click="goBack"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                    Voltar para lista
                </button>
            </div>
        </article>

        <!-- Comentários (S4.1) -->
        <CommentThread v-if="article?.id" :article-id="article.id" :current-user-id="currentUserId"
            :is-admin="isAdmin" />
    </div>
</template>

<script setup>
import { computed, onMounted, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyKbStore } from '@/stores/Academy/academyKbStore';
import { useAcademyRatingsStore } from '@/stores/Academy/academyRatingsStore';
import TokenRenderer from '@/views/Academy/components/TokenRenderer.vue';
import StarRating from '@/views/Academy/components/StarRating.vue';
import FollowButton from '@/views/Academy/components/FollowButton.vue';
import CommentThread from '@/views/Academy/components/CommentThread.vue';

const route = useRoute();
const router = useRouter();
const store = useAcademyKbStore();
const ratingsStore = useAcademyRatingsStore();

// Identidade do usuário atual — tolerante a diferentes shapes do auth.
function readCurrentUser() {
    try {
        const raw = localStorage.getItem('user');
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}
const currentUser = readCurrentUser();
const currentUserId = computed(() => currentUser?.id ?? null);
const isAdmin = computed(() => String(currentUser?.role || '').toLowerCase() === 'admin');

const categorySlug = computed(() => String(route.params.categorySlug || ''));
const articleSlug = computed(() => String(route.params.articleSlug || ''));

const q = computed(() => String(route.query.q || ''));
const p = computed(() => {
    const n = Number(route.query.p || 1);
    return Number.isFinite(n) && n > 0 ? n : 1;
});

const article = computed(() => store.article.data);
const title = computed(() => article.value?.title || 'Artigo');

const backTo = computed(() => {
    const baseQuery = { q: q.value || '', p: p.value || 1 };

    if (categorySlug.value) {
        return { name: 'AcademyKBCategory', params: { categorySlug: categorySlug.value }, query: baseQuery };
    }
    return { name: 'AcademyKB', query: baseQuery };
});

const breadcrumbs = computed(() => ([
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Artigos', to: backTo.value },
    { label: categorySlug.value || 'Categoria', to: backTo.value },
    { label: article.value?.title || articleSlug.value || 'Artigo' },
]));

function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';

    // Alterado para toLocaleString e adicionado hour/minute
    return d.toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function goBack() {
    router.push(backTo.value);
}

// ── Rating (S4.2) ────────────────────────────────────────────────────
const ratingStats = computed(() =>
    article.value?.id ? ratingsStore.statsFor('ARTICLE', article.value.id) : null
);
const ratingAvg = computed(() => Number(ratingStats.value?.avg || 0));
const ratingTotal = computed(() => Number(ratingStats.value?.total || 0));
const myStars = ref(0);

async function onRate(stars) {
    if (!article.value?.id) return;
    myStars.value = stars;
    await ratingsStore.rate('ARTICLE', article.value.id, { stars });
}

async function loadRating() {
    if (!article.value?.id) return;
    const stats = await ratingsStore.fetchStats('ARTICLE', article.value.id);
    if (stats?.myRating?.stars) myStars.value = stats.myRating.stars;
}

async function load() {
    await store.fetchArticle({
        categorySlug: categorySlug.value,
        articleSlug: articleSlug.value,
        audience: 'BOTH',
    });
    await loadRating();
}

// Recarrega rating quando o artigo trocar (navegação entre artigos).
watch(() => article.value?.id, (id) => { if (id) loadRating(); });

onMounted(load);
</script>
