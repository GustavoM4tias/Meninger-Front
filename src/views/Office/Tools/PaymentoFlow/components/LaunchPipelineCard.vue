<script setup>
/**
 * LaunchPipelineCard — exibe o status completo da esteira Sienge.
 */
import { computed } from 'vue';
import { PIPELINE_STAGE_LABELS } from '@/stores/Tools/PaymentFlow/paymentFlowStore';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';

const props = defineProps({
  launch: { type: Object, required: true },
  polling: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
});

const emit = defineEmits([
  'run-pipeline', 'poll', 'dismiss-error', 'retry-contract',
  'open-rid-modal', 'register-boleto', 'update-boleto',
  'continue-existing-contract', 'abort',
]);

const ridEmailSent = computed(() => !!props.launch.ridEmailSent);
const ridSentAtLabel = computed(() => {
  if (!props.launch.ridEmailSentAt) return null;
  return new Date(props.launch.ridEmailSentAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
});

const stage = computed(() => props.launch.pipelineStage || 'idle');
const stageMeta = computed(() => PIPELINE_STAGE_LABELS[stage.value] || PIPELINE_STAGE_LABELS.idle);

const stageColorMap = {
  gray: 'text-ink-subtle', blue: 'text-accent', green: 'text-emerald-500',
  emerald: 'text-emerald-500', red: 'text-red-500', orange: 'text-amber-500',
};
const stageIconClass = computed(() =>
  `fas ${stageMeta.value.icon} text-sm ${stageColorMap[stageMeta.value.color] || 'text-ink-subtle'}`
);

const creditorFound = computed(() => props.launch.siengeCreditorStatus === 'found');
const creditorMissing = computed(() => props.launch.siengeCreditorStatus === 'not_found');

const contractFound = computed(() => ['found', 'created'].includes(props.launch.siengeContractStatus));
const contractMissing = computed(() => props.launch.siengeContractStatus === 'not_found');
const contractCreating = computed(() => props.launch.siengeContractStatus === 'creating');
const contractError = computed(() => props.launch.siengeContractStatus === 'error');

const isAuthorized = computed(() => props.launch.siengeContractAuthorized);
const balanceOk = computed(() => props.launch.siengeItemBalanceOk);
const balance = computed(() => Number(props.launch.siengeItemBalanceAvailable) || 0);
const unitPrice = computed(() => Number(props.launch.unitPrice) || 0);

const isRunning = computed(() =>
  ['searching_creditor', 'searching_contract', 'creating_contract', 'creating_additive',
   'creating_measurement', 'creating_titulo', 'validating_items'].includes(stage.value)
);
const isReady = computed(() => ['ready', 'titulo_pago'].includes(stage.value));
const hasError = computed(() =>
  ['contract_error', 'additive_error', 'measurement_error', 'titulo_error'].includes(stage.value) || creditorMissing.value
);

const TITULO_STAGES = ['creating_titulo', 'titulo_created', 'titulo_error',
  'awaiting_titulo_authorization', 'titulo_pago', 'ready'];
const tituloCreating = computed(() => stage.value === 'creating_titulo');
const tituloCreated = computed(() => TITULO_STAGES.filter(s => s !== 'creating_titulo' && s !== 'titulo_error').includes(stage.value));
const tituloError = computed(() => stage.value === 'titulo_error');
const tituloErrorMsg = computed(() => tituloError.value ? (props.launch.siengeTituloError || null) : null);
const tituloPago = computed(() => stage.value === 'titulo_pago');
const tituloAwaiting = computed(() => stage.value === 'awaiting_titulo_authorization');

const inTituloStage = computed(() => tituloCreating.value || tituloCreated.value || tituloError.value);

const boletoRegisterError = computed(() =>
  stage.value === 'titulo_created' && !!props.launch.siengeTituloError
);
// Linha digitável inválida (Sienge 400): erro permanente, sem retry automático.
const boletoManualRequired = computed(() =>
  boletoRegisterError.value &&
  /linha digit[aá]vel|sienge 400|manualmente/i.test(props.launch.siengeTituloError || '')
);
const canUpdateBoleto = computed(() =>
  !!props.launch.siengeTituloNumber && (tituloAwaiting.value || boletoRegisterError.value)
);

const stepBgFor = (state) => ({
  error: 'bg-red-500/15 text-red-600 dark:text-red-400',
  loading: 'bg-accent-soft text-accent',
  done: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  idle: 'bg-surface-sunken text-ink-subtle border border-line',
}[state] || 'bg-surface-sunken text-ink-subtle border border-line');

const stepTextFor = (state) => ({
  error: 'text-red-600 dark:text-red-400 font-semibold',
  loading: 'text-accent font-semibold',
  done: 'text-emerald-600 dark:text-emerald-400 font-semibold',
  pending: 'text-amber-600 dark:text-amber-400 font-semibold',
  idle: 'text-ink-subtle',
}[state] || 'text-ink-subtle');

// ── Medição step ───────────────────────────────────
const measurementCreating = computed(() => stage.value === 'creating_measurement');
const measurementCreated = computed(() =>
  ['measurement_created', 'awaiting_measurement_authorization', ...TITULO_STAGES, 'ready'].includes(stage.value)
);
const measurementError = computed(() => stage.value === 'measurement_error');
const measurementErrorMsg = computed(() => measurementError.value ? (props.launch.siengeMeasurementError || null) : null);
const measurementAuthorized = computed(() => props.launch.siengeMeasurementAuthorized === true);

const measurementState = computed(() => {
  if (measurementError.value) return 'error';
  if (measurementCreating.value) return 'loading';
  if (measurementCreated.value) return 'done';
  return 'idle';
});

// ── Aditivo step ───────────────────────────────────
const isAdditivePath = computed(() => props.launch.siengeContractStatus === 'found');
const additiveCreating = computed(() => stage.value === 'creating_additive');
const additiveCreated = computed(() =>
  stage.value === 'additive_created' ||
  (stage.value === 'awaiting_authorization' && isAdditivePath.value) ||
  ['creating_measurement', 'measurement_created', 'measurement_error',
   'awaiting_measurement_authorization', ...TITULO_STAGES, 'ready'].includes(stage.value)
);
const additiveError = computed(() => stage.value === 'additive_error');
const additiveErrorMsg = computed(() => additiveError.value ? (props.launch.siengeContractError || null) : null);

const additiveState = computed(() => {
  if (additiveError.value) return 'error';
  if (additiveCreating.value) return 'loading';
  if (additiveCreated.value) return 'done';
  return 'idle';
});

// ── Contrato step ──────────────────────────────────
const contractState = computed(() => {
  if (contractError.value) return 'error';
  if (contractCreating.value) return 'loading';
  if (isAuthorized.value || (isAdditivePath.value && (additiveCreated.value || additiveCreating.value || additiveError.value))) return 'done';
  if (contractFound.value) return 'pending';
  return 'idle';
});

// ── Título step ────────────────────────────────────
const tituloState = computed(() => {
  if (tituloError.value) return 'error';
  if (tituloCreating.value) return 'loading';
  if (tituloPago.value) return 'done';
  if (tituloCreated.value) return 'done';
  return 'idle';
});

// ── Helpers ────────────────────────────────────────
function fmt(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
}
function authLevelLabel(level) {
  return ({
    FIRST_LEVEL: '1° alçada', SECOND_LEVEL: '2° alçada',
    THIRD_LEVEL: '3° alçada', FOURTH_LEVEL: '4° alçada',
  })[level] || null;
}

const cardBorderClass = computed(() => {
  if (hasError.value) return 'border-red-500/30';
  if (isReady.value) return 'border-emerald-500/30';
  return 'border-line';
});
</script>

<template>
  <article class="rounded-xl bg-surface-raised border overflow-hidden surface-gradient transition-colors"
    :class="cardBorderClass">

    <!-- Header -->
    <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-surface-sunken/40 border-b border-line">
      <div class="flex items-center gap-2 min-w-0">
        <i :class="stageIconClass"></i>
        <span class="text-xs font-semibold text-ink truncate">{{ stageMeta.label }}</span>
        <span v-if="polling" class="text-xs text-accent flex items-center gap-1 font-mono">
          <i class="fas fa-sync fa-spin text-[10px]"></i>Monitorando
        </span>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <Button v-if="stage === 'idle' || (hasError && !contractError && !additiveError)"
          size="sm" :loading="running" :disabled="isRunning || running"
          icon="fas fa-play"
          @click="!running && !isRunning && emit('run-pipeline', launch.id)">
          {{ running ? 'Processando...' : 'Processar' }}
        </Button>

        <Button v-if="running" size="sm" variant="danger" icon="fas fa-stop"
          @click="emit('abort', launch.id)">
          Abortar
        </Button>

        <Button v-if="contractError || additiveError || measurementError"
          size="sm" variant="danger" :loading="running" :disabled="running"
          icon="fas fa-rotate-right"
          @click="!running && emit('retry-contract', launch.id)">
          {{ running ? 'Processando...' : 'Retentar' }}
        </Button>

        <IconButton v-if="(contractFound || additiveCreated || measurementCreated) && (!isAuthorized || !measurementAuthorized)"
          icon="fas fa-arrows-rotate" size="sm" label="Atualizar status"
          :disabled="polling || running"
          @click="emit('poll', launch.id)" />
      </div>
    </div>

    <div class="p-4 space-y-4">

      <!-- ── Credor ── -->
      <div>
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Credor</p>
        <div class="flex items-start gap-3">
          <div class="mt-0.5 shrink-0">
            <i v-if="creditorFound" class="fas fa-circle-check text-emerald-500"></i>
            <i v-else-if="creditorMissing" class="fas fa-circle-xmark text-red-500"></i>
            <i v-else class="fas fa-circle text-ink-subtle"></i>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-ink truncate">{{ launch.providerName || '—' }}</p>
            <p class="text-xs text-ink-subtle font-mono">{{ launch.providerCnpj || '—' }}</p>

            <p v-if="creditorFound && launch.siengeCreditorName && launch.siengeCreditorName !== launch.providerName"
              class="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <i class="fas fa-triangle-exclamation"></i>
              Sienge: <span class="font-medium ml-0.5">{{ launch.siengeCreditorName }}</span>
            </p>

            <div v-if="creditorMissing && ridEmailSent"
              class="mt-2 rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2 text-xs text-accent space-y-1">
              <p class="flex items-center gap-1.5 font-semibold">
                <i class="fas fa-envelope-circle-check"></i>Solicitação de cadastro enviada
              </p>
              <p>Email enviado em {{ ridSentAtLabel }}. Verificando automaticamente a cada 20 min.</p>
              <button class="text-accent hover:underline flex items-center gap-1 disabled:opacity-40"
                :disabled="running" @click="!running && emit('open-rid-modal', launch)">
                <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>Ver detalhes / reenviar
              </button>
            </div>

            <div v-else-if="creditorMissing"
              class="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300 space-y-1.5">
              <p class="flex items-center gap-1">
                <i class="fas fa-circle-info"></i>Fornecedor não encontrado no Sienge.
              </p>
              <button class="font-semibold hover:underline flex items-center gap-1 disabled:opacity-40"
                :disabled="running" @click="!running && emit('open-rid-modal', launch)">
                <i class="fas fa-file-arrow-up text-[10px]"></i>Solicitar cadastro via formulário RID →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Contrato ── -->
      <div>
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Contrato</p>

        <div v-if="contractCreating" class="flex items-center gap-2 text-sm text-accent">
          <i class="fas fa-spinner fa-spin"></i>Criando contrato no Sienge via automação...
        </div>

        <div v-else-if="stage === 'contract_manual_block'"
          class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-2">
          <p class="font-semibold flex items-center gap-1.5">
            <i class="fas fa-shield-halved"></i>Contrato existente localizado
          </p>
          <p>{{ launch.siengeContractError }}</p>
          <p>Se o contrato estiver correto, clique em prosseguir para criar o aditivo.</p>
          <Button size="sm" variant="primary" :disabled="running" icon="fas fa-play"
            @click="emit('continue-existing-contract', launch.id)">
            Prosseguir
          </Button>
        </div>

        <div v-else-if="contractError"
          class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
          <p class="font-semibold flex items-center gap-1">
            <i class="fas fa-triangle-exclamation"></i>Falha na criação do contrato
          </p>
          <p>{{ launch.siengeContractError }}</p>
          <p class="pt-1 italic">Acesse o Sienge e exclua o contrato incompleto antes de tentar novamente.</p>
        </div>

        <div v-else-if="contractMissing" class="text-xs text-ink-muted flex items-center gap-2">
          <i class="fas fa-file-circle-xmark text-amber-500"></i>
          Nenhum contrato encontrado. Será criado automaticamente.
        </div>

        <div v-else-if="contractFound" class="space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Documento</p>
              <p class="text-sm font-mono font-semibold text-ink truncate">
                {{ launch.siengeDocumentId || '—' }}
              </p>
            </div>
            <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Nº Contrato</p>
              <p class="text-sm font-mono font-semibold text-ink truncate">
                {{ launch.siengeContractNumber || '—' }}
              </p>
            </div>
            <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2 col-span-2 sm:col-span-1">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Vigência</p>
              <p class="text-xs text-ink font-mono">
                {{ fmtDate(launch.contractStartDate) }} → {{ fmtDate(launch.contractEndDate) }}
              </p>
            </div>

            <!-- Stepper do fluxo -->
            <div class="col-span-2 rounded-lg bg-surface-sunken border border-line px-3 py-2.5">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">Etapa do fluxo</p>
              <div class="flex items-center">
                <!-- Contrato -->
                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                  <div class="h-7 w-7 rounded-full grid place-items-center mb-1 transition-colors"
                    :class="stepBgFor(contractState)">
                    <i v-if="contractCreating" class="fas fa-spinner fa-spin text-xs"></i>
                    <i v-else-if="contractError" class="fas fa-xmark text-xs"></i>
                    <i v-else-if="isAuthorized || (isAdditivePath && (additiveCreated || additiveCreating || additiveError))" class="fas fa-check text-xs"></i>
                    <i v-else-if="contractFound" class="fas fa-lock text-xs"></i>
                    <span v-else class="text-xs font-bold">1</span>
                  </div>
                  <span class="text-[11px] leading-tight" :class="stepTextFor(contractState)">Contrato</span>
                </div>
                <div class="flex-1 h-0.5 mx-1 bg-line"></div>
                <!-- Aditivo -->
                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                  <div class="h-7 w-7 rounded-full grid place-items-center mb-1 transition-colors"
                    :class="stepBgFor(additiveState)">
                    <i v-if="additiveCreating" class="fas fa-spinner fa-spin text-xs"></i>
                    <i v-else-if="additiveError" class="fas fa-xmark text-xs"></i>
                    <i v-else-if="additiveCreated" class="fas fa-check text-xs"></i>
                    <span v-else class="text-xs font-bold">2</span>
                  </div>
                  <span class="text-[11px] leading-tight" :class="stepTextFor(additiveState)">Aditivo</span>
                </div>
                <div class="flex-1 h-0.5 mx-1 bg-line"></div>
                <!-- Medição -->
                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                  <div class="h-7 w-7 rounded-full grid place-items-center mb-1 transition-colors"
                    :class="stepBgFor(measurementState)">
                    <i v-if="measurementCreating" class="fas fa-spinner fa-spin text-xs"></i>
                    <i v-else-if="measurementError" class="fas fa-xmark text-xs"></i>
                    <i v-else-if="measurementCreated" class="fas fa-check text-xs"></i>
                    <span v-else class="text-xs font-bold">3</span>
                  </div>
                  <span class="text-[11px] leading-tight" :class="stepTextFor(measurementState)">Medição</span>
                </div>
                <div class="flex-1 h-0.5 mx-1 bg-line"></div>
                <!-- Título -->
                <div class="flex flex-col items-center text-center flex-1 min-w-0">
                  <div class="h-7 w-7 rounded-full grid place-items-center mb-1 transition-colors"
                    :class="stepBgFor(tituloState)">
                    <i v-if="tituloCreating" class="fas fa-spinner fa-spin text-xs"></i>
                    <i v-else-if="tituloError" class="fas fa-xmark text-xs"></i>
                    <i v-else-if="tituloPago" class="fas fa-check text-xs"></i>
                    <i v-else-if="tituloCreated" class="fas fa-file-invoice-dollar text-xs"></i>
                    <span v-else class="text-xs font-bold">4</span>
                  </div>
                  <span class="text-[11px] leading-tight" :class="stepTextFor(tituloState)">Título</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Aditivo -->
          <div v-if="additiveCreating" class="flex items-center gap-2 text-sm text-accent">
            <i class="fas fa-spinner fa-spin"></i>Criando aditivo no Sienge via automação...
          </div>

          <div v-else-if="additiveError"
            class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
            <p class="font-semibold flex items-center gap-1.5">
              <i class="fas fa-triangle-exclamation"></i>Falha na criação do aditivo
            </p>
            <p v-if="additiveErrorMsg" class="break-words leading-relaxed">{{ additiveErrorMsg }}</p>
            <p v-else class="italic opacity-70">Detalhes do erro não disponíveis.</p>
          </div>

          <div v-else-if="additiveCreated && !measurementCreated && !measurementCreating && !measurementError"
            class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border"
            :class="isAuthorized
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'">
            <div class="flex items-center gap-2">
              <i :class="isAuthorized ? 'fas fa-lock-open text-emerald-500' : 'fas fa-lock text-amber-500'"></i>
              <span class="text-xs font-semibold"
                :class="isAuthorized ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'">
                {{ isAuthorized
                  ? (isAdditivePath ? 'Aditivo autorizado' : 'Contrato autorizado')
                  : (isAdditivePath ? 'Aditivo em autorização' : 'Contrato em autorização') }}
              </span>
            </div>
            <Badge v-if="!isAuthorized && authLevelLabel(launch.siengeContractAuthLevel)"
              variant="warning" size="sm">
              {{ authLevelLabel(launch.siengeContractAuthLevel) }}
            </Badge>
          </div>

          <!-- Medição -->
          <div v-if="measurementCreating" class="flex items-center gap-2 text-sm text-accent">
            <i class="fas fa-spinner fa-spin"></i>Criando medição no Sienge via automação...
          </div>

          <div v-else-if="measurementError"
            class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
            <p class="font-semibold flex items-center gap-1.5">
              <i class="fas fa-triangle-exclamation"></i>Falha na criação da medição
            </p>
            <p v-if="measurementErrorMsg" class="break-words leading-relaxed">{{ measurementErrorMsg }}</p>
            <p v-else class="italic opacity-70">Detalhes do erro não disponíveis.</p>
          </div>

          <div v-else-if="measurementCreated && !inTituloStage"
            class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border"
            :class="measurementAuthorized
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'">
            <div class="flex items-center gap-2">
              <i :class="measurementAuthorized
                ? 'fas fa-ruler-combined text-emerald-500'
                : 'fas fa-lock text-amber-500'"></i>
              <span class="text-xs font-semibold"
                :class="measurementAuthorized
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-amber-700 dark:text-amber-300'">
                {{ measurementAuthorized ? 'Medição autorizada' : 'Medição em autorização' }}
                <span v-if="launch.siengeMeasurementNumber" class="font-normal opacity-75 ml-1">
                  #{{ launch.siengeMeasurementNumber }}
                </span>
              </span>
            </div>
            <Badge v-if="!measurementAuthorized && authLevelLabel(launch.siengeMeasurementAuthLevel)"
              variant="warning" size="sm">
              {{ authLevelLabel(launch.siengeMeasurementAuthLevel) }}
            </Badge>
          </div>
        </div>

        <div v-else class="text-xs text-ink-subtle flex items-center gap-2">
          <i class="fas fa-circle text-ink-subtle/40"></i>Aguardando processamento
        </div>
      </div>

      <!-- ── Título ── -->
      <div v-if="tituloCreating || tituloCreated || tituloError">
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Título Sienge</p>

        <div v-if="tituloCreating" class="flex items-center gap-2 text-sm text-accent">
          <i class="fas fa-spinner fa-spin"></i>Criando título no Sienge via automação...
        </div>

        <div v-else-if="tituloError"
          class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 space-y-1">
          <p class="font-semibold flex items-center gap-1.5">
            <i class="fas fa-triangle-exclamation"></i>Falha na criação do título
          </p>
          <p v-if="tituloErrorMsg" class="break-words leading-relaxed">{{ tituloErrorMsg }}</p>
          <p v-else class="italic opacity-70">Detalhes do erro não disponíveis.</p>
        </div>

        <div v-else-if="tituloCreated"
          class="rounded-lg border px-3 py-2.5 space-y-2"
          :class="tituloPago
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : tituloAwaiting
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <i :class="tituloPago
                ? 'fas fa-circle-check text-emerald-500'
                : tituloAwaiting
                  ? 'fas fa-clock text-amber-500'
                  : 'fas fa-file-invoice-dollar text-emerald-500'"></i>
              <span class="text-xs font-semibold truncate"
                :class="tituloPago || !tituloAwaiting
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-amber-700 dark:text-amber-300'">
                {{ tituloPago ? 'Título pago' : tituloAwaiting ? 'Aguardando pagamento' : 'Título criado' }}
              </span>
            </div>
            <Badge v-if="launch.siengeTituloNumber"
              :variant="tituloPago ? 'success' : 'neutral'" size="sm" class="font-mono">
              #{{ launch.siengeTituloNumber }}
            </Badge>
          </div>

          <p v-if="launch.siengeTituloStatus" class="text-[11px] text-ink-subtle font-mono">
            Status Sienge: {{ launch.siengeTituloStatus }}
          </p>

          <div v-if="boletoRegisterError"
            class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <p class="font-semibold flex items-center gap-1.5">
              <i class="fas fa-triangle-exclamation"></i>Boleto não registrado
            </p>
            <p class="break-words opacity-80">{{ launch.siengeTituloError }}</p>
            <p class="text-[11px] opacity-70">
              {{ boletoManualRequired
                ? 'Registre o boleto manualmente no Sienge ou envie um boleto corrigido pelo botão abaixo.'
                : 'O sistema tentará novamente automaticamente. Use o botão abaixo para enviar um novo boleto.' }}
            </p>
          </div>

          <div v-if="!tituloAwaiting && !tituloPago && launch.siengeTituloNumber && launch.boletoBarcode && !boletoRegisterError"
            class="pt-1">
            <Button size="sm" :disabled="running" icon="fas fa-barcode"
              @click="emit('register-boleto', launch.id)">
              Registrar boleto no título
            </Button>
          </div>

          <div v-if="canUpdateBoleto && !tituloPago" class="pt-1">
            <Button size="sm" variant="secondary" :disabled="running" icon="fas fa-file-arrow-up"
              @click="emit('update-boleto', launch)">
              Enviar novo boleto
            </Button>
          </div>
        </div>
      </div>

      <!-- ── Documentos ── -->
      <div>
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Documentos</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <!-- NF -->
          <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2 space-y-0.5">
            <p class="flex items-center gap-1 font-medium text-ink">
              <i class="fas fa-file-invoice text-red-500"></i> Nota Fiscal
            </p>
            <div v-if="launch.nfUrl" class="space-y-0.5">
              <p class="text-ink-muted">
                {{ [launch.nfType, launch.nfNumber ? `#${launch.nfNumber}` : ''].filter(Boolean).join(' ') || '—' }}
              </p>
              <p v-if="launch.nfIssueDate" class="text-ink-subtle font-mono">
                Emissão: {{ fmtDate(launch.nfIssueDate) }}
              </p>
              <a :href="launch.nfUrl" target="_blank"
                class="text-accent hover:underline flex items-center gap-1 mt-1">
                <i class="fas fa-arrow-up-right-from-square text-[10px]"></i> Abrir
              </a>
            </div>
            <p v-else class="text-ink-subtle italic">Não anexada</p>
          </div>
          <!-- Boleto -->
          <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2 space-y-0.5">
            <p class="flex items-center gap-1 font-medium text-ink">
              <i class="fas fa-barcode text-accent"></i> Boleto
            </p>
            <div v-if="launch.boletoUrl" class="space-y-0.5">
              <p v-if="launch.boletoIssueDate" class="text-ink-muted font-mono">
                Emissão: {{ fmtDate(launch.boletoIssueDate) }}
              </p>
              <p v-if="launch.boletoDueDate" class="text-ink-subtle font-mono">
                Vence: {{ fmtDate(launch.boletoDueDate) }}
              </p>
              <p v-if="launch.boletoBarcode" class="font-mono text-ink-subtle truncate">
                {{ launch.boletoBarcode.slice(0, 22) }}…
              </p>
              <a :href="launch.boletoUrl" target="_blank"
                class="text-accent hover:underline flex items-center gap-1 mt-1">
                <i class="fas fa-arrow-up-right-from-square text-[10px]"></i> Abrir
              </a>
            </div>
            <p v-else class="text-ink-subtle italic">Não anexado</p>
          </div>
        </div>
      </div>

      <!-- ── Saldo ── -->
      <div v-if="contractFound && balanceOk !== null && balanceOk !== undefined">
        <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Saldo</p>
        <div class="rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 border"
          :class="balanceOk
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'">
          <div>
            <p class="text-xs"
              :class="balanceOk
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'">
              {{ balanceOk ? 'Saldo suficiente' : 'Saldo insuficiente' }}
            </p>
            <p class="text-sm font-bold mt-0.5"
              :class="balanceOk
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300'">
              Disponível: {{ fmt(balance) }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-ink-subtle">Valor lançamento</p>
            <p class="text-sm font-semibold text-ink">{{ fmt(unitPrice) }}</p>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
