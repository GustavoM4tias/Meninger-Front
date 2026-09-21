<script setup>
// Timeline do agente durante o streaming: o que a Eme está fazendo agora
// (pensando / consultando <tool> / escrevendo), passos já concluídos, tempo
// decorrido e cancelamento. Substitui o "..." mudo que ficava pulsando sem
// nenhuma explicação enquanto as tools rodavam.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import { verboDoPasso, ehEscrita } from '@/utils/OfficeAI/toolKind'

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

// Enquanto o modelo pensa não chega evento nenhum do servidor. Um rótulo
// parado por 20 s parece sistema travado; o texto gira a cada poucos
// segundos (como o "Pondering…/Cogitating…" do Claude Code) para mostrar
// que segue vivo. Só frases que descrevem o que o modelo faz de fato.
const FRASES_PENSANDO = ['Pensando…', 'Interpretando a pergunta…', 'Organizando o raciocínio…', 'Decidindo o próximo passo…']
const FRASES_ANALISANDO = ['Analisando os dados…', 'Cruzando os resultados…', 'Decidindo o próximo passo…']
const GIRO_MS = 4000
const gira = (frases) => frases[Math.floor((now.value - (aiStore.streamStartedAt || now.value)) / GIRO_MS) % frases.length]

const currentLabel = computed(() => {
  const s = runningStep.value
  if (s) {
    if (s.verbatim) return s.label
    // "Executando editar reunião · Sinop → 08:50" em vez de só a ferramenta.
    return `${verboDoPasso(s.name)} ${s.label}${s.detalhe ? ` · ${s.detalhe}` : ''}…`
  }
  if (aiStore.streamingText) return 'Escrevendo a resposta…'
  // Preparo no servidor (sessão, cérebro, histórico) - fase real, vinda do SSE.
  if (aiStore.agentPhase) return aiStore.agentPhase
  if (finishedSteps.value.length) return gira(FRASES_ANALISANDO)
  return gira(FRASES_PENSANDO)
})

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
      <!-- Rótulo troca com saída/entrada (out-in) e um brilho varre o texto -->
      <span class="relative min-w-0 flex-1 overflow-hidden">
        <Transition name="eme-label" mode="out-in">
          <span :key="currentLabel" class="eme-shimmer animate-shimmer block truncate">{{ currentLabel }}</span>
        </Transition>
      </span>
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
/* Troca de rótulo: o antigo sobe e some, o novo entra de baixo. */
.eme-label-enter-active { transition: opacity .22s ease, transform .22s ease; }
.eme-label-leave-active { transition: opacity .16s ease, transform .16s ease; }
.eme-label-enter-from   { opacity: 0; transform: translateY(6px); }
.eme-label-leave-to     { opacity: 0; transform: translateY(-6px); }

/* Passo concluído entra deslizando da esquerda. */
.eme-step-enter-active { transition: opacity .25s ease, transform .25s ease; }
.eme-step-enter-from   { opacity: 0; transform: translateX(-6px); }

/* Brilho preso ao texto (background-clip), nunca véu sobre a tela: mostra
   movimento contínuo mesmo quando a frase fica a mesma por segundos. */
.eme-shimmer {
  color: transparent;
  background-image: linear-gradient(
    90deg,
    rgb(var(--ink-muted)) 0%,
    rgb(var(--ink-muted)) 40%,
    rgb(var(--accent)) 50%,
    rgb(var(--ink-muted)) 60%,
    rgb(var(--ink-muted)) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
