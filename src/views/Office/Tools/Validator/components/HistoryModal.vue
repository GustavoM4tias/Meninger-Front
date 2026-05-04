<script setup>
import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';

defineProps({ show: Boolean, item: Object });
defineEmits(['close']);

const statusVariant = (status) => ({
  APROVADO: 'success', REPROVADO: 'danger', ERRO: 'warning',
}[status] || 'neutral');

const messageVariant = (nivel) => ({
  correto: 'success', alerta: 'warning', incorreto: 'danger',
}[nivel] || 'neutral');

const messageBorderClass = (nivel) => ({
  correto: 'border-emerald-500/30 bg-emerald-500/10',
  alerta: 'border-amber-500/30 bg-amber-500/10',
  incorreto: 'border-red-500/30 bg-red-500/10',
}[nivel] || 'border-line bg-surface-sunken');

const iconByNivel = (nivel) => ({
  correto: '✅', alerta: '⚠️', incorreto: '❌',
}[nivel] || 'ℹ️');
</script>

<template>
  <Modal :open="show" size="lg" @close="$emit('close')">
    <template #header>
      <div v-if="item" class="flex items-center gap-3 min-w-0">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-file-shield text-sm"></i>
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-ink truncate">{{ item.cliente }}</h2>
          <p class="text-xs text-ink-muted truncate">{{ item.empreendimento }}</p>
        </div>
        <Badge :variant="statusVariant(item.status)" dot>{{ item.status }}</Badge>
      </div>
    </template>

    <div v-if="item" class="space-y-4">
      <div class="flex items-center justify-between text-xs text-ink-subtle font-mono">
        <span>{{ item.tokensUsed }} tokens · {{ item.model }}</span>
        <span>{{ new Date(item.createdAt).toLocaleString('pt-BR') }}</span>
      </div>

      <section v-if="item.mensagens?.length">
        <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">Detalhes</p>
        <div class="space-y-2">
          <div v-for="(msg, i) in item.mensagens" :key="i"
            class="rounded-lg border-l-4 p-3 surface-gradient"
            :class="messageBorderClass(msg.nivel)">
            <div class="flex justify-between items-start gap-3">
              <div class="min-w-0">
                <h4 class="font-semibold text-sm text-ink mb-1 flex items-center gap-2">
                  <span>{{ iconByNivel(msg.nivel) }}</span>
                  <span>{{ msg.tipo }}</span>
                </h4>
                <p class="text-sm text-ink-muted leading-relaxed">{{ msg.descricao }}</p>
              </div>
              <Badge :variant="messageVariant(msg.nivel)" size="sm" class="shrink-0 uppercase">
                {{ msg.nivel }}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <p v-else class="text-sm text-ink-muted italic">Nenhuma mensagem encontrada.</p>
    </div>
  </Modal>
</template>
