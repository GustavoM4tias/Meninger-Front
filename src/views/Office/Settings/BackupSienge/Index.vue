<template>
    <div class="h-full flex flex-col">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 class="text-2xl font-bold flex items-center gap-2">
                        <i class="fas fa-database text-indigo-500"></i> Backup Sienge
                    </h1>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Backup diário automatizado do banco Sienge (5h da manhã). Pipeline: download da
                        API Sienge → descompactação → pg_restore no Postgres dedicado.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <button
                        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 transition"
                        :disabled="store.loading"
                        @click="refresh">
                        <i class="fas fa-rotate" :class="{ 'animate-spin': store.loading }"></i>
                        Atualizar
                    </button>

                    <button
                        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        :disabled="isRunning || store.triggering"
                        @click="onTriggerFullBackup">
                        <i class="fas fa-play"></i>
                        Rodar backup agora
                    </button>
                </div>
            </div>
        </div>

        <!-- Erro -->
        <div v-if="store.hasError" class="px-6 pt-4">
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                <p class="text-red-800 font-medium">Erro:</p>
                <p class="text-red-700">{{ store.error }}</p>
            </div>
        </div>

        <!-- Status atual -->
        <div class="px-6 pt-4">
            <div
                v-if="isRunning"
                class="rounded-2xl border border-indigo-200 bg-indigo-50/60 dark:bg-indigo-900/20 dark:border-indigo-700 p-4 flex items-center gap-4 shadow-sm">
                <div class="text-indigo-600 dark:text-indigo-300 text-2xl">
                    <i class="fas fa-circle-notch fa-spin"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-indigo-900 dark:text-indigo-100">
                        Backup em execução — etapa: <code class="px-1.5 py-0.5 rounded bg-white/70 dark:bg-black/30 text-xs">{{ runningStage }}</code>
                    </p>
                    <p class="text-xs text-indigo-700 dark:text-indigo-200 mt-0.5">
                        Iniciado em {{ formatDate(store.runningBackup.started_at) }} • atualizando a cada 5s
                    </p>
                </div>
            </div>

            <div v-else-if="store.latestSuccess"
                 class="rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/20 dark:border-emerald-700 p-4 flex items-center gap-4 shadow-sm">
                <div class="text-emerald-600 dark:text-emerald-300 text-2xl">
                    <i class="fas fa-circle-check"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-emerald-900 dark:text-emerald-100">
                        Último backup OK — {{ formatDate(store.latestSuccess.finished_at) }}
                    </p>
                    <p class="text-xs text-emerald-700 dark:text-emerald-200 mt-0.5">
                        Duração total: {{ formatDuration(store.latestSuccess.duration_ms) }}
                        • Tamanho: {{ formatBytes(store.latestSuccess.file_size_bytes) }}
                        <span v-if="store.latestSuccess.import_duration_ms"> • Restore: {{ formatDuration(store.latestSuccess.import_duration_ms) }}</span>
                    </p>
                </div>
            </div>

            <div v-else
                 class="rounded-2xl border border-gray-200 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
                Nenhum backup registrado ainda. Dispare manualmente ou aguarde o cron das 5h.
            </div>
        </div>

        <!-- Tabela de histórico -->
        <div class="px-6 pb-6 pt-4 flex-1 flex flex-col gap-3 min-h-0">
            <div class="flex items-center justify-between mb-1">
                <h2 class="text-lg font-semibold">Histórico</h2>
                <span class="text-xs text-gray-500">{{ store.items.length }} execução(ões)</span>
            </div>

            <div v-if="store.items.length === 0" class="text-gray-500 text-sm">
                Sem registros.
            </div>

            <div v-else
                 class="overflow-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-800/80">
                        <tr>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">#</th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">Início</th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">Disparo</th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">Etapa</th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">Status</th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">Restore</th>
                            <th class="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wide text-gray-500">Duração</th>
                            <th class="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wide text-gray-500">Tamanho</th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">Erro</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr v-for="row in store.items" :key="row.id"
                            class="hover:bg-gray-50/70 dark:hover:bg-gray-800/70 transition-colors">
                            <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ row.id }}</td>
                            <td class="px-4 py-3 align-top">
                                <div>{{ formatDate(row.started_at) }}</div>
                                <div v-if="row.finished_at" class="text-xs text-gray-500">
                                    até {{ formatTime(row.finished_at) }}
                                </div>
                            </td>
                            <td class="px-4 py-3 align-top text-xs text-gray-600 dark:text-gray-300">
                                {{ row.triggered_by || '—' }}
                            </td>
                            <td class="px-4 py-3 align-top">
                                <code class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                                    {{ row.stage || '—' }}
                                </code>
                            </td>
                            <td class="px-4 py-3 align-top">
                                <span :class="statusBadgeClass(row.status)">
                                    <i :class="statusIcon(row.status)"></i>
                                    {{ row.status }}
                                </span>
                            </td>
                            <td class="px-4 py-3 align-top">
                                <span v-if="row.import_status" :class="statusBadgeClass(row.import_status)">
                                    <i :class="statusIcon(row.import_status)"></i>
                                    {{ row.import_status }}
                                </span>
                                <span v-else class="text-gray-400 text-xs">—</span>
                            </td>
                            <td class="px-4 py-3 align-top text-right font-mono text-xs">
                                {{ formatDuration(row.duration_ms) }}
                            </td>
                            <td class="px-4 py-3 align-top text-right font-mono text-xs">
                                {{ formatBytes(row.file_size_bytes) }}
                            </td>
                            <td class="px-4 py-3 align-top text-xs max-w-md">
                                <span v-if="row.error_message || row.import_error_message"
                                      class="text-red-600 dark:text-red-300 break-words">
                                    {{ row.error_message || row.import_error_message }}
                                </span>
                                <span v-else class="text-gray-400">—</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useSiengeBackupStore } from '@/stores/Sienge/backupStore'

const store = useSiengeBackupStore()
const toast = useToast()

let pollTimer = null

const isRunning = computed(() => !!store.runningBackup)
const runningStage = computed(() => store.runningBackup?.stage || 'starting')

function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
        store.fetchBackups({ withSpinner: false })
    }, isRunning.value ? 5000 : 30000)
}

function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function refresh() {
    await store.fetchBackups({ withSpinner: true })
    startPolling()
}

async function onTriggerFullBackup() {
    if (!confirm('Disparar pipeline completo (download Sienge + pg_restore)?\n\nDuração estimada: 25-45 min.')) return
    try {
        await store.triggerFullBackup()
        toast.success('Backup iniciado. Acompanhe o status abaixo.')
        await store.fetchBackups()
        startPolling()
    } catch (err) {
        toast.error(err.message || 'Falha ao disparar backup')
    }
}

// ─── Formatters ─────────────────────────────────────────────────────────────
function formatDate(s) {
    if (!s) return '—'
    return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}
function formatTime(s) {
    if (!s) return '—'
    return new Date(s).toLocaleTimeString('pt-BR', { timeStyle: 'medium' })
}
function formatBytes(n) {
    if (!n) return '—'
    const num = Number(n)
    if (!Number.isFinite(num)) return '—'
    if (num < 1024) return `${num} B`
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
    if (num < 1024 * 1024 * 1024) return `${(num / 1024 / 1024).toFixed(1)} MB`
    return `${(num / 1024 / 1024 / 1024).toFixed(2)} GB`
}
function formatDuration(ms) {
    if (!ms) return '—'
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const rs = s % 60
    if (m < 60) return `${m}m ${rs}s`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
}

function statusBadgeClass(status) {
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium'
    switch (status) {
        case 'success': return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200`
        case 'failed':  return `${base} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`
        case 'running': return `${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200`
        case 'skipped': return `${base} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`
        default:        return `${base} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`
    }
}
function statusIcon(status) {
    switch (status) {
        case 'success': return 'fas fa-check'
        case 'failed':  return 'fas fa-xmark'
        case 'running': return 'fas fa-circle-notch fa-spin'
        case 'skipped': return 'fas fa-forward'
        default:        return 'fas fa-circle'
    }
}

onMounted(async () => {
    await store.fetchBackups({ withSpinner: true })
    startPolling()
})
onBeforeUnmount(() => stopPolling())
</script>
