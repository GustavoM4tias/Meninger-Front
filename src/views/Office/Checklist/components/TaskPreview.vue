<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';

const props = defineProps({
    task: { type: Object, required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
});
const store = useChecklistStore();

const status = computed(() => store.statusById.get(props.task.status_id) || null);
const scColor = (sc) => ({ TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', BLOCKED: '#ef4444', DONE: '#22c55e', CANCELLED: '#9ca3af' }[sc] || '#94a3b8');
const fmt = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : null);
const PRIO = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' };

const style = computed(() => {
    const w = 320, h = 250;
    let left = props.x + 16, top = props.y + 12;
    if (typeof window !== 'undefined') {
        if (left + w > window.innerWidth) left = props.x - w - 16;
        if (top + h > window.innerHeight) top = window.innerHeight - h - 8;
        if (left < 4) left = 4;
        if (top < 4) top = 4;
    }
    return { left: left + 'px', top: top + 'px' };
});
</script>

<template>
    <div class="fixed z-[60] w-80 surface-card shadow-overlay p-3 pointer-events-none animate-fade-in" :style="style">
        <div class="flex items-start gap-2 mb-2">
            <span class="w-2.5 h-2.5 rounded-full mt-1 shrink-0" :style="{ background: status?.color || scColor(status?.state_class) }"></span>
            <p class="text-sm font-semibold text-ink leading-snug">{{ task.title }}</p>
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted mb-1.5">
            <span v-if="status"><i class="fas fa-flag"></i> {{ status.label }}</span>
            <span><i class="fas fa-bolt"></i> {{ PRIO[task.priority] || task.priority }}</span>
            <span v-if="task.assignee || task.assignee_label"><i class="fas fa-user"></i> {{ task.assignee?.username || task.assignee_label }}</span>
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted mb-1.5">
            <span v-if="fmt(task.contracted_at)"><i class="fas fa-file-signature"></i> {{ fmt(task.contracted_at) }}</span>
            <span v-if="fmt(task.due_date)"><i class="fas fa-clock"></i> {{ fmt(task.due_date) }}</span>
        </div>
        <p v-if="task.category" class="text-[11px] text-ink-subtle mb-1.5"><i class="fas fa-layer-group"></i> {{ task.category }}</p>
        <p v-if="task.description" class="text-xs text-ink-muted line-clamp-3 border-t border-line pt-2 whitespace-pre-wrap">{{ task.description }}</p>
        <div class="flex gap-3 text-xs text-ink-subtle mt-2">
            <span><i class="fas fa-paperclip"></i> {{ task.attachments_count || 0 }} anexo(s)</span>
            <span><i class="fas fa-comment"></i> {{ task.comments_count || 0 }} coment.</span>
        </div>
    </div>
</template>
