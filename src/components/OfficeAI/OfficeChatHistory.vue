<script setup>
import { onMounted, computed } from 'vue';
import { useOfficeAIStore } from '@/stores/officeAIStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const aiStore = useOfficeAIStore();

onMounted(() => {
  aiStore.loadSessions();
  aiStore.loadStorageUsage();
});

const favoriteSessions = computed(() => aiStore.sessions.filter(s => s.is_favorited));
const recentSessions = computed(() => aiStore.sessions.filter(s => !s.is_favorited));

function open(id) {
  aiStore.loadMessages(id);
  aiStore.historyOpen = false;
}

function fromNow(d) { return dayjs(d).fromNow(); }

const storagePercent = computed(() => aiStore.storageUsage?.percent ?? 0);
const storageColor = computed(() =>
  storagePercent.value >= 90 ? 'bg-red-500' :
  storagePercent.value >= 70 ? 'bg-amber-500' :
  'bg-accent'
);
</script>

<template>
  <div class="flex flex-col h-full -m-5">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-line">
      <div class="flex items-center gap-2">
        <i class="far fa-clock text-accent text-sm"></i>
        <span class="text-sm font-semibold text-ink">Histórico de chats</span>
      </div>
      <IconButton icon="fas fa-xmark" size="sm" label="Fechar"
        @click="aiStore.historyOpen = false" />
    </div>

    <!-- Uso de armazenamento -->
    <div v-if="aiStore.storageUsage" class="px-4 py-3 border-b border-line">
      <div class="flex justify-between items-center text-xs mb-1.5">
        <span class="text-ink-muted flex items-center gap-1.5">
          <i class="fas fa-database text-[10px]"></i>
          Armazenamento
        </span>
        <span class="font-mono text-ink">
          {{ aiStore.storageUsage.used_mb }}<span class="text-ink-subtle"> / 20 MB</span>
        </span>
      </div>
      <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
        <div class="h-full rounded-full transition-all duration-700 ease-out-expo"
          :class="storageColor"
          :style="{ width: `${storagePercent}%` }">
        </div>
      </div>
    </div>

    <!-- Lista de sessões -->
    <div class="flex-1 overflow-y-auto py-2 max-h-[50vh]">
      <!-- Favoritos -->
      <template v-if="favoriteSessions.length">
        <p class="px-4 py-1.5 text-[10px] text-ink-subtle uppercase tracking-[0.18em] font-mono">Favoritos</p>
        <transition-group
          enter-active-class="transition ease-out-expo duration-300"
          enter-from-class="opacity-0 -translate-x-2"
          enter-to-class="opacity-100 translate-x-0">
          <div v-for="s in favoriteSessions" :key="s.id"
            class="group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer
                   hover:bg-accent-soft/40 transition-colors">
            <div class="flex-1 min-w-0" @click="open(s.id)">
              <p class="text-sm text-ink truncate">{{ s.title || 'Chat sem título' }}</p>
              <p class="text-[11px] text-ink-subtle font-mono">{{ fromNow(s.updated_at) }}</p>
            </div>
            <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.stop="aiStore.favoriteSession(s.id)"
                class="h-7 w-7 grid place-items-center rounded-md text-amber-400 hover:bg-amber-400/10 transition-colors">
                <i class="fas fa-star text-xs"></i>
              </button>
              <button @click.stop="aiStore.deleteSession(s.id)"
                class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <i class="far fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>
        </transition-group>
      </template>

      <!-- Recentes -->
      <template v-if="recentSessions.length">
        <p class="px-4 py-1.5 text-[10px] text-ink-subtle uppercase tracking-[0.18em] font-mono mt-1">Recentes</p>
        <transition-group
          enter-active-class="transition ease-out-expo duration-300"
          enter-from-class="opacity-0 -translate-x-2"
          enter-to-class="opacity-100 translate-x-0">
          <div v-for="s in recentSessions" :key="s.id"
            class="group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer
                   hover:bg-accent-soft/40 transition-colors">
            <div class="flex-1 min-w-0" @click="open(s.id)">
              <p class="text-sm text-ink truncate">{{ s.title || 'Chat sem título' }}</p>
              <p class="text-[11px] text-ink-subtle font-mono">{{ fromNow(s.updated_at) }}</p>
            </div>
            <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.stop="aiStore.favoriteSession(s.id)"
                class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-amber-400 hover:bg-amber-400/10 transition-colors">
                <i class="far fa-star text-xs"></i>
              </button>
              <button @click.stop="aiStore.deleteSession(s.id)"
                class="h-7 w-7 grid place-items-center rounded-md text-ink-subtle hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <i class="far fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>
        </transition-group>
      </template>

      <!-- Empty state -->
      <div v-if="!aiStore.sessions.length"
        class="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
        <div class="h-12 w-12 rounded-2xl bg-surface-sunken border border-line grid place-items-center mb-1">
          <i class="far fa-comments text-ink-subtle text-lg"></i>
        </div>
        <p class="text-sm text-ink-muted">Nenhum chat ainda</p>
        <p class="text-xs text-ink-subtle">Suas conversas com o Eme aparecem aqui</p>
      </div>
    </div>

    <!-- Novo chat -->
    <div class="px-4 py-3 border-t border-line">
      <Button block variant="secondary" icon="fas fa-plus"
        @click="aiStore.newSession(); aiStore.historyOpen = false">
        Novo chat
      </Button>
    </div>
  </div>
</template>
