<script setup>
// Lista de mensagens. No celular ela é a tela inteira; no desktop divide com a
// leitura. Cada linha tem alvo de toque de 44px e as duas ações que se usa o
// tempo todo (sinalizar, excluir) sem precisar abrir a mensagem.

import { computed } from 'vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
  messages:   { type: Array,   default: () => [] },
  selectedId: { type: String,  default: '' },
  loading:    { type: Boolean, default: false },
  hasMore:    { type: Boolean, default: false },
  canOrganize:{ type: Boolean, default: false },
  emptyTitle: { type: String,  default: 'Nada por aqui' },
  emptyText:  { type: String,  default: '' },
});

const emit = defineEmits(['open', 'flag', 'delete', 'more']);

const hoje = new Date().toDateString();

function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (d.toDateString() === hoje) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  const esteAno = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('pt-BR', esteAno
    ? { day: '2-digit', month: 'short' }
    : { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const vazio = computed(() => !props.loading && !props.messages.length);
</script>

<template>
  <div class="h-full flex flex-col">

    <!-- Carregando a primeira página -->
    <div v-if="loading && !messages.length" class="p-3">
      <Skeleton variant="row" :lines="8" />
    </div>

    <EmptyState v-else-if="vazio" icon="fas fa-inbox" :title="emptyTitle" :description="emptyText" class="my-10" />

    <ul v-else class="flex-1 overflow-y-auto divide-y divide-line">
      <li v-for="m in messages" :key="m.id">
        <button
          type="button"
          @click="emit('open', m)"
          class="w-full text-left px-3 sm:px-4 py-3 min-h-[3.25rem] flex gap-3 transition-colors group"
          :class="[
            m.id === selectedId ? 'bg-accent-soft' : 'hover:bg-surface-hover',
            m.isRead ? '' : 'bg-surface-raised',
          ]">

          <!-- Marca de não lido: barra, não bolinha, para funcionar no escuro -->
          <span class="w-1 rounded-full shrink-0 self-stretch"
            :class="m.isRead ? 'bg-transparent' : 'bg-accent'"></span>

          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <span class="truncate text-sm min-w-0 flex-1"
                :class="m.isRead ? 'text-ink-muted' : 'text-ink font-semibold'">
                {{ m.from?.name || m.from?.email || '(sem remetente)' }}
              </span>
              <span class="text-micro text-ink-subtle shrink-0 tabular-nums">{{ quando(m.receivedAt || m.sentAt) }}</span>
            </div>

            <p class="truncate text-sm mt-0.5"
              :class="m.isRead ? 'text-ink-muted' : 'text-ink font-medium'">
              {{ m.subject }}
            </p>

            <p class="truncate text-xs text-ink-subtle mt-0.5">{{ m.preview }}</p>

            <div v-if="m.hasAttachments || m.flagged || m.categories?.length"
              class="flex items-center gap-2 mt-1.5 flex-wrap">
              <i v-if="m.hasAttachments" class="fas fa-paperclip text-micro text-ink-subtle"></i>
              <i v-if="m.flagged" class="fas fa-flag text-micro text-data-warn"></i>
              <span v-for="c in (m.categories || []).slice(0, 2)" :key="c"
                class="text-micro px-1.5 py-0.5 rounded-full bg-surface-sunken text-ink-muted truncate max-w-[8rem]">
                {{ c }}
              </span>
            </div>
          </div>

          <!-- Ações rápidas: aparecem no hover no desktop, sempre no toque -->
          <div v-if="canOrganize"
            class="flex flex-col justify-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <span role="button" tabindex="0"
              @click.stop="emit('flag', m)" @keydown.enter.stop="emit('flag', m)"
              class="h-9 w-9 grid place-items-center rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer"
              :class="m.flagged ? 'text-data-warn' : 'text-ink-subtle'"
              :aria-label="m.flagged ? 'Tirar o sinalizador' : 'Sinalizar'">
              <i class="fas fa-flag text-xs"></i>
            </span>
            <span role="button" tabindex="0"
              @click.stop="emit('delete', m)" @keydown.enter.stop="emit('delete', m)"
              class="h-9 w-9 grid place-items-center rounded-lg text-ink-subtle hover:text-data-neg hover:bg-surface-sunken transition-colors cursor-pointer"
              aria-label="Excluir">
              <i class="fas fa-trash text-xs"></i>
            </span>
          </div>
        </button>
      </li>

      <li v-if="hasMore" class="p-3">
        <Button variant="ghost" block :loading="loading" @click="emit('more')">
          Carregar mais
        </Button>
      </li>
    </ul>
  </div>
</template>
