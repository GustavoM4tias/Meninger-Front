<template>
    <dialog v-if="open" open class="fixed inset-0 z-50">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50" @click="close" />

        <!-- Center wrapper -->
        <div class="fixed inset-0 flex items-center justify-center p-4">
            <!-- Panel -->
            <div class="w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                role="dialog" aria-modal="true" @click.stop>
                <header
                    class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                            {{ mode === 'edit' ? 'Editar etapa' : 'Nova etapa' }}
                        </h2>
                        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Um único campo (markdown). Digite <span class="font-mono">@</span> para inserir itens
                            (artigo, tópico, vídeo, link, quiz e tarefas).
                            <span class="ml-2 text-xs font-mono text-slate-400">Tokens: @[(TYPE:ref)]</span>
                        </p>
                    </div>

                    <button class="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        @click="close" aria-label="Fechar" title="Fechar" type="button">
                        ✕
                    </button>
                </header>

                <section class="p-6 space-y-5 max-h-[75vh] overflow-auto">
                    <!-- Linha: Título + Minutos + Required -->
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <label class="md:col-span-7">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Título</div>
                            <input v-model="form.title"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Ex: Boas-vindas e visão geral" />
                        </label>

                        <label class="md:col-span-3">
                            <div class="flex items-center justify-between">
                                <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Minutos (estimado)
                                </div>
                                <button
                                    class="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline"
                                    type="button" @click="unlockMinutesAuto" v-if="minutesLocked"
                                    title="Voltar a calcular automaticamente">
                                    auto
                                </button>
                            </div>

                            <input v-model.number="form.estimatedMinutes" type="number" min="0"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                                @input="minutesLocked = true" />
                            <div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                {{ minutesLocked ? 'Valor manual.' : 'Calculado automaticamente.' }}
                            </div>
                        </label>

                        <label class="md:col-span-2 flex items-center gap-2 mt-6 select-none">
                            <input type="checkbox" v-model="form.required" class="h-4 w-4" />
                            <span class="text-sm text-slate-700 dark:text-slate-200">Conta no progresso</span>
                        </label>

                        <label v-if="mode === 'edit'" class="md:col-span-4">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Ordem (orderIndex)</div>
                            <input v-model.number="form.orderIndex" type="number" min="1"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono" />
                        </label>
                    </div>

                    <!-- ✅ Editor unificado -->
                    <TokenEditor v-model="form.content" v-model:modelPayload="form.payload" :rows="14"
                        placeholder="Escreva seu conteúdo aqui. Digite @ para inserir itens." />

                    <div v-if="error"
                        class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
                        {{ error }}
                    </div>
                </section>

                <footer class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        @click="close" type="button">
                        Cancelar
                    </button>

                    <button
                        class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                        :disabled="saving" @click="save" type="button">
                        {{ saving ? 'Salvando...' : 'Salvar' }}
                    </button>
                </footer>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick, toRaw } from 'vue';
import TokenEditor from '@/views/Academy/components/TokenEditor.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    mode: { type: String, default: 'create' }, // create|edit
    initial: { type: Object, default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const saving = ref(false);
const error = ref(null);
const minutesLocked = ref(false);

/* -------------------------
   Form state
------------------------- */
const form = reactive({
    title: '',
    content: '',
    estimatedMinutes: 0,
    required: true,
    orderIndex: 1,
    payload: {
        embeds: [],
        widgets: {
            quiz: {},
            task: {},
        },
    },
});

/**
 * normalizePayload (SEM structuredClone)
 * - aceita proxy/reactive
 * - retorna objeto plain com apenas dados primitivos/arrays
 * - ✅ agora inclui campos do ARTICLE (categorySlug, slug) pra link funcionar
 */
function normalizePayload(p) {
    const raw = toRaw(p) || {};
    const embedsRaw = Array.isArray(raw.embeds) ? raw.embeds : [];
    const widgetsRaw = raw.widgets && typeof raw.widgets === 'object' ? raw.widgets : {};

    const quizRaw = widgetsRaw.quiz && typeof widgetsRaw.quiz === 'object' ? widgetsRaw.quiz : {};
    const taskRaw = widgetsRaw.task && typeof widgetsRaw.task === 'object' ? widgetsRaw.task : {};

    const embeds = embedsRaw
        .map((e) => {
            const er = toRaw(e) || {};
            const type = String(er.type || '');
            const ref = String(er.ref || '');
            if (!type || !ref) return null;

            const out = { type, ref };
            if (er.title != null) out.title = String(er.title);
            if (er.url != null) out.url = String(er.url);

            if (type === 'ARTICLE') {
                if (er.categorySlug != null) out.categorySlug = String(er.categorySlug);
                if (er.slug != null) out.slug = String(er.slug);
            }

            return out;
        })
        .filter(Boolean);

    const quiz = {};
    for (const [k, v] of Object.entries(quizRaw)) {
        const vr = toRaw(v) || {};
        const title = String(vr.title || 'Quiz');
        const questions = Array.isArray(vr.questions) ? vr.questions : [];
        quiz[String(k)] = {
            title,
            questions: questions.map((q) => {
                const qr = toRaw(q) || {};
                return {
                    text: String(qr.text || ''),
                    options: (Array.isArray(qr.options) ? qr.options : []).map((o) => String(o || '')),
                    correctIndex: Number.isFinite(qr.correctIndex) ? Number(qr.correctIndex) : 0,
                };
            }),
        };
    }

    const task = {};
    for (const [k, v] of Object.entries(taskRaw)) {
        const vr = toRaw(v) || {};
        const title = String(vr.title || 'Checklist');
        const tasks = Array.isArray(vr.tasks) ? vr.tasks : [];
        task[String(k)] = {
            title,
            tasks: tasks.map((t) => {
                const tr = toRaw(t) || {};
                return { text: String(tr.text || '') };
            }),
        };
    }

    return { embeds, widgets: { quiz, task } };
}

function countWords(text) {
    const s = String(text || '').trim();
    if (!s) return 0;
    return s.split(/\s+/).filter(Boolean).length;
}

const embedsCount = computed(() => (Array.isArray(form.payload?.embeds) ? form.payload.embeds.length : 0));
const widgetsCount = computed(() => {
    const w = form.payload?.widgets || {};
    const q = w.quiz ? Object.keys(w.quiz).length : 0;
    const t = w.task ? Object.keys(w.task).length : 0;
    return q + t;
});

function calcEstimatedMinutes() {
    if (minutesLocked.value) return;
    const words = countWords(form.content);
    const readMinutes = Math.ceil(words / 180);
    const extra = embedsCount.value + widgetsCount.value;
    form.estimatedMinutes = Math.max(0, readMinutes + extra);
}

watch(
    () => [form.content, embedsCount.value, widgetsCount.value],
    () => calcEstimatedMinutes(),
    { deep: true }
);

function unlockMinutesAuto() {
    minutesLocked.value = false;
    calcEstimatedMinutes();
}

function resetFromInitial() {
    const i = props.initial || {};
    form.title = String(i.title || '');
    form.content = i.content == null ? '' : String(i.content || '');
    form.estimatedMinutes = Number(i.estimatedMinutes || 0);
    form.required = i.required !== false;
    form.orderIndex = Number(i.orderIndex || 1);
    form.payload = normalizePayload(i.payload);

    error.value = null;
    minutesLocked.value = false;

    calcEstimatedMinutes();
}

/* -------------------------
   Modal lifecycle
------------------------- */
function close() {
    emit('update:open', false);
}

function lockBodyScroll(lock) {
    const el = document.documentElement;
    if (lock) el.classList.add('overflow-hidden');
    else el.classList.remove('overflow-hidden');
}

function onKeyDown(e) {
    if (e.key === 'Escape') close();
}

watch(
    () => props.open,
    async (v) => {
        if (v) {
            lockBodyScroll(true);
            window.addEventListener('keydown', onKeyDown);

            resetFromInitial();
            await nextTick();
        } else {
            lockBodyScroll(false);
            window.removeEventListener('keydown', onKeyDown);
        }
    }
);

/* -------------------------
   Save
------------------------- */
function validate() {
    const title = String(form.title || '').trim();
    if (!title) return 'Título é obrigatório.';
    const content = String(form.content || '').trim();
    if (!content) return 'Conteúdo é obrigatório.';

    form.payload = normalizePayload(form.payload);
    return '';
}

async function save() {
    error.value = null;
    saving.value = true;

    try {
        const msg = validate();
        if (msg) throw new Error(msg);

        const payload = {
            title: String(form.title || '').trim(),
            type: 'TEXT',
            target: '',
            content: String(form.content || '').trim(),
            payload: form.payload,
            estimatedMinutes: Math.max(0, Number(form.estimatedMinutes || 0)),
            required: form.required !== false,
        };

        if (props.mode === 'edit') payload.orderIndex = Math.max(1, Number(form.orderIndex || 1));

        emit('saved', payload);
        close();
    } catch (e) {
        error.value = e?.message || 'Erro ao salvar';
        throw e;
    } finally {
        saving.value = false;
    }
}
</script>
