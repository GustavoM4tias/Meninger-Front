// Formatadores compartilhados entre a tela de Backup Sienge e seus componentes.

export function formatDate(s) {
    if (!s) return '-'
    return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

export function formatTime(s) {
    if (!s) return '-'
    return new Date(s).toLocaleTimeString('pt-BR', { timeStyle: 'medium' })
}

export function formatBytes(n) {
    if (!n) return '-'
    const num = Number(n)
    if (!Number.isFinite(num)) return '-'
    if (num < 1024) return `${num} B`
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
    if (num < 1024 * 1024 * 1024) return `${(num / 1024 / 1024).toFixed(1)} MB`
    return `${(num / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatDuration(ms) {
    if (!ms) return '-'
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const rs = s % 60
    if (m < 60) return `${m}m ${rs}s`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
}

// ── Vocabulário do log (mesmos valores gravados pelo SiengeBackupService) ────

export const STATUS_LABELS = {
    success: 'Sucesso',
    failed: 'Falhou',
    running: 'Em execução',
    skipped: 'Ignorado',
    pending: 'Aguardando',
}

export const STAGE_LABELS = {
    starting: 'Inicializando',
    // Prova o pg_restore e a conexão ANTES de tocar no staging. Falhar aqui é
    // inofensivo: nada foi criado nem dropado ainda.
    preflight: 'Conferindo pré-requisitos',
    fetching_md5: 'Validação inicial (MD5)',
    downloading: 'Download do Sienge',
    decompressing: 'Descompactação local',
    preparing_staging: 'Preparando staging',
    restoring: 'pg_restore no staging',
    validating: 'Validando staging',
    swapping: 'Swap atômico',
    applying_grants: 'Reaplicando permissões',
    applying_views: 'Recriando views',
    // Não é falha: outra rodada estava com a trava e esta foi dispensada antes
    // de poder atrapalhar.
    lock_busy: 'Dispensada (outra rodada em andamento)',
    done: 'Concluído',
}

export function statusLabel(v) {
    return STATUS_LABELS[v] || v || '-'
}

export function stageLabel(v) {
    return STAGE_LABELS[v] || v || '-'
}

/** `triggered_by` é 'cron', 'watchdog' ou 'manual:<userId>'. */
export function triggerKind(v) {
    const s = String(v || '')
    if (s.startsWith('manual')) return 'manual'
    if (s === 'watchdog') return 'watchdog'
    return 'cron'
}

export function triggerLabel(v) {
    switch (triggerKind(v)) {
        case 'manual': return 'Manual'
        // Disparo do vigia: o espelho passou do limite de idade e ninguém
        // estava rodando, então ele mesmo puxou a carga.
        case 'watchdog': return 'Vigia de frescor'
        default: return 'Automático (cron)'
    }
}

export function statusVariant(status) {
    switch (status) {
        case 'success': return 'success'
        case 'failed': return 'danger'
        case 'running': return 'accent'
        case 'skipped': return 'neutral'
        default: return 'neutral'
    }
}

export function statusIcon(status) {
    switch (status) {
        case 'success': return 'fas fa-check'
        case 'failed': return 'fas fa-xmark'
        case 'running': return 'fas fa-circle-notch fa-spin'
        case 'skipped': return 'fas fa-forward'
        default: return 'fas fa-circle'
    }
}
