<template>
    <div class="space-y-4">
        <AcademyPageHeader :title="title" subtitle="Base de Conhecimento" :breadcrumbs="breadcrumbs" :backTo="backTo">
            <template #actions>
                <div class="flex items-center gap-2">
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                        @click="goBack">
                        Voltar
                    </button>

                    <button
                        class="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white transition-all active:scale-95"
                        @click="router.push({ name: 'AcademyKBEditor' })">
                        Novo artigo
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div v-if="store.article.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400 transition-colors">
            {{ store.article.error }}
        </div>

        <div
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors overflow-hidden">
            <div class="p-4 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-start justify-between gap-4">
                    <div class="flex  justify-between w-full space-y-2">
                        <div>
                            <h1 class="truncate text-2xl font-semibold ps-2 text-slate-900 dark:text-slate-100">
                                {{ article?.title || 'Artigo' }}
                            </h1>

                            <!-- Categoria / Slug -->
                            <div class="flex items-center gap-2 text-xs h-full text-slate-500 dark:text-slate-400">
                                <span
                                    class="flex items-center mb-4 rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-slate-50/60 dark:bg-slate-800/30 font-mono">
                                    {{ article?.categorySlug || categorySlug }}
                                </span>

                                <span v-if="article?.slug"
                                    class="flex items-center mb-4 rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900 font-mono">
                                    {{ article.slug }}
                                </span>
                            </div>

                        </div>
                        <!-- Metadados -->
                        <div v-if="article" class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <!-- Última edição -->
                            <div v-if="article?.updatedBy?.username"
                                class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 px-3 py-2">
                                <div class="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                    Última edição
                                </div>
                                <div class="mt-0.5 text-xs text-slate-700 dark:text-slate-200">
                                    <span class="font-medium">
                                        {{ article?.updatedBy?.username }}
                                    </span>
                                    <span class="mx-1 text-slate-400">•</span>
                                    <span v-if="article.updatedAt">
                                        {{ fmtDate(article.updatedAt) }}.
                                    </span>
                                </div>
                            </div>

                            <!-- Criado -->
                            <div v-if="article?.createdBy?.username"
                                class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 px-3 py-2">
                                <div class="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                    Criado por
                                </div>
                                <div class="mt-0.5 text-xs text-slate-700 dark:text-slate-200">
                                    <button v-if="article?.createdBy?.id" type="button"
                                        class="text-xs font-medium text-slate-700 dark:text-slate-200 hover:underline"
                                        @click="router.push({ name: 'AcademyUserProfile', params: { id: article.createdBy.id } })">
                                        {{ article.createdBy.username }}
                                    </button>

                                    <span v-else class="text-xs text-slate-500 dark:text-slate-400">—</span>

                                    <span class="mx-1 text-slate-400">•</span>
                                    <span v-if="article.updatedAt">
                                        {{ fmtDate(article.createdAt) }}.
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    <span v-if="store.article.loaded && !article"
                        class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Não encontrado
                    </span>
                </div>
            </div>


            <div class="p-5">
                <div v-if="!store.article.loaded" class="text-sm text-slate-500 dark:text-slate-400">
                    Carregando...
                </div>

                <div v-else-if="!article" class="text-sm text-slate-500 dark:text-slate-400">
                    Artigo não encontrado ou indisponível para seu perfil.
                </div>

                <div v-else class="prose prose-slate dark:prose-invert max-w-none">
                    <TokenRenderer :content="article.body || ''" :payload="article.payload || null" item-type=""
                        item-key="" />
                </div>
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-4">
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors active:scale-95"
                    @click="goBack">
                    <i class="fas fa-chevron-left"></i> Voltar para lista
                </button>

            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyKbStore } from '@/stores/Academy/academyKbStore';
import TokenRenderer from '@/views/Academy/components/TokenRenderer.vue';

const route = useRoute();
const router = useRouter();
const store = useAcademyKbStore();

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

async function load() {
    await store.fetchArticle({
        categorySlug: categorySlug.value,
        articleSlug: articleSlug.value,
        audience: 'BOTH',
    });
}

onMounted(load);
</script>
