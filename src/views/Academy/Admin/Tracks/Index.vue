<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Admin · Trilhas" subtitle="Criar, publicar, itens e vínculos"
            :backTo="{ name: 'AcademyAdmin' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin', to: { name: 'AcademyAdmin' } },
                { label: 'Trilhas' }
            ]">
            <template #actions>
                <button type="button" @click="reload"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                    <i class="fa-solid fa-rotate-right text-xs"></i>
                    Recarregar
                </button>

                <button type="button" @click="openCreate"
                    class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 active:scale-95">
                    <i class="fa-solid fa-plus text-xs"></i>
                    Nova trilha
                </button>
            </template>
        </AcademyPageHeader>

        <div v-if="store.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ store.error }}
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <aside class="lg:col-span-4">
                <div
                    class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <h3 class="flex items-center gap-2 font-display text-base font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-filter text-indigo-500"></i>
                        Filtros
                    </h3>

                    <div class="mt-4 space-y-3">
                        <label class="block">
                            <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Status
                            </div>
                            <select v-model="filters.status"
                                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60">
                                <option value="">Todos</option>
                                <option value="DRAFT">Rascunhos</option>
                                <option value="PUBLISHED">Publicados</option>
                            </select>
                        </label>

                        <button type="button" @click="reload"
                            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            Aplicar
                        </button>
                    </div>
                </div>
            </aside>

            <section class="lg:col-span-8">
                <div
                    class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-route text-indigo-500"></i>
                            Trilhas
                        </h2>
                        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Clique para abrir o detalhe</p>
                    </div>

                    <div class="p-3">
                        <div v-if="!store.list?.length"
                            class="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                            <i class="fa-solid fa-compass text-3xl text-slate-300 dark:text-slate-700"></i>
                            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhuma trilha encontrada.</p>
                            <button type="button" @click="openCreate"
                                class="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500">
                                <i class="fa-solid fa-plus text-xs"></i>
                                Criar primeira trilha
                            </button>
                        </div>

                        <ul v-else class="space-y-3">
                            <li v-for="t in store.list" :key="t.slug" @click="openDetail(t.slug)"
                                class="group flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
                                <span
                                    class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    <i class="fa-solid fa-route"></i>
                                </span>
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                                        {{ t.title }}
                                    </p>
                                    <p v-if="t.description"
                                        class="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                        {{ t.description }}
                                    </p>

                                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                        <span
                                            class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            <i class="fa-solid fa-hashtag text-[9px] text-slate-400"></i>
                                            {{ t.slug }}
                                        </span>
                                        <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                            :class="t.status === 'PUBLISHED'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'">
                                            {{ t.status === 'PUBLISHED' ? 'publicado' : 'rascunho' }}
                                        </span>
                                    </div>
                                </div>
                                <i class="fa-solid fa-chevron-right mt-2 text-xs text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600"></i>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>

        <TrackEditorModal v-model:open="editorOpen" mode="create" :initial="null" @saved="onCreated" />
    </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyTracksAdminStore } from '@/stores/Academy/academyTracksAdminStore';
import TrackEditorModal from '@/views/Academy/Admin/Tracks/components/TrackEditorModal.vue';

const router = useRouter();
const store = useAcademyTracksAdminStore();

const filters = reactive({
    status: store.filters.status || '',
    audience: store.filters.audience || 'BOTH',
});

const editorOpen = ref(false);

async function reload() {
    await store.fetchList({ status: filters.status, audience: filters.audience });
}

function openCreate() {
  router.push({ name: 'AcademyTracksAdminCreate' });
}

function openDetail(slug) {
    router.push({ name: 'AcademyTracksAdminDetail', params: { slug } });
}

async function onCreated(trackSlug) {
    editorOpen.value = false;
    await reload();
    if (trackSlug) openDetail(trackSlug);
}

onMounted(reload);
</script>
