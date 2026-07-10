<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
});
const emit = defineEmits(['close', 'changed']);

const store = useBoletoStore();
const auth = useAuthStore();
const isAdmin = computed(() => auth.hasRole('admin'));

// `live` é a versão SEMPRE atual do item: cruza o prop (referência inicial)
// com `store.history` (re-buscado após ações). Assim o modal não precisa
// recarregar pra mostrar dados frescos — basta o store atualizar.
const live = computed(() => {
  if (!props.item) return null;
  const fromStore = store.history.find(h => h.id === props.item.id);
  return fromStore || props.item;
});

const activeTab = ref('summary');
const tabOptions = [
  { value: 'summary',  label: 'Resumo',   icon: 'fas fa-circle-info' },
  { value: 'timeline', label: 'Histórico', icon: 'fas fa-timeline' },
  { value: 'pdf',      label: 'PDF',      icon: 'fas fa-file-pdf' },
];

// Carrega timeline quando abre / quando troca o item.
//
// IMPORTANTE: `store.timelineEvents` e `store.timelineHistory` são singletons
// no Pinia — compartilhados entre QUALQUER modal/componente que use o store.
// Se abrir boleto A, fechar, abrir boleto B → enquanto o fetchTimeline(B)
// está pendente, o modal renderiza os eventos do A (resíduo). Por isso
// limpamos SINCRONAMENTE antes de fazer fetch.
//
// `props.live` é um computed, NÃO uma prop — o watch deve observar
// `props.item?.id` (a prop real recebida do pai).
watch(() => [props.open, props.item?.id], async ([open, id]) => {
  if (open && id) {
    activeTab.value = 'summary';
    actionMsg.value = null;
    // Limpa IMEDIATAMENTE o estado do boleto anterior, antes do fetch async.
    store.timelineEvents = [];
    store.timelineHistory = null;
    store.timelineAttempts = [];
    await store.fetchTimeline(id);
  } else if (!open) {
    stopPolling();
    // Ao fechar, limpa pra próxima abertura não mostrar resíduo de quem fechou.
    store.timelineEvents = [];
    store.timelineHistory = null;
    store.timelineAttempts = [];
  }
}, { immediate: true });

function close() {
  stopPolling();
  store.timelineEvents = [];
  store.timelineHistory = null;
  store.timelineAttempts = [];
  emit('close');
}

// ── Polling reativo (após ações assíncronas que rodam em background) ────────
// Quando o admin dispara "Verificar pagamento", o backend retorna 202 e segue
// processando no Playwright (8-20s). Em vez de exigir refresh manual, polamos
// store + timeline em intervalos crescentes até o payment_status mudar ou
// estourar o tempo máximo.
const pollTimer = ref(null);
function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}
function startPolling({ intervalMs = 5000, maxMs = 90000 } = {}) {
  stopPolling();
  const startedAt = Date.now();
  const initialStatus = live.value?.payment_status || 'pending';
  pollTimer.value = setInterval(async () => {
    if (!props.open) return stopPolling();
    if (Date.now() - startedAt > maxMs) {
      stopPolling();
      actionMsg.value = {
        variant: 'warning',
        text: 'Aguardando finalizar a verificação no Ecobrança. Recarregue manualmente se precisar.',
      };
      return;
    }
    // Refresh SILENCIOSO em paralelo: store + timeline. Sem o flag silent,
    // o spinner pisca a cada 5s — péssima UX. Silent substitui os dados
    // in-place quando chegam, sem flashar "Carregando...".
    try {
      await Promise.all([
        store.fetchHistory({ silent: true }),
        store.fetchTimeline(props.item.id, { silent: true }),
      ]);
      const now = live.value?.payment_status;
      if (now && now !== initialStatus) {
        stopPolling();
        actionMsg.value = { variant: 'success', text: `Status atualizado: ${now}` };
        emit('changed');
      }
    } catch (_) { /* segue o polling */ }
  }, intervalMs);
}

onUnmounted(() => {
  stopPolling();
  if (clockTimer.value) clearInterval(clockTimer.value);
});

// ── Relógio reativo pra contagem regressiva da situação pendente ────────────
// Atualiza a cada 30s enquanto o modal está aberto. Permite mostrar
// "em ~3 min" sem precisar de polling completo (que é mais caro).
const now = ref(Date.now());
const clockTimer = ref(null);
watch(() => props.open, (open) => {
  if (open) {
    now.value = Date.now();
    if (!clockTimer.value) {
      clockTimer.value = setInterval(() => { now.value = Date.now(); }, 30000);
    }
  } else if (clockTimer.value) {
    clearInterval(clockTimer.value);
    clockTimer.value = null;
  }
}, { immediate: true });

/**
 * Info da situação CV pendente — usado no badge do header e no item virtual
 * da timeline. Retorna null quando não há nada agendado ou já foi aplicado.
 */
const situacaoPendenteInfo = computed(() => {
  const it = live.value;
  if (!it?.situacao_pendente_em || it.situacao_pendente_aplicada) return null;
  const at = new Date(it.situacao_pendente_em);
  const diffMs = at.getTime() - now.value;
  const diffMin = Math.round(diffMs / 60000);
  let label;
  if (diffMs <= 0) label = '<1 min';
  else if (diffMin <= 1) label = '~1 min';
  else label = `~${diffMin} min`;
  return {
    at,
    diffMin,
    label,
    situacaoId: it.situacao_pendente_id,
  };
});

/**
 * Timeline enriquecida: eventos reais + 1 item virtual no final pra mostrar
 * a situação CV agendada (quando há agendamento ativo e ainda não aplicado).
 * Sempre que a situação for aplicada de fato (pelo scheduler), o evento real
 * cv_situation chega via fetchTimeline e o virtual some.
 */
const enrichedTimeline = computed(() => {
  const events = [...(store.timelineEvents || [])];
  const it = live.value;
  if (!it) return events;

  const pendingAt = it.situacao_pendente_em ? new Date(it.situacao_pendente_em) : null;
  const isPending = pendingAt && !it.situacao_pendente_aplicada;
  if (isPending) {
    const diffMin = Math.round((pendingAt.getTime() - now.value) / 60000);
    const tempo = diffMin <= 0
      ? 'aplicando a qualquer momento…'
      : (diffMin === 1 ? 'em ~1 min' : `em ~${diffMin} min`);

    events.push({
      id: `virtual-pending-${it.id}`,
      boleto_history_id: it.id,
      type: 'situacao_pendente',
      severity: 'info',
      message: `Aguardando o lote Sienge processar antes de mudar a etapa para ${it.situacao_pendente_id} — ${tempo}. Aplicação programada para ${formatDateTime(pendingAt)}.`,
      created_at: pendingAt.toISOString(),
      _virtual: true,
    });
  }
  return events;
});

// ── Tentativas (boletos) da reserva — histórico consolidado ─────────────────
// A timeline agora junta TODOS os boletos emitidos para a mesma reserva. Este
// bloco resume cada tentativa (emissão/reemissão) e permite taggear cada evento.
const attempts = computed(() => store.timelineAttempts || []);
const hasMultipleAttempts = computed(() => attempts.value.length > 1);

// Mapa id do boleto → dados + nº de ordem (1 = primeira tentativa).
const attemptMap = computed(() => {
  const m = new Map();
  attempts.value.forEach((a, i) => m.set(a.id, { ...a, ordem: i + 1 }));
  return m;
});

// Tentativa à qual um evento pertence (pra rotular na timeline consolidada).
function eventAttempt(ev) {
  if (!ev?.boleto_history_id) return null;
  return attemptMap.value.get(ev.boleto_history_id) || null;
}

// Situação combinada (emissão + pagamento) de uma tentativa, em 1 rótulo curto.
function attemptOutcome(a) {
  if (a.status === 'error') return { label: 'Erro na emissão', variant: 'danger', icon: 'fas fa-circle-exclamation' };
  if (a.status === 'processing') return { label: 'Processando', variant: 'info', icon: 'fas fa-spinner fa-spin' };
  if (a.status === 'skipped') return { label: 'Sem série', variant: 'neutral', icon: 'fas fa-forward' };
  if (a.ignorado) return { label: 'Ignorado (duplicado)', variant: 'neutral', icon: 'fas fa-arrow-right-arrow-left' };
  // status === 'success' → detalha pelo pagamento
  const p = a.payment_status;
  if (p === 'paid') return { label: 'Pago', variant: 'success', icon: 'fas fa-circle-check' };
  if (p === 'cancelled') return { label: a.substituido_por_id ? 'Baixado (substituído)' : 'Baixado', variant: 'danger', icon: 'fas fa-ban' };
  if (p === 'error') return { label: 'Erro na verificação', variant: 'warning', icon: 'fas fa-triangle-exclamation' };
  return { label: 'Emitido · pendente', variant: 'info', icon: 'fas fa-clock' };
}
function outcomeChipClass(variant) {
  return ({
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    danger:  'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
    info:    'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
    neutral: 'bg-ink/5 text-ink-muted border border-line',
  })[variant] || 'bg-surface-sunken border border-line';
}

// ── Format helpers ──────────────────────────────────────────────────────────
function formatCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n) + '…' : s;
}

// ── Status badges ───────────────────────────────────────────────────────────
function statusLabel(s) {
  return ({ processing: 'Processando', success: 'Sucesso', error: 'Erro' })[s] || s;
}
function statusVariant(s) {
  return ({ processing: 'info', success: 'success', error: 'danger' })[s] || 'neutral';
}
function paymentLabel(s) {
  return ({ pending: 'Pendente', paid: 'Pago', cancelled: 'Baixado', error: 'Erro' })[s] || s;
}
function paymentBadgeClass(s) {
  return ({
    pending:   'bg-ink/5 text-ink-muted border border-line',
    paid:      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    cancelled: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
    error:     'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  })[s] || 'bg-surface-sunken border border-line';
}
function paymentIcon(s) {
  return ({ pending: 'fas fa-clock', paid: 'fas fa-circle-check', cancelled: 'fas fa-ban', error: 'fas fa-circle-exclamation' })[s] || 'fas fa-circle';
}

// ── Eventos ─────────────────────────────────────────────────────────────────
const EVENT_TITLES = {
  emitted:                  'Boleto emitido',
  pdf_saved:                'PDF salvo no Supabase',
  cv_attached:              'Documento anexado no CV',
  cv_attach_failed:         'Falha ao anexar no CV',
  client_email:             'E-mail enviado ao cliente',
  client_email_skipped:     'E-mail não enviado',
  client_whatsapp:          'WhatsApp enviado ao cliente',
  client_whatsapp_skipped:  'WhatsApp não enviado',
  cv_message_sent:          'Mensagem postada no CV',
  cv_message_failed:        'Falha postando mensagem',
  cv_situation:             'Situação CV alterada',
  cv_situation_changed:     'Situação CV alterada',
  cv_situation_failed:      'Falha mudando situação',
  cv_situation_scheduled:   'Situação CV agendada',
  ignored_duplicate:        'Gatilho ignorado (duplicado)',
  replace_initiated:        'Substituição iniciada (baixa + reemissão)',
  situacao_pendente:        'Situação pendente (aguardando lote)',
  payment_check:            'Verificação Ecobrança',
  payment_check_error:      'Erro na verificação',
  payment_check_skipped:    'Verificação pulada',
  payment_check_not_found:  'Não encontrado no Ecobrança',
  paid:                     '✅ Boleto pago',
  baixa_requested:          'Baixa iniciada',
  baixa_confirmed:          '❌ Baixa confirmada',
  baixa_aborted:            'Baixa abortada (safety)',
  baixa_failed:             'Falha na baixa',
};
function eventTitle(t) { return EVENT_TITLES[t] || t; }

const EVENT_ICONS = {
  emitted:          'fas fa-file-invoice-dollar',
  pdf_saved:        'fas fa-file-pdf',
  cv_attached:      'fas fa-paperclip',
  cv_attach_failed: 'fas fa-link-slash',
  client_email:     'fas fa-envelope',
  client_email_skipped: 'fas fa-envelope-open',
  client_whatsapp:  'fab fa-whatsapp',
  client_whatsapp_skipped: 'fab fa-whatsapp',
  cv_message_sent:  'fas fa-comment',
  cv_message_failed:'fas fa-comment-slash',
  cv_situation:     'fas fa-shuffle',
  cv_situation_changed: 'fas fa-shuffle',
  cv_situation_failed: 'fas fa-triangle-exclamation',
  cv_situation_scheduled: 'fas fa-hourglass-half',
  ignored_duplicate:'fas fa-arrow-right-arrow-left',
  replace_initiated:'fas fa-rotate',
  situacao_pendente:'fas fa-hourglass-half',
  payment_check:    'fas fa-magnifying-glass-dollar',
  payment_check_error: 'fas fa-circle-exclamation',
  payment_check_skipped:'fas fa-pause',
  payment_check_not_found:'fas fa-question',
  paid:             'fas fa-circle-check',
  baixa_requested:  'fas fa-hand-holding-hand',
  baixa_confirmed:  'fas fa-ban',
  baixa_aborted:    'fas fa-hand-paper',
  baixa_failed:     'fas fa-triangle-exclamation',
};
function eventIcon(type, severity) {
  return EVENT_ICONS[type] || ({
    success: 'fas fa-circle-check',
    warning: 'fas fa-triangle-exclamation',
    error:   'fas fa-circle-exclamation',
    info:    'fas fa-circle-info',
  })[severity] || 'fas fa-circle';
}
function eventIconBg(severity) {
  return ({
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    error:   'bg-red-500/15 text-red-600 dark:text-red-400',
    info:    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  })[severity] || 'bg-surface-sunken text-ink-muted';
}

// ── Warnings ────────────────────────────────────────────────────────────────
function warningsList(it) {
  const raw = it?.warnings;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
const WARNING_LABELS = {
  cv_anexo: 'Anexo no CV', cv_mensagem: 'Mensagem no CV', cv_situacao: 'Situação CV',
  cliente_email: 'E-mail cliente', cliente_whatsapp: 'WhatsApp cliente',
};

// ── Ações ───────────────────────────────────────────────────────────────────
const actionState = ref({ resending: false, retrying: false, checking: false });
const actionMsg = ref(null);

async function handleResend() {
  if (!live.value) return;
  if (!confirm(`Reenviar boleto da reserva ${live.value.idreserva} ao titular?`)) return;
  actionState.value.resending = true;
  actionMsg.value = null;
  try {
    const res = await store.resendHistoryItem(live.value.id);
    if (res.ok) {
      const e = res.data?.email; const w = res.data?.whatsapp;
      const msgE = e?.ok ? `✓ E-mail enviado pra ${e.to}` : `✗ E-mail: ${e?.error || 'não enviado'}`;
      const msgW = w?.ok ? `✓ WhatsApp enviado pra ${w.to}` : `✗ WhatsApp: ${w?.error || 'não enviado'}`;
      actionMsg.value = { variant: 'success', text: `Reenvio concluído. ${msgE} / ${msgW}` };
      // Refresh silencioso pra ver novos eventos sem piscar spinner.
      await Promise.all([
        store.fetchHistory({ silent: true }),
        store.fetchTimeline(live.value.id, { silent: true }),
      ]);
      emit('changed');
    } else {
      actionMsg.value = { variant: 'error', text: `Falha: ${res.error || 'erro desconhecido'}` };
    }
  } finally {
    actionState.value.resending = false;
  }
}

async function handleRetry() {
  if (!live.value) return;
  // Reemissão manual pelo modal: emite e ENVIA ao cliente, sem mexer na etapa do
  // CV.
  //   • pending   → se a condição do RPV mudou, baixa o boleto atual e emite o
  //                 atualizado; se nada mudou, backend não faz nada.
  //   • cancelled → boleto anterior já baixado; só emite um novo.
  //   • error     → reprocessamento normal (fluxo completo do webhook).
  const isPending = live.value.status === 'success' && live.value.payment_status === 'pending';
  const isCancelled = live.value.status === 'success' && live.value.payment_status === 'cancelled';
  const isRegenerate = isPending || isCancelled;

  let confirmMsg;
  if (isPending) {
    confirmMsg = `Este boleto ainda está EM ABERTO.\n\nSe a condição do Recurso Próprio à Vista tiver mudado, o boleto atual será CANCELADO (baixado no Ecobrança) e um novo será emitido com a condição atual e ENVIADO ao cliente. Se nada tiver mudado, nenhuma ação é feita.`;
  } else if (isCancelled) {
    confirmMsg = `O boleto anterior desta reserva foi baixado.\n\nGerar um NOVO boleto (com as condições atuais da série) e enviá-lo ao cliente?`;
  } else {
    confirmMsg = `Re-disparar emissão do boleto pra reserva ${live.value.idreserva}?`;
  }
  if (!confirm(confirmMsg)) return;

  actionState.value.retrying = true;
  try {
    const ok = isRegenerate
      ? await store.regenerateHistoryItem(live.value.id)
      : await store.retryHistoryItem(live.value.id);
    if (ok) {
      actionMsg.value = {
        variant: 'success',
        text: isPending
          ? 'Solicitado — se a condição mudou, o boleto atual será baixado e um novo emitido e enviado ao cliente. Acompanhe no histórico.'
          : (isCancelled
              ? 'Novo boleto sendo gerado e enviado ao cliente — acompanhe na lista do histórico.'
              : 'Reprocessamento disparado — acompanhando atualizações…'),
      };
      // Roda Playwright (lento). Mesma estratégia do check.
      startPolling({ intervalMs: 5000, maxMs: 120000 });
      emit('changed');
    } else {
      actionMsg.value = { variant: 'error', text: isRegenerate ? 'Falha ao gerar/reemitir boleto.' : 'Falha ao reprocessar.' };
    }
  } finally {
    actionState.value.retrying = false;
  }
}

async function handleCheckPayment() {
  if (!live.value) return;
  if (!confirm('Disparar verificação imediata no Ecobrança (sem esperar 8h)?')) return;
  actionState.value.checking = true;
  try {
    const r = await store.triggerPaymentCheck(live.value.id);
    if (r.ok) {
      actionMsg.value = { variant: 'success', text: 'Verificação disparada — acompanhando atualizações…' };
      // Backend retornou 202 (lock adquirido) e está processando em background.
      // Polling automático até payment_status mudar ou estourar o tempo.
      startPolling({ intervalMs: 5000, maxMs: 90000 });
    } else if (r.conflict) {
      // 409 = Ecobrança ocupado com outra operação. NÃO inicia polling —
      // só avisa o usuário pra tentar de novo daqui a pouco.
      actionMsg.value = {
        variant: 'warning',
        text: 'Outra verificação no Ecobrança já está em andamento. Aguarde alguns minutos e tente novamente.',
      };
    } else {
      actionMsg.value = { variant: 'error', text: `Falha: ${r.error || 'erro desconhecido'}` };
    }
  } finally {
    actionState.value.checking = false;
  }
}

async function copyLink() {
  const url = live.value?.boleto_supabase_url;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    actionMsg.value = { variant: 'success', text: 'Link copiado pra área de transferência.' };
  } catch {
    actionMsg.value = { variant: 'error', text: 'Navegador bloqueou a cópia automática. Selecione o link manualmente.' };
  }
}
</script>

<template>
  <div v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    @click.self="close">
    <div class="bg-surface rounded-xl shadow-2xl border border-line w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">

      <!-- ── Header ───────────────────────────────────────────────────────── -->
      <div class="flex items-start justify-between gap-3 p-5 border-b border-line bg-surface-sunken/30">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <h3 class="font-semibold text-ink text-base">
              Boleto Caixa · Reserva
              <span class="font-mono text-accent">#{{ live?.idreserva }}</span>
            </h3>
            <Badge v-if="live?.status" :variant="statusVariant(live.status)" size="sm">
              <i :class="live.status === 'success' ? 'fas fa-check' : live.status === 'error' ? 'fas fa-times' : 'fas fa-spinner fa-spin'" class="mr-1"></i>
              {{ statusLabel(live.status) }}
            </Badge>
            <span v-if="live?.payment_status"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              :class="paymentBadgeClass(live.payment_status)">
              <i :class="paymentIcon(live.payment_status)"></i>
              {{ paymentLabel(live.payment_status) }}
            </span>
            <!-- Situação CV pendente — mostra contagem regressiva alinhada ao lote Sienge -->
            <span v-if="situacaoPendenteInfo"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
              <i class="fas fa-hourglass-half"></i>
              Situação {{ situacaoPendenteInfo.situacaoId }} em {{ situacaoPendenteInfo.label }}
            </span>
          </div>
          <p class="text-xs text-ink-muted">
            {{ live?.titular_nome || '—' }} · {{ live?.empreendimento || '—' }}
          </p>
          <p v-if="live?.nosso_numero" class="text-[11px] text-ink-subtle font-mono mt-0.5">
            Nosso Nº: {{ live.nosso_numero }} · Venc: {{ formatDate(live?.vencimento) }} · Valor {{ formatCurrency(live?.valor) }}
          </p>
        </div>
        <button @click="close" class="text-ink-muted hover:text-ink shrink-0 text-lg">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- ── Tabs ─────────────────────────────────────────────────────────── -->
      <div class="px-5 py-2 border-b border-line">
        <SegmentedControl v-model="activeTab" :options="tabOptions" size="sm" />
      </div>

      <!-- ── Action feedback inline ───────────────────────────────────────── -->
      <div v-if="actionMsg" class="px-5 pt-3">
        <div class="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
          :class="{
            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20': actionMsg.variant === 'success',
            'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20':               actionMsg.variant === 'error',
            'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20':       actionMsg.variant === 'warning',
          }">
          <i :class="{
            'fas fa-circle-check': actionMsg.variant === 'success',
            'fas fa-circle-exclamation': actionMsg.variant === 'error',
            'fas fa-triangle-exclamation': actionMsg.variant === 'warning',
          }" class="mt-0.5"></i>
          <span>{{ actionMsg.text }}</span>
        </div>
      </div>

      <!-- ── Body ─────────────────────────────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto p-5">

        <!-- ── TAB: RESUMO ────────────────────────────────────────────────── -->
        <div v-if="activeTab === 'summary'" class="space-y-4">
          <!-- Grid: dados principais -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-lg border border-line bg-surface-sunken/40 p-3">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-semibold mb-1">Valor</p>
              <p class="text-xl font-bold text-ink font-mono tabular-nums">{{ formatCurrency(live?.valor) }}</p>
              <p v-if="live?.valor_original && Number(live.valor_original) !== Number(live.valor)"
                class="text-[10px] text-ink-subtle mt-1">
                Original: {{ formatCurrency(live.valor_original) }} · Comissão {{ live.comissao_percentual_aplicada }}%
              </p>
            </div>
            <div class="rounded-lg border border-line bg-surface-sunken/40 p-3">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-semibold mb-1">Vencimento</p>
              <p class="text-xl font-bold text-ink font-mono tabular-nums">{{ formatDate(live?.vencimento) }}</p>
            </div>
          </div>

          <!-- Detalhes em tabela compacta -->
          <div class="rounded-lg border border-line overflow-hidden">
            <table class="w-full text-sm">
              <tbody>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle w-[35%]">Titular</td>
                  <td class="px-3 py-2 text-ink">{{ live?.titular_nome || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle">Empreendimento</td>
                  <td class="px-3 py-2 text-ink">{{ live?.empreendimento || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle">Nosso Número</td>
                  <td class="px-3 py-2 text-ink font-mono">{{ live?.nosso_numero || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle">Nº Documento</td>
                  <td class="px-3 py-2 text-ink font-mono">{{ live?.seu_numero || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle">CNPJ Empresa</td>
                  <td class="px-3 py-2 text-ink font-mono text-xs">{{ live?.cnpj_empresa || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle">Emitido em</td>
                  <td class="px-3 py-2 text-ink-muted text-xs">{{ formatDateTime(live?.createdAt || live?.created_at) }}</td>
                </tr>
                <tr v-if="live?.last_checked_at" class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle">Última verificação</td>
                  <td class="px-3 py-2 text-ink-muted text-xs">
                    {{ formatDateTime(live.last_checked_at) }}
                    <span v-if="live.last_check_situation" class="ml-2 text-ink">· {{ live.last_check_situation }}</span>
                  </td>
                </tr>
                <tr v-if="live?.paid_at" class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle">Pago em</td>
                  <td class="px-3 py-2 text-emerald-600 text-xs font-semibold">{{ formatDateTime(live.paid_at) }}</td>
                </tr>
                <tr v-if="live?.cancelled_at" class="border-b border-line/60">
                  <td class="px-3 py-2 text-xs text-ink-subtle">Baixado em</td>
                  <td class="px-3 py-2 text-red-600 text-xs font-semibold">{{ formatDateTime(live.cancelled_at) }}</td>
                </tr>
                <tr v-if="live?.idtransacao">
                  <td class="px-3 py-2 text-xs text-ink-subtle">ID Transação CV</td>
                  <td class="px-3 py-2 text-ink-muted font-mono text-xs">{{ live.idtransacao }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Erro de emissão (quando aplicável) -->
          <div v-if="live?.status === 'error' && live?.error_message"
            class="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <p class="text-xs font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-1.5">
              <i class="fas fa-circle-exclamation"></i> Erro na emissão
            </p>
            <p class="text-xs text-red-600 dark:text-red-400 break-words">{{ live.error_message }}</p>
          </div>

          <!-- Notificações: checklist -->
          <div>
            <p class="text-[11px] uppercase tracking-wider text-ink-subtle font-semibold mb-2">
              Status das notificações
            </p>
            <ul class="space-y-1.5 text-sm">
              <li class="flex items-start gap-2">
                <i :class="live?.cv_documento_anexado ? 'fas fa-circle-check text-emerald-500' : 'fas fa-circle-xmark text-red-500'"></i>
                <span class="text-ink">
                  <strong>Anexo no CV:</strong>
                  {{ live?.cv_documento_anexado ? 'OK' : (warningsList(live).find(w => w.etapa === 'cv_anexo')?.erro || 'não anexado') }}
                </span>
              </li>
              <li class="flex items-start gap-2">
                <i :class="
                  live?.cv_situacao_alterada
                    ? 'fas fa-circle-check text-emerald-500'
                    : (situacaoPendenteInfo
                      ? 'fas fa-hourglass-half text-blue-500'
                      : 'fas fa-circle-minus text-ink-subtle')
                "></i>
                <span class="text-ink">
                  <strong>Situação CV:</strong>
                  <template v-if="live?.cv_situacao_alterada">alterada</template>
                  <template v-else-if="situacaoPendenteInfo">
                    aguardando aplicação (situação {{ situacaoPendenteInfo.situacaoId }} em {{ situacaoPendenteInfo.label }})
                  </template>
                  <template v-else>
                    {{ warningsList(live).find(w => w.etapa === 'cv_situacao')?.erro || 'não alterada' }}
                  </template>
                </span>
              </li>
              <li class="flex items-start gap-2">
                <i :class="live?.cv_mensagem_enviada ? 'fas fa-circle-check text-emerald-500' : 'fas fa-circle-xmark text-red-500'"></i>
                <span class="text-ink"><strong>Mensagem no CV:</strong> {{ live?.cv_mensagem_enviada ? 'OK' : 'não enviada' }}</span>
              </li>
              <li class="flex items-start gap-2">
                <i :class="live?.cliente_email_enviado ? 'fas fa-circle-check text-emerald-500' : 'fas fa-circle-minus text-ink-subtle'"></i>
                <span class="text-ink">
                  <strong>E-mail cliente:</strong>
                  {{ live?.cliente_email_enviado ? 'enviado' : (warningsList(live).find(w => w.etapa === 'cliente_email')?.erro || 'não enviado') }}
                </span>
              </li>
              <li class="flex items-start gap-2">
                <i :class="live?.cliente_whatsapp_enviado ? 'fas fa-circle-check text-emerald-500' : 'fas fa-circle-minus text-ink-subtle'"></i>
                <span class="text-ink">
                  <strong>WhatsApp cliente:</strong>
                  {{ live?.cliente_whatsapp_enviado ? 'enviado' : (warningsList(live).find(w => w.etapa === 'cliente_whatsapp')?.erro || 'não enviado') }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <!-- ── TAB: TIMELINE ──────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'timeline'">
          <div v-if="store.timelineLoading" class="text-center py-12 text-ink-muted">
            <i class="fas fa-spinner fa-spin text-2xl"></i>
            <p class="text-sm mt-2">Carregando eventos…</p>
          </div>
          <div v-else-if="store.timelineError" class="text-sm text-red-500 py-3">
            <i class="fas fa-circle-exclamation"></i> {{ store.timelineError }}
          </div>
          <div v-else>
            <!-- Tentativas desta reserva — histórico consolidado num só lugar -->
            <div v-if="attempts.length" class="mb-4">
              <p class="text-[11px] uppercase tracking-wider text-ink-subtle font-semibold mb-2">
                Tentativas desta reserva ({{ attempts.length }})
              </p>
              <ul class="space-y-2">
                <li v-for="(a, idx) in attempts" :key="a.id"
                  class="rounded-lg border p-2.5 flex items-center gap-3"
                  :class="a.id === live?.id ? 'border-accent/50 bg-accent/5' : 'border-line bg-surface-sunken/40'">
                  <div class="shrink-0 h-7 w-7 rounded-full grid place-items-center bg-ink/5 text-ink-muted font-semibold text-[11px]">
                    {{ idx + 1 }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                        :class="outcomeChipClass(attemptOutcome(a).variant)">
                        <i :class="attemptOutcome(a).icon"></i> {{ attemptOutcome(a).label }}
                      </span>
                      <span v-if="a.id === live?.id" class="text-[9px] uppercase tracking-wider font-bold text-accent">aberto</span>
                      <span class="text-[10px] text-ink-subtle font-mono">#{{ a.id }}</span>
                    </div>
                    <p class="text-[11px] text-ink-muted mt-0.5 truncate">
                      {{ formatCurrency(a.valor) }} · venc {{ formatDate(a.vencimento) }}
                      <span v-if="a.nosso_numero" class="font-mono"> · Nº {{ a.nosso_numero }}</span>
                    </p>
                  </div>
                  <div class="shrink-0 text-right">
                    <p class="text-[10px] text-ink-subtle font-mono">{{ formatDateTime(a.created_at || a.createdAt) }}</p>
                    <a v-if="a.boleto_supabase_url" :href="a.boleto_supabase_url" target="_blank"
                      class="text-[10px] text-accent hover:underline inline-flex items-center gap-1 mt-0.5">
                      <i class="fas fa-file-pdf"></i> PDF
                    </a>
                  </div>
                </li>
              </ul>
              <p class="text-[11px] uppercase tracking-wider text-ink-subtle font-semibold mt-4 pt-3 border-t border-line/60">
                Linha do tempo completa
              </p>
            </div>

            <!-- Eventos consolidados de TODAS as tentativas, em ordem cronológica -->
            <div v-if="!enrichedTimeline.length" class="text-center py-12 text-ink-subtle">
              <i class="fas fa-inbox text-3xl mb-2"></i>
              <p class="text-sm">Nenhum evento registrado ainda.</p>
              <p class="text-xs mt-1">Boletos antigos só registraram a emissão.</p>
            </div>
            <ul v-else class="space-y-3">
              <li v-for="ev in enrichedTimeline" :key="ev.id"
                class="flex items-start gap-3 pb-3 border-b border-line/40 last:border-b-0"
                :class="ev._virtual ? 'bg-blue-500/5 border border-dashed border-blue-500/30 rounded-lg p-3' : ''">
                <div class="h-8 w-8 rounded-full grid place-items-center shrink-0"
                  :class="ev._virtual ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : eventIconBg(ev.severity)">
                  <i :class="eventIcon(ev.type, ev.severity)" class="text-sm"
                    :style="ev._virtual ? 'animation: pulse 2s ease-in-out infinite' : ''"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2 mb-0.5">
                    <p class="text-xs font-semibold"
                      :class="ev._virtual ? 'text-blue-700 dark:text-blue-300' : 'text-ink'">
                      {{ eventTitle(ev.type) }}
                      <span v-if="ev._virtual" class="ml-1 text-[9px] uppercase tracking-wider font-bold">⏳ pendente</span>
                    </p>
                    <span class="text-[10px] text-ink-subtle font-mono whitespace-nowrap">
                      {{ formatDateTime(ev.created_at || ev.createdAt) }}
                    </span>
                  </div>
                  <span v-if="hasMultipleAttempts && eventAttempt(ev)"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold mb-1 bg-ink/5 text-ink-muted border border-line">
                    <i class="fas fa-hashtag"></i> Tentativa {{ eventAttempt(ev).ordem }}
                    <span v-if="eventAttempt(ev).id === live?.id" class="text-accent">· aberto</span>
                  </span>
                  <p v-if="ev.message" class="text-xs text-ink-muted leading-snug">{{ ev.message }}</p>
                  <details v-if="ev.data" class="text-[10px] text-ink-subtle mt-1">
                    <summary class="cursor-pointer hover:text-ink-muted">dados técnicos</summary>
                    <pre class="bg-surface-sunken border border-line rounded p-2 mt-1 overflow-x-auto">{{ JSON.stringify(ev.data, null, 2) }}</pre>
                  </details>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- ── TAB: PDF ───────────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'pdf'">
          <div v-if="!live?.boleto_supabase_url" class="text-center py-16 text-ink-subtle">
            <i class="fas fa-file-circle-xmark text-3xl mb-2"></i>
            <p class="text-sm">PDF não disponível.</p>
            <p class="text-xs mt-1">{{ live?.status === 'error' ? 'Boleto não chegou a ser emitido.' : 'O arquivo pode ter sido removido pelo cleanup automático após o vencimento.' }}</p>
          </div>
          <div v-else class="space-y-3">
            <div class="rounded-lg overflow-hidden border border-line bg-surface-sunken">
              <iframe :src="live.boleto_supabase_url + '#toolbar=0'"
                class="w-full" style="height: 60vh; min-height: 400px;"
                title="Boleto PDF"></iframe>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <a :href="live.boleto_supabase_url" target="_blank"
                class="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90">
                <i class="fas fa-download"></i> Baixar PDF
              </a>
              <Button variant="ghost" size="sm" icon="fas fa-copy" @click="copyLink">
                Copiar link
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Footer: Ações ────────────────────────────────────────────────── -->
      <div class="border-t border-line p-4 bg-surface-sunken/30 flex flex-wrap items-center justify-between gap-2">
        <p class="text-[11px] text-ink-subtle">
          Histórico interno #{{ live?.id }}
        </p>
        <div class="flex items-center gap-2 flex-wrap">
          <Button v-if="isAdmin && live?.boleto_supabase_url"
            variant="ghost" size="sm" icon="fas fa-paper-plane"
            :loading="actionState.resending" :disabled="actionState.resending"
            @click="handleResend">
            Reenviar ao cliente
          </Button>
          <Button v-if="isAdmin && (live?.status === 'error' || (live?.status === 'success' && ['pending', 'cancelled'].includes(live?.payment_status)))"
            variant="ghost" size="sm" icon="fas fa-rotate-right"
            :loading="actionState.retrying" :disabled="actionState.retrying"
            @click="handleRetry">
            {{ live?.status === 'error'
                ? 'Reprocessar'
                : (live?.payment_status === 'pending' ? 'Reemitir (condição atual)' : 'Gerar novo boleto') }}
          </Button>
          <Button v-if="isAdmin && live?.status === 'success' && live?.payment_status === 'pending'"
            variant="primary" size="sm" icon="fas fa-magnifying-glass-dollar"
            :loading="actionState.checking" :disabled="actionState.checking"
            @click="handleCheckPayment">
            Verificar pagamento
          </Button>
          <Button variant="ghost" size="sm" @click="close">Fechar</Button>
        </div>
      </div>
    </div>
  </div>
</template>
