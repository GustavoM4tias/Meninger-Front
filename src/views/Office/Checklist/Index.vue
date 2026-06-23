<script setup>
import { ref, computed, onMounted, onActivated, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import ProgressRing from './components/ProgressRing.vue';
import EnterprisePicker from './components/EnterprisePicker.vue';

const store = useChecklistStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const tab = ref(route.query.section || 'Checklists');
watch(() => route.query.section, (s) => { if (s) tab.value = s; });

onMounted(() => store.loadHome());
onActivated(() => store.loadHome()); // recarrega ao voltar (keep-alive) — reflete tarefas recém-atribuídas

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

// ── Filtros de Minhas Tarefas ──
const mtSearch = ref('');
const mtState = ref('open');
const mtChecklist = ref('');
const MT_FILTERS = [{ v: 'all', l: 'Todas' }, { v: 'open', l: 'Abertas' }, { v: 'overdue', l: 'Em atraso' }, { v: 'done', l: 'Concluídas' }];
const myChecklistsOptions = computed(() => {
    const map = new Map();
    myTasks.value.forEach((t) => { if (t.checklist) map.set(t.checklist.id, t.checklist.title); });
    return Array.from(map, ([id, title]) => ({ id, title }));
});
const filteredMyTasks = computed(() => {
    let list = myTasks.value;
    if (mtChecklist.value) list = list.filter((t) => String(t.checklist_id) === String(mtChecklist.value));
    if (mtState.value === 'open') list = list.filter((t) => t.state_class !== 'DONE' && t.state_class !== 'CANCELLED');
    else if (mtState.value === 'overdue') list = list.filter((t) => t.due_date && t.due_date < today && t.state_class !== 'DONE' && t.state_class !== 'CANCELLED');
    else if (mtState.value === 'done') list = list.filter((t) => t.state_class === 'DONE');
    const q = mtSearch.value.trim().toLowerCase();
    if (q) list = list.filter((t) => (t.title || '').toLowerCase().includes(q) || (t.checklist?.title || '').toLowerCase().includes(q));
    return list;
});

function nextKeyDate(c) {
    const ks = (c.key_dates || []).filter((k) => k.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return ks.find((k) => k.date >= today) || ks[ks.length - 1] || null;
}

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
const form = ref({ title: '', display_name: '', idempreendimento: null, meeting: '', store_opening: '' });

function openModal() {
    showModal.value = true; step.value = 'template'; selectedTemplate.value = null;
    form.value = { title: '', display_name: '', idempreendimento: null, meeting: '', store_opening: '' };
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
        const payload = { title: form.value.title.trim(), display_name: form.value.display_name.trim() || null, idempreendimento: form.value.idempreendimento || null, key_dates: keyDates.value };
        const res = selectedTemplate.value
            ? await store.createFromTemplate(selectedTemplate.value.id, payload)
            : await store.createBlank(payload);
        showModal.value = false;
        toast.success('Checklist criado!');
        router.push(`/checklists/${res.checklist.id}`);
    } catch (e) { toast.error(e.message || 'Erro ao criar checklist.'); }
}

const btnPrimary = 'inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg shadow-soft focus-ring';
const fieldCls = 'w-full rounded-lg border border-line bg-surface text-ink px-3 py-2 text-sm focus-ring';
</script>

<template>
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
        <!-- Cabeçalho -->
        <div class="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div>
                <h1 class="text-xl md:text-2xl font-bold text-ink flex items-center gap-2">
                    <i class="fas fa-list-check text-accent"></i> Checklists
                </h1>
                <p class="text-sm text-ink-muted">Lançamentos, gestão e cobrança de entregas e demandas.</p>
            </div>
            <div class="flex items-center gap-2">
                <label class="inline-flex items-center gap-2 bg-surface-raised border border-line text-ink-muted text-sm font-medium px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-sunken focus-ring">
                    <i class="fas fa-file-excel text-emerald-500"></i> {{ importing ? 'Importando...' : 'Importar Excel' }}
                    <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onImport" :disabled="importing" />
                </label>
                <button @click="openModal" :class="btnPrimary"><i class="fas fa-plus"></i> Novo checklist</button>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-line mb-5">
            <button v-for="t in ['Painel', 'Checklists', 'Minhas Tarefas']" :key="t" @click="tab = t"
                class="px-4 py-2 text-sm font-medium -mb-px border-b-2 transition focus-ring"
                :class="tab === t ? 'border-accent text-accent' : 'border-transparent text-ink-subtle hover:text-ink'">
                {{ t }}
            </button>
        </div>

        <div v-if="store.loading" class="text-center text-ink-subtle py-16"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>

        <!-- PAINEL -->
        <div v-else-if="tab === 'Painel'">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div class="surface-card p-4"><p class="text-xs text-ink-muted">Checklists ativos</p><p class="text-2xl font-bold text-ink">{{ summary.checklists || 0 }}</p></div>
                <div class="surface-card p-4"><p class="text-xs text-ink-muted">Tarefas</p><p class="text-2xl font-bold text-ink">{{ summary.totalTasks || 0 }}</p></div>
                <div class="surface-card p-4"><p class="text-xs text-ink-muted">Conclusão</p><p class="text-2xl font-bold text-accent">{{ summary.pct || 0 }}%</p></div>
                <div class="surface-card p-4"><p class="text-xs text-ink-muted">Em atraso</p><p class="text-2xl font-bold" :class="(summary.totalOverdue || 0) > 0 ? 'text-red-500' : 'text-ink'">{{ summary.totalOverdue || 0 }}</p></div>
                <div class="surface-card p-4"><p class="text-xs text-ink-muted">Orçamento</p><p class="text-lg font-bold text-ink">{{ brl(summary.totalBudget) }}</p></div>
            </div>

            <!-- Distribuição por status -->
            <div class="surface-card p-4 mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-sm font-semibold text-ink-muted">Distribuição das tarefas</h2>
                    <span class="text-xs text-ink-subtle">{{ statusTotal }} no total</span>
                </div>
                <div class="flex h-3 rounded-full overflow-hidden bg-surface-sunken">
                    <div v-for="seg in STATUS_SEG" :key="seg.k" :style="{ width: (statusTotal ? (byStatus[seg.k] || 0) / statusTotal * 100 : 0) + '%', background: seg.c }" :title="`${seg.l}: ${byStatus[seg.k] || 0}`"></div>
                </div>
                <div class="flex flex-wrap gap-3 mt-2">
                    <span v-for="seg in STATUS_SEG" :key="seg.k" class="flex items-center gap-1 text-xs text-ink-muted">
                        <span class="w-2.5 h-2.5 rounded-full" :style="{ background: seg.c }"></span> {{ seg.l }} ({{ byStatus[seg.k] || 0 }})
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <!-- Por responsável -->
                <div class="surface-card p-4">
                    <h2 class="text-sm font-semibold text-ink-muted mb-3">Por responsável</h2>
                    <div v-if="!byAssignee.length" class="text-sm text-ink-subtle">Sem tarefas.</div>
                    <div v-else class="space-y-3 max-h-72 overflow-y-auto">
                        <div v-for="a in byAssignee" :key="a.key">
                            <div class="flex items-center justify-between text-xs mb-1">
                                <span class="font-medium text-ink flex items-center gap-1">{{ a.name }}<i v-if="!a.linked && a.name !== 'Sem responsável'" class="fas fa-link-slash text-ink-subtle text-[10px]" title="Responsável por texto (não vinculado a usuário)"></i></span>
                                <span class="text-ink-muted">{{ a.done }}/{{ a.total }}<span v-if="a.overdue" class="text-red-500 font-semibold ml-2">{{ a.overdue }} atras.</span></span>
                            </div>
                            <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden"><div class="h-full bg-accent rounded-full" :style="{ width: a.pct + '%' }"></div></div>
                        </div>
                    </div>
                </div>

                <!-- Em atraso + a vencer -->
                <div class="surface-card p-4">
                    <h2 class="text-sm font-semibold text-ink-muted mb-2">Em atraso ({{ overdueAll.length }})</h2>
                    <div v-if="!overdueAll.length" class="text-xs text-ink-subtle mb-3">Nada em atraso. 🎉</div>
                    <div v-else class="space-y-1 mb-3 max-h-40 overflow-y-auto">
                        <div v-for="t in overdueAll" :key="t.id" @click="router.push(`/checklists/${t.checklist_id}?task=${t.id}`)" class="flex items-center justify-between text-xs bg-red-500/10 rounded px-2 py-1 cursor-pointer hover:bg-red-500/15">
                            <span class="text-ink truncate">{{ t.title }} <span class="text-ink-subtle">· {{ t.assignee || 's/ resp.' }}</span></span>
                            <span class="text-red-500 font-semibold whitespace-nowrap ml-2">{{ fmt(t.due_date) }}</span>
                        </div>
                    </div>
                    <h2 class="text-sm font-semibold text-ink-muted mb-2">A vencer em 7 dias ({{ dueSoon.length }})</h2>
                    <div v-if="!dueSoon.length" class="text-xs text-ink-subtle">Nada nos próximos 7 dias.</div>
                    <div v-else class="space-y-1 max-h-40 overflow-y-auto">
                        <div v-for="t in dueSoon" :key="t.id" @click="router.push(`/checklists/${t.checklist_id}?task=${t.id}`)" class="flex items-center justify-between text-xs bg-surface-sunken rounded px-2 py-1 cursor-pointer hover:bg-accent-soft/40">
                            <span class="text-ink truncate">{{ t.title }} <span class="text-ink-subtle">· {{ t.assignee || 's/ resp.' }}</span></span>
                            <span class="text-ink-muted whitespace-nowrap ml-2">{{ fmt(t.due_date) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CHECKLISTS -->
        <div v-else-if="tab === 'Checklists'">
            <div v-if="!store.checklists.length" class="text-center text-ink-subtle py-16">Nenhum checklist ainda. Crie o primeiro a partir de um modelo.</div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="c in store.checklists" :key="c.id" @click="router.push(`/checklists/${c.id}`)"
                    class="surface-card p-4 hover:shadow-elevated cursor-pointer transition">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <h3 class="font-semibold text-ink truncate">{{ c.title }}</h3>
                            <p class="text-xs text-ink-muted truncate">{{ c.display_name || (c.idempreendimento ? 'Empreendimento #' + c.idempreendimento : 'Sem empreendimento') }}</p>
                        </div>
                        <ProgressRing :pct="c.progress_cache?.pct || 0" :size="46" />
                    </div>
                    <div class="flex items-center gap-3 mt-3 text-xs">
                        <span class="text-ink-muted"><i class="fas fa-list-ul"></i> {{ c.progress_cache?.total || 0 }}</span>
                        <span v-if="(c.progress_cache?.overdue || 0) > 0" class="text-red-500 font-semibold"><i class="fas fa-triangle-exclamation"></i> {{ c.progress_cache.overdue }} atras.</span>
                        <span class="text-ink-muted ml-auto">{{ brl(c.progress_cache?.budget) }}</span>
                    </div>
                    <div v-if="nextKeyDate(c)" class="mt-2 text-xs text-ink-muted"><i class="fas fa-flag-checkered"></i> {{ nextKeyDate(c).label }}: {{ fmt(nextKeyDate(c).date) }}</div>
                </div>
            </div>
        </div>

        <!-- MINHAS TAREFAS -->
        <div v-else-if="tab === 'Minhas Tarefas'">
            <div class="flex flex-wrap items-center gap-2 mb-3">
                <input v-model="mtSearch" placeholder="Buscar tarefa..." class="text-sm rounded-lg border border-line bg-surface text-ink px-3 py-1.5 focus-ring" />
                <div class="inline-flex rounded-lg border border-line overflow-hidden text-xs">
                    <button v-for="f in MT_FILTERS" :key="f.v" @click="mtState = f.v" class="px-3 py-1.5 focus-ring" :class="mtState === f.v ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'">{{ f.l }}</button>
                </div>
                <select v-model="mtChecklist" class="text-sm rounded-lg border border-line bg-surface text-ink px-2 py-1.5 focus-ring">
                    <option value="">Todos os checklists</option>
                    <option v-for="c in myChecklistsOptions" :key="c.id" :value="c.id">{{ c.title }}</option>
                </select>
                <span class="text-xs text-ink-subtle ml-auto">{{ filteredMyTasks.length }} tarefa(s)</span>
            </div>
            <div v-if="!filteredMyTasks.length" class="text-center text-ink-subtle py-16">Nenhuma tarefa com esses filtros.</div>
            <div v-else class="space-y-2">
                <div v-for="t in filteredMyTasks" :key="t.id" @click="router.push(`/checklists/${t.checklist_id}?task=${t.id}`)"
                    class="flex items-center justify-between surface-card px-3 py-2 cursor-pointer hover:shadow-elevated">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-ink truncate">{{ t.title }}</p>
                        <p class="text-xs text-ink-muted truncate">{{ t.checklist?.title }}<span v-if="t.status_label"> · {{ t.status_label }}</span></p>
                    </div>
                    <span class="text-xs whitespace-nowrap ml-3" :class="t.due_date && t.due_date < today && t.state_class !== 'DONE' ? 'text-red-500 font-semibold' : 'text-ink-muted'">{{ t.due_date ? fmt(t.due_date) : 'sem prazo' }}</span>
                </div>
            </div>
        </div>

        <!-- MODAL NOVO CHECKLIST -->
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" @click.self="showModal = false">
            <div class="bg-surface-overlay border border-line rounded-2xl shadow-overlay w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 animate-scale-in">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-ink">Novo checklist</h3>
                    <button @click="showModal = false" class="text-ink-subtle hover:text-ink focus-ring rounded"><i class="fas fa-times"></i></button>
                </div>

                <div v-if="step === 'template'">
                    <p class="text-sm text-ink-muted mb-3">Escolha um modelo da biblioteca ou comece em branco.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button v-for="t in store.templates" :key="t.id" @click="pickTemplate(t)"
                            class="text-left p-4 rounded-xl border border-line hover:border-accent hover:bg-accent-soft/40 transition focus-ring">
                            <div class="flex items-center gap-2"><i class="fas fa-rocket text-accent"></i><span class="font-semibold text-ink">{{ t.name }}</span></div>
                            <p class="text-xs text-ink-muted mt-1 line-clamp-2">{{ t.description }}</p>
                            <p class="text-xs text-ink-subtle mt-2">{{ t.items_count }} tarefas-padrão</p>
                        </button>
                        <button @click="pickBlank" class="text-left p-4 rounded-xl border border-dashed border-line-strong hover:border-accent transition focus-ring">
                            <div class="flex items-center gap-2"><i class="fas fa-file text-ink-subtle"></i><span class="font-semibold text-ink">Em branco</span></div>
                            <p class="text-xs text-ink-muted mt-1">Comece do zero e monte as seções e tarefas.</p>
                        </button>
                    </div>
                </div>

                <div v-else class="space-y-4">
                    <div v-if="selectedTemplate" class="text-xs text-ink-muted">
                        Modelo: <span class="font-semibold text-ink">{{ selectedTemplate.name }}</span>
                        <button @click="step = 'template'" class="ml-2 text-accent hover:underline">trocar</button>
                    </div>
                    <div><label class="block text-xs font-medium text-ink-muted mb-1">Título</label><input v-model="form.title" type="text" placeholder="Ex.: Lançamento - Três Marias - Ibitinga" :class="fieldCls" /></div>
                    <div><label class="block text-xs font-medium text-ink-muted mb-1">Empreendimento</label><EnterprisePicker v-model:idempreendimento="form.idempreendimento" v-model:display-name="form.display_name" /></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="block text-xs font-medium text-ink-muted mb-1">Data do Meeting</label><input v-model="form.meeting" type="date" :class="fieldCls" /></div>
                        <div><label class="block text-xs font-medium text-ink-muted mb-1">Abertura de Loja</label><input v-model="form.store_opening" type="date" :class="fieldCls" /></div>
                    </div>
                    <p v-if="selectedTemplate" class="text-xs text-ink-subtle">Os prazos das tarefas-padrão serão calculados a partir desses marcos.</p>
                    <div class="flex justify-end gap-2 pt-2">
                        <button @click="showModal = false" class="px-4 py-2 text-sm text-ink-muted hover:text-ink focus-ring rounded-lg">Cancelar</button>
                        <button @click="submitNew" :disabled="store.saving" :class="btnPrimary + ' disabled:opacity-60'"><i v-if="store.saving" class="fas fa-spinner fa-spin"></i> Criar checklist</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
