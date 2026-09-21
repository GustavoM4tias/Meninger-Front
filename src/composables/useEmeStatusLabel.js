// composables/useEmeStatusLabel.js
//
// "O que a Eme está fazendo agora", em uma frase. É a mesma frase na linha do
// tempo dentro do chat (EmeAgentStatus) e na bolinha fechada (OfficeChatFloat):
// antes cada um tinha a sua, e a bolinha dizia "Eme está pensando…" enquanto o
// chat já sabia que ela estava consultando reservas.
//
// Ordem de quem manda no rótulo:
//   1. tool em execução (tool_start)         "Consultando reservas · Sinop…"
//   2. texto chegando                         "Escrevendo a resposta…"
//   3. fase real vinda do servidor (phase)    "Lendo o histórico…",
//                                             "Aguardando gemini-2.5-flash…",
//                                             "Reservas devolveu 37 registros…"
//   4. "Pensando…" só se o servidor ainda não disse nada
//
// Sem frase inventada girando: tudo que aparece aqui é um estado real do
// turno. Quem quiser mais detalhe põe mais `fase(...)` no OfficeChatService.
import { computed, ref, watch, onUnmounted } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import { verboDoPasso } from '@/utils/OfficeAI/toolKind'

export function useEmeStatusLabel() {
  const aiStore = useOfficeAIStore()

  // Relógio de 1s só ENQUANTO a Eme responde. A bolinha vive em toda tela do
  // Office; um interval permanente ali seria um tique a cada segundo à toa.
  const now = ref(Date.now())
  let timer = null
  const parar = () => { clearInterval(timer); timer = null }
  watch(() => aiStore.isStreaming, (on) => {
    parar()
    if (on) { now.value = Date.now(); timer = setInterval(() => { now.value = Date.now() }, 1000) }
  }, { immediate: true })
  onUnmounted(parar)

  const elapsed = computed(() => (
    aiStore.streamStartedAt ? Math.max(0, Math.round((now.value - aiStore.streamStartedAt) / 1000)) : 0
  ))

  const runningStep = computed(() => aiStore.agentSteps.find(s => s.status === 'running'))
  const finishedSteps = computed(() => aiStore.agentSteps.filter(s => s.status !== 'running'))

  const currentLabel = computed(() => {
    const s = runningStep.value
    if (s) {
      if (s.verbatim) return s.label
      // "Executando editar reunião · Sinop → 08:50" em vez de só a ferramenta.
      return `${verboDoPasso(s.name)} ${s.label}${s.detalhe ? ` · ${s.detalhe}` : ''}…`
    }
    if (aiStore.streamingText) return 'Escrevendo a resposta…'
    if (aiStore.agentPhase) return aiStore.agentPhase
    return 'Pensando…'
  })

  return { now, elapsed, runningStep, finishedSteps, currentLabel }
}
