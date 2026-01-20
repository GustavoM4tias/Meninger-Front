<template>
    <dialog v-if="open" open class="fixed inset-0 z-50">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50" @click="close"></div>

        <!-- Center -->
        <div class="fixed inset-0 flex min-h-full items-center justify-center p-4">
            <!-- Card -->
            <div class="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                @click.stop role="dialog" aria-modal="true">
                <header
                    class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                            {{ mode === 'edit' ? 'Editar trilha' : 'Nova trilha' }}
                        </h2>
                        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Defina título, descrição e status.
                        </p>
                    </div>

                    <button class="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        @click="close" aria-label="Fechar" title="Fechar">
                        ✕
                    </button>
                </header>

                <section class="p-6 space-y-5 max-h-[75vh] overflow-auto">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <label class="md:col-span-8">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Título</div>
                            <input v-model="form.title"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Ex: Gestor de Vendas" />
                        </label>

                        <label class="md:col-span-4">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Status</div>
                            <select v-model="form.status"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                                <option value="DRAFT">Rascunho</option>
                                <option value="PUBLISHED">Publicado</option>
                            </select>
                        </label>

                        <label class="md:col-span-12">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Descrição</div>
                            <textarea v-model="form.description" rows="4"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Objetivo da trilha, o que a pessoa vai aprender..." />
                        </label>
 
                        <label v-if="mode === 'create'" class="md:col-span-12">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Slug (opcional)</div>
                            <input v-model="form.slug"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                                placeholder="Deixe vazio para gerar automaticamente" />
                        </label>

                        <div v-if="mode === 'edit'" class="md:col-span-12">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Slug</div>
                            <div
                                class="mt-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 px-3 py-2 text-sm font-mono text-slate-700 dark:text-slate-200">
                                {{ initialSlug || '-' }}
                            </div>
                            <div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                Slug não é editável.
                            </div>
                        </div>
                    </div>

                    <div v-if="error"
                        class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
                        {{ error }}
                    </div>
                </section>

                <footer class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        @click="close">
                        Cancelar
                    </button>

                    <button
                        class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                        :disabled="saving" @click="save">
                        {{ saving ? 'Salvando...' : (mode === 'edit' ? 'Salvar' : 'Criar trilha') }}
                    </button>
                </footer>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue';
import { useAcademyTracksAdminStore } from '@/stores/Academy/academyTracksAdminStore';

const props = defineProps({
    open: { type: Boolean, default: false },
    mode: { type: String, default: 'create' }, // create|edit
    initial: { type: Object, default: null },
});

const emit = defineEmits(['update:open', 'saved']);
const store = useAcademyTracksAdminStore();

const saving = ref(false);
const error = ref(null);

const form = reactive({
    title: '',
    description: '',
    status: 'DRAFT',
    audience: 'BOTH',
    slug: '',
});

const initialSlug = computed(() => String(props.initial?.slug || '').trim());

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
    (v) => {
        if (v) {
            lockBodyScroll(true);
            window.addEventListener('keydown', onKeyDown);

            const i = props.initial || {};
            form.title = String(i.title || '');
            form.description = String(i.description || '');
            form.status = String(i.status || 'DRAFT').toUpperCase();
            form.audience = String(i.audience || 'BOTH');
            form.slug = ''; // só no create

            error.value = null;
        } else {
            lockBodyScroll(false);
            window.removeEventListener('keydown', onKeyDown);
        }
    }
);

onBeforeUnmount(() => {
    lockBodyScroll(false);
    window.removeEventListener('keydown', onKeyDown);
});

function validate() {
    const title = String(form.title || '').trim();
    if (!title) return 'Título é obrigatório.';

    const st = String(form.status || 'DRAFT').toUpperCase();
    if (!['DRAFT', 'PUBLISHED'].includes(st)) return 'Status inválido.';

    const aud = String(form.audience || 'BOTH');
    if (!['BOTH', 'GESTOR_ONLY', 'ADM_ONLY'].includes(aud)) return 'Audiência inválida.';

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
            description: String(form.description || '').trim(),
            status: String(form.status || 'DRAFT').toUpperCase(),
            audience: String(form.audience || 'BOTH'),
        };

        if (props.mode === 'create') {
            const s = String(form.slug || '').trim();
            if (s) payload.slug = s;

            const res = await store.createTrack(payload);
            const slug = String(res?.track?.slug || '').trim();
            emit('saved', slug);
            close();
            return;
        }

        // edit
        const slug = initialSlug.value;
        if (!slug) throw new Error('Slug inválido.');

        await store.updateTrack(slug, payload);
        emit('saved', slug);
        close();
    } catch (e) {
        error.value = e?.message || 'Erro ao salvar trilha.';
        throw e;
    } finally {
        saving.value = false;
    }
}
</script>
