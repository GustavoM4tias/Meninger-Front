<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white">Módulos da trilha</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                    Agrupe os itens em capítulos. Itens sem módulo aparecem soltos antes dos módulos.
                </p>
            </div>
            <button
                class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-all active:scale-95"
                @click="openCreate">
                <i class="fa-solid fa-plus mr-1.5"></i>Novo módulo
            </button>
        </div>

        <div v-if="store.error"
            class="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-900/10 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-400">
            {{ store.error }}
        </div>

        <!-- Lista de módulos -->
        <div v-if="store.loading" class="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Carregando...
        </div>
        <div v-else-if="!store.list.length"
            class="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum módulo. A trilha funciona sem módulos (lista plana de itens).
        </div>
        <ul v-else class="space-y-2">
            <li v-for="(m, idx) in store.list" :key="m.id"
                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0">
                        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 dark:bg-slate-100 text-xs font-bold text-white dark:text-slate-900">
                            {{ m.orderIndex || idx + 1 }}
                        </span>
                        <div class="min-w-0">
                            <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ m.title }}</div>
                            <div v-if="m.description" class="text-xs text-slate-500 dark:text-slate-400">{{ m.description }}</div>
                            <div class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                                {{ m.itemCount || 0 }} {{ (m.itemCount === 1) ? 'item' : 'itens' }}
                            </div>
                        </div>
                    </div>
                    <div class="flex shrink-0 items-center gap-1">
                        <button class="rounded-lg px-2 py-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                            :disabled="idx === 0" @click="move(idx, -1)" title="Subir">
                            <i class="fa-solid fa-arrow-up text-xs"></i>
                        </button>
                        <button class="rounded-lg px-2 py-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                            :disabled="idx === store.list.length - 1" @click="move(idx, 1)" title="Descer">
                            <i class="fa-solid fa-arrow-down text-xs"></i>
                        </button>
                        <button class="rounded-lg px-2 py-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            @click="openEdit(m)" title="Editar">
                            <i class="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button class="rounded-lg px-2 py-1.5 text-slate-400 hover:text-rose-500"
                            @click="remove(m)" title="Excluir">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>

                <!-- Itens deste módulo -->
                <ul v-if="itemsByModule(m.id).length" class="mt-3 ml-10 space-y-1">
                    <li v-for="it in itemsByModule(m.id)" :key="it.id"
                        class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5">
                        <span class="text-xs text-slate-700 dark:text-slate-300 truncate">{{ it.title }}</span>
                        <button class="text-[11px] font-semibold text-slate-400 hover:text-rose-500"
                            @click="moveItem(it, null)">desvincular</button>
                    </li>
                </ul>
            </li>
        </ul>

        <!-- Itens sem módulo -->
        <div v-if="looseItems.length"
            class="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4">
            <div class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Itens sem módulo ({{ looseItems.length }})
            </div>
            <ul class="space-y-1">
                <li v-for="it in looseItems" :key="it.id"
                    class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5">
                    <span class="text-xs text-slate-700 dark:text-slate-300 truncate">{{ it.title }}</span>
                    <select v-if="store.list.length" class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300"
                        @change="(e) => moveItem(it, e.target.value)">
                        <option value="">Mover para...</option>
                        <option v-for="m in store.list" :key="m.id" :value="m.id">{{ m.title }}</option>
                    </select>
                </li>
            </ul>
        </div>

        <!-- Modal -->
        <dialog v-if="modalOpen" open class="fixed inset-0 z-50">
            <div class="fixed inset-0 bg-black/60" @click="modalOpen = false" />
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <div class="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl" @click.stop>
                    <header class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                        <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white">
                            {{ editId ? 'Editar módulo' : 'Novo módulo' }}
                        </h3>
                        <button class="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" @click="modalOpen = false">✕</button>
                    </header>
                    <div class="p-5 space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Título</label>
                            <input v-model="form.title" placeholder="ex: Módulo 1 — Fundamentos"
                                class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Descrição</label>
                            <textarea v-model="form.description" rows="2"
                                class="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"></textarea>
                        </div>
                    </div>
                    <footer class="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-4">
                        <button class="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800" @click="modalOpen = false">Cancelar</button>
                        <button :disabled="saving" class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40" @click="save">
                            {{ saving ? 'Salvando...' : 'Salvar' }}
                        </button>
                    </footer>
                </div>
            </div>
        </dialog>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useAcademyModulesStore } from '@/stores/Academy/academyModulesStore';

const props = defineProps({
    slug: { type: String, required: true },
    items: { type: Array, default: () => [] },
});
const emit = defineEmits(['changed']);

const toast = useToast();
const store = useAcademyModulesStore();

const modalOpen = ref(false);
const editId = ref(null);
const saving = ref(false);
const form = reactive({ title: '', description: '' });

const looseItems = computed(() => props.items.filter((i) => i.moduleId == null));

function itemsByModule(moduleId) {
    return props.items.filter((i) => Number(i.moduleId) === Number(moduleId));
}

function openCreate() {
    editId.value = null;
    form.title = '';
    form.description = '';
    modalOpen.value = true;
}

function openEdit(m) {
    editId.value = m.id;
    form.title = m.title || '';
    form.description = m.description || '';
    modalOpen.value = true;
}

async function save() {
    if (!form.title.trim()) {
        toast.error('Informe o título do módulo.');
        return;
    }
    saving.value = true;
    try {
        const payload = { title: form.title.trim(), description: form.description.trim() || null };
        if (editId.value) await store.update(props.slug, editId.value, payload);
        else await store.create(props.slug, payload);
        toast.success('Módulo salvo.');
        modalOpen.value = false;
        emit('changed');
    } catch (e) {
        toast.error(e?.message || 'Erro ao salvar módulo.');
    } finally {
        saving.value = false;
    }
}

async function remove(m) {
    if (!confirm(`Excluir o módulo "${m.title}"? Os itens dele viram itens soltos.`)) return;
    try {
        await store.remove(props.slug, m.id);
        toast.success('Módulo removido.');
        emit('changed');
    } catch (e) {
        toast.error(e?.message || 'Erro ao remover.');
    }
}

async function move(idx, dir) {
    const arr = store.list.map((m) => m.id);
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    try {
        await store.reorder(props.slug, arr);
    } catch (e) {
        toast.error(e?.message || 'Erro ao reordenar.');
    }
}

async function moveItem(item, moduleId) {
    try {
        await store.moveItem(props.slug, item.id, moduleId || null);
        toast.success(moduleId ? 'Item movido para o módulo.' : 'Item desvinculado.');
        emit('changed');
    } catch (e) {
        toast.error(e?.message || 'Erro ao mover item.');
    }
}

onMounted(() => store.fetch(props.slug));
</script>
