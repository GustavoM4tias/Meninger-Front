<script setup>
// Um evento proposto com seus itens. O mesmo card serve aos dois modos:
//  - modo edição (gestor): adiciona, edita e remove itens;
//  - modo decisão (aprovador): marca aprovar / ressalva / reprovar por evento e
//    por item, e corta valor. Nada é enviado até ele confirmar o lote.

import { computed } from 'vue';
import { useEventPlanStore, PRIORITY_LABEL } from '@/stores/Comercial/EventPlan/eventPlanStore';

import Surface from '@/components/UI/Surface.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Input from '@/components/UI/Input.vue';

const props = defineProps({
    event: { type: Object, required: true },
    mode: { type: String, default: 'view' }, // view | edit | decide
});

const emit = defineEmits([
    'edit-event', 'remove-event', 'add-item', 'edit-item', 'remove-item',
    'required-conflict', 'generate-approval',
]);

const store = useEventPlanStore();

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PRIORITY_VARIANT = { ESSENCIAL: 'danger', IMPORTANTE: 'warning', DESEJAVEL: 'neutral' };

const DECISION_VARIANT = {
    APPROVED: 'success',
    APPROVED_WITH_NOTES: 'warning',
    REJECTED: 'danger',
    RETURNED: 'info',
    PENDING: 'neutral',
};
const DECISION_LABEL = {
    APPROVED: 'Aprovado',
    APPROVED_WITH_NOTES: 'Aprovado com ressalva',
    REJECTED: 'Reprovado',
    RETURNED: 'Devolvido',
    PENDING: 'Pendente',
};

const draft = computed(() => store.draftDecisions[props.event.id] || null);

// O que está valendo agora: o rascunho do aprovador vence o que veio do banco.
const currentDecision = computed(() => draft.value?.decision ?? props.event[store.statusField]);

const eventRejected = computed(() => currentDecision.value === 'REJECTED');

const APPROVED = ['APPROVED', 'APPROVED_WITH_NOTES'];

// Passou nas duas etapas: já dá para levar a verba às Aprovações.
const fullyApproved = computed(() =>
    APPROVED.includes(props.event.comercial_status) && APPROVED.includes(props.event.marketing_status)
);

function itemDecision(item) {
    return draft.value?.items?.[item.id]?.decision ?? item[store.statusField];
}

function itemComment(item) {
    return draft.value?.items?.[item.id]?.comment ?? '';
}

function itemApprovedValue(item) {
    const value = draft.value?.items?.[item.id]?.approved_value;
    if (value !== undefined) return value;
    return item.approved_value ?? '';
}

function setEvent(decision) {
    store.setEventDecision(props.event.id, { decision });
    // Reprovar o evento derruba os itens junto - a tela reflete o que o
    // servidor vai fazer, sem surpresa depois de confirmar.
    if (decision === 'REJECTED') {
        for (const item of props.event.items || []) {
            store.setItemDecision(props.event.id, item.id, { decision: 'REJECTED' });
        }
    }
}

function setEventComment(value) {
    store.setEventDecision(props.event.id, { comment: value });
}

function setItem(item, decision) {
    // Reprovar item obrigatório exige escolha explícita: quem decide precisa
    // dizer se o evento inteiro cai ou se o item vira opcional.
    if (decision === 'REJECTED' && item.necessity === 'OBRIGATORIO' && !eventRejected.value) {
        emit('required-conflict', { event: props.event, item });
        return;
    }
    store.setItemDecision(props.event.id, item.id, { decision });
}

function setItemComment(item, value) {
    store.setItemDecision(props.event.id, item.id, { comment: value });
}

function setItemValue(item, value) {
    store.setItemDecision(props.event.id, item.id, { approved_value: value });
}

// Corte precisa de motivo: o gestor tem que receber o número E o porquê.
function needsComment(item) {
    const decision = itemDecision(item);
    const value = itemApprovedValue(item);
    const cutting = value !== '' && value != null && Number(value) < Number(item.proposed_value);
    return (['APPROVED_WITH_NOTES', 'REJECTED'].includes(decision) || cutting)
        && !String(itemComment(item) || '').trim();
}

const dateLabel = computed(() => {
    const [year, month, day] = String(props.event.event_date || '').split('-');
    if (!day) return '';
    const end = props.event.event_end_date
        ? ` a ${props.event.event_end_date.slice(8, 10)}/${props.event.event_end_date.slice(5, 7)}`
        : '';
    return `${day}/${month}/${year}${end}`;
});
</script>

<template>
    <Surface :class="eventRejected ? 'opacity-60' : ''">
        <!-- Cabeçalho do evento -->
        <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-semibold text-ink">{{ event.title }}</h3>
                    <Badge :variant="PRIORITY_VARIANT[event.priority] || 'neutral'" size="sm" outlined>
                        {{ PRIORITY_LABEL[event.priority] || event.priority }}
                    </Badge>
                    <Badge v-if="event.is_extra" variant="info" size="sm">Extra</Badge>
                    <Badge v-if="event.priority_window" variant="warning" size="sm">
                        <i class="fas fa-clock"></i> Acontece antes do prazo
                    </Badge>
                </div>
                <p class="mt-1 text-sm text-ink-muted">
                    <i class="fas fa-calendar-day mr-1 text-ink-subtle"></i>{{ dateLabel }}
                    <span v-if="event.kind"> · {{ event.kind }}</span>
                    <span v-if="event.expected_audience"> · {{ event.expected_audience }} pessoas</span>
                </p>
                <p v-if="event.objective" class="mt-1 text-sm text-ink-muted">{{ event.objective }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-1">
                <Badge
                    v-if="mode !== 'edit' && currentDecision && currentDecision !== 'PENDING'"
                    :variant="DECISION_VARIANT[currentDecision]"
                    size="sm"
                >
                    {{ DECISION_LABEL[currentDecision] }}
                </Badge>
                <template v-if="mode === 'edit'">
                    <IconButton icon="fas fa-pen" v-tippy="'Editar evento'" @click="emit('edit-event', event)" />
                    <IconButton icon="fas fa-trash" v-tippy="'Excluir evento'" @click="emit('remove-event', event)" />
                </template>
            </div>
        </div>

        <!-- Decisão do evento -->
        <div v-if="mode === 'decide'" class="mt-3 rounded-lg border border-line bg-surface-sunken p-3">
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-ink-subtle">Decisão do evento</p>
            <div class="flex flex-wrap gap-2">
                <Button size="sm" :variant="currentDecision === 'APPROVED' ? 'primary' : 'outline'"
                    icon="fas fa-check" @click="setEvent('APPROVED')">Aprovar</Button>
                <Button size="sm" :variant="currentDecision === 'APPROVED_WITH_NOTES' ? 'primary' : 'outline'"
                    icon="fas fa-circle-exclamation" @click="setEvent('APPROVED_WITH_NOTES')">Com ressalva</Button>
                <Button size="sm" :variant="currentDecision === 'REJECTED' ? 'danger' : 'outline'"
                    icon="fas fa-xmark" @click="setEvent('REJECTED')">Reprovar</Button>
            </div>
            <Input
                v-if="['APPROVED_WITH_NOTES', 'REJECTED'].includes(currentDecision)"
                class="mt-2"
                :model-value="draft?.comment || ''"
                placeholder="Motivo (obrigatório)"
                size="sm"
                @update:model-value="setEventComment"
            />
        </div>

        <!-- Itens -->
        <div class="mt-4">
            <div class="mb-2 flex items-center justify-between">
                <p class="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                    Itens ({{ (event.items || []).length }})
                </p>
                <Button v-if="mode === 'edit'" size="sm" variant="ghost" icon="fas fa-plus"
                    @click="emit('add-item', event)">Item</Button>
            </div>

            <p v-if="!(event.items || []).length" class="text-sm text-ink-subtle">
                Nenhum item cadastrado. Sem itens não dá para estimar o custo do evento.
            </p>

            <div v-else class="space-y-2">
                <div
                    v-for="item in event.items"
                    :key="item.id"
                    class="rounded-lg border border-line p-2.5"
                    :class="itemDecision(item) === 'REJECTED' ? 'opacity-55' : ''"
                >
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-ink">{{ item.name }}</p>
                            <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                                <span>{{ Number(item.quantity) }} × {{ money(item.unit_value) }}</span>
                                <span v-if="item.category">· {{ item.category }}</span>
                                <Badge v-if="item.necessity === 'OBRIGATORIO'" variant="danger" size="sm" outlined>
                                    Obrigatório
                                </Badge>
                                <Badge :variant="item.cost_basis === 'ORCADO' ? 'success' : 'neutral'" size="sm" outlined>
                                    {{ item.cost_basis === 'ORCADO' ? 'Orçado' : 'Estimativa' }}
                                </Badge>
                                <Badge v-if="item.needs_quote" variant="info" size="sm">Cotar</Badge>
                                <span v-if="item.supplier">· {{ item.supplier }}</span>
                                <a v-if="item.attachment_url" :href="item.attachment_url" target="_blank"
                                    rel="noopener" class="text-accent hover:underline" @click.stop>
                                    <i class="fas fa-paperclip"></i> orçamento
                                </a>
                            </p>
                        </div>

                        <div class="flex shrink-0 items-center gap-2">
                            <div class="text-right">
                                <p class="text-sm font-semibold text-ink">{{ money(item.proposed_value) }}</p>
                                <p
                                    v-if="item.approved_value != null && Number(item.approved_value) !== Number(item.proposed_value)"
                                    class="text-xs text-amber-600 dark:text-amber-400"
                                >
                                    aprovado {{ money(item.approved_value) }}
                                </p>
                            </div>
                            <template v-if="mode === 'edit'">
                                <IconButton size="sm" icon="fas fa-pen" v-tippy="'Editar item'"
                                    @click="emit('edit-item', { event, item })" />
                                <IconButton size="sm" icon="fas fa-trash" v-tippy="'Excluir item'"
                                    @click="emit('remove-item', item)" />
                            </template>
                        </div>
                    </div>

                    <!-- Decisão do item -->
                    <div v-if="mode === 'decide' && !eventRejected" class="mt-2 border-t border-line pt-2">
                        <div class="flex flex-wrap items-center gap-2">
                            <Button size="sm" :variant="itemDecision(item) === 'APPROVED' ? 'primary' : 'outline'"
                                @click="setItem(item, 'APPROVED')">Aprovar</Button>
                            <Button size="sm" :variant="itemDecision(item) === 'REJECTED' ? 'danger' : 'outline'"
                                @click="setItem(item, 'REJECTED')">Reprovar</Button>
                            <div v-if="itemDecision(item) !== 'REJECTED'" class="w-32">
                                <Input
                                    :model-value="itemApprovedValue(item)"
                                    type="number"
                                    size="sm"
                                    placeholder="Cortar p/"
                                    @update:model-value="(v) => setItemValue(item, v)"
                                />
                            </div>
                        </div>
                        <Input
                            v-if="needsComment(item)"
                            class="mt-2"
                            :model-value="itemComment(item)"
                            size="sm"
                            placeholder="Motivo do corte ou da reprovação (obrigatório)"
                            @update:model-value="(v) => setItemComment(item, v)"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Totais do evento -->
        <div class="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span class="text-ink-muted">Total proposto</span>
            <div class="text-right">
                <span class="font-semibold text-ink">{{ money(event.proposed_total) }}</span>
                <span v-if="Number(event.approved_total) && Number(event.approved_total) !== Number(event.proposed_total)"
                    class="ml-2 text-emerald-600 dark:text-emerald-400">
                    aprovado {{ money(event.approved_total) }}
                </span>
            </div>
        </div>

        <!-- Evento já aprovado: atalhos para a agenda e para a verba -->
        <div v-if="fullyApproved" class="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Badge v-if="event.event_id" variant="success" size="sm">
                <i class="fas fa-calendar-check"></i> Programado na agenda
            </Badge>
            <Button size="sm" variant="outline" icon="fas fa-file-invoice-dollar"
                @click="emit('generate-approval', event)">
                Gerar ficha de aprovação
            </Button>
        </div>
    </Surface>
</template>
