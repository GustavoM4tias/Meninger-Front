<script setup>
import { onMounted } from 'vue';
import NotificationItem from './NotificationItem.vue';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import Dropdown from '@/components/UI/Dropdown.vue';

const notificationStore = useNotificationStore();

onMounted(() => {
  // notificationStore.fetchNotifications(); REATIVAR NOTIFICAÇÃO
});
</script>

<template>
  <Dropdown align="right" :offset="10" :close-on-click="false">
    <template #trigger>
      <button type="button"
        class="relative h-9 w-9 grid place-items-center rounded-lg
               text-ink-muted hover:text-ink hover:bg-surface-sunken
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40
               transition-colors">
        <i class="far fa-bell text-base"></i>
        <span v-if="notificationStore.notifications.length > 0"
          class="absolute top-1.5 right-1.5 flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface"></span>
        </span>
      </button>
    </template>

    <div class="w-80 max-h-[28rem] overflow-hidden flex flex-col
                bg-surface-overlay border border-line rounded-xl shadow-overlay">

      <div v-if="notificationStore.notifications.length > 0" class="flex flex-col h-full min-h-0">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-line">
          <div class="flex items-center gap-2">
            <i class="far fa-bell text-accent text-sm"></i>
            <p class="text-sm font-semibold text-ink">Notificações</p>
          </div>
          <span class="text-[11px] font-mono text-ink-muted px-2 py-0.5 rounded-md bg-surface-sunken border border-line">
            {{ notificationStore.notifications.length }}
          </span>
        </div>

        <!-- Lista -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
          <transition-group
            enter-active-class="transition ease-out-expo duration-300"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            move-class="transition-transform duration-300">
            <NotificationItem v-for="(notification, index) in notificationStore.notifications"
              :key="notification.id ?? index" :notification="notification" />
          </transition-group>
        </div>
      </div>

      <div v-else class="px-4 py-10 text-center">
        <div class="w-12 h-12 rounded-2xl bg-surface-sunken border border-line grid place-items-center mx-auto mb-3">
          <i class="far fa-bell-slash text-ink-subtle text-lg"></i>
        </div>
        <p class="text-sm text-ink-muted">Sem notificações</p>
        <p class="text-xs text-ink-subtle mt-1">Tudo em dia por aqui</p>
      </div>
    </div>
  </Dropdown>
</template>
