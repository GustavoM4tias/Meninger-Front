<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Trilhas" subtitle="Escolha uma trilha para iniciar e acompanhar seu progresso"
            :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Trilhas' }
            ]" />

        <div v-if="tracks.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ tracks.error }}
        </div>

        <!-- Busca -->
        <div
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-route text-indigo-500"></i>
                    <div>
                        <div class="text-sm font-semibold text-slate-900 dark:text-white">Encontrar trilha</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400">Filtra por título ou descrição</div>
                    </div>
                </div>

                <div class="relative w-full sm:w-96">
                    <input v-model="q" placeholder="Buscar trilha..." @keyup.enter="reload"
                        class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-11 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                    <button type="button" @click="reload" aria-label="Buscar"
                        class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700">
                        <i class="fa-solid fa-magnifying-glass text-sm"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Vazio -->
        <div v-if="!filtered.length"
            class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <i class="fa-solid fa-compass text-3xl text-slate-300 dark:text-slate-700"></i>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhuma trilha encontrada.</p>
        </div>

        <!-- Grade de trilhas -->
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <button v-for="t in filtered" :key="t.slug" type="button" @click="openTrack(t)"
                class="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
                <div class="flex items-start gap-3">
                    <span
                        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <i class="fa-solid fa-route"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <div class="truncate text-base font-semibold text-slate-900 dark:text-white">
                            {{ t.title }}
                        </div>
                        <span
                            class="mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            :class="trackStatus(t.progressPercent).cls">
                            {{ trackStatus(t.progressPercent).label }}
                        </span>
                    </div>
                </div>

                <p v-if="t.description" class="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                    {{ t.description }}
                </p>

                <div class="mt-auto pt-4">
                    <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                            :style="{ width: `${clampPercent(t.progressPercent)}%` }" />
                    </div>
                    <div class="mt-2 flex items-center justify-between text-xs">
                        <span class="font-medium text-indigo-600 dark:text-indigo-400">
                            {{ clampPercent(t.progressPercent) }}% concluído
                        </span>
                        <span
                            class="inline-flex items-center gap-1 font-medium text-slate-400 transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            Abrir <i class="fa-solid fa-arrow-right text-[10px]"></i>
                        </span>
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

// Rótulo de status — apenas visual, derivado do progresso já existente.
function trackStatus(v) {
    const p = clampPercent(v);
    if (p >= 100) {
        return { label: 'Concluída', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' };
    }
    if (p > 0) {
        return { label: 'Em andamento', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' };
    }
    return { label: 'Não iniciada', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
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
