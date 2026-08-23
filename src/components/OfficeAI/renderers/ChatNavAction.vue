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
  <div class="flex items-center gap-3 py-2 px-3 rounded-xl bg-accent/10 border border-accent/25  mt-2">
    <i class="fas fa-arrow-up-right-from-square text-xs text-accent" />
    <span class="text-sm text-accent flex-1">{{ action.message || 'Abrir página' }}</span>
    <button
      @click="open"
      class="text-xs text-accent hover:text-accent  font-medium transition"
    >
      Abrir
    </button>
  </div>
</template>
