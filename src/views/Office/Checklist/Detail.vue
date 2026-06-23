<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import ProgressRing from './components/ProgressRing.vue';
import ChecklistTable from './components/ChecklistTable.vue';
import ChecklistBoard from './components/ChecklistBoard.vue';
import ChecklistTimeline from './components/ChecklistTimeline.vue';
import TaskDrawer from './components/TaskDrawer.vue';
import ChecklistCobrancaModal from './components/ChecklistCobrancaModal.vue';
import ChecklistSettingsModal from './components/ChecklistSettingsModal.vue';

const store = useChecklistStore();
const route = useRoute();
const router = useRouter();

const viewMode = ref('table');
const openTaskId = ref(null);
const showCobranca = ref(false);
const showSettings = ref(false);
const shiftN = ref(7);

function onDeleted() { showSettings.value = false; router.push('/checklists'); }

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const fmt = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '-');

const checklist = computed(() => store.current?.checklist || null);
const progress = computed(() => checklist.value?.progress || checklist.value?.progress_cache || {});
const keyDates = computed(() => (checklist.value?.key_dates || []).filter((k) => k.date));
const statuses = computed(() => store.current?.statuses || []);
const reminderLabel = computed(() => ({ DEFAULT: 'Padrão', CUSTOM: 'Personalizada', OFF: 'Desligada' }[checklist.value?.reminder_mode] || 'Padrão'));
const selCount = computed(() => store.selectedIds.length);

onMounted(async () => {
    store.clearSelection();
    if (!store.users.length) store.loadUsers();
    await store.openChecklist(route.params.id);
    if (route.query.task) openTaskId.value = Number(route.query.task);
});
watch(() => route.params.id, (id) => { if (id) { store.clearSelection(); store.openChecklist(id); } });

function openTask(id) { openTaskId.value = id; router.replace({ query: { ...route.query, task: id } }); }
function closeTask() { openTaskId.value = null; const q = { ...route.query }; delete q.task; router.replace({ query: q }); }

// Edição em cascata
function bulkStatus(e) { store.bulkApply({ status_id: Number(e.target.value) || null }); }
function bulkAssignee(e) { store.bulkApply({ assignee_user_id: Number(e.target.value) || null }); }
function bulkPriority(e) { if (e.target.value) store.bulkApply({ priority: e.target.value }); }
function bulkDue(e) { store.bulkApply({ due_date: e.target.value || null }); }
function bulkShift() { store.bulkApply({ shiftDays: Number(shiftN.value) || 0 }); }
function bulkDelete() { if (confirm(`Excluir ${selCount.value} tarefa(s) selecionada(s)?`)) store.bulkApply({ delete: true }); }

const ctrlCls = 'text-xs rounded-lg border border-line bg-surface text-ink px-2 py-1 focus-ring';
</script>

<template>
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
        <div v-if="store.loading" class="text-center text-ink-subtle py-16"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>
        <div v-else-if="!checklist" class="text-center text-ink-subtle py-16">Checklist não encontrado.</div>

        <template v-else>
            <!-- Cabeçalho -->
            <div class="mb-5">
                <button @click="router.push('/checklists')" class="text-sm text-ink-muted hover:text-ink mb-2"><i class="fas fa-arrow-left"></i> Checklists</button>
                <div class="flex items-start justify-between flex-wrap gap-4">
                    <div class="flex items-center gap-4">
                        <ProgressRing :pct="progress.pct || 0" :size="64" :stroke="6" />
                        <div>
                            <h1 class="text-xl md:text-2xl font-bold text-ink flex items-center gap-2 flex-wrap">
                                {{ checklist.title }}
                                <span v-if="checklist.status === 'draft'" class="text-[11px] font-semibold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md">Rascunho</span>
                                <span v-else-if="checklist.status === 'done'" class="text-[11px] font-semibold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">Concluído</span>
                            </h1>
                            <p class="text-sm text-ink-muted">{{ checklist.display_name || (checklist.idempreendimento ? 'Empreendimento #' + checklist.idempreendimento : '') }}</p>
                            <div class="flex items-center gap-4 mt-1 text-xs text-ink-muted flex-wrap">
                                <span><i class="fas fa-list-ul"></i> {{ progress.done || 0 }}/{{ progress.total || 0 }}</span>
                                <span v-if="(progress.overdue || 0) > 0" class="text-red-500 font-semibold"><i class="fas fa-triangle-exclamation"></i> {{ progress.overdue }} em atraso</span>
                                <span><i class="fas fa-coins"></i> {{ brl(progress.budget) }}<span v-if="progress.budget_monthly"> + {{ brl(progress.budget_monthly) }}/mês</span></span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <div class="flex items-center gap-2">
                            <button @click="showSettings = true" class="inline-flex items-center gap-2 text-xs border border-line rounded-lg px-3 py-1.5 text-ink-muted hover:bg-surface-sunken focus-ring">
                                <i class="fas fa-gear"></i> Configurar
                            </button>
                            <button @click="showCobranca = true" class="inline-flex items-center gap-2 text-xs border border-line rounded-lg px-3 py-1.5 text-ink-muted hover:bg-surface-sunken focus-ring">
                                <i class="fas fa-bell text-amber-500"></i> Cobrança: <span class="font-semibold text-ink">{{ reminderLabel }}</span>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-2 justify-end">
                            <div v-for="k in keyDates" :key="k.key" class="bg-surface-sunken rounded-lg px-3 py-1.5 text-xs">
                                <span class="text-ink-muted block">{{ k.label }}</span>
                                <span class="font-semibold text-ink">{{ fmt(k.date) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Switcher -->
            <div class="flex items-center gap-2 mb-4">
                <div class="inline-flex rounded-lg border border-line overflow-hidden">
                    <button @click="viewMode = 'table'" class="px-3 py-1.5 text-sm focus-ring" :class="viewMode === 'table' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'"><i class="fas fa-table-list"></i> Tabela</button>
                    <button @click="viewMode = 'board'" class="px-3 py-1.5 text-sm focus-ring" :class="viewMode === 'board' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'"><i class="fas fa-columns"></i> Quadro</button>
                    <button @click="viewMode = 'timeline'" class="px-3 py-1.5 text-sm focus-ring" :class="viewMode === 'timeline' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'"><i class="fas fa-chart-gantt"></i> Linha do tempo</button>
                </div>
            </div>

            <ChecklistTable v-if="viewMode === 'table'" @open-task="openTask" />
            <ChecklistBoard v-else-if="viewMode === 'board'" @open-task="openTask" />
            <ChecklistTimeline v-else @open-task="openTask" />

            <TaskDrawer v-if="openTaskId" :task-id="openTaskId" @close="closeTask" @changed="() => {}" />
            <ChecklistCobrancaModal v-if="showCobranca" @close="showCobranca = false" />
            <ChecklistSettingsModal v-if="showSettings" @close="showSettings = false" @deleted="onDeleted" />
        </template>
    </div>
</template>
