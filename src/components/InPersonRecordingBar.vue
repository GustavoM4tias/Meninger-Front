<template>
  <Teleport to="body">
    <Transition name="rec-bar">
      <div v-if="store.isActive && !isOnRecordingPage"
        class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9998] w-auto max-w-sm"
        style="filter: drop-shadow(0 8px 24px rgba(109,40,217,0.35))">
        <div
          class="flex items-center gap-4 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-900 to-purple-900 border border-violet-500/40 backdrop-blur-xl cursor-pointer select-none"
          @click="router.push('/microsoft/inperson/recording')">

          <!-- Indicador de gravação -->
          <div class="relative flex-shrink-0">
            <div class="absolute w-6 h-6 rounded-full bg-red-500/30 animate-ping" />
            <div class="relative w-6 h-6 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-red-500"></div>
            </div>
          </div>

          <!-- Info -->
          <div class="min-w-0">
            <p class="text-xs font-semibold text-white truncate max-w-[160px]">{{ store.title }}</p>
            <p class="text-[10px] text-violet-300/70 uppercase tracking-wider">
              {{ store.isPaused ? 'pausado' : 'gravando' }}
            </p>
          </div>

          <!-- Timer -->
          <span class="font-mono text-base font-bold text-white tabular-nums flex-shrink-0">
            {{ store.timerDisplay }}
          </span>

          <!-- Ação rápida: pausar/retomar -->
          <button
            @click.stop="store.isPaused ? store.resume() : store.pause()"
            class="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
            :title="store.isPaused ? 'Retomar' : 'Pausar'">
            <i class="fas text-xs text-white" :class="store.isPaused ? 'fa-play' : 'fa-pause'"></i>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInPersonRecordingStore } from '@/stores/Microsoft/inPersonRecording';

const store  = useInPersonRecordingStore();
const route  = useRoute();
const router = useRouter();

const isOnRecordingPage = computed(() => route.name === 'InPersonRecording');
</script>

<style scoped>
.rec-bar-enter-active { transition: opacity 0.3s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.rec-bar-leave-active { transition: opacity 0.2s, transform 0.2s ease-in; }
.rec-bar-enter-from  { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.9); }
.rec-bar-leave-to    { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.9); }
</style>
