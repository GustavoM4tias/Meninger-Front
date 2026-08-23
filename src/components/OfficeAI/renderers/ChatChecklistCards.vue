<script setup>
// Renderer de CHECKLIST na Eme. Dois tipos, vindos de ChecklistTools (backend):
//   type 'checklist_cards' → cards de checklist (progresso, atrasadas, abrir)
//   type 'checklist_tasks' → cards de tarefa (etapa por state_class, prazo,
//     aprovação, responsável). Espelha o TaskPreview.vue da tela.
import { useRouter } from 'vue-router';

const props = defineProps({ action: { type: Object, required: true } });
const router = useRouter();

// Cores por state_class — mesmas da tela (TaskPreview.vue).
const STATE = {
    TODO: { label: 'A fazer', cls: 'text-ink-muted bg-slate-500/10 border-line/20', dot: '#94a3b8' },
    IN_PROGRESS: { label: 'Em andamento', cls: 'text-accent bg-accent/10 border-accent/20', dot: '#3b82f6' },
    BLOCKED: { label: 'Bloqueada', cls: 'text-data-neg bg-data-neg/10 border-data-neg/20', dot: '#ef4444' },
    DONE: { label: 'Concluída', cls: 'text-data-pos bg-data-pos/10 border-data-pos/20', dot: '#22c55e' },
    CANCELLED: { label: 'Cancelada', cls: 'text-ink-muted bg-surface-sunken border-line', dot: '#9ca3af' },
};
const st = (sc) => STATE[sc] || STATE.TODO;

function open(link) {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) { window.open(link, '_blank'); return; }
    router.push(link);
}
</script>

<template>
    <div class="mt-2 space-y-2">
        <p v-if="action.title" class="px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ action.title }}</p>
        <p v-if="action.subtitle" class="px-0.5 -mt-1 text-micro text-ink-subtle">{{ action.subtitle }}</p>

        <div v-for="(c, i) in (action.cards || [])" :key="c.id || i"
            class="rounded-xl border border-line bg-surface-raised p-3 shadow-soft transition hover:border-accent/40">

            <!-- ═══ Card de CHECKLIST ═══ -->
            <template v-if="c.kind === 'checklist'">
                <div class="flex items-start gap-2.5">
                    <span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-accent/20 bg-accent-soft text-xs text-accent">
                        <i class="fas fa-list-check"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-semibold text-ink">{{ c.title }}</p>
                        <p v-if="c.empreendimento" class="mt-0.5 truncate text-xs text-ink-muted">
                            <i class="fas fa-building mr-1 text-[9px]"></i>{{ c.empreendimento }}
                        </p>
                    </div>
                    <button type="button" @click="open(c.link)"
                        class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-1
                               text-xs font-medium text-accent transition hover:bg-accent hover:text-white">
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>Abrir
                    </button>
                </div>
                <!-- barra de progresso -->
                <div class="mt-2">
                    <div class="flex items-center justify-between text-micro text-ink-subtle">
                        <span>{{ c.progresso.done }}/{{ c.progresso.total }} concluídas</span>
                        <span class="flex items-center gap-2">
                            <span v-if="c.progresso.overdue" class="text-data-neg">{{ c.progresso.overdue }} atrasada(s)</span>
                            <span class="font-semibold text-ink-muted">{{ c.progresso.pct }}%</span>
                        </span>
                    </div>
                    <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <div class="h-full rounded-full bg-accent transition-all" :style="{ width: `${c.progresso.pct}%` }"></div>
                    </div>
                </div>
            </template>

            <!-- ═══ Card de TAREFA ═══ -->
            <template v-else>
                <div class="flex items-start gap-2.5">
                    <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: st(c.state_class).dot }"></span>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-ink" :class="c.state_class === 'DONE' ? 'line-through opacity-60' : ''">{{ c.title }}</p>
                        <p v-if="c.checklist && !action.subtitle" class="mt-0.5 truncate text-micro text-ink-subtle">
                            <i class="fas fa-list-check mr-1 text-[9px]"></i>{{ c.checklist }}
                        </p>
                        <div class="mt-1 flex flex-wrap items-center gap-1">
                            <span class="rounded-md border px-1.5 py-0.5 text-micro font-medium" :class="st(c.state_class).cls">{{ c.statusLabel }}</span>
                            <span v-if="c.aprovacao"
                                class="rounded-md border border-data-warn/20 bg-data-warn/10 px-1.5 py-0.5 text-micro font-medium text-data-warn">
                                <i class="fas fa-stamp mr-1 text-[9px]"></i>{{ c.aprovacao }}
                            </span>
                            <span v-if="c.responsavel" class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-micro text-ink-muted">
                                <i class="fas fa-user mr-1 text-[9px]"></i>{{ c.responsavel }}
                            </span>
                            <span v-if="c.due" class="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-micro text-ink-muted">
                                <i class="fas fa-calendar mr-1 text-[9px]"></i>{{ c.due }}
                            </span>
                        </div>
                    </div>
                    <button v-if="c.link" type="button" @click="open(c.link)"
                        class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface-sunken px-2 py-1
                               text-micro font-medium text-ink-muted transition hover:border-accent/40 hover:text-accent">
                        <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                    </button>
                </div>
            </template>
        </div>

        <button v-if="action.screenLink" type="button" @click="open(action.screenLink)"
            class="inline-flex items-center gap-1.5 px-0.5 text-xs font-medium text-accent transition hover:underline">
            <i class="fas fa-list-check text-[10px]"></i>
            Abrir Checklists
        </button>
    </div>
</template>
