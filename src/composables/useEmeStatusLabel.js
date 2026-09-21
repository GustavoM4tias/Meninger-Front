// composables/useEmeStatusLabel.js
//
// "O que a Eme está fazendo agora", em uma frase. É a mesma frase na linha do
// tempo dentro do chat (EmeAgentStatus) e na bolinha fechada (OfficeChatFloat):
// antes cada um tinha a sua, e a bolinha dizia "Eme está pensando…" enquanto o
// chat já sabia que ela estava consultando reservas.
//
// Ordem de quem manda no rótulo:
//   1. tool em execução (tool_start)            "Consultando reservas · Sinop…"
//   2. fase real do preparo no servidor (phase)  "Lendo o histórico da conversa…"
//   3. frases que giram enquanto o modelo pensa  "Pensando… / Interpretando…"
//
// Enquanto o modelo pensa não chega evento nenhum. Um rótulo parado por 20 s
// parece sistema travado; o texto gira a cada poucos segundos (como o
// "Pondering…/Cogitating…" do Claude Code) para mostrar que segue vivo. Só
// frases que descrevem o que o modelo faz de fato.
import { computed, ref, watch, onUnmounted } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import { verboDoPasso } from '@/utils/OfficeAI/toolKind'

const FRASES_PENSANDO = ['Pensando…', 'Interpretando a pergunta…', 'Organizando o raciocínio…', 'Decidindo o próximo passo…']
const FRASES_ANALISANDO = ['Analisando os dados…', 'Cruzando os resultados…', 'Decidindo o próximo passo…']
const GIRO_MS = 2500

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

  const gira = (frases) => frases[Math.floor((now.value - (aiStore.streamStartedAt || now.value)) / GIRO_MS) % frases.length]

  const currentLabel = computed(() => {
    const s = runningStep.value
    if (s) {
      if (s.verbatim) return s.label
      // "Executando editar reunião · Sinop → 08:50" em vez de só a ferramenta.
      return `${verboDoPasso(s.name)} ${s.label}${s.detalhe ? ` · ${s.detalhe}` : ''}…`
    }
    if (aiStore.streamingText) return 'Escrevendo a resposta…'
    if (aiStore.agentPhase) return aiStore.agentPhase
    if (finishedSteps.value.length) return gira(FRASES_ANALISANDO)
    return gira(FRASES_PENSANDO)
  })

  return { now, elapsed, runningStep, finishedSteps, currentLabel }
}
