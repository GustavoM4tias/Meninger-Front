// stores/Reports/reportsStore.js
//
// Store do módulo Relatórios da Eme.
// Streaming SSE via fetch + ReadableStream (mesmo padrão do officeAIStore).

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl.js'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth.js'

export const useReportsStore = defineStore('reports', () => {
  // ── Lista ──────────────────────────────────────────────────────────────────
  const own = ref([])
  const shared = ref([])
  const isAdmin = ref(false)
  const loadingList = ref(false)

  async function fetchList() {
    loadingList.value = true
    try {
      const data = await requestWithAuth('/reports')
      own.value = data.own || []
      shared.value = data.shared || []
      isAdmin.value = !!data.isAdmin
    } finally {
      loadingList.value = false
    }
  }

  async function createReport(title) {
    return requestWithAuth('/reports', { method: 'POST', body: JSON.stringify({ title }) })
  }

  async function deleteReport(id) {
    await requestWithAuth(`/reports/${id}`, { method: 'DELETE' })
    own.value = own.value.filter((r) => r.id !== id)
  }

  // ── Builder (relatório corrente) ───────────────────────────────────────────
  const report = ref(null)
  const messages = ref([])
  const loadingReport = ref(false)

  const isStreaming = ref(false)
  const streamingText = ref('')
  // Progresso das tools: [{ name, label, status: running|ok|error, summary }]
  const toolProgress = ref([])
  const highlightId = ref(null)

  // Seleção MÚLTIPLA de blocos: ids marcados no relatório para editar/remover
  const selectedIds = ref([])

  const spec = computed(() => report.value?.spec || { version: 1, blocks: [] })
  const blockCount = computed(() => spec.value.blocks?.length || 0)
  const theme = computed(() => report.value?.theme || 'classic')

  const selectedBlocks = computed(() =>
    (spec.value.blocks || []).filter((b) => selectedIds.value.includes(b.id))
  )

  function toggleBlock(id) {
    const i = selectedIds.value.indexOf(id)
    if (i >= 0) selectedIds.value.splice(i, 1)
    else selectedIds.value.push(id)
  }
  function clearSelection() { selectedIds.value = [] }
  function selectOnly(id) { selectedIds.value = [id] }

  // ── Histórico de desfazer/refazer ──────────────────────────────────────────
  // Guarda snapshots do spec a cada alteração (da Eme ou manual), para o
  // usuário voltar de uma remoção acidental sem perder o resto do trabalho.
  const HISTORY_LIMIT = 60
  const history = ref([])      // [{ spec, label }]
  const historyIndex = ref(-1)

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value >= 0 && historyIndex.value < history.value.length - 1)
  const undoLabel = computed(() => (canUndo.value ? history.value[historyIndex.value]?.label : null))
  const redoLabel = computed(() => (canRedo.value ? history.value[historyIndex.value + 1]?.label : null))

  const clone = (obj) => JSON.parse(JSON.stringify(obj || { version: 1, blocks: [] }))

  function resetHistory(initialSpec) {
    history.value = [{ spec: clone(initialSpec), label: 'Estado inicial' }]
    historyIndex.value = 0
  }

  function pushHistory(newSpec, label) {
    // Uma ação nova descarta o "futuro" que existia à frente do ponteiro
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push({ spec: clone(newSpec), label: label || 'Alteração' })
    if (history.value.length > HISTORY_LIMIT) history.value.shift()
    historyIndex.value = history.value.length - 1
  }

  // Persiste sem mexer no histórico (usado pelo undo/redo)
  async function persistSpec(newSpec) {
    const data = await requestWithAuth(`/reports/${report.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({ spec: newSpec }),
    })
    report.value.spec = data.spec || newSpec
  }

  async function undo() {
    if (!canUndo.value) return
    historyIndex.value -= 1
    const snap = history.value[historyIndex.value]
    report.value.spec = clone(snap.spec)
    selectedIds.value = []
    await persistSpec(report.value.spec)
  }

  async function redo() {
    if (!canRedo.value) return
    historyIndex.value += 1
    const snap = history.value[historyIndex.value]
    report.value.spec = clone(snap.spec)
    selectedIds.value = []
    await persistSpec(report.value.spec)
  }

  async function fetchReport(id) {
    loadingReport.value = true
    try {
      const data = await requestWithAuth(`/reports/${id}`)
      report.value = data.report
      messages.value = data.messages || []
      selectedIds.value = []
      resetHistory(data.report?.spec)
    } finally {
      loadingReport.value = false
    }
  }

  // ── Edição direta do spec (sem passar pela Eme) ────────────────────────────
  async function saveSpec(newSpec, label = 'Alteração manual') {
    pushHistory(newSpec, label)
    await persistSpec(newSpec)
  }

  async function removeBlocks(ids) {
    const removed = (spec.value.blocks || []).filter((b) => ids.includes(b.id))
    const next = {
      ...spec.value,
      blocks: (spec.value.blocks || []).filter((b) => !ids.includes(b.id)),
    }
    report.value.spec = next
    selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id))
    await saveSpec(next, removed.length > 1 ? `Remoção de ${removed.length} blocos` : 'Remoção de bloco')
  }

  async function moveBlock(id, direction) {
    const blocks = [...(spec.value.blocks || [])]
    const i = blocks.findIndex((b) => b.id === id)
    const j = direction === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= blocks.length) return
    ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
    const next = { ...spec.value, blocks }
    report.value.spec = next
    await saveSpec(next, 'Reordenação de bloco')
  }

  // ── Memória do relatório ───────────────────────────────────────────────────
  const memories = ref([])

  async function fetchMemories() {
    memories.value = await requestWithAuth(`/reports/${report.value.id}/memories`)
  }
  async function addMemory(text, scope = 'report') {
    memories.value = await requestWithAuth(`/reports/${report.value.id}/memories`, {
      method: 'POST',
      body: JSON.stringify({ text, scope }),
    })
  }
  async function updateMemory(memoryId, patch) {
    memories.value = await requestWithAuth(`/reports/${report.value.id}/memories/${memoryId}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
  }
  async function deleteMemory(memoryId) {
    memories.value = await requestWithAuth(`/reports/${report.value.id}/memories/${memoryId}`, {
      method: 'DELETE',
    })
  }

  async function setTheme(themeKey) {
    report.value.theme = themeKey
    await requestWithAuth(`/reports/${report.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({ theme: themeKey }),
    })
  }

  async function sendMessage(text) {
    if (!report.value || isStreaming.value || !text.trim()) return
    const reportId = report.value.id
    const selected = [...selectedIds.value]

    messages.value.push({ id: `local-${Date.now()}`, role: 'user', content: text })
    isStreaming.value = true
    streamingText.value = ''
    toolProgress.value = []

    try {
      const response = await fetch(`${API_URL}/reports/${reportId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message: text, selected_block_ids: selected }),
      })
      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao falar com a Eme.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let evt
          try { evt = JSON.parse(line.slice(6)) } catch { continue }
          handleEvent(evt)
        }
      }
    } catch (err) {
      messages.value.push({ id: `err-${Date.now()}`, role: 'model', content: `⚠️ ${err.message}` })
    } finally {
      isStreaming.value = false
      selectedIds.value = []
    }
  }

  function handleEvent(evt) {
    switch (evt.type) {
      case 'chunk':
        streamingText.value += evt.text || ''
        break
      case 'tool_start':
        toolProgress.value.push({ name: evt.name, label: evt.label, status: 'running' })
        break
      case 'tool_result': {
        const item = [...toolProgress.value].reverse().find((t) => t.name === evt.name && t.status === 'running')
        if (item) {
          item.status = evt.ok ? 'ok' : 'error'
          item.summary = evt.summary
        }
        break
      }
      case 'spec':
        if (report.value) {
          report.value.spec = evt.spec
          pushHistory(evt.spec, 'Alteração da Eme')
          if (evt.meta) Object.assign(report.value, {
            title: evt.meta.title ?? report.value.title,
            enterpriseName: evt.meta.enterpriseName ?? report.value.enterpriseName,
            periodStart: evt.meta.periodStart ?? report.value.periodStart,
            periodEnd: evt.meta.periodEnd,
            dataMode: evt.meta.dataMode ?? report.value.dataMode,
          })
        }
        highlightId.value = evt.changedIds?.[evt.changedIds.length - 1] || null
        break
      case 'done':
        if (streamingText.value) {
          messages.value.push({ id: evt.msgId || `m-${Date.now()}`, role: 'model', content: streamingText.value })
          streamingText.value = ''
        }
        break
      case 'memory_saved':
        // A Eme guardou uma preferência: reflete na aba Memória sem recarregar
        fetchMemories().catch(() => {})
        break
      case 'error':
        messages.value.push({ id: `err-${Date.now()}`, role: 'model', content: `⚠️ ${evt.message || 'Erro.'}` })
        break
    }
  }

  // ── Publicação / compartilhamento ──────────────────────────────────────────
  async function publish() {
    const r = await requestWithAuth(`/reports/${report.value.id}/publish`, { method: 'POST' })
    report.value.status = 'published'
    return r
  }

  async function shareInternal({ userIds, positions }) {
    return requestWithAuth(`/reports/${report.value.id}/share`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds, positions }),
    })
  }

  async function shareOptions() {
    return requestWithAuth(`/reports/${report.value.id}/share-options`)
  }

  async function publicCheck(id) {
    return requestWithAuth(`/reports/${id || report.value.id}/public-check`)
  }

  async function enablePublic({ expiresInDays, confirmed, piiAcknowledged }) {
    return requestWithAuth(`/reports/${report.value.id}/public`, {
      method: 'POST',
      body: JSON.stringify({ expires_in_days: expiresInDays, confirmed, pii_acknowledged: piiAcknowledged }),
    })
  }

  async function revokePublic() {
    return requestWithAuth(`/reports/${report.value.id}/public`, { method: 'DELETE' })
  }

  async function rotatePublicToken() {
    return requestWithAuth(`/reports/${report.value.id}/public/rotate`, { method: 'POST' })
  }

  async function renewPublic(expiresInDays) {
    return requestWithAuth(`/reports/${report.value.id}/public/renew`, {
      method: 'POST',
      body: JSON.stringify({ expires_in_days: expiresInDays }),
    })
  }

  async function publicLog() {
    return requestWithAuth(`/reports/${report.value.id}/public-log`)
  }

  function publicUrl(token) {
    return `${window.location.origin}/r/${token}`
  }

  return {
    own, shared, isAdmin, loadingList, fetchList, createReport, deleteReport,
    report, messages, loadingReport, fetchReport,
    isStreaming, streamingText, toolProgress, highlightId,
    selectedIds, selectedBlocks, toggleBlock, clearSelection, selectOnly,
    spec, blockCount, theme, sendMessage,
    saveSpec, removeBlocks, moveBlock, setTheme,
    canUndo, canRedo, undoLabel, redoLabel, undo, redo,
    memories, fetchMemories, addMemory, updateMemory, deleteMemory,
    publish, shareInternal, shareOptions,
    publicCheck, enablePublic, revokePublic, rotatePublicToken, renewPublic, publicLog, publicUrl,
  }
})
