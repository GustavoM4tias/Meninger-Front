<template>
    <div class="space-y-4">
        <AcademyPageHeader :title="detail?.track?.title ? `Admin | ${detail.track.title}` : 'Admin | Trilha'"
            subtitle="Itens e vínculos" :backTo="{ name: 'AcademyTracksAdmin' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin', to: { name: 'AcademyAdmin' } },
                { label: 'Trilhas', to: { name: 'AcademyTracksAdmin' } },
                { label: slug }
            ]">
            <template #actions>
                <button
                    class="rounded-xl border border-rose-200 dark:border-rose-900/50 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 bg-rose-900/10 dark:hover:bg-rose-900/20 transition"
                    @click="openDelete = true">
                    Excluir trilha
                </button>

                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    @click="reload">
                    Recarregar
                </button>

                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    @click="openEditTrack">
                    Editar
                </button>

                <button
                    class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:opacity-90 transition"
                    @click="togglePublish">
                    {{ detail?.track?.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar' }}
                </button>
            </template>
        </AcademyPageHeader>

        <div v-if="store.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ store.error }}
        </div>

        <div class="flex flex-wrap gap-2">
            <button class="rounded-full px-4 py-2 text-sm border transition"
                :class="tab === 'items'
                    ? 'border-slate-700 dark:border-slate-300 text-slate-600 dark:text-slate-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'" @click="tab = 'items'">
                Itens
            </button>

            <button class="rounded-full px-4 py-2 text-sm border transition"
                :class="tab === 'assignments'
                    ? 'border-slate-700 dark:border-slate-300 text-slate-600 dark:text-slate-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'" @click="tab = 'assignments'">
                Vínculos
            </button>

            <button class="rounded-full px-4 py-2 text-sm border transition"
                :class="tab === 'preview'
                    ? 'border-slate-700 dark:border-slate-300 text-slate-600 dark:text-slate-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'" @click="tab = 'preview'">
                Visualização
            </button>

        </div>

        <!-- ITENS -->
        <section v-if="tab === 'items'"
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div
                class="border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-start justify-between gap-3">
                <div>
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Itens</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Ordem, tipo, target e obrigatoriedade</p>
                </div>

                <button
                    class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:opacity-90 transition"
                    @click="openAddItem">
                    Novo item
                </button>
            </div>

            <div class="p-4">
                <div v-if="!items.length"
                    class="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Sem itens.
                </div>

                <div v-else class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="text-slate-500 dark:text-slate-400">
                            <tr>
                                <th class="px-2 py-2 text-left font-medium">#</th>
                                <th class="px-2 py-2 text-left font-medium">Título</th>
                                <th class="px-2 py-2 text-left font-medium">Tipo</th>
                                <th class="px-2 py-2 text-left font-medium">Target</th>
                                <th class="px-2 py-2 text-left font-medium">Min</th>
                                <th class="px-2 py-2 text-left font-medium">Req</th>
                                <th class="px-2 py-2 text-right font-medium"></th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr v-for="i in items" :key="i.id" class="border-t border-slate-100 dark:border-slate-800">
                                <td class="px-2 py-3 font-mono text-slate-600 dark:text-slate-300">{{ i.orderIndex }}
                                </td>
                                <td class="px-2 py-3 text-slate-900 dark:text-white">{{ i.title }}</td>
                                <td class="px-2 py-3 font-mono text-slate-600 dark:text-slate-300">{{ i.type }}</td>
                                <td
                                    class="px-2 py-3 font-mono text-slate-600 dark:text-slate-300 truncate max-w-[360px]">
                                    {{ i.target || '-' }}
                                </td>
                                <td class="px-2 py-3 font-mono text-slate-600 dark:text-slate-300">{{ i.estimatedMinutes
                                    }}</td>
                                <td class="px-2 py-3 text-slate-700 dark:text-slate-200">{{ i.required ? 'Sim' : 'Não'
                                    }}</td>
                                <td class="px-2 py-3 text-right">
                                    <button
                                        class="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                        @click="openEditItem(i)">
                                        Editar
                                    </button>

                                    <button
                                        class="ml-2 rounded-xl border border-rose-200 dark:border-rose-900/50 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition"
                                        @click="removeItem(i.id)">
                                        Remover
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-2">
                    <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Reordenar por IDs (ex: 12,10,11)
                    </div>

                    <div class="flex gap-2">
                        <input v-model="reorderRaw"
                            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                            placeholder="12,10,11" />
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                            @click="applyReorder">
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- VÍNCULOS -->
        <section v-else-if="tab === 'assignments'"
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
            <AssignmentsPanel :slug="slug" />
        </section>

        <!-- PREVIEW -->
        <section v-else
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4">
            <TrackPreviewPanel :track="track" :items="items" />
        </section>


        <!-- MODAIS -->
        <TrackEditorModal v-model:open="trackEditorOpen" mode="edit" :initial="detail?.track || null"
            @saved="onTrackSaved" />
        <ItemEditorModal v-model:open="itemEditorOpen" :mode="itemMode" :initial="itemInitial" @saved="onItemPayload" />
    </div>

    <!-- Modal -->
    <dialog v-if="openDelete" open class="fixed inset-0 z-50">
        <div class="fixed inset-0 bg-black/50" @click="openDelete = false"></div>

        <div class="fixed inset-0 flex items-center justify-center p-4">
            <div class="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                @click.stop>
                <header class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 class="text-base font-semibold text-slate-900 dark:text-white">Excluir trilha</h3>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Esta ação é permanente. Para confirmar, digite o slug:
                        <span class="font-mono">{{ track?.slug }}</span>
                    </p>
                </header>

                <section class="p-6 space-y-3">
                    <input v-model="deleteConfirm"
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                        placeholder="Digite o slug exatamente" />

                    <div v-if="deleteError"
                        class="rounded-2xl border border-rose-200 dark:border-rose-900/50 p-4 text-sm text-rose-700 dark:text-rose-400">
                        {{ deleteError }}
                    </div>
                </section>

                <footer class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        @click="openDelete = false">
                        Cancelar
                    </button>

                    <button
                        class="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                        :disabled="deleting || deleteConfirm !== String(track?.slug || '')" @click="deleteTrack">
                        {{ deleting ? 'Excluindo...' : 'Excluir definitivamente' }}
                    </button>
                </footer>
            </div>
        </div>
    </dialog>

</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyTracksAdminStore } from '@/stores/Academy/academyTracksAdminStore';

import AssignmentsPanel from '@/views/Academy/Admin/Tracks/components/AssignmentsPanel.vue';
import TrackEditorModal from '@/views/Academy/Admin/Tracks/components/TrackEditorModal.vue';
import ItemEditorModal from '@/views/Academy/Admin/Tracks/components/ItemEditorModal.vue';
import TrackPreviewPanel from '@/views/Academy/Admin/Tracks/components/TrackPreviewPanel.vue';

defineProps({
  slug: {
    type: String,
    required: false // ou true, dependendo da sua lógica
  }
})

const route = useRoute();
const router = useRouter();
const store = useAcademyTracksAdminStore();

const slug = computed(() => String(route.params.slug || ''));
const track = computed(() => store.detail?.track || null);

// NÃO mexe no onMounted(reload), então definimos tab inicial aqui:
const tab = ref(String(route.query?.tab || '') === 'assignments' ? 'assignments' : 'items');

const trackEditorOpen = ref(false);

const itemEditorOpen = ref(false);
const itemMode = ref('create'); // create|edit
const itemInitial = ref(null);

const reorderRaw = ref('');
// DELETE (store)
const openDelete = ref(false);
const deleteConfirm = ref('');
const deleteError = ref(null);
const deleting = ref(false);

watch(openDelete, (v) => {
  if (v) {
    deleteConfirm.value = '';
    deleteError.value = null;
  }
});

async function deleteTrack() {
  deleteError.value = null;
  deleting.value = true;

  try {
    const s = String(track.value?.slug || '');
    if (!s) throw new Error('Slug inválido.');
    if (deleteConfirm.value !== s) throw new Error('Confirmação inválida. Digite o slug exatamente.');

    await store.removeTrack(s);

    openDelete.value = false;

    // IMPORTANTE: sair da tela do slug excluído
    router.replace({ name: 'AcademyTracksAdmin' });
  } catch (e) {
    deleteError.value = e?.message || 'Erro ao excluir trilha.';
    throw e;
  } finally {
    deleting.value = false;
  }
}

const detail = computed(() => store.detail);
const items = computed(() => {
    const arr = Array.isArray(store.detail?.items) ? store.detail.items : [];
    return arr.slice().sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
});

async function reload() {
    if (!slug.value) return;
    await store.fetchDetail(slug.value);
    reorderRaw.value = items.value.map(i => i.id).join(',');
}

function openEditTrack() {
    trackEditorOpen.value = true;
}

async function togglePublish() {
    const publish = detail.value?.track?.status !== 'PUBLISHED';
    await store.setPublish(slug.value, publish);
}

async function onTrackSaved() {
    trackEditorOpen.value = false;
    await store.fetchDetail(slug.value);
    await store.fetchList();
}

function openAddItem() {
    itemMode.value = 'create';
    itemInitial.value = null;
    itemEditorOpen.value = true;
}

function openEditItem(i) {
    itemMode.value = 'edit';
    itemInitial.value = i;
    itemEditorOpen.value = true;
}

async function onItemPayload(payload) {
    if (itemMode.value === 'edit') {
        const id = Number(itemInitial.value?.id);
        await store.updateItem(slug.value, id, payload);
    } else {
        await store.addItem(slug.value, payload);
    }

    itemEditorOpen.value = false;
    await store.fetchDetail(slug.value);
    reorderRaw.value = items.value.map(i => i.id).join(',');
}

async function removeItem(itemId) {
    if (!confirm('Remover item?')) return;
    await store.removeItem(slug.value, itemId);
    await store.fetchDetail(slug.value);
    reorderRaw.value = items.value.map(i => i.id).join(',');
}

async function applyReorder() {
    const ids = String(reorderRaw.value || '')
        .split(',')
        .map(s => Number(String(s).trim()))
        .filter(n => Number.isFinite(n) && n > 0);

    if (!ids.length) return;

    await store.reorderItems(slug.value, ids);
    reorderRaw.value = items.value.map(i => i.id).join(',');
}

// MANTIDO como você pediu:
onMounted(reload);
watch(slug, reload);

// opcional: se o usuário mudar query tab sem trocar rota, mantém o tab sincronizado
watch(
    () => route.query?.tab,
    (v) => {
        const t = String(v || '');
        if (t === 'assignments') tab.value = 'assignments';
        if (t === 'items') tab.value = 'items';
    }
);
</script>
