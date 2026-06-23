<script setup>
// Painel de ADERÊNCIA de um comunicado: total de destinatários, quantos
// confirmaram ciência × pendentes, e a lista por pessoa. Permite "atualizar
// destinatários" (re-materializa quem entrou no público depois da publicação).

import { watch } from 'vue';
import { useMuralAdminStore } from '@/stores/Mural/muralAdminStore';
import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import { formatDateTime } from '@/utils/Mural/muralFormat';

const props = defineProps({
    open: { type: Boolean, default: false },
    comunicadoId: { type: Number, default: null },
});
const emit = defineEmits(['update:open']);

const store = useMuralAdminStore();

watch(() => props.open, (v) => {
    if (v && props.comunicadoId) store.fetchAdherence(props.comunicadoId);
});

async function refreshRecipients() {
    if (!props.comunicadoId) return;
    try {
        await store.refresh(props.comunicadoId);
        await store.fetchAdherence(props.comunicadoId);
    } catch {
        /* erro já exposto em store.error */
    }
}
</script>

<template>
  <Modal
    :open="open"
    size="lg"
    :title="store.adherence?.comunicado?.title || 'Aderência'"
    subtitle="Quem confirmou ciência × pendentes"
    @update:open="emit('update:open', $event)">

    <div v-if="store.loading" class="py-10 grid place-items-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin text-xl"></i>
    </div>

    <div v-else-if="store.adherence">
      <div class="flex gap-3 mb-4">
        <div class="flex-1 rounded-lg border border-line bg-surface-sunken p-3 text-center">
          <div class="text-2xl font-semibold text-ink">{{ store.adherence.total }}</div>
          <div class="text-xs text-ink-muted">Destinatários</div>
        </div>
        <div class="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <div class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{{ store.adherence.acked }}</div>
          <div class="text-xs text-ink-muted">Confirmaram</div>
        </div>
        <div class="flex-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <div class="text-2xl font-semibold text-amber-600 dark:text-amber-400">{{ store.adherence.pending }}</div>
          <div class="text-xs text-ink-muted">Pendentes</div>
        </div>
      </div>

      <div class="max-h-80 overflow-y-auto rounded-lg border border-line divide-y divide-line">
        <div v-for="u in store.adherence.users" :key="u.user.id"
          class="flex items-center justify-between gap-3 px-3 py-2">
          <div class="min-w-0">
            <p class="text-sm text-ink truncate">{{ u.user.username }}</p>
            <p v-if="u.user.position" class="text-xs text-ink-subtle truncate">{{ u.user.position }}</p>
          </div>
          <Badge :variant="u.acked ? 'success' : 'warning'" size="sm">
            <i :class="u.acked ? 'fas fa-check' : 'fas fa-clock'"></i>
            {{ u.acked ? formatDateTime(u.ackedAt) : 'Pendente' }}
          </Badge>
        </div>
      </div>
    </div>

    <p v-if="store.error" class="mt-3 text-sm text-red-500">{{ store.error }}</p>

    <template #footer>
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Fechar</Button>
      <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" @click="refreshRecipients">
        Atualizar destinatários
      </Button>
    </template>
  </Modal>
</template>
