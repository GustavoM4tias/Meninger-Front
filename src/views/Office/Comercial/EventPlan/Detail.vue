<script setup>
// Detalhe do plano do mês. A mesma tela em dois modos, escolhidos pelo backend:
//  - gestor com o plano aberto  -> edita eventos e itens, e envia;
//  - aprovador na etapa da vez  -> decide evento a evento e item a item, com o
//    contador ao vivo mostrando quanto o mês fica se ele confirmar assim.

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useEventPlanStore, PLAN_STATUS_LABEL } from '@/stores/Comercial/EventPlan/eventPlanStore';
import api from '@/utils/EventPlan/api.js';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Surface from '@/components/UI/Surface.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

import PlannedEventCard from './components/PlannedEventCard.vue';
import EventFormModal from './components/EventFormModal.vue';
import ItemFormModal from './components/ItemFormModal.vue';
import RequiredItemChoiceModal from './components/RequiredItemChoiceModal.vue';
import ApprovalRequestModal from './components/ApprovalRequestModal.vue';
import PlanTimeline from './components/PlanTimeline.vue';

const store = useEventPlanStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const eventModal = ref({ open: false, event: null });
const itemModal = ref({ open: false, event: null, item: null });
const conflict = ref({ open: false, event: null, item: null });
const approvalModal = ref({ open: false, event: null });
const returnModal = ref({ open: false, comment: '' });
const closeModal = ref({ open: false, note: '', confirmation: '' });
const categories = ref([]);
const priorityWindowDays = ref(10);

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const plan = computed(() => store.current);

const STATUS_VARIANT = {
    draft: 'neutral',
    pending_comercial: 'warning',
    pending_marketing: 'info',
    returned: 'danger',
    approved: 'success',
    closed: 'neutral',
};

const mode = computed(() => {
    if (store.canDecideNow) return 'decide';
    if (plan.value?.can_edit) return 'edit';
    return 'view';
});

/**
 * Modo por evento: num plano aprovado o gestor ainda monta o evento EXTRA, mas
 * não encosta nos que já foram decididos.
 */
function eventMode(event) {
    if (mode.value !== 'view') return mode.value;
    if (plan.value?.can_add_extra && event.is_extra && event.comercial_status === 'PENDING') return 'edit';
    return 'view';
}

const canAddExtra = computed(() => mode.value === 'view' && plan.value?.can_add_extra);

const monthLabel = computed(() => {
    const [year, month] = String(plan.value?.reference_month || '').split('-');
    const names = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const label = names[Number(month) - 1];
    return label ? `${label} de ${year}` : '';
});

const decidedCount = computed(() => Object.keys(store.draftDecisions).length);

const canClose = computed(() =>
    plan.value?.status === 'approved' && (store.permissions.isAdmin || store.permissions.canDecide)
);

/**
 * Acompanhamento: onde o plano está no fluxo, em quatro paradas. Cada uma fica
 * concluída, atual ou pendente — é a leitura de 2 segundos que o gestor precisa
 * ao abrir a tela.
 */
const etapas = computed(() => {
    const s = plan.value?.status;
    const ordem = ['draft', 'pending_comercial', 'pending_marketing', 'approved', 'closed'];
    // Devolvido volta o ponteiro para o início, mas mantém a trilha visível.
    const atual = s === 'returned' ? 0 : Math.max(0, ordem.indexOf(s));

    const marcos = [
        { chave: 'draft', titulo: 'Montagem', quem: 'Gestor', indice: 0 },
        { chave: 'pending_comercial', titulo: 'Comercial', quem: 'Validação', indice: 1 },
        { chave: 'pending_marketing', titulo: 'Marketing', quem: 'Aceite', indice: 2 },
        { chave: 'approved', titulo: 'Aprovado', quem: 'Na agenda', indice: 3 },
    ];

    return marcos.map(m => ({
        ...m,
        estado: s === 'closed' ? 'feito'
            : m.indice < atual ? 'feito'
                : m.indice === atual ? 'atual' : 'pendente',
    }));
});

const ESTADO_CLASSE = {
    feito: 'bg-emerald-500 text-white',
    atual: 'bg-accent text-white',
    pendente: 'bg-surface-sunken text-ink-subtle',
};

// ── Ações do gestor ──────────────────────────────────────────────────────────

async function salvarEvento(payload) {
    try {
        await store.saveEvent({ ...payload, id: eventModal.value.event?.id });
        eventModal.value = { open: false, event: null };
        toast.success('Evento salvo.');
    } catch (e) { toast.error(e?.message || 'Erro ao salvar o evento.'); }
}

async function removerEvento(event) {
    if (!confirm(`Excluir "${event.title}" e todos os itens dele?`)) return;
    try {
        await store.removeEvent(event.id);
        toast.success('Evento excluído.');
    } catch (e) { toast.error(e?.message || 'Erro ao excluir.'); }
}

async function salvarItem(payload) {
    try {
        await store.saveItem(itemModal.value.event.id, { ...payload, id: itemModal.value.item?.id });
        itemModal.value = { open: false, event: null, item: null };
        toast.success('Item salvo.');
    } catch (e) { toast.error(e?.message || 'Erro ao salvar o item.'); }
}

async function removerItem(item) {
    if (!confirm(`Excluir o item "${item.name}"?`)) return;
    try {
        await store.removeItem(item.id);
        toast.success('Item excluído.');
    } catch (e) { toast.error(e?.message || 'Erro ao excluir.'); }
}

async function enviar() {
    const message = plan.value?.has_pending_extras && mode.value === 'view'
        ? 'Enviar o evento extra para validação? Os eventos já decididos continuam como estão.'
        : 'Enviar o plano para validação? Depois de enviado ele trava para edição até ser decidido ou devolvido.';
    if (!confirm(message)) return;
    try {
        await store.submitPlan();
        toast.success('Plano enviado para validação.');
    } catch (e) { toast.error(e?.message || 'Erro ao enviar.'); }
}

// ── Ações do aprovador ───────────────────────────────────────────────────────

function abrirConflito({ event, item }) {
    conflict.value = { open: true, event, item };
}

function resolverReprovandoEvento() {
    const { event } = conflict.value;
    store.setEventDecision(event.id, { decision: 'REJECTED' });
    for (const item of event.items || []) {
        store.setItemDecision(event.id, item.id, { decision: 'REJECTED' });
    }
    conflict.value = { open: false, event: null, item: null };
}

function resolverReclassificando() {
    const { event, item } = conflict.value;
    store.setItemDecision(event.id, item.id, { decision: 'REJECTED', reclassify_necessity: true });
    conflict.value = { open: false, event: null, item: null };
}

async function confirmarDecisoes() {
    try {
        const result = await store.submitDecisions();
        toast.success(
            result.status === 'pending_marketing'
                ? 'Validado. O plano seguiu para o Marketing.'
                : 'Decisões registradas.'
        );
    } catch (e) {
        // 422 traz as pendências item a item para o gestor corrigir na hora.
        if (e?.details?.length) {
            e.details.slice(0, 4).forEach(d => toast.warning(d.error));
            if (e.details.length > 4) toast.warning(`+ ${e.details.length - 4} pendência(s).`);
            return;
        }
        toast.error(e?.message || 'Erro ao registrar as decisões.');
    }
}

async function devolver() {
    if (!returnModal.value.comment.trim()) {
        toast.warning('Diga o que o gestor precisa ajustar.');
        return;
    }
    try {
        await store.returnPlan(returnModal.value.comment);
        returnModal.value = { open: false, comment: '' };
        toast.success('Plano devolvido ao gestor.');
    } catch (e) { toast.error(e?.message || 'Erro ao devolver.'); }
}

async function fecharMes() {
    if (closeModal.value.confirmation !== 'FECHAR') {
        toast.warning('Digite FECHAR para confirmar.');
        return;
    }
    try {
        await store.closePlan(closeModal.value.note);
        closeModal.value = { open: false, note: '', confirmation: '' };
        toast.success('Mês fechado. O plano virou histórico.');
    } catch (e) { toast.error(e?.message || 'Erro ao fechar o mês.'); }
}

onMounted(async () => {
    await store.loadPermissions();
    await store.loadPlan(route.params.id);
    if (!store.current) return;
    // Categorias do item e janela de prioridade: endpoint próprio da tela, não
    // as settings (que são admin-only). Antes o gestor abria o item com o
    // select de Categoria vazio, porque o 403 morria neste catch.
    try {
        const options = await api.formOptions();
        categories.value = options?.item_categories || [];
        priorityWindowDays.value = options?.priority_window_days || 10;
    } catch { /* sem opções: o formulário segue, só sem a lista de categorias */ }
});
</script>

<template>
    <PageContainer>
        <div v-if="store.loading && !plan" class="flex justify-center py-20"><Spinner /></div>

        <EmptyState
            v-else-if="!plan"
            icon="fas fa-triangle-exclamation"
            title="Plano não encontrado"
            description="Ele pode ter sido removido, ou você não tem acesso a este empreendimento."
        />

        <template v-else>
            <PageHeader
                :title="plan.enterprise_name || `Empreendimento ${plan.idempreendimento}`"
                :subtitle="`Plano de eventos de ${monthLabel}`"
                icon="fas fa-calendar-check"
                eyebrow="Plano de Eventos"
            >
                <template #actions>
                    <Button variant="ghost" icon="fas fa-arrow-left" @click="router.push('/comercial/plano-eventos')">
                        Voltar
                    </Button>
                    <Button
                        v-if="mode === 'edit' || canAddExtra"
                        variant="secondary"
                        icon="fas fa-calendar-plus"
                        @click="eventModal = { open: true, event: null }"
                    >
                        {{ canAddExtra ? 'Evento extra' : 'Novo evento' }}
                    </Button>
                    <Button
                        v-if="(mode === 'edit' && plan.events?.length) || plan.has_pending_extras"
                        variant="primary"
                        icon="fas fa-paper-plane"
                        :loading="store.saving"
                        @click="enviar"
                    >
                        {{ plan.has_pending_extras && mode === 'view' ? 'Enviar evento extra' : 'Enviar para validação' }}
                    </Button>
                    <Button v-if="canClose" variant="outline" icon="fas fa-lock" @click="closeModal.open = true">
                        Fechar o mês
                    </Button>
                </template>
            </PageHeader>

            <!-- Acompanhamento -->
            <Surface class="mb-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                        <Badge :variant="STATUS_VARIANT[plan.status] || 'neutral'">
                            {{ PLAN_STATUS_LABEL[plan.status] || plan.status }}
                        </Badge>
                        <span v-if="plan.round > 1" class="text-xs text-ink-subtle">{{ plan.round }}ª rodada</span>
                        <span v-if="plan.owners?.length" class="text-sm text-ink-muted">
                            Gestor: {{ plan.owners.map(o => o.username).join(', ') }}
                        </span>
                    </div>
                    <div class="flex gap-6 text-sm">
                        <div>
                            <p class="text-xs text-ink-subtle">Proposto</p>
                            <p class="font-semibold text-ink">{{ money(plan.totals?.proposed) }}</p>
                        </div>
                        <div>
                            <p class="text-xs text-ink-subtle">Aprovado</p>
                            <p class="font-semibold text-emerald-600 dark:text-emerald-400">
                                {{ money(plan.totals?.approved) }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Onde o plano está: leitura de 2 segundos -->
                <div class="mt-4 flex items-center gap-1 border-t border-line pt-4 sm:gap-2">
                    <template v-for="(etapa, i) in etapas" :key="etapa.chave">
                        <div class="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
                            <span
                                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                                :class="ESTADO_CLASSE[etapa.estado]"
                            >
                                <i v-if="etapa.estado === 'feito'" class="fas fa-check"></i>
                                <span v-else>{{ i + 1 }}</span>
                            </span>
                            <span class="truncate text-xs font-medium" :class="etapa.estado === 'pendente' ? 'text-ink-subtle' : 'text-ink'">
                                {{ etapa.titulo }}
                            </span>
                            <span class="hidden truncate text-[11px] text-ink-subtle sm:block">{{ etapa.quem }}</span>
                        </div>
                        <span
                            v-if="i < etapas.length - 1"
                            class="mb-5 h-0.5 w-4 shrink-0 rounded sm:w-8"
                            :class="etapas[i + 1].estado === 'pendente' ? 'bg-line' : 'bg-emerald-500'"
                        ></span>
                    </template>
                </div>

                <p v-if="plan.owner_unresolved" class="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-sm text-amber-700 dark:text-amber-400">
                    <i class="fas fa-triangle-exclamation mr-1"></i>
                    A Ficha Comercial deste empreendimento não aponta um gestor com usuário do Office.
                    Enquanto isso, a cobrança mensal não tem para quem ir.
                </p>
                <p v-if="plan.status === 'returned'" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-sm text-red-700 dark:text-red-400">
                    <i class="fas fa-rotate-left mr-1"></i>
                    Devolvido para ajuste. Veja o motivo no histórico, corrija e envie de novo.
                </p>
            </Surface>

            <!-- Eventos -->
            <div class="space-y-3" :class="mode === 'decide' ? 'pb-28' : ''">
                <EmptyState
                    v-if="!plan.events?.length"
                    icon="far fa-calendar"
                    title="Nenhum evento no plano"
                    :description="mode === 'edit'
                        ? 'Clique em Novo evento para começar a montar o mês.'
                        : 'Este plano ainda não tem eventos cadastrados.'"
                />

                <PlannedEventCard
                    v-for="event in (mode === 'decide' ? store.eventsForReview : plan.events)"
                    :key="event.id"
                    :event="event"
                    :mode="eventMode(event)"
                    @edit-event="eventModal = { open: true, event: $event }"
                    @remove-event="removerEvento"
                    @add-item="itemModal = { open: true, event: $event, item: null }"
                    @edit-item="itemModal = { open: true, event: $event.event, item: $event.item }"
                    @remove-item="removerItem"
                    @required-conflict="abrirConflito"
                    @generate-approval="approvalModal = { open: true, event: $event }"
                />
            </div>

            <PlanTimeline class="mt-4" :activities="plan.activities" />

            <!-- Barra de decisão: contador ao vivo enquanto ele marca -->
            <div
                v-if="mode === 'decide'"
                class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-overlay p-3 shadow-lg"
            >
                <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
                    <div class="text-sm">
                        <p class="text-ink-muted">
                            Aprovando assim, o mês fica em
                            <strong class="text-emerald-600 dark:text-emerald-400">{{ money(store.liveApprovedTotal) }}</strong>
                            de {{ money(store.proposedTotal) }}
                        </p>
                        <p class="text-xs text-ink-subtle">
                            {{ decidedCount }} de {{ plan.events?.length || 0 }} evento(s) marcados
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" icon="fas fa-rotate-left" @click="returnModal.open = true">
                            Devolver
                        </Button>
                        <Button
                            variant="primary"
                            icon="fas fa-check"
                            :loading="store.saving"
                            :disabled="!decidedCount"
                            @click="confirmarDecisoes"
                        >
                            Confirmar decisões
                        </Button>
                    </div>
                </div>
            </div>
        </template>

        <EventFormModal
            :open="eventModal.open"
            :event="eventModal.event"
            :reference-month="plan?.reference_month"
            :priority-window-days="priorityWindowDays"
            :saving="store.saving"
            @close="eventModal = { open: false, event: null }"
            @save="salvarEvento"
        />

        <ItemFormModal
            :open="itemModal.open"
            :item="itemModal.item"
            :event-title="itemModal.event?.title"
            :categories="categories"
            :plan-id="plan?.id"
            :saving="store.saving"
            @close="itemModal = { open: false, event: null, item: null }"
            @save="salvarItem"
        />

        <ApprovalRequestModal
            :open="approvalModal.open"
            :event="approvalModal.event"
            :enterprise-name="plan?.enterprise_name"
            @close="approvalModal = { open: false, event: null }"
        />

        <RequiredItemChoiceModal
            :open="conflict.open"
            :item="conflict.item"
            :event="conflict.event"
            @close="conflict = { open: false, event: null, item: null }"
            @reject-event="resolverReprovandoEvento"
            @reclassify="resolverReclassificando"
        />

        <Modal :open="returnModal.open" title="Devolver ao gestor" size="sm" @close="returnModal.open = false">
            <p class="mb-3 text-sm text-ink-muted">
                Devolver não é reprovar: o plano volta editável para o gestor com o seu apontamento, e ele reenvia.
            </p>
            <Input v-model="returnModal.comment" label="O que precisa ser ajustado" required />
            <template #footer>
                <Button variant="ghost" @click="returnModal.open = false">Cancelar</Button>
                <Button variant="primary" :loading="store.saving" @click="devolver">Devolver</Button>
            </template>
        </Modal>

        <Modal :open="closeModal.open" title="Fechar o mês" size="sm" @close="closeModal.open = false">
            <div class="space-y-3">
                <p class="text-sm text-ink-muted">
                    Fechar congela o plano: ninguém mais inclui evento nem decide. Ele vira o histórico do mês, com o
                    que foi proposto, o que foi aprovado e o que foi cortado.
                </p>
                <Input v-model="closeModal.note" label="Observação do fechamento" placeholder="Opcional" />
                <Input v-model="closeModal.confirmation" label="Digite FECHAR para confirmar" placeholder="FECHAR" required />
            </div>
            <template #footer>
                <Button variant="ghost" @click="closeModal.open = false">Cancelar</Button>
                <Button variant="danger" :loading="store.saving" @click="fecharMes">Fechar o mês</Button>
            </template>
        </Modal>
    </PageContainer>
</template>
