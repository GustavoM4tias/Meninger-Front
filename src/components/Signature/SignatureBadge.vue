<template>
  <!-- Badge inline de status de assinatura. Clicável quando assinado (mostra detalhes). -->
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-default select-none"
    :class="badgeClass"
    :title="badgeTitle"
    v-bind="isSigned ? { role: 'button', tabindex: 0 } : {}"
    @click="isSigned && openDetail()"
    @keydown.enter="isSigned && openDetail()"
  >
    <i :class="iconClass" />
    {{ label }}
  </span>

  <!-- Mini-modal de detalhes da assinatura (apenas quando signed) -->
  <teleport to="body">
    <transition name="sig-badge-fade">
      <div
        v-if="showDetail"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        @click.self="showDetail = false"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDetail = false" />
        <div class="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white dark:bg-gray-900 shadow-2xl p-5 space-y-4">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="fas fa-check-circle text-green-500 text-lg" />
              <span class="font-semibold text-gray-900 dark:text-white">Assinatura verificada</span>
            </div>
            <button
              type="button"
              class="h-7 w-7 grid place-items-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition"
              @click="showDetail = false"
            >
              <i class="fas fa-times text-sm" />
            </button>
          </div>

          <!-- Detalhes -->
          <div class="space-y-2 text-sm">
            <DetailRow label="Documento" :value="signature?.document_name" />
            <DetailRow label="Tipo" :value="signature?.document_type" />
            <DetailRow label="Assinado em" :value="formatDate(signature?.signed_at)" />
            <DetailRow v-if="signature?.signer" label="Assinado por" :value="signature.signer.username" />
          </div>

          <!-- Código de verificação -->
          <div v-if="signature?.verification_code" class="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 text-center space-y-1">
            <p class="text-[11px] uppercase text-gray-400 tracking-wider">Código de verificação</p>
            <p class="text-xl font-mono font-bold tracking-[0.2em] text-gray-900 dark:text-white">
              {{ signature.verification_code }}
            </p>
          </div>

          <!-- Hash do documento -->
          <div v-if="signature?.document_hash" class="text-[11px] text-gray-400 font-mono break-all">
            SHA-256: {{ signature.document_hash }}
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  /**
   * Status da assinatura: 'SIGNED' | 'PENDING' | 'REJECTED' | 'EXPIRED' | null
   */
  status: { type: String, default: null },
  /**
   * Objeto completo da assinatura (opcional — habilita mini-modal com detalhes)
   */
  signature: { type: Object, default: null },
});

const showDetail = ref(false);

const isSigned = computed(() => props.status === 'SIGNED');

const badgeClass = computed(() => {
  switch (props.status) {
    case 'SIGNED':
      return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 cursor-pointer transition-colors';
    case 'PENDING':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
    case 'REJECTED':
      return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
    case 'EXPIRED':
      return 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500';
  }
});

const iconClass = computed(() => {
  switch (props.status) {
    case 'SIGNED':   return 'fas fa-check-circle';
    case 'PENDING':  return 'fas fa-clock';
    case 'REJECTED': return 'fas fa-times-circle';
    case 'EXPIRED':  return 'fas fa-ban';
    default:         return 'fas fa-minus-circle';
  }
});

const label = computed(() => {
  switch (props.status) {
    case 'SIGNED':   return 'Assinado';
    case 'PENDING':  return 'Aguardando assinatura';
    case 'REJECTED': return 'Recusado';
    case 'EXPIRED':  return 'Expirado';
    default:         return 'Não assinado';
  }
});

const badgeTitle = computed(() => {
  if (isSigned.value && props.signature) return 'Clique para ver detalhes da assinatura';
  return label.value;
});

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

function openDetail() {
  if (props.signature) showDetail.value = true;
}
</script>

<!-- Sub-componente inline para linhas de detalhe -->
<script>
const DetailRow = {
  props: { label: String, value: String },
  template: `
    <div class="flex justify-between gap-2">
      <span class="text-gray-400 shrink-0">{{ label }}</span>
      <span class="font-medium text-gray-700 dark:text-gray-300 text-right">{{ value || '-' }}</span>
    </div>
  `,
};
export default { components: { DetailRow } };
</script>

<style scoped>
.sig-badge-fade-enter-active,
.sig-badge-fade-leave-active {
  transition: opacity 0.15s ease;
}
.sig-badge-fade-enter-from,
.sig-badge-fade-leave-to {
  opacity: 0;
}
</style>
