import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getSessions,
  getSessionMessages,
  renameSession as apiRenameSession,
  toggleFavoriteSession,
  removeSession,
  getStorageUsage,
  submitFeedback,
} from '@/utils/OfficeAI/apiOfficeChat'
import API_URL from '@/config/apiUrl'
import { emeScreenSnapshot, limparReferencias } from '@/composables/useEmeScreenContext'

export const useOfficeAIStore = defineStore('officeAI', () => {
  // ── Estado ────────────────────────────────────────────────────────────────
  const mode = ref('hidden')         // 'home' | 'floating' | 'hidden'
  const sessions = ref([])
  const currentSessionId = ref(null)
  const messages = ref([])
  const isStreaming = ref(false)
  const streamingText = ref('')
  const pendingAction = ref(null)
  const pendingWarning = ref(null)
  const storageUsage = ref(null)
  const historyOpen = ref(false)

  // ── Transparência do agente ───────────────────────────────────────────────
  // O que a Eme está fazendo agora: passos de tool (tool_start/tool_result do
  // SSE), início do turno (cronômetro) e sinal de conexão instável (watchdog).
  const agentSteps = ref([])        // [{ name, label, status:'running'|'done'|'error', ms? }]
  const streamStartedAt = ref(null) // Date.now() do envio — cronômetro na UI
  const streamStale = ref(false)    // true = sem bytes do servidor há tempo demais
  let abortCtrl = null              // AbortController do fetch em andamento
  let cancelReason = null           // 'user' | 'timeout' — motivo do abort

  // Texto compartilhado da caixa de envio (permite pré-preencher de fora —
  // ex: botão "Criar via Eme" na página de alertas dispara eme:open com prompt)
  const composerDraft = ref('')
  function setDraft(text) { composerDraft.value = String(text || '') }

  // ── Computed ──────────────────────────────────────────────────────────────
  const isAtStorageLimit = computed(() => storageUsage.value?.percent >= 100)
  const hasSession = computed(() => !!currentSessionId.value)
  const currentSessionTitle = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value)?.title || ''
  )

  // ── Sessions ──────────────────────────────────────────────────────────────
  async function loadSessions() {
    try {
      const data = await getSessions()
      sessions.value = data.sessions
    } catch { /* silencioso */ }
  }

  async function loadMessages(sessionId) {
    const data = await getSessionMessages(sessionId)
    currentSessionId.value = sessionId
    messages.value = data.messages.map(parseMessage)
  }

  function newSession() {
    currentSessionId.value = null
    messages.value = []
    streamingText.value = ''
    pendingAction.value = null
  }

  async function favoriteSession(id) {
    const data = await toggleFavoriteSession(id)
    const s = sessions.value.find(s => s.id === id)
    if (s) s.is_favorited = data.is_favorited
  }

  async function deleteSession(id) {
    await removeSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (currentSessionId.value === id) newSession()
  }

  // ── Storage ───────────────────────────────────────────────────────────────
  async function loadStorageUsage() {
    const data = await getStorageUsage()
    if (data) storageUsage.value = data
  }

  // ── Envio de mensagem com SSE streaming ───────────────────────────────────
  async function sendMessage(text, { viaVoice = false } = {}) {
    if (!text?.trim()) {
      console.warn('[officeAIStore] sendMessage ignorada — texto vazio')
      return
    }
    if (isStreaming.value) {
      console.warn('[officeAIStore] sendMessage ignorada — já está em streaming')
      return
    }

    console.log('[officeAIStore] → enviando:', text.slice(0, 80), viaVoice ? '(VOZ)' : '')

    messages.value.push({
      id: Date.now(),
      role: 'user',
      content: text,
      response_type: 'text',
      created_at: new Date(),
    })
    isStreaming.value = true
    streamingText.value = ''
    pendingAction.value = null
    agentSteps.value = []
    streamStartedAt.value = Date.now()
    streamStale.value = false
    cancelReason = null
    abortCtrl = new AbortController()

    // Watchdog: o servidor manda `: ping` a cada 15s mesmo sem conteúdo, então
    // silêncio prolongado = conexão/backend realmente mudos (não é "demora").
    // 45s sem bytes → avisa o usuário; 90s → encerra com mensagem clara em vez
    // de deixar o "..." pulsando para sempre com o composer travado.
    let lastByteAt = Date.now()
    const watchdog = setInterval(() => {
      const idle = Date.now() - lastByteAt
      if (idle > 90_000) {
        cancelReason = 'timeout'
        abortCtrl?.abort()
      } else if (idle > 45_000) {
        streamStale.value = true
      }
    }, 5_000)

    // Onde a pessoa está e o que ela marcou com Ctrl+clique. Tirado ANTES do
    // envio e limpo em seguida: a marcação vale para a pergunta que ela acabou
    // de fazer, não para o resto da conversa.
    const contextoTela = emeScreenSnapshot()
    limparReferencias()

    const t0 = performance.now()
    try {
      const response = await fetch(`${API_URL}/office-chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: text,
          session_id: currentSessionId.value,
          via_voice: viaVoice,
          // O backend trata isto como DADO, com teto de tamanho, nunca como
          // instrução: texto de tela pode conter qualquer coisa.
          screen: contextoTela,
        }),
        signal: abortCtrl.signal,
      })
      console.log('[officeAIStore] HTTP', response.status, 'em', Math.round(performance.now() - t0), 'ms')

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        console.error('[officeAIStore] erro HTTP:', response.status, err)
        if (err.code === 'STORAGE_LIMIT') {
          pushAssistantMessage('', 'error', { storageLimit: true })
        } else if (response.status === 429) {
          pushAssistantMessage(err.error || 'Limite de mensagens atingido. Aguarde um instante.', 'error', { rateLimit: true })
        } else {
          pushAssistantMessage(err.error || 'Erro ao processar sua mensagem. Tente novamente.', 'error')
        }
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lastByteAt = Date.now()
        streamStale.value = false

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (!raw) continue
          let evt
          try { evt = JSON.parse(raw) } catch { continue }
          handleSSEEvent(evt)
        }
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // Abort intencional (cancelar do usuário ou watchdog de conexão morta).
        console.warn('[officeAIStore] stream abortado:', cancelReason, '— após', Math.round(performance.now() - t0), 'ms')
        if (streamingText.value.trim()) {
          // Preserva o que já foi escrito, marcando que foi interrompido.
          const meta = pendingAction.value ? { action: pendingAction.value } : {}
          meta.interrupted = true
          pushAssistantMessage(streamingText.value, pendingAction.value?.type || 'text', meta)
        } else {
          pushAssistantMessage(
            cancelReason === 'timeout'
              ? 'A conexão com a Eme ficou sem resposta por muito tempo e foi encerrada. Tente novamente.'
              : 'Geração cancelada.',
            'error'
          )
        }
        streamingText.value = ''
      } else {
        console.error('[officeAIStore] SSE error:', err, '— após', Math.round(performance.now() - t0), 'ms')
        pushAssistantMessage('Erro de conexão. Tente novamente.', 'error')
      }
    } finally {
      console.log('[officeAIStore] ✓ streaming finalizado em', Math.round(performance.now() - t0), 'ms')
      clearInterval(watchdog)
      isStreaming.value = false
      streamStartedAt.value = null
      streamStale.value = false
      agentSteps.value = []
      abortCtrl = null
    }
  }

  // Cancela a geração em andamento (botão "cancelar" na timeline do agente).
  function cancelStream() {
    if (!isStreaming.value || !abortCtrl) return
    cancelReason = 'user'
    abortCtrl.abort()
  }

  function handleSSEEvent(evt) {
    switch (evt.type) {
      case 'chunk':
        streamingText.value += evt.text
        break

      case 'clear':
        // Texto emitido antes de uma tool call pode ter valores errados do treinamento — descarta
        streamingText.value = ''
        break

      case 'replace':
        // Backend pediu para substituir o texto atual (ex: pós-filtro removeu pseudo-tool-call leak)
        streamingText.value = evt.text || ''
        break

      case 'warning':
        // Validador anti-alucinação. `kind`: 'corrected' (a Eme reescreveu a
        // resposta com os dados reais) | 'blocked' (divergência persistiu e o
        // texto foi SUBSTITUÍDO pelos dados do banco) | 'unreliable'
        // (divergência sem dado autoritativo — entregue com alerta) |
        // undefined (avisos legados: MAX_TOKENS, filtro do modelo).
        // O ChatMessage escolhe a aparência por kind.
        pendingWarning.value = {
          kind: evt.kind || 'notice',
          corrected: !!evt.corrected,
          message: evt.message || 'Possível inconsistência na resposta.',
          details: evt.details || [],
        }
        break

      case 'status':
        // Etapa interna do agente sem tool associada (ex.: conferindo números).
        // `verbatim` = o label já é a frase completa (não vira "Consultando X").
        agentSteps.value.push({
          name: evt.stage || 'status',
          label: evt.message || 'Processando…',
          status: 'running',
          verbatim: true,
        })
        break

      case 'tool_start':
        // A Eme começou uma consulta — vira o passo "rodando" da timeline.
        agentSteps.value.push({
          name: evt.name,
          label: evt.label || evt.name,
          status: 'running',
        })
        break

      case 'tool_result': {
        const step = [...agentSteps.value].reverse().find(s => s.name === evt.name && s.status === 'running')
        if (step) {
          step.status = evt.ok === false ? 'error' : 'done'
          if (evt.ms != null) step.ms = evt.ms
        }
        break
      }

      case 'action':
        pendingAction.value = evt.action
        if (evt.action.type === 'navigate') {
          window.dispatchEvent(new CustomEvent('eme:navigate', { detail: evt.action }))
        }
        // open_alert_editor é renderizado inline no chat (ChatAlertEditor),
        // não dispara evento — o ChatMessage detecta via action.type.
        break

      case 'done':
        if (evt.sessionId) {
          currentSessionId.value = evt.sessionId
          if (!sessions.value.find(s => s.id === evt.sessionId)) loadSessions()
        }
        {
          // O backend pode mandar `action` explícita no done (ex.: null quando
          // suprimiu um card órfão de consulta plural) — ela tem a palavra
          // final. Sem o campo, vale o último `action` recebido (histórico).
          const finalAction = ('action' in evt) ? evt.action : pendingAction.value
          const meta = {}
          if (finalAction)          meta.action  = finalAction
          if (pendingWarning.value) meta.warning = pendingWarning.value
          // Passos de status (ex.: "conferindo números") não têm evento próprio
          // de conclusão — o done encerra o turno, então tudo vira concluído.
          agentSteps.value.forEach(s => { if (s.status === 'running') s.status = 'done' })
          if (agentSteps.value.length) meta.steps = agentSteps.value.map(s => ({ ...s }))
          if (streamStartedAt.value)   meta.elapsed_ms = Date.now() - streamStartedAt.value
          pushAssistantMessage(
            streamingText.value,
            finalAction?.type || 'text',
            meta
          )
        }
        // Replace temp Date.now() ID with the real DB UUID so feedback works
        if (evt.msgId) {
          const last = messages.value[messages.value.length - 1]
          if (last?.role === 'assistant') last.id = evt.msgId
        }
        streamingText.value = ''
        pendingAction.value = null
        pendingWarning.value = null
        agentSteps.value = []
        loadStorageUsage()
        break

      case 'error':
        pushAssistantMessage(
          evt.message || 'Erro desconhecido.',
          'error',
          evt.code === 'STORAGE_LIMIT' ? { storageLimit: true } : {}
        )
        streamingText.value = ''
        break
    }
  }

  function pushAssistantMessage(text, responseType = 'text', metadata = {}) {
    messages.value.push({
      id: Date.now(),
      role: 'assistant',
      content: text,
      response_type: responseType,
      metadata,
      created_at: new Date(),
    })
  }

  // ── Retry ─────────────────────────────────────────────────────────────────
  function retryMessage(assistantMsg) {
    if (isStreaming.value) return
    const idx = messages.value.findIndex(m => m === assistantMsg)
    if (idx < 0) return
    let userIdx = -1
    for (let i = idx - 1; i >= 0; i--) {
      if (messages.value[i].role === 'user') { userIdx = i; break }
    }
    if (userIdx < 0) return
    const text = messages.value[userIdx].content
    messages.value.splice(userIdx, idx - userIdx + 1)
    sendMessage(text)
  }

  // ── Rename session ────────────────────────────────────────────────────────
  async function renameSession(title) {
    if (!currentSessionId.value || !title?.trim()) return
    await apiRenameSession(currentSessionId.value, title.trim())
    const s = sessions.value.find(s => s.id === currentSessionId.value)
    if (s) s.title = title.trim()
  }

  // ── Feedback ──────────────────────────────────────────────────────────────
  async function sendFeedback(messageId, rating, comment = null) {
    try {
      await submitFeedback(messageId, rating, comment)
      const msg = messages.value.find(m => m.id === messageId)
      if (msg) msg.feedback = rating
    } catch { /* silencioso */ }
  }

  // ── Modo do player ────────────────────────────────────────────────────────
  function setMode(newMode) { mode.value = newMode }
  function minimize() { mode.value = 'floating' }
  function expand() { mode.value = 'home' }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function parseMessage(m) {
    if (m.role !== 'assistant' || !m.content) return m

    // Caso normal: response_type indica que é estruturado (chart, table, action, ...)
    // Caso defensivo: response_type='text' MAS content parece JSON {text, action} —
    // cobre mensagens salvas antes do fix server-side.
    const looksJson = typeof m.content === 'string' && m.content.trimStart().startsWith('{')
    if (m.response_type === 'text' && !looksJson) return m

    try {
      const parsed = JSON.parse(m.content)
      if (parsed && typeof parsed === 'object' && ('text' in parsed || 'action' in parsed)) {
        return {
          ...m,
          content: parsed.text || '',
          metadata: { ...m.metadata, action: parsed.action || m.metadata?.action },
        }
      }
      return m
    } catch {
      return m
    }
  }

  return {
    mode, sessions, currentSessionId, messages, isStreaming, streamingText,
    pendingAction, storageUsage, historyOpen, composerDraft,
    agentSteps, streamStartedAt, streamStale,
    isAtStorageLimit, hasSession,
    loadSessions, loadMessages, newSession, favoriteSession, deleteSession,
    loadStorageUsage, sendMessage, cancelStream, retryMessage, renameSession, sendFeedback,
    setMode, minimize, expand, setDraft,
    currentSessionTitle,
  }
})
