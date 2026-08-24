<script setup>
// Sino da top bar. Duas correções que valem registro:
//
// 1. O painel tinha largura fixa `w-96` (384px). No celular de 375px ele nascia
//    maior que a tela e o lado esquerdo ficava cortado — o botão "Marcar tudo"
//    saía do campo de visão. Agora a largura é o MENOR entre 24rem e a tela
//    menos a folga da nav.
// 2. O clique num aviso navegava mas deixava o painel aberto por cima da tela
//    de destino. Agora fecha — menos no botão de remover, que é uma ação de
//    dentro da lista.
import { onMounted, onBeforeUnmount, computed } from 'vue';
import { RouterLink } from 'vue-router';
import NotificationItem from './NotificationItem.vue';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import Dropdown from '@/components/UI/Dropdown.vue';

const notificationStore = useNotificationStore();

const unreadCount = computed(() => notificationStore.unread);
// O sino mostra o topo da caixa: as mais recentes, lidas ou não.
const items = computed(() => notificationStore.notifications.slice(0, 20));

onMounted(async () => {
  await notificationStore.fetchNotifications({ limit: 30 });
  notificationStore.startPolling(60_000);
});

onBeforeUnmount(() => {
  notificationStore.stopPolling();
});

const handleOpen = () => notificationStore.syncLatest({ limit: 30 });
const handleMarkAll = () => notificationStore.markAllRead();

// Fecha ao abrir um aviso; mantém aberto quando o clique foi num botão da
// própria linha (remover).
const onItemClick = (e, close) => {
  if (e.target.closest('button')) return;
  close();
};
</script>

<template>
  <Dropdown align="right" :offset="10" :close-on-click="false" @open="handleOpen">
    <template #trigger>
      <button type="button"
        class="relative h-9 w-9 grid place-items-center rounded-lg border border-line
               text-ink-muted hover:text-ink hover:bg-surface-sunken hover:border-accent/40
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40
               transition-colors"
        aria-label="Notificações">
        <i class="far fa-bell text-base"></i>
        <span v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                 grid place-items-center rounded-full animate-pop-in
                 bg-data-neg text-micro font-bold text-white ring-2 ring-surface">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>
    </template>

    <template #default="{ close }">
      <div class="w-[min(24rem,calc(100vw-4.5rem))] max-h-[70dvh] sm:max-h-[32rem]
                  overflow-hidden flex flex-col
                  bg-surface-overlay border border-line rounded-xl shadow-overlay">

        <!-- Header -->
        <div class="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-line">
          <div class="flex items-center gap-2 min-w-0">
            <i class="far fa-bell text-accent text-sm shrink-0"></i>
            <p class="text-sm font-semibold text-ink truncate">Notificações</p>
            <span v-if="unreadCount > 0"
              class="text-micro font-mono text-accent px-2 py-0.5 rounded-md shrink-0
                     bg-accent-soft border border-accent/20">
              {{ unreadCount > 99 ? '99+' : unreadCount }} {{ unreadCount === 1 ? 'nova' : 'novas' }}
            </span>
          </div>
          <button v-if="unreadCount > 0" type="button" @click="handleMarkAll"
            class="text-micro text-ink-muted hover:text-accent transition-colors shrink-0
                   px-1.5 py-1 rounded hover:bg-surface-sunken">
            <i class="fas fa-check-double sm:mr-1"></i>
            <span class="hidden sm:inline">Marcar tudo</span>
          </button>
        </div>

        <!-- Lista -->
        <div v-if="items.length > 0" class="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5">
          <transition-group
            enter-active-class="transition ease-out-expo duration-300"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            move-class="transition-transform duration-300">
            <div v-for="n in items" :key="n.id" @click="(e) => onItemClick(e, close)">
              <NotificationItem :notification="n" />
            </div>
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
        <div class="px-3 py-2 border-t border-line flex items-center justify-between gap-2">
          <RouterLink to="/notifications" @click="close()"
            class="text-micro text-ink-muted hover:text-accent transition-colors px-2 py-1 rounded hover:bg-surface-sunken">
            <i class="fas fa-list-ul mr-1 text-[10px]"></i> Ver todas
          </RouterLink>
          <RouterLink to="/settings/notifications" @click="close()"
            class="text-micro text-ink-muted hover:text-accent transition-colors px-2 py-1 rounded hover:bg-surface-sunken">
            <i class="fas fa-sliders mr-1 text-[10px]"></i> Preferências
          </RouterLink>
        </div>
      </div>
    </template>
  </Dropdown>
</template>
