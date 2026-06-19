<template>
    <div :style="accentVars">
        <!-- Barra de progresso de leitura -->
        <div class="kb-progress" aria-hidden="true">
            <div class="kb-progress__bar" :style="{ width: progress + '%' }"></div>
        </div>

        <div class="mx-auto max-w-4xl space-y-5 pb-12 xl:max-w-[68rem]">
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

            <div class="xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-8">
                <!-- ───────────── Coluna principal ───────────── -->
                <div class="min-w-0 space-y-5">
                    <article ref="articleRef"
                        class="kb-card animate-slide-up overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_24px_-12px_rgb(15_23_42_/_0.18)] dark:border-slate-800 dark:bg-slate-900">
                        <!-- Hero -->
                        <header class="kb-hero relative overflow-hidden px-6 py-8 sm:px-10 sm:py-11">
                            <div class="relative">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="kb-chip kb-chip--accent">
                                        <i class="fa-regular fa-folder-open text-[10px]"></i>
                                        {{ article?.categorySlug || categorySlug }}
                                    </span>
                                    <span v-if="readingMinutes" class="kb-chip">
                                        <i class="fa-regular fa-clock text-[10px]"></i>
                                        {{ readingMinutes }} min de leitura
                                    </span>
                                    <span v-if="article?.slug" class="kb-chip font-mono lowercase">
                                        {{ article.slug }}
                                    </span>
                                    <span v-if="store.article.loaded && !article" class="kb-chip">
                                        Não encontrado
                                    </span>
                                </div>

                                <h1 class="kb-title mt-4">{{ article?.title || 'Artigo' }}</h1>

                                <!-- Autoria -->
                                <div v-if="article"
                                    class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                                    <div class="flex items-center gap-2.5">
                                        <span class="kb-avatar">{{ authorInitials }}</span>
                                        <span>
                                            <span class="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Criado por</span>
                                            <button v-if="article?.createdBy?.id" type="button"
                                                class="font-semibold text-slate-700 transition hover:text-[rgb(var(--art))] dark:text-slate-200"
                                                @click="router.push({ name: 'AcademyUserProfile', params: { id: article.createdBy.id } })">
                                                {{ article.createdBy.username }}
                                            </button>
                                            <span v-else class="font-semibold text-slate-700 dark:text-slate-200">Equipe Menin</span>
                                        </span>
                                    </div>

                                    <span class="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block"></span>

                                    <div v-if="article?.updatedAt">
                                        <span class="block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                            Atualizado
                                        </span>
                                        <span class="font-medium text-slate-600 dark:text-slate-300">
                                            {{ fmtDate(article.updatedAt) }}
                                            <template v-if="article?.updatedBy?.username">· {{ article.updatedBy.username }}</template>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <!-- TOC inline (telas menores) -->
                        <details v-if="outline.length >= 2" open
                            class="article-toc border-y border-slate-100 px-6 py-3 dark:border-slate-800 xl:hidden">
                            <summary class="flex cursor-pointer list-none items-center justify-between">
                                <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    <i class="fa-solid fa-list-ul text-[rgb(var(--art))]"></i>
                                    Nesta página
                                    <span class="font-normal text-slate-400 dark:text-slate-500">({{ outline.length }})</span>
                                </span>
                                <i class="fa-solid fa-chevron-down toc-chev text-xs text-slate-400"></i>
                            </summary>
                            <ul class="mt-3 space-y-0.5">
                                <li v-for="o in outline" :key="o.id">
                                    <button type="button" @click="scrollToHeading(o.id)"
                                        class="flex w-full items-start gap-1.5 rounded-md py-1 text-left text-sm text-slate-600 transition hover:text-[rgb(var(--art))] dark:text-slate-300"
                                        :class="o.level === 1 ? 'pl-1 font-semibold' : o.level === 2 ? 'pl-4' : 'pl-9 text-xs'">
                                        <span>{{ o.text }}</span>
                                    </button>
                                </li>
                            </ul>
                        </details>

                        <!-- Corpo -->
                        <div class="px-6 py-8 sm:px-10">
                            <div v-if="!store.article.loaded"
                                class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <i class="fa-solid fa-spinner fa-spin text-[rgb(var(--art))]"></i>
                                Carregando...
                            </div>

                            <div v-else-if="!article" class="text-sm text-slate-500 dark:text-slate-400">
                                Artigo não encontrado ou indisponível para seu perfil.
                            </div>

                            <div v-else ref="proseRef" class="kb-reading">
                                <TokenRenderer :content="renderBody" :payload="article.payload || null"
                                    item-type="" item-key="" />
                            </div>
                        </div>

                        <!-- Avaliação do artigo (S4.2) -->
                        <div v-if="article" class="px-6 pb-6 sm:px-10">
                            <div class="kb-feedback rounded-2xl p-4 sm:p-5">
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

                                <!-- Justificativa (opcional) — aparece depois de dar a nota -->
                                <div v-if="myStars > 0"
                                    class="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                    <label class="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Justificativa
                                        <span class="font-normal text-slate-400 dark:text-slate-500">
                                            (opcional — visível apenas para o autor do artigo e administradores)
                                        </span>
                                    </label>
                                    <textarea v-model="myComment" rows="2" placeholder="Conte por que você deu essa nota…"
                                        class="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-[rgb(var(--art))] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--art)/0.12)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"></textarea>
                                    <div class="mt-2 flex items-center justify-end gap-3">
                                        <span v-if="justifySaved" class="text-xs text-emerald-600 dark:text-emerald-400">
                                            <i class="fa-solid fa-check mr-1"></i>Justificativa salva
                                        </span>
                                        <button type="button" :disabled="justifySaving" @click="saveJustification"
                                            class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-slate-900">
                                            {{ justifySaving ? 'Salvando…' : 'Salvar justificativa' }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Justificativas das avaliações — só autor do artigo + admin -->
                        <div v-if="article && canSeeJustifications"
                            class="border-t border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-10">
                            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                <i class="fa-solid fa-comment-dots text-[rgb(var(--art))]"></i>
                                Justificativas das avaliações
                                <span class="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                                    ({{ justifications.length }})
                                </span>
                            </h3>
                            <p v-if="!justifications.length" class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                Ainda não há justificativas nas notas deste artigo.
                            </p>
                            <ul v-else class="mt-3 space-y-2">
                                <li v-for="j in justifications" :key="j.id"
                                    class="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                    {{ j.user?.username || 'Usuário' }}
                                                </span>
                                                <StarRating :model-value="Number(j.stars || 0)" readonly size="sm" />
                                            </div>
                                            <p class="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
                                                {{ j.comment }}
                                            </p>
                                            <div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                                {{ fmtDate(j.updatedAt) }}
                                            </div>
                                        </div>
                                        <button v-if="isAdmin" type="button" @click="removeJustification(j.id)"
                                            title="Remover avaliação (admin)"
                                            class="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                                            <i class="fa-solid fa-trash text-xs"></i>
                                        </button>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <!-- Mencionado em (backlinks) -->
                        <div v-if="article && backlinks.length"
                            class="border-t border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-10">
                            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                <i class="fa-solid fa-link text-[rgb(var(--art))]"></i>
                                Mencionado em
                                <span class="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                                    ({{ backlinks.length }})
                                </span>
                            </h3>
                            <ul class="mt-3 grid gap-2 sm:grid-cols-2">
                                <li v-for="b in backlinks" :key="`${b.categorySlug}/${b.slug}`">
                                    <button type="button" @click="openBacklink(b)"
                                        class="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[rgb(var(--art)/0.5)] hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                                        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--art)/0.12)] text-[rgb(var(--art))]">
                                            <i class="fa-solid fa-file-lines"></i>
                                        </span>
                                        <span class="min-w-0 flex-1">
                                            <span class="block truncate text-sm font-medium text-slate-900 transition-colors group-hover:text-[rgb(var(--art))] dark:text-slate-100">
                                                {{ b.title }}
                                            </span>
                                            <span class="text-xs text-slate-500 dark:text-slate-400">{{ b.categorySlug }}</span>
                                        </span>
                                        <i class="fa-solid fa-arrow-up-right-from-square text-xs text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--art))] dark:text-slate-600"></i>
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div class="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-10">
                            <button type="button" @click="goBack"
                                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                                Voltar para lista
                            </button>

                            <button type="button" @click="scrollToTop"
                                class="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:text-[rgb(var(--art))] dark:text-slate-400">
                                <i class="fa-solid fa-arrow-up text-[10px]"></i>
                                Topo
                            </button>
                        </div>
                    </article>

                    <!-- Comentários (S4.1) -->
                    <CommentThread v-if="article?.id" :article-id="article.id" :current-user-id="currentUserId"
                        :is-admin="isAdmin" />
                </div>

                <!-- ───────────── TOC fixa (desktop) ───────────── -->
                <aside v-if="outline.length" class="hidden xl:block">
                    <div class="sticky top-6">
                        <div class="kb-toc">
                            <div class="kb-toc__title">
                                <i class="fa-solid fa-list-ul mr-1.5 text-[rgb(var(--art))]"></i>
                                Nesta página
                            </div>
                            <ul class="mt-1 space-y-0.5">
                                <li v-for="o in outline" :key="o.id">
                                    <button type="button" @click="scrollToHeading(o.id)"
                                        class="kb-toc__link"
                                        :class="[`lvl-${o.level}`, { 'is-active': activeId === o.id }]">
                                        {{ o.text }}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, watch, ref } from 'vue';
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

// Remove um H1 inicial que apenas repete o título (o hero já o exibe). Só
// remove se a primeira linha de conteúdo for "# <título>" idêntico — assim um
// "# Objetivo" legítimo (que NÃO é o título) é preservado.
const renderBody = computed(() => {
    const b = String(article.value?.body || '');
    const t = String(article.value?.title || '').trim().toLowerCase();
    if (!b || !t) return b;
    const lines = b.split('\n');
    const idx = lines.findIndex((l) => l.trim().length);
    if (idx >= 0) {
        const hm = lines[idx].trim().match(/^#\s+(.+?)\s*#*\s*$/);
        if (hm && hm[1].trim().toLowerCase() === t) {
            lines.splice(idx, 1);
            return lines.join('\n').replace(/^\n+/, '');
        }
    }
    return b;
});

// ── Acento por categoria (cada seção ganha sua cor) ──────────────────
const ACCENTS = [
    { a: '99 102 241', b: '139 92 246' },   // indigo → violet
    { a: '14 165 233', b: '6 182 212' },    // sky → cyan
    { a: '217 119 6', b: '234 88 12' },     // amber → orange
    { a: '225 29 72', b: '244 63 94' },     // rose
    { a: '13 148 136', b: '16 185 129' },   // teal → emerald
    { a: '124 58 237', b: '168 85 247' },   // violet → purple
];
// Acentos fixos por categoria (vencem o hash). Sienge = vermelho, combinando com
// as caixas/realces vermelhos dos prints das telas.
const ACCENT_OVERRIDES = {
    sienge: { a: '220 38 38', b: '239 68 68' }, // red-600 → red-500
};
function accentFor(slug) {
    const s = String(slug || 'kb').toLowerCase();
    if (ACCENT_OVERRIDES[s]) return ACCENT_OVERRIDES[s];
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return ACCENTS[h % ACCENTS.length];
}
const accent = computed(() => accentFor(article.value?.categorySlug || categorySlug.value));
const accentVars = computed(() => ({ '--art': accent.value.a, '--art2': accent.value.b }));

const authorInitials = computed(() => {
    const name = article.value?.createdBy?.username || 'Menin';
    return String(name).trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
});

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
    return d.toLocaleString('pt-BR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
}

function goBack() {
    router.push(backTo.value);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Rating (S4.2) ────────────────────────────────────────────────────
const ratingStats = computed(() =>
    article.value?.id ? ratingsStore.statsFor('ARTICLE', article.value.id) : null
);
const ratingAvg = computed(() => Number(ratingStats.value?.avg || 0));
const ratingTotal = computed(() => Number(ratingStats.value?.total || 0));
const myStars = ref(0);
const myComment = ref('');
const justifySaving = ref(false);
const justifySaved = ref(false);

// Justificativas só são visíveis para o autor do artigo e admins.
const canSeeJustifications = computed(() => {
    if (isAdmin.value) return true;
    const authorId = article.value?.createdBy?.id;
    return currentUserId.value != null && Number(authorId) === Number(currentUserId.value);
});
const justifications = ref([]);

async function onRate(stars) {
    if (!article.value?.id) return;
    myStars.value = stars;
    justifySaved.value = false;
    // Mantém a justificativa atual ao trocar a nota.
    await ratingsStore.rate('ARTICLE', article.value.id, { stars, comment: myComment.value.trim() || null });
    loadJustifications();
}

async function saveJustification() {
    if (!article.value?.id || !myStars.value) return;
    justifySaving.value = true;
    try {
        await ratingsStore.rate('ARTICLE', article.value.id, {
            stars: myStars.value,
            comment: myComment.value.trim() || null,
        });
        justifySaved.value = true;
        setTimeout(() => { justifySaved.value = false; }, 2500);
        loadJustifications();
    } catch { /* erro fica no store */ } finally {
        justifySaving.value = false;
    }
}

async function loadRating() {
    if (!article.value?.id) return;
    const stats = await ratingsStore.fetchStats('ARTICLE', article.value.id);
    if (stats?.myRating?.stars) myStars.value = stats.myRating.stars;
    myComment.value = stats?.myRating?.comment || '';
}

async function loadJustifications() {
    if (!article.value?.id || !canSeeJustifications.value) {
        justifications.value = [];
        return;
    }
    const data = await ratingsStore.fetchArticleJustifications(article.value.id);
    justifications.value = data.results || [];
}

async function removeJustification(ratingId) {
    if (!ratingId) return;
    if (!window.confirm('Remover esta avaliação (nota + justificativa)?')) return;
    await ratingsStore.adminRemoveRating(ratingId);
    await loadJustifications();
    if (article.value?.id) await ratingsStore.fetchStats('ARTICLE', article.value.id);
}

// ── Tempo estimado de leitura ────────────────────────────────────────
const readingMinutes = computed(() => {
    const raw = String(article.value?.body || '');
    if (!raw.trim()) return 0;
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

// ── Estrutura "Nesta página" + seção ativa ───────────────────────────
const proseRef = ref(null);
const articleRef = ref(null);
const outline = ref([]);
const activeId = ref('');
let headingObserver = null;

async function extractOutline() {
    await nextTick();
    if (!proseRef.value) {
        outline.value = [];
        return;
    }
    const headings = proseRef.value.querySelectorAll('h1, h2, h3');
    outline.value = Array.from(headings)
        // pula títulos escondidos (ex.: o H1 duplicado do corpo)
        .filter((h) => h.offsetParent !== null)
        .map((h) => ({
            level: Number(h.tagName.replace('H', '')),
            text: (h.textContent || '').trim(),
            id: h.id || '',
        }))
        .filter((o) => o.id && o.text);

    if (outline.value.length) activeId.value = outline.value[0].id;
    setupHeadingObserver();
}

function setupHeadingObserver() {
    if (headingObserver) { headingObserver.disconnect(); headingObserver = null; }
    if (!proseRef.value) return;
    const heads = Array.from(proseRef.value.querySelectorAll('h1, h2, h3'))
        .filter((h) => h.id && h.offsetParent !== null);
    if (!heads.length) return;

    headingObserver = new IntersectionObserver((entries) => {
        const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) activeId.value = visible[0].target.id;
    }, { rootMargin: '-88px 0px -65% 0px', threshold: 0 });

    heads.forEach((h) => headingObserver.observe(h));
}

function scrollToHeading(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    activeId.value = id;
}

// ── Barra de progresso de leitura ────────────────────────────────────
const progress = ref(0);
let rafPending = false;
function computeProgress() {
    rafPending = false;
    const el = articleRef.value;
    if (!el) { progress.value = 0; return; }
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const total = rect.height - vh;
    if (total <= 0) { progress.value = rect.top <= 0 ? 100 : 0; return; }
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    progress.value = Math.round((scrolled / total) * 100);
}
function onScroll() {
    if (!rafPending) { rafPending = true; requestAnimationFrame(computeProgress); }
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
    });
    await loadRating();
}

// Quando o artigo troca: recarrega rating + backlinks + outline (após o render).
watch(() => article.value?.id, (id) => {
    if (!id) {
        outline.value = [];
        backlinks.value = [];
        justifications.value = [];
        return;
    }
    loadRating();
    loadBacklinks();
    loadJustifications();
    nextTick(() => setTimeout(() => { extractOutline(); computeProgress(); }, 150));
});

// Navegar entre artigos (backlinks "Mencionado em" e cross-links) muda apenas
// os params da rota — o componente é reaproveitado e o onMounted NÃO re-dispara.
// Por isso recarregamos o artigo aqui e voltamos ao topo do scroll.
watch(() => [route.params.categorySlug, route.params.articleSlug], () => {
    load().then(() => {
        nextTick(() => {
            const scroller = articleRef.value?.closest('.overflow-y-auto');
            if (scroller) scroller.scrollTo({ top: 0 });
            else window.scrollTo({ top: 0 });
        });
    });
});

onMounted(() => {
    load();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
});

onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (headingObserver) headingObserver.disconnect();
});
</script>

<style scoped>
/* ── Barra de progresso ─────────────────────────────────────────────── */
.kb-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 60;
    background: transparent;
    pointer-events: none;
}

.kb-progress__bar {
    height: 100%;
    width: 0;
    background: linear-gradient(90deg, rgb(var(--art)), rgb(var(--art2)));
    box-shadow: 0 0 10px rgb(var(--art) / 0.55);
    transition: width .1s linear;
}

/* ── Hero ───────────────────────────────────────────────────────────── */
.kb-hero {
    background:
        radial-gradient(130% 120% at 0% 0%, rgb(var(--art) / 0.14), transparent 55%),
        radial-gradient(120% 120% at 100% 0%, rgb(var(--art2) / 0.12), transparent 52%);
}

.kb-hero::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgb(15 23 42 / 0.05) 1px, transparent 1px);
    background-size: 22px 22px;
    -webkit-mask-image: linear-gradient(to bottom, black, transparent 85%);
    mask-image: linear-gradient(to bottom, black, transparent 85%);
    opacity: .6;
    pointer-events: none;
}

:global(.dark) .kb-hero::after {
    background-image: radial-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px);
}

.kb-title {
    font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
    font-optical-sizing: auto;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.07;
    font-size: clamp(1.95rem, 1.2rem + 2.6vw, 3rem);
    color: rgb(15 23 42);
    text-wrap: balance;
}

:global(.dark) .kb-title {
    color: rgb(241 245 249);
}

/* ── Chips ──────────────────────────────────────────────────────────── */
.kb-chip {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    border-radius: 9999px;
    padding: .3rem .7rem;
    font-size: .72rem;
    font-weight: 600;
    letter-spacing: .01em;
    color: rgb(71 85 105);
    background: rgb(255 255 255 / .65);
    border: 1px solid rgb(226 232 240);
    backdrop-filter: blur(4px);
}

:global(.dark) .kb-chip {
    color: rgb(148 163 184);
    background: rgb(15 23 42 / .5);
    border-color: rgb(51 65 85);
}

.kb-chip--accent {
    color: rgb(var(--art));
    background: rgb(var(--art) / 0.12);
    border-color: rgb(var(--art) / 0.28);
}

:global(.dark) .kb-chip--accent {
    color: rgb(var(--art2));
    background: rgb(var(--art) / 0.18);
    border-color: rgb(var(--art) / 0.35);
}

/* ── Avatar do autor ────────────────────────────────────────────────── */
.kb-avatar {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    color: #fff;
    font-weight: 700;
    font-size: .8rem;
    background: linear-gradient(135deg, rgb(var(--art)), rgb(var(--art2)));
    box-shadow: 0 0 0 3px rgb(var(--art) / 0.15);
}

/* ── Painel de feedback (avaliação) ─────────────────────────────────── */
.kb-feedback {
    background: rgb(var(--art) / 0.05);
    border: 1px solid rgb(var(--art) / 0.16);
}

:global(.dark) .kb-feedback {
    background: rgb(var(--art) / 0.10);
    border-color: rgb(var(--art) / 0.22);
}

/* ── TOC fixa ───────────────────────────────────────────────────────── */
.kb-toc {
    border: 1px solid rgb(226 232 240);
    border-radius: 1rem;
    background: rgb(255 255 255 / .7);
    backdrop-filter: blur(6px);
    padding: .85rem;
    max-height: calc(100vh - 8rem);
    overflow-y: auto;
}

:global(.dark) .kb-toc {
    border-color: rgb(30 41 59);
    background: rgb(15 23 42 / .6);
}

.kb-toc__title {
    font-size: .68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .09em;
    color: rgb(100 116 139);
    padding: .3rem .5rem .35rem;
}

.kb-toc__link {
    display: block;
    width: 100%;
    text-align: left;
    border-radius: .55rem;
    padding: .38rem .6rem;
    font-size: .82rem;
    line-height: 1.35;
    color: rgb(100 116 139);
    border-left: 2px solid transparent;
    transition: color .15s ease, background-color .15s ease, border-color .15s ease;
}

.kb-toc__link:hover {
    color: rgb(15 23 42);
    background: rgb(var(--art) / 0.07);
}

:global(.dark) .kb-toc__link {
    color: rgb(148 163 184);
}

:global(.dark) .kb-toc__link:hover {
    color: rgb(241 245 249);
}

.kb-toc__link.lvl-3 {
    padding-left: 1.35rem;
    font-size: .78rem;
}

.kb-toc__link.is-active {
    color: rgb(var(--art));
    background: rgb(var(--art) / 0.10);
    border-left-color: rgb(var(--art));
    font-weight: 600;
}

:global(.dark) .kb-toc__link.is-active {
    color: rgb(var(--art2));
}

/* TOC inline (mobile) — esconder marcador nativo + girar seta */
.article-toc summary::-webkit-details-marker {
    display: none;
}

.toc-chev {
    transition: transform .15s ease;
}

.article-toc[open]>summary .toc-chev {
    transform: rotate(180deg);
}

/* ───────────────────────────────────────────────────────────────────────
   TEMA DE LEITURA — aplicado só ao corpo do artigo (.kb-reading), via :deep
   para alcançar o markdown renderizado pelo TokenRenderer sem afetar trilhas.
   ─────────────────────────────────────────────────────────────────────── */
.kb-reading {
    font-size: 1.075rem;
    line-height: 1.85;
    color: rgb(51 65 85);
    max-width: 72ch;
}

:global(.dark) .kb-reading {
    color: rgb(203 213 225);
}

/* Sobrescreve as utilitárias (text-sm / leading-7 / text-slate-700) que o
   TokenRenderer aplica no .markdown — senão o corpo ficaria pequeno. */
.kb-reading :deep(.markdown) {
    font-size: 1.075rem;
    line-height: 1.85;
    color: rgb(51 65 85);
}

:global(.dark) .kb-reading :deep(.markdown) {
    color: rgb(203 213 225);
}

/* Parágrafos */
.kb-reading :deep(.markdown p) {
    margin: 1.15rem 0;
}

/* Títulos */
.kb-reading :deep(.markdown h1),
.kb-reading :deep(.markdown h2),
.kb-reading :deep(.markdown h3) {
    font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
    font-optical-sizing: auto;
    letter-spacing: -0.012em;
    color: rgb(15 23 42);
    scroll-margin-top: 6rem;
    text-wrap: balance;
}

:global(.dark) .kb-reading :deep(.markdown h1),
:global(.dark) .kb-reading :deep(.markdown h2),
:global(.dark) .kb-reading :deep(.markdown h3) {
    color: rgb(241 245 249);
}

.kb-reading :deep(.markdown h2) {
    font-size: 1.55rem;
    font-weight: 600;
    line-height: 1.25;
    margin: 2.75rem 0 1.05rem;
    padding-top: 1.7rem;
    border-top: 1px solid rgb(226 232 240);
}

:global(.dark) .kb-reading :deep(.markdown h2) {
    border-top-color: rgb(30 41 59);
}

.kb-reading :deep(.markdown h2)::before {
    content: "";
    display: inline-block;
    width: .7rem;
    height: .7rem;
    margin-right: .6rem;
    border-radius: .22rem;
    vertical-align: middle;
    transform: translateY(-.1em);
    background: linear-gradient(135deg, rgb(var(--art)), rgb(var(--art2)));
}

.kb-reading :deep(.markdown h3) {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 1.9rem 0 .7rem;
}

/* Ênfase */
.kb-reading :deep(.markdown strong) {
    font-weight: 700;
    color: rgb(15 23 42);
}

:global(.dark) .kb-reading :deep(.markdown strong) {
    color: rgb(241 245 249);
}

/* Listas */
.kb-reading :deep(.markdown ul) {
    list-style: none;
    padding-left: 0;
    margin: 1.15rem 0;
}

.kb-reading :deep(.markdown ul li) {
    position: relative;
    padding-left: 1.6rem;
    margin: .5rem 0;
}

.kb-reading :deep(.markdown ul li)::before {
    content: "";
    position: absolute;
    left: .25rem;
    top: .72em;
    width: .45rem;
    height: .45rem;
    border-radius: 9999px;
    background: rgb(var(--art));
}

.kb-reading :deep(.markdown ol) {
    padding-left: 1.4rem;
    margin: 1.15rem 0;
}

.kb-reading :deep(.markdown ol li) {
    margin: .5rem 0;
    padding-left: .3rem;
}

.kb-reading :deep(.markdown ol li::marker) {
    color: rgb(var(--art));
    font-weight: 700;
}

/* Callout (blockquote) */
.kb-reading :deep(.markdown blockquote) {
    margin: 1.6rem 0;
    padding: 1rem 1.25rem;
    border: 0;
    border-left: 3px solid rgb(var(--art));
    background: rgb(var(--art) / 0.07);
    border-radius: 0 .9rem .9rem 0;
    color: rgb(30 41 59);
}

:global(.dark) .kb-reading :deep(.markdown blockquote) {
    background: rgb(var(--art) / 0.13);
    color: rgb(226 232 240);
}

.kb-reading :deep(.markdown blockquote p) {
    margin: .4rem 0;
}

/* Tabelas */
.kb-reading :deep(.markdown table) {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 1.7rem 0;
    font-size: .96rem;
    border: 1px solid rgb(226 232 240);
    border-radius: .9rem;
    overflow: hidden;
}

:global(.dark) .kb-reading :deep(.markdown table) {
    border-color: rgb(30 41 59);
}

.kb-reading :deep(.markdown thead th) {
    background: rgb(var(--art) / 0.10);
    color: rgb(15 23 42);
    font-weight: 600;
    text-align: left;
    padding: .7rem .9rem;
    border-bottom: 1px solid rgb(226 232 240);
}

:global(.dark) .kb-reading :deep(.markdown thead th) {
    color: rgb(241 245 249);
    border-bottom-color: rgb(30 41 59);
}

.kb-reading :deep(.markdown tbody td) {
    padding: .7rem .9rem;
    border-bottom: 1px solid rgb(241 245 249);
    vertical-align: top;
}

:global(.dark) .kb-reading :deep(.markdown tbody td) {
    border-bottom-color: rgb(30 41 59);
}

.kb-reading :deep(.markdown tbody tr:nth-child(even)) {
    background: rgb(248 250 252 / 0.7);
}

:global(.dark) .kb-reading :deep(.markdown tbody tr:nth-child(even)) {
    background: rgb(15 23 42 / 0.4);
}

.kb-reading :deep(.markdown tbody tr:last-child td) {
    border-bottom: 0;
}

/* Código */
.kb-reading :deep(.markdown code) {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: .85em;
    padding: .14rem .42rem;
    border-radius: .4rem;
    background: rgb(var(--art) / 0.10);
    border: 1px solid rgb(var(--art) / 0.16);
    color: rgb(15 23 42);
}

:global(.dark) .kb-reading :deep(.markdown code) {
    color: rgb(226 232 240);
}

.kb-reading :deep(.markdown pre) {
    margin: 1.5rem 0;
    padding: 1rem 1.15rem;
    border-radius: .9rem;
    overflow: auto;
    background: rgb(15 23 42);
    border: 1px solid rgb(51 65 85);
    color: rgb(226 232 240);
    font-size: .9rem;
    line-height: 1.6;
}

.kb-reading :deep(.markdown pre code) {
    background: transparent;
    border: 0;
    padding: 0;
    color: inherit;
}

/* Links externos (os internos .kb-link já têm estilo global emerald) */
.kb-reading :deep(.markdown a:not(.kb-link)) {
    color: rgb(var(--art));
    font-weight: 500;
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
}

/* Divisor */
.kb-reading :deep(.markdown hr) {
    border: 0;
    height: 1px;
    margin: 2.3rem 0;
    background: linear-gradient(90deg, transparent, rgb(203 213 225), transparent);
}

:global(.dark) .kb-reading :deep(.markdown hr) {
    background: linear-gradient(90deg, transparent, rgb(51 65 85), transparent);
}

/* Imagens */
.kb-reading :deep(.markdown img) {
    max-width: 100%;
    border-radius: .9rem;
    border: 1px solid rgb(226 232 240);
    box-shadow: 0 4px 14px -6px rgb(15 23 42 / 0.18);
    margin: 1.5rem 0;
}

:global(.dark) .kb-reading :deep(.markdown img) {
    border-color: rgb(30 41 59);
}
</style>
