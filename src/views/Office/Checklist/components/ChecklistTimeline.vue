<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';

const store = useChecklistStore();
defineEmits(['open-task']);

const TODAY = dayjs().format('YYYY-MM-DD');
const allTasks = computed(() => (store.current?.tasks || []).filter((t) => !t.parent_task_id));
const sections = computed(() => store.current?.sections || []);

// Marcos (datas de referência) com cor própria — rotuladas na legenda, não sobre a linha.
const MILESTONE_COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
const keyDates = computed(() =>
    (store.current?.checklist?.key_dates || [])
        .filter((k) => k.date)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((k, i) => ({ ...k, color: MILESTONE_COLORS[i % MILESTONE_COLORS.length] })),
);

const range = computed(() => {
    const ds = [];
    for (const t of allTasks.value) { if (t.due_date) ds.push(t.due_date); if (t.contracted_at) ds.push(t.contracted_at); }
    for (const k of keyDates.value) ds.push(k.date);
    ds.push(TODAY);
    if (!ds.length) return null;
    const min = dayjs(ds.reduce((a, b) => (a < b ? a : b))).subtract(4, 'day').format('YYYY-MM-DD');
    const max = dayjs(ds.reduce((a, b) => (a > b ? a : b))).add(4, 'day').format('YYYY-MM-DD');
    return { min, max, span: Math.max(1, dayjs(max).diff(dayjs(min), 'day')) };
});

function pct(date) {
    if (!range.value || !date) return 0;
    return Math.max(0, Math.min(100, (dayjs(date).diff(dayjs(range.value.min), 'day') / range.value.span) * 100));
}

const months = computed(() => {
    if (!range.value) return [];
    const out = [];
    let cur = dayjs(range.value.min).startOf('month');
    const end = dayjs(range.value.max);
    while (cur.isBefore(end)) { out.push({ label: cur.format('MMM/YY'), left: pct(cur.format('YYYY-MM-DD')) }); cur = cur.add(1, 'month'); }
    return out;
});

function tasksOfSection(secId) {
    return allTasks.value.filter((t) => t.section_id === secId)
        .sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
}

const scColor = (sc) => ({ TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', BLOCKED: '#ef4444', DONE: '#22c55e', CANCELLED: '#9ca3af' }[sc] || '#94a3b8');
function barStyle(t) {
    const end = pct(t.due_date);
    const start = t.contracted_at && t.contracted_at < t.due_date ? pct(t.contracted_at) : Math.max(0, end - 2.5);
    const left = Math.min(start, end);
    const width = Math.max(2.5, Math.abs(end - start));
    return { left: left + '%', width: width + '%', background: store.statusById.get(t.status_id)?.color || scColor(t.state_class) };
}
const fmt = (d) => (d ? dayjs(d).format('DD/MM/YY') : '');
</script>

<template>
    <div class="space-y-3">
        <!-- Legenda dos marcos / hoje -->
        <div v-if="range && (keyDates.length || true)" class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span class="inline-flex items-center gap-1.5 text-ink-muted">
                <span class="w-2.5 h-2.5 rounded-full bg-accent"></span> Hoje <span class="text-ink-subtle">({{ fmt(TODAY) }})</span>
            </span>
            <span v-for="k in keyDates" :key="k.key" class="inline-flex items-center gap-1.5 text-ink-muted">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ background: k.color }"></span>
                {{ k.label }} <span class="text-ink-subtle">({{ fmt(k.date) }})</span>
            </span>
        </div>

        <div class="surface-card overflow-hidden">
            <div v-if="!range" class="text-center text-ink-subtle py-12">
                <i class="fas fa-chart-gantt text-2xl mb-2 block opacity-50"></i>
                Sem datas para a linha do tempo. Defina prazos nas tarefas.
            </div>
            <div v-else class="overflow-x-auto">
                <div class="min-w-[760px]">
                    <!-- Cabeçalho: eixo de meses -->
                    <div class="flex border-b border-line bg-surface-sunken/40 sticky top-0 z-20">
                        <div class="w-48 shrink-0 px-3 py-2.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wide border-r border-line">Tarefa</div>
                        <div class="flex-1 relative h-9">
                            <div v-for="m in months" :key="'m' + m.left" class="absolute bottom-1.5 -translate-x-1/2 flex flex-col items-center" :style="{ left: m.left + '%' }">
                                <span class="text-[10px] font-medium text-ink-subtle whitespace-nowrap">{{ m.label }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Corpo -->
                    <div class="relative">
                        <!-- Overlay: grade de meses + linhas de marcos + hoje (alinhado após a coluna de nomes) -->
                        <div class="absolute inset-0 left-48 pointer-events-none z-0">
                            <div v-for="m in months" :key="'g' + m.left" class="absolute top-0 bottom-0 border-l border-line-subtle/60" :style="{ left: m.left + '%' }"></div>
                            <div v-for="k in keyDates" :key="'gk' + k.key" class="absolute top-0 bottom-0 border-l-2 border-dashed" :style="{ left: pct(k.date) + '%', borderColor: k.color + '99' }"></div>
                            <div class="absolute top-0 bottom-0 border-l-2 border-accent" :style="{ left: pct(TODAY) + '%' }"></div>
                        </div>

                        <template v-for="sec in sections" :key="sec.id">
                            <!-- Cabeçalho de seção -->
                            <div class="flex items-center bg-surface-sunken/40 border-y border-line-subtle relative z-10">
                                <div class="w-48 shrink-0 px-3 py-1.5 text-xs font-semibold text-ink flex items-center gap-2 truncate">
                                    <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: sec.color || '#64748b' }"></span>
                                    <span class="truncate">{{ sec.name }}</span>
                                </div>
                                <div class="flex-1"></div>
                            </div>
                            <!-- Tarefas -->
                            <div v-for="t in tasksOfSection(sec.id)" :key="t.id"
                                class="flex items-center border-b border-line-subtle/50 hover:bg-surface-sunken/40 cursor-pointer relative z-10 group"
                                @click="$emit('open-task', t.id)">
                                <div class="w-48 shrink-0 px-3 py-2 text-xs text-ink truncate border-r border-line/40 group-hover:text-accent transition-colors" :title="t.title">{{ t.title }}</div>
                                <div class="flex-1 relative h-8">
                                    <template v-if="t.due_date">
                                        <div class="absolute h-4 top-2 rounded-md shadow-soft ring-1 ring-black/5" :style="barStyle(t)"
                                            :title="`${t.title}${t.contracted_at ? ' · ' + fmt(t.contracted_at) + ' → ' : ' · '}${fmt(t.due_date)}`"></div>
                                        <span class="absolute top-1.5 text-[10px] text-ink-subtle whitespace-nowrap"
                                            :style="{ left: `calc(${pct(t.due_date)}% + 6px)` }">{{ fmt(t.due_date) }}</span>
                                    </template>
                                    <span v-else class="absolute left-2 top-2 text-[10px] text-ink-subtle italic">sem prazo</span>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
