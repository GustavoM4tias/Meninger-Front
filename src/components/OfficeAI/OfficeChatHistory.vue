<script setup>
import { onMounted, computed } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'
dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const aiStore = useOfficeAIStore()

onMounted(() => {
  aiStore.loadSessions()
  aiStore.loadStorageUsage()
})

const favoriteSessions = computed(() => aiStore.sessions.filter(s => s.is_favorited))
const recentSessions = computed(() => aiStore.sessions.filter(s => !s.is_favorited))

function open(id) {
  aiStore.loadMessages(id)
  aiStore.historyOpen = false
}

function fromNow(d) {
  return dayjs(d).fromNow()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3">
      <span class="font-medium text-gray-800 dark:text-gray-200 text-sm">Histórico de chats</span>
      <button @click="aiStore.historyOpen = false" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
        <i class="fas fa-xmark" />
      </button>
    </div>

    <!-- Uso de armazenamento -->
    <div v-if="aiStore.storageUsage" class="px-4 py-2.5">
      <div class="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>Armazenamento</span>
        <span>{{ aiStore.storageUsage.used_mb }} / 20 MB</span>
      </div>
      <div class="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="aiStore.storageUsage.percent >= 90 ? 'bg-orange-500' : 'bg-blue-500'"
          :style="{ width: `${aiStore.storageUsage.percent}%` }"
        />
      </div>
    </div>

    <!-- Lista de sessões -->
    <div class="flex-1 overflow-y-auto py-2">
      <!-- Favoritos -->
      <template v-if="favoriteSessions.length">
        <p class="px-4 py-1.5 text-xs text-gray-400 dark:text-gray-600 uppercase tracking-wide">Favoritos</p>
        <div
          v-for="s in favoriteSessions"
          :key="s.id"
          class="group flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer rounded-lg mx-2 transition"
        >
          <div class="flex-1 min-w-0" @click="open(s.id)">
            <p class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ s.title || 'Chat sem título' }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-600">{{ fromNow(s.updated_at) }}</p>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button @click.stop="aiStore.favoriteSession(s.id)" class="p-1 rounded hover:text-yellow-400 text-gray-400 dark:text-gray-500 transition">
              <i class="fas fa-star text-xs text-yellow-400" />
            </button>
            <button @click.stop="aiStore.deleteSession(s.id)" class="p-1 rounded hover:text-red-400 text-gray-400 dark:text-gray-500 transition">
              <i class="far fa-trash-can text-xs" />
            </button>
          </div>
        </div>
      </template>

      <!-- Recentes -->
      <template v-if="recentSessions.length">
        <p class="px-4 py-1.5 text-xs text-gray-400 dark:text-gray-600 uppercase tracking-wide mt-1">Recentes</p>
        <div
          v-for="s in recentSessions"
          :key="s.id"
          class="group flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer rounded-lg mx-2 transition"
        >
          <div class="flex-1 min-w-0" @click="open(s.id)">
            <p class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ s.title || 'Chat sem título' }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-600">{{ fromNow(s.updated_at) }}</p>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button @click.stop="aiStore.favoriteSession(s.id)" class="p-1 rounded hover:text-yellow-400 text-gray-400 dark:text-gray-500 transition">
              <i class="far fa-star text-xs" />
            </button>
            <button @click.stop="aiStore.deleteSession(s.id)" class="p-1 rounded hover:text-red-400 text-gray-400 dark:text-gray-500 transition">
              <i class="far fa-trash-can text-xs" />
            </button>
          </div>
        </div>
      </template>

      <div v-if="!aiStore.sessions.length" class="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-600 text-sm gap-2">
        <i class="far fa-comments text-2xl" />
        <span>Nenhum chat ainda</span>
      </div>
    </div>

    <!-- Novo chat -->
    <div class="px-4 py-3 border-t border-gray-100 dark:border-white/5">
      <button
        @click="aiStore.newSession(); aiStore.historyOpen = false"
        class="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-sm text-gray-600 dark:text-gray-300 transition"
      >
        <i class="fas fa-plus" />
        Novo chat
      </button>
    </div>
  </div>
</template>
