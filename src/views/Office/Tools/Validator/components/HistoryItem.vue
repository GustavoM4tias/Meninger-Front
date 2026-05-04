<script setup>
import Badge from '@/components/UI/Badge.vue';

defineProps({ item: Object });
defineEmits(['open']);

const statusVariant = (status) => ({
  APROVADO: 'success',
  REPROVADO: 'danger',
  ERRO: 'warning',
}[status] || 'neutral');
</script>

<template>
  <article @click="$emit('open', item)"
    class="group rounded-lg bg-surface-raised border border-line surface-gradient
           p-3 cursor-pointer hover:border-accent/30 hover:shadow-elevated hover:-translate-y-0.5
           transition-all duration-200 ease-out-expo">
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <Badge :variant="statusVariant(item.status)" size="sm">{{ item.status }}</Badge>
      <span class="text-[10px] text-ink-subtle font-mono">
        {{ new Date(item.createdAt).toLocaleDateString('pt-BR') }}
      </span>
    </div>
    <h3 class="text-sm font-semibold text-ink truncate group-hover:text-accent transition-colors">
      {{ item.cliente }}
    </h3>
    <p class="text-xs text-ink-muted truncate">{{ item.empreendimento }}</p>
    <div class="flex items-center justify-between text-[10px] text-ink-subtle mt-2 font-mono">
      <span class="truncate">{{ item.model }}</span>
      <span>{{ item.tokens_used }} tokens</span>
    </div>
  </article>
</template>
