<script setup>
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import TaskPreview from './TaskPreview.vue';

const store = useChecklistStore();
defineProps({ isAdmin: { type: Boolean, default: false } });
const emit = defineEmits(['open-task']);

const today = dayjs().format('YYYY-MM-DD');
const statuses = computed(() => store.current?.statuses || []);
const topTasks = computed(() => (store.current?.tasks || []).filter((t) => !t.parent_task_id));

function tasksOf(statusId) {
    return topTasks.value.filter((t) => (t.status_id || null) === statusId).sort((a, b) => (a.position || 0) - (b.position || 0));
}
const noStatus = computed(() => topTasks.value.filter((t) => !t.status_id));
const scColor = (sc) => ({ TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', BLOCKED: '#ef4444', DONE: '#22c55e', CANCELLED: '#9ca3af' }[sc] || '#94a3b8');
const sectionName = (id) => store.current?.sections?.find((s) => s.id === id)?.name || '';

// Colunas unificadas: "Sem status" (só se houver) + uma por status.
const columns = computed(() => {
    const cols = [];
    if (noStatus.value.length) cols.push({ id: null, key: '__none', label: 'Sem status', color: '#94a3b8', tasks: noStatus.value });
    for (const s of statuses.value) cols.push({ id: s.id, key: s.id, label: s.label, color: s.color || scColor(s.state_class), tasks: tasksOf(s.id) });
    return cols;
});

// Metadados visuais do card
const PRIORITY = { URGENT: { l: 'Urgente', c: '#ef4444' }, HIGH: { l: 'Alta', c: '#f59e0b' }, LOW: { l: 'Baixa', c: '#94a3b8' } };
const prio = (t) => PRIORITY[t.priority] || null; // MEDIUM/sem prioridade → sem selo
const initials = (n) => (n || '?').split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const fmtShort = (d) => dayjs(d).format('DD/MM');
const isOverdue = (t) => t.due_date && t.due_date < today && t.state_class !== 'DONE';

const draggedId = ref(null);
const dragOverCol = ref(undefined);

function onDragStart(id, ev) {
    draggedId.value = id;
    if (ev?.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(id)); } catch { /* noop */ } }
}
function onDragEnd() { draggedId.value = null; dragOverCol.value = undefined; }
function onDrop(statusId) {
    if (draggedId.value != null) store.setTaskStatus(draggedId.value, statusId);
    draggedId.value = null; dragOverCol.value = undefined;
}

// Preview ao passar o mouse (1s)
const hover = ref(null);
let hoverTimer = null;
function onHover(t, ev) { const x = ev.clientX, y = ev.clientY; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { hover.value = { task: t, x, y }; }, 1000); }
function onLeave() { clearTimeout(hoverTimer); hover.value = null; }
</script>

<template>
    <div class="flex gap-3 overflow-x-auto pb-3 select-none board-scroll">
        <div v-for="col in columns" :key="col.key" class="flex-shrink-0 w-[17rem] sm:w-72"
            @dragover.prevent="dragOverCol = col.key" @drop="onDrop(col.id)">
            <!-- Cabeçalho da coluna -->
            <div class="flex items-center gap-2 mb-2 px-1.5">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: col.color }"></span>
                <span class="text-sm font-semibold text-ink truncate">{{ col.label }}</span>
                <span class="ml-auto text-xs text-ink-subtle bg-surface-sunken px-1.5 py-0.5 rounded-md tabular-nums shrink-0">{{ col.tasks.length }}</span>
            </div>

            <!-- Corpo (drop zone) -->
            <div class="space-y-2 min-h-[120px] rounded-xl p-1.5 border-t-2 transition-colors duration-150"
                :style="{ borderTopColor: col.color }"
                :class="dragOverCol === col.key ? 'bg-accent-soft/50 ring-2 ring-accent-ring/40' : 'bg-surface-sunken/30 ring-1 ring-transparent'">

                <div v-for="t in col.tasks" :key="t.id" draggable="true"
                    @dragstart="onDragStart(t.id, $event)" @dragend="onDragEnd"
                    @click="emit('open-task', t.id)" @mouseenter="onHover(t, $event)" @mouseleave="onLeave"
                    class="group surface-card p-3 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-elevated hover:border-accent/40 transition-all duration-150 animate-fade-in"
                    :class="draggedId === t.id ? 'opacity-40' : ''">
                    <div class="flex items-start gap-2">
                        <p class="text-sm font-medium text-ink leading-snug flex-1 min-w-0 group-hover:text-accent transition-colors">{{ t.title }}</p>
                        <span v-if="prio(t)" class="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            :style="{ color: prio(t).c, background: prio(t).c + '1a' }">{{ prio(t).l }}</span>
                    </div>
                    <p v-if="sectionName(t.section_id)" class="text-[11px] text-ink-subtle mt-1 truncate">{{ sectionName(t.section_id) }}</p>
                    <div class="flex items-center gap-2 mt-2.5 text-[11px] text-ink-subtle">
                        <span v-if="t.due_date" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                            :class="isOverdue(t) ? 'bg-red-500/10 text-red-500 font-semibold' : 'bg-surface-sunken text-ink-muted'">
                            <i class="fas fa-clock"></i>{{ fmtShort(t.due_date) }}
                        </span>
                        <span v-if="t.attachments_count" class="inline-flex items-center gap-0.5"><i class="fas fa-paperclip"></i>{{ t.attachments_count }}</span>
                        <span v-if="t.comments_count" class="inline-flex items-center gap-0.5"><i class="fas fa-comment"></i>{{ t.comments_count }}</span>
                        <span v-if="t.assignee" class="ml-auto inline-flex items-center gap-1" :title="t.assignee.username">
                            <span class="h-5 w-5 rounded-full bg-gradient-to-br from-accent-soft to-surface-sunken text-accent text-[9px] font-semibold grid place-items-center uppercase ring-1 ring-line">{{ initials(t.assignee.username) }}</span>
                            <span v-if="(t.assignee_user_ids || []).length > 1" class="text-ink-subtle">+{{ t.assignee_user_ids.length - 1 }}</span>
                        </span>
                        <span v-else-if="t.assignee_label" class="ml-auto truncate max-w-[7rem]" :title="t.assignee_label">{{ t.assignee_label }}</span>
                    </div>
                </div>

                <p v-if="!col.tasks.length" class="text-center text-[11px] text-ink-subtle py-6 select-none">
                    {{ dragOverCol === col.key ? 'Solte aqui' : 'Sem tarefas' }}
                </p>
            </div>
        </div>
        <TaskPreview v-if="hover" :task="hover.task" :x="hover.x" :y="hover.y" />
    </div>
</template>

<style scoped>
.board-scroll { scrollbar-width: thin; scrollbar-color: rgb(148 163 184 / 0.35) transparent; }
.board-scroll::-webkit-scrollbar { height: 8px; }
.board-scroll::-webkit-scrollbar-thumb { background: rgb(148 163 184 / 0.35); border-radius: 9999px; }
.board-scroll::-webkit-scrollbar-thumb:hover { background: rgb(148 163 184 / 0.6); }
.board-scroll::-webkit-scrollbar-track { background: transparent; }
</style>
