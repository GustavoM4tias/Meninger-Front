<template>
    <dialog v-if="open" open class="fixed inset-0 z-50">
        <div class="fixed inset-0 bg-black/60" @click="close" />

        <div class="fixed inset-0 flex items-center justify-center p-3 md:p-6">
            <div class="w-full max-w-7xl max-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800
               bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true"
                @click.stop>
                <!-- Header -->
                <header class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <h2 class="text-lg font-semibold text-slate-900 dark:text-white truncate">
                                    {{ item?.title || 'Conteúdo' }}
                                </h2>

                                <span v-if="item?.completed"
                                    class="rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                    CONCLUÍDO
                                </span>

                                <span v-else-if="locked"
                                    class="rounded-full bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                                    BLOQUEADO
                                </span>

                                <span v-else
                                    class="rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                    EM ANDAMENTO
                                </span>
                            </div>

                            <div
                                class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span class="font-mono">{{ String(item?.type || 'ITEM') }}</span>
                                <span>•</span>
                                <span class="font-mono">~{{ Number(item?.estimatedMinutes || 0) }} min</span>
                                <span>•</span>
                                <span class="font-mono">etapa {{ index + 1 }}/{{ itemsLen }}</span>
                            </div>
                        </div>

                        <button
                            class="rounded-xl px-3 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            @click="close" aria-label="Fechar" title="Fechar" type="button">
                            ✕
                        </button>
                    </div>
                </header>

                <!-- Body -->
                <section class="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
                    <!-- Content -->
                    <div class="lg:col-span-8 border-r border-slate-200 dark:border-slate-800 min-h-0 overflow-auto">
                        <div class="p-6">
                            <div v-if="locked && !item?.completed"
                                class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-900/10 p-5">
                                <div class="text-sm font-semibold text-rose-800 dark:text-rose-200">Etapa bloqueada
                                </div>
                                <div class="mt-1 text-sm text-rose-700 dark:text-rose-300">
                                    Conclua a etapa anterior para liberar esta.
                                </div>
                            </div>

                            <div v-else
                                class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                                <!-- top bar -->
                                <div
                                    class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20">
                                    <div class="flex items-center justify-between gap-3">
                                        <div class="min-w-0">
                                            <div class="text-sm font-semibold text-slate-900 dark:text-white">Área de
                                                estudo</div>
                                            <div class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                Siga o conteúdo e conclua a etapa quando estiver disponível.
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-2">
                                            <div v-if="item && !item.completed"
                                                class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                                                {{ canCompleteLive ? 'pronto' : 'validando...' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="p-6 space-y-4">
                                    <!-- S5.2: Player de vídeo com tracking real de % -->
                                    <VideoPlayer v-if="isVideoStep && item" :src="item.target || ''"
                                        :track-slug="trackSlug" :item-id="item.id"
                                        @progress="onVideoProgress" @completed="onVideoCompleted" />

                                    <TokenRenderer v-if="item" :content="String(item.content || '')"
                                        :payload="item.payload || null" :itemType="String(item.type || '')"
                                        :itemKey="String(item.id || '')" :target="item.target || null"
                                        :completed="!!item.completed" :quizAttempt="item.quizAttempt || null"
                                        @open-article="(ref) => emit('navigate-article', ref)"
                                        @open-topic="(ref) => emit('navigate-topic', ref)" @quiz-state="onQuizState"
                                        @quiz-submit="onQuizSubmit" />

                                    <!-- Erro de quiz (cooldown / limite / já aprovado) -->
                                    <div v-if="quizError"
                                        class="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                                        <i class="fa-solid fa-triangle-exclamation mr-1.5"></i>{{ quizError }}
                                    </div>

                                    <!-- Resultado do quiz após submit -->
                                    <div v-if="quizResult"
                                        class="rounded-2xl border p-4"
                                        :class="quizResult.passed
                                            ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10'
                                            : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-900/10'">
                                        <div class="flex items-center gap-2">
                                            <i class="fa-solid text-lg"
                                                :class="quizResult.passed ? 'fa-circle-check text-emerald-500' : 'fa-circle-xmark text-rose-500'"></i>
                                            <span class="text-sm font-bold"
                                                :class="quizResult.passed ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'">
                                                {{ quizResult.passed ? 'Aprovado!' : 'Não atingiu a nota mínima' }}
                                            </span>
                                        </div>
                                        <div class="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                                            Você acertou {{ quizResult.correctCount }}/{{ quizResult.totalQuestions }}
                                            ({{ quizResult.scorePercent }}%) — nota mínima {{ quizResult.passingScore }}%.
                                            <template v-if="!quizResult.passed && quizResult.attemptsRemaining != null">
                                                Tentativas restantes: <strong>{{ quizResult.attemptsRemaining }}</strong>.
                                            </template>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sidebar -->
                    <aside class="lg:col-span-4 min-h-0 overflow-auto">
                        <div class="flex flex-col gap-4 p-6">
                            <!-- Quiz info (S2.3) -->
                            <div v-if="isQuizStep && quizMeta"
                                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                                <div class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                                    <i class="fa-solid fa-clipboard-question mr-1.5 text-slate-400"></i>Avaliação
                                </div>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Nota mínima</span>
                                        <span class="font-bold text-slate-900 dark:text-slate-100">{{ quizMeta.passingScore }}%</span>
                                    </div>
                                    <div class="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Tentativas</span>
                                        <span class="font-bold text-slate-900 dark:text-slate-100">
                                            {{ quizMeta.maxAttempts == null
                                                ? 'ilimitadas'
                                                : `${quizMeta.attemptsRemaining} de ${quizMeta.maxAttempts}` }}
                                        </span>
                                    </div>
                                    <div v-if="quizMeta.cooldownMinutes > 0" class="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Intervalo entre tentativas</span>
                                        <span class="font-bold text-slate-900 dark:text-slate-100">{{ quizMeta.cooldownMinutes }} min</span>
                                    </div>
                                    <div v-if="bestScore != null" class="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                                        <span class="text-slate-600 dark:text-slate-400">Sua melhor nota</span>
                                        <span class="font-bold" :class="quizPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                                            {{ bestScore }}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- progress -->
                            <div
                                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                                <div class="flex items-center justify-between">
                                    <div class="text-sm font-semibold text-slate-900 dark:text-white">
                                        Etapa {{ index + 1 }} em andamento
                                    </div>
                                    <div class="text-xs font-mono text-slate-500 dark:text-slate-400">
                                        {{ counts?.totalDone ?? 0 }}/{{ counts?.total ?? itemsLen }}
                                    </div>
                                </div>

                                <div
                                    class="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div class="h-2 rounded-full bg-slate-900 dark:bg-slate-100 transition-all"
                                        :style="{ width: `${totalProgressPct}%` }" />
                                </div>

                                <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div class="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3">
                                        <div class="text-xs text-slate-500 dark:text-slate-400">Concluídos</div>
                                        <div class="mt-1 font-bold text-slate-900 dark:text-white">{{ counts?.totalDone
                                            ?? 0 }}</div>
                                    </div>

                                    <div class="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3">
                                        <div class="text-xs text-slate-500 dark:text-slate-400">Restantes</div>
                                        <div class="mt-1 font-bold text-slate-900 dark:text-white">{{
                                            counts?.totalRemaining ?? 0 }}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- navigation + primary -->
                            <div
                                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                                <div class="flex items-center justify-between">
                                    <div class="text-sm font-semibold text-slate-900 dark:text-white">Navegação</div>
                                    <div class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ index + 1 }}/{{
                                        itemsLen }}</div>
                                </div>

                                <div class="mt-4 grid grid-cols-2 gap-2">
                                    <button
                                        class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        type="button" @click="prev" :disabled="index <= 0">
                                        ← Anterior
                                    </button>

                                    <button
                                        class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        type="button" @click="next" :disabled="!canGoNext" :title="quizPending && !(item?.completed || justCompleted)
                                            ? 'Responda e envie o quiz para continuar'
                                            : (canGoNext ? 'Próximo' : 'Conclua a etapa anterior para liberar')">
                                        Próximo →
                                    </button>
                                </div>

                                <button
                                    class="mt-2 w-full rounded-xl bg-slate-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                    type="button" @click="primaryAction" :disabled="primaryDisabled">
                                    {{ primaryLabel }}
                                </button>

                                <div class="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Quando estiver pronto, conclua a etapa para liberar a próxima.
                                </div>
                            </div>
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { computed, watch, onBeforeUnmount, ref } from 'vue';
import TokenRenderer from '@/views/Academy/components/TokenRenderer.vue';
import VideoPlayer from '@/views/Academy/components/VideoPlayer.vue';
import { useAcademyTracksStore } from '@/stores/Academy/academyTracksStore';

const tracksStore = useAcademyTracksStore();

const props = defineProps({
    open: { type: Boolean, default: false },
    items: { type: Array, default: () => [] },
    index: { type: Number, default: 0 },
    locked: { type: Boolean, default: false },
    seq: { type: Object, default: null },
    gating: { type: Object, default: null },
    counts: { type: Object, default: null },
    trackSlug: { type: String, required: true },
});

const emit = defineEmits([
    'update:open',
    'update:index',
    'toggle',
    'navigate-article',
    'navigate-topic',
]);

const itemsLen = computed(() => (Array.isArray(props.items) ? props.items.length : 0));

const item = computed(() => {
    const i = Number(props.index);
    if (!Number.isFinite(i) || i < 0) return null;
    return props.items[i] || null;
});

const totalProgressPct = computed(() => {
    const total = Number(props.counts?.total ?? itemsLen.value);
    const done = Number(props.counts?.totalDone ?? 0);
    if (!Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
});

/* -------------------------
   QUIZ pending (vem do renderer)
------------------------- */
const quizPending = ref(false);
function onQuizState(e) {
    quizPending.value = !!e?.pending;
}

/* -------------------------
   S2.3: metadados e resultado do quiz
------------------------- */
const isVideoStep = computed(() => String(item.value?.type || '').toUpperCase() === 'VIDEO');

// quizMeta vem do backend no item (passingScore, maxAttempts, attemptsRemaining, cooldownMinutes)
const quizMeta = computed(() => item.value?.quizMeta || null);

// melhor nota e flag passed (vem do quizAttempt enriquecido pelo backend)
const bestScore = computed(() => {
    const a = item.value?.quizAttempt;
    if (!a) return null;
    const v = a.bestScorePercent ?? a.scorePercent;
    return Number.isFinite(Number(v)) ? Number(v) : null;
});
const quizPassed = computed(() => !!item.value?.quizAttempt?.passed);

// resultado do último submit (mostrado no painel de feedback)
const quizResult = ref(null);
const quizError = ref('');

/* -------------------------
   Salvar quiz no backend + patch local
------------------------- */
async function onQuizSubmit(e) {
    const it = item.value;
    if (!it) return;

    const slug = String(props.trackSlug || '').trim();
    if (!slug || slug === 'undefined') {
        console.error('[TrackItemModal] INVALID trackSlug on submit', { trackSlug: props.trackSlug, itemId: it.id });
        return;
    }

    quizError.value = '';
    quizResult.value = null;

    try {
        // Servidor é a fonte de verdade: passa apenas as respostas.
        const resp = await tracksStore.submitQuiz(slug, {
            itemId: it.id,
            answers: e?.answers || {},
        });

        const serverResult = resp?.quizResult || null;
        it.quizAttempt = {
            answers: e?.answers || {},
            allCorrect: !!serverResult?.allCorrect,
            totalQuestions: serverResult?.totalQuestions,
            correctCount: serverResult?.correctCount,
            scorePercent: serverResult?.scorePercent,
            passed: !!serverResult?.passed,
            perQuestion: serverResult?.perQuestion,
            submittedAt: new Date().toISOString(),
        };

        quizResult.value = serverResult;
        quizPending.value = false;
    } catch (err) {
        // S2.3: erros de política — cooldown (429), limite (429), já aprovado (409).
        quizError.value = err?.message || 'Não foi possível enviar o quiz.';
        quizPending.value = false;
    }
}

function onVideoProgress(payload) {
    const slug = String(props.trackSlug || '').trim();
    if (!slug) return;
    tracksStore.trackVideoWatch(slug, payload);
}

function onVideoCompleted() {
    // vídeo atingiu o threshold — resolve a pendência de gating
    quizPending.value = false;
}

/* -------------------------
   Ticker (gating)
------------------------- */
const tick = ref(0);
let tmr = null;

const isQuizStep = computed(() => String(item.value?.type || '').toUpperCase() === 'QUIZ');

const canCompleteLive = computed(() => {
    void tick.value;

    const it = item.value;
    if (!it) return false;
    if (it.completed) return false;
    if (props.locked) return false;

    // etapa quiz: só pode concluir se não está pendente
    if (isQuizStep.value && quizPending.value) return false;

    if (props.gating?.canComplete) return !!props.gating.canComplete(it);
    return true;
});

/* -------------------------
   Navegação
------------------------- */
function close() {
    emit('update:open', false);
}
function prev() {
    emit('update:index', Math.max(0, props.index - 1));
}
function next() {
    const nextIndex = Math.min(itemsLen.value - 1, props.index + 1);
    const it = props.items[nextIndex];
    if (!it) return;

    const locked = props.seq?.isLocked?.(it, nextIndex);
    if (locked && !it.completed) return;

    emit('update:index', nextIndex);
}

const canGoNext = computed(() => {
    if (!justCompleted.value && quizPending.value) return false;

    const nextIndex = props.index + 1;
    if (nextIndex >= itemsLen.value) return false;

    const it = props.items[nextIndex];
    if (!it) return false;

    const locked = props.seq?.isLocked?.(it, nextIndex);
    if (locked && !it.completed) return false;

    return true;
});

/* -------------------------
   Fluxo: concluir -> libera próxima
------------------------- */
const justCompleted = ref(false);

watch(
    () => props.index,
    () => {
        justCompleted.value = false;
        quizResult.value = null;
        quizError.value = '';
        tick.value++;
    }
);

watch(
    () => item.value?.completed,
    (completed) => {
        if (completed) quizPending.value = false;
    }
);

function concludeStep() {
    const it = item.value;
    if (!it) return;
    if (!canCompleteLive.value) return;

    emit('toggle', it);
    justCompleted.value = true;
    quizPending.value = false;
}

function goNextIfPossible() {
    if (!canGoNext.value) return;
    next();
}

const primaryLabel = computed(() => {
    if (item.value?.completed || justCompleted.value) return canGoNext.value ? 'Ir para próxima etapa' : 'Etapa concluída';
    return 'Concluir etapa';
});

const primaryDisabled = computed(() => {
    if (props.locked) return true;
    if (!(item.value?.completed || justCompleted.value) && isQuizStep.value && quizPending.value) return true;

    if (item.value?.completed || justCompleted.value) return !canGoNext.value;
    return !canCompleteLive.value;
});

function primaryAction() {
    if (item.value?.completed || justCompleted.value) {
        goNextIfPossible();
        return;
    }
    concludeStep();
}

/* -------------------------
   Body scroll + keys
------------------------- */
function lockBodyScroll(lock) {
    const el = document.documentElement;
    if (lock) el.classList.add('overflow-hidden');
    else el.classList.remove('overflow-hidden');
}

function onKeyDown(e) {
    if (!props.open) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
    }
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
        return;
    }
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (canGoNext.value) next();
        return;
    }
}

/* -------------------------
   Tick lifecycle
------------------------- */
function stopTicker() {
    if (tmr) clearInterval(tmr);
    tmr = null;
}
function startTicker() {
    stopTicker();
    tmr = setInterval(() => {
        tick.value++;
    }, 1000);
}

watch(
    () => props.open,
    (v) => {
        lockBodyScroll(v);
        if (v) window.addEventListener('keydown', onKeyDown);
        else window.removeEventListener('keydown', onKeyDown);

        const it = item.value;

        if (v) {
            startTicker();
            if (props.gating?.start && it && !it.completed) props.gating.start(it);
        } else {
            stopTicker();
            if (props.gating?.stop && it) props.gating.stop(it);
        }
    }
);

watch(
    () => props.index,
    () => {
        if (!props.open) return;
        const it = item.value;
        if (props.gating?.start && it && !it.completed) props.gating.start(it);
        tick.value++;
    }
);

onBeforeUnmount(() => {
    stopTicker();
    window.removeEventListener('keydown', onKeyDown);
    lockBodyScroll(false);
});
</script>
