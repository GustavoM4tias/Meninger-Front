<script setup>
import { ref, computed, onMounted, onActivated, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import ProgressRing from './components/ProgressRing.vue';
import EnterprisePicker from './components/EnterprisePicker.vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Badge from '@/components/UI/Badge.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const store = useChecklistStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const auth = useAuthStore();
const isAdmin = computed(() => auth.user?.role === 'admin' || (typeof auth.hasRole === 'function' && auth.hasRole('admin')));
const showApprovals = computed(() => !!store.approvalMe?.isApprover || isAdmin.value);
const TABS = computed(() => ['Painel', 'Checklists', 'Minhas Tarefas', ...(showApprovals.value ? ['Aprovações'] : [])]);
const pendingApprovals = computed(() => store.pendingApprovals || []);
function goAdmin() { router.push('/checklists/cobranca'); }

const tab = ref(route.query.section || 'Checklists');
watch(() => route.query.section, (s) => { if (s) tab.value = s; });
watch(tab, (t) => { if (t === 'Aprovações') store.loadPendingApprovals(); });

async function refreshHome() { await store.loadHome(); if (showApprovals.value) store.loadPendingApprovals(); }
onMounted(refreshHome);
onActivated(refreshHome); // recarrega ao voltar (keep-alive) — reflete tarefas recém-atribuídas

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const fmt = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '-');
const today = dayjs().format('YYYY-MM-DD');

const summary = computed(() => store.dashboard.summary || {});
const myTasks = computed(() => store.dashboard.myTasks || []);
const myOverdue = computed(() => myTasks.value.filter((t) => t.due_date && t.due_date < today && t.state_class !== 'DONE'));
const byStatus = computed(() => store.dashboard.byStatus || {});
const byAssignee = computed(() => store.dashboard.byAssignee || []);
const dueSoon = computed(() => store.dashboard.dueSoon || []);
const overdueAll = computed(() => store.dashboard.overdue || []);
const statusTotal = computed(() => Object.values(byStatus.value).reduce((a, b) => a + (b || 0), 0));
const STATUS_SEG = [
    { k: 'DONE', l: 'Concluídas', c: '#22c55e' },
    { k: 'IN_PROGRESS', l: 'Em andamento', c: '#3b82f6' },
    { k: 'BLOCKED', l: 'Bloqueadas', c: '#ef4444' },
    { k: 'TODO', l: 'A fazer', c: '#94a3b8' },
];

// ── Metadados visuais (estado/prioridade/prazo) ──
const SC_META = {
    DONE: { c: '#22c55e', l: 'Concluída', badge: 'success' },
    IN_PROGRESS: { c: '#3b82f6', l: 'Em andamento', badge: 'info' },
    BLOCKED: { c: '#ef4444', l: 'Bloqueada', badge: 'danger' },
    TODO: { c: '#94a3b8', l: 'A fazer', badge: 'neutral' },
    CANCELLED: { c: '#9ca3af', l: 'N/A', badge: 'neutral' },
};
const scColor = (sc) => (SC_META[sc] || SC_META.TODO).c;
const PRIORITY = { URGENT: { l: 'Urgente', v: 'danger' }, HIGH: { l: 'Alta', v: 'warning' }, MEDIUM: { l: 'Média', v: 'info' }, LOW: { l: 'Baixa', v: 'neutral' } };
function daysFromToday(d) { return dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day'); }
function dueLabel(d) {
    if (!d) return 'sem prazo';
    const n = daysFromToday(d);
    if (n < 0) return `atrasada ${Math.abs(n)}d`;
    if (n === 0) return 'vence hoje';
    if (n === 1) return 'vence amanhã';
    return `vence em ${n}d`;
}

// ── Filtros do Painel (escopam entregas + por responsável) ──
const pnlChecklists = ref([]);
const pnlAssignees = ref([]);
const pnlChecklistOptions = computed(() => store.checklists.map((c) => c.title));
const pnlAssigneeOptions = computed(() => byAssignee.value.map((a) => a.name));
const pnlActive = computed(() => pnlChecklists.value.length + pnlAssignees.value.length);
function matchEntrega(t) {
    if (pnlChecklists.value.length && !pnlChecklists.value.includes(t.checklistTitle)) return false;
    if (pnlAssignees.value.length && !pnlAssignees.value.includes(t.assignee || 'Sem responsável')) return false;
    return true;
}
const overdueF = computed(() => overdueAll.value.filter(matchEntrega));
const dueSoonF = computed(() => dueSoon.value.filter(matchEntrega));
const byAssigneeF = computed(() => (pnlAssignees.value.length ? byAssignee.value.filter((a) => pnlAssignees.value.includes(a.name)) : byAssignee.value));
function clearPnl() { pnlChecklists.value = []; pnlAssignees.value = []; }

// ── Filtros de Minhas Tarefas ──
const mtSearch = ref('');
const mtState = ref('open');
const mtChecklist = ref('');
const mtPriorities = ref([]);
const mtSort = ref('due');
const MT_PRIORITY_OPTS = ['Urgente', 'Alta', 'Média', 'Baixa'];
const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const myChecklistsOptions = computed(() => {
    const map = new Map();
    myTasks.value.forEach((t) => { if (t.checklist) map.set(t.checklist.id, t.checklist.title); });
    return Array.from(map, ([id, title]) => ({ id, title }));
});
// Contadores por estado (alimentam os chips do filtro).
const mtCounts = computed(() => {
    const c = { all: myTasks.value.length, open: 0, overdue: 0, done: 0 };
    myTasks.value.forEach((t) => {
        if (t.state_class === 'DONE') c.done++;
        else if (t.state_class !== 'CANCELLED') { c.open++; if (t.due_date && t.due_date < today) c.overdue++; }
    });
    return c;
});
const MT_FILTERS = computed(() => [
    { value: 'all', label: 'Todas', count: mtCounts.value.all },
    { value: 'open', label: 'Abertas', count: mtCounts.value.open },
    { value: 'overdue', label: 'Em atraso', count: mtCounts.value.overdue },
    { value: 'done', label: 'Concluídas', count: mtCounts.value.done },
]);
const filteredMyTasks = computed(() => {
    let list = myTasks.value;
    if (mtChecklist.value) list = list.filter((t) => String(t.checklist_id) === String(mtChecklist.value));
    if (mtState.value === 'open') list = list.filter((t) => t.state_class !== 'DONE' && t.state_class !== 'CANCELLED');
    else if (mtState.value === 'overdue') list = list.filter((t) => t.due_date && t.due_date < today && t.state_class !== 'DONE' && t.state_class !== 'CANCELLED');
    else if (mtState.value === 'done') list = list.filter((t) => t.state_class === 'DONE');
    if (mtPriorities.value.length) list = list.filter((t) => mtPriorities.value.includes(PRIORITY[t.priority]?.l));
    const q = mtSearch.value.trim().toLowerCase();
    if (q) list = list.filter((t) => (t.title || '').toLowerCase().includes(q) || (t.checklist?.title || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q));
    const arr = [...list];
    if (mtSort.value === 'priority') arr.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
    else arr.sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
    return arr;
});

function nextKeyDate(c) {
    const ks = (c.key_dates || []).filter((k) => k.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return ks.find((k) => k.date >= today) || ks[ks.length - 1] || null;
}

// ── Busca na lista de Checklists ──
const clSearch = ref('');
const filteredChecklists = computed(() => {
    const q = clSearch.value.trim().toLowerCase();
    if (!q) return store.checklists;
    return store.checklists.filter((c) => (c.title || '').toLowerCase().includes(q) || (c.display_name || '').toLowerCase().includes(q));
});

// ── Importar Excel ──
const importing = ref(false);
async function onImport(ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    importing.value = true;
    try {
        const r = await store.importExcel(f);
        toast.success(`Importado: ${r.tasks} tarefas em ${r.sections} seções.`);
        router.push(`/checklists/${r.id}`);
    } catch (e) { toast.error(e.message || 'Falha ao importar.'); }
    finally { importing.value = false; ev.target.value = ''; }
}

// ── Novo checklist (modal) ──
const showModal = ref(false);
const step = ref('template');
const selectedTemplate = ref(null);
const form = ref({ title: '', display_name: '', idempreendimento: null, cost_center: '', meeting: '', store_opening: '' });

function openModal() {
    showModal.value = true; step.value = 'template'; selectedTemplate.value = null;
    form.value = { title: '', display_name: '', idempreendimento: null, cost_center: '', meeting: '', store_opening: '' };
    if (!store.templates.length) store.loadTemplates();
}
function pickTemplate(t) { selectedTemplate.value = t; form.value.title = t ? `${t.name}` : ''; step.value = 'fill'; }
function pickBlank() { selectedTemplate.value = null; form.value.title = ''; step.value = 'fill'; }

const keyDates = computed(() => {
    const out = [];
    if (form.value.meeting) out.push({ key: 'meeting', label: 'Meeting', date: form.value.meeting });
    if (form.value.store_opening) out.push({ key: 'store_opening', label: 'Abertura de Loja', date: form.value.store_opening });
    return out;
});

async function submitNew() {
    try {
        if (!form.value.title.trim()) { toast.warning('Dê um título ao checklist.'); return; }
        const payload = { title: form.value.title.trim(), display_name: form.value.display_name.trim() || null, idempreendimento: form.value.idempreendimento || null, cost_center: form.value.cost_center?.trim() || null, key_dates: keyDates.value };
        const res = selectedTemplate.value
            ? await store.createFromTemplate(selectedTemplate.value.id, payload)
            : await store.createBlank(payload);
        showModal.value = false;
        toast.success('Checklist criado!');
        router.push(`/checklists/${res.checklist.id}`);
    } catch (e) { toast.error(e.message || 'Erro ao criar checklist.'); }
}

const btnPrimary = 'inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg shadow-soft focus-ring';
</script>

<template>
    <div class="p-4 md:p-6 max-w-7xl mx-auto bg-surface">
        <!-- Cabeçalho -->
        <div class="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div>
                <h1 class="text-xl md:text-2xl font-bold text-ink flex items-center gap-2">
                    <i class="fas fa-list-check text-accent"></i> Checklists
                </h1>
                <p class="text-sm text-ink-muted">Lançamentos, gestão e cobrança de entregas e demandas.</p>
            </div>
            <div class="flex items-center gap-2">
                <label v-if="isAdmin"
                    class="inline-flex items-center gap-2 bg-surface-raised border border-line text-ink-muted text-sm font-medium px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-sunken focus-ring">
                    <i class="fas fa-file-excel text-emerald-500"></i> {{ importing ? 'Importando...' : 'Importar Excel'
                    }}
                    <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onImport"
                        :disabled="importing" />
                </label>
                <button v-if="isAdmin" @click="openModal" :class="btnPrimary"><i class="fas fa-plus"></i> Novo checklist</button>
                <button v-if="isAdmin" @click="goAdmin" title="Administração (cobrança, status, perfis de autorização)"
                    class="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-line text-ink-muted hover:bg-surface-sunken hover:text-ink focus-ring transition">
                    <i class="fas fa-gear"></i>
                </button>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-line mb-5">
            <button v-for="t in TABS" :key="t" @click="tab = t"
                class="px-4 py-2 text-sm font-medium -mb-px border-b-2 transition focus-ring"
                :class="tab === t ? 'border-accent text-accent' : 'border-transparent text-ink-subtle hover:text-ink'">
                {{ t }}<span v-if="t === 'Aprovações' && pendingApprovals.length" class="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">{{ pendingApprovals.length }}</span>
            </button>
        </div>

        <div v-if="store.loading" class="text-center text-ink-subtle py-16"><i class="fas fa-spinner fa-spin"></i>
            Carregando...</div>

        <!-- PAINEL -->
        <div v-else-if="tab === 'Painel'">
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
                <div class="surface-card p-4 flex items-center gap-3">
                    <span class="h-10 w-10 rounded-xl grid place-items-center bg-accent-soft text-accent shrink-0"><i
                            class="fas fa-clipboard-list"></i></span>
                    <div class="min-w-0">
                        <p class="text-xs text-ink-muted">Checklists ativos</p>
                        <p class="text-2xl font-bold text-ink leading-tight">{{ summary.checklists || 0 }}</p>
                    </div>
                </div>
                <div class="surface-card p-4 flex items-center gap-3">
                    <span class="h-10 w-10 rounded-xl grid place-items-center bg-sky-500/10 text-sky-500 shrink-0"><i
                            class="fas fa-list-check"></i></span>
                    <div class="min-w-0">
                        <p class="text-xs text-ink-muted">Tarefas</p>
                        <p class="text-2xl font-bold text-ink leading-tight">{{ summary.totalTasks || 0 }}</p>
                    </div>
                </div>
                <div class="surface-card p-4 flex items-center gap-3">
                    <ProgressRing :pct="summary.pct || 0" :size="40" :stroke="5" />
                    <div class="min-w-0">
                        <p class="text-xs text-ink-muted">Conclusão</p>
                        <p class="text-2xl font-bold text-ink leading-tight">{{ summary.pct || 0 }}%</p>
                    </div>
                </div>
                <div class="surface-card p-4 flex items-center gap-3">
                    <span class="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                        :class="(summary.totalOverdue || 0) > 0 ? 'bg-red-500/10 text-red-500' : 'bg-surface-sunken text-ink-subtle'"><i
                            class="fas fa-triangle-exclamation"></i></span>
                    <div class="min-w-0">
                        <p class="text-xs text-ink-muted">Em atraso</p>
                        <p class="text-2xl font-bold leading-tight"
                            :class="(summary.totalOverdue || 0) > 0 ? 'text-red-500' : 'text-ink'">{{
                            summary.totalOverdue || 0 }}</p>
                    </div>
                </div>
                <div class="surface-card p-4 flex items-center gap-3">
                    <span
                        class="h-10 w-10 rounded-xl grid place-items-center bg-amber-500/10 text-amber-500 shrink-0"><i
                            class="fas fa-clock"></i></span>
                    <div class="min-w-0">
                        <p class="text-xs text-ink-muted">A vencer (7d)</p>
                        <p class="text-2xl font-bold text-ink leading-tight">{{ dueSoon.length }}</p>
                    </div>
                </div>
                <div class="surface-card p-4 flex items-center gap-3">
                    <span
                        class="h-10 w-10 rounded-xl grid place-items-center bg-emerald-500/10 text-emerald-500 shrink-0"><i
                            class="fas fa-coins"></i></span>
                    <div class="min-w-0">
                        <p class="text-xs text-ink-muted">Orçamento</p>
                        <p class="text-base font-bold text-ink leading-tight truncate"
                            :title="brl(summary.totalBudget)">{{ brl(summary.totalBudget) }}</p>
                        <p v-if="summary.totalMonthly" class="text-[11px] text-ink-subtle">+ {{
                            brl(summary.totalMonthly) }}/mês</p>
                    </div>
                </div>
            </div>

            <!-- Filtros do painel -->
            <div class="flex flex-col items-start gap-1 mb-5">
                <span class="text-xs font-medium text-ink-subtle inline-flex items-center gap-1.5"><i
                        class="fas fa-filter"></i> Filtrar:</span>
                <div class="flex flex-wrap gap-2">
                    <div class="w-52">
                        <MultiSelector :options="pnlChecklistOptions" v-model="pnlChecklists"
                            placeholder="Checklist" />
                    </div>
                    <div class="w-52">
                        <MultiSelector :options="pnlAssigneeOptions" v-model="pnlAssignees" placeholder="Responsável" />
                    </div>
                    <button v-if="pnlActive" @click="clearPnl" type="button"
                        class="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-ink-muted hover:bg-surface-sunken border border-transparent">
                        <i class="fas fa-xmark"></i> limpar ({{ pnlActive }})
                    </button>
                </div>
            </div>

            <!-- Distribuição por status -->
            <div class="surface-card p-4 mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-sm font-semibold text-ink-muted">Distribuição das tarefas</h2>
                    <span class="text-xs text-ink-subtle">{{ statusTotal }} no total</span>
                </div>
                <div class="flex h-3 rounded-full overflow-hidden bg-surface-sunken">
                    <div v-for="seg in STATUS_SEG" :key="seg.k"
                        :style="{ width: (statusTotal ? (byStatus[seg.k] || 0) / statusTotal * 100 : 0) + '%', background: seg.c }"
                        :title="`${seg.l}: ${byStatus[seg.k] || 0}`"></div>
                </div>
                <div class="flex flex-wrap gap-3 mt-2">
                    <span v-for="seg in STATUS_SEG" :key="seg.k" class="flex items-center gap-1 text-xs text-ink-muted">
                        <span class="w-2.5 h-2.5 rounded-full" :style="{ background: seg.c }"></span> {{ seg.l }} ({{
                        byStatus[seg.k] || 0 }})
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <!-- Por responsável -->
                <div class="surface-card p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-sm font-semibold text-ink">Por responsável</h2>
                        <span class="text-xs text-ink-subtle">{{ byAssigneeF.length }} pessoa(s)</span>
                    </div>
                    <div v-if="!byAssigneeF.length" class="text-sm text-ink-subtle py-4 text-center">Sem tarefas para os
                        filtros.</div>
                    <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1">
                        <div v-for="a in byAssigneeF" :key="a.key" class="flex items-center gap-3">
                            <span
                                class="h-7 w-7 rounded-full bg-accent-soft text-accent text-[11px] font-semibold grid place-items-center shrink-0 uppercase">{{
                                    (a.name || '?').slice(0, 2) }}</span>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center justify-between text-xs mb-1 gap-2">
                                    <span class="font-medium text-ink truncate flex items-center gap-1">{{ a.name }}<i
                                            v-if="!a.linked && a.name !== 'Sem responsável'"
                                            class="fas fa-link-slash text-ink-subtle text-[10px]"
                                            title="Responsável por texto (não vinculado a usuário)"></i></span>
                                    <span class="text-ink-muted shrink-0 tabular-nums">{{ a.done }}/{{ a.total }}<span
                                            v-if="a.overdue" class="text-red-500 font-semibold ml-1.5">· {{ a.overdue }}
                                            atras.</span></span>
                                </div>
                                <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                                    <div class="h-full rounded-full transition-all"
                                        :class="a.overdue ? 'bg-amber-500' : 'bg-accent'"
                                        :style="{ width: a.pct + '%' }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Entregas: em atraso + a vencer -->
                <div class="surface-card p-4">
                    <div class="flex items-center gap-2 mb-3">
                        <h2 class="text-sm font-semibold text-ink">Entregas</h2>
                        <Badge v-if="overdueF.length" variant="danger" size="sm">{{ overdueF.length }} em atraso</Badge>
                        <Badge variant="warning" size="sm">{{ dueSoonF.length }} a vencer</Badge>
                    </div>

                    <div class="max-h-[22rem] overflow-y-auto -mx-1 px-1 space-y-3">
                        <div v-if="overdueF.length">
                            <p class="text-[11px] font-semibold uppercase tracking-wide text-red-500/80 mb-1.5">Em
                                atraso</p>
                            <div class="space-y-1">
                                <button v-for="t in overdueF" :key="t.id"
                                    @click="router.push(`/checklists/${t.checklist_id}?task=${t.id}`)"
                                    class="w-full text-left flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-red-500/10 transition group">
                                    <span class="w-1 h-9 rounded-full shrink-0 bg-red-500"></span>
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm text-ink truncate group-hover:text-accent">{{ t.title }}</p>
                                        <p class="text-[11px] text-ink-subtle truncate">{{ t.checklistTitle }} · {{
                                            t.assignee || 's/ resp.' }}</p>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <Badge v-if="t.priority && t.priority !== 'MEDIUM'"
                                            :variant="PRIORITY[t.priority]?.v" size="sm">{{ PRIORITY[t.priority]?.l }}
                                        </Badge>
                                        <p class="text-[11px] text-red-500 font-semibold mt-0.5">{{ dueLabel(t.due_date)
                                            }}</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div v-if="dueSoonF.length">
                            <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle mb-1.5">Próximos
                                7 dias</p>
                            <div class="space-y-1">
                                <button v-for="t in dueSoonF" :key="t.id"
                                    @click="router.push(`/checklists/${t.checklist_id}?task=${t.id}`)"
                                    class="w-full text-left flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-surface-sunken transition group">
                                    <span class="w-1 h-9 rounded-full shrink-0"
                                        :style="{ background: scColor(t.state_class) }"></span>
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm text-ink truncate group-hover:text-accent">{{ t.title }}</p>
                                        <p class="text-[11px] text-ink-subtle truncate">{{ t.checklistTitle }} · {{
                                            t.assignee || 's/ resp.' }}</p>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <Badge v-if="t.priority && t.priority !== 'MEDIUM'"
                                            :variant="PRIORITY[t.priority]?.v" size="sm">{{ PRIORITY[t.priority]?.l }}
                                        </Badge>
                                        <p class="text-[11px] text-ink-muted mt-0.5">{{ dueLabel(t.due_date) }}</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div v-if="!overdueF.length && !dueSoonF.length"
                            class="text-center text-ink-subtle py-8 text-sm">
                            <i class="fas fa-mug-hot text-2xl mb-2 block opacity-50"></i>
                            Nenhuma entrega em atraso ou a vencer.
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CHECKLISTS -->
        <div v-else-if="tab === 'Checklists'">
            <div v-if="!store.checklists.length" class="text-center text-ink-subtle py-16">Nenhum checklist ainda. Crie
                o primeiro a partir de um modelo.</div>
            <template v-else>
                <div class="flex items-center gap-2 mb-4">
                    <div class="relative w-full sm:w-72">
                        <i
                            class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
                        <input v-model="clSearch" placeholder="Buscar checklist..."
                            class="w-full pl-8 pr-3 h-9 text-sm rounded-lg border border-line bg-surface-raised text-ink shadow-inner-soft placeholder:text-ink-subtle outline-none focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20 transition-all" />
                    </div>
                    <span class="text-xs text-ink-subtle ml-auto">{{ filteredChecklists.length }} de {{
                        store.checklists.length }}</span>
                </div>
                <div v-if="!filteredChecklists.length" class="text-center text-ink-subtle py-12 text-sm">Nenhum
                    checklist com esse termo.</div>
                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div v-for="c in filteredChecklists" :key="c.id" @click="router.push(`/checklists/${c.id}`)"
                        class="surface-card p-4 hover:shadow-elevated hover:border-accent/40 cursor-pointer transition group">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5 min-w-0">
                                    <h3 class="font-semibold text-ink truncate group-hover:text-accent transition-colors">{{ c.title }}</h3>
                                    <Badge v-if="c.status === 'draft'" variant="warning" size="sm" class="shrink-0">Rascunho</Badge>
                                    <Badge v-else-if="c.status === 'done'" variant="success" size="sm" class="shrink-0">Concluído</Badge>
                                </div>
                                <p class="text-xs text-ink-muted truncate">{{ c.display_name || (c.idempreendimento ?
                                    'Empreendimento #' + c.idempreendimento : 'Sem empreendimento') }}</p>
                            </div>
                            <ProgressRing :pct="c.progress_cache?.pct || 0" :size="46" />
                        </div>
                        <div class="flex items-center gap-3 mt-3 pt-3 border-t border-line text-xs">
                            <span class="text-ink-muted"><i class="fas fa-list-ul text-ink-subtle"></i> {{ c.progress_cache?.done || 0 }}/{{ c.progress_cache?.total || 0
                                }}</span>
                            <span v-if="(c.progress_cache?.overdue || 0) > 0" class="text-red-500 font-semibold"><i
                                    class="fas fa-triangle-exclamation"></i> {{ c.progress_cache.overdue }}
                                atras.</span>
                            <span class="text-ink-muted ml-auto">{{ brl(c.progress_cache?.budget) }}</span>
                        </div>
                        <div v-if="nextKeyDate(c)" class="mt-2 text-xs text-ink-muted"><i
                                class="fas fa-flag-checkered"></i> {{ nextKeyDate(c).label }}: {{
                                    fmt(nextKeyDate(c).date) }}</div>
                    </div>
                </div>
            </template>
        </div>

        <!-- MINHAS TAREFAS -->
        <div class="flex flex-wrap gap-2" v-else-if="tab === 'Minhas Tarefas'">

            <SegmentedControl :model-value="mtState" :options="MT_FILTERS" @update:model-value="mtState = $event" />
            <div class="flex flex-wrap items-center gap-2 mb-4">
                <div class="relative">
                    <i
                        class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none"></i>
                    <input v-model="mtSearch" placeholder="Buscar tarefa..."
                        class="w-80 pl-8 pr-3 h-9 text-sm rounded-lg border border-line bg-surface-raised text-ink shadow-inner-soft placeholder:text-ink-subtle outline-none focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20 transition-all" />
                </div>
                <select v-model="mtChecklist"
                    class="h-9 w-44 text-sm rounded-lg border border-line bg-surface-raised text-ink px-2.5 focus-ring">
                    <option value="">Todos os checklists</option>
                    <option v-for="c in myChecklistsOptions" :key="c.id" :value="c.id">{{ c.title }}</option>
                </select>
                <div class="w-40">
                    <MultiSelector :options="MT_PRIORITY_OPTS" v-model="mtPriorities" placeholder="Prioridade" />
                </div>
                <label class="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                    <i class="fas fa-arrow-down-wide-short"></i>
                    <select v-model="mtSort"
                        class="h-9 text-sm rounded-lg border border-line bg-surface-raised text-ink px-2.5 focus-ring">
                        <option value="due">Por prazo</option>
                        <option value="priority">Por prioridade</option>
                    </select>
                </label>
                <span class="text-xs text-ink-subtle ml-auto">{{ filteredMyTasks.length }} tarefa(s)</span>
            </div>
            <div v-if="!filteredMyTasks.length" class="text-center text-ink-subtle py-16">
                <i class="fas fa-clipboard-check text-3xl mb-3 block opacity-40"></i>
                Nenhuma tarefa com esses filtros.
            </div>
            <div v-else class="space-y-2 w-full">
                <button v-for="t in filteredMyTasks" :key="t.id"
                    @click="router.push(`/checklists/${t.checklist_id}?task=${t.id}`)"
                    class="w-full text-left flex items-center gap-3 surface-card px-3.5 py-3 hover:shadow-elevated transition group">
                    <span class="w-1 h-11 rounded-full shrink-0" :style="{ background: scColor(t.state_class) }"></span>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">{{
                            t.title }}
                        </p>
                        <p class="text-xs text-ink-muted truncate">
                            <i class="fas fa-clipboard-list text-ink-subtle/70 mr-1"></i>{{ t.checklist?.title }}
                            <span v-if="t.category" class="text-ink-subtle">· {{ t.category }}</span>
                            <span v-if="Number(t.value)" class="text-ink-subtle">· {{ brl(t.value) }}{{ t.value_kind ===
                                'MONTHLY' ? '/mês' : '' }}</span>
                        </p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <Badge v-if="t.status_label" :variant="SC_META[t.state_class]?.badge || 'neutral'" size="sm"
                            dot>{{
                            t.status_label }}</Badge>
                        <Badge v-if="t.priority && t.priority !== 'MEDIUM'" :variant="PRIORITY[t.priority]?.v"
                            size="sm">{{
                            PRIORITY[t.priority]?.l }}</Badge>
                        <div class="w-24 text-right">
                            <p class="text-xs whitespace-nowrap"
                                :class="t.due_date && t.due_date < today && t.state_class !== 'DONE' ? 'text-red-500 font-semibold' : 'text-ink-muted'">
                                {{ t.due_date ? fmt(t.due_date) : 'sem prazo' }}</p>
                            <p v-if="t.due_date" class="text-[10px] whitespace-nowrap"
                                :class="t.due_date < today && t.state_class !== 'DONE' ? 'text-red-500/80' : 'text-ink-subtle'">
                                {{ dueLabel(t.due_date) }}</p>
                        </div>
                    </div>
                </button>
            </div>
        </div>

        <!-- APROVAÇÕES -->
        <div v-else-if="tab === 'Aprovações'">
            <p class="text-sm text-ink-muted mb-3">Tarefas aguardando autorização dos perfis de que você participa.</p>
            <div v-if="!pendingApprovals.length" class="text-center text-ink-subtle py-16">
                <i class="fas fa-clipboard-check text-3xl mb-3 block opacity-40"></i>
                Nenhuma tarefa aguardando sua autorização.
            </div>
            <div v-else class="space-y-2">
                <button v-for="t in pendingApprovals" :key="t.id"
                    @click="router.push(`/checklists/${t.checklist_id}?task=${t.id}`)"
                    class="w-full text-left flex items-center gap-3 surface-card px-3.5 py-3 hover:shadow-elevated transition group">
                    <span class="w-1 h-11 rounded-full shrink-0 bg-amber-500"></span>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">{{ t.title }}</p>
                        <p class="text-xs text-ink-muted truncate">
                            <i class="fas fa-clipboard-list text-ink-subtle/70 mr-1"></i>{{ t.checklistTitle }}
                            <span class="text-ink-subtle">· {{ t.assignee || 's/ resp.' }}</span>
                        </p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <Badge v-if="t.awaitingMe" variant="warning" size="sm" dot>Aguarda você</Badge>
                        <Badge v-else variant="success" size="sm">Você já decidiu</Badge>
                        <span class="text-xs text-ink-muted whitespace-nowrap">{{ t.due_date ? fmt(t.due_date) : '' }}</span>
                    </div>
                </button>
            </div>
        </div>

        <!-- MODAL NOVO CHECKLIST -->
        <Modal :open="showModal" size="xl" title="Novo checklist"
            :subtitle="step === 'template' ? 'Escolha um modelo ou comece em branco' : (selectedTemplate ? 'Modelo: ' + selectedTemplate.name : 'Checklist em branco')"
            @close="showModal = false">
            <div v-if="step === 'template'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button v-for="t in store.templates" :key="t.id" @click="pickTemplate(t)"
                    class="text-left p-4 rounded-xl border border-line hover:border-accent hover:bg-accent-soft/40 transition focus-ring">
                    <div class="flex items-center gap-2"><i class="fas fa-rocket text-accent"></i><span
                            class="font-semibold text-ink">{{ t.name }}</span></div>
                    <p class="text-xs text-ink-muted mt-1 line-clamp-2">{{ t.description }}</p>
                    <p class="text-xs text-ink-subtle mt-2">{{ t.items_count }} tarefas-padrão</p>
                </button>
                <button @click="pickBlank"
                    class="text-left p-4 rounded-xl border border-dashed border-line-strong hover:border-accent transition focus-ring">
                    <div class="flex items-center gap-2"><i class="fas fa-file text-ink-subtle"></i><span
                            class="font-semibold text-ink">Em branco</span></div>
                    <p class="text-xs text-ink-muted mt-1">Comece do zero e monte as seções e tarefas.</p>
                </button>
            </div>

            <div v-else class="space-y-4">
                <button v-if="selectedTemplate" @click="step = 'template'"
                    class="text-xs text-accent hover:underline focus-ring rounded"><i class="fas fa-arrow-left"></i>
                    trocar
                    modelo</button>
                <Input v-model="form.title" label="Título" placeholder="Ex.: Lançamento - Três Marias - Ibitinga" />
                <div>
                    <label class="block text-xs font-medium text-ink-muted mb-1.5">Empreendimento</label>
                    <EnterprisePicker v-model:idempreendimento="form.idempreendimento"
                        v-model:display-name="form.display_name" v-model:cost-center="form.cost_center" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <Input v-model="form.meeting" type="date" label="Data do Meeting" />
                    <Input v-model="form.store_opening" type="date" label="Abertura de Loja" />
                </div>
                <p v-if="selectedTemplate" class="text-xs text-ink-subtle">Os prazos das tarefas-padrão serão calculados
                    a
                    partir desses marcos.</p>
            </div>

            <template v-if="step === 'fill'" #footer>
                <Button variant="ghost" @click="showModal = false">Cancelar</Button>
                <Button :loading="store.saving" icon="fas fa-check" @click="submitNew">Criar checklist</Button>
            </template>
        </Modal>
    </div>
</template>
