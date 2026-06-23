<script setup>
import { computed, ref, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import TaskPreview from './TaskPreview.vue';

const props = defineProps({ filter: { type: Object, default: () => ({}) } });
const store = useChecklistStore();
const emit = defineEmits(['open-task']);
onMounted(() => { if (!store.users.length) store.loadUsers(); });

const today = dayjs().format('YYYY-MM-DD');
const brl = (v) => (Number(v) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) : '-');

const sections = computed(() => store.current?.sections || []);
const statuses = computed(() => store.current?.statuses || []);

// ── Filtro vindo do Detail (busca/status/responsável/atraso/concluídas) ──
const filterActive = computed(() => {
    const f = props.filter || {};
    return !!(f.search?.trim() || f.statuses?.length || f.assignees?.length || f.onlyOverdue || f.hideDone);
});
function matchesFilter(t) {
    const f = props.filter || {};
    if (f.search?.trim()) { const q = f.search.trim().toLowerCase(); if (!((t.title || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q))) return false; }
    if (f.statuses?.length) { const lbl = store.statusById.get(t.status_id)?.label || '— sem status —'; if (!f.statuses.includes(lbl)) return false; }
    if (f.assignees?.length) { const name = t.assignee?.username || t.assignee_label || 'Sem responsável'; if (!f.assignees.includes(name)) return false; }
    if (f.hideDone && t.state_class === 'DONE') return false;
    if (f.onlyOverdue && !(t.due_date && t.due_date < today && t.state_class !== 'DONE')) return false;
    return true;
}

function topTasks(sectionId) {
    return (store.current?.tasks || [])
        .filter((t) => t.section_id === sectionId && !t.parent_task_id && matchesFilter(t))
        .sort((a, b) => (a.position || 0) - (b.position || 0));
}
const visibleSections = computed(() => (filterActive.value ? sections.value.filter((s) => topTasks(s.id).length) : sections.value));
function categoriesOf(sectionId) {
    const seen = []; for (const t of topTasks(sectionId)) { const c = t.category || ''; if (!seen.includes(c)) seen.push(c); } return seen;
}
function tasksByCategory(sectionId, cat) { return topTasks(sectionId).filter((t) => (t.category || '') === cat); }
function sectionTotal(sectionId) { return topTasks(sectionId).reduce((s, t) => s + (Number(t.value) || 0), 0); }

const scColor = (sc) => ({ TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', BLOCKED: '#ef4444', DONE: '#22c55e', CANCELLED: '#9ca3af' }[sc] || '#94a3b8');
const statusColor = (id) => store.statusById.get(id)?.color || scColor(store.statusById.get(id)?.state_class);

function sectionIds(secId) { return topTasks(secId).map((t) => t.id); }
function allSelected(secId) { const ids = sectionIds(secId); return ids.length > 0 && ids.every((id) => store.isSelected(id)); }
function toggleSection(secId, ev) { store.selectMany(sectionIds(secId), ev.target.checked); }

// ── Edição em lote por seção ──
const shiftN = ref(7);
function selectedInSection(secId) { return sectionIds(secId).filter((id) => store.isSelected(id)); }
function clearSection(secId) { store.selectMany(sectionIds(secId), false); }
function bulkStatus(secId, e) { store.bulkApplyTo(selectedInSection(secId), { status_id: Number(e.target.value) || null }); e.target.value = ''; }
function bulkAssignee(secId, e) { store.bulkApplyTo(selectedInSection(secId), { assignee_user_id: Number(e.target.value) || null }); e.target.value = ''; }
function bulkPriority(secId, e) { if (e.target.value) store.bulkApplyTo(selectedInSection(secId), { priority: e.target.value }); e.target.value = ''; }
function bulkDue(secId, e) { store.bulkApplyTo(selectedInSection(secId), { due_date: e.target.value || null }); }
function bulkShift(secId) { store.bulkApplyTo(selectedInSection(secId), { shiftDays: Number(shiftN.value) || 0 }); }
function bulkDelete(secId) { const ids = selectedInSection(secId); if (confirm(`Excluir ${ids.length} tarefa(s)?`)) store.bulkApplyTo(ids, { delete: true }); }

// ── Preview ao passar o mouse (1s) ──
const hover = ref(null);
let hoverTimer = null;
function onHover(t, ev) { const x = ev.clientX, y = ev.clientY; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { hover.value = { task: t, x, y }; }, 1000); }
function onLeave() { clearTimeout(hoverTimer); hover.value = null; }

const newTaskTitle = ref({});
const newTaskCat = ref({});
const newCatTask = ref({});
async function addTask(sectionId) {
    const title = (newTaskTitle.value[sectionId] || '').trim();
    if (!title) return;
    const category = (newTaskCat.value[sectionId] || '').trim() || null;
    await store.createTask(sectionId, { title, category });
    newTaskTitle.value[sectionId] = '';
    newTaskCat.value[sectionId] = '';
}
async function addCatTask(sectionId, cat) {
    const key = sectionId + '|' + cat;
    const title = (newCatTask.value[key] || '').trim();
    if (!title) return;
    await store.createTask(sectionId, { title, category: cat || null });
    newCatTask.value[key] = '';
}
const newSection = ref('');
async function addSection() { if (!newSection.value.trim()) return; await store.addSection(newSection.value.trim()); newSection.value = ''; }

// Inputs inline: discretos (sem borda) até hover/foco — desafoga a tabela.
const cellInput = 'w-full bg-transparent rounded-md border border-transparent px-2 py-1.5 text-sm text-ink hover:border-line focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20 outline-none transition-all';
const bulkCtrl = 'text-xs rounded-lg border border-line bg-surface-raised text-ink px-2 py-1.5 focus-ring';
</script>

<template>
    <div class="space-y-5">
        <div v-for="sec in visibleSections" :key="sec.id" class="surface-card overflow-hidden">
            <!-- Cabeçalho da seção -->
            <div class="flex items-center gap-2.5 px-4 py-3 border-b border-line bg-surface-sunken/40">
                <input type="checkbox" :checked="allSelected(sec.id)" @change="toggleSection(sec.id, $event)" title="Selecionar seção"
                    class="h-4 w-4 cursor-pointer rounded" />
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: sec.color || '#64748b' }"></span>
                <h3 class="font-semibold text-ink">{{ sec.name }}</h3>
                <span class="text-xs text-ink-subtle bg-surface-sunken px-1.5 py-0.5 rounded-md">{{ topTasks(sec.id).length }}</span>
                <span v-if="sectionTotal(sec.id)" class="ml-auto text-xs font-medium text-ink-muted">{{ brl(sectionTotal(sec.id)) }}</span>
            </div>

            <!-- Barra de edição em lote -->
            <div v-if="selectedInSection(sec.id).length" class="flex items-center gap-2 flex-wrap px-4 py-2.5 bg-accent-soft/40 border-b border-accent/20 animate-slide-down">
                <span class="text-xs font-semibold text-accent flex items-center gap-1.5"><i class="fas fa-check-double"></i> {{ selectedInSection(sec.id).length }} selecionada(s)</span>
                <select @change="bulkStatus(sec.id, $event)" :class="bulkCtrl"><option value="">Status...</option><option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option></select>
                <select @change="bulkAssignee(sec.id, $event)" :class="bulkCtrl"><option value="">Responsável...</option><option v-for="u in store.users" :key="u.id" :value="u.id">{{ u.username }}</option></select>
                <select @change="bulkPriority(sec.id, $event)" :class="bulkCtrl"><option value="">Prioridade...</option><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select>
                <label class="text-xs text-ink-muted flex items-center gap-1.5">Prazo<input type="date" @change="bulkDue(sec.id, $event)" :class="bulkCtrl" /></label>
                <span class="text-xs text-ink-muted flex items-center gap-1">Deslocar<input type="number" v-model.number="shiftN" class="w-14 text-xs rounded-lg border border-line bg-surface-raised text-ink px-1.5 py-1.5 focus-ring" />d<button @click="bulkShift(sec.id)" class="text-accent hover:underline font-medium">aplicar</button></span>
                <button @click="bulkDelete(sec.id)" class="text-xs text-red-500 hover:text-red-400 ml-auto"><i class="fas fa-trash"></i> excluir</button>
                <button @click="clearSection(sec.id)" class="text-xs text-ink-muted hover:text-ink">limpar</button>
            </div>

            <!-- Tabela -->
            <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                    <thead>
                        <tr class="text-ink-subtle text-[11px] uppercase tracking-wide">
                            <th class="w-9 px-2 py-2"></th>
                            <th class="px-3 py-2 text-left font-semibold">Tarefa</th>
                            <th class="w-48 px-3 py-2 text-left font-semibold">Status</th>
                            <th class="w-36 px-3 py-2 text-left font-semibold">Responsável</th>
                            <th class="w-36 px-3 py-2 text-left font-semibold">Prazo</th>
                            <th class="w-28 px-3 py-2 text-right font-semibold">Valor</th>
                            <th class="w-10 px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-for="cat in categoriesOf(sec.id)" :key="cat || 'geral'">
                            <tr v-if="cat" class="bg-surface-sunken/30">
                                <td></td>
                                <td colspan="6" class="px-3 py-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wide">{{ cat }}</td>
                            </tr>
                            <tr v-for="t in tasksByCategory(sec.id, cat)" :key="t.id"
                                class="border-t border-line-subtle group transition-colors"
                                :class="store.isSelected(t.id) ? 'bg-accent-soft/40' : 'hover:bg-surface-sunken/50'"
                                @mouseenter="onHover(t, $event)" @mouseleave="onLeave">
                                <td class="px-2 py-2.5 text-center align-middle">
                                    <input type="checkbox" :checked="store.isSelected(t.id)" @change="store.toggleSelect(t.id)" class="h-4 w-4 cursor-pointer rounded" />
                                </td>
                                <td class="px-3 py-2.5 align-middle">
                                    <button @click="emit('open-task', t.id)" class="text-left text-ink font-medium hover:text-accent transition-colors">{{ t.title }}</button>
                                    <span v-if="t.attachments_count" class="ml-2 text-xs text-ink-subtle"><i class="fas fa-paperclip"></i> {{ t.attachments_count }}</span>
                                    <span v-if="t.comments_count" class="ml-1.5 text-xs text-ink-subtle"><i class="fas fa-comment"></i> {{ t.comments_count }}</span>
                                </td>
                                <td class="px-2 py-2.5 align-middle">
                                    <div class="flex items-center gap-1.5">
                                        <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: statusColor(t.status_id) }"></span>
                                        <select :value="t.status_id || ''" @change="store.setTaskStatus(t.id, Number($event.target.value) || null)" :class="cellInput">
                                            <option :value="''">- sem status -</option>
                                            <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option>
                                        </select>
                                    </div>
                                </td>
                                <td class="px-3 py-2.5 align-middle text-ink-muted truncate">
                                    <span v-if="t.assignee">{{ t.assignee.username }}</span>
                                    <span v-else-if="t.assignee_label">{{ t.assignee_label }}</span>
                                    <span v-else class="text-ink-subtle">-</span>
                                </td>
                                <td class="px-2 py-2.5 align-middle">
                                    <input type="date" :value="t.due_date || ''" @change="store.patchTask(t.id, { due_date: $event.target.value || null })"
                                        :class="[cellInput, t.due_date && t.due_date < today && t.state_class !== 'DONE' ? '!text-red-500 font-semibold' : 'text-ink-muted']" />
                                </td>
                                <td class="px-2 py-2.5 align-middle">
                                    <input type="number" step="0.01" :value="t.value ?? ''"
                                        @change="store.patchTask(t.id, { value: $event.target.value !== '' ? Number($event.target.value) : null })"
                                        placeholder="0,00" :class="[cellInput, 'text-right']" />
                                </td>
                                <td class="px-2 py-2.5 text-right align-middle">
                                    <button @click="emit('open-task', t.id)" title="Abrir" class="text-ink-subtle hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity focus-ring rounded"><i class="fas fa-up-right-and-down-left-from-center text-xs"></i></button>
                                </td>
                            </tr>
                            <tr v-if="cat" class="border-t border-line-subtle/40">
                                <td></td>
                                <td colspan="6" class="px-3 py-1.5">
                                    <input v-model="newCatTask[sec.id + '|' + cat]" @keyup.enter="addCatTask(sec.id, cat)" :placeholder="'+ tarefa em ' + cat"
                                        class="w-full text-xs bg-transparent placeholder-ink-subtle focus:outline-none text-ink-muted" />
                                </td>
                            </tr>
                        </template>

                        <tr v-if="!topTasks(sec.id).length">
                            <td></td>
                            <td colspan="6" class="px-3 py-3 text-xs text-ink-subtle">Nenhuma tarefa nesta seção.</td>
                        </tr>

                        <!-- Nova tarefa -->
                        <tr class="border-t border-line">
                            <td></td>
                            <td colspan="6" class="px-3 py-2.5">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-plus text-ink-subtle text-xs"></i>
                                    <input v-model="newTaskTitle[sec.id]" @keyup.enter="addTask(sec.id)" placeholder="Nova tarefa (Enter para adicionar)"
                                        class="flex-1 text-sm bg-transparent placeholder-ink-subtle focus:outline-none text-ink" />
                                    <input v-model="newTaskCat[sec.id]" @keyup.enter="addTask(sec.id)" placeholder="categoria (opcional)"
                                        class="w-40 text-xs rounded-lg border border-line bg-surface-raised text-ink px-2.5 py-1.5 focus-ring" />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="filterActive && !visibleSections.length" class="text-center text-ink-subtle py-12 text-sm">
            <i class="fas fa-filter-circle-xmark text-2xl mb-2 block opacity-50"></i>
            Nenhuma tarefa corresponde aos filtros.
        </div>

        <div class="flex items-center gap-2">
            <input v-model="newSection" @keyup.enter="addSection" placeholder="+ Nova seção"
                class="text-sm rounded-lg border border-line bg-surface-raised text-ink px-3 py-2 focus-ring" />
            <button @click="addSection" class="text-sm text-accent hover:underline font-medium">adicionar seção</button>
        </div>

        <TaskPreview v-if="hover" :task="hover.task" :x="hover.x" :y="hover.y" />
    </div>
</template>
