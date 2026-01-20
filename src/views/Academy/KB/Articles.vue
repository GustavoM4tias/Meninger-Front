<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Meus artigos" subtitle="Rascunhos e publicados" :breadcrumbs="breadcrumbs"
            :backTo="{ name: 'AcademyKB' }">
            <template #actions>
                <button
                    class="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white transition-all active:scale-95"
                    @click="router.push({ name: 'AcademyKBEditor' })">
                    Novo artigo
                </button>
            </template>
        </AcademyPageHeader>

        <div
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
            <div
                class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800">
                <div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <div class="relative w-full md:w-[420px]">
                        <input v-model="q"
                            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Buscar nos meus artigos..." @keyup.enter="apply" />
                    </div>

                    <select v-model="status"
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm md:w-[180px] focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all"
                        @change="apply">
                        <option value="">Todos os status</option>
                        <option value="DRAFT">Rascunhos</option>
                        <option value="PUBLISHED">Publicados</option>
                    </select>
                </div>

                <div class="text-sm text-slate-500 dark:text-slate-400">
                    Total: <span class="font-semibold text-slate-900 dark:text-slate-100">{{ store.my.total }}</span>
                </div>
            </div>

            <div class="p-2">
                <div v-if="store.my.error"
                    class="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
                    {{ store.my.error }}
                </div>

                <div v-if="!store.my.results.length"
                    class="px-3 py-10 text-sm text-slate-500 dark:text-slate-400 text-center">
                    Nenhum artigo encontrado.
                </div>

                <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                    <li v-for="it in store.my.results" :key="it.id"
                        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <p
                                    class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
                                    {{ it.title }}
                                </p>

                                <span class="rounded-full px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider"
                                    :class="it.status === 'PUBLISHED'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'">
                                    {{ it.status === 'PUBLISHED' ? 'publicado' : 'rascunho' }}
                                </span>
                            </div>

                            <div
                                class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span
                                    class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-slate-50/60 dark:bg-slate-800/20 font-mono">
                                    {{ it.categorySlug }}
                                </span>

                                <span v-if="it.createdAt"
                                    class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900">
                                    Criado em:
                                    <span class="ml-1">
                                        {{ fmtDate(it.createdAt) }}
                                    </span>
                                </span>

                                <span v-if="it.updatedAt"
                                    class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900">
                                    Última atualização:
                                    <span class="ml-1">
                                        {{ fmtDate(it.updatedAt) }}
                                    </span>
                                </span>
                            </div>

                        </div>

                        <div class="flex items-center gap-2">
                            <button
                                class="flex-1 sm:flex-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                @click="edit(it.id)">
                                Editar
                            </button>

                            <button v-if="it.status !== 'PUBLISHED'"
                                class="flex-1 sm:flex-none rounded-xl bg-slate-900 dark:bg-slate-100 px-3 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors"
                                @click="publish(it.id, true)">
                                Publicar
                            </button>

                            <button v-else
                                class="flex-1 sm:flex-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                @click="publish(it.id, false)">
                                Despublicar
                            </button>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-4">
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    :disabled="store.my.page <= 1" @click="prev">
                    Anterior
                </button>

                <div class="text-sm text-slate-500 dark:text-slate-400">
                    Página <span class="font-semibold text-slate-900 dark:text-slate-100">{{ store.my.page }}</span>
                </div>

                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    :disabled="store.my.page * store.my.pageSize >= store.my.total" @click="next">
                    Próxima
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyKbStore } from '@/stores/Academy/academyKbStore';

const router = useRouter();
const store = useAcademyKbStore();

const q = ref(store.my.q || '');
const status = ref(store.my.status || '');

const breadcrumbs = [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'KB', to: { name: 'AcademyKB' } },
    { label: 'Meus artigos' },
];

function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function load(page = 1) {
    await store.fetchMyArticles({
        q: q.value,
        status: status.value,
        page,
        pageSize: store.my.pageSize,
    });
}

function apply() {
    load(1);
}

function prev() {
    load(Math.max(1, (store.my.page || 1) - 1));
}

function next() {
    load((store.my.page || 1) + 1);
}

function edit(id) {
    router.push({ name: 'AcademyKBEditorEdit', params: { id } });
}

async function publish(id, publish) {
    await store.publishMyArticle(id, publish);
}

onMounted(() => load(1));
</script>
