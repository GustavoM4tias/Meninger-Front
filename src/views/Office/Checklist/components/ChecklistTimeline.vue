<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';

const store = useChecklistStore();
defineEmits(['open-task']);

const TODAY = dayjs().format('YYYY-MM-DD');
const allTasks = computed(() => (store.current?.tasks || []).filter((t) => !t.parent_task_id));
const sections = computed(() => store.current?.sections || []);
const keyDates = computed(() => (store.current?.checklist?.key_dates || []).filter((k) => k.date));

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
const fmt = (d) => (d ? dayjs(d).format('DD/MM') : '');
</script>

<template>
    <div class="surface-card overflow-hidden">
        <div v-if="!range" class="text-center text-ink-subtle py-10">Sem datas para a linha do tempo. Defina prazos nas tarefas.</div>
        <div v-else class="overflow-x-auto">
            <div class="min-w-[820px]">
                <!-- Cabeçalho: meses + marcos -->
                <div class="flex border-b border-line bg-surface-sunken/40 sticky top-0 z-20">
                    <div class="w-56 shrink-0 px-3 py-2 text-[11px] font-semibold text-ink-muted uppercase tracking-wide border-r border-line">Tarefa</div>
                    <div class="flex-1 relative h-10">
                        <div v-for="m in months" :key="'m' + m.left" class="absolute bottom-1 text-[10px] text-ink-subtle -translate-x-1/2" :style="{ left: m.left + '%' }">{{ m.label }}</div>
                        <div v-for="k in keyDates" :key="'kh' + k.key" class="absolute top-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 -translate-x-1/2 whitespace-nowrap" :style="{ left: pct(k.date) + '%' }" :title="k.label">▼ {{ k.label }}</div>
                        <div class="absolute top-1 text-[10px] font-semibold text-accent -translate-x-1/2" :style="{ left: pct(TODAY) + '%' }">hoje</div>
                    </div>
                </div>

                <!-- Corpo -->
                <div class="relative">
                    <!-- Grade vertical (alinhada à área do gráfico, após a coluna de nomes) -->
                    <div class="absolute inset-0 left-56 pointer-events-none z-0">
                        <div v-for="m in months" :key="'g' + m.left" class="absolute top-0 bottom-0 border-l border-line-subtle/70" :style="{ left: m.left + '%' }"></div>
                        <div v-for="k in keyDates" :key="'gk' + k.key" class="absolute top-0 bottom-0 border-l-2 border-dashed border-amber-400/50" :style="{ left: pct(k.date) + '%' }"></div>
                        <div class="absolute top-0 bottom-0 border-l-2 border-accent/70" :style="{ left: pct(TODAY) + '%' }"></div>
                    </div>

                    <template v-for="sec in sections" :key="sec.id">
                        <div class="flex items-center bg-surface-sunken/30 border-b border-line-subtle relative z-10">
                            <div class="w-56 shrink-0 px-3 py-1.5 text-xs font-semibold text-ink flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full" :style="{ background: sec.color || '#64748b' }"></span>{{ sec.name }}
                            </div>
                            <div class="flex-1"></div>
                        </div>
                        <div v-for="t in tasksOfSection(sec.id)" :key="t.id"
                            class="flex items-center border-b border-line-subtle/60 hover:bg-surface-sunken/40 cursor-pointer relative z-10"
                            @click="$emit('open-task', t.id)">
                            <div class="w-56 shrink-0 px-3 py-2 text-xs text-ink truncate border-r border-line/50" :title="t.title">{{ t.title }}</div>
                            <div class="flex-1 relative h-7">
                                <div v-if="t.due_date" class="absolute h-4 top-1.5 rounded-md shadow-soft" :style="barStyle(t)" :title="`${t.title} — ${fmt(t.contracted_at)}${t.contracted_at ? '→' : ''}${fmt(t.due_date)}`"></div>
                                <span v-else class="absolute left-1 top-1.5 text-[10px] text-ink-subtle italic">sem prazo</span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>
