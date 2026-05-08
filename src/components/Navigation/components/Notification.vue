<script setup>
import { onMounted, onBeforeUnmount, computed } from 'vue';
import { RouterLink } from 'vue-router';
import NotificationItem from './NotificationItem.vue';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import Dropdown from '@/components/UI/Dropdown.vue';

const notificationStore = useNotificationStore();

const unreadCount = computed(() => notificationStore.unread);
const items = computed(() => notificationStore.notifications);

onMounted(async () => {
  await notificationStore.fetchNotifications({ limit: 30 });
  notificationStore.startPolling(60_000);
});

onBeforeUnmount(() => {
  notificationStore.stopPolling();
});

const handleOpen = () => notificationStore.fetchNotifications({ limit: 30 });
const handleMarkAll = () => notificationStore.markAllRead();
</script>

<template>
  <Dropdown align="right" :offset="10" :close-on-click="false" @open="handleOpen">
    <template #trigger>
      <button type="button"
        class="relative h-9 w-9 grid place-items-center rounded-lg
               text-ink-muted hover:text-ink hover:bg-surface-sunken
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40
               transition-colors">
        <i class="far fa-bell text-base"></i>
        <span v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                 grid place-items-center rounded-full
                 bg-red-500 text-[10px] font-bold text-white ring-2 ring-surface">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </template>

    <div class="w-96 max-h-[32rem] overflow-hidden flex flex-col
                bg-surface-overlay border border-line rounded-xl shadow-overlay">

      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-line">
        <div class="flex items-center gap-2">
          <i class="far fa-bell text-accent text-sm"></i>
          <p class="text-sm font-semibold text-ink">Notificações</p>
          <span v-if="unreadCount > 0"
            class="text-[11px] font-mono text-accent px-2 py-0.5 rounded-md
                   bg-accent-soft border border-accent/20">
            {{ unreadCount }} novas
          </span>
        </div>
        <button v-if="unreadCount > 0" type="button" @click="handleMarkAll"
          class="text-[11px] text-ink-muted hover:text-accent transition-colors">
          <i class="fas fa-check-double mr-1"></i> Marcar tudo
        </button>
      </div>

      <!-- Lista -->
      <div v-if="items.length > 0" class="flex-1 overflow-y-auto p-2 space-y-1.5">
        <transition-group
          enter-active-class="transition ease-out-expo duration-300"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          move-class="transition-transform duration-300">
          <NotificationItem v-for="n in items" :key="n.id" :notification="n" />
        </transition-group>
      </div>

      <!-- Vazio -->
      <div v-else class="px-4 py-10 text-center">
        <div class="w-12 h-12 rounded-2xl bg-surface-sunken border border-line grid place-items-center mx-auto mb-3">
          <i class="far fa-bell-slash text-ink-subtle text-lg"></i>
        </div>
        <p class="text-sm text-ink-muted">Sem notificações</p>
        <p class="text-xs text-ink-subtle mt-1">Tudo em dia por aqui</p>
      </div>

      <!-- Footer -->
      <div class="px-3 py-2 border-t border-line flex items-center justify-between">
        <RouterLink to="/notifications"
          class="text-[11px] text-ink-muted hover:text-accent transition-colors px-2 py-1 rounded hover:bg-surface-sunken">
          <i class="fas fa-list-ul mr-1 text-[10px]"></i> Ver todas
        </RouterLink>
        <RouterLink to="/settings/notifications"
          class="text-[11px] text-ink-muted hover:text-accent transition-colors px-2 py-1 rounded hover:bg-surface-sunken">
          <i class="fas fa-sliders mr-1 text-[10px]"></i> Preferências
        </RouterLink>
      </div>
    </div>
  </Dropdown>
</template>
