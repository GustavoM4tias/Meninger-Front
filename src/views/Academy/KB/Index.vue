<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Base de Conhecimento" subtitle="Artigos, processos e padrões"
            :backTo="{ name: 'AcademyPanel' }" :breadcrumbs="breadcrumbs">
            <template #actions>
                <div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <div class="relative w-full md:w-80">
                        <input v-model="qLocal" :placeholder="searchPlaceholder" @keyup.enter="applySearch"
                            class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-11 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                        <button type="button" @click="applySearch" aria-label="Buscar"
                            class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700">
                            <i class="fa-solid fa-magnifying-glass text-sm"></i>
                        </button>
                    </div>

                    <button type="button" @click="router.push({ name: 'AcademyKBArticles' })"
                        class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                        <i class="fa-regular fa-user"></i>
                        Meus artigos
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div v-if="kb.list.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ kb.list.error }}
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <aside class="lg:col-span-3">
                <div
                    class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-folder-tree text-indigo-500"></i>
                            Categorias
                        </h2>
                        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Filtre por área</p>
                    </div>

                    <div class="flex flex-col gap-1 p-2">
                        <button type="button" @click="setCategory('')"
                            class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors"
                            :class="!categorySlug
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'">
                            <i class="fa-solid fa-layer-group text-xs opacity-70"></i>
                            Todas
                        </button>

                        <template v-for="c in kb.categories" :key="c.slug">
                            <button type="button" @click="setCategory(c.slug)"
                                class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors"
                                :class="categorySlug === c.slug && !subcategorySlug
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'">
                                <i class="fa-regular fa-folder text-xs opacity-70"></i>
                                <span class="flex-1">{{ c.name }}</span>
                                <span v-if="c.count" class="text-[10px] font-normal opacity-60">{{ c.count }}</span>
                            </button>

                            <button v-for="s in c.subcategories" :key="c.slug + '/' + s.slug" type="button"
                                @click="setSubcategory(c.slug, s.slug)"
                                class="ml-4 flex items-center gap-2 rounded-xl px-3 py-1.5 text-left text-[13px] font-medium transition-colors"
                                :class="categorySlug === c.slug && subcategorySlug === s.slug
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'">
                                <i class="fa-solid fa-angle-right text-[10px] opacity-50"></i>
                                <span class="flex-1">{{ s.name }}</span>
                                <span class="text-[10px] font-normal opacity-60">{{ s.count }}</span>
                            </button>
                        </template>
                    </div>
                </div>
            </aside>

            <main class="lg:col-span-9">
                <div
                    class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <div
                        class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                                <i class="fa-solid fa-book text-emerald-500"></i>
                                Artigos
                            </h2>
                            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                {{ kb.list.total }} resultados
                                <span v-if="activeCategory">• {{ activeCategory.name }}</span>
                                <span v-if="activeSub" class="text-indigo-500 dark:text-indigo-400">› {{ activeSub.name }}</span>
                                <span v-if="q">• busca: "{{ q }}"</span>
                            </p>
                        </div>

                        <button type="button" @click="router.push({ name: 'AcademyKBEditor' })"
                            class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 active:scale-95">
                            <i class="fa-solid fa-plus text-xs"></i>
                            Novo artigo
                        </button>
                    </div>

                    <div class="p-2">
                        <ul v-if="kb.list.results?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <li v-for="a in kb.list.results" :key="a.id" @click="openArticle(a)"
                                class="group cursor-pointer rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex min-w-0 gap-3">
                                        <span
                                            class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                                            <i class="fa-solid fa-file-lines"></i>
                                        </span>
                                        <div class="min-w-0">
                                            <p
                                                class="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                                                {{ a.title }}
                                            </p>

                                            <div
                                                class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <span
                                                    class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                                    {{ a.categorySlug }}
                                                </span>
                                                <span class="inline-flex items-center gap-1">
                                                    <i class="fa-regular fa-user text-[10px]"></i>
                                                    {{ a.createdBy?.username || '—' }}
                                                </span>
                                                <span class="inline-flex items-center gap-1">
                                                    <i class="fa-regular fa-clock text-[10px]"></i>
                                                    {{ formatDate(a.updatedAt) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <span v-if="a.status"
                                        class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                                        :class="a.status === 'PUBLISHED'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'">
                                        {{ a.status === 'PUBLISHED' ? 'publicado' : 'rascunho' }}
                                    </span>
                                </div>
                            </li>
                        </ul>

                        <div v-else class="px-3 py-12 text-center">
                            <i class="fa-regular fa-folder-open text-3xl text-slate-300 dark:text-slate-700"></i>
                            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhum artigo encontrado.</p>
                        </div>

                        <div
                            class="mt-2 flex items-center justify-between border-t border-slate-100 px-3 py-4 dark:border-slate-800">
                            <button type="button" :disabled="page <= 1" @click="setPage(page - 1)"
                                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                                Anterior
                            </button>

                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Página {{ page }}
                            </div>

                            <button type="button" :disabled="page * kb.list.pageSize >= kb.list.total"
                                @click="setPage(page + 1)"
                                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                Próxima
                                <i class="fa-solid fa-chevron-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyKbStore } from '@/stores/Academy/academyKbStore';

const router = useRouter();
const route = useRoute();
const kb = useAcademyKbStore();

const breadcrumbs = [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Artigos' },
];

const qLocal = ref('');

const q = computed(() => String(route.query.q || ''));
const page = computed(() => Number(route.query.p || 1));
const categorySlug = computed(() => String(route.params.categorySlug || ''));
const subcategorySlug = computed(() => String(route.query.sub || ''));
const activeCategory = computed(() => (kb.categories || []).find((c) => c.slug === categorySlug.value) || null);
const activeSub = computed(() => (activeCategory.value?.subcategories || []).find((s) => s.slug === subcategorySlug.value) || null);

// Deixa explícito o escopo da busca: dentro da categoria/sub atual, ou em toda a base.
const searchPlaceholder = computed(() => {
    if (activeSub.value) return `Buscar em ${activeSub.value.name}…`;
    if (activeCategory.value) return `Buscar em ${activeCategory.value.name}…`;
    return 'Buscar em toda a base…';
});

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function load() {
    qLocal.value = q.value;

    await kb.fetchCategories();

    await kb.fetchArticles({
        q: q.value,
        categorySlug: categorySlug.value,
        subcategorySlug: subcategorySlug.value,
        page: page.value,
        pageSize: kb.list.pageSize,
    });
}

function setCategory(slug) {
    const baseQuery = { q: q.value || '', p: 1 };

    if (!slug) {
        router.push({ name: 'AcademyKB', query: baseQuery });
        return;
    }

    // troca de categoria limpa a subcategoria (não passa ?sub).
    router.push({
        name: 'AcademyKBCategory',
        params: { categorySlug: slug },
        query: baseQuery,
    });
}

function setSubcategory(catSlug, subSlug) {
    router.push({
        name: 'AcademyKBCategory',
        params: { categorySlug: catSlug },
        query: { q: q.value || '', p: 1, sub: subSlug },
    });
}

function applySearch() {
    const baseQuery = { q: qLocal.value || '', p: 1, ...(subcategorySlug.value ? { sub: subcategorySlug.value } : {}) };

    if (categorySlug.value) {
        router.push({
            name: 'AcademyKBCategory',
            params: { categorySlug: categorySlug.value },
            query: baseQuery,
        });
        return;
    }

    router.push({ name: 'AcademyKB', query: baseQuery });
}

function setPage(p) {
    const baseQuery = { q: q.value || '', p, ...(subcategorySlug.value ? { sub: subcategorySlug.value } : {}) };

    if (categorySlug.value) {
        router.push({
            name: 'AcademyKBCategory',
            params: { categorySlug: categorySlug.value },
            query: baseQuery,
        });
        return;
    }

    router.push({ name: 'AcademyKB', query: baseQuery });
}

function openArticle(a) {
    router.push({
        name: 'AcademyKBArticle',
        params: { categorySlug: a.categorySlug, articleSlug: a.slug },
        query: { q: q.value || '', p: page.value || 1 },
    });
}

watch(() => [route.params.categorySlug, route.query.sub, route.query.q, route.query.p], load);
onMounted(load);
</script>
