<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Banco de Questões" subtitle="Perguntas reutilizáveis para os quizzes das trilhas"
            :backTo="{ name: 'AcademyAdmin' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin', to: { name: 'AcademyAdmin' } },
                { label: 'Banco de Questões' },
            ]">
            <template #actions>
                <button
                    class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-all active:scale-95"
                    @click="openCreate">
                    <i class="fa-solid fa-plus mr-1.5"></i>Nova questão
                </button>
            </template>
        </AcademyPageHeader>

        <!-- Filtros -->
        <section
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input v-model="filters.q" placeholder="Buscar no texto da pergunta..."
                    class="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 placeholder:text-slate-400"
                    @keyup.enter="reload" />
                <select v-model="filters.difficulty"
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100">
                    <option value="">Toda dificuldade</option>
                    <option value="EASY">Fácil</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HARD">Difícil</option>
                </select>
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    @click="reload">
                    Filtrar
                </button>
            </div>
        </section>

        <div v-if="store.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 px-5 py-4 text-sm text-rose-700 dark:text-rose-400">
            {{ store.error }}
        </div>

        <!-- Lista -->
        <section class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                    Questões <span class="text-slate-400 dark:text-slate-500">({{ store.total }})</span>
                </h2>
            </div>

            <div class="p-2">
                <div v-if="store.loading" class="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Carregando...
                </div>
                <div v-else-if="!store.list.length"
                    class="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma questão encontrada.
                </div>
                <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                    <li v-for="q in store.list" :key="q.id"
                        class="flex items-start justify-between gap-4 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                        <div class="min-w-0">
                            <div class="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                                {{ q.text }}
                            </div>
                            <div class="mt-1 flex flex-wrap items-center gap-1.5">
                                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                    :class="q.type === 'MULTIPLE'
                                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                                        : 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'">
                                    {{ q.type === 'MULTIPLE' ? 'Múltipla' : 'Única' }}
                                </span>
                                <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    {{ diffLabel(q.difficulty) }}
                                </span>
                                <span class="text-xs text-slate-400 dark:text-slate-500">
                                    {{ (q.options || []).length }} opções
                                </span>
                                <span v-for="t in (q.tags || [])" :key="t"
                                    class="rounded-full border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    {{ t }}
                                </span>
                            </div>
                        </div>
                        <div class="flex shrink-0 items-center gap-2">
                            <button
                                class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                @click="openEdit(q.id)">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button
                                class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                @click="archive(q)">
                                <i class="fa-solid fa-box-archive"></i>
                            </button>
                        </div>
                    </li>
                </ul>
            </div>
        </section>

        <!-- Modal de edição -->
        <QuestionEditorModal v-model:open="editorOpen" :question-id="editorId" @saved="reload" />
    </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import QuestionEditorModal from './QuestionEditorModal.vue';
import { useAcademyQuestionBankStore } from '@/stores/Academy/academyQuestionBankStore';

const toast = useToast();
const store = useAcademyQuestionBankStore();

const filters = reactive({ q: '', difficulty: '' });
const editorOpen = ref(false);
const editorId = ref(null);

function diffLabel(d) {
    return { EASY: 'Fácil', MEDIUM: 'Média', HARD: 'Difícil' }[String(d || '').toUpperCase()] || 'Média';
}

function reload() {
    store.fetch({ q: filters.q, difficulty: filters.difficulty, page: 1, pageSize: 50 });
}

function openCreate() {
    editorId.value = null;
    editorOpen.value = true;
}

function openEdit(id) {
    editorId.value = id;
    editorOpen.value = true;
}

async function archive(q) {
    if (!confirm(`Arquivar a questão "${q.text.slice(0, 60)}..."?`)) return;
    try {
        await store.archive(q.id);
        toast.success('Questão arquivada.');
        reload();
    } catch (e) {
        toast.error(e?.message || 'Erro ao arquivar.');
    }
}

onMounted(reload);
</script>
