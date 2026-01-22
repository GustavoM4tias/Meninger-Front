<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Base de Conhecimento" subtitle="Artigos, processos e padrões"
            :backTo="{ name: 'AcademyPanel' }" :breadcrumbs="breadcrumbs">
            <template #actions>
                <div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <div class="relative w-full md:w-[420px]">
                        <input v-model="qLocal"
                            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Buscar artigos..." @keyup.enter="applySearch" />
                        <button
                            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            @click="applySearch">
                            ⌕
                        </button>
                    </div>

                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        @click="router.push({ name: 'AcademyKBArticles' })">
                        Meus artigos
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div v-if="kb.list.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400 transition-colors">
            {{ kb.list.error }}
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <aside class="lg:col-span-3">
                <div
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors overflow-hidden">
                    <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Categorias</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Filtre por área</p>
                    </div>

                    <div class="flex flex-col gap-1 p-2">
                        <button class="w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors"
                            :class="!categorySlug
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'"
                            @click="setCategory('')">
                            Todas
                        </button>

                        <button v-for="c in kb.categories" :key="c.slug"
                            class="w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors" :class="categorySlug === c.slug
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'"
                            @click="setCategory(c.slug)">
                            {{ c.name }}
                        </button>
                    </div>
                </div>
            </aside>

            <main class="lg:col-span-9">
                <div
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors overflow-hidden">
                    <div
                        class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <div>
                            <h2 class="text-base font-semibold text-slate-900 dark:text-white">Artigos</h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400">
                                {{ kb.list.total }} resultados
                                <span v-if="categorySlug" class="capitalize">• {{ categorySlug }}</span>
                                <span v-if="q">• busca: "{{ q }}"</span>
                            </p>
                        </div>

                        <button
                            class="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white transition-all active:scale-95"
                            @click="router.push({ name: 'AcademyKBEditor' })">
                            Novo artigo
                        </button>
                    </div>

                    <div class="p-2">
                        <ul v-if="kb.list.results?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <li v-for="a in kb.list.results" :key="a.id"
                                class="rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                @click="openArticle(a)">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="min-w-0">
                                        <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {{ a.title }} <span class="text-xs text-gray-500">• {{ formatDate(a.createdAt) }}</span>
                                        </p> 

                                        <div
                                            class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <!-- categoria -->
                                            <span
                                                class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-slate-50/60 dark:bg-slate-800/20 font-mono">
                                                {{ a.categorySlug }}
                                            </span>

                                            <!-- criado por -->
                                            <span
                                                class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900">
                                                Criado por
                                                <span class="ml-1 font-medium text-slate-700 dark:text-slate-200">
                                                    {{ a.createdBy?.username || '—' }}
                                                </span>
                                            </span>

                                            <!-- atualizado -->
                                            <span
                                                class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900">
                                                Última atualização:
                                                <span class="ml-1">
                                                    {{ formatDate(a.updatedAt) }}
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    <!-- status (opcional: só mostra se vier no payload) -->
                                    <span v-if="a.status"
                                        class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide border"
                                        :class="a.status === 'PUBLISHED'
                                            ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300'
                                            : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300'">
                                        {{ a.status === 'PUBLISHED' ? 'publicado' : 'rascunho' }}
                                    </span>
                                </div>
                            </li>

                        </ul>

                        <div v-else class="px-3 py-12 text-sm text-slate-500 dark:text-slate-400 text-center">
                            Nenhum artigo encontrado.
                        </div>

                        <div
                            class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-2 px-3 py-4">
                            <button
                                class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                                :disabled="page <= 1" @click="setPage(page - 1)">
                                Anterior
                            </button>

                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Página {{ page }}
                            </div>

                            <button
                                class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                                :disabled="page * kb.list.pageSize >= kb.list.total" @click="setPage(page + 1)">
                                Próxima
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

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function load() {
    qLocal.value = q.value;

    await kb.fetchCategories({ audience: 'BOTH' });

    await kb.fetchArticles({
        q: q.value,
        categorySlug: categorySlug.value,
        page: page.value,
        pageSize: kb.list.pageSize,
        audience: 'BOTH',
    });
}

function setCategory(slug) {
    const baseQuery = { q: q.value || '', p: 1 };

    if (!slug) {
        router.push({ name: 'AcademyKB', query: baseQuery });
        return;
    }

    router.push({
        name: 'AcademyKBCategory',
        params: { categorySlug: slug },
        query: baseQuery,
    });
}

function applySearch() {
    const baseQuery = { q: qLocal.value || '', p: 1 };

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
    const baseQuery = { q: q.value || '', p };

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

watch(() => [route.params.categorySlug, route.query.q, route.query.p], load);
onMounted(load);
</script>
