<script setup>
// Conteúdo de um toast de notificação. É desenhado DENTRO do vue-toastification
// (a fila de avisos do Office), então aqui não há posicionamento, timer nem
// pausa no hover: isso é da lib, e é por ela que este balão não briga com o
// toast de "salvo com sucesso" de uma tela — os dois entram na mesma fila.
//
// O componente é burro de propósito: o toast é montado fora da árvore do app,
// sem router nem pinia. Tudo o que ele precisa chega por prop, e o clique é
// tratado por quem criou o toast (NotificationToaster).
import { computed } from 'vue';
import { notificationMeta, notificationTarget, formatNotificationDate } from '@/utils/Config/notificationMeta';

const props = defineProps({
  notification: { type: Object, required: true },
  // Quantas outras não lidas ficaram de fora desta leva (0 = nenhuma).
  restantes: { type: Number, default: 0 },
});

const meta = computed(() => notificationMeta(props.notification?.type, props.notification?.data));
const target = computed(() => notificationTarget(props.notification));
const image = computed(() => props.notification?.data?.image || null);
</script>

<template>
  <div class="flex items-stretch gap-3 w-full text-left">
    <div v-if="image" class="w-11 h-11 rounded-md overflow-hidden shrink-0">
      <img :src="image" alt="" class="h-full w-full object-cover" />
    </div>
    <div v-else
      :class="['shrink-0 w-11 h-11 rounded-md grid place-items-center border', meta.soft, meta.ring]">
      <i :class="[meta.icon, meta.text, 'text-sm']"></i>
    </div>

    <div class="flex flex-col min-w-0 flex-1 gap-0.5">
      <span :class="['text-micro font-medium uppercase tracking-wide truncate', meta.text]">
        {{ meta.label }}
      </span>

      <p class="text-sm font-semibold text-ink leading-snug line-clamp-2">
        {{ notification.title }}
      </p>

      <p v-if="notification.body" class="text-xs text-ink-muted line-clamp-2">
        {{ notification.body }}
      </p>

      <div class="flex items-center gap-2 flex-wrap mt-0.5">
        <span class="text-micro text-ink-subtle">
          {{ formatNotificationDate(notification.created_at) }}
        </span>
        <!-- Dizer para onde leva: o toast some sozinho, então quem hesita
             perdeu o aviso. Sem destino, nada é prometido. -->
        <span v-if="target.has" class="text-micro text-accent inline-flex items-center gap-1 font-medium">
          <i :class="target.external ? 'fas fa-arrow-up-right-from-square' : 'fas fa-arrow-right'"
             class="text-[9px]"></i>
          {{ target.external ? 'Abrir link' : 'Abrir' }}
        </span>
        <span v-if="restantes > 0" class="text-micro text-ink-subtle">
          +{{ restantes }} {{ restantes === 1 ? 'não lida' : 'não lidas' }}
        </span>
      </div>
    </div>
  </div>
</template>
