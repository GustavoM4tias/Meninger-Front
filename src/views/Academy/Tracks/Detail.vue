<template>
    <div class="space-y-4">
        <AcademyPageHeader :title="data?.track?.title || 'Trilha'"
            :subtitle="data?.track?.description || 'Conteúdo e progresso'" :backTo="{ name: 'AcademyTracks' }"
            :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Trilhas', to: { name: 'AcademyTracks' } },
                { label: data?.track?.title || String(route.params.trackSlug || '') }
            ]" />

        <div v-if="tracks.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ tracks.error }}
        </div>

        <div v-if="!data?.track"
            class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Carregando trilha...
        </div>

        <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <!-- Itens -->
            <section
                class="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                <div
                    class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <div class="min-w-0">
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Itens da jornada</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">
                            Progresso considera apenas itens obrigatórios
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="text-sm font-bold text-slate-900 dark:text-white">
                            {{ clampPercent(progressPercent) }}%
                        </div>

                        <button
                            class="rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 text-sm font-bold"
                            type="button" @click="startOrContinue">
                            {{
                                seq.nextRequiredIndex === -1
                                    ? 'Revisar trilha'
                                    : (completedRequiredCount ? 'Continuar trilha' : 'Iniciar trilha')
                            }}
                        </button>
                    </div>
                </div>

                <div class="p-5">
                    <div class="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div class="h-3 rounded-full bg-slate-900 dark:bg-slate-100 transition-all duration-500"
                            :style="{ width: `${clampPercent(progressPercent)}%` }" />
                    </div>

                    <ul class="mt-6 space-y-3">
                        <li v-for="(it, idx) in items" :key="it.id"
                            class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all"
                            :class="[
                                it.completed ? 'bg-slate-50/50 dark:bg-slate-800/30' : '',
                                seq.isCurrent(it, idx) && !it.completed ? 'ring-2 ring-slate-200 dark:ring-slate-700' : '',
                                seq.isLocked(it, idx) && !it.completed ? 'opacity-75' : ''
                            ]">
                            <div class="min-w-0">
                                <div class="flex items-center flex-wrap gap-2">
                                    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100"
                                        :class="it.completed ? 'text-slate-500 dark:text-slate-400 line-through' : ''">
                                        {{ it.title }}
                                    </p>

                                    <span v-if="seq.isLocked(it, idx) && !it.completed"
                                        class="rounded-full bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                        bloqueado
                                    </span>

                                    <span v-else-if="seq.isCurrent(it, idx) && !it.completed"
                                        class="rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                        atual
                                    </span>

                                    <span v-if="!it.required"
                                        class="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                                        opcional
                                    </span>
                                </div>

                                <p class="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                    {{ it.type || 'ITEM' }} • ~{{ Number(it.estimatedMinutes || 0) }} min
                                </p>

                                <div class="mt-4 flex flex-wrap gap-2">
                                    <button
                                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        type="button" @click="openItem(it)"
                                        :disabled="seq.isLocked(it, idx) && !it.completed">
                                        Abrir
                                    </button>

                                    <span v-if="it.completed"
                                        class="self-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                        concluído
                                    </span>

                                    <span v-else-if="seq.isCurrent(it, idx)"
                                        class="self-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                        em andamento
                                    </span>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </section>

            <!-- Sidebar -->
            <aside class="lg:col-span-4 space-y-4">
                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Resumo do progresso</h3>

                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Total de itens</span>
                            <span class="font-bold text-slate-900 dark:text-slate-100">{{ items.length }}</span>
                        </div>

                        <div class="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Obrigatórios</span>
                            <span class="font-bold text-slate-900 dark:text-slate-100">{{ requiredCount }}</span>
                        </div>

                        <div class="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>Concluídos</span>
                            <span class="font-bold">{{ completedRequiredCount }}</span>
                        </div>

                        <div class="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Restantes</span>
                            <span class="font-bold text-slate-900 dark:text-slate-100">{{ remainingRequiredCount
                                }}</span>
                        </div>
                    </div>
                </section>

                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span class="text-blue-500">ℹ</span> Regra de ordem
                    </h3>
                    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Você precisa concluir os itens obrigatórios em ordem. Itens concluídos podem ser reabertos.
                    </p>
                </section>
            </aside>
        </div>

        <!-- Viewer com paginação -->
        <TrackItemModal v-model:open="modalOpen" v-model:index="modalIndex" :items="items" :locked="modalLocked"
            :seq="seq" :gating="gating" :counts="modalCounts" :trackSlug="slug" @toggle="toggleItem"
            @navigate-article="goArticle" @navigate-topic="goTopic" />
    </div>
</template>

<script setup>
import { computed, watch, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import TrackItemModal from '@/views/Academy/Tracks/components/TrackItemModal.vue';

import { useAcademyTracksStore } from '@/stores/Academy/academyTracksStore';
import { useTrackSequence } from '@/views/Academy/Tracks/composables/useTrackSequence';
import { useTrackItemGating } from '@/views/Academy/Tracks/composables/useTrackItemGating';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const tracks = useAcademyTracksStore();

const slug = computed(() => String(route.params.trackSlug || route.params.slug || '').trim());
const data = computed(() => tracks.detail || null);
const items = computed(() => (Array.isArray(data.value?.items) ? data.value.items : []));

const seq = useTrackSequence(items);
const gating = useTrackItemGating();

function clampPercent(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}

const requiredCount = computed(() => items.value.filter((i) => !!i.required).length);
const completedRequiredCount = computed(() => items.value.filter((i) => !!i.required && !!i.completed).length);
const remainingRequiredCount = computed(() => Math.max(0, requiredCount.value - completedRequiredCount.value));

const progressPercent = computed(() => {
    const p = data.value?.progressPercent;
    if (Number.isFinite(Number(p))) return Number(p);

    const req = items.value.filter((i) => !!i.required);
    if (!req.length) return 0;
    const done = req.filter((i) => !!i.completed).length;
    return Math.round((done / req.length) * 100);
});

async function load() {
    await tracks.fetchTrack(slug.value).catch(() => { });
}

function startOrContinue() {
    const idx = seq.getNextTargetIndex();
    const it = items.value[idx];
    if (!it) return;
    openItem(it);
}

/* ---------------------------
   Modal state (index-based)
--------------------------- */
const modalOpen = ref(false);
const modalIndex = ref(0);

const modalItem = computed(() => items.value[modalIndex.value] || null);

const modalLocked = computed(() => {
    const it = modalItem.value;
    const idx = modalIndex.value;
    if (!it) return false;
    return seq.isLocked(it, idx) && !it.completed;
});

const modalCounts = computed(() => {
    const total = items.value.length;
    const totalDone = items.value.filter((i) => !!i.completed).length;
    const totalRemaining = Math.max(0, total - totalDone);
    return { total, totalDone, totalRemaining };
});

function openItem(it) {
    const idx = items.value.findIndex((x) => x.id === it.id);
    if (idx < 0) return;

    const unlocked = seq.isUnlocked(it, idx);
    if (!unlocked && !it.completed) {
        toast.error('Complete o item anterior obrigatório para liberar.');
        return;
    }

    modalIndex.value = idx;
    modalOpen.value = true;
}

/* ---------------------------
   Toggle (complete)
--------------------------- */
async function toggle(it) {
    if (!it || it.completed) return;

    const idx = items.value.findIndex((x) => x.id === it.id);
    if (idx < 0) return;

    if (!seq.isUnlocked(it, idx)) {
        toast.error('Você precisa concluir o item anterior.');
        return;
    }
    if (!gating.canComplete(it)) {
        toast.error('Consuma o conteúdo antes de concluir.');
        return;
    }

    await tracks.markProgress(slug.value, { itemId: it.id, completed: true }).catch(() => { });
    await load();
}

/* Aliases para não quebrar integrações anteriores */
function toggleItem(it) { return toggle(it); }

/* ---------------------------
   Navigation from tokens
--------------------------- */
function navigateArticle(ref) {
    const id = Number(ref);
    if (!Number.isFinite(id) || id <= 0) return;
    toast.info(`Abrir artigo id=${id} (ajuste a rota no front).`);
}

function navigateTopic(ref) {
    const id = Number(ref);
    if (!Number.isFinite(id) || id <= 0) return;
    toast.info(`Abrir tópico id=${id} (ajuste a rota no front).`);
}

/* Aliases */
function goArticle(ref) { return navigateArticle(ref); }
function goTopic(ref) { return navigateTopic(ref); }

/* Recarrega quando abrir o modal (traz quizAttempt e sincroniza estado) */
watch(
    () => modalOpen.value,
    async (v) => {
        if (!v) return;
        await load();
    }
);

onMounted(load);
</script>
