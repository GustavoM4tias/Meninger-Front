<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  action: { type: Object, required: true }, // { type: 'navigate', route, filters, message }
})

const router = useRouter()

function open() {
  if (!props.action?.route) return
  router.push({ path: props.action.route, query: props.action.filters || {} })
}
</script>

<template>
  <div class="flex items-center gap-3 py-2 px-3 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 mt-2">
    <i class="fas fa-arrow-up-right-from-square text-xs text-blue-500 dark:text-blue-400" />
    <span class="text-sm text-blue-700 dark:text-blue-300 flex-1">{{ action.message || 'Abrir página' }}</span>
    <button
      @click="open"
      class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition"
    >
      Abrir
    </button>
  </div>
</template>
