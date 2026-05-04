<script setup>
import { RouterLink } from 'vue-router';

const props = defineProps({
  notification: { type: Object, required: true },
});

const isBirthday = props.notification?.type === 'Aniversário';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const toDate = (d) => d instanceof Date ? d : new Date(d);
const formatDay = (d) => String(toDate(d).getDate()).padStart(2, '0');
const formatMonth = (d) => MONTHS[toDate(d).getMonth()];

const formatFull = (d) => {
  const dt = toDate(d);
  const date = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
};
</script>

<template>
  <RouterLink :to="notification?.link"
    class="flex items-stretch gap-3 p-2.5 rounded-lg
           bg-surface-raised hover:bg-surface-sunken hover:border-accent/30
           border border-line transition-all">

    <!-- Imagem (quando houver) -->
    <div v-if="notification.image" class="w-16 h-12 rounded-md overflow-hidden shrink-0">
      <img :src="notification.image" alt="" class="h-full w-full object-cover" />
    </div>

    <!-- Aniversário -->
    <div v-else-if="isBirthday && notification.birth"
      class="shrink-0 w-12 h-12 rounded-md flex flex-col items-center justify-center
             bg-accent-soft text-accent font-mono">
      <span class="text-base font-bold leading-none">{{ formatDay(notification.birth) }}</span>
      <span class="text-[10px] uppercase tracking-wider mt-0.5">{{ formatMonth(notification.birth) }}</span>
    </div>

    <!-- Conteúdo -->
    <div class="flex flex-col min-w-0 flex-1 justify-center">
      <h4 class="text-sm font-medium text-ink truncate">{{ notification?.title }}</h4>
      <p class="text-xs text-ink-muted truncate">{{ notification?.type }}</p>
      <p class="text-[11px] text-ink-subtle">{{ formatFull(notification?.date) }}</p>
    </div>
  </RouterLink>
</template>
