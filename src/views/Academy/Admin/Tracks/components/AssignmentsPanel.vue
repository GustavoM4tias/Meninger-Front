<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAcademyTrackAssignmentsAdminStore } from '@/stores/Academy/academyTrackAssignmentsAdminStore';
import TrackAssignmentsModal from './TrackAssignmentsModal.vue';

const props = defineProps({ slug: { type: String, required: true } });

const store = useAcademyTrackAssignmentsAdminStore();

const openModal = ref(false);

const list = computed(() => store.bySlug[props.slug] || []);

function formatDate(v) {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString('pt-BR');
}

async function load() {
    await store.fetch(props.slug);
}

async function remove(id) {
    if (!confirm('Remover vínculo?')) return;
    await store.remove(props.slug, id);
    await load();
}

function open() {
    openModal.value = true;
}

onMounted(load);
watch(() => props.slug, load);
</script>

<template>
    <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
            <div>
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Vínculos</h3>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Se houver vínculos, a trilha só aparece para quem casar em Cargo/Depto/Cidade/Usuário.
                </p>
            </div>

            <button
                class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:opacity-90 transition"
                @click="open">
                Vincular
            </button>
        </div>

        <div v-if="store.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ store.error }}
        </div>

        <div
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                    <tr>
                        <th class="px-4 py-3 text-left font-medium">Tipo</th>
                        <th class="px-4 py-3 text-left font-medium">Valor</th>
                        <th class="px-4 py-3 text-left font-medium">Obrigatório</th>
                        <th class="px-4 py-3 text-left font-medium">Criado</th>
                        <th class="px-4 py-3 text-right font-medium"></th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="a in list" :key="a.id" class="border-t border-slate-100 dark:border-slate-800">
                        <td class="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">{{ a.scopeType }}</td>
                        <td class="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">{{ a.scopeValue }}</td>
                        <td class="px-4 py-3 text-slate-700 dark:text-slate-200">{{ a.required ? 'Sim' : 'Não' }}</td>
                        <td class="px-4 py-3 text-slate-500 dark:text-slate-400">{{ formatDate(a.createdAt) }}</td>
                        <td class="px-4 py-3 text-right">
                            <button
                                class="rounded-xl border border-rose-200 dark:border-rose-900/50 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition"
                                @click="remove(a.id)">
                                Remover
                            </button>
                        </td>
                    </tr>

                    <tr v-if="!list.length">
                        <td colspan="5" class="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                            Sem vínculos
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <TrackAssignmentsModal v-model:open="openModal" :trackSlug="slug" @changed="load" />
    </div>
</template>
