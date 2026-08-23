<template>
  <div class="max-w-3xl space-y-4">

    <!-- Carregando -->
    <div v-if="loading" class="flex items-center justify-center py-16 text-ink-subtle text-sm gap-2">
      <i class="fas fa-spinner fa-spin"></i> Carregando assinatura...
    </div>

    <template v-else>
      <!-- Integração não configurada -->
      <div v-if="!state.configured" class="panel-info">
        <i class="fas fa-plug-circle-xmark text-data-warn"></i>
        <div>
          <p class="font-semibold text-ink text-sm">Integração DocuSign não configurada</p>
          <p class="text-xs text-ink-muted mt-0.5">Um administrador precisa configurar as credenciais em <RouterLink to="/settings/docusign" class="text-accent underline">Configurações → DocuSign</RouterLink>.</p>
        </div>
      </div>

      <!-- Config de assinantes ausente/desativada -->
      <div v-else-if="!state.config?.enabled || !(state.config?.signers?.length)" class="panel-info">
        <i class="fas fa-users-slash text-data-warn"></i>
        <div>
          <p class="font-semibold text-ink text-sm">Assinantes não configurados</p>
          <p class="text-xs text-ink-muted mt-0.5">Ative a assinatura e defina quem assina em <RouterLink to="/comercial/conditions/settings" class="text-accent underline">Fichas → Configurações</RouterLink>.</p>
        </div>
      </div>

      <!-- Ficha ainda não autorizada -->
      <div v-else-if="detail.status !== 'approved' && !current" class="panel-info">
        <i class="fas fa-hourglass-half text-accent"></i>
        <div>
          <p class="font-semibold text-ink text-sm">Disponível após a autorização</p>
          <p class="text-xs text-ink-muted mt-0.5">A ficha precisa estar <strong>Autorizada</strong> para ser enviada à assinatura. Status atual: {{ detail.status }}.</p>
        </div>
      </div>

      <!-- Pronta para enviar (nunca enviada) -->
      <div v-else-if="!current">
        <div class="bg-surface-raised rounded-2xl border border-line shadow-sm p-6">
          <p class="text-sm font-bold text-ink mb-1"><i class="fas fa-file-signature text-accent mr-1.5"></i> Enviar para assinatura</p>
          <p class="text-xs text-ink-muted mb-4">
            O documento do Resumo será enviado via DocuSign para
            <strong>{{ (state.config?.signers ?? []).map(s => s.name).join(', ') }}</strong>
            ({{ state.config?.routing === 'parallel' ? 'todos assinam juntos' : 'assinam em sequência' }} ·
            {{ state.config?.placement === 'livre' ? 'posicionamento livre' : 'assinatura ao final' }}{{ state.config?.require_initials ? ' + rubrica' : '' }}).
          </p>
          <button v-if="canAuthorize" @click="send" :disabled="sending" class="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent disabled:opacity-50 transition">
            <i :class="sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'" class="fas text-xs"></i>
            {{ sending ? 'Enviando...' : 'Enviar para assinatura' }}
          </button>
          <p v-else class="text-xs text-ink-subtle italic">Somente autorizadores podem enviar para assinatura.</p>
        </div>
      </div>

      <!-- Envelope em andamento / concluído -->
      <template v-else>
        <div class="bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden">
          <div class="px-5 py-3.5 border-b border-line bg-surface-sunken flex items-center justify-between gap-3 flex-wrap">
            <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              <i class="fas fa-file-signature text-accent mr-1.5"></i> Processo de assinatura
            </p>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-sunken text-ink" :title="`${signedCount} de ${totalSigners} assinaram`">
                {{ signedCount }}/{{ totalSigners }} <i class="fas fa-signature text-micro"></i>
              </span>
              <span :class="statusChip(current.status)" class="px-2.5 py-1 rounded-full text-xs font-semibold">{{ statusLabel(current.status) }}</span>
              <button @click="openDocument('original')" :disabled="docLoading === 'original'" class="px-3 py-1.5 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 disabled:opacity-50 transition" title="Visualizar/baixar o documento original enviado">
                <i :class="docLoading === 'original' ? 'fa-spinner fa-spin' : 'fa-file-lines'" class="fas mr-1"></i> Original
              </button>
              <button @click="refresh" :disabled="refreshing" class="px-3 py-1.5 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 disabled:opacity-50 transition" title="Consultar status no DocuSign">
                <i :class="refreshing ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'" class="fas"></i>
              </button>
              <button v-if="canAuthorize && ['sent','delivered'].includes(current.status)" @click="resend()" :disabled="!!resending"
                class="px-3 py-1.5 text-xs font-semibold text-accent bg-accent/20 border border-accent/25 rounded-lg hover:bg-accent/10  disabled:opacity-50 transition"
                title="Reenviar o convite para todos que ainda podem assinar">
                <i :class="resending === 'all' ? 'fa-spinner fa-spin' : 'fa-paper-plane'" class="fas mr-1"></i> Reenviar
              </button>
              <button v-if="canAuthorize && ['sent','delivered'].includes(current.status)" @click="voidEnvelope" class="px-3 py-1.5 text-xs font-semibold text-data-neg bg-data-neg/20 border border-data-neg/25 rounded-lg hover:bg-data-neg/10 transition">
                <i class="fas fa-ban mr-1"></i> Anular
              </button>
            </div>
          </div>

          <div class="p-5 space-y-4">
            <p class="text-xs text-ink-subtle">
              <i class="fas fa-paper-plane text-micro mr-1"></i>1º envio: <strong class="text-ink-muted">{{ formatDate(current.sent_at) }}</strong>
              <template v-if="current.completed_at"> · <i class="fas fa-check text-micro"></i> concluído: <strong class="text-ink-muted">{{ formatDate(current.completed_at) }}</strong></template>
              <template v-else-if="!['voided','declined','error'].includes(current.status) && pendingNames.length"> · faltam: <strong class="text-data-warn">{{ pendingNames.join(', ') }}</strong></template>
            </p>

            <!-- Assinantes -->
            <div class="space-y-2">
              <div v-for="(sg, i) in (current.signers ?? [])" :key="i" class="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface-sunken/40 border border-line rounded-xl flex-wrap">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-ink truncate">
                    <i v-if="sg.status === 'completed'" class="fas fa-circle-check text-data-pos mr-1"></i>{{ sg.name }}
                  </p>
                  <p class="text-xs text-ink-subtle truncate">{{ sg.email }}</p>
                  <p class="text-micro text-ink-subtle mt-1 flex items-center gap-3 flex-wrap">
                    <span><i class="fas fa-paper-plane text-micro mr-1"></i>Enviado: {{ formatDate(sg.last_sent_at || current.sent_at) }}</span>
                    <span v-if="sg.delivered_at" :class="isStaleDelivery(sg) ? 'text-data-warn' : ''">
                      <i class="fas fa-envelope-open text-micro mr-1"></i>Recebeu: {{ formatDate(sg.delivered_at) }}{{ isStaleDelivery(sg) ? ' (antes do reenvio)' : '' }}
                    </span>
                    <span v-else class="text-ink-subtle"><i class="fas fa-envelope text-micro mr-1"></i>Ainda não abriu</span>
                    <span v-if="sg.signed_at" class="text-data-pos font-semibold">
                      <i class="fas fa-signature text-micro mr-1"></i>Assinou: {{ formatDate(sg.signed_at) }}
                    </span>
                  </p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span :class="signerChip(sg.status)" class="px-2 py-0.5 rounded-full text-micro font-semibold">{{ signerLabel(sg.status) }}</span>
                  <button v-if="canAuthorize && ['sent','delivered'].includes(current.status) && !['completed','declined'].includes(sg.status)"
                    @click="resend([sg.email])" :disabled="!!resending"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-accent hover:bg-accent/10  disabled:opacity-40 transition"
                    :title="`Reenviar convite para ${sg.email}`">
                    <i :class="resending === sg.email ? 'fa-spinner fa-spin' : 'fa-paper-plane'" class="fas text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Histórico do processo -->
            <div v-if="eventsList.length" class="border-t border-line pt-3">
              <button @click="showEvents = !showEvents" class="w-full flex items-center justify-between text-left">
                <p class="text-micro font-bold text-ink-subtle uppercase tracking-wider"><i class="fas fa-timeline mr-1.5"></i> Histórico do processo ({{ eventsList.length }})</p>
                <i :class="showEvents ? 'fa-chevron-up' : 'fa-chevron-down'" class="fas text-micro text-ink-subtle"></i>
              </button>
              <div v-if="showEvents" class="mt-3 space-y-2">
                <div v-for="(ev, i) in eventsList" :key="i" class="flex items-start gap-2.5 text-xs">
                  <i :class="eventIcon(ev.type)" class="fas mt-0.5 w-4 text-center flex-shrink-0" :style="{ color: eventColor(ev.type) }"></i>
                  <div class="min-w-0">
                    <span class="text-ink">{{ eventText(ev) }}</span>
                    <span class="text-ink-subtle ml-1">· {{ formatDate(ev.at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Anulado/recusado: histórico preservado acima + enviar de novo -->
        <div v-if="['voided','declined','error'].includes(current.status)" class="bg-surface-raised rounded-2xl border border-line shadow-sm p-5 flex items-center justify-between gap-3 flex-wrap">
          <p class="text-xs text-ink-muted">
            <i :class="current.status === 'voided' ? 'fa-ban' : 'fa-triangle-exclamation'" class="fas mr-1"></i>
            {{ current.status === 'voided' ? 'Envio anulado' : 'Envio recusado/falhou' }} — o histórico e o motivo continuam registrados acima e na linha do tempo da ficha.
          </p>
          <button v-if="canAuthorize && detail.status === 'approved'" @click="send" :disabled="sending"
            class="flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent disabled:opacity-50 transition">
            <i :class="sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'" class="fas text-xs"></i>
            {{ sending ? 'Enviando...' : 'Enviar novamente' }}
          </button>
        </div>

        <!-- Documento assinado (anexo) -->
        <div v-if="current.status === 'completed' && current.signed_doc_url" class="bg-surface-raised rounded-2xl border border-data-pos/25 shadow-sm overflow-hidden">
          <div class="px-5 py-3.5 border-b border-data-pos/25 bg-data-pos/10  flex items-center justify-between gap-3 flex-wrap">
            <p class="text-xs font-semibold text-data-pos uppercase tracking-wide">
              <i class="fas fa-file-circle-check mr-1.5"></i> Documento assinado
            </p>
            <a :href="current.signed_doc_url" target="_blank" rel="noopener" class="flex items-center gap-2 px-3.5 py-2 bg-data-pos text-white text-xs font-semibold rounded-lg hover:bg-data-pos/85 transition">
              <i class="fas fa-download text-xs"></i> Baixar PDF assinado
            </a>
          </div>
          <iframe :src="current.signed_doc_url" class="w-full bg-surface-raised" style="height: 560px; border: 0;" title="PDF assinado"></iframe>
        </div>

        <!-- Concluído + ficha reautorizada: nova rodada de assinatura -->
        <div v-if="current.status === 'completed' && canAuthorize && detail.status === 'approved'" class="bg-surface-raised rounded-2xl border border-line shadow-sm p-5 flex items-center justify-between gap-3 flex-wrap">
          <p class="text-xs text-ink-muted">
            <i class="fas fa-rotate mr-1"></i>
            Ficha alterada e reautorizada depois desta assinatura? Envie uma nova rodada — o documento assinado acima fica preservado nos envelopes anteriores.
          </p>
          <button @click="send" :disabled="sending"
            class="flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent disabled:opacity-50 transition">
            <i :class="sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'" class="fas text-xs"></i>
            {{ sending ? 'Enviando...' : 'Enviar nova assinatura' }}
          </button>
        </div>

        <!-- Envelopes anteriores (rodadas antigas ficam guardadas) -->
        <div v-if="previousEnvelopes.length" class="bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-line bg-surface-sunken">
            <p class="text-micro font-bold text-ink-subtle uppercase tracking-wider"><i class="fas fa-clock-rotate-left mr-1.5"></i> Envelopes anteriores ({{ previousEnvelopes.length }})</p>
          </div>
          <div class="divide-y divide-line">
            <div v-for="env in previousEnvelopes" :key="env.id" class="px-5 py-2.5 flex items-center justify-between gap-3 text-xs flex-wrap">
              <span class="text-ink-muted">
                Enviado {{ formatDate(env.sent_at) }}<template v-if="env.completed_at"> · concluído {{ formatDate(env.completed_at) }}</template>
              </span>
              <span class="flex items-center gap-2">
                <span :class="statusChip(env.status)" class="px-2 py-0.5 rounded-full text-micro font-semibold">{{ statusLabel(env.status) }}</span>
                <a v-if="env.signed_doc_url" :href="env.signed_doc_url" target="_blank" rel="noopener" class="text-data-pos font-semibold hover:underline">
                  <i class="fas fa-download mr-1"></i>PDF assinado
                </a>
              </span>
            </div>
          </div>
        </div>
      </template>

      <div v-if="info" class="px-3.5 py-2.5 rounded-lg text-xs bg-data-pos/20 border border-data-pos/25 text-data-pos">
        {{ info }}
      </div>
      <div v-if="error" class="px-3.5 py-2.5 rounded-lg text-xs bg-data-neg/20 border border-data-neg/25 text-data-neg">
        {{ error }}
      </div>
    </template>

    <ConfirmDialog v-model:open="anulando" tone="danger"
      title="Anular este envelope de assinatura?"
      consequence="Os links que os assinantes receberam param de funcionar na hora, inclusive os de quem ja assinou."
      hint="O motivo abaixo vai no aviso que a DocuSign manda para cada assinante."
      confirm-label="Anular envelope" ask-note
      note-label="Motivo da anulacao (enviado aos assinantes)"
      note-placeholder="Cancelado pelo emissor"
      @confirm="anularConfirmado" />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import API_URL from '@/config/apiUrl';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';

const props = defineProps({
    detail: { type: Object, required: true },
    canAuthorize: { type: Boolean, default: false },
    // Função async que devolve o HTML completo do documento (do SummaryExport).
    getDocumentHtml: { type: Function, default: null },
});
const emit = defineEmits(['changed']);

const store = useConditionsStore();

const loading = ref(true);
const sending = ref(false);
const refreshing = ref(false);
const resending = ref(null); // 'all' | email | null
const info = ref(null);
const error = ref(null);
const state = ref({ configured: false, config: null, current: null, history: [] });

const current = computed(() => state.value.current);

async function load() {
    loading.value = true;
    error.value = null;
    try {
        state.value = await store.fetchSignature(props.detail.id);
    } catch (e) {
        error.value = e.message || 'Erro ao carregar assinatura.';
    } finally {
        loading.value = false;
    }
}

async function send() {
    error.value = null;
    if (!props.getDocumentHtml) { error.value = 'Documento indisponível.'; return; }
    sending.value = true;
    try {
        const html = await props.getDocumentHtml();
        if (!html) throw new Error('Não foi possível montar o documento da ficha.');
        await store.sendSignature(props.detail.id, html);
        await load();
        emit('changed');
    } catch (e) {
        error.value = e.message || 'Erro ao enviar para assinatura.';
    } finally {
        sending.value = false;
    }
}

async function refresh() {
    refreshing.value = true;
    error.value = null;
    try {
        state.value.current = await store.refreshSignature(props.detail.id);
        emit('changed');
    } catch (e) {
        error.value = e.message || 'Erro ao atualizar status.';
    } finally {
        refreshing.value = false;
    }
}

// ── Progresso, entrega e histórico do processo ────────────────────────────────

const showEvents = ref(false);
const docLoading = ref(null);

const totalSigners = computed(() => (current.value?.signers ?? []).length);
const signedCount = computed(() => (current.value?.signers ?? []).filter(s => s.status === 'completed').length);
const pendingNames = computed(() =>
    (current.value?.signers ?? []).filter(s => s.status !== 'completed').map(s => s.name));

// Recebeu ANTES do último reenvio → ainda não abriu a versão reenviada.
function isStaleDelivery(sg) {
    return !!(sg.delivered_at && sg.last_sent_at && new Date(sg.delivered_at) < new Date(sg.last_sent_at));
}

const eventsList = computed(() => [...(current.value?.raw?.events ?? [])].reverse());

// Rodadas antigas de assinatura (ficam guardadas; a mais recente é a vigente).
const previousEnvelopes = computed(() =>
    (state.value.history ?? []).filter(h => h.id !== current.value?.id));

const EVENT_TYPES = {
    sent:      { icon: 'fa-paper-plane',   color: '#7c3aed', text: e => `Enviado para ${(e.emails ?? []).join(', ')}${e.by ? ` por ${e.by}` : ''}` },
    resent:    { icon: 'fa-paper-plane',   color: '#7c3aed', text: e => `Reenviado para ${(e.emails ?? []).join(', ')}${e.by ? ` por ${e.by}` : ''}` },
    delivered: { icon: 'fa-envelope-open', color: '#6366f1', text: e => `${e.name || e.email} recebeu/abriu o documento` },
    signed:    { icon: 'fa-signature',     color: '#16a34a', text: e => `${e.name || e.email} assinou` },
    declined:  { icon: 'fa-ban',           color: '#dc2626', text: e => `${e.name || e.email} recusou${e.note ? ` (${e.note})` : ''}` },
    completed: { icon: 'fa-circle-check',  color: '#16a34a', text: () => 'Todos assinaram - documento concluído' },
    voided:    { icon: 'fa-ban',           color: '#6b7280', text: e => `Envelope anulado${e.by ? ` por ${e.by}` : ''}${e.note ? ` (${e.note})` : ''}` },
};
function eventIcon(t)  { return EVENT_TYPES[t]?.icon ?? 'fa-circle'; }
function eventColor(t) { return EVENT_TYPES[t]?.color ?? '#9ca3af'; }
function eventText(ev) { return EVENT_TYPES[ev.type]?.text?.(ev) ?? ev.type; }

// Abre o documento: 'original' (via backend, autenticado) ou 'signed' (URL pública).
async function openDocument(type) {
    if (type === 'signed' && current.value?.signed_doc_url) {
        window.open(current.value.signed_doc_url, '_blank', 'noopener');
        return;
    }
    docLoading.value = type;
    error.value = null;
    try {
        const res = await fetch(`${API_URL}/conditions/${props.detail.id}/signature/document?type=${type}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        error.value = e.message || 'Erro ao abrir documento.';
    } finally {
        docLoading.value = null;
    }
}

// Reenvia o convite (emails=null → todos os elegíveis; [email] → só aquele).
async function resend(emails = null) {
    resending.value = emails?.length === 1 ? emails[0] : 'all';
    error.value = null;
    info.value = null;
    try {
        const r = await store.resendSignature(props.detail.id, emails);
        info.value = `Convite reenviado para: ${r.resent.join(', ')}`
            + (r.skipped?.length ? ` (sem reenvio: ${r.skipped.map(s => `${s.email} — ${signerLabel(s.status)}`).join(', ')})` : '');
        emit('changed');
    } catch (e) {
        error.value = e.message || 'Erro ao reenviar convite.';
    } finally {
        resending.value = null;
    }
}

/* Era um `prompt()` do navegador, que perguntava o motivo sem nunca dizer o
   que anular provoca: os links de TODO mundo morrem, inclusive de quem ja
   assinou. Agora a consequencia vem escrita antes do campo. */
const anulando = ref(false);

function voidEnvelope() { anulando.value = true; }

async function anularConfirmado(motivo) {
    anulando.value = false;
    error.value = null;
    try {
        await store.voidSignature(props.detail.id, motivo || 'Cancelado pelo emissor');
        await load();
        emit('changed');
    } catch (e) {
        error.value = e.message || 'Erro ao anular envelope.';
    }
}

const STATUS = {
    sent:      { label: 'Enviado',   chip: 'bg-accent/10 text-accent  ' },
    delivered: { label: 'Visualizado', chip: 'bg-accent/10 text-accent  ' },
    completed: { label: 'Assinado',  chip: 'bg-data-pos/10 text-data-pos  ' },
    declined:  { label: 'Recusado',  chip: 'bg-data-neg/10 text-data-neg  ' },
    voided:    { label: 'Anulado',   chip: 'bg-surface-sunken text-ink bg-surface-sunken text-ink-subtle' },
    error:     { label: 'Erro',      chip: 'bg-data-neg/10 text-data-neg  ' },
};
function statusLabel(s) { return STATUS[s]?.label ?? s; }
function statusChip(s)  { return STATUS[s]?.chip ?? 'bg-surface-sunken text-ink-muted'; }
function signerLabel(s) {
    return ({ created: 'Aguardando', sent: 'Enviado', delivered: 'Visualizou', completed: 'Assinou', declined: 'Recusou' })[s] ?? (s || '-');
}
function signerChip(s) {
    if (s === 'completed') return 'bg-data-pos/10 text-data-pos  ';
    if (s === 'declined')  return 'bg-data-neg/10 text-data-neg  ';
    if (s === 'delivered') return 'bg-accent/10 text-accent  ';
    return 'bg-surface-sunken text-ink-muted';
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

watch(() => props.detail?.id, () => { if (props.detail?.id) load(); });
onMounted(load);
</script>

<style scoped>
.panel-info { @apply flex items-start gap-3 px-4 py-4 bg-surface-raised border border-line rounded-2xl shadow-sm; }
.panel-info > i { @apply text-lg mt-0.5 flex-shrink-0; }
</style>
