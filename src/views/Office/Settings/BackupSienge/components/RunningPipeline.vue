<script setup>
/**
 * RunningPipeline - card do backup em execução, com a linha do tempo das etapas
 * do pipeline e o progresso detalhado das 5 sub-fases do pg_restore.
 *
 * Recebe o log `running` (status = running) e desenha tudo a partir dele.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatBytes, formatDate, formatDuration } from '../format'

const props = defineProps({
    log: { type: Object, required: true },
})

// ─── Pipeline stages (ordenadas) ────────────────────────────────────────────
// Mantém em sincronia com SiengeBackupService.runDailyBackup() no backend.
//
// Blue-green: o restore acontece em um database "staging" virgem, e o banco
// de produção só é trocado por rename atômico após validação OK. Em caso de
// falha, staging é descartado e produção fica intocada.
const PIPELINE_STAGES = [
    { key: 'fetching_md5', label: 'Validação inicial (MD5)', icon: 'fas fa-fingerprint', estimate: '5s' },
    { key: 'downloading', label: 'Download do Sienge', icon: 'fas fa-cloud-arrow-down', estimate: '5-20 min' },
    { key: 'decompressing', label: 'Descompactação local', icon: 'fas fa-file-zipper', estimate: '30s' },
    { key: 'preparing_staging', label: 'Preparando banco staging', icon: 'fas fa-flask', estimate: '5s' },
    { key: 'restoring', label: 'pg_restore no staging', icon: 'fas fa-database', estimate: '15-30 min' },
    { key: 'validating', label: 'Validando staging', icon: 'fas fa-check-double', estimate: '5s' },
    { key: 'swapping', label: 'Swap atômico (rename)', icon: 'fas fa-rotate', estimate: '1s' },
    { key: 'applying_grants', label: 'Reaplicando permissões', icon: 'fas fa-user-shield', estimate: '2s' },
]

// Sub-fases do pg_restore (corresponde a `log.phase_progress` no backend).
const RESTORE_PHASES = [
    { key: 'data', label: 'Dados', icon: 'fas fa-table', barColor: 'bg-sky-500' },
    { key: 'index', label: 'Índices', icon: 'fas fa-key', barColor: 'bg-violet-500' },
    { key: 'constraint', label: 'Constraints', icon: 'fas fa-shield-halved', barColor: 'bg-amber-500' },
    { key: 'fk', label: 'FKs', icon: 'fas fa-link', barColor: 'bg-rose-500' },
    { key: 'trigger', label: 'Triggers', icon: 'fas fa-bolt', barColor: 'bg-emerald-500' },
]

const showTimeline = ref(true)

// Ticker de 1s pra atualizar duração da etapa em andamento sem esperar o poll de 5s
const nowTick = ref(Date.now())
let tickInterval = null
onMounted(() => { tickInterval = setInterval(() => { nowTick.value = Date.now() }, 1000) })
onBeforeUnmount(() => { if (tickInterval) clearInterval(tickInterval) })

const currentStageInfo = computed(() => {
    const cur = props.log?.stage || 'starting'
    if (cur === 'starting') return { label: 'Inicializando...' }
    if (cur === 'done') return { label: 'Finalizando...' }
    return PIPELINE_STAGES.find(s => s.key === cur) ?? { label: cur }
})

function stageState(key) {
    const running = props.log
    if (!running) return 'pending'
    const order = PIPELINE_STAGES.map(s => s.key)
    const cur = running.stage
    const curIdx = cur === 'done' ? order.length : order.indexOf(cur)
    const thisIdx = order.indexOf(key)
    if (running.status === 'failed' && thisIdx === curIdx) return 'failed'
    if (thisIdx < curIdx) return 'done'
    if (thisIdx === curIdx) return 'current'
    return 'pending'
}

function stageStateLabel(key) {
    return {
        done: 'concluído',
        current: 'em andamento',
        pending: 'aguardando',
        failed: 'falhou',
    }[stageState(key)]
}

function stageRowClass(key) {
    return {
        done: 'text-emerald-700 dark:text-emerald-400',
        current: 'text-accent font-medium',
        pending: 'text-ink-subtle',
        failed: 'text-red-700 dark:text-red-400 font-medium',
    }[stageState(key)]
}

function stageDotClass(key) {
    const base = 'w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0'
    return {
        done: `${base} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`,
        current: `${base} bg-accent-soft text-accent ring-2 ring-accent-ring/40`,
        pending: `${base} bg-surface-sunken text-ink-subtle`,
        failed: `${base} bg-red-500/10 text-red-600 dark:text-red-400`,
    }[stageState(key)]
}

function stageDotIcon(key) {
    return {
        done: 'fas fa-check',
        current: 'fas fa-circle-notch fa-spin',
        pending: 'far fa-circle',
        failed: 'fas fa-xmark',
    }[stageState(key)]
}

// Duração da etapa em ms (live se current, total se done)
function stageDurationMs(key) {
    const t = props.log?.stage_timings?.[key]
    if (!t?.started_at) return null
    const start = new Date(t.started_at).getTime()
    const end = t.finished_at ? new Date(t.finished_at).getTime() : nowTick.value
    return Math.max(0, end - start)
}

// % progresso pra etapa atual (download tem; demais retornam null)
function stageProgress(key) {
    const log = props.log
    if (!log) return null
    if (key === 'downloading') {
        const done = Number(log.bytes_downloaded || 0)
        const total = Number(log.file_size_bytes || 0)
        if (!total || !done) return null
        return Math.min(100, (done / total) * 100)
    }
    return null
}

// ─── Sub-fases do pg_restore (data/index/constraint/fk/trigger) ─────────────
// Os campos vêm do backend em `log.phase_progress`. Cada fase tem
// { done, total, current, started_at, finished_at }.
const restorePhases = computed(() => props.log?.phase_progress || null)

function phaseDone(key) { return Number(restorePhases.value?.[key]?.done || 0) }
function phaseTotal(key) { return Number(restorePhases.value?.[key]?.total || 0) }
function phasePct(key) {
    const total = phaseTotal(key)
    if (!total) return 0
    return Math.min(100, (phaseDone(key) / total) * 100)
}
function phaseStartedAt(key) {
    const t = restorePhases.value?.[key]?.started_at
    return t ? new Date(t).getTime() : null
}
// ETA por fase: extrapola pelo throughput até agora. Retorna null se não dá pra calcular.
function phaseEta(key) {
    const ph = restorePhases.value?.[key]
    if (!ph || ph.finished_at || !ph.started_at) return null
    const done = phaseDone(key)
    const total = phaseTotal(key)
    if (!done || done >= total) return null
    const elapsed = nowTick.value - phaseStartedAt(key)
    if (elapsed <= 0) return null
    const rate = done / elapsed // items por ms
    const remaining = total - done
    return remaining / rate
}
function phaseBarColor(key) {
    return RESTORE_PHASES.find(p => p.key === key)?.barColor || 'bg-accent'
}

// % total consolidado + ETA agregado (soma de ETAs das fases pendentes).
const restoreTotal = computed(() => {
    if (!restorePhases.value) return { done: 0, total: 0, donePct: 0, etaMs: null }
    let done = 0, total = 0, etaSum = 0
    for (const p of RESTORE_PHASES) {
        done += phaseDone(p.key)
        total += phaseTotal(p.key)
        const eta = phaseEta(p.key)
        if (eta) etaSum += eta
    }
    return {
        done,
        total,
        donePct: total ? Math.min(100, (done / total) * 100) : 0,
        etaMs: etaSum > 0 ? etaSum : null,
    }
})

// Atividade textual: "dados: public.tabelaX · índices: public.idx_y · ..."
const restoreCurrentActivity = computed(() => {
    const phases = restorePhases.value
    if (!phases) return null
    const parts = []
    for (const p of RESTORE_PHASES) {
        const cur = phases[p.key]?.current
        if (cur && !phases[p.key]?.finished_at) parts.push(`${p.label.toLowerCase()}: ${cur}`)
    }
    return parts.length ? parts.join(' · ') : null
})

// Texto secundário por etapa: bytes baixados, tabela atual do restore, retry count
function stageDetail(key) {
    const log = props.log
    if (!log) return null
    if (stageState(key) !== 'current') return null

    if (key === 'downloading') {
        const done = Number(log.bytes_downloaded || 0)
        const total = Number(log.file_size_bytes || 0)
        const attempts = Number(log.download_attempts || 1)
        const parts = []
        if (done) parts.push(`${formatBytes(done)}${total ? ` / ${formatBytes(total)}` : ''}`)
        if (attempts > 1) parts.push(`tentativa ${attempts}/3`)
        return parts.join(' • ') || null
    }

    if (key === 'restoring') {
        // Se temos phase_progress, painel detalhado já cobre - não duplica.
        if (restorePhases.value && Object.keys(restorePhases.value).length) return null
        return parseRestoreActivity(log.restore_log_tail)
    }

    return null
}

// Extrai a última atividade visível do stderr do pg_restore
function parseRestoreActivity(tail) {
    if (!tail) return null
    const lines = tail.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    // Procura "processing data for table" (mais útil)
    for (let i = lines.length - 1; i >= 0; i--) {
        const m = lines[i].match(/processing data for table "?([^"]+)"?\.?"?([^"]+)"?/i)
        if (m) {
            const table = m[2] || m[1]
            return `processando tabela ${table}`
        }
    }
    // Fallback: última linha não-vazia
    const last = lines[lines.length - 1]
    return last ? last.slice(0, 90) : null
}
</script>

<template>
    <section class="rounded-xl border border-accent/30 bg-accent-soft/40 shadow-soft overflow-hidden">
        <!-- Cabeçalho -->
        <div class="p-4 flex items-center gap-3 sm:gap-4">
            <div class="text-accent text-xl sm:text-2xl shrink-0">
                <i class="fas fa-circle-notch fa-spin"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-ink text-sm sm:text-base truncate">
                    Backup em execução - {{ currentStageInfo.label }}
                </p>
                <p class="text-micro sm:text-xs text-ink-muted mt-0.5">
                    Iniciado em {{ formatDate(log.started_at) }} • atualizando a cada 5s
                </p>
            </div>
            <button type="button"
                class="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-medium text-accent
                       hover:bg-surface-raised transition-colors shrink-0"
                @click="showTimeline = !showTimeline">
                <span class="hidden sm:inline">{{ showTimeline ? 'Ocultar etapas' : 'Ver etapas' }}</span>
                <i :class="showTimeline ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>
        </div>

        <!-- Linha do tempo -->
        <div v-show="showTimeline" class="px-3 sm:px-4 pb-4 pt-3 border-t border-accent/20 bg-surface-raised/60">
            <ol class="space-y-3">
                <li v-for="stage in PIPELINE_STAGES" :key="stage.key" class="flex items-start gap-3"
                    :class="stageRowClass(stage.key)">
                    <div :class="stageDotClass(stage.key)">
                        <i :class="stageDotIcon(stage.key)"></i>
                    </div>
                    <div class="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 min-w-0">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                                <i :class="stage.icon" class="opacity-70 w-4 text-center"></i>
                                <p class="text-sm truncate">{{ stage.label }}</p>
                            </div>

                            <!-- Detalhe live por etapa -->
                            <p v-if="stageDetail(stage.key)" class="text-xs mt-1 ml-6 opacity-75 truncate">
                                {{ stageDetail(stage.key) }}
                            </p>

                            <!-- Barra de progresso (download tem; restore tem painel detalhado abaixo) -->
                            <div v-if="stageState(stage.key) === 'current' && stageProgress(stage.key) !== null"
                                class="ml-6 mt-1.5 h-1.5 w-full max-w-xs rounded-full bg-surface-sunken overflow-hidden">
                                <div class="h-full bg-accent transition-all duration-500"
                                    :style="{ width: stageProgress(stage.key) + '%' }"></div>
                            </div>

                            <!-- Mensagem antes do TOC ser parseado -->
                            <p v-if="stage.key === 'restoring' && stageState('restoring') === 'current' && restoreTotal.total === 0"
                                class="text-xs mt-1 ml-6 opacity-60 italic">
                                Calculando totais do dump...
                            </p>

                            <!-- Painel detalhado das 5 sub-fases do pg_restore -->
                            <div v-if="stage.key === 'restoring' && stageState('restoring') === 'current' && restoreTotal.total > 0"
                                class="ml-6 mt-2 space-y-2">
                                <!-- TOTAL geral consolidado -->
                                <div>
                                    <div class="flex items-center justify-between gap-2 text-xs mb-0.5">
                                        <span class="font-semibold opacity-90">Progresso total do restore</span>
                                        <span class="font-mono tabular-nums opacity-90 whitespace-nowrap">
                                            {{ restoreTotal.donePct.toFixed(1) }}%
                                            <span class="opacity-50 hidden sm:inline">·</span>
                                            <span class="hidden sm:inline">{{ restoreTotal.done }}/{{ restoreTotal.total }}</span>
                                            <span v-if="restoreTotal.etaMs" class="opacity-50">
                                                · ETA {{ formatDuration(restoreTotal.etaMs) }}
                                            </span>
                                        </span>
                                    </div>
                                    <div class="h-2 w-full rounded-full bg-surface-sunken overflow-hidden">
                                        <div class="h-full bg-accent transition-all duration-500"
                                            :style="{ width: restoreTotal.donePct + '%' }"></div>
                                    </div>
                                </div>

                                <!-- 5 sub-fases -->
                                <div v-for="phase in RESTORE_PHASES" :key="phase.key"
                                    class="grid grid-cols-[5rem_1fr] sm:grid-cols-[7rem_1fr_auto] items-center gap-2 text-xs">
                                    <span class="opacity-75 truncate">
                                        <i :class="phase.icon" class="mr-1 opacity-60"></i>
                                        {{ phase.label }}
                                    </span>
                                    <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                                        <div class="h-full transition-all duration-500" :class="phaseBarColor(phase.key)"
                                            :style="{ width: phasePct(phase.key) + '%' }"></div>
                                    </div>
                                    <span class="hidden sm:inline font-mono tabular-nums whitespace-nowrap opacity-75">
                                        {{ phasePct(phase.key).toFixed(0) }}%
                                        <span class="opacity-50">({{ phaseDone(phase.key) }}/{{ phaseTotal(phase.key) }})</span>
                                        <span v-if="phaseEta(phase.key)" class="opacity-50">
                                            · {{ formatDuration(phaseEta(phase.key)) }}
                                        </span>
                                    </span>
                                </div>

                                <!-- Atividade textual: tabela/item atual -->
                                <p v-if="restoreCurrentActivity" class="text-micro opacity-60 truncate font-mono">
                                    {{ restoreCurrentActivity }}
                                </p>
                            </div>
                        </div>

                        <div class="text-xs sm:text-right whitespace-nowrap ml-6 sm:ml-0">
                            <span class="opacity-75">{{ stageStateLabel(stage.key) }}</span>
                            <span class="opacity-60 sm:block sm:mt-0.5">
                                <span class="sm:hidden opacity-50"> · </span>
                                <span v-if="stageDurationMs(stage.key)">{{ formatDuration(stageDurationMs(stage.key)) }}</span>
                                <span v-else-if="stage.estimate">~ {{ stage.estimate }}</span>
                            </span>
                        </div>
                    </div>
                </li>
            </ol>
        </div>
    </section>
</template>
