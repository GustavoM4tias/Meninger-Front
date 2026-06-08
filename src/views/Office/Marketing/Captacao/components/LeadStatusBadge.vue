<script setup>
// Badge unificado dos estados do inbound_lead. Centraliza o vocabulário visual
// (label + cor + ícone) pra todas as views da Captacao usarem o mesmo.

import { computed } from 'vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
    status: { type: String, required: true },
    size: { type: String, default: 'md' },   // sm | md
    dot: { type: Boolean, default: true },
});

const META = {
    received:    { label: 'Recebido',           variant: 'neutral', icon: 'fas fa-inbox' },
    validated:   { label: 'Validado',           variant: 'info',    icon: 'fas fa-check-circle' },
    held:        { label: 'Aguardando vínculo', variant: 'warning', icon: 'fas fa-hourglass-half' },
    routed:      { label: 'Roteado',            variant: 'accent',  icon: 'fas fa-route' },
    dispatching: { label: 'Despachando',        variant: 'info',    icon: 'fas fa-paper-plane' },
    delivered:   { label: 'Entregue ao CV',     variant: 'success', icon: 'fas fa-circle-check' },
    rejected:    { label: 'Recusado pelo CV',   variant: 'danger',  icon: 'fas fa-ban' },
    failed:      { label: 'Falhou',             variant: 'danger',  icon: 'fas fa-circle-exclamation' },
    spam:        { label: 'Spam',               variant: 'neutral', icon: 'fas fa-trash' },
    historical:  { label: 'Histórico Meta',     variant: 'info',    icon: 'fas fa-clock-rotate-left' },
};

const meta = computed(() => META[props.status] || { label: props.status, variant: 'neutral', icon: 'fas fa-circle' });
</script>

<template>
  <Badge :variant="meta.variant" :size="size" :dot="dot">
    <i :class="meta.icon" class="text-[10px]"></i>
    <span>{{ meta.label }}</span>
  </Badge>
</template>
