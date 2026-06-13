<template>
    <dialog v-if="open" open class="fixed inset-0 z-50">
        <div class="fixed inset-0 bg-black/60" @click="close" />
        <div class="fixed inset-0 flex items-center justify-center p-3 md:p-6">
            <div class="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
                @click.stop>
                <header class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                    <div>
                        <h2 class="font-display text-xl font-semibold text-slate-900 dark:text-white">Histórico de versões</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">
                            Cada edição material gera uma versão. Restaurar cria um snapshot do estado atual antes.
                        </p>
                    </div>
                    <button class="rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition" @click="close">✕</button>
                </header>

                <div class="flex flex-1 min-h-0 overflow-hidden">
                    <!-- Lista de versões -->
                    <div class="w-1/2 border-r border-slate-200 dark:border-slate-800 overflow-auto">
                        <div v-if="store.loading" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            Carregando...
                        </div>
                        <div v-else-if="!store.list.length" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            Nenhuma versão anterior. As versões aparecem após editar o artigo.
                        </div>
                        <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                            <li v-for="v in store.list" :key="v.id">
                                <button type="button" @click="selectVersion(v)"
                                    class="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    :class="selected?.versionNumber === v.versionNumber ? 'bg-slate-50 dark:bg-slate-800/60' : ''">
                                    <div class="flex items-center gap-2">
                                        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-100 text-[11px] font-bold text-white dark:text-slate-900">
                                            v{{ v.versionNumber }}
                                        </span>
                                        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{{ v.title }}</span>
                                    </div>
                                    <div class="mt-1 ml-8 text-xs text-slate-500 dark:text-slate-400">
                                        {{ v.createdBy?.username || 'Sistema' }} • {{ fmtDate(v.createdAt) }}
                                    </div>
                                    <div v-if="v.message" class="mt-0.5 ml-8 text-xs italic text-slate-400 dark:text-slate-500">
                                        "{{ v.message }}"
                                    </div>
                                </button>
                            </li>
                        </ul>
                    </div>

                    <!-- Preview da versão -->
                    <div class="w-1/2 overflow-auto">
                        <div v-if="!selected" class="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400 dark:text-slate-500">
                            Selecione uma versão para visualizar.
                        </div>
                        <div v-else class="p-5">
                            <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Versão {{ selected.versionNumber }}
                            </div>
                            <h3 class="mt-1 text-base font-semibold text-slate-900 dark:text-white">{{ selected.title }}</h3>
                            <div class="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">
                                {{ selected.categorySlug }} / {{ selected.slug }}
                            </div>
                            <div v-if="loadingPreview" class="mt-4 text-sm text-slate-500 dark:text-slate-400">
                                Carregando conteúdo...
                            </div>
                            <pre v-else class="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-700 dark:text-slate-300 max-h-72 overflow-auto">{{ previewBody }}</pre>
                        </div>
                    </div>
                </div>

                <footer class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4">
                    <span class="text-xs text-slate-400 dark:text-slate-500">
                        {{ store.list.length }} versão(ões) no histórico
                    </span>
                    <div class="flex items-center gap-2">
                        <button class="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800" @click="close">
                            Fechar
                        </button>
                        <button v-if="selected" :disabled="restoring"
                            class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 transition-all active:scale-95"
                            @click="restore">
                            <i class="fa-solid fa-clock-rotate-left mr-1.5"></i>
                            {{ restoring ? 'Restaurando...' : `Restaurar v${selected.versionNumber}` }}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useAcademyArticleVersionsStore } from '@/stores/Academy/academyArticleVersionsStore';

const props = defineProps({
    open: { type: Boolean, default: false },
    articleId: { type: [Number, String], default: null },
});
const emit = defineEmits(['update:open', 'restored']);

const toast = useToast();
const store = useAcademyArticleVersionsStore();

const selected = ref(null);
const previewBody = ref('');
const loadingPreview = ref(false);
const restoring = ref(false);

function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

watch(() => props.open, (isOpen) => {
    if (isOpen && props.articleId) {
        selected.value = null;
        previewBody.value = '';
        store.fetch(props.articleId);
    }
});

async function selectVersion(v) {
    selected.value = v;
    previewBody.value = '';
    loadingPreview.value = true;
    try {
        const full = await store.getVersion(props.articleId, v.versionNumber);
        previewBody.value = full?.body || '(sem conteúdo)';
    } catch (e) {
        previewBody.value = 'Erro ao carregar conteúdo.';
    } finally {
        loadingPreview.value = false;
    }
}

async function restore() {
    if (!selected.value) return;
    if (!confirm(`Restaurar a versão ${selected.value.versionNumber}? O estado atual será salvo como nova versão antes.`)) return;
    restoring.value = true;
    try {
        const article = await store.restore(props.articleId, selected.value.versionNumber);
        toast.success(`Versão ${selected.value.versionNumber} restaurada.`);
        emit('restored', article);
        close();
    } catch (e) {
        toast.error(e?.message || 'Erro ao restaurar.');
    } finally {
        restoring.value = false;
    }
}

function close() {
    emit('update:open', false);
}
</script>
