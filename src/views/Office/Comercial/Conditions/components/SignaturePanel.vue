<template>
  <div class="max-w-3xl space-y-4">

    <!-- Carregando -->
    <div v-if="loading" class="flex items-center justify-center py-16 text-ink-subtle text-sm gap-2">
      <i class="fas fa-spinner fa-spin"></i> Carregando assinatura...
    </div>

    <template v-else>
      <!-- Integração não configurada -->
      <div v-if="!state.configured" class="panel-info">
        <i class="fas fa-plug-circle-xmark text-amber-500"></i>
        <div>
          <p class="font-semibold text-ink text-sm">Integração DocuSign não configurada</p>
          <p class="text-xs text-ink-muted mt-0.5">Um administrador precisa configurar as credenciais em <RouterLink to="/settings/docusign" class="text-accent underline">Configurações → DocuSign</RouterLink>.</p>
        </div>
      </div>

      <!-- Config de assinantes ausente/desativada -->
      <div v-else-if="!state.config?.enabled || !(state.config?.signers?.length)" class="panel-info">
        <i class="fas fa-users-slash text-amber-500"></i>
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

      <!-- Pronta para enviar -->
      <div v-else-if="!current || ['voided', 'declined', 'error'].includes(current.status)">
        <div v-if="current" class="panel-info mb-4">
          <i :class="current.status === 'voided' ? 'fa-ban text-ink-subtle' : 'fa-triangle-exclamation text-red-500'" class="fas"></i>
          <div>
            <p class="font-semibold text-ink text-sm">{{ current.status === 'voided' ? 'Envio anterior anulado' : 'Envio anterior recusado/falhou' }}</p>
            <p class="text-xs text-ink-muted mt-0.5">Você pode enviar novamente para assinatura.</p>
          </div>
        </div>
        <div class="bg-surface-raised rounded-2xl border border-line shadow-sm p-6">
          <p class="text-sm font-bold text-ink mb-1"><i class="fas fa-file-signature text-violet-500 mr-1.5"></i> Enviar para assinatura</p>
          <p class="text-xs text-ink-muted mb-4">
            O documento do Resumo será enviado via DocuSign para
            <strong>{{ (state.config?.signers ?? []).map(s => s.name).join(', ') }}</strong>
            ({{ state.config?.routing === 'parallel' ? 'todos assinam juntos' : 'assinam em sequência' }} ·
            {{ state.config?.placement === 'livre' ? 'posicionamento livre' : 'assinatura ao final' }}{{ state.config?.require_initials ? ' + rubrica' : '' }}).
          </p>
          <button v-if="canAuthorize" @click="send" :disabled="sending" class="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition">
            <i :class="sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'" class="fas text-xs"></i>
            {{ sending ? 'Enviando...' : 'Enviar para assinatura' }}
          </button>
          <p v-else class="text-xs text-ink-subtle italic">Somente autorizadores podem enviar para assinatura.</p>
        </div>
      </div>

      <!-- Envelope em andamento / concluído -->
      <template v-else>
        <div class="bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden">
          <div class="px-5 py-3.5 border-b border-line bg-gray-50/60 dark:bg-gray-800/40 flex items-center justify-between gap-3 flex-wrap">
            <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              <i class="fas fa-file-signature text-violet-500 mr-1.5"></i> Processo de assinatura
            </p>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-sunken text-ink" :title="`${signedCount} de ${totalSigners} assinaram`">
                {{ signedCount }}/{{ totalSigners }} <i class="fas fa-signature text-[10px]"></i>
              </span>
              <span :class="statusChip(current.status)" class="px-2.5 py-1 rounded-full text-xs font-semibold">{{ statusLabel(current.status) }}</span>
              <button @click="openDocument('original')" :disabled="docLoading === 'original'" class="px-3 py-1.5 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 disabled:opacity-50 transition" title="Visualizar/baixar o documento original enviado">
                <i :class="docLoading === 'original' ? 'fa-spinner fa-spin' : 'fa-file-lines'" class="fas mr-1"></i> Original
              </button>
              <button @click="refresh" :disabled="refreshing" class="px-3 py-1.5 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 disabled:opacity-50 transition" title="Consultar status no DocuSign">
                <i :class="refreshing ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'" class="fas"></i>
              </button>
              <button v-if="canAuthorize && ['sent','delivered'].includes(current.status)" @click="resend()" :disabled="!!resending"
                class="px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50 transition"
                title="Reenviar o convite para todos que ainda podem assinar">
                <i :class="resending === 'all' ? 'fa-spinner fa-spin' : 'fa-paper-plane'" class="fas mr-1"></i> Reenviar
              </button>
              <button v-if="canAuthorize && ['sent','delivered'].includes(current.status)" @click="voidEnvelope" class="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition">
                <i class="fas fa-ban mr-1"></i> Anular
              </button>
            </div>
          </div>

          <div class="p-5 space-y-4">
            <p class="text-xs text-ink-subtle">
              <i class="fas fa-paper-plane text-[10px] mr-1"></i>1º envio: <strong class="text-ink-muted">{{ formatDate(current.sent_at) }}</strong>
              <template v-if="current.completed_at"> · <i class="fas fa-check text-[10px]"></i> concluído: <strong class="text-ink-muted">{{ formatDate(current.completed_at) }}</strong></template>
              <template v-else-if="pendingNames.length"> · faltam: <strong class="text-amber-600 dark:text-amber-400">{{ pendingNames.join(', ') }}</strong></template>
            </p>

            <!-- Assinantes -->
            <div class="space-y-2">
              <div v-for="(sg, i) in (current.signers ?? [])" :key="i" class="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface-sunken/40 border border-line rounded-xl flex-wrap">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-ink truncate">
                    <i v-if="sg.status === 'completed'" class="fas fa-circle-check text-green-500 mr-1"></i>{{ sg.name }}
                  </p>
                  <p class="text-xs text-ink-subtle truncate">{{ sg.email }}</p>
                  <p class="text-[11px] text-ink-subtle mt-1 flex items-center gap-3 flex-wrap">
                    <span><i class="fas fa-paper-plane text-[9px] mr-1"></i>Enviado: {{ formatDate(sg.last_sent_at || current.sent_at) }}</span>
                    <span v-if="sg.delivered_at" :class="isStaleDelivery(sg) ? 'text-amber-600 dark:text-amber-400' : ''">
                      <i class="fas fa-envelope-open text-[9px] mr-1"></i>Recebeu: {{ formatDate(sg.delivered_at) }}{{ isStaleDelivery(sg) ? ' (antes do reenvio)' : '' }}
                    </span>
                    <span v-else class="text-ink-subtle"><i class="fas fa-envelope text-[9px] mr-1"></i>Ainda não abriu</span>
                    <span v-if="sg.signed_at" class="text-green-600 dark:text-green-400 font-semibold">
                      <i class="fas fa-signature text-[9px] mr-1"></i>Assinou: {{ formatDate(sg.signed_at) }}
                    </span>
                  </p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span :class="signerChip(sg.status)" class="px-2 py-0.5 rounded-full text-[10px] font-semibold">{{ signerLabel(sg.status) }}</span>
                  <button v-if="canAuthorize && ['sent','delivered'].includes(current.status) && !['completed','declined'].includes(sg.status)"
                    @click="resend([sg.email])" :disabled="!!resending"
                    class="w-7 h-7 flex items-center justify-center rounded-md text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-40 transition"
                    :title="`Reenviar convite para ${sg.email}`">
                    <i :class="resending === sg.email ? 'fa-spinner fa-spin' : 'fa-paper-plane'" class="fas text-xs"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Histórico do processo -->
            <div v-if="eventsList.length" class="border-t border-line pt-3">
              <button @click="showEvents = !showEvents" class="w-full flex items-center justify-between text-left">
                <p class="text-[11px] font-bold text-ink-subtle uppercase tracking-wider"><i class="fas fa-timeline mr-1.5"></i> Histórico do processo ({{ eventsList.length }})</p>
                <i :class="showEvents ? 'fa-chevron-up' : 'fa-chevron-down'" class="fas text-[10px] text-ink-subtle"></i>
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

        <!-- Documento assinado (anexo) -->
        <div v-if="current.status === 'completed' && current.signed_doc_url" class="bg-surface-raised rounded-2xl border border-green-200 dark:border-green-800 shadow-sm overflow-hidden">
          <div class="px-5 py-3.5 border-b border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-900/20 flex items-center justify-between gap-3 flex-wrap">
            <p class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
              <i class="fas fa-file-circle-check mr-1.5"></i> Documento assinado
            </p>
            <a :href="current.signed_doc_url" target="_blank" rel="noopener" class="flex items-center gap-2 px-3.5 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition">
              <i class="fas fa-download text-xs"></i> Baixar PDF assinado
            </a>
          </div>
          <iframe :src="current.signed_doc_url" class="w-full bg-white" style="height: 560px; border: 0;" title="PDF assinado"></iframe>
        </div>
      </template>

      <div v-if="info" class="px-3.5 py-2.5 rounded-lg text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
        {{ info }}
      </div>
      <div v-if="error" class="px-3.5 py-2.5 rounded-lg text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
        {{ error }}
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import API_URL from '@/config/apiUrl';

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

async function voidEnvelope() {
    const reason = window.prompt('Motivo da anulação (enviado aos assinantes):', 'Cancelado pelo emissor');
    if (reason === null) return;
    error.value = null;
    try {
        await store.voidSignature(props.detail.id, reason);
        await load();
        emit('changed');
    } catch (e) {
        error.value = e.message || 'Erro ao anular envelope.';
    }
}

const STATUS = {
    sent:      { label: 'Enviado',   chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    delivered: { label: 'Visualizado', chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
    completed: { label: 'Assinado',  chip: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    declined:  { label: 'Recusado',  chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    voided:    { label: 'Anulado',   chip: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    error:     { label: 'Erro',      chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};
function statusLabel(s) { return STATUS[s]?.label ?? s; }
function statusChip(s)  { return STATUS[s]?.chip ?? 'bg-gray-100 text-gray-600'; }
function signerLabel(s) {
    return ({ created: 'Aguardando', sent: 'Enviado', delivered: 'Visualizou', completed: 'Assinou', declined: 'Recusou' })[s] ?? (s || '-');
}
function signerChip(s) {
    if (s === 'completed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'declined')  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s === 'delivered') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
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
