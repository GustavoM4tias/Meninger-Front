<script setup>
// Timeline do agente durante o streaming: o que a Eme está fazendo agora
// (pensando / consultando <tool> / escrevendo), passos já concluídos, tempo
// decorrido e cancelamento. Substitui o "..." mudo que ficava pulsando sem
// nenhuma explicação enquanto as tools rodavam.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'

defineProps({
  compact: { type: Boolean, default: false },
})

const aiStore = useOfficeAIStore()

// Relógio de 1s só enquanto o componente existe (ele é montado apenas durante
// o streaming, então o interval não vaza para o resto da aplicação).
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(timer))

const elapsed = computed(() => (
  aiStore.streamStartedAt ? Math.max(0, Math.round((now.value - aiStore.streamStartedAt) / 1000)) : 0
))

const runningStep = computed(() => aiStore.agentSteps.find(s => s.status === 'running'))
const finishedSteps = computed(() => aiStore.agentSteps.filter(s => s.status !== 'running'))

const currentLabel = computed(() => {
  if (runningStep.value) return `Consultando ${runningStep.value.label}…`
  if (aiStore.streamingText) return 'Escrevendo a resposta…'
  if (finishedSteps.value.length) return 'Analisando os dados…'
  return 'Pensando…'
})

// Cancelar aparece depois de alguns segundos — antes disso só polui.
const showCancel = computed(() => elapsed.value >= 8)
</script>

<template>
  <div class="space-y-1.5 min-w-0" :class="compact ? 'text-xs' : 'text-sm'">
    <!-- Passos concluídos -->
    <div v-for="(s, i) in finishedSteps" :key="i"
      class="flex items-center gap-2 text-xs text-ink-subtle min-w-0">
      <i class="shrink-0"
        :class="s.status === 'error'
          ? 'fas fa-circle-exclamation text-amber-500'
          : 'fas fa-circle-check text-emerald-500'" />
      <span class="truncate">{{ s.label }}</span>
      <span v-if="s.ms != null" class="shrink-0 font-mono text-[10px] opacity-70">
        {{ (s.ms / 1000).toFixed(1) }}s
      </span>
    </div>

    <!-- Etapa atual + cronômetro + cancelar -->
    <div class="flex items-center gap-2 text-ink-muted min-w-0">
      <span class="relative flex h-2.5 w-2.5 shrink-0">
        <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping"></span>
        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent"></span>
      </span>
      <span class="truncate">{{ currentLabel }}</span>
      <span class="shrink-0 font-mono text-[11px] text-ink-subtle">{{ elapsed }}s</span>
      <button v-if="showCancel" type="button" @click="aiStore.cancelStream()"
        class="shrink-0 ml-1 text-[11px] text-ink-subtle hover:text-red-500 underline underline-offset-2 transition-colors">
        cancelar
      </button>
    </div>

    <!-- Conexão instável (watchdog: sem bytes do servidor há 45s+) -->
    <p v-if="aiStore.streamStale"
      class="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
      <i class="fas fa-triangle-exclamation mt-0.5 shrink-0"></i>
      <span>A resposta está demorando mais que o normal (conexão instável). Você pode aguardar ou cancelar.</span>
    </p>
  </div>
</template>
