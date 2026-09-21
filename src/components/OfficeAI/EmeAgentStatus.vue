<script setup>
// Timeline do agente durante o streaming: o que a Eme está fazendo agora
// (fase do preparo / consultando <tool> / pensando / escrevendo), passos já
// concluídos, tempo decorrido e cancelamento. Substitui o "..." mudo que
// ficava pulsando sem nenhuma explicação enquanto as tools rodavam.
//
// O rótulo em si vem de useEmeStatusLabel, o mesmo da bolinha fechada.
import { computed } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import { useEmeStatusLabel } from '@/composables/useEmeStatusLabel'
import { ehEscrita } from '@/utils/OfficeAI/toolKind'
import EmeStatusLabel from './EmeStatusLabel.vue'

defineProps({
  compact: { type: Boolean, default: false },
})

const aiStore = useOfficeAIStore()
const { elapsed, finishedSteps, currentLabel } = useEmeStatusLabel()

// Cancelar aparece depois de alguns segundos — antes disso só polui.
const showCancel = computed(() => elapsed.value >= 8)
</script>

<template>
  <div class="space-y-1.5 min-w-0" :class="compact ? 'text-xs' : 'text-sm'">
    <!-- Passos concluídos (entram deslizando, um por um) -->
    <TransitionGroup v-if="finishedSteps.length" name="eme-step" tag="div" class="space-y-1.5">
    <div v-for="(s, i) in finishedSteps" :key="i"
      class="flex items-center gap-2 text-xs text-ink-subtle min-w-0">
      <i class="shrink-0"
        :class="s.status === 'error'
          ? 'fas fa-circle-exclamation text-data-warn'
          : ehEscrita(s.name) ? 'fas fa-bolt text-accent' : 'fas fa-circle-check text-data-pos'" />
      <span class="truncate">{{ s.label }}<span v-if="s.detalhe" class="opacity-70"> · {{ s.detalhe }}</span></span>
      <span v-if="s.ms != null" class="shrink-0 font-mono text-micro opacity-70">
        {{ (s.ms / 1000).toFixed(1) }}s
      </span>
    </div>
    </TransitionGroup>

    <!-- Etapa atual + cronômetro + cancelar -->
    <div class="flex items-center gap-2 text-ink-muted min-w-0">
      <span class="relative flex h-2.5 w-2.5 shrink-0">
        <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping"></span>
        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent"></span>
      </span>
      <EmeStatusLabel :label="currentLabel" class="flex-1" />
      <span class="shrink-0 font-mono text-micro text-ink-subtle">{{ elapsed }}s</span>
      <button v-if="showCancel" type="button" @click="aiStore.cancelStream()"
        class="shrink-0 ml-1 text-micro text-ink-subtle hover:text-data-neg underline underline-offset-2 transition-colors">
        cancelar
      </button>
    </div>

    <!-- Conexão instável (watchdog: sem bytes do servidor há 45s+) -->
    <p v-if="aiStore.streamStale"
      class="flex items-start gap-1.5 text-micro text-data-warn">
      <i class="fas fa-triangle-exclamation mt-0.5 shrink-0"></i>
      <span>A resposta está demorando mais que o normal (conexão instável). Você pode aguardar ou cancelar.</span>
    </p>
  </div>
</template>

<style scoped>
/* Passo concluído entra deslizando da esquerda. */
.eme-step-enter-active { transition: opacity .25s ease, transform .25s ease; }
.eme-step-enter-from   { opacity: 0; transform: translateX(-6px); }
</style>
