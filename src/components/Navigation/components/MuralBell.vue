<script setup>
// Ícone do Mural na top bar (ao lado do sino de notificações). Mostra um badge com
// o nº de comunicados pendentes de ciência e abre/fecha o card flutuante do mural.
// É o ponto sempre-presente: fica montado na nav e faz o fetch + polling do mural.

import { onMounted, onBeforeUnmount, computed } from 'vue';
import { useMuralStore } from '@/stores/Mural/muralStore';

const store = useMuralStore();
const count = computed(() => store.ackPendingCount);

onMounted(() => {
    store.fetchMine();
    store.startPolling(60000);
});
onBeforeUnmount(() => store.stopPolling());
</script>

<template>
  <button
    type="button"
    class="relative h-9 w-9 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40 transition-colors"
    :class="store.panelOpen ? 'text-accent bg-surface-sunken' : ''"
    aria-label="Mural de avisos"
    title="Mural de avisos"
    @click="store.togglePanel()">
    <i class="fas fa-bullhorn text-base"></i>
    <span
      v-if="count > 0"
      class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-surface"
      :class="store.hasUrgentePending ? 'bg-red-500' : 'bg-amber-500'">
      {{ count > 99 ? '99+' : count }}
    </span>
  </button>
</template>
