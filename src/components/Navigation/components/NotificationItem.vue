<script setup>
// Um aviso na lista do sino. O MESMO card serve a caixa de entrada (a tela usa
// este componente com `size="lg"`), então corrigir aqui corrige nos dois lugares
// — antes eram duas cópias com mapas de ícone diferentes e uma delas usava cor
// crua (emerald/sky/red) em vez de token.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import { notificationMeta, notificationTarget, formatNotificationDate } from '@/utils/Config/notificationMeta';

const props = defineProps({
  notification: { type: Object, required: true },
  // 'md' = dentro do sino, 'lg' = caixa de entrada (mais respiro e corpo maior)
  size: { type: String, default: 'md' },
});

const store = useNotificationStore();

const meta = computed(() => notificationMeta(props.notification?.type));
const isUnread = computed(() => !props.notification?.read_at);
const image = computed(() => props.notification?.data?.image || null);
const target = computed(() => notificationTarget(props.notification));
const big = computed(() => props.size === 'lg');

// Sem destino, o card NÃO é link. Antes ele apontava para '#' quando não havia
// link: parecia clicável, e o clique só sujava a URL sem sair do lugar.
const tag = computed(() => (target.value.has ? (target.value.external ? 'a' : RouterLink) : 'div'));
const linkProps = computed(() => {
  if (!target.value.has) return {};
  return target.value.external
    ? { href: target.value.to, target: '_blank', rel: 'noopener' }
    : { to: target.value.to };
});

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
  <component :is="tag" v-bind="linkProps" @click="handleClick"
    :class="[
      'group relative flex items-stretch gap-3 rounded-lg border transition-all duration-120',
      big ? 'p-3 sm:p-3.5' : 'p-2.5',
      isUnread
        ? 'bg-accent-soft/40 border-accent/20'
        : 'bg-surface-raised border-line',
      target.has
        ? 'cursor-pointer hover:border-accent/40 hover:shadow-soft hover:-translate-y-px active:translate-y-0'
        : 'cursor-default',
      target.has && !isUnread ? 'hover:bg-surface-sunken' : '',
      target.has && isUnread ? 'hover:bg-accent-soft/60' : '',
    ]">

    <!-- Faixa de não lida: some assim que a pessoa abre, e é ela que dá o
         "isto é novo" mesmo com o card inteiro em cinza. -->
    <span v-if="isUnread"
      class="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent"></span>

    <!-- Imagem ou ícone do tipo -->
    <div v-if="image"
      :class="['rounded-md overflow-hidden shrink-0', big ? 'w-14 h-14' : 'w-11 h-11']">
      <img :src="image" alt="" class="h-full w-full object-cover" />
    </div>
    <div v-else
      :class="['shrink-0 rounded-md grid place-items-center border',
               meta.soft, meta.ring, big ? 'w-14 h-14' : 'w-11 h-11']">
      <i :class="[meta.icon, meta.text, big ? 'text-base' : 'text-sm']"></i>
    </div>

    <!-- Conteúdo -->
    <div class="flex flex-col min-w-0 flex-1 justify-center gap-0.5">
      <div class="flex items-center gap-2 min-w-0">
        <span :class="['text-micro font-medium uppercase tracking-wide truncate', meta.text]">
          {{ meta.label }}
        </span>
        <span v-if="isUnread"
          class="text-micro font-medium text-accent px-1.5 rounded bg-accent-soft border border-accent/20 shrink-0">
          nova
        </span>
      </div>

      <h4 :class="[
        'text-sm leading-snug',
        big ? 'line-clamp-2' : 'truncate',
        isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-muted',
      ]">
        {{ notification.title }}
      </h4>

      <p v-if="notification.body"
        :class="['text-xs text-ink-muted', big ? 'line-clamp-2' : 'truncate']">
        {{ notification.body }}
      </p>

      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-micro text-ink-subtle">{{ formatNotificationDate(notification.created_at) }}</span>
        <!-- A maioria dos avisos leva a uma tela. Dizer isso em palavra evita o
             clique de teste: quem não quer sair da página sabe antes. -->
        <span v-if="target.has"
          class="text-micro text-accent inline-flex items-center gap-1 opacity-80 group-hover:opacity-100
                 transition-opacity duration-120">
          <i :class="target.external ? 'fas fa-arrow-up-right-from-square' : 'fas fa-arrow-right'"
             class="text-[9px] transition-transform duration-120 group-hover:translate-x-0.5"></i>
          {{ target.external ? 'Abrir link' : 'Abrir' }}
        </span>
      </div>
    </div>

    <!-- Remover. No celular não existe hover: fica visível sempre abaixo de sm. -->
    <button type="button" @click="handleRemove"
      class="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-md
             text-ink-subtle opacity-60 sm:opacity-0 sm:group-hover:opacity-100
             hover:bg-surface-sunken hover:text-data-neg transition-all duration-120"
      title="Remover" aria-label="Remover notificação">
      <i class="fas fa-xmark text-[11px]"></i>
    </button>
  </component>
</template>
