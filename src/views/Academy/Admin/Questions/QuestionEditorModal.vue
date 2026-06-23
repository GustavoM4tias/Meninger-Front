<template>
    <dialog v-if="open" open class="fixed inset-0 z-50">
        <div class="fixed inset-0 bg-black/60" @click="close" />
        <div class="fixed inset-0 flex items-center justify-center p-3 md:p-6">
            <div class="w-full max-w-2xl max-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
                @click.stop>
                <header class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                    <h2 class="font-display text-xl font-semibold text-slate-900 dark:text-white">
                        {{ questionId ? 'Editar questão' : 'Nova questão' }}
                    </h2>
                    <button class="rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition" @click="close">✕</button>
                </header>

                <div class="flex-1 overflow-auto p-6 space-y-4">
                    <div v-if="error"
                        class="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-900/10 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-400">
                        {{ error }}
                    </div>

                    <!-- Texto -->
                    <div>
                        <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Pergunta</label>
                        <textarea v-model="form.text" rows="2" placeholder="Digite o enunciado..."
                            class="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800"></textarea>
                    </div>

                    <!-- Tipo + dificuldade -->
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Tipo</label>
                            <select v-model="form.type"
                                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100">
                                <option value="SINGLE">Resposta única</option>
                                <option value="MULTIPLE">Múltiplas respostas</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Dificuldade</label>
                            <select v-model="form.difficulty"
                                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100">
                                <option value="EASY">Fácil</option>
                                <option value="MEDIUM">Média</option>
                                <option value="HARD">Difícil</option>
                            </select>
                        </div>
                    </div>

                    <!-- Opções -->
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-sm font-medium text-slate-900 dark:text-slate-100">
                                Opções <span class="text-slate-400 dark:text-slate-500">(marque a(s) correta(s))</span>
                            </label>
                            <button type="button" class="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                                @click="addOption">+ Adicionar opção</button>
                        </div>
                        <div class="space-y-2">
                            <div v-for="(opt, i) in form.options" :key="i" class="flex items-center gap-2">
                                <input :type="form.type === 'MULTIPLE' ? 'checkbox' : 'radio'"
                                    :checked="form.correctIndexes.includes(i)" @change="toggleCorrect(i)"
                                    class="h-4 w-4 shrink-0" />
                                <input v-model="form.options[i]" :placeholder="`Opção ${i + 1}`"
                                    class="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100" />
                                <button type="button" class="rounded-lg px-2 py-1.5 text-slate-400 hover:text-rose-500"
                                    @click="removeOption(i)">
                                    <i class="fa-solid fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Explicação -->
                    <div>
                        <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                            Explicação <span class="text-slate-400 dark:text-slate-500">(opcional, mostrada após responder)</span>
                        </label>
                        <textarea v-model="form.explanation" rows="2" placeholder="Por que essa é a resposta correta..."
                            class="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100"></textarea>
                    </div>

                    <!-- Tags -->
                    <div>
                        <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                            Tags <span class="text-slate-400 dark:text-slate-500">(separadas por vírgula)</span>
                        </label>
                        <input v-model="tagsText" placeholder="vendas, lgpd, atendimento"
                            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100" />
                    </div>
                </div>

                <footer class="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
                    <button class="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800" @click="close">
                        Cancelar
                    </button>
                    <button :disabled="saving"
                        class="rounded-xl bg-slate-900 dark:bg-white px-5 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 transition-all active:scale-95"
                        @click="save">
                        {{ saving ? 'Salvando...' : 'Salvar' }}
                    </button>
                </footer>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useAcademyQuestionBankStore } from '@/stores/Academy/academyQuestionBankStore';

const props = defineProps({
    open: { type: Boolean, default: false },
    questionId: { type: [Number, String], default: null },
});
const emit = defineEmits(['update:open', 'saved']);

const toast = useToast();
const store = useAcademyQuestionBankStore();

const saving = ref(false);
const error = ref('');

const form = reactive({
    text: '',
    type: 'SINGLE',
    difficulty: 'MEDIUM',
    options: ['', ''],
    correctIndexes: [],
    explanation: '',
});
const tagsText = ref('');

function resetForm() {
    form.text = '';
    form.type = 'SINGLE';
    form.difficulty = 'MEDIUM';
    form.options = ['', ''];
    form.correctIndexes = [];
    form.explanation = '';
    tagsText.value = '';
    error.value = '';
}

function addOption() {
    form.options.push('');
}

function removeOption(i) {
    form.options.splice(i, 1);
    form.correctIndexes = form.correctIndexes
        .filter((c) => c !== i)
        .map((c) => (c > i ? c - 1 : c));
}

function toggleCorrect(i) {
    if (form.type === 'SINGLE') {
        form.correctIndexes = [i];
    } else {
        const idx = form.correctIndexes.indexOf(i);
        if (idx >= 0) form.correctIndexes.splice(idx, 1);
        else form.correctIndexes.push(i);
    }
}

watch(() => props.open, async (isOpen) => {
    if (!isOpen) return;
    resetForm();
    if (props.questionId) {
        try {
            const q = await store.getById(props.questionId);
            if (q) {
                form.text = q.text || '';
                form.type = q.type || 'SINGLE';
                form.difficulty = q.difficulty || 'MEDIUM';
                form.options = Array.isArray(q.options) && q.options.length ? [...q.options] : ['', ''];
                form.correctIndexes = Array.isArray(q.correctIndexes) ? [...q.correctIndexes] : [];
                form.explanation = q.explanation || '';
                tagsText.value = (q.tags || []).join(', ');
            }
        } catch (e) {
            error.value = e?.message || 'Erro ao carregar questão.';
        }
    }
});

function close() {
    emit('update:open', false);
}

async function save() {
    error.value = '';
    const opts = form.options.map((o) => String(o || '').trim()).filter(Boolean);
    if (!form.text.trim()) { error.value = 'O enunciado é obrigatório.'; return; }
    if (opts.length < 2) { error.value = 'Adicione ao menos 2 opções.'; return; }
    if (!form.correctIndexes.length) { error.value = 'Marque ao menos uma opção correta.'; return; }
    if (form.type === 'SINGLE' && form.correctIndexes.length !== 1) {
        error.value = 'Resposta única deve ter exatamente 1 correta.'; return;
    }
    if (form.type === 'MULTIPLE' && form.correctIndexes.length < 2) {
        error.value = 'Múltiplas respostas exige ao menos 2 corretas.'; return;
    }

    const payload = {
        text: form.text.trim(),
        type: form.type,
        difficulty: form.difficulty,
        options: opts,
        correctIndexes: form.correctIndexes,
        explanation: form.explanation.trim() || null,
        tags: tagsText.value.split(',').map((t) => t.trim()).filter(Boolean),
    };

    saving.value = true;
    try {
        if (props.questionId) await store.update(props.questionId, payload);
        else await store.create(payload);
        toast.success('Questão salva.');
        emit('saved');
        close();
    } catch (e) {
        error.value = e?.message || 'Erro ao salvar.';
    } finally {
        saving.value = false;
    }
}
</script>
