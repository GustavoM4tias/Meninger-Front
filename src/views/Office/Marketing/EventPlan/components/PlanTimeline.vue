<script setup>
// Histórico do plano. Registra tudo: criação, item adicionado, submissão, cada
// decisão, cada corte de valor com o antes e o depois, devolução e fechamento.
// É a memória do mês - no fechamento é aqui que se lê o que foi proposto, o que
// foi cortado e por quê.

import { computed, ref } from 'vue';
import Surface from '@/components/UI/Surface.vue';

const props = defineProps({
    activities: { type: Array, default: () => [] },
});

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ICONS = {
    'plan.created': 'fas fa-file-circle-plus',
    'plan.submitted': 'fas fa-paper-plane',
    'plan.returned': 'fas fa-rotate-left',
    'plan.approved': 'fas fa-circle-check',
    'plan.closed': 'fas fa-lock',
    'plan.owner_overridden': 'fas fa-user-pen',
    'event.created': 'fas fa-calendar-plus',
    'event.updated': 'fas fa-pen',
    'event.deleted': 'fas fa-calendar-xmark',
    'event.decided': 'fas fa-gavel',
    'event.scheduled': 'fas fa-calendar-check',
    'item.created': 'fas fa-plus',
    'item.updated': 'fas fa-pen',
    'item.deleted': 'fas fa-trash',
    'item.decided': 'fas fa-gavel',
    'item.value_cut': 'fas fa-scissors',
    'item.reclassified': 'fas fa-arrows-rotate',
    'chase.sent': 'fas fa-bell',
};

const DECISION_LABEL = {
    APPROVED: 'aprovou',
    APPROVED_WITH_NOTES: 'aprovou com ressalva',
    REJECTED: 'reprovou',
    RETURNED: 'devolveu',
};

function describe(activity) {
    const meta = activity.meta || {};
    switch (activity.action) {
        case 'plan.created': return 'Plano do mês criado';
        case 'plan.submitted': return `Plano enviado para validação (${meta.events || 0} evento(s))`;
        case 'plan.returned': return `Devolvido na etapa ${meta.stage}: ${meta.comment || 'sem comentário'}`;
        case 'plan.approved': return `Fluxo concluído com ${meta.events_approved || 0} evento(s) aprovados`;
        case 'plan.closed': return `Mês fechado${meta.note ? `: ${meta.note}` : ''}`;
        case 'event.created': return `Evento "${meta.title}" incluído${meta.is_extra ? ' (extra)' : ''}`;
        case 'event.deleted': return `Evento "${meta.title}" removido`;
        case 'event.decided': return `${meta.stage} ${DECISION_LABEL[meta.decision] || 'decidiu'} o evento${meta.comment ? `: ${meta.comment}` : ''}`;
        case 'event.scheduled': return 'Evento criado e programado na agenda';
        case 'item.created': return `Item "${meta.name}" incluído por ${money(meta.proposed_value)}`;
        case 'item.deleted': return `Item "${meta.name}" removido`;
        case 'item.decided': return `${meta.stage} ${DECISION_LABEL[meta.decision] || 'decidiu'} o item`;
        case 'item.value_cut': return `Valor cortado de ${money(meta.from)} para ${money(meta.to)}${meta.comment ? `: ${meta.comment}` : ''}`;
        case 'item.reclassified': return 'Item obrigatório reclassificado como opcional';
        case 'chase.sent': return 'Lembrete de prazo enviado ao gestor';
        default: return activity.action;
    }
}

function when(value) {
    const d = new Date(value);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const ordered = computed(() => props.activities || []);

// Nasce fechado: o histórico é consulta, não a informação principal da tela.
// Quem quer auditar clica; quem está decidindo não perde espaço com ele.
const aberto = ref(false);

// Mostra os últimos 30 de cara e libera o resto sob demanda: plano com muitas
// rodadas pode ter centenas de linhas.
const LIMITE = 30;
const mostrarTudo = ref(false);
const visiveis = computed(() => (mostrarTudo.value ? ordered.value : ordered.value.slice(0, LIMITE)));
</script>

<template>
    <Surface>
        <button
            class="flex w-full items-center justify-between gap-2 text-left"
            :aria-expanded="aberto"
            @click="aberto = !aberto"
        >
            <h3 class="font-semibold text-ink">
                <i class="fas fa-clock-rotate-left mr-2 text-ink-subtle"></i>Histórico
                <span class="ml-1 text-sm font-normal text-ink-subtle">({{ ordered.length }})</span>
            </h3>
            <i
                class="fas fa-chevron-down text-sm text-ink-subtle transition-transform duration-200"
                :class="aberto ? 'rotate-180' : ''"
            ></i>
        </button>

        <div v-if="aberto" class="mt-3 border-t border-line pt-3">
            <p v-if="!ordered.length" class="text-sm text-ink-subtle">Nada registrado ainda.</p>

            <template v-else>
                <ol class="space-y-3">
                    <li v-for="activity in visiveis" :key="activity.id" class="flex gap-3">
                        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs text-ink-muted">
                            <i :class="ICONS[activity.action] || 'fas fa-circle-dot'"></i>
                        </span>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm text-ink">{{ describe(activity) }}</p>
                            <p class="text-xs text-ink-subtle">
                                {{ activity.actor?.username || 'Sistema' }} · {{ when(activity.created_at) }}
                            </p>
                        </div>
                    </li>
                </ol>

                <button
                    v-if="!mostrarTudo && ordered.length > LIMITE"
                    class="mt-3 text-sm text-accent hover:underline"
                    @click="mostrarTudo = true"
                >
                    Ver os {{ ordered.length - LIMITE }} registros anteriores
                </button>
            </template>
        </div>
    </Surface>
</template>
