<script setup>
import { computed, ref, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import TaskPreview from './TaskPreview.vue';
import Button from '@/components/UI/Button.vue';
import UserAvatarStack from '@/components/UI/UserAvatarStack.vue';
import UserInfoModal from '@/components/UI/UserInfoModal.vue';
import Modal from '@/components/UI/Modal.vue';

const props = defineProps({ filter: { type: Object, default: () => ({}) }, isAdmin: { type: Boolean, default: false } });
const store = useChecklistStore();
const emit = defineEmits(['open-task']);
onMounted(() => { if (!store.users.length) store.loadUsers(); });

const today = dayjs().format('YYYY-MM-DD');

// Responsáveis resolvidos p/ as bolinhas (1+). Cai no t.assignee se store.users não tiver o id.
function assigneesOf(t) {
    const ids = (t.assignee_user_ids || []).length ? t.assignee_user_ids : (t.assignee?.id ? [t.assignee.id] : []);
    const list = ids.map((id) => (store.users || []).find((u) => u.id === Number(id))).filter(Boolean);
    if (!list.length && t.assignee) list.push(t.assignee);
    return list;
}
const infoUser = ref(null);

// Concluir é terminal: confirma antes (não dá pra voltar p/ outras etapas depois).
function isDoneStatus(id) { return statuses.value.find((s) => s.id === Number(id))?.state_class === 'DONE'; }
const doneConfirm = ref(null); // { taskId, statusId, el, prev }
function onStatusChange(t, e) {
    const val = Number(e.target.value) || null;
    if (val && isDoneStatus(val) && !isDoneStatus(t.status_id)) { doneConfirm.value = { taskId: t.id, statusId: val, el: e.target, prev: t.status_id || '' }; return; }
    store.setTaskStatus(t.id, val);
}
function confirmDone() { if (doneConfirm.value) store.setTaskStatus(doneConfirm.value.taskId, doneConfirm.value.statusId); doneConfirm.value = null; }
function cancelDone() { if (doneConfirm.value?.el) doneConfirm.value.el.value = doneConfirm.value.prev; doneConfirm.value = null; }

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
// Mover selecionadas para uma categoria (facilita reorganizar em lote).
const bulkCat = ref({});
function bulkMoveCategory(secId) {
    const ids = selectedInSection(secId);
    if (!ids.length) return;
    const cat = (bulkCat.value[secId] || '').trim();
    store.bulkApplyTo(ids, { category: cat || null });
    bulkCat.value[secId] = '';
}
function categoriesInChecklist() {
    const seen = new Set();
    for (const t of (store.current?.tasks || [])) { const c = (t.category || '').trim(); if (c) seen.add(c); }
    return [...seen].sort();
}

// ── Arrastar-e-soltar: reordenar dentro da categoria e mover entre categorias ──
// Reordenar só faz sentido sem filtro ativo (a lista visível = lista real).
const canDrag = computed(() => props.isAdmin && !filterActive.value);
const dragId = ref(null);       // tarefa sendo arrastada
const dragOverId = ref(null);   // linha sob o cursor (indicador visual)
const moveConfirm = ref(null);  // { src, targetId, sectionId, toCat, fromCat }

function onDragStart(t, ev) {
    if (!canDrag.value) return;
    dragId.value = t.id;
    if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(t.id)); } catch { /* Safari */ } }
}
function onDragEnd() { dragId.value = null; dragOverId.value = null; }
function onRowDragOver(t, ev) { if (!canDrag.value || dragId.value == null) return; ev.preventDefault(); dragOverId.value = t.id; }

// Constrói a lista reordenada de uma categoria (na ordem visual) com o src inserido
// antes de targetId (ou no fim, se targetId = null), e reindexa as posições.
function buildReorder(src, targetId, sectionId, toCat) {
    const list = tasksByCategory(sectionId, toCat).filter((t) => t.id !== src.id);
    const idx = targetId ? list.findIndex((t) => t.id === targetId) : -1;
    list.splice(idx < 0 ? list.length : idx, 0, src);
    return list.map((t, i) => ({ id: t.id, position: (i + 1) * 10, category: toCat || null, section_id: sectionId }));
}

// Soltou sobre uma tarefa (targetId) ou sobre o cabeçalho da categoria (targetId=null).
function onDrop(targetId, sectionId, cat) {
    dragOverId.value = null;
    const src = (store.current?.tasks || []).find((t) => t.id === dragId.value);
    dragId.value = null;
    if (!src || src.id === targetId) return;
    const toCat = cat || '';
    const fromCat = src.category || '';
    // Categoria (ou seção) diferente: confirma antes de mover.
    if (toCat !== fromCat || sectionId !== src.section_id) {
        moveConfirm.value = { src, targetId, sectionId, toCat, fromCat };
        return;
    }
    store.reorderTasks(buildReorder(src, targetId, sectionId, toCat));
}
function confirmMove() {
    const m = moveConfirm.value; moveConfirm.value = null;
    if (m) store.reorderTasks(buildReorder(m.src, m.targetId, m.sectionId, m.toCat));
}
function cancelMove() { moveConfirm.value = null; }

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

// Inputs inline: borda leve sempre visível (deixa claro onde dá pra clicar/editar),
// realçando no hover/foco — sem pesar a tabela.
const cellInput = 'w-full bg-surface-raised/60 rounded-md border border-line/70 px-2 py-1.5 text-sm text-ink hover:border-line-strong hover:bg-surface-raised focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20 focus:bg-surface-raised outline-none transition-all';
const bulkCtrl = 'text-xs rounded-lg border border-line bg-surface-raised text-ink px-2 py-1.5 focus-ring';
</script>

<template>
    <div class="space-y-5">
        <div v-for="sec in visibleSections" :key="sec.id" class="surface-card overflow-hidden animate-fade-in">
            <!-- Cabeçalho da seção -->
            <div class="flex items-center gap-2.5 px-4 py-3 border-b border-line bg-surface-sunken/40">
                <input v-if="isAdmin" type="checkbox" :checked="allSelected(sec.id)" @change="toggleSection(sec.id, $event)" title="Selecionar seção"
                    class="h-4 w-4 cursor-pointer rounded" />
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: sec.color || '#64748b' }"></span>
                <h3 class="font-semibold text-ink">{{ sec.name }}</h3>
                <span class="text-xs text-ink-subtle bg-surface-sunken px-1.5 py-0.5 rounded-md">{{ topTasks(sec.id).length }}</span>
                <span v-if="canDrag" class="ml-auto text-[11px] text-ink-subtle inline-flex items-center gap-1"><i class="fas fa-up-down-left-right"></i> arraste para reordenar</span>
            </div>

            <!-- Barra de edição em lote -->
            <div v-if="isAdmin && selectedInSection(sec.id).length" class="flex items-center gap-x-3 gap-y-2 flex-wrap px-4 py-3 bg-accent-soft/40 border-b border-accent/20 animate-slide-down">
                <span class="text-xs font-semibold text-accent inline-flex items-center gap-1.5 shrink-0"><i class="fas fa-check-double"></i> {{ selectedInSection(sec.id).length }} selecionada(s)</span>
                <span class="h-5 w-px bg-accent/20 shrink-0"></span>
                <select @change="bulkStatus(sec.id, $event)" :class="bulkCtrl" title="Mudar status das selecionadas"><option value="">Mudar status</option><option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.label }}</option></select>
                <select @change="bulkAssignee(sec.id, $event)" :class="bulkCtrl" title="Atribuir responsável"><option value="">Atribuir responsável</option><option v-for="u in store.users" :key="u.id" :value="u.id">{{ u.username }}</option></select>
                <select @change="bulkPriority(sec.id, $event)" :class="bulkCtrl" title="Definir prioridade"><option value="">Definir prioridade</option><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select>
                <label class="text-xs text-ink-muted inline-flex items-center gap-1.5">Prazo:<input type="date" @change="bulkDue(sec.id, $event)" :class="bulkCtrl" /></label>
                <span class="inline-flex items-center gap-1.5">
                    <input v-model="bulkCat[sec.id]" list="checklist-cats" @keyup.enter="bulkMoveCategory(sec.id)" placeholder="Mover p/ categoria" :class="[bulkCtrl, 'w-40']" title="Digite a categoria de destino (existente ou nova)" />
                    <Button variant="normal" size="sm" @click="bulkMoveCategory(sec.id)">Mover</Button>
                </span>
                <!-- <span class="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                    Adiar
                    <input type="number" v-model.number="shiftN" class="w-14 text-xs rounded-lg border border-line bg-surface-raised text-ink px-2 py-1.5 focus-ring" />
                    dias
                </span> -->
                <div class="ml-auto inline-flex items-center gap-1.5">
                    <Button variant="normal" size="sm" @click="bulkShift(sec.id)">Aplicar</Button>
                    <Button variant="danger" size="sm" icon="fas fa-trash" @click="bulkDelete(sec.id)">Excluir</Button>
                    <Button variant="subtle" size="sm" @click="clearSection(sec.id)">Limpar</Button>
                </div>
            </div>

            <!-- Tabela -->
            <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                    <thead>
                        <tr class="text-ink-subtle text-[11px] uppercase tracking-wide border-b border-line bg-surface-sunken/20">
                            <th class="w-9 px-2 py-2"></th>
                            <th class="px-3 py-2 text-left font-semibold">Tarefa</th>
                            <th class="w-52 px-3 py-2 text-left font-semibold">Anotação</th>
                            <th class="w-48 px-3 py-2 text-left font-semibold">Status</th>
                            <th class="w-36 px-3 py-2 text-left font-semibold">Responsável</th>
                            <th class="w-36 px-3 py-2 text-left font-semibold">Prazo</th>
                            <th class="w-10 px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-for="cat in categoriesOf(sec.id)" :key="cat || 'geral'">
                            <tr v-if="cat" class="bg-surface-sunken/30" @dragover="onRowDragOver({ id: null }, $event)" @drop="onDrop(null, sec.id, cat)">
                                <td></td>
                                <td colspan="6" class="px-3 py-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wide">{{ cat }}</td>
                            </tr>
                            <tr v-for="t in tasksByCategory(sec.id, cat)" :key="t.id"
                                :draggable="canDrag"
                                @dragstart="onDragStart(t, $event)" @dragend="onDragEnd"
                                @dragover="onRowDragOver(t, $event)" @drop="onDrop(t.id, sec.id, cat)"
                                class="border-t border-line-subtle group transition-colors"
                                :class="[
                                    store.isSelected(t.id) ? 'bg-accent-soft/40' : 'hover:bg-surface-sunken/50',
                                    dragId === t.id ? 'opacity-40' : '',
                                    dragOverId === t.id ? '!border-t-2 !border-accent' : '',
                                    canDrag ? 'cursor-grab active:cursor-grabbing' : '',
                                ]"
                                @mouseenter="onHover(t, $event)" @mouseleave="onLeave">
                                <td class="px-2 py-1.5 text-center align-middle whitespace-nowrap">
                                    <i v-if="canDrag" class="fas fa-grip-vertical text-[11px] text-ink-subtle/40 group-hover:text-ink-subtle mr-1" title="Arraste para reordenar ou mover de categoria"></i>
                                    <input v-if="isAdmin" type="checkbox" :checked="store.isSelected(t.id)" @change="store.toggleSelect(t.id)" class="h-4 w-4 cursor-pointer rounded align-middle" />
                                </td>
                                <td class="px-3 py-1.5 align-middle">
                                    <button @click="emit('open-task', t.id)" class="text-left text-ink font-medium hover:text-accent transition-colors w-80 truncate">{{ t.title }}</button>
                                    <span v-if="t.attachments_count" class="ml-2 text-xs text-ink-subtle"><i class="fas fa-paperclip"></i> {{ t.attachments_count }}</span>
                                    <span v-if="t.comments_count" class="ml-1.5 text-xs text-ink-subtle"><i class="fas fa-comment"></i> {{ t.comments_count }}</span>
                                </td>
                                <td class="px-3 py-1.5 align-middle">
                                    <span v-if="t.description" class="block max-w-[13rem] truncate text-xs text-ink-muted italic" :title="t.description"><i class="fas fa-note-sticky text-ink-subtle/60 mr-1"></i>{{ t.description }}</span>
                                    <span v-else class="text-ink-subtle/40 text-xs">—</span>
                                </td>
                                <td class="px-2 py-1.5 align-middle">
                                    <div class="flex items-center gap-1.5">
                                        <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: statusColor(t.status_id) }"></span>
                                        <select :value="t.status_id || ''" @change="onStatusChange(t, $event)" :class="cellInput">
                                            <option :value="''">- sem status -</option>
                                            <option v-for="s in statuses" class="text-center" :key="s.id" :value="s.id">{{ s.label }}</option>
                                        </select>
                                    </div>
                                </td>
                                <td class="px-3 py-1.5 align-middle">
                                    <div class="flex justify-center">
                                        <UserAvatarStack v-if="assigneesOf(t).length" :users="assigneesOf(t)" :size="24" :max="3" @select="infoUser = $event" />
                                        <span v-else-if="t.assignee_label" class="text-ink-muted text-xs truncate" :title="t.assignee_label">{{ t.assignee_label }}</span>
                                        <span v-else class="text-ink-subtle">-</span>
                                    </div>
                                </td>
                                <td class="px-2 py-1.5 align-middle">
                                    <input type="date" :value="t.due_date || ''" :disabled="!isAdmin" @change="store.patchTask(t.id, { due_date: $event.target.value || null })"
                                        class="text-center -me-6" :class="[cellInput, t.due_date && t.due_date < today && t.state_class !== 'DONE' ? '!text-red-500 font-semibold' : 'text-ink-muted']" />
                                </td>
                                <td class="px-2 py-1.5 text-right align-middle">
                                    <button @click="emit('open-task', t.id)" title="Abrir" class="text-ink-subtle hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity focus-ring rounded"><i class="fas fa-up-right-and-down-left-from-center text-xs"></i></button>
                                </td>
                            </tr>
                            <tr v-if="cat && isAdmin" class="border-t border-line-subtle/40">
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

                        <!-- Nova tarefa (admin) -->
                        <tr v-if="isAdmin" class="border-t border-line">
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

        <div v-if="isAdmin" class="flex items-center gap-2">
            <input v-model="newSection" @keyup.enter="addSection" placeholder="+ Nova seção"
                class="text-sm rounded-lg border border-line bg-surface-raised text-ink px-3 py-2 focus-ring" />
            <button @click="addSection" class="text-sm text-accent hover:underline font-medium">adicionar seção</button>
        </div>

        <!-- Categorias existentes p/ o "Mover p/ categoria" da barra em lote -->
        <datalist id="checklist-cats">
            <option v-for="c in categoriesInChecklist()" :key="c" :value="c" />
        </datalist>

        <TaskPreview v-if="hover" :task="hover.task" :x="hover.x" :y="hover.y" />
        <UserInfoModal v-if="infoUser" :user="infoUser" @close="infoUser = null" />

        <!-- Confirmação ao arrastar uma tarefa para OUTRA categoria/seção -->
        <Modal :open="!!moveConfirm" size="sm" title="Mover tarefa" @close="cancelMove">
            <div class="flex items-start gap-3">
                <span class="h-9 w-9 grid place-items-center rounded-full bg-accent-soft text-accent shrink-0"><i class="fas fa-arrows-turn-to-dots"></i></span>
                <p class="text-sm text-ink-muted">
                    Mover <strong class="text-ink">{{ moveConfirm?.src?.title }}</strong>
                    para a categoria <strong class="text-ink">{{ moveConfirm?.toCat || 'Geral (sem categoria)' }}</strong>?
                </p>
            </div>
            <template #footer>
                <Button variant="ghost" size="sm" @click="cancelMove">Cancelar</Button>
                <Button variant="primary" size="sm" icon="fas fa-check" @click="confirmMove">Mover</Button>
            </template>
        </Modal>

        <Modal :open="!!doneConfirm" size="sm" title="Concluir tarefa" @close="cancelDone">
            <div class="flex items-start gap-3">
                <span class="h-9 w-9 grid place-items-center rounded-full bg-accent-soft text-accent shrink-0"><i class="fas fa-flag-checkered"></i></span>
                <p class="text-sm text-ink-muted">Ao concluir, a tarefa <strong class="text-ink">não poderá voltar</strong> para outras etapas depois. Deseja concluir?</p>
            </div>
            <template #footer>
                <Button variant="ghost" size="sm" @click="cancelDone">Cancelar</Button>
                <Button variant="primary" size="sm" icon="fas fa-flag-checkered" @click="confirmDone">Concluir</Button>
            </template>
        </Modal>
    </div>
</template>
