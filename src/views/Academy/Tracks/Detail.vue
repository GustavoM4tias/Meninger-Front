<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader :title="data?.track?.title || 'Trilha'"
            :subtitle="data?.track?.description || 'Conteúdo e progresso'" :backTo="{ name: 'AcademyTracks' }"
            :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Trilhas', to: { name: 'AcademyTracks' } },
                { label: data?.track?.title || String(route.params.trackSlug || '') }
            ]" />

        <div v-if="tracks.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ tracks.error }}
        </div>

        <!-- Trilha bloqueada por pré-requisito (S3.3) -->
        <LockBanner v-else-if="data?.locked" :blocked-by="data.blockedBy || []" @open="goToTrack" />

        <div v-else-if="!data?.track"
            class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <i class="fa-solid fa-spinner fa-spin text-indigo-500"></i>
            <p class="text-sm text-slate-500 dark:text-slate-400">Carregando trilha...</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <!-- Itens -->
            <section
                class="rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
                <div
                    class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                    <div class="min-w-0">
                        <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-list-check text-indigo-500"></i>
                            Itens da jornada
                        </h2>
                        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Progresso considera apenas itens obrigatórios
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="text-sm font-bold text-slate-900 dark:text-white">
                            {{ clampPercent(progressPercent) }}%
                        </div>

                        <button
                            class="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 active:scale-95"
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
                    <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                            :style="{ width: `${clampPercent(progressPercent)}%` }" />
                    </div>

                    <ul class="mt-6 space-y-3">
                        <template v-for="(it, idx) in items" :key="it.id">
                            <!-- Cabeçalho de módulo (S2.1) -->
                            <li v-if="moduleHeaderFor(idx)" class="pt-3 first:pt-0">
                                <div class="flex items-center gap-2.5">
                                    <span
                                        class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                                        {{ moduleHeaderFor(idx).order }}
                                    </span>
                                    <div class="text-sm font-bold text-slate-900 dark:text-white">
                                        {{ moduleHeaderFor(idx).title }}
                                    </div>
                                </div>
                                <p v-if="moduleHeaderFor(idx).description"
                                    class="ml-9 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {{ moduleHeaderFor(idx).description }}
                                </p>
                            </li>

                            <li class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900"
                                :class="[
                                    it.completed ? '!border-emerald-200 bg-emerald-50/40 dark:!border-emerald-900/40 dark:bg-emerald-950/20' : '',
                                    seq.isCurrent(it, idx) && !it.completed ? '!border-indigo-300 ring-2 ring-indigo-100 dark:!border-indigo-800 dark:ring-indigo-950/60' : '',
                                    seq.isLocked(it, idx) && !it.completed ? 'opacity-70' : ''
                                ]">
                                <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                                    :class="it.completed
                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : (seq.isLocked(it, idx)
                                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                            : (seq.isCurrent(it, idx)
                                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'))">
                                    <i v-if="it.completed" class="fa-solid fa-check"></i>
                                    <i v-else-if="seq.isLocked(it, idx)" class="fa-solid fa-lock text-xs"></i>
                                    <i v-else-if="seq.isCurrent(it, idx)" class="fa-solid fa-play text-xs"></i>
                                    <i v-else class="fa-regular fa-circle"></i>
                                </span>

                                <div class="min-w-0 flex-1">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <p class="text-sm font-semibold text-slate-900 dark:text-slate-100"
                                            :class="it.completed ? 'text-slate-500 line-through dark:text-slate-400' : ''">
                                            {{ it.title }}
                                        </p>

                                        <span v-if="seq.isLocked(it, idx) && !it.completed"
                                            class="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                            bloqueado
                                        </span>

                                        <span v-else-if="seq.isCurrent(it, idx) && !it.completed"
                                            class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                            atual
                                        </span>

                                        <span v-if="!it.required"
                                            class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            opcional
                                        </span>
                                    </div>

                                    <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <span
                                            class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            {{ it.type || 'ITEM' }}
                                        </span>
                                        <span class="inline-flex items-center gap-1">
                                            <i class="fa-regular fa-clock"></i>
                                            ~{{ Number(it.estimatedMinutes || 0) }} min
                                        </span>
                                    </p>

                                    <div class="mt-3 flex flex-wrap items-center gap-2">
                                        <button
                                            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/50"
                                            type="button" @click="openItem(it)"
                                            :disabled="seq.isLocked(it, idx) && !it.completed">
                                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                            Abrir
                                        </button>

                                        <span v-if="it.completed"
                                            class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            <i class="fa-solid fa-circle-check"></i> concluído
                                        </span>

                                        <span v-else-if="seq.isCurrent(it, idx)"
                                            class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                            <i class="fa-solid fa-hourglass-half"></i> em andamento
                                        </span>
                                    </div>
                                </div>
                            </li>
                        </template>
                    </ul>
                </div>
            </section>

            <!-- Sidebar -->
            <aside class="space-y-5 lg:col-span-4">
                <section
                    class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                    <h3 class="flex items-center gap-2 font-display text-base font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-chart-simple text-indigo-500"></i>
                        Resumo do progresso
                    </h3>

                    <div class="mt-4 space-y-2">
                        <div
                            class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                            <span class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <i class="fa-solid fa-layer-group text-slate-400"></i> Total de itens
                            </span>
                            <span class="font-bold text-slate-900 dark:text-slate-100">{{ items.length }}</span>
                        </div>

                        <div
                            class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                            <span class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <i class="fa-solid fa-star text-slate-400"></i> Obrigatórios
                            </span>
                            <span class="font-bold text-slate-900 dark:text-slate-100">{{ requiredCount }}</span>
                        </div>

                        <div
                            class="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30">
                            <span class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                <i class="fa-solid fa-circle-check"></i> Concluídos
                            </span>
                            <span class="font-bold text-emerald-700 dark:text-emerald-400">{{ completedRequiredCount
                                }}</span>
                        </div>

                        <div
                            class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                            <span class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <i class="fa-solid fa-hourglass-half text-slate-400"></i> Restantes
                            </span>
                            <span class="font-bold text-slate-900 dark:text-slate-100">{{ remainingRequiredCount
                                }}</span>
                        </div>
                    </div>
                </section>

                <section
                    class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                    <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-circle-info text-indigo-500"></i>
                        Regra de ordem
                    </h3>
                    <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
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
import LockBanner from '@/views/Academy/components/LockBanner.vue';

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

// S2.1: módulos da trilha. Mapa itemId → módulo, para mostrar cabeçalho de
// módulo na lista de itens. moduleHeaderFor(idx) devolve o módulo SE o item
// na posição idx é o PRIMEIRO daquele módulo (senão null).
const modules = computed(() => (Array.isArray(data.value?.modules) ? data.value.modules : []));

function moduleHeaderFor(idx) {
    const it = items.value[idx];
    if (!it || it.moduleId == null) return null;
    // só mostra o header se for o primeiro item desse módulo na lista
    const prev = items.value[idx - 1];
    if (prev && prev.moduleId === it.moduleId) return null;
    const mod = modules.value.find((m) => Number(m.id) === Number(it.moduleId));
    if (!mod) return null;
    return {
        title: mod.title,
        description: mod.description,
        order: mod.orderIndex || (modules.value.indexOf(mod) + 1),
    };
}

function goToTrack(trackSlug) {
    if (!trackSlug) return;
    router.push({ name: 'AcademyTrackDetail', params: { trackSlug } });
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
