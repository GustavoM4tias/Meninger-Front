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
  // Progresso das tools (Fase A): [{ name, label, status: running|ok|error, summary }]
  const toolProgress = ref([])
  // build (Fase A: Eme protagonista) | refine (Fase B: Eme flutuante)
  const phase = ref('build')
  const highlightId = ref(null)
  const selectedBlock = ref(null)

  const spec = computed(() => report.value?.spec || { version: 1, blocks: [] })
  const blockCount = computed(() => spec.value.blocks?.length || 0)

  async function fetchReport(id) {
    loadingReport.value = true
    try {
      const data = await requestWithAuth(`/reports/${id}`)
      report.value = data.report
      messages.value = data.messages || []
      phase.value = (data.report?.spec?.blocks?.length || 0) >= 4 ? 'refine' : 'build'
    } finally {
      loadingReport.value = false
    }
  }

  function setPhase(p) { phase.value = p }
  function selectBlock(block) { selectedBlock.value = block }

  async function sendMessage(text) {
    if (!report.value || isStreaming.value || !text.trim()) return
    const reportId = report.value.id
    const selectedId = selectedBlock.value?.id || null

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
        body: JSON.stringify({ message: text, selected_block_id: selectedId }),
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
      selectedBlock.value = null
      // Transição automática Fase A → B quando o relatório tomou corpo
      if (phase.value === 'build' && blockCount.value >= 4) phase.value = 'refine'
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
    isStreaming, streamingText, toolProgress, phase, setPhase, highlightId,
    selectedBlock, selectBlock, spec, blockCount, sendMessage,
    publish, shareInternal, shareOptions,
    publicCheck, enablePublic, revokePublic, rotatePublicToken, renewPublic, publicLog, publicUrl,
  }
})
