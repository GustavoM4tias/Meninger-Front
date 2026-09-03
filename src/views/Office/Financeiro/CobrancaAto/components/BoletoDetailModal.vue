<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';

import Button from '@/components/UI/Button.vue';
import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import { pedirConfirmacao } from '@/composables/useConfirm';

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
});
const emit = defineEmits(['close', 'changed']);

const store = useBoletoStore();

// `live` é a versão SEMPRE atual do item: cruza o prop (referência inicial)
// com `store.history` (re-buscado após ações). Assim o modal não precisa
// recarregar pra mostrar dados frescos — basta o store atualizar.
const live = computed(() => {
  if (!props.item) return null;
  const fromStore = store.history.find(h => h.id === props.item.id);
  return fromStore || props.item;
});

// Link direto pra reserva no CV CRM (aba administrar).
const cvLink = computed(() => {
  if (!live.value?.idreserva) return null;
  return `https://menin.cvcrm.com.br/gestor/comercial/reservas/${live.value.idreserva}/administrar#index_condicao_pagamento`;
});

const activeTab = ref('summary');
const tabOptions = [
  { value: 'summary',  label: 'Resumo',   icon: 'fas fa-circle-info' },
  { value: 'timeline', label: 'Histórico', icon: 'fas fa-timeline' },
  { value: 'pdf',      label: 'PDF',      icon: 'fas fa-file-pdf' },
];

// Estado das ações — declarado ANTES do watch abaixo (que roda immediate no
// setup e zera essas refs; se ficassem depois, dava TDZ "before initialization").
const actionState = ref({ resending: false, retrying: false, checking: false, marking: false });
const actionMsg = ref(null);
const resendConfirm = ref({ open: false, loading: false, error: null, contact: null, sending: false });

// ── Polling reativo (após ações assíncronas que rodam em background) ────────
// Quando o admin dispara "Verificar pagamento", o backend retorna 202 e segue
// processando no Playwright (8-20s). Em vez de exigir refresh manual, polamos
// store + timeline em intervalos crescentes até o payment_status mudar ou
// estourar o tempo máximo.
// (Também precisa vir antes do watch immediate — stopPolling é chamado nele.)
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
        store.fetchTimeline(props.item.id, { silent: true }, props.item.idreserva),
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
    resendConfirm.value.open = false;
    // Limpa IMEDIATAMENTE o estado do boleto anterior, antes do fetch async.
    store.timelineEvents = [];
    store.timelineHistory = null;
    store.timelineAttempts = [];
    await store.fetchTimeline(id, {}, props.item?.idreserva ?? live.value?.idreserva);
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
  resendConfirm.value.open = false;
  emit('close');
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
  // Mais recente primeiro: numa reserva com várias tentativas a lista fica
  // longa, e o que interessa (o que acabou de acontecer) ficava lá no fim,
  // exigindo rolar tudo. O item virtual de situação agendada é sempre o mais
  // futuro, então naturalmente encabeça a lista.
  return events.sort((a, b) => {
    const ta = new Date(a.created_at).getTime() || 0;
    const tb = new Date(b.created_at).getTime() || 0;
    if (tb !== ta) return tb - ta;
    return (Number(b.id) || 0) - (Number(a.id) || 0); // desempate estável
  });
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
  if (a.status === 'skipped') return { label: 'Ignorado', variant: 'neutral', icon: 'fas fa-forward' };
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
    success: 'bg-data-pos/15 text-data-pos border border-data-pos/30',
    danger:  'bg-data-neg/15 text-data-neg border border-data-neg/30',
    warning: 'bg-data-warn/15 text-data-warn border border-data-warn/30',
    info:    'bg-accent/15 text-accent border border-accent/30',
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
  return ({ processing: 'Processando', success: 'Sucesso', error: 'Erro', skipped: 'Ignorado', queued: 'Agendado' })[s] || s;
}
/* Cor do banner pelo desfecho do boleto. Gradiente montado a partir dos TOKENS
   de estado - o desenho é o mesmo do detalhe de Pré-Cadastros e Reservas, mas a
   cor vem do sistema em vez de um `from-data-pos` escrito à mão. */
const bannerCor = computed(() => {
  const st = live.value?.status;
  const pg = live.value?.payment_status;
  if (st === 'error') return 'bg-gradient-to-br from-data-neg to-data-neg/70';
  if (pg === 'paid') return 'bg-gradient-to-br from-data-pos to-data-pos/70';
  if (pg === 'cancelled') return 'bg-gradient-to-br from-data-neutral to-data-neutral/70';
  if (st === 'success') return 'bg-gradient-to-br from-accent to-accent/70';
  return 'bg-gradient-to-br from-data-warn to-data-warn/70';
});

function statusVariant(s) {
  return ({ processing: 'info', success: 'success', error: 'danger', skipped: 'neutral', queued: 'warning' })[s] || 'neutral';
}
function paymentLabel(s) {
  return ({ pending: 'Pendente', paid: 'Pago', cancelled: 'Baixado', error: 'Erro' })[s] || s;
}
function paymentBadgeClass(s) {
  return ({
    pending:   'bg-ink/5 text-ink-muted border border-line',
    paid:      'bg-data-pos/15 text-data-pos border border-data-pos/30',
    cancelled: 'bg-data-neg/15 text-data-neg border border-data-neg/30',
    error:     'bg-data-warn/15 text-data-warn border border-data-warn/30',
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
  emission_deferred:        'Fora do horário - emissão agendada',
  emission_window_released: 'Horário aberto - emissão retomada',
  emission_retry_scheduled: 'Portal indisponível - nova tentativa agendada',
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
  emission_deferred:'fas fa-clock',
  emission_window_released:'fas fa-door-open',
  emission_retry_scheduled:'fas fa-rotate-right',
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
    success: 'bg-data-pos/15 text-data-pos',
    warning: 'bg-data-warn/15 text-data-warn',
    error:   'bg-data-neg/15 text-data-neg',
    info:    'bg-accent/15 text-accent',
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
// (refs actionState/actionMsg/resendConfirm declaradas no topo, antes do watch)

// ── Reenvio ao cliente (com confirmação mostrando e-mail + telefone) ─────────
// Antes era um confirm() cego. Agora abre um modal que busca o contato do titular
// (ao vivo do CV) e mostra pra quem vai + quando foi o último envio, evitando
// reenvios duplicados por insegurança.
async function openResendConfirm() {
  if (!live.value) return;
  actionMsg.value = null;
  resendConfirm.value = { open: true, loading: true, error: null, contact: null, sending: false };
  const res = await store.fetchTitularContact(live.value.id);
  if (res.ok) resendConfirm.value.contact = res.data;
  else resendConfirm.value.error = res.error;
  resendConfirm.value.loading = false;
}

function closeResendConfirm() {
  if (resendConfirm.value.sending) return; // não fecha no meio do envio
  resendConfirm.value.open = false;
}

async function doResend() {
  const alvo = live.value;   // mesmo motivo do handleRetry
  if (!alvo || resendConfirm.value.sending) return;
  resendConfirm.value.sending = true;
  actionState.value.resending = true;
  try {
    const res = await store.resendHistoryItem(alvo.id, alvo);
    if (res.ok) {
      const e = res.data?.email; const w = res.data?.whatsapp;
      const msgE = e?.ok ? `✓ E-mail enviado pra ${e.to}` : `✗ E-mail: ${e?.error || 'não enviado'}`;
      const msgW = w?.ok ? `✓ WhatsApp enviado pra ${w.to}` : `✗ WhatsApp: ${w?.error || 'não enviado'}`;
      actionMsg.value = { variant: 'success', text: `Reenvio concluído. ${msgE} / ${msgW}` };
      resendConfirm.value.open = false;
      await Promise.all([
        store.fetchHistory({ silent: true }),
        store.fetchTimeline(alvo.id, { silent: true }, alvo.idreserva),
      ]);
      emit('changed');
    } else {
      resendConfirm.value.error = res.error || 'erro desconhecido';
    }
  } finally {
    resendConfirm.value.sending = false;
    actionState.value.resending = false;
  }
}

// Formata E.164 BR (55DDDNNNNNNNN) pra exibição: +55 (11) 99999-8888
function formatPhoneBr(e164) {
  if (!e164) return null;
  const d = String(e164).replace(/\D/g, '');
  const nat = d.startsWith('55') ? d.slice(2) : d;
  if (nat.length === 11) return `+55 (${nat.slice(0, 2)}) ${nat.slice(2, 7)}-${nat.slice(7)}`;
  if (nat.length === 10) return `+55 (${nat.slice(0, 2)}) ${nat.slice(2, 6)}-${nat.slice(6)}`;
  return `+${d}`;
}

async function handleRetry() {
  // Congela o alvo ANTES de perguntar.
  //
  // `live` sai de props.item, e o await da confirmação é uma janela larga: a
  // lista recarrega, o modal fecha, e `live.value` vira null no meio do
  // caminho. Era o "Cannot read properties of null (reading 'id')" que a
  // reemissão jogava no console - e acontecia sempre, porque o diálogo
  // aparecia ATRÁS deste modal e a pessoa clicava aqui tentando achá-lo,
  // fechando o modal e zerando o item.
  const alvo = live.value;
  if (!alvo) return;
  // Reemissão manual pelo modal: emite e ENVIA ao cliente, sem mexer na etapa do
  // CV.
  //   • pending   → se a condição do RPV mudou, baixa o boleto atual e emite o
  //                 atualizado; se nada mudou, backend não faz nada.
  //   • cancelled → boleto anterior já baixado; só emite um novo.
  //   • error     → reprocessamento normal (fluxo completo do webhook).
  const isPending = alvo.status === 'success' && alvo.payment_status === 'pending';
  const isCancelled = alvo.status === 'success' && alvo.payment_status === 'cancelled';
  const isRegenerate = isPending || isCancelled;

  let pergunta;
  if (isPending) {
    pergunta = {
      title: 'Reemitir este boleto, que ainda esta em aberto?',
      consequence: 'Se a condicao do Recurso Proprio a Vista mudou, o boleto atual e baixado no Ecobranca e um novo vai para o cliente com a condicao de hoje.',
      hint: 'Se nada mudou, nada acontece.',
      confirmLabel: 'Reemitir boleto',
    };
  } else if (isCancelled) {
    pergunta = {
      title: 'Gerar um novo boleto para esta reserva?',
      consequence: 'O novo boleto sai com as condicoes atuais da serie e e enviado ao cliente.',
      hint: 'O boleto anterior desta reserva ja foi baixado.',
      confirmLabel: 'Gerar e enviar',
    };
  } else {
    pergunta = {
      title: `Re-disparar a emissao do boleto da reserva ${alvo.idreserva}?`,
      consequence: 'Refaz o fluxo completo de emissao e envia o boleto ao cliente.',
      confirmLabel: 'Re-disparar',
    };
  }
  if (!await pedirConfirmacao({ ...pergunta, tone: 'accent' })) return;

  actionState.value.retrying = true;
  try {
    const ok = isRegenerate
      ? await store.regenerateHistoryItem(alvo.id, alvo)
      : await store.retryHistoryItem(alvo.id, alvo);
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

// Marca um boleto pendente como baixado manualmente — para quando a baixa
// automática no Ecobrança falha e o admin já baixou o título no portal. Depois
// disso, "Gerar novo boleto" emite a nova via sem tentar a baixa automática.
async function handleMarkCancelled() {
  const alvo = live.value;   // mesmo motivo do handleRetry
  if (!alvo) return;
  if (!await pedirConfirmacao({
    title: 'Marcar como baixado no sistema?',
    consequence: `Isto NAO baixa o boleto no Ecobranca. Se o titulo ${alvo.nosso_numero || ''} ainda estiver ativo la, o cliente fica com dois boletos em aberto.`,
    hint: 'So confirme se voce ja baixou o titulo direto no portal do Ecobranca.',
    confirmLabel: 'Ja baixei, marcar como cancelado',
  })) return;
  actionState.value.marking = true;
  actionMsg.value = null;
  try {
    const res = await store.markCancelled(alvo.id, alvo);
    if (res.ok) {
      actionMsg.value = { variant: 'success', text: 'Marcado como baixado. Agora use "Gerar novo boleto" para emitir a nova via.' };
      await Promise.all([
        store.fetchHistory({ silent: true }),
        store.fetchTimeline(alvo.id, { silent: true }, alvo.idreserva),
      ]);
      emit('changed');
    } else {
      actionMsg.value = { variant: 'error', text: `Falha: ${res.error || 'erro desconhecido'}` };
    }
  } finally {
    actionState.value.marking = false;
  }
}

async function handleCheckPayment() {
  const alvo = live.value;   // mesmo motivo do handleRetry
  if (!alvo) return;
  if (!await pedirConfirmacao({
    title: 'Verificar o pagamento agora, sem esperar as 8h?',
    consequence: 'Consulta o Ecobranca na hora e atualiza a situacao deste boleto. Nada e enviado ao cliente.',
    tone: 'accent',
    confirmLabel: 'Verificar agora',
  })) return;
  actionState.value.checking = true;
  try {
    const r = await store.triggerPaymentCheck(alvo.id, alvo);
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
  <!-- Era um modal montado na mão: backdrop, caixa e altura próprios. Virou o
       primitivo, que já traz tela cheia no celular, fecha no Esc, prende o
       scroll do fundo e fica na camada de diálogo. `xl` porque isto é o
       registro inteiro, com abas. -->
  <!-- Mesma casca do detalhe de Pré-Cadastros e Reservas: `hide-close` com o
       cabeçalho do primitivo vazio, e a identidade do registro vira o primeiro
       bloco do corpo, com o X dentro dele. Assim existe UM botão de fechar, e
       a rolagem é do corpo, não do modal. -->
  <Modal :open="open" size="xl" hide-close @close="close">
    <template #header><div class="hidden"></div></template>

    <div class="-m-4 sm:-m-5">

      <!-- Banner de identidade: mesma forma do detalhe de Pré-Cadastros e
           Reservas (faixa colorida pelo estado, texto branco, título grande e
           o X dentro dela). A diferença é que aqui a cor vem dos TOKENS de
           estado, não de um gradiente escrito à mão - o desenho é o mesmo, a
           fonte da cor é a do sistema. -->
      <div class="relative text-white px-5 sm:px-6 pt-5 pb-4 overflow-hidden" :class="bannerCor">
        <div class="pointer-events-none absolute inset-0 opacity-30"
          style="background-image:radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 18px 18px;"></div>

        <div class="relative flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-2">
              <span v-if="live?.status"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro font-medium
                       bg-surface-raised/20 border border-white/20 text-white">
                <i :class="live.status === 'success' ? 'fas fa-check' : live.status === 'error' ? 'fas fa-xmark' : 'fas fa-spinner fa-spin'"></i>
                {{ statusLabel(live.status) }}
              </span>
              <span v-if="live?.payment_status"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro font-medium
                       bg-surface-raised/20 border border-white/20 text-white">
                <i :class="paymentIcon(live.payment_status)"></i>
                {{ paymentLabel(live.payment_status) }}
              </span>
              <span class="text-micro text-white/70 font-mono tabular-nums">#{{ live?.idreserva }}</span>
            </div>

            <h2 class="text-xl sm:text-2xl font-semibold leading-tight tracking-tight break-words">
              {{ live?.titular_nome || '-' }}
            </h2>
            <p class="text-xs text-white/70 mt-1">
              {{ live?.empreendimento || 'Sem empreendimento' }}
            </p>
            <p v-if="live?.nosso_numero" class="text-micro text-white/70 mt-1 font-mono tabular-nums">
              Nosso nº {{ live.nosso_numero }} · vence {{ formatDate(live?.vencimento) }} ·
              {{ formatCurrency(live?.valor) }}
            </p>

            <!-- Situação do CV ainda pendente: conta quanto falta para o lote. -->
            <p v-if="situacaoPendenteInfo" class="text-micro text-white/80 mt-2">
              <i class="fas fa-hourglass-half mr-1"></i>
              Situação {{ situacaoPendenteInfo.situacaoId }} em {{ situacaoPendenteInfo.label }}
            </p>

            <div v-if="cvLink" class="mt-4">
              <a :href="cvLink" target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                       bg-surface-raised/15 hover:bg-surface-raised/30 border border-white/20
                       text-white text-xs font-medium transition-all hover:-translate-y-0.5">
                <i class="fas fa-arrow-up-right-from-square text-micro"></i>
                Abrir a reserva no CV
              </a>
            </div>
          </div>

          <button @click="close" aria-label="Fechar"
            class="h-10 w-10 grid place-items-center rounded-lg shrink-0
                   bg-surface-raised/15 hover:bg-surface-raised/25 text-white
                   transition-colors duration-120">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- ── Tabs ─────────────────────────────────────────────────────────── -->
      <div class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/40">
        <SegmentedControl v-model="activeTab" :options="tabOptions" size="sm" />
      </div>

      <!-- ── Action feedback inline ───────────────────────────────────────── -->
      <div v-if="actionMsg" class="px-4 sm:px-5 pt-3">
        <div class="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
          :class="{
            'bg-data-pos/10 text-data-pos border border-data-pos/20': actionMsg.variant === 'success',
            'bg-data-neg/10 text-data-neg border border-data-neg/20':               actionMsg.variant === 'error',
            'bg-data-warn/10 text-data-warn border border-data-warn/20':       actionMsg.variant === 'warning',
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
      <div class="p-4 sm:p-5 max-h-[60vh] overflow-y-auto">

        <!-- ── TAB: RESUMO ────────────────────────────────────────────────── -->
        <div v-if="activeTab === 'summary'" class="space-y-4">
          <!-- Grid: dados principais -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-lg border border-line bg-surface-sunken/40 p-3">
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold mb-1">Valor</p>
              <p class="text-xl font-bold text-ink font-mono tabular-nums">{{ formatCurrency(live?.valor) }}</p>
              <!-- A conta que gerou o valor: o ato cheio, quanto dele era
                   comissão da imobiliária, e o que sobrou para cobrar. -->
              <p v-if="live?.valor_original && Number(live.valor_original) !== Number(live.valor)"
                class="text-ink-subtle mt-1">
                Ato: {{ formatCurrency(live.valor_original) }} ·
                <template v-if="live.comissao_valor_deduzida != null">
                  comissão fora do contrato {{ formatCurrency(live.comissao_valor_deduzida) }}
                </template>
                <template v-else>
                  comissão {{ live.comissao_percentual_aplicada }}%
                </template>
              </p>
            </div>
            <div class="rounded-lg border border-line bg-surface-sunken/40 p-3">
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold mb-1">Vencimento</p>
              <p class="text-xl font-bold text-ink font-mono tabular-nums">{{ formatDate(live?.vencimento) }}</p>
            </div>
          </div>

          <!-- Detalhes em tabela compacta -->
          <div class="rounded-lg border border-line overflow-hidden">
            <table class="w-full text-sm">
              <tbody>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle w-[35%]">Titular</td>
                  <td class="px-3 py-2 text-ink">{{ live?.titular_nome || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle">Empreendimento</td>
                  <td class="px-3 py-2 text-ink">{{ live?.empreendimento || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle">Nosso Número</td>
                  <td class="px-3 py-2 text-ink font-mono">{{ live?.nosso_numero || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle">Nº Documento</td>
                  <td class="px-3 py-2 text-ink font-mono">{{ live?.seu_numero || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle">CNPJ Empresa</td>
                  <td class="px-3 py-2 text-ink font-mono text-xs">{{ live?.cnpj_empresa || '—' }}</td>
                </tr>
                <tr class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle">Emitido em</td>
                  <td class="px-3 py-2 text-xs">{{ formatDateTime(live?.createdAt || live?.created_at) }}</td>
                </tr>
                <tr v-if="live?.last_checked_at" class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle">Última verificação</td>
                  <td class="px-3 py-2 text-xs">
                    {{ formatDateTime(live.last_checked_at) }}
                    <span v-if="live.last_check_situation" class="ml-2 text-ink">· {{ live.last_check_situation }}</span>
                  </td>
                </tr>
                <tr v-if="live?.paid_at" class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle">Pago em</td>
                  <td class="px-3 py-2 text-xs font-semibold">{{ formatDateTime(live.paid_at) }}</td>
                </tr>
                <tr v-if="live?.cancelled_at" class="border-b border-line/60">
                  <td class="px-3 py-2 text-ink-subtle">Baixado em</td>
                  <td class="px-3 py-2 text-xs font-semibold">{{ formatDateTime(live.cancelled_at) }}</td>
                </tr>
                <tr v-if="live?.idtransacao">
                  <td class="px-3 py-2 text-ink-subtle">ID Transação CV</td>
                  <td class="px-3 py-2 text-ink-muted font-mono text-xs">{{ live.idtransacao }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Erro de emissão (quando aplicável) -->
          <div v-if="live?.status === 'error' && live?.error_message"
            class="rounded-lg border border-data-neg/30 bg-data-neg/5 p-3">
            <p class="text-xs font-semibold text-data-neg mb-1 flex items-center gap-1.5">
              <i class="fas fa-circle-exclamation"></i> Erro na emissão
            </p>
            <p class="text-data-neg break-words">{{ live.error_message }}</p>
          </div>

          <!-- Notificações: checklist -->
          <div>
            <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold mb-2">
              Status das notificações
            </p>
            <ul class="space-y-1.5 text-sm">
              <li class="flex items-start gap-2">
                <i :class="live?.cv_documento_anexado ? 'fas fa-circle-check text-data-pos' : 'fas fa-circle-xmark text-data-neg'"></i>
                <span class="text-ink">
                  <strong>Anexo no CV:</strong>
                  {{ live?.cv_documento_anexado ? 'OK' : (warningsList(live).find(w => w.etapa === 'cv_anexo')?.erro || 'não anexado') }}
                </span>
              </li>
              <li class="flex items-start gap-2">
                <i :class="
                  live?.cv_situacao_alterada
                    ? 'fas fa-circle-check text-data-pos'
                    : (situacaoPendenteInfo
                      ? 'fas fa-hourglass-half text-accent'
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
                <i :class="live?.cv_mensagem_enviada ? 'fas fa-circle-check text-data-pos' : 'fas fa-circle-xmark text-data-neg'"></i>
                <span class="text-ink"><strong>Mensagem no CV:</strong> {{ live?.cv_mensagem_enviada ? 'OK' : 'não enviada' }}</span>
              </li>
              <li class="flex items-start gap-2">
                <i :class="live?.cliente_email_enviado ? 'fas fa-circle-check text-data-pos' : 'fas fa-circle-minus text-ink-subtle'"></i>
                <span class="text-ink">
                  <strong>E-mail cliente:</strong>
                  {{ live?.cliente_email_enviado ? 'enviado' : (warningsList(live).find(w => w.etapa === 'cliente_email')?.erro || 'não enviado') }}
                </span>
              </li>
              <li class="flex items-start gap-2">
                <i :class="live?.cliente_whatsapp_enviado ? 'fas fa-circle-check text-data-pos' : 'fas fa-circle-minus text-ink-subtle'"></i>
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
          <div v-else-if="store.timelineError" class="text-data-neg py-3">
            <i class="fas fa-circle-exclamation"></i> {{ store.timelineError }}
          </div>
          <div v-else>
            <!-- Tentativas desta reserva — histórico consolidado num só lugar -->
            <div v-if="attempts.length" class="mb-4">
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold mb-2">
                Tentativas desta reserva ({{ attempts.length }})
              </p>
              <ul class="space-y-2">
                <li v-for="(a, idx) in attempts" :key="a.id"
                  class="rounded-lg border p-2.5 flex items-center gap-3"
                  :class="a.id === live?.id ? 'border-accent/50 bg-accent/5' : 'border-line bg-surface-sunken/40'">
                  <div class="shrink-0 h-7 w-7 rounded-full grid place-items-center bg-ink/5 text-ink-muted font-semibold text-micro">
                    {{ idx + 1 }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-micro font-semibold"
                        :class="outcomeChipClass(attemptOutcome(a).variant)">
                        <i :class="attemptOutcome(a).icon"></i> {{ attemptOutcome(a).label }}
                      </span>
                      <span v-if="a.id === live?.id" class="text-micro uppercase tracking-wider font-bold text-accent">aberto</span>
                      <span class="text-ink-subtle font-mono">#{{ a.id }}</span>
                    </div>
                    <p class="text-micro text-ink-muted mt-0.5 truncate">
                      {{ formatCurrency(a.valor) }} · venc {{ formatDate(a.vencimento) }}
                      <span v-if="a.nosso_numero" class="font-mono"> · Nº {{ a.nosso_numero }}</span>
                    </p>
                  </div>
                  <div class="shrink-0 text-right">
                    <p class="text-ink-subtle font-mono">{{ formatDateTime(a.created_at || a.createdAt) }}</p>
                    <a v-if="a.boleto_supabase_url" :href="a.boleto_supabase_url" target="_blank"
                      class="text-accent hover:underline inline-flex items-center gap-1 mt-0.5">
                      <i class="fas fa-file-pdf"></i> PDF
                    </a>
                  </div>
                </li>
              </ul>
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold mt-4 pt-3 border-t border-line/60">
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
                :class="ev._virtual ? 'bg-accent/5 border border-dashed border-accent/30 rounded-lg p-3' : ''">
                <div class="h-8 w-8 rounded-full grid place-items-center shrink-0"
                  :class="ev._virtual ? 'bg-accent/15 text-accent' : eventIconBg(ev.severity)">
                  <i :class="eventIcon(ev.type, ev.severity)" class="text-sm"
                    :style="ev._virtual ? 'animation: pulse 2s ease-in-out infinite' : ''"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2 mb-0.5">
                    <p class="text-xs font-semibold"
                      :class="ev._virtual ? 'text-accent' : 'text-ink'">
                      {{ eventTitle(ev.type) }}
                      <span v-if="ev._virtual" class="ml-1 text-micro uppercase tracking-wider font-bold">⏳ pendente</span>
                    </p>
                    <span class="text-ink-subtle font-mono whitespace-nowrap">
                      {{ formatDateTime(ev.created_at || ev.createdAt) }}
                    </span>
                  </div>
                  <span v-if="hasMultipleAttempts && eventAttempt(ev)"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-micro font-semibold mb-1 bg-ink/5 text-ink-muted border border-line">
                    <i class="fas fa-hashtag"></i> Tentativa {{ eventAttempt(ev).ordem }}
                    <span v-if="eventAttempt(ev).id === live?.id" class="text-accent">· aberto</span>
                  </span>
                  <p v-if="ev.message" class="text-ink-muted leading-snug">{{ ev.message }}</p>
                  <details v-if="ev.data" class="text-ink-subtle mt-1">
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

    </div>

    <!-- ── Ações do registro ────────────────────────────────────────────── -->
    <template #footer>
      <p class="text-ink-subtle mr-auto">
        Histórico interno #{{ live?.id }}
      </p>
          <Button v-if="live?.boleto_supabase_url"
            variant="ghost" size="sm" icon="fas fa-paper-plane"
            :disabled="actionState.resending"
            @click="openResendConfirm">
            Reenviar ao cliente
          </Button>
          <Button v-if="live?.status === 'error' || (live?.status === 'success' && ['pending', 'cancelled'].includes(live?.payment_status))"
            variant="ghost" size="sm" icon="fas fa-rotate-right"
            :loading="actionState.retrying" :disabled="actionState.retrying"
            @click="handleRetry">
            {{ live?.status === 'error'
                ? 'Reprocessar'
                : (live?.payment_status === 'pending' ? 'Reemitir (condição atual)' : 'Gerar novo boleto') }}
          </Button>
          <Button v-if="live?.status === 'success' && live?.payment_status === 'pending'"
            variant="ghost" size="sm" icon="fas fa-ban"
            :loading="actionState.marking" :disabled="actionState.marking"
            title="Use quando a baixa automática falhou e você já baixou o título no Ecobrança"
            @click="handleMarkCancelled">
            Marcar como baixado
          </Button>
          <Button v-if="live?.status === 'success' && live?.payment_status === 'pending'"
            variant="primary" size="sm" icon="fas fa-magnifying-glass-dollar"
            :loading="actionState.checking" :disabled="actionState.checking"
            @click="handleCheckPayment">
            Verificar pagamento
          </Button>
      <Button variant="ghost" size="sm" @click="close">Fechar</Button>
    </template>
  </Modal>

  <!-- Confirmação do reenvio. `zIndex` acima do diálogo de baixo: é um modal
       SOBRE outro, e o padrão do sistema é declarar isso, não empilhar z na
       mão. -->
  <Modal :open="resendConfirm.open" size="md" :z-index="10001"
    title="Reenviar boleto ao cliente"
    @close="closeResendConfirm">
        <div class="space-y-3">
          <div v-if="resendConfirm.loading" class="text-center py-6 text-ink-muted">
            <i class="fas fa-spinner fa-spin text-xl"></i>
            <p class="text-xs mt-2">Buscando contato do titular no CV…</p>
          </div>

          <div v-else-if="resendConfirm.error"
            class="rounded-lg bg-data-neg/10 border border-data-neg/20 px-3 py-2 text-data-neg">
            <i class="fas fa-circle-exclamation"></i> {{ resendConfirm.error }}
          </div>

          <template v-else-if="resendConfirm.contact">
            <p class="text-ink-muted">
              Confirme os dados de destino antes de enviar. O boleto será enviado para:
            </p>

            <!-- E-mail -->
            <div class="rounded-lg border border-line bg-surface-sunken/40 p-3 flex items-start gap-2.5">
              <i class="fas fa-envelope mt-0.5 w-4 text-center"
                :class="resendConfirm.contact.email ? 'text-data-pos' : 'text-ink-subtle'"></i>
              <div class="min-w-0 flex-1">
                <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold">E-mail</p>
                <p class="text-ink break-all">{{ resendConfirm.contact.email || 'sem e-mail válido no CV' }}</p>
              </div>
            </div>

            <!-- Telefone -->
            <div class="rounded-lg border border-line bg-surface-sunken/40 p-3 flex items-start gap-2.5">
              <i class="fab fa-whatsapp mt-0.5 w-4 text-center"
                :class="resendConfirm.contact.phone ? 'text-data-pos' : 'text-ink-subtle'"></i>
              <div class="min-w-0 flex-1">
                <p class="text-micro uppercase tracking-wider text-ink-subtle font-semibold">WhatsApp</p>
                <p class="text-ink">
                  {{ resendConfirm.contact.phone ? formatPhoneBr(resendConfirm.contact.phone) : 'sem telefone válido no CV' }}
                  <span v-if="resendConfirm.contact.phone_source" class="text-ink-subtle">
                    (campo {{ resendConfirm.contact.phone_source }})
                  </span>
                </p>
              </div>
            </div>

            <!-- Aviso: sem PDF -->
            <div v-if="!resendConfirm.contact.has_pdf"
              class="rounded-lg bg-data-warn/10 border border-data-warn/20 px-3 py-2 text-data-warn">
              <i class="fas fa-triangle-exclamation"></i> Este registro não tem PDF salvo — o reenvio pode falhar.
            </div>

            <!-- Aviso: nenhum canal -->
            <div v-if="!resendConfirm.contact.email && !resendConfirm.contact.phone"
              class="rounded-lg bg-data-neg/10 border border-data-neg/20 px-3 py-2 text-data-neg">
              <i class="fas fa-circle-exclamation"></i> Nenhum canal válido — não há para onde enviar. Corrija o cadastro no CV.
            </div>

            <!-- Último envio (reforço anti-duplicidade) -->
            <div v-if="resendConfirm.contact.cliente_envio_em"
              class="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2 text-accent">
              <i class="fas fa-clock-rotate-left"></i>
              Já foi enviado em <strong>{{ formatDateTime(resendConfirm.contact.cliente_envio_em) }}</strong>
              <span class="block mt-0.5 text-micro">
                <i :class="resendConfirm.contact.cliente_email_enviado ? 'fas fa-check text-data-pos' : 'fas fa-xmark text-ink-subtle'"></i> E-mail
                &nbsp;·&nbsp;
                <i :class="resendConfirm.contact.cliente_whatsapp_enviado ? 'fas fa-check text-data-pos' : 'fas fa-xmark text-ink-subtle'"></i> WhatsApp
              </span>
            </div>
            <p v-else class="text-micro text-ink-subtle">
              <i class="fas fa-circle-info"></i> Nenhum envio anterior registrado para este boleto.
            </p>
          </template>
        </div>

    <template #footer>
      <Button variant="ghost" :disabled="resendConfirm.sending" @click="closeResendConfirm">
        Cancelar
      </Button>
      <Button icon="fas fa-paper-plane"
        :loading="resendConfirm.sending"
        :disabled="resendConfirm.sending || resendConfirm.loading || !!resendConfirm.error
          || !resendConfirm.contact || (!resendConfirm.contact.email && !resendConfirm.contact.phone)"
        @click="doResend">
        {{ resendConfirm.sending ? 'Enviando…' : 'Confirmar envio' }}
      </Button>
    </template>
  </Modal>
</template>
