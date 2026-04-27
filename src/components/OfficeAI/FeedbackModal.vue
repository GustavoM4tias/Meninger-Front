<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  rating: { type: String, default: null }, // 'up' | 'down'
})

const emit = defineEmits(['confirm', 'close'])

const comment = ref('')

watch(() => props.open, (v) => {
  if (v) comment.value = ''
})

function confirm() {
  emit('confirm', { comment: comment.value.trim() || null })
  comment.value = ''
}

function close() {
  emit('close')
  comment.value = ''
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        @click.self="close">
        <div class="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-lg"
              :class="rating === 'up' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'">
              <i :class="rating === 'up' ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down'" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-200">
                {{ rating === 'up' ? 'O que foi bom?' : 'O que pode melhorar?' }}
              </p>
              <p class="text-xs text-gray-500">Opcional — ajuda a melhorar o Eme</p>
            </div>
          </div>

          <textarea v-model="comment" rows="3" placeholder="Escreva um comentário... (opcional)"
            class="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none transition focus:outline-none focus:ring-1 focus:ring-white/5 focus:border-slate-600"
             />

          <div class="flex gap-2 justify-end">
            <button @click="close"
              class="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition">
              Cancelar
            </button>
            <button @click="confirm" class="px-4 py-2 rounded-xl text-sm font-medium transition"
              :class="rating === 'up' ? 'bg-green-600/80 hover:bg-green-600 text-white' : 'bg-red-600/80 hover:bg-red-600 text-white'">
              Enviar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
