<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useNotificationStore } from '@/stores/Config/notificationStore';

const props = defineProps({
  notification: { type: Object, required: true },
});

const store = useNotificationStore();

// Ícone/cor por tipo
const TYPE_META = {
  'event.created':   { icon: 'fas fa-calendar-plus',   accent: 'text-emerald-500',  label: 'Evento' },
  'event.reminder':  { icon: 'fas fa-bell',            accent: 'text-amber-500',    label: 'Lembrete' },
  'support.opened':  { icon: 'fas fa-life-ring',       accent: 'text-sky-500',      label: 'Suporte' },
  'support.updated': { icon: 'fas fa-comments',        accent: 'text-sky-500',      label: 'Suporte' },
  'generic':         { icon: 'fas fa-circle-info',     accent: 'text-ink-muted',    label: 'Aviso' },
};

const meta = computed(() => TYPE_META[props.notification?.type] || TYPE_META.generic);
const isUnread = computed(() => !props.notification?.read_at);
const image = computed(() => props.notification?.data?.image || null);
const link = computed(() => props.notification?.link || '#');

const formatFull = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const date = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} • ${time}`;
};

const handleClick = () => {
  if (isUnread.value) store.markRead(props.notification.id);
};

const handleRemove = (e) => {
  e.preventDefault();
  e.stopPropagation();
  store.remove(props.notification.id);
};
</script>

<template>
  <RouterLink :to="link" @click="handleClick"
    :class="[
      'group relative flex items-stretch gap-3 p-2.5 rounded-lg border transition-all',
      isUnread
        ? 'bg-accent-soft/40 border-accent/20 hover:bg-accent-soft/60'
        : 'bg-surface-raised border-line hover:bg-surface-sunken',
    ]">

    <!-- Imagem ou ícone -->
    <div v-if="image" class="w-12 h-12 rounded-md overflow-hidden shrink-0">
      <img :src="image" alt="" class="h-full w-full object-cover" />
    </div>
    <div v-else
      class="shrink-0 w-12 h-12 rounded-md grid place-items-center bg-surface-sunken border border-line">
      <i :class="[meta.icon, meta.accent, 'text-base']"></i>
    </div>

    <!-- Conteúdo -->
    <div class="flex flex-col min-w-0 flex-1 justify-center">
      <div class="flex items-center gap-2">
        <span :class="['text-[10px] font-medium uppercase tracking-wide', meta.accent]">
          {{ meta.label }}
        </span>
        <span v-if="isUnread" class="h-1.5 w-1.5 rounded-full bg-accent shrink-0"></span>
      </div>
      <h4 :class="['text-sm truncate', isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-muted']">
        {{ notification.title }}
      </h4>
      <p v-if="notification.body" class="text-xs text-ink-muted truncate">{{ notification.body }}</p>
      <p class="text-[11px] text-ink-subtle">{{ formatFull(notification.created_at) }}</p>
    </div>

    <!-- Botão remover (aparece no hover) -->
    <button type="button" @click="handleRemove"
      class="absolute top-1.5 right-1.5 h-6 w-6 grid place-items-center rounded-md
             text-ink-subtle opacity-0 group-hover:opacity-100
             hover:bg-surface-sunken hover:text-red-500 transition-all"
      title="Remover">
      <i class="fas fa-xmark text-[10px]"></i>
    </button>
  </RouterLink>
</template>
