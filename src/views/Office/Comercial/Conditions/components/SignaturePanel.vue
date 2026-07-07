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
            ({{ state.config?.placement === 'livre' ? 'posicionamento livre' : 'assinatura ao final' }}{{ state.config?.require_initials ? ' + rubrica' : '' }}).
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
              <span :class="statusChip(current.status)" class="px-2.5 py-1 rounded-full text-xs font-semibold">{{ statusLabel(current.status) }}</span>
              <button @click="refresh" :disabled="refreshing" class="px-3 py-1.5 text-xs font-semibold text-ink bg-surface-sunken border border-line rounded-lg hover:bg-surface-sunken/70 disabled:opacity-50 transition" title="Consultar status no DocuSign">
                <i :class="refreshing ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'" class="fas"></i>
              </button>
              <button v-if="canAuthorize && ['sent','delivered'].includes(current.status)" @click="voidEnvelope" class="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition">
                <i class="fas fa-ban mr-1"></i> Anular
              </button>
            </div>
          </div>

          <div class="p-5 space-y-4">
            <p class="text-xs text-ink-subtle">
              Enviado em {{ formatDate(current.sent_at) }}
              <template v-if="current.completed_at"> · concluído em {{ formatDate(current.completed_at) }}</template>
            </p>

            <!-- Assinantes -->
            <div class="space-y-2">
              <div v-for="(sg, i) in (current.signers ?? [])" :key="i" class="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface-sunken/40 border border-line rounded-xl">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-ink truncate">{{ sg.name }}</p>
                  <p class="text-xs text-ink-subtle truncate">{{ sg.email }}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span v-if="sg.signed_at" class="text-[10px] text-ink-subtle">{{ formatDate(sg.signed_at) }}</span>
                  <span :class="signerChip(sg.status)" class="px-2 py-0.5 rounded-full text-[10px] font-semibold">{{ signerLabel(sg.status) }}</span>
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

      <div v-if="error" class="px-3.5 py-2.5 rounded-lg text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
        {{ error }}
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';

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
