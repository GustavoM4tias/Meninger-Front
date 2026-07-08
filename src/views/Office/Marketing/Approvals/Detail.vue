<template>
    <div class="min-h-[calc(100vh-3.5rem)] pb-24">
        <PageContainer size="full">
            <div class="max-w-2xl mx-auto" v-if="req">

                <!-- Cabeçalho -->
                <div class="flex items-start justify-between gap-3 py-4">
                    <div>
                        <button class="text-[11px] text-ink-subtle hover:text-ink mb-1 flex items-center gap-1"
                            @click="$router.push('/marketing/aprovacoes')">
                            <i class="fas fa-arrow-left text-[10px]"></i> Aprovações
                        </button>
                        <h1 class="text-3xl font-bold font-mono text-ink">{{ req.type_label }}</h1>
                        <p class="text-xs text-ink-muted">{{ req.protocol }}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2 mt-2">
                        <Badge :variant="statusMeta.variant">
                            <i :class="statusMeta.icon" class="mr-1 text-[10px]"></i>{{ statusMeta.label }}
                        </Badge>
                        <Button v-if="isApproved" variant="secondary" size="sm" icon="fas fa-file-pdf"
                            :loading="pdfLoading" @click="downloadPdf">
                            PDF de autorização
                        </Button>
                    </div>
                </div>

                <!-- Dados -->
                <Surface variant="raised" padding="md" class="mb-4">
                    <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                            <dt class="text-[11px] text-ink-subtle">Valor</dt>
                            <dd class="font-mono font-bold text-ink text-lg tabular-nums">{{ fmtBRL(req.amount) }}</dd>
                        </div>
                        <div>
                            <dt class="text-[11px] text-ink-subtle">Solicitante</dt>
                            <dd class="text-ink">{{ req.requester?.username || '-' }}</dd>
                        </div>
                        <div>
                            <dt class="text-[11px] text-ink-subtle">Centro de custo</dt>
                            <dd class="text-ink">{{ req.cost_center_name ? `${req.cost_center_name} (CC ${req.cost_center_id})` : '-' }}</dd>
                        </div>
                        <div>
                            <dt class="text-[11px] text-ink-subtle">Prazo</dt>
                            <dd class="text-ink">{{ fmtDate(req.due_date) }}</dd>
                        </div>
                        <div>
                            <dt class="text-[11px] text-ink-subtle">Fornecedor</dt>
                            <dd class="text-ink">{{ req.supplier || '-' }}</dd>
                        </div>
                        <div>
                            <dt class="text-[11px] text-ink-subtle">Criada em</dt>
                            <dd class="text-ink">{{ fmtDateTime(req.created_at) }}</dd>
                        </div>
                    </dl>
                    <div v-if="req.justification" class="mt-4 pt-3 border-t border-line">
                        <dt class="text-[11px] text-ink-subtle mb-1">Justificativa</dt>
                        <dd class="text-sm text-ink-muted whitespace-pre-wrap">{{ req.justification }}</dd>
                    </div>
                </Surface>

                <!-- Itens -->
                <Surface variant="raised" padding="none" class="mb-4 overflow-hidden">
                    <h2 class="text-[11px] font-mono uppercase tracking-wider text-ink-muted px-4 pt-3 pb-1">Itens</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-y border-line text-left">
                                    <th class="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Item</th>
                                    <th class="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Descrição</th>
                                    <th class="px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-muted text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(it, i) in (req.items || [])" :key="i" class="border-b border-line/60">
                                    <td class="px-4 py-2 text-ink">{{ it.name }}</td>
                                    <td class="px-4 py-2 text-ink-muted">{{ it.description || '-' }}</td>
                                    <td class="px-4 py-2 text-right font-mono tabular-nums text-ink whitespace-nowrap">{{ fmtBRL(it.amount) }}</td>
                                </tr>
                                <tr class="bg-surface-sunken/40">
                                    <td class="px-4 py-2 font-semibold text-ink" colspan="2">Total</td>
                                    <td class="px-4 py-2 text-right font-mono font-bold tabular-nums text-accent whitespace-nowrap">{{ fmtBRL(req.amount) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Surface>

                <!-- Autorização por perfil -->
                <Surface variant="raised" padding="md" class="mb-4">
                    <h2 class="text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-3">Autorização</h2>
                    <ul class="space-y-2">
                        <li v-for="p in req.profiles_state" :key="p.id"
                            class="flex items-center justify-between gap-2 text-sm">
                            <span class="text-ink font-medium">{{ p.name }}</span>
                            <Badge v-if="p.decision" :variant="decisionMeta(p.decision.decision).variant" size="sm">
                                {{ decisionMeta(p.decision.decision).label }}
                                · {{ p.decision.user?.username || '' }}
                            </Badge>
                            <Badge v-else variant="warning" size="sm" outlined>Pendente</Badge>
                        </li>
                    </ul>
                    <div v-for="d in decisionsWithComment" :key="`c-${d.id}`"
                        class="mt-3 text-sm bg-surface-sunken rounded-lg px-3 py-2">
                        <span class="text-[11px] text-ink-subtle block">
                            {{ decisionMeta(d.decision).label }} por {{ d.user?.username }} ({{ d.profile?.name }})
                        </span>
                        <span class="text-ink whitespace-pre-wrap">{{ d.comment }}</span>
                    </div>
                </Surface>

                <!-- Anexos -->
                <Surface v-if="(req.attachments || []).length" variant="raised" padding="md" class="mb-4">
                    <h2 class="text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-3">Anexos</h2>
                    <ul class="space-y-1">
                        <li v-for="att in req.attachments" :key="att.id">
                            <button type="button" @click="viewerAtt = att"
                                class="flex items-center gap-2 text-sm text-accent hover:underline text-left">
                                <i :class="isImageAtt(att) ? 'fas fa-image' : 'fas fa-paperclip'" class="text-xs"></i>{{ att.file_name }}
                            </button>
                        </li>
                    </ul>
                </Surface>

                <!-- Histórico -->
                <Surface variant="raised" padding="md" class="mb-4">
                    <h2 class="text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-3">Histórico</h2>
                    <ul class="space-y-2">
                        <li v-for="(h, i) in history" :key="i" class="flex items-start gap-2 text-sm">
                            <i :class="historyIcon(h.action)" class="mt-0.5 text-xs w-4 text-center"></i>
                            <div class="flex-1">
                                <span class="text-ink">{{ historyLabel(h) }}</span>
                                <span class="text-ink-subtle text-[11px] block">{{ fmtDateTime(h.at) }}</span>
                                <span v-if="h.note" class="text-ink-muted text-[13px] whitespace-pre-wrap">{{ h.note }}</span>
                            </div>
                        </li>
                    </ul>
                </Surface>
            </div>

            <div v-else-if="store.loading" class="py-16 flex justify-center"><Spinner /></div>
            <EmptyState v-else icon="fas fa-stamp" title="Solicitação não encontrada"
                :description="store.error || 'Verifique o link ou suas permissões.'" />
        </PageContainer>

        <!-- Barra de decisão (sticky, mobile-first) -->
        <div v-if="req && req.status === 'pending' && (canDecide || isRequester)"
            class="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface/95 backdrop-blur px-4 py-3">
            <div class="max-w-2xl mx-auto flex flex-wrap items-center justify-end gap-2">
                <template v-if="canDecide">
                    <Button variant="secondary" size="sm" icon="fas fa-xmark" class="!text-red-600"
                        @click="openDecision('rejected')">Reprovar</Button>
                    <Button variant="secondary" size="sm" icon="fas fa-check-double"
                        @click="openDecision('approved_with_notes')">Aprovar c/ ressalva</Button>
                    <Button variant="primary" size="sm" icon="fas fa-check"
                        @click="openDecision('approved')">Aprovar</Button>
                </template>
                <Button v-if="isRequester" variant="ghost" size="sm" icon="fas fa-ban"
                    @click="confirmCancelOpen = true">Cancelar solicitação</Button>
            </div>
        </div>

        <!-- Modal de decisão -->
        <Modal :open="decisionOpen" :title="decisionTitle" size="md" @close="decisionOpen = false">
            <div class="space-y-3">
                <p class="text-sm text-ink-muted">
                    {{ decisionKind === 'approved' ? 'Comentário opcional.' : 'Comentário obrigatório — ele será enviado ao solicitante.' }}
                </p>
                <textarea v-model="decisionComment" rows="3"
                    class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                    :placeholder="decisionKind === 'rejected' ? 'Justificativa da reprovação' : decisionKind === 'approved_with_notes' ? 'Descreva a ressalva' : 'Observações (opcional)'"></textarea>
            </div>
            <template #footer>
                <Button variant="secondary" @click="decisionOpen = false">Voltar</Button>
                <Button :variant="decisionKind === 'rejected' ? 'danger' : 'primary'" :loading="store.saving"
                    @click="submitDecision">Confirmar</Button>
            </template>
        </Modal>

        <!-- Preview de anexo (imagem/PDF/office) -->
        <AttachmentViewerModal v-if="viewerAtt" :attachment="viewerAtt" @close="viewerAtt = null" />

        <!-- Modal de cancelamento -->
        <Modal :open="confirmCancelOpen" title="Cancelar solicitação" size="sm" @close="confirmCancelOpen = false">
            <p class="text-sm text-ink-muted">A solicitação {{ req?.protocol }} será cancelada e os aprovadores não poderão mais decidi-la.</p>
            <template #footer>
                <Button variant="secondary" @click="confirmCancelOpen = false">Voltar</Button>
                <Button variant="danger" :loading="store.saving" @click="doCancel">Cancelar solicitação</Button>
            </template>
        </Modal>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import { useToast } from 'vue-toastification';
import { useApprovalsStore, STATUS_META } from '@/stores/Marketing/Approvals/approvalsStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Modal from '@/components/UI/Modal.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import AttachmentViewerModal from '@/views/Office/Checklist/components/AttachmentViewerModal.vue';
import api from '@/utils/Marketing/approvalsApi.js';

const store = useApprovalsStore();
const route = useRoute();
const toast = useToast();

const req = computed(() => store.current);
const statusMeta = computed(() => STATUS_META[req.value?.status] || STATUS_META.pending);
const isApproved = computed(() => ['approved', 'approved_with_notes'].includes(req.value?.status));
const isRequester = computed(() => !!req.value?.viewer?.isRequester);
const viewerAtt = ref(null);
const pdfLoading = ref(false);

const isImageAtt = (att) => att?.kind === 'IMAGE' || (att?.mime_type || '').startsWith('image/')
    || /\.(png|jpe?g|webp|gif|bmp|svg)($|\?)/i.test(att?.url || '');

async function downloadPdf() {
    pdfLoading.value = true;
    try {
        const blob = await api.pdf(req.value.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Autorizacao_${req.value.protocol}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (e) {
        toast.error(e.message);
    } finally {
        pdfLoading.value = false;
    }
}
const canDecide = computed(() => (req.value?.profiles_state || []).some((p) => p.can_decide));
const history = computed(() => [...(req.value?.approval_history || [])].reverse());
const decisionsWithComment = computed(() => (req.value?.decisions || []).filter((d) => d.comment));

const DECISION_META = {
    approved: { label: 'Aprovado', variant: 'success' },
    approved_with_notes: { label: 'Aprovado c/ ressalva', variant: 'info' },
    rejected: { label: 'Reprovado', variant: 'danger' },
};
const decisionMeta = (d) => DECISION_META[d] || { label: d, variant: 'neutral' };

const decisionOpen = ref(false);
const decisionKind = ref('approved');
const decisionComment = ref('');
const confirmCancelOpen = ref(false);

const decisionTitle = computed(() => ({
    approved: 'Aprovar solicitação',
    approved_with_notes: 'Aprovar com ressalva',
    rejected: 'Reprovar solicitação',
}[decisionKind.value]));

function openDecision(kind) {
    decisionKind.value = kind;
    decisionComment.value = '';
    decisionOpen.value = true;
}

async function submitDecision() {
    const comment = decisionComment.value.trim();
    if (!comment && decisionKind.value !== 'approved') {
        return toast.error(decisionKind.value === 'rejected'
            ? 'Justificativa é obrigatória para reprovar.'
            : 'Descreva a ressalva.');
    }
    try {
        await store.decide(req.value.id, { decision: decisionKind.value, comment });
        decisionOpen.value = false;
        toast.success('Decisão registrada.');
    } catch (e) {
        decisionOpen.value = false;
        if (e.code === 'ALREADY_DECIDED' || e.status === 409) {
            toast.warning(e.message);
            await store.fetchOne(route.params.id);
        } else {
            toast.error(e.message);
        }
    }
}

async function doCancel() {
    try {
        await store.cancel(req.value.id);
        confirmCancelOpen.value = false;
        toast.success('Solicitação cancelada.');
    } catch (e) {
        confirmCancelOpen.value = false;
        toast.error(e.message);
    }
}

const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '-');
const fmtDateTime = (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-');

const historyIcon = (action) => ({
    created: 'fas fa-plus text-accent',
    approved: 'fas fa-check text-emerald-500',
    approved_with_notes: 'fas fa-check-double text-sky-500',
    rejected: 'fas fa-xmark text-red-500',
    cancelled: 'fas fa-ban text-ink-subtle',
}[action] || 'fas fa-circle text-ink-subtle');

function historyLabel(h) {
    const who = h.username || `usuário #${h.user_id}`;
    const profile = h.profile_name ? ` (${h.profile_name})` : '';
    return {
        created: `${who} criou a solicitação`,
        approved: `${who} aprovou${profile}`,
        approved_with_notes: `${who} aprovou com ressalva${profile}`,
        rejected: `${who} reprovou${profile}`,
        cancelled: `${who} cancelou a solicitação`,
    }[h.action] || `${who}: ${h.action}`;
}

async function load() { await store.fetchOne(route.params.id); }
onMounted(load);
watch(() => route.params.id, load);
</script>
