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
  async function sendMessage(text) {
    if (!text?.trim() || isStreaming.value) return

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

    try {
      const response = await fetch(`${API_URL}/office-chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message: text, session_id: currentSessionId.value }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
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
      console.error('[officeAIStore] SSE error:', err)
      pushAssistantMessage('Erro de conexão. Tente novamente.', 'error')
    } finally {
      isStreaming.value = false
    }
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
        // Validador anti-alucinação detectou número/nome suspeito — anexa flag
        // ao último/próximo assistant message (será exibido como tag amarela)
        pendingWarning.value = {
          message: evt.message || 'Possível inconsistência na resposta.',
          details: evt.details || [],
        }
        break

      case 'action':
        pendingAction.value = evt.action
        if (evt.action.type === 'navigate') {
          window.dispatchEvent(new CustomEvent('eme:navigate', { detail: evt.action }))
        }
        break

      case 'done':
        if (evt.sessionId) {
          currentSessionId.value = evt.sessionId
          if (!sessions.value.find(s => s.id === evt.sessionId)) loadSessions()
        }
        {
          const meta = {}
          if (pendingAction.value)  meta.action  = pendingAction.value
          if (pendingWarning.value) meta.warning = pendingWarning.value
          pushAssistantMessage(
            streamingText.value,
            pendingAction.value?.type || 'text',
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
    isAtStorageLimit, hasSession,
    loadSessions, loadMessages, newSession, favoriteSession, deleteSession,
    loadStorageUsage, sendMessage, retryMessage, renameSession, sendFeedback,
    setMode, minimize, expand, setDraft,
    currentSessionTitle,
  }
})
