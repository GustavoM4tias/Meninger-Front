<script setup>
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import TaskPreview from './TaskPreview.vue';

const store = useChecklistStore();
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
const brl = (v) => (Number(v) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) : '');

const draggedId = ref(null);
const dragOverCol = ref(undefined);
const colKey = (id) => (id === null ? '__none' : id);

function onDragStart(id, ev) {
    draggedId.value = id;
    if (ev?.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(id)); } catch { /* noop */ } }
}
function onDragEnd() { draggedId.value = null; dragOverCol.value = undefined; }
function onDrop(statusId) {
    if (draggedId.value != null) store.setTaskStatus(draggedId.value, statusId);
    draggedId.value = null; dragOverCol.value = undefined;
}
const colClass = (id) => (dragOverCol.value === colKey(id) ? 'bg-accent-soft/40 ring-2 ring-accent-ring/40' : 'ring-1 ring-transparent');

// Preview ao passar o mouse (1s)
const hover = ref(null);
let hoverTimer = null;
function onHover(t, ev) { const x = ev.clientX, y = ev.clientY; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { hover.value = { task: t, x, y }; }, 1000); }
function onLeave() { clearTimeout(hoverTimer); hover.value = null; }
</script>

<template>
    <div class="flex gap-3 overflow-x-auto pb-3 select-none">
        <!-- Sem status -->
        <div v-if="noStatus.length" class="flex-shrink-0 w-72"
            @dragover.prevent="dragOverCol = colKey(null)" @drop="onDrop(null)">
            <div class="flex items-center gap-2 mb-2 px-1">
                <span class="w-2.5 h-2.5 rounded-full bg-ink-subtle"></span>
                <span class="text-sm font-semibold text-ink-muted">Sem status</span>
                <span class="text-xs text-ink-subtle">{{ noStatus.length }}</span>
            </div>
            <div class="space-y-2 min-h-[60px] rounded-xl p-1.5 transition" :class="colClass(null)">
                <div v-for="t in noStatus" :key="t.id" draggable="true" @dragstart="onDragStart(t.id, $event)" @dragend="onDragEnd" @click="emit('open-task', t.id)" @mouseenter="onHover(t, $event)" @mouseleave="onLeave"
                    class="surface-card p-3 cursor-grab active:cursor-grabbing hover:shadow-elevated transition" :class="draggedId === t.id ? 'opacity-40' : ''">
                    <p class="text-sm font-medium text-ink">{{ t.title }}</p>
                    <p class="text-xs text-ink-subtle mt-1">{{ sectionName(t.section_id) }}</p>
                </div>
            </div>
        </div>

        <!-- Colunas por status -->
        <div v-for="s in statuses" :key="s.id" class="flex-shrink-0 w-72"
            @dragover.prevent="dragOverCol = colKey(s.id)" @drop="onDrop(s.id)">
            <div class="flex items-center gap-2 mb-2 px-1">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ background: s.color || scColor(s.state_class) }"></span>
                <span class="text-sm font-semibold text-ink-muted">{{ s.label }}</span>
                <span class="text-xs text-ink-subtle">{{ tasksOf(s.id).length }}</span>
            </div>
            <div class="space-y-2 min-h-[60px] rounded-xl p-1.5 transition" :class="colClass(s.id)"
                :style="{ borderTop: `3px solid ${s.color || scColor(s.state_class)}` }">
                <div v-for="t in tasksOf(s.id)" :key="t.id" draggable="true" @dragstart="onDragStart(t.id, $event)" @dragend="onDragEnd" @click="emit('open-task', t.id)" @mouseenter="onHover(t, $event)" @mouseleave="onLeave"
                    class="surface-card p-3 cursor-grab active:cursor-grabbing hover:shadow-elevated transition" :class="draggedId === t.id ? 'opacity-40' : ''">
                    <p class="text-sm font-medium text-ink">{{ t.title }}</p>
                    <div class="flex items-center gap-2 mt-2 text-xs text-ink-subtle flex-wrap">
                        <span>{{ sectionName(t.section_id) }}</span>
                        <span v-if="t.due_date" :class="t.due_date < today && t.state_class !== 'DONE' ? 'text-red-500 font-semibold' : ''"><i class="fas fa-clock"></i> {{ dayjs(t.due_date).format('DD/MM') }}</span>
                        <span v-if="t.assignee" class="ml-auto"><i class="fas fa-user"></i> {{ t.assignee.username }}</span>
                        <span v-else-if="t.assignee_label" class="ml-auto">{{ t.assignee_label }}</span>
                    </div>
                    <p v-if="brl(t.value)" class="text-xs text-ink-subtle mt-1">{{ brl(t.value) }}</p>
                </div>
            </div>
        </div>
        <TaskPreview v-if="hover" :task="hover.task" :x="hover.x" :y="hover.y" />
    </div>
</template>
