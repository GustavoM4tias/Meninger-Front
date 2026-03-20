<script setup>
/**
 * LaunchPipelineCard.vue
 * Exibe o status completo da esteira Sienge para um lançamento.
 * Emits: run-pipeline, poll, dismiss-error, retry-contract, open-rid-modal
 */
import { computed } from 'vue';
import { PIPELINE_STAGE_LABELS } from '@/stores/Tools/PaymentFlow/paymentFlowStore';

const props = defineProps({
    launch: { type: Object, required: true },
    polling: { type: Boolean, default: false },
    running: { type: Boolean, default: false }, // este lançamento específico está em processamento
});
const emit = defineEmits(['run-pipeline', 'poll', 'dismiss-error', 'retry-contract', 'open-rid-modal']);

const ridEmailSent = computed(() => !!props.launch.ridEmailSent);
const ridSentAtLabel = computed(() => {
    if (!props.launch.ridEmailSentAt) return null;
    return new Date(props.launch.ridEmailSentAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
});

// ── Computed de estado ────────────────────────────────────────────────────────
const stage = computed(() => props.launch.pipelineStage || 'idle');
const stageMeta = computed(() => PIPELINE_STAGE_LABELS[stage.value] || PIPELINE_STAGE_LABELS.idle);

const stageIconClass = computed(() => {
    const colorMap = {
        gray: 'text-gray-400',
        blue: 'text-blue-500',
        green: 'text-green-500',
        emerald: 'text-emerald-500',
        red: 'text-red-500',
        orange: 'text-orange-500',
    };
    return `fas ${stageMeta.value.icon} text-sm ${colorMap[stageMeta.value.color] || 'text-gray-400'}`;
});

const creditorFound = computed(() => props.launch.siengeCreditorStatus === 'found');
const creditorMissing = computed(() => props.launch.siengeCreditorStatus === 'not_found');

const contractFound = computed(() => ['found', 'created'].includes(props.launch.siengeContractStatus));
const contractMissing = computed(() => props.launch.siengeContractStatus === 'not_found');
const contractCreating = computed(() => props.launch.siengeContractStatus === 'creating');
const contractError = computed(() => props.launch.siengeContractStatus === 'error');

const isAuthorized = computed(() => props.launch.siengeContractAuthorized);
const approval = computed(() => props.launch.siengeContractApproval);

const balanceOk = computed(() => props.launch.siengeItemBalanceOk);
const balance = computed(() => Number(props.launch.siengeItemBalanceAvailable) || 0);
const unitPrice = computed(() => Number(props.launch.unitPrice) || 0);

const isRunning = computed(() =>
    ['searching_creditor', 'searching_contract', 'creating_contract', 'creating_additive', 'creating_measurement', 'validating_items']
        .includes(stage.value)
);
const isReady = computed(() => stage.value === 'ready');
const hasError = computed(() => ['contract_error', 'additive_error', 'measurement_error'].includes(stage.value) || creditorMissing.value);

// ── Medição step ───────────────────────────────────────────────────────────────
const measurementCreating = computed(() => stage.value === 'creating_measurement');
const measurementCreated = computed(() =>
    ['measurement_created', 'awaiting_measurement_authorization', 'ready'].includes(stage.value)
);
const measurementError = computed(() => stage.value === 'measurement_error');
const measurementErrorMsg = computed(() =>
    measurementError.value ? (props.launch.siengeMeasurementError || null) : null
);
const measurementAuthorized = computed(() => props.launch.siengeMeasurementAuthorized === true);

const measurementStepClass = computed(() => {
    if (measurementError.value) return 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400';
    if (measurementCreating.value) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400';
    if (measurementCreated.value) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
});
const measurementStepTextClass = computed(() => {
    if (measurementError.value) return 'text-red-600 dark:text-red-400 font-semibold';
    if (measurementCreating.value) return 'text-blue-600 dark:text-blue-400 font-semibold';
    if (measurementCreated.value) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    return 'text-gray-400';
});

// ── Fluxo de aditivo: contrato existia (status 'found') ──────────────────────
const isAdditivePath = computed(() => props.launch.siengeContractStatus === 'found');

// ── Aditivo step ──────────────────────────────────────────────────────────────
const additiveCreating = computed(() => stage.value === 'creating_additive');
const additiveCreated = computed(() =>
    stage.value === 'additive_created' ||
    (stage.value === 'awaiting_authorization' && isAdditivePath.value) ||
    ['creating_measurement', 'measurement_created', 'measurement_error',
     'awaiting_measurement_authorization', 'ready'].includes(stage.value)
);
const additiveError = computed(() => stage.value === 'additive_error');
const additiveErrorMsg = computed(() =>
    additiveError.value ? (props.launch.siengeContractError || null) : null
);

const additiveStepClass = computed(() => {
    if (additiveError.value) return 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400';
    if (additiveCreating.value) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400';
    if (additiveCreated.value) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
});
const additiveStepTextClass = computed(() => {
    if (additiveError.value) return 'text-red-600 dark:text-red-400 font-semibold';
    if (additiveCreating.value) return 'text-blue-600 dark:text-blue-400 font-semibold';
    if (additiveCreated.value) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    return 'text-gray-400';
});

// ── Contrato step ──────────────────────────────────────────────────────────────
// Quando o caminho foi aditivo: o contrato já está resolvido → verde com check
// Quando o caminho foi criação de contrato: amarelo aguardando autorização, verde quando autorizado
const contractStepClass = computed(() => {
    if (contractError.value) return 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400';
    if (contractCreating.value) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400';
    // Contrato resolvido (encontrado e aditivo já criado, ou autorizado)
    if (isAuthorized.value || (isAdditivePath.value && (additiveCreated.value || additiveCreating.value || additiveError.value)))
        return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400';
    // Contrato criado aguardando autorização (path criação)
    if (contractFound.value) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
});
const contractStepTextClass = computed(() => {
    if (contractError.value) return 'text-red-600 dark:text-red-400 font-semibold';
    if (contractCreating.value) return 'text-blue-600 dark:text-blue-400 font-semibold';
    if (isAuthorized.value || (isAdditivePath.value && (additiveCreated.value || additiveCreating.value || additiveError.value)))
        return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    if (contractFound.value) return 'text-yellow-600 dark:text-yellow-400 font-semibold';
    return 'text-gray-400';
});

// ── Helpers de formatação ─────────────────────────────────────────────────────
function fmt(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(d) {
    if (!d) return '—';
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
}
function approvalLabel(a) {
    return a === 'APPROVED' ? 'Aprovado' : a === 'DISAPPROVED' ? 'Reprovado' : 'Pendente';
}
function approvalClass(a) {
    return a === 'APPROVED' ? 'text-green-600 dark:text-green-400' :
        a === 'DISAPPROVED' ? 'text-red-600 dark:text-red-400' :
            'text-yellow-600 dark:text-yellow-400';
}
function authLevelLabel(level) {
    const map = {
        FIRST_LEVEL: '1° alçada',
        SECOND_LEVEL: '2° alçada',
        THIRD_LEVEL: '3° alçada',
        FOURTH_LEVEL: '4° alçada',
    };
    return map[level] || null;
}
</script>

<template>
    <div class="rounded-xl border bg-white dark:bg-gray-900 overflow-hidden" :class="hasError
        ? 'border-red-200 dark:border-red-700'
        : isReady
            ? 'border-emerald-200 dark:border-emerald-700'
            : 'border-gray-200 dark:border-gray-700'">

        <!-- Header: stage badge + ações -->
        <div
            class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
                <i :class="stageIconClass"></i>
                <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">{{ stageMeta.label }}</span>
                <span v-if="polling" class="text-xs text-blue-400 flex items-center gap-1">
                    <i class="fas fa-sync fa-spin text-xs"></i> Monitorando
                </span>
            </div>

            <div class="flex items-center gap-2">
                <!-- Processar: só aparece quando não há erro específico de aditivo/contrato -->
                <button v-if="stage === 'idle' || (hasError && !contractError && !additiveError)"
                    class="text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isRunning || running"
                    @click="!running && !isRunning && emit('run-pipeline', launch.id)">
                    <i :class="running ? 'fas fa-spinner fa-spin text-xs' : 'fas fa-play text-xs'"></i>
                    {{ running ? 'Processando...' : 'Processar' }}
                </button>
                <!-- Retentar: aparece quando há erro de contrato, aditivo ou medição -->
                <button v-if="contractError || additiveError || measurementError"
                    class="text-xs px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isRunning || running"
                    @click="!running && emit('retry-contract', launch.id)">
                    <i :class="running ? 'fas fa-spinner fa-spin text-xs' : 'fas fa-rotate-right text-xs'"></i>
                    {{ running ? 'Processando...' : 'Retentar' }}
                </button>
                <!-- Poll manual: autorização de contrato/aditivo ou medição -->
                <button v-if="(contractFound || additiveCreated || measurementCreated) && (!isAuthorized || !measurementAuthorized)"
                    class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="polling || running" @click="emit('poll', launch.id)">
                    <i class="fas fa-arrows-rotate text-xs"></i>
                </button>
            </div>
        </div>

        <div class="p-4 space-y-4">

            <!-- ── Credor ──────────────────────────────────────────────────── -->
            <div>
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Credor
                </div>
                <div class="flex items-start gap-3">
                    <div class="mt-0.5 flex-shrink-0">
                        <i v-if="creditorFound" class="fas fa-circle-check text-green-500"></i>
                        <i v-else-if="creditorMissing" class="fas fa-circle-xmark text-red-500"></i>
                        <i v-else class="fas fa-circle text-gray-300"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {{ launch.providerName || '—' }}
                        </div>
                        <div class="text-xs text-gray-400 font-mono">{{ launch.providerCnpj || '—' }}</div>
                        <!-- Nome diferente no Sienge -->
                        <div v-if="creditorFound && launch.siengeCreditorName && launch.siengeCreditorName !== launch.providerName"
                            class="mt-1 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                            <i class="fas fa-triangle-exclamation"></i>
                            Sienge: <span class="font-medium ml-0.5">{{ launch.siengeCreditorName }}</span>
                        </div>
                        <!-- Não cadastrado: aguardando RID -->
                        <div v-if="creditorMissing && ridEmailSent"
                            class="mt-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                            <div class="flex items-center gap-1.5 font-semibold">
                                <i class="fas fa-envelope-circle-check"></i>
                                Solicitação de cadastro enviada
                            </div>
                            <div class="text-blue-600 dark:text-blue-400">
                                Email enviado em {{ ridSentAtLabel }}. Verificando automaticamente a cada 20 min.
                            </div>
                            <button
                                class="mt-0.5 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                                :disabled="running"
                                @click="!running && emit('open-rid-modal', launch)">
                                <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                                Ver detalhes / reenviar
                            </button>
                        </div>
                        <!-- Não cadastrado: sem RID enviada -->
                        <div v-else-if="creditorMissing"
                            class="mt-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-300">
                            <div class="flex items-center gap-1 mb-1">
                                <i class="fas fa-circle-info"></i>
                                Fornecedor não encontrado no Sienge.
                            </div>
                            <button
                                class="font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                :disabled="running"
                                @click="!running && emit('open-rid-modal', launch)">
                                <i class="fas fa-file-arrow-up text-xs"></i>
                                Solicitar cadastro via formulário RID →
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Contrato ────────────────────────────────────────────────── -->
            <div>
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Contrato
                </div>

                <!-- Criando via Playwright -->
                <div v-if="contractCreating" class="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <i class="fas fa-spinner fa-spin"></i>
                    Criando contrato no Sienge via automação...
                </div>

                <!-- Erro na criação -->
                <div v-else-if="contractError"
                    class="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
                    <div class="font-semibold flex items-center gap-1">
                        <i class="fas fa-triangle-exclamation"></i> Falha na criação do contrato
                    </div>
                    <div>{{ launch.siengeContractError }}</div>
                    <div class="pt-1 text-red-500">
                        Acesse o Sienge e exclua o contrato incompleto antes de tentar novamente.
                    </div>
                </div>

                <!-- Sem contrato ainda -->
                <div v-else-if="contractMissing" class="text-xs text-gray-500 flex items-center gap-2">
                    <i class="fas fa-file-circle-xmark text-orange-400"></i>
                    Nenhum contrato encontrado. Será criado automaticamente.
                </div>

                <!-- Contrato localizado / criado -->
                <div v-else-if="contractFound" class="space-y-2">
                    <div class="grid grid-cols-2 gap-2">
                        <div class="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                            <div class="text-xs text-gray-400">Documento</div>
                            <div class="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                                {{ launch.siengeDocumentId || '—' }}
                            </div>
                        </div>
                        <div class="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                            <div class="text-xs text-gray-400">Nº Contrato</div>
                            <div class="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                                {{ launch.siengeContractNumber || '—' }}
                            </div>
                        </div>
                        <div class="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                            <div class="text-xs text-gray-400">Vigência</div>
                            <div class="text-xs text-gray-700 dark:text-gray-300">
                                {{ fmtDate(launch.contractStartDate) }} → {{ fmtDate(launch.contractEndDate) }}
                            </div>
                        </div>
                        <!-- Flow stage indicator (col-span-2) -->
                        <div class="col-span-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                            <div class="text-xs text-gray-400 mb-2">Etapa do Fluxo</div>
                            <div class="flex items-center">
                                <!-- Contrato -->
                                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                                    <div class="w-7 h-7 rounded-full flex items-center justify-center mb-1"
                                        :class="contractStepClass">
                                        <i v-if="contractCreating" class="fas fa-spinner fa-spin text-xs"></i>
                                        <i v-else-if="contractError" class="fas fa-xmark text-xs"></i>
                                        <!-- Contrato resolvido: autorizado OU caminho aditivo (contrato já era existente) -->
                                        <i v-else-if="isAuthorized || (isAdditivePath && (additiveCreated || additiveCreating || additiveError))" class="fas fa-check text-xs"></i>
                                        <!-- Contrato criado, aguardando autorização -->
                                        <i v-else-if="contractFound" class="fas fa-lock text-xs"></i>
                                        <span v-else class="text-xs font-bold">1</span>
                                    </div>
                                    <span class="text-xs leading-tight" :class="contractStepTextClass">Contrato</span>
                                </div>
                                <div class="flex-1 h-0.5 mx-1 bg-gray-200 dark:bg-gray-700"></div>
                                <!-- Aditivo -->
                                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                                    <div class="w-7 h-7 rounded-full flex items-center justify-center mb-1"
                                        :class="additiveStepClass">
                                        <i v-if="additiveCreating" class="fas fa-spinner fa-spin text-xs"></i>
                                        <i v-else-if="additiveError" class="fas fa-xmark text-xs"></i>
                                        <i v-else-if="additiveCreated" class="fas fa-check text-xs"></i>
                                        <span v-else class="text-xs font-bold">2</span>
                                    </div>
                                    <span class="text-xs leading-tight" :class="additiveStepTextClass">Aditivo</span>
                                </div>
                                <div class="flex-1 h-0.5 mx-1 bg-gray-200 dark:bg-gray-700"></div>
                                <!-- Medição -->
                                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                                    <div class="w-7 h-7 rounded-full flex items-center justify-center mb-1"
                                        :class="measurementStepClass">
                                        <i v-if="measurementCreating" class="fas fa-spinner fa-spin text-xs"></i>
                                        <i v-else-if="measurementError" class="fas fa-xmark text-xs"></i>
                                        <i v-else-if="measurementCreated" class="fas fa-check text-xs"></i>
                                        <span v-else class="text-xs font-bold">3</span>
                                    </div>
                                    <span class="text-xs leading-tight" :class="measurementStepTextClass">Medição</span>
                                </div>
                                <div class="flex-1 h-0.5 mx-1 bg-gray-200 dark:bg-gray-700"></div>
                                <!-- Título -->
                                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                                    <div class="w-7 h-7 rounded-full flex items-center justify-center mb-1 bg-gray-100 dark:bg-gray-700 text-gray-400">
                                        <span class="text-xs font-bold">4</span>
                                    </div>
                                    <span class="text-xs text-gray-400 leading-tight">Título</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Criando aditivo via Playwright -->
                    <div v-if="additiveCreating"
                        class="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <i class="fas fa-spinner fa-spin"></i>
                        Criando aditivo no Sienge via automação...
                    </div>

                    <!-- Erro no aditivo -->
                    <div v-else-if="additiveError"
                        class="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
                        <div class="font-semibold flex items-center gap-1.5">
                            <i class="fas fa-triangle-exclamation"></i> Falha na criação do aditivo
                        </div>
                        <div v-if="additiveErrorMsg" class="break-words leading-relaxed">{{ additiveErrorMsg }}</div>
                        <div v-else class="italic text-red-400">Detalhes do erro não disponíveis.</div>
                    </div>

                    <!-- Autorização do contrato/aditivo (só quando aditivo criado/aguardando; oculto em creating/erro) -->
                    <div v-else-if="additiveCreated" class="flex items-center justify-between px-3 py-2.5 rounded-lg" :class="isAuthorized
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'">
                        <div class="flex items-center gap-2">
                            <i :class="isAuthorized ? 'fas fa-lock-open text-emerald-500' : 'fas fa-lock text-yellow-500'"></i>
                            <span class="text-xs font-semibold" :class="isAuthorized
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-yellow-700 dark:text-yellow-300'">
                                {{ isAuthorized
                                    ? (isAdditivePath ? 'Aditivo autorizado' : 'Contrato autorizado')
                                    : (isAdditivePath ? 'Aditivo em autorização' : 'Contrato em autorização') }}
                            </span>
                        </div>
                        <span v-if="!isAuthorized && authLevelLabel(launch.siengeContractAuthLevel)"
                            class="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
                            {{ authLevelLabel(launch.siengeContractAuthLevel) }}
                        </span>
                    </div>

                    <!-- ── Medição ───────────────────────────────────────────── -->
                    <!-- Criando via Playwright -->
                    <div v-if="measurementCreating"
                        class="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <i class="fas fa-spinner fa-spin"></i>
                        Criando medição no Sienge via automação...
                    </div>

                    <!-- Erro na medição -->
                    <div v-else-if="measurementError"
                        class="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
                        <div class="font-semibold flex items-center gap-1.5">
                            <i class="fas fa-triangle-exclamation"></i> Falha na criação da medição
                        </div>
                        <div v-if="measurementErrorMsg" class="break-words leading-relaxed">{{ measurementErrorMsg }}</div>
                        <div v-else class="italic text-red-400">Detalhes do erro não disponíveis.</div>
                    </div>

                    <!-- Medição criada — autorização -->
                    <div v-else-if="measurementCreated"
                        class="flex items-center justify-between px-3 py-2.5 rounded-lg"
                        :class="measurementAuthorized
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'">
                        <div class="flex items-center gap-2">
                            <i :class="measurementAuthorized ? 'fas fa-ruler-combined text-emerald-500' : 'fas fa-lock text-yellow-500'"></i>
                            <span class="text-xs font-semibold" :class="measurementAuthorized
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-yellow-700 dark:text-yellow-300'">
                                {{ measurementAuthorized ? 'Medição autorizada' : 'Medição em autorização' }}
                                <span v-if="launch.siengeMeasurementNumber" class="font-normal opacity-75 ml-1">
                                    #{{ launch.siengeMeasurementNumber }}
                                </span>
                            </span>
                        </div>
                        <span v-if="!measurementAuthorized && authLevelLabel(launch.siengeMeasurementAuthLevel)"
                            class="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
                            {{ authLevelLabel(launch.siengeMeasurementAuthLevel) }}
                        </span>
                    </div>
                </div>

                <!-- Ainda não processou -->
                <div v-else class="text-xs text-gray-400 flex items-center gap-2">
                    <i class="fas fa-circle text-gray-200"></i>
                    Aguardando processamento
                </div>
            </div>

            <!-- ── Documentos do lançamento ────────────────────────────────── -->
            <div>
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Documentos
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <!-- NF -->
                    <div class="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 space-y-0.5">
                        <div class="flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
                            <i class="fas fa-file-invoice text-red-400"></i> Nota Fiscal
                        </div>
                        <div v-if="launch.nfUrl" class="space-y-0.5">
                            <div class="text-gray-500">
                                {{ [launch.nfType, launch.nfNumber ? `#${launch.nfNumber}` : ''].filter(Boolean).join(' ') || '—' }}
                            </div>
                            <div v-if="launch.nfIssueDate" class="text-gray-400">
                                Emissão: {{ fmtDate(launch.nfIssueDate) }}
                            </div>
                            <a :href="launch.nfUrl" target="_blank"
                                class="text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                <i class="fas fa-arrow-up-right-from-square text-xs"></i> Abrir
                            </a>
                        </div>
                        <div v-else class="text-gray-400 italic">Não anexada</div>
                    </div>
                    <!-- Boleto -->
                    <div class="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 space-y-0.5">
                        <div class="flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
                            <i class="fas fa-barcode text-blue-400"></i> Boleto
                        </div>
                        <div v-if="launch.boletoUrl" class="space-y-0.5">
                            <div v-if="launch.boletoIssueDate" class="text-gray-500">
                                Emissão: {{ fmtDate(launch.boletoIssueDate) }}
                            </div>
                            <div v-if="launch.boletoDueDate" class="text-gray-400">
                                Vence: {{ fmtDate(launch.boletoDueDate) }}
                            </div>
                            <div v-if="launch.boletoBarcode" class="font-mono text-gray-400 truncate">
                                {{ launch.boletoBarcode.slice(0, 22) }}…
                            </div>
                            <a :href="launch.boletoUrl" target="_blank"
                                class="text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                <i class="fas fa-arrow-up-right-from-square text-xs"></i> Abrir
                            </a>
                        </div>
                        <div v-else class="text-gray-400 italic">Não anexado</div>
                    </div>
                </div>
            </div>

            <!-- ── Saldo do contrato ───────────────────────────────────────── -->
            <div v-if="contractFound && balanceOk !== null && balanceOk !== undefined">
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Saldo
                </div>
                <div class="rounded-lg px-3 py-2 flex items-center justify-between" :class="balanceOk
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700'
                    : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700'">
                    <div>
                        <div class="text-xs" :class="balanceOk
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-orange-600 dark:text-orange-400'">
                            {{ balanceOk ? 'Saldo suficiente' : 'Saldo insuficiente' }}
                        </div>
                        <div class="text-sm font-bold mt-0.5" :class="balanceOk
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-orange-700 dark:text-orange-300'">
                            Disponível: {{ fmt(balance) }}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-gray-400">Valor lançamento</div>
                        <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ fmt(unitPrice) }}</div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>