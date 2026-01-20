<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Admin | Trilhas" subtitle="Criar, publicar, itens e vínculos"
            :backTo="{ name: 'AcademyAdmin' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin', to: { name: 'AcademyAdmin' } },
                { label: 'Trilhas' }
            ]">
            <template #actions>
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    @click="reload">
                    Recarregar
                </button>

                <button
                    class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:opacity-90 transition"
                    @click="openCreate">
                    Nova trilha
                </button>
            </template>
        </AcademyPageHeader>

        <div v-if="store.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ store.error }}
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <aside
                class="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Filtros</h3>

                <div class="mt-3 space-y-3">
                    <label class="block">
                        <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Status</div>
                        <select v-model="filters.status"
                            class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                            <option value="">Todos</option>
                            <option value="DRAFT">Rascunhos</option>
                            <option value="PUBLISHED">Publicados</option>
                        </select>
                    </label> 

                    <button
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        @click="reload">
                        Aplicar
                    </button>
                </div>
            </aside>

            <section
                class="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Trilhas</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Clique para abrir o detalhe</p>
                </div>

                <div class="p-3">
                    <div v-if="!store.list?.length"
                        class="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhuma trilha encontrada.
                    </div>

                    <ul v-else class="space-y-3">
                        <li v-for="t in store.list" :key="t.slug"
                            class="cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
                            @click="openDetail(t.slug)">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {{ t.title }}
                                    </p>
                                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {{ t.description }}
                                    </p>

                                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                        <span
                                            class="rounded-full border border-slate-200 dark:border-slate-700 px-2 py-1 font-mono text-slate-600 dark:text-slate-300">{{
                                            t.slug }}</span> 
                                        <span class="rounded-full border px-2 py-1 font-mono" :class="t.status === 'PUBLISHED'
                                            ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400'
                                            : 'border-amber-200 text-amber-700 dark:border-amber-900/50 dark:text-amber-400'">
                                            {{ t.status }}
                                        </span>
                                    </div>
                                </div>
                                <span
                                    class="text-slate-400 dark:text-slate-600 group-hover:translate-x-1 transition-transform">›</span>
                            </div>
                        </li>
                    </ul>
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
