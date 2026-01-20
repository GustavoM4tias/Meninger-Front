<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Trilhas" subtitle="Escolha uma trilha para iniciar e acompanhar seu progresso"
            :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Trilhas' }
            ]" />

        <div v-if="tracks.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ tracks.error }}
        </div>

        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
            <div class="flex flex-col md:flex-row md:items-center gap-3">
                <div class="flex-1">
                    <div class="text-sm font-semibold text-slate-900 dark:text-white">Encontrar trilha</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">Filtra por título/descrição
                    </div>
                </div>

                <div class="flex items-center gap-2 w-full md:w-[520px]">
                    <input v-model="q"
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        placeholder="Buscar trilha..." @keyup.enter="reload" />
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                        @click="reload" type="button">
                        Atualizar
                    </button>
                </div>
            </div>
        </div>

        <div v-if="!filtered.length"
            class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma trilha encontrada.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button v-for="t in filtered" :key="t.slug" type="button"
                class="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all p-5"
                @click="openTrack(t)">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="text-base font-semibold text-slate-900 dark:text-white truncate">
                            {{ t.title }}
                        </div>
                        <div v-if="t.description" class="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {{ t.description }}
                        </div>
                    </div>

                </div>

                <div class="mt-4">
                    <div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div class="h-2 rounded-full bg-slate-900 dark:bg-slate-100 transition-all"
                            :style="{ width: `${clampPercent(t.progressPercent)}%` }" />
                    </div>

                    <div class="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div class="font-mono">
                            {{ clampPercent(t.progressPercent) }}%
                        </div>
                        <!-- <div class="font-mono truncate">
                            slug: {{ t.slug || '-' }}
                        </div> -->
                    </div>
                </div>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyTracksStore } from '@/stores/Academy/academyTracksStore';

const router = useRouter();
const tracks = useAcademyTracksStore();

const q = ref('');

function clampPercent(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}

// filtro simples client-side
const filtered = computed(() => {
    const list = Array.isArray(tracks.list) ? tracks.list : [];
    const term = String(q.value || '').trim().toLowerCase();
    if (!term) return list;

    return list.filter((t) => {
        const title = String(t.title || '').toLowerCase();
        const desc = String(t.description || '').toLowerCase();
        return title.includes(term) || desc.includes(term);
    });
});

async function reload() {
    await tracks.fetchTracks().catch(() => { });
}

function openTrack(t) {
    const slug = String(t.slug || '').trim();
    if (!slug) return;
    router.push({ name: 'AcademyTrackDetail', params: { trackSlug: slug } });
}

onMounted(reload);
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
