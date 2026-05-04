<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useOfficeAIStore } from '@/stores/officeAIStore';
import OfficeChatSession from './OfficeChatSession.vue';
import OfficeChatHistory from './OfficeChatHistory.vue';
import ChatTitleEditor from './ChatTitleEditor.vue';
import IconButton from '@/components/UI/IconButton.vue';

const aiStore = useOfficeAIStore();
const router = useRouter();
const expanded = ref(false);

function onEmeNavigate(e) {
  const { route, filters } = e.detail;
  if (aiStore.mode === 'home') aiStore.minimize();
  router.push({ path: route, query: filters || {} });
}

onMounted(() => {
  window.addEventListener('eme:navigate', onEmeNavigate);
  aiStore.loadStorageUsage();
});
onUnmounted(() => window.removeEventListener('eme:navigate', onEmeNavigate));

function toggleExpand() { expanded.value = !expanded.value; }

function backToHome() {
  aiStore.setMode('home');
  router.push('/');
}

function rename(title) { aiStore.renameSession(title); }
</script>

<template>
  <Teleport to="body">
    <Transition name="float-slide">
      <div
        v-if="aiStore.mode === 'floating'"
        class="fixed bottom-5 right-5 z-50 flex flex-col"
        :class="expanded ? 'w-80 sm:w-96 h-[32rem]' : 'w-auto h-auto'"
      >
        <!-- Modo expandido -->
        <div v-if="expanded"
          class="flex flex-col h-full bg-surface-overlay border border-line rounded-2xl shadow-overlay overflow-hidden">

          <!-- Header -->
          <div class="flex items-center gap-1.5 px-3 py-2 border-b border-line bg-surface-raised">
            <img src="/Mlogo.png" class="h-4 flex-shrink-0 invert dark:invert-0" alt="Eme" />

            <div class="flex-1 min-w-0">
              <ChatTitleEditor v-if="aiStore.currentSessionId"
                :title="aiStore.currentSessionTitle" @rename="rename" />
              <span v-else class="text-xs text-ink-muted">Eme</span>
            </div>

            <IconButton icon="fas fa-edit" size="sm" label="Novo chat" @click="aiStore.newSession()" />
            <IconButton icon="fas fa-clock-rotate-left" size="sm" label="Histórico"
              @click="aiStore.historyOpen = !aiStore.historyOpen" />
            <IconButton icon="fas fa-up-right-and-down-left-from-center" size="sm" label="Voltar à home"
              @click="backToHome" />
            <IconButton icon="fas fa-minus" size="sm" label="Minimizar"
              @click="expanded = false" />
          </div>

          <!-- Histórico overlay -->
          <transition
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0">
            <div v-if="aiStore.historyOpen"
              class="absolute inset-0 top-[44px] bg-surface-overlay z-10 rounded-b-2xl overflow-hidden">
              <OfficeChatHistory />
            </div>
          </transition>

          <OfficeChatSession :compact="true" class="flex-1 min-h-0" />
        </div>

        <!-- Modo pill -->
        <div v-else class="flex items-end gap-2">
          <!-- Preview de streaming -->
          <Transition name="fade">
            <div v-if="aiStore.isStreaming && aiStore.streamingText"
              class="max-w-56 bg-surface-overlay border border-line rounded-2xl rounded-br-sm
                     px-3 py-2 text-xs text-ink shadow-elevated mb-2">
              <p class="line-clamp-2">{{ aiStore.streamingText }}</p>
              <span class="inline-block w-1.5 h-3 ml-0.5 bg-accent animate-pulse rounded-sm align-middle"></span>
            </div>
          </Transition>

          <!-- Botão circular com glow -->
          <button @click="toggleExpand"
            class="group relative h-14 w-14 rounded-full bg-surface-overlay border border-line shadow-overlay
                   flex items-center justify-center
                   hover:scale-110 active:scale-95 transition-transform">
            <span class="absolute inset-0 rounded-full bg-accent/20 blur-xl
                         opacity-0 group-hover:opacity-100 transition-opacity"></span>
            <img src="/Mlogo.png" class="h-7 invert dark:invert-0 relative" alt="Eme" />
            <span v-if="aiStore.isStreaming"
              class="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping"></span>
              <span class="relative inline-flex h-3 w-3 rounded-full bg-accent ring-2 ring-surface"></span>
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.float-slide-enter-active,
.float-slide-leave-active {
  transition: all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.float-slide-enter-from,
.float-slide-leave-to {
  transform: translateY(2rem) scale(0.9);
  opacity: 0;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
