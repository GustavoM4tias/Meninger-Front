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
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Badge from '@/components/UI/Badge.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import { useCan } from '@/composables/useCan';

const store = useChecklistStore();
const route = useRoute();
const router = useRouter();
// Ações desta tela (lib/screenCapabilities.js no back): view segue a alçada,
// manage é admin. Ver composables/useCan.js.
const can = useCan('/checklists');

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
    <PageContainer size="xl">
        <!-- Carregando: o esqueleto tem a forma do cabeçalho e da tabela, para a
             tela não saltar quando o checklist chega. -->
        <div v-if="store.loading" class="space-y-4">
            <div class="flex items-center gap-4">
                <Skeleton variant="circle" class="w-12 h-12" />
                <div class="flex-1 space-y-2">
                    <Skeleton variant="title" class="max-w-sm" />
                    <Skeleton variant="text" class="max-w-xs" />
                </div>
            </div>
            <Skeleton variant="row" />
            <Skeleton variant="table" />
        </div>

        <EmptyState v-else-if="!checklist" icon="fas fa-clipboard-question"
            title="Checklist não encontrado"
            description="Ele pode ter sido excluído, ou o endereço está errado.">
            <template #actions>
                <Button icon="fas fa-arrow-left" @click="router.push('/checklists')">Voltar para Checklists</Button>
            </template>
        </EmptyState>

        <template v-else>
            <PageHeader>
                <template #title>
                    <!-- O anel de progresso É o ícone da tela: o número que
                         importa aqui é quanto já foi feito. -->
                    <ProgressRing :pct="progress.pct || 0" :size="40" :stroke="5" class="shrink-0" />
                    <span class="truncate">{{ checklist.title }}</span>
                    <Badge v-if="checklist.status === 'draft'" variant="warning" size="sm">Rascunho</Badge>
                    <Badge v-else-if="checklist.status === 'done'" variant="success" size="sm">Concluído</Badge>
                </template>
                <template #subtitle>
                    <span class="inline-flex items-center gap-x-3 gap-y-1 flex-wrap">
                        <span v-if="checklist.display_name || checklist.idempreendimento">
                            {{ checklist.display_name || ('Empreendimento #' + checklist.idempreendimento) }}
                        </span>
                        <span v-if="checklist.cost_center" class="text-ink-subtle">
                            <i class="fas fa-hashtag text-micro"></i> CC {{ checklist.cost_center }}
                        </span>
                        <span class="font-mono tabular-nums">
                            <i class="fas fa-list-ul text-micro"></i>
                            {{ progress.done || 0 }}/{{ progress.total || 0 }}
                        </span>
                        <span v-if="(progress.overdue || 0) > 0" class="text-data-neg font-semibold">
                            <i class="fas fa-triangle-exclamation text-micro"></i>
                            {{ progress.overdue }} em atraso
                        </span>
                    </span>
                </template>
                <template #actions>
                    <PageHelp
                        storage-key="checklist-detalhe"
                        title="Como usar o checklist"
                        intro="A tarefa é a unidade: cada uma tem responsável, prazo, status e histórico. O anel no topo é a fatia já concluída — status Cancelada/N-A fica fora dessa conta."
                        :steps="[
                            { title: 'Escolha a visão', text: 'Tabela mostra tudo agrupado por seção e deixa editar em linha. Quadro arrasta a tarefa entre status.' },
                            { title: 'Filtre', text: 'Busca, status, responsável, só em atraso e ocultar concluídas. Os filtros valem para a Tabela.' },
                            { title: 'Abra a tarefa', text: 'Clique na linha ou no cartão. O painel abre com comentários, anexos e histórico, e só grava quando você Salva.' },
                            { title: 'Edite em lote', text: 'Na Tabela, marque várias linhas da seção para trocar status, responsável, prioridade ou deslocar prazos de uma vez.' },
                        ]"
                        :tips="[
                            'Tarefa com responsável em TEXTO não aparece em Minhas Tarefas: vincule a um usuário no seletor para a cobrança achar a pessoa.',
                            'Cobrança diz qual régua vale para este checklist: padrão, personalizada ou desligada.',
                            'Concluir uma tarefa é definitivo: ela não volta para outras etapas.',
                        ]" />
                    <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="router.push('/checklists')">
                        <span class="hidden sm:inline">Checklists</span>
                    </Button>
                    <template v-if="can('manage')">
                        <Button variant="outline" size="sm" icon="fas fa-gear" @click="showSettings = true">
                            <span class="hidden sm:inline">Configurar</span>
                        </Button>
                        <Button variant="outline" size="sm" icon="fas fa-bell" @click="showCobranca = true"
                            v-tippy="'Qual régua de cobrança vale para este checklist'">
                            <span class="hidden sm:inline">Cobrança: {{ reminderLabel }}</span>
                        </Button>
                    </template>
                </template>
            </PageHeader>

            <!-- Marcos: datas de referência do checklist -->
            <div v-if="keyDates.length" class="flex flex-wrap gap-2 mb-4">
                <div v-for="k in keyDates" :key="k.key"
                    class="bg-surface-sunken border border-line rounded-lg px-3 py-1.5 text-xs">
                    <span class="text-ink-muted block text-micro uppercase tracking-wider">{{ k.label }}</span>
                    <span class="font-semibold text-ink font-mono tabular-nums">{{ fmt(k.date) }}</span>
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
                        :class="filter.onlyOverdue ? 'bg-data-neg/10 text-data-neg border-data-neg/30' : 'text-ink-muted border-line hover:bg-surface-sunken'">
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
                <ChecklistTable v-if="viewMode === 'table'" key="table" :filter="filter" :can-manage="can('manage')" @open-task="openTask" />
                <ChecklistBoard v-else key="board" :can-manage="can('manage')" @open-task="openTask" />
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
    </PageContainer>
</template>

<style scoped>
/* Troca suave entre Tabela e Quadro */
.view-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.view-fade-leave-active { transition: opacity 0.12s ease; }
.view-fade-enter-from { opacity: 0; transform: translateY(6px); }
.view-fade-leave-to { opacity: 0; }
</style>
