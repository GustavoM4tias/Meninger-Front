<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import ProgressRing from './components/ProgressRing.vue';
import ChecklistTable from './components/ChecklistTable.vue';
import ChecklistBoard from './components/ChecklistBoard.vue';
// Linha do tempo temporariamente oculta (a pedido). Reative o import + a opção em
// VIEW_MODES + o render abaixo quando voltar a ser usada.
// import ChecklistTimeline from './components/ChecklistTimeline.vue';
import TaskDrawer from './components/TaskDrawer.vue';
import ChecklistCobrancaModal from './components/ChecklistCobrancaModal.vue';
import ChecklistSettingsModal from './components/ChecklistSettingsModal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const store = useChecklistStore();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const isAdmin = computed(() => auth.user?.role === 'admin' || (typeof auth.hasRole === 'function' && auth.hasRole('admin')));

const viewMode = ref('table');
const openTaskId = ref(null);
const showCobranca = ref(false);
const showSettings = ref(false);

function onDeleted() { showSettings.value = false; router.push('/checklists'); }

// Gating de autorização: a tabela/quadro bloqueia mudar p/ status barrado → pergunta.
async function confirmApprovalPrompt() {
    const id = store.approvalPrompt?.taskId;
    if (id) { try { await store.submitForApproval(id); } catch (e) { store.error = e.message; } }
}

const fmt = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '-');

const checklist = computed(() => store.current?.checklist || null);
const progress = computed(() => checklist.value?.progress || checklist.value?.progress_cache || {});
const keyDates = computed(() => (checklist.value?.key_dates || []).filter((k) => k.date));
const statuses = computed(() => store.current?.statuses || []);
const reminderLabel = computed(() => ({ DEFAULT: 'Padrão', CUSTOM: 'Personalizada', OFF: 'Desligada' }[checklist.value?.reminder_mode] || 'Padrão'));

onMounted(async () => {
    store.clearSelection();
    if (!store.users.length) store.loadUsers();
    await store.openChecklist(route.params.id);
    if (route.query.task) openTaskId.value = Number(route.query.task);
});
watch(() => route.params.id, (id) => { if (id) { store.clearSelection(); store.openChecklist(id); } });

function openTask(id) { openTaskId.value = id; router.replace({ query: { ...route.query, task: id } }); }
function closeTask() { openTaskId.value = null; const q = { ...route.query }; delete q.task; router.replace({ query: q }); }

// ── Filtros do checklist (aplicados à Tabela) ──
const filter = ref({ search: '', statuses: [], assignees: [], onlyOverdue: false, hideDone: false });
const statusOptions = computed(() => statuses.value.map((s) => s.label));
const assigneeOptions = computed(() => {
    const set = new Set();
    (store.current?.tasks || []).forEach((t) => {
        if (t.assignee?.username) set.add(t.assignee.username);
        else if (t.assignee_label) set.add(t.assignee_label);
        else set.add('Sem responsável');
    });
    return Array.from(set).sort();
});
const filterCount = computed(() => filter.value.statuses.length + filter.value.assignees.length + (filter.value.onlyOverdue ? 1 : 0) + (filter.value.hideDone ? 1 : 0) + (filter.value.search.trim() ? 1 : 0));
function clearFilters() { filter.value = { search: '', statuses: [], assignees: [], onlyOverdue: false, hideDone: false }; }

const VIEW_MODES = [
    { value: 'table', label: 'Tabela', icon: 'fas fa-table-list' },
    { value: 'board', label: 'Quadro', icon: 'fas fa-columns' },
    // { value: 'timeline', label: 'Linha do tempo', icon: 'fas fa-chart-gantt' }, // oculto por enquanto
];
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
                            <p class="text-sm text-ink-muted">
                                {{ checklist.display_name || (checklist.idempreendimento ? 'Empreendimento #' + checklist.idempreendimento : '') }}
                                <span v-if="checklist.cost_center" class="text-ink-subtle"><i class="fas fa-hashtag text-[10px]"></i> CC {{ checklist.cost_center }}</span>
                            </p>
                            <div class="flex items-center gap-4 mt-1 text-xs text-ink-muted flex-wrap">
                                <span><i class="fas fa-list-ul"></i> {{ progress.done || 0 }}/{{ progress.total || 0 }}</span>
                                <span v-if="(progress.overdue || 0) > 0" class="text-red-500 font-semibold"><i class="fas fa-triangle-exclamation"></i> {{ progress.overdue }} em atraso</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <div v-if="isAdmin" class="flex items-center gap-2">
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

            <!-- Switcher + filtros -->
            <div class="mb-4 space-y-2.5">
                <SegmentedControl :model-value="viewMode" :options="VIEW_MODES" @update:model-value="viewMode = $event" />

                <div v-if="viewMode === 'table'" class="flex flex-wrap items-center gap-2">
                    <div class="relative w-full sm:w-72">
                        <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
                        <input v-model="filter.search" placeholder="Buscar tarefa..."
                            class="w-full pl-8 pr-3 h-9 text-sm rounded-lg border border-line bg-surface-raised text-ink shadow-inner-soft placeholder:text-ink-subtle outline-none focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20 transition-all" />
                    </div>
                    <div class="w-full sm:w-44 shrink-0"><MultiSelector :options="statusOptions" v-model="filter.statuses" placeholder="Status" /></div>
                    <div class="w-full sm:w-44 shrink-0"><MultiSelector :options="assigneeOptions" v-model="filter.assignees" placeholder="Responsável" /></div>
                    <button @click="filter.onlyOverdue = !filter.onlyOverdue" type="button"
                        class="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm border transition shrink-0"
                        :class="filter.onlyOverdue ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' : 'text-ink-muted border-line hover:bg-surface-sunken'">
                        <i class="fas fa-triangle-exclamation text-xs"></i> Em atraso
                    </button>
                    <button @click="filter.hideDone = !filter.hideDone" type="button"
                        class="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm border transition shrink-0"
                        :class="filter.hideDone ? 'bg-accent-soft text-accent border-accent/30' : 'text-ink-muted border-line hover:bg-surface-sunken'">
                        <i class="fas fa-eye-slash text-xs"></i> Ocultar concluídas
                    </button>
                    <button v-if="filterCount" @click="clearFilters" type="button" class="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-ink-muted hover:bg-surface-sunken border border-transparent shrink-0">
                        <i class="fas fa-xmark"></i> limpar ({{ filterCount }})
                    </button>
                </div>
            </div>

            <transition name="view-fade" mode="out-in">
                <ChecklistTable v-if="viewMode === 'table'" key="table" :filter="filter" :is-admin="isAdmin" @open-task="openTask" />
                <ChecklistBoard v-else key="board" :is-admin="isAdmin" @open-task="openTask" />
            </transition>

            <TaskDrawer v-if="openTaskId" :task-id="openTaskId" @close="closeTask" @changed="() => {}" />
            <ChecklistCobrancaModal v-if="showCobranca" @close="showCobranca = false" />
            <ChecklistSettingsModal v-if="showSettings" @close="showSettings = false" @deleted="onDeleted" />

            <!-- Gating: enviar para aprovação ao tentar avançar um status barrado -->
            <Modal :open="!!store.approvalPrompt" size="sm" title="Autorização necessária" @close="store.clearApprovalPrompt()">
                <div class="flex items-start gap-3">
                    <span class="h-9 w-9 grid place-items-center rounded-full bg-accent-soft text-accent shrink-0"><i class="fas fa-user-shield"></i></span>
                    <p class="text-sm text-ink-muted">Esta tarefa precisa passar por autorização antes de avançar para esse status. Enviar para aprovação agora?</p>
                </div>
                <template #footer>
                    <Button variant="ghost" size="sm" @click="store.clearApprovalPrompt()">Cancelar</Button>
                    <Button variant="primary" size="sm" icon="fas fa-paper-plane" @click="confirmApprovalPrompt">Enviar para aprovação</Button>
                </template>
            </Modal>
        </template>
    </div>
</template>

<style scoped>
/* Troca suave entre Tabela e Quadro */
.view-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.view-fade-leave-active { transition: opacity 0.12s ease; }
.view-fade-enter-from { opacity: 0; transform: translateY(6px); }
.view-fade-leave-to { opacity: 0; }
</style>
