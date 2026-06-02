<template>
    <div class="mx-auto max-w-4xl space-y-5 pb-6">
        <AcademyPageHeader :title="title" subtitle="Base de Conhecimento" :breadcrumbs="breadcrumbs" :backTo="backTo">
            <template #actions>
                <div class="flex items-center gap-2">
                    <!-- Seguir a categoria do artigo (S4.4) -->
                    <FollowButton v-if="article?.categorySlug" target-type="CATEGORY"
                        :target-ref="`kb:${article.categorySlug}`" />

                    <button type="button" @click="copyLink" :title="copied ? 'Copiado!' : 'Copiar link do artigo'"
                        class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                        <i class="fa-solid text-xs" :class="copied ? 'fa-check text-emerald-500' : 'fa-link'"></i>
                        {{ copied ? 'Copiado' : 'Copiar link' }}
                    </button>

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
                    <span v-if="readingMinutes"
                        class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <i class="fa-regular fa-clock text-[10px]"></i>
                        {{ readingMinutes }} min de leitura
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

            <!-- Nesta página (TOC) -->
            <details v-if="outline.length >= 2" open
                class="article-toc border-b border-slate-100 px-6 py-3 dark:border-slate-800">
                <summary class="flex cursor-pointer list-none items-center justify-between">
                    <span
                        class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <i class="fa-solid fa-list-tree text-indigo-500"></i>
                        Nesta página
                        <span class="font-normal text-slate-400 dark:text-slate-500">({{ outline.length }})</span>
                    </span>
                    <i class="fa-solid fa-chevron-down toc-chev text-xs text-slate-400"></i>
                </summary>
                <ul class="mt-3 space-y-0.5">
                    <li v-for="o in outline" :key="o.id">
                        <button type="button" @click="scrollToHeading(o.id)"
                            class="group/item flex w-full items-start gap-1.5 rounded-md py-1 text-left text-sm transition hover:text-indigo-600 dark:hover:text-indigo-400"
                            :class="o.level === 1 ? 'pl-1 font-semibold text-slate-800 dark:text-slate-100'
                                : o.level === 2 ? 'pl-5 text-slate-700 dark:text-slate-300'
                                : 'pl-10 text-xs text-slate-500 dark:text-slate-400'">
                            <i
                                class="fa-solid fa-angle-right mt-1 text-[9px] text-slate-300 transition-transform group-hover/item:translate-x-0.5"></i>
                            <span>{{ o.text }}</span>
                        </button>
                    </li>
                </ul>
            </details>

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

                <div v-else ref="proseRef" class="prose prose-slate max-w-none dark:prose-invert">
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

            <!-- Mencionado em (backlinks) -->
            <div v-if="article && backlinks.length"
                class="border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <i class="fa-solid fa-link text-indigo-500"></i>
                    Mencionado em
                    <span class="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                        ({{ backlinks.length }})
                    </span>
                </h3>
                <ul class="mt-3 space-y-2">
                    <li v-for="b in backlinks" :key="`${b.categorySlug}/${b.slug}`">
                        <button type="button" @click="openBacklink(b)"
                            class="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-800 dark:hover:bg-slate-700/50">
                            <span
                                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                                <i class="fa-solid fa-file-lines"></i>
                            </span>
                            <span class="min-w-0 flex-1">
                                <span
                                    class="block truncate text-sm font-medium text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                                    {{ b.title }}
                                </span>
                                <span class="text-xs text-slate-500 dark:text-slate-400">
                                    {{ b.categorySlug }}
                                </span>
                            </span>
                            <i
                                class="fa-solid fa-arrow-up-right-from-square text-xs text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600"></i>
                        </button>
                    </li>
                </ul>
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
import { computed, nextTick, onMounted, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
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

// ── Tempo estimado de leitura ────────────────────────────────────────
const readingMinutes = computed(() => {
    const raw = String(article.value?.body || '');
    if (!raw.trim()) return 0;
    // Tira embeds @[X:y] e símbolos de markdown antes de contar palavras
    const clean = raw
        .replace(/@\[[A-Z_]+:[^\]]+\]/g, ' ')
        .replace(/[*_#>()`\[\]]/g, ' ');
    const words = clean.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
});

// ── Copiar link do artigo ────────────────────────────────────────────
const copied = ref(false);
async function copyLink() {
    const url = window.location.href;
    try {
        await navigator.clipboard.writeText(url);
        copied.value = true;
        setTimeout(() => { copied.value = false; }, 2000);
    } catch {
        window.prompt('Copie o link:', url);
    }
}

// ── Estrutura "Nesta página" — extraída do DOM já renderizado ────────
const proseRef = ref(null);
const outline = ref([]);

async function extractOutline() {
    await nextTick();
    if (!proseRef.value) {
        outline.value = [];
        return;
    }
    const headings = proseRef.value.querySelectorAll('h1, h2, h3');
    outline.value = Array.from(headings)
        .map((h) => ({
            level: Number(h.tagName.replace('H', '')),
            text: (h.textContent || '').trim(),
            id: h.id || '',
        }))
        .filter((o) => o.id && o.text);
}

function scrollToHeading(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Backlinks ("Mencionado em") ──────────────────────────────────────
const backlinks = ref([]);

async function loadBacklinks() {
    const a = article.value;
    if (!a?.slug || !a?.categorySlug) {
        backlinks.value = [];
        return;
    }
    try {
        const data = await requestWithAuth(
            `/academy/kb/articles/${encodeURIComponent(a.categorySlug)}/${encodeURIComponent(a.slug)}/backlinks`
        );
        backlinks.value = Array.isArray(data?.backlinks) ? data.backlinks : [];
    } catch {
        backlinks.value = [];
    }
}

function openBacklink(b) {
    router.push({
        name: 'AcademyKBArticle',
        params: { categorySlug: b.categorySlug, articleSlug: b.slug },
    });
}

async function load() {
    await store.fetchArticle({
        categorySlug: categorySlug.value,
        articleSlug: articleSlug.value,
        audience: 'BOTH',
    });
    await loadRating();
}

// Quando o artigo troca: recarrega rating + backlinks + outline (após o render).
watch(() => article.value?.id, (id) => {
    if (!id) {
        outline.value = [];
        backlinks.value = [];
        return;
    }
    loadRating();
    loadBacklinks();
    nextTick(() => setTimeout(extractOutline, 150));
});

onMounted(load);
</script>

<style scoped>
/* Esconde o triângulo nativo do <details> */
.article-toc summary::-webkit-details-marker {
    display: none;
}

/* Rotaciona a seta quando o <details> está aberto */
.toc-chev {
    transition: transform .15s ease;
}

.article-toc[open]>summary .toc-chev {
    transform: rotate(180deg);
}
</style>
