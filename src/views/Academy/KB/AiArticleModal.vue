<template>
    <Teleport to="body">
        <Transition name="ai-modal">
            <div v-if="open"
                class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
                @click.self="cancel">
                <div
                    class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    <!-- Header -->
                    <header
                        class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <div class="flex items-start gap-3">
                            <span
                                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                                <i class="fa-solid fa-wand-magic-sparkles"></i>
                            </span>
                            <div>
                                <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                                    Gerar artigo com IA
                                </h2>
                                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Você passa o contexto · a Eme escreve um rascunho · você revisa e publica.
                                </p>
                            </div>
                        </div>
                        <button type="button" @click="cancel" :disabled="generating"
                            class="rounded-lg px-2.5 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </header>

                    <!-- Body — scrollável -->
                    <div class="min-h-0 flex-1 overflow-y-auto p-5">
                        <!-- Form (antes da geração) -->
                        <div v-if="!result" class="space-y-4">
                            <div>
                                <label
                                    class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Tópico *
                                </label>
                                <input v-model="topic" type="text"
                                    placeholder="Ex: Como abrir uma proposta no CV CRM"
                                    @keydown.enter.prevent="generate"
                                    class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                            </div>

                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        Estilo
                                    </label>
                                    <select v-model="style"
                                        class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60">
                                        <option value="procedimento">Procedimento padrão</option>
                                        <option value="tutorial">Tutorial</option>
                                        <option value="faq">FAQ</option>
                                        <option value="checklist">Checklist</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        Categoria
                                    </label>
                                    <input v-model="categorySlug" type="text" placeholder="kebab-case (opcional)"
                                        class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                                </div>
                            </div>

                            <div>
                                <label
                                    class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Contexto
                                </label>
                                <textarea v-model="context" rows="8"
                                    placeholder="Cole aqui notas, transcrição, descrição livre do procedimento, regras, exemplos. Quanto mais detalhado, melhor o resultado."
                                    class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                                <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
                                    Quando faltar informação, a IA marca com
                                    <code class="rounded bg-slate-100 px-1 dark:bg-slate-800">[ ! confirmar ]</code>
                                    em vez de chutar.
                                </p>
                            </div>

                            <div v-if="generating"
                                class="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <span>Gerando rascunho com a Eme… pode levar alguns segundos.</span>
                            </div>
                        </div>

                        <!-- Resultado (preview) -->
                        <div v-else class="space-y-3">
                            <div class="flex flex-wrap items-center gap-2">
                                <span
                                    class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                    <i class="fa-solid fa-circle-check text-[9px]"></i> rascunho gerado
                                </span>
                                <span v-if="result.model"
                                    class="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {{ result.model }}
                                </span>
                            </div>

                            <div
                                class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Título
                                </div>
                                <div class="mt-1 text-base font-bold text-slate-900 dark:text-white">
                                    {{ result.title }}
                                </div>
                                <div v-if="result.suggestedCategorySlug" class="mt-2">
                                    <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Categoria sugerida:
                                    </span>
                                    <span
                                        class="ml-1 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-mono text-xs text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                        {{ result.suggestedCategorySlug }}
                                    </span>
                                </div>
                            </div>

                            <div
                                class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                <div class="border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                    Pré-visualização do corpo
                                </div>
                                <div class="prose prose-slate max-w-none p-5 text-sm dark:prose-invert">
                                    <TokenRenderer :content="result.body || ''" :payload="null" item-type=""
                                        item-key="" />
                                </div>
                            </div>
                        </div>

                        <!-- Erro -->
                        <div v-if="error"
                            class="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            {{ error }}
                        </div>
                    </div>

                    <!-- Footer -->
                    <footer
                        class="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <button type="button" @click="cancel" :disabled="generating"
                            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                            Cancelar
                        </button>

                        <div v-if="!result" class="flex items-center gap-2">
                            <button type="button" @click="generate" :disabled="!canGenerate"
                                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 disabled:opacity-40">
                                <i class="fa-solid"
                                    :class="generating ? 'fa-spinner fa-spin text-xs' : 'fa-wand-magic-sparkles text-xs'"></i>
                                {{ generating ? 'Gerando...' : 'Gerar rascunho' }}
                            </button>
                        </div>

                        <div v-else class="flex items-center gap-2">
                            <button type="button" @click="result = null"
                                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                <i class="fa-solid fa-rotate text-xs"></i>
                                Refazer
                            </button>
                            <button type="button" @click="apply"
                                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95">
                                <i class="fa-solid fa-check text-xs"></i>
                                Usar este rascunho
                            </button>
                        </div>
                    </footer>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import TokenRenderer from '@/views/Academy/components/TokenRenderer.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    categories: { type: Array, default: () => [] },
    defaultCategorySlug: { type: String, default: '' },
});
const emit = defineEmits(['update:open', 'apply']);

const topic = ref('');
const context = ref('');
const style = ref('procedimento');
const categorySlug = ref('');
const generating = ref(false);
const error = ref('');
const result = ref(null);

watch(() => props.open, (open) => {
    if (open) {
        // Reset ao abrir
        topic.value = '';
        context.value = '';
        style.value = 'procedimento';
        categorySlug.value = props.defaultCategorySlug || '';
        error.value = '';
        result.value = null;
        generating.value = false;
    }
});

const canGenerate = computed(() => topic.value.trim().length > 2 && !generating.value);

function cancel() {
    if (generating.value) return;
    emit('update:open', false);
}

async function generate() {
    if (!canGenerate.value) return;
    generating.value = true;
    error.value = '';
    result.value = null;
    try {
        const data = await requestWithAuth('/academy/kb/admin/articles/generate', {
            method: 'POST',
            body: JSON.stringify({
                topic: topic.value.trim(),
                context: context.value,
                style: style.value,
                categorySlug: categorySlug.value.trim(),
            }),
        });
        result.value = data;
    } catch (e) {
        error.value = e?.message || 'Não foi possível gerar agora.';
    } finally {
        generating.value = false;
    }
}

function apply() {
    if (!result.value) return;
    emit('apply', {
        title: result.value.title,
        body: result.value.body,
        categorySlug: result.value.suggestedCategorySlug || categorySlug.value,
    });
    emit('update:open', false);
}
</script>

<style scoped>
.ai-modal-enter-active,
.ai-modal-leave-active {
    transition: opacity .2s ease;
}

.ai-modal-enter-active>div,
.ai-modal-leave-active>div {
    transition: transform .22s cubic-bezier(.22, 1, .36, 1), opacity .22s ease;
}

.ai-modal-enter-from,
.ai-modal-leave-to {
    opacity: 0;
}

.ai-modal-enter-from>div,
.ai-modal-leave-to>div {
    transform: translateY(16px) scale(.97);
    opacity: 0;
}
</style>
