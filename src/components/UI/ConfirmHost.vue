<script setup>
/**
 * ConfirmHost — o único ConfirmDialog montado na aplicação.
 * Vive no App.vue e é dirigido por `pedirConfirmacao()`. Nenhuma tela precisa
 * declarar diálogo próprio para uma pergunta "tem certeza?".
 *
 * Telas que precisam de um campo dentro da confirmação (o slot do
 * ConfirmDialog) continuam montando o primitivo direto — o host cobre o caso
 * comum, não todos.
 */
import ConfirmDialog from './ConfirmDialog.vue';
import { useConfirmHost } from '@/composables/useConfirm';

const { aberto, opcoes, aceitar, recusar } = useConfirmHost();
</script>

<template>
  <ConfirmDialog
    :open="aberto"
    :title="opcoes.title || 'Tem certeza?'"
    :consequence="opcoes.consequence || ''"
    :hint="opcoes.hint || ''"
    :tone="opcoes.tone || 'danger'"
    :confirm-label="opcoes.confirmLabel || 'Confirmar'"
    :cancel-label="opcoes.cancelLabel || 'Cancelar'"
    :ask-note="!!opcoes.askNote"
    :note-label="opcoes.noteLabel || 'Motivo (opcional)'"
    :note-placeholder="opcoes.notePlaceholder || ''"
    :note-default="opcoes.noteDefault || ''"
    @confirm="aceitar"
    @cancel="recusar"
    @update:open="(v) => { if (!v) recusar(); }" />
</template>
