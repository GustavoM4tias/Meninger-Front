<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useSiengeBackupStore } from '@/stores/Sienge/backupStore'

import PageContainer from '@/components/UI/PageContainer.vue'
import PageHeader from '@/components/UI/PageHeader.vue'
import PageHelp from '@/components/UI/PageHelp.vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import Surface from '@/components/UI/Surface.vue'
import EmptyState from '@/components/UI/EmptyState.vue'

import BackupFilters from './components/BackupFilters.vue'
import RunningPipeline from './components/RunningPipeline.vue'
import {
    formatBytes, formatDate, formatDuration, formatTime,
    stageLabel, statusIcon, statusLabel, statusVariant,
    triggerKind, triggerLabel,
} from './format'

const store = useSiengeBackupStore()
const toast = useToast()

const isRunning = computed(() => !!store.runningBackup)

// ─── Filtro de período (consulta no servidor, sem limite de quantidade) ─────
// Padrão: mês corrente do usuário. Só consulta ao clicar em Filtrar.
function isoDay(d) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function currentMonthRange() {
    const now = new Date()
    return {
        dateFrom: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        dateTo: isoDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    }
}

/** Estado inicial: mês corrente e nenhum refinamento. */
function defaultFilters() {
    return {
        ...currentMonthRange(),
        status: [],
        importStatus: [],
        stage: [],
        trigger: [],
        q: '',
    }
}

// `filters` é o rascunho editado na barra; `applied` é o que está valendo na
// tela (período consultado no servidor + refinamentos aplicados na lista).
const filters = reactive(defaultFilters())
const applied = reactive(defaultFilters())

/** Converte a data do input no instante local correspondente (início/fim do dia). */
function boundary(day, end) {
    if (!day) return null
    const [y, m, d] = day.split('-').map(Number)
    return new Date(y, m - 1, d, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0).toISOString()
}

const appliedLabel = computed(() => {
    if (!applied.dateFrom && !applied.dateTo) return 'Tudo'
    const fmt = (day) => day ? day.split('-').reverse().join('/') : ''
    const cur = currentMonthRange()
    if (applied.dateFrom === cur.dateFrom && applied.dateTo === cur.dateTo) {
        return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
    if (!applied.dateTo) return `a partir de ${fmt(applied.dateFrom)}`
    if (!applied.dateFrom) return `até ${fmt(applied.dateTo)}`
    return `${fmt(applied.dateFrom)} a ${fmt(applied.dateTo)}`
})

// O cartão de status só faz sentido quando o período carregado alcança hoje -
// em consultas de meses passados ele mostraria um "último backup" antigo.
const periodIncludesToday = computed(() => {
    const today = isoDay(new Date())
    if (applied.dateFrom && applied.dateFrom > today) return false
    if (applied.dateTo && applied.dateTo < today) return false
    return true
})

async function fetchRange({ withSpinner = false } = {}) {
    await store.fetchBackups({
        from: boundary(applied.dateFrom, false),
        to: boundary(applied.dateTo, true),
        withSpinner,
    })
}

const filtering = ref(false)
async function applyFilters() {
    Object.assign(applied, JSON.parse(JSON.stringify(filters)))
    filtering.value = true
    try {
        await fetchRange({ withSpinner: true })
        startPolling()
    } finally {
        filtering.value = false
    }
}

async function resetFilters() {
    Object.assign(filters, defaultFilters())
    await applyFilters()
}

// Quantos refinamentos (fora o período) estão valendo.
const activeFiltersCount = computed(() => {
    let n = 0
    if (applied.status.length) n++
    if (applied.importStatus.length) n++
    if (applied.stage.length) n++
    if (applied.trigger.length) n++
    if (applied.q) n++
    return n
})

/** Opções dos filtros derivadas do histórico carregado (só o que existe no dado). */
function facetFrom(values, labelFn) {
    const uniq = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))]
    return uniq.map(v => ({ value: v, label: labelFn(v) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}

const facets = computed(() => ({
    status: facetFrom(store.items.map(i => i.status), statusLabel),
    importStatus: facetFrom(store.items.map(i => i.import_status), statusLabel),
    stage: facetFrom(store.items.map(i => i.stage), stageLabel),
    trigger: facetFrom(store.items.map(i => triggerKind(i.triggered_by)), triggerLabel),
}))

/** Refinamentos aplicados sobre o período carregado. */
const filteredItems = computed(() => {
    const q = applied.q.trim().toLowerCase()
    return store.items.filter((row) => {
        if (applied.status.length && !applied.status.includes(row.status)) return false
        if (applied.importStatus.length && !applied.importStatus.includes(row.import_status)) return false
        if (applied.stage.length && !applied.stage.includes(row.stage)) return false
        if (applied.trigger.length && !applied.trigger.includes(triggerKind(row.triggered_by))) return false
        if (q) {
            const haystack = [
                row.id, row.file_name, row.error_message, row.import_error_message,
                row.triggered_by, row.stage,
            ].filter(Boolean).join(' ').toLowerCase()
            if (!haystack.includes(q)) return false
        }
        return true
    })
})

// ─── Ordenação da tabela ────────────────────────────────────────────────────
const SORT_VALUES = {
    id: r => Number(r.id) || 0,
    started_at: r => (r.started_at ? new Date(r.started_at).getTime() : 0),
    triggered_by: r => triggerLabel(r.triggered_by),
    stage: r => stageLabel(r.stage),
    status: r => statusLabel(r.status),
    import_status: r => statusLabel(r.import_status),
    duration_ms: r => Number(r.duration_ms) || 0,
    file_size_bytes: r => Number(r.file_size_bytes) || 0,
}

const sort = reactive({ key: 'started_at', dir: 'desc' })

function setSort(key) {
    if (!SORT_VALUES[key]) return
    if (sort.key === key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
    else { sort.key = key; sort.dir = key === 'started_at' || key === 'id' ? 'desc' : 'asc' }
}

function sortIcon(key) {
    if (sort.key !== key) return 'fas fa-sort text-ink-subtle/50'
    return sort.dir === 'asc' ? 'fas fa-sort-up text-accent' : 'fas fa-sort-down text-accent'
}

const HIST_COLUMNS = [
    { key: 'id', label: '#' },
    { key: 'started_at', label: 'Início' },
    { key: 'triggered_by', label: 'Disparo' },
    { key: 'stage', label: 'Etapa' },
    { key: 'status', label: 'Status' },
    { key: 'import_status', label: 'Restore' },
    { key: 'duration_ms', label: 'Duração', align: 'right' },
    { key: 'file_size_bytes', label: 'Tamanho', align: 'right' },
    { key: null, label: 'Erro' },
]

const sortedItems = computed(() => {
    const get = SORT_VALUES[sort.key] || SORT_VALUES.started_at
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...filteredItems.value].sort((a, b) => {
        const va = get(a)
        const vb = get(b)
        if (typeof va === 'string' || typeof vb === 'string') {
            return String(va).localeCompare(String(vb), 'pt-BR') * factor
        }
        return (va - vb) * factor
    })
})

// KPIs: contagem por status no período carregado.
const kpiChips = computed(() => {
    const count = (s) => store.items.filter(i => i.status === s).length
    return [
        { value: 'success', label: 'Sucesso', icon: 'fas fa-circle-check', total: count('success') },
        { value: 'failed', label: 'Falhas', icon: 'fas fa-circle-xmark', total: count('failed') },
        { value: 'running', label: 'Em execução', icon: 'fas fa-circle-notch', total: count('running') },
        { value: 'skipped', label: 'Ignorados', icon: 'fas fa-forward', total: count('skipped') },
    ].filter(c => c.total > 0)
})

// ─── Polling ────────────────────────────────────────────────────────────────
let pollTimer = null

function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => { fetchRange() }, isRunning.value ? 5000 : 30000)
}

function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// `store.loading` também fica true nos polls silenciosos - por isso o botão usa
// um estado próprio, senão ele piscaria sozinho a cada atualização automática.
const refreshing = ref(false)
async function refresh() {
    refreshing.value = true
    try {
        await fetchRange({ withSpinner: true })
        startPolling()
    } finally {
        refreshing.value = false
    }
}

// ─── Ações ──────────────────────────────────────────────────────────────────
async function onTriggerFullBackup() {
    if (!confirm('Disparar pipeline completo?\n\n' +
        '• Download do Sienge (~5-20 min)\n' +
        '• pg_restore no banco staging (~15-30 min)\n' +
        '• Validação + swap atômico (~1s)\n' +
        '• Reaplicação de permissões\n\n' +
        'Banco de produção fica intocado até validação OK. ' +
        'Em caso de falha, dado antigo é preservado.\n\n' +
        'Duração total estimada: 20-50 min.')) return
    try {
        await store.triggerFullBackup()
        toast.success('Backup iniciado. Acompanhe o status abaixo.')
        await fetchRange()
        startPolling()
    } catch (err) {
        toast.error(err.message || 'Falha ao disparar backup')
    }
}

const cancelling = ref(false)
async function onCancelRunning() {
    const running = store.runningBackup
    if (!running) return
    const msg = 'Marcar este backup como FALHO?\n\n' +
        'Use somente se o processo morreu fora do controle ' +
        '(ex: redeploy do Railway durante o restore). ' +
        'Não mata processo nenhum - apenas libera o estado pra rodar de novo.\n\n' +
        'Se o pg_restore ainda estiver rodando no servidor, ele continua até terminar.'
    if (!confirm(msg)) return
    cancelling.value = true
    try {
        await store.cancelBackup(running.id)
        toast.success('Backup marcado como falho. Pode disparar de novo.')
        await fetchRange()
    } catch (err) {
        toast.error(err.message || 'Falha ao cancelar')
    } finally {
        cancelling.value = false
    }
}

onMounted(async () => {
    // Carregamento inicial usa o overlay global (logo animada). Só depois de
    // `store.loaded` a tela desenha status/KPIs/histórico, pra não piscar vazio.
    await fetchRange({ withSpinner: true })
    startPolling()
})
onBeforeUnmount(stopPolling)
</script>

<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="xl">

            <PageHeader title="Backup Sienge" icon-img="/icons/sienge.png"
                subtitle="Backup diário do banco Sienge às 5h. O restore roda em um banco staging e a produção só é trocada por rename atômico depois da validação - se algo falhar, o dado antigo é preservado.">
                <template #actions>
                    <PageHelp storage-key="backup-sienge"
                        intro="Esta tela acompanha o backup diário do banco do Sienge, que alimenta as telas de Custos, Faturamento, Contas a Receber e os relatórios da Eme."
                        :steps="[
                            { title: 'Confira o status do dia', text: 'O cartão no topo mostra se há backup rodando agora ou os dados do último backup concluído com sucesso (horário, duração e tamanho).' },
                            { title: 'Acompanhe as etapas', text: 'Durante a execução, use Ver etapas para ver em que ponto do pipeline o backup está, com progresso do download e das cinco fases do restore.' },
                            { title: 'Consulte outro período', text: 'O histórico abre no mês atual. Abra Filtros, ajuste as datas e clique em Filtrar - a consulta traz todas as execuções do período, sem limite de quantidade.' },
                            { title: 'Refine e ordene', text: 'Nos mesmos filtros dá para restringir por status, restore, tipo de disparo, etapa ou texto livre. Na tabela, clique no título de uma coluna para ordenar por ela e de novo para inverter.' },
                            { title: 'Rode manualmente', text: 'Rodar backup agora dispara o pipeline completo fora do horário do cron. Leva de 20 a 50 minutos.' },
                            { title: 'Destrave um backup travado', text: 'Se um backup ficou marcado como em execução mas o processo morreu (deploy, queda do servidor), use Forçar cancelar para liberar e disparar de novo.' },
                        ]" :tips="[
                            'Forçar cancelar não mata processo nenhum - só marca o log como falho para liberar um novo disparo.',
                            'Enquanto um backup roda, a tela se atualiza sozinha a cada 5 segundos.',
                        ]" />

                    <Button variant="secondary" size="md" icon="fas fa-rotate" :loading="refreshing"
                        @click="refresh">
                        <span class="hidden sm:inline">Atualizar</span>
                    </Button>

                    <Button v-if="isRunning" variant="danger" size="md" icon="fas fa-circle-stop"
                        :loading="cancelling"
                        title="Use somente se o processo morreu (ex: após deploy). Marca o log como falho - não mata processo nenhum."
                        @click="onCancelRunning">
                        <span class="hidden sm:inline">Forçar cancelar</span>
                    </Button>

                    <Button variant="primary" size="md" icon="fas fa-play"
                        :disabled="isRunning || store.triggering" @click="onTriggerFullBackup">
                        Rodar backup<span class="hidden sm:inline"> agora</span>
                    </Button>
                </template>
            </PageHeader>

            <div v-if="store.hasError"
                class="mb-4 rounded-xl border border-data-neg/30 bg-data-neg/10 px-4 py-3 text-sm text-data-neg">
                <i class="fas fa-triangle-exclamation mr-2"></i>{{ store.error }}
            </div>

            <!-- Só desenha depois da 1ª resposta (evita piscar valores vazios) -->
            <div v-if="store.loaded" class="space-y-4">

                <!-- Status atual (some quando a consulta é de um período passado) -->
                <RunningPipeline v-if="isRunning" :log="store.runningBackup" />

                <Surface v-else-if="periodIncludesToday && store.latestSuccess" padding="none"
                    class="border-data-pos/30 bg-data-pos/[0.06]">
                    <div class="p-4 flex items-center gap-3 sm:gap-4">
                        <div class="text-data-pos text-xl sm:text-2xl shrink-0">
                            <i class="fas fa-circle-check"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="font-semibold text-ink text-sm sm:text-base">
                                Último backup OK - {{ formatDate(store.latestSuccess.finished_at) }}
                            </p>
                            <p class="text-micro sm:text-xs text-ink-muted mt-0.5">
                                Duração total: {{ formatDuration(store.latestSuccess.duration_ms) }}
                                • Tamanho: {{ formatBytes(store.latestSuccess.file_size_bytes) }}
                                <span v-if="store.latestSuccess.import_duration_ms">
                                    • Restore: {{ formatDuration(store.latestSuccess.import_duration_ms) }}
                                </span>
                            </p>
                        </div>
                    </div>
                </Surface>

                <Surface v-else-if="periodIncludesToday" padding="none">
                    <EmptyState size="sm" icon="fas fa-database" title="Nenhum backup concluído neste período"
                        description="Dispare manualmente em Rodar backup agora ou aguarde o cron das 5h." />
                </Surface>

                <!-- Histórico -->
                <section class="space-y-3 pt-2">
                    <div class="flex items-end justify-between gap-3 flex-wrap">
                        <div>
                            <h2 class="text-base sm:text-lg font-semibold text-ink">Histórico</h2>
                            <p class="text-xs text-ink-muted mt-0.5">
                                <span v-if="filteredItems.length !== store.items.length">
                                    {{ filteredItems.length }} de
                                </span>
                                {{ store.items.length }} execução(ões) em {{ appliedLabel }}
                            </p>
                        </div>
                    </div>

                    <!-- KPIs do período carregado -->
                    <div v-if="kpiChips.length" class="flex flex-wrap gap-2">
                        <div v-for="c in kpiChips" :key="c.value"
                            class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-surface-raised text-xs font-medium text-ink-muted min-h-10">
                            <i :class="c.icon"></i>
                            {{ c.label }}
                            <span class="font-mono tabular-nums text-ink">{{ c.total }}</span>
                        </div>
                    </div>

                    <BackupFilters :filters="filters" :facets="facets" :loading="filtering"
                        :applied-label="appliedLabel" :active-count="activeFiltersCount"
                        @apply="applyFilters" @reset="resetFilters" />

                    <Surface padding="none" class="overflow-hidden">
                        <EmptyState v-if="!sortedItems.length" size="sm" icon="fas fa-filter-circle-xmark"
                            :title="store.items.length ? 'Nenhuma execução com esses filtros' : 'Nenhuma execução no período'"
                            :description="store.items.length ? 'Ajuste ou limpe os filtros da barra acima.' : 'Ajuste as datas e clique em Filtrar para consultar outro período.'" />

                        <template v-else>
                            <!-- Desktop: tabela (clique no cabeçalho ordena) -->
                            <div class="hidden md:block overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="text-left text-micro uppercase tracking-wider text-ink-subtle border-b border-line">
                                            <th v-for="col in HIST_COLUMNS" :key="col.label" class="px-4 py-3 font-medium"
                                                :class="[
                                                    col.align === 'right' ? 'text-right' : 'text-left',
                                                    col.key ? 'select-none cursor-pointer hover:text-ink transition-colors' : '',
                                                ]"
                                                :aria-sort="col.key && sort.key === col.key
                                                    ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'"
                                                @click="col.key && setSort(col.key)">
                                                <span class="inline-flex items-center gap-1.5"
                                                    :class="col.align === 'right' ? 'flex-row-reverse' : ''">
                                                    {{ col.label }}
                                                    <i v-if="col.key" class="text-[9px]" :class="sortIcon(col.key)"></i>
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="row in sortedItems" :key="row.id"
                                            class="border-b border-line last:border-0 hover:bg-surface-sunken/60 transition-colors">
                                            <td class="px-4 py-3 align-top font-mono text-xs text-ink-subtle">{{ row.id }}</td>
                                            <td class="px-4 py-3 align-top whitespace-nowrap">
                                                <div class="text-ink">{{ formatDate(row.started_at) }}</div>
                                                <div v-if="row.finished_at" class="text-xs text-ink-muted">
                                                    até {{ formatTime(row.finished_at) }}
                                                </div>
                                            </td>
                                            <td class="px-4 py-3 align-top text-xs text-ink-muted whitespace-nowrap">
                                                {{ triggerLabel(row.triggered_by) }}
                                            </td>
                                            <td class="px-4 py-3 align-top text-xs text-ink-muted">
                                                {{ stageLabel(row.stage) }}
                                            </td>
                                            <td class="px-4 py-3 align-top">
                                                <Badge :variant="statusVariant(row.status)" size="sm">
                                                    <i :class="statusIcon(row.status)"></i>{{ statusLabel(row.status) }}
                                                </Badge>
                                            </td>
                                            <td class="px-4 py-3 align-top">
                                                <Badge v-if="row.import_status" :variant="statusVariant(row.import_status)" size="sm">
                                                    <i :class="statusIcon(row.import_status)"></i>{{ statusLabel(row.import_status) }}
                                                </Badge>
                                                <span v-else class="text-ink-subtle text-xs">-</span>
                                            </td>
                                            <td class="px-4 py-3 align-top text-right font-mono tabular-nums text-xs text-ink-muted">
                                                {{ formatDuration(row.duration_ms) }}
                                            </td>
                                            <td class="px-4 py-3 align-top text-right font-mono tabular-nums text-xs text-ink-muted">
                                                {{ formatBytes(row.file_size_bytes) }}
                                            </td>
                                            <td class="px-4 py-3 align-top text-xs max-w-xs">
                                                <span v-if="row.error_message || row.import_error_message"
                                                    class="text-data-neg break-words line-clamp-3"
                                                    :title="row.error_message || row.import_error_message">
                                                    {{ row.error_message || row.import_error_message }}
                                                </span>
                                                <span v-else class="text-ink-subtle">-</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Mobile: cards -->
                            <ul class="md:hidden divide-y divide-line">
                                <li v-for="row in sortedItems" :key="row.id" class="p-3.5 space-y-2">
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0">
                                            <p class="text-sm font-medium text-ink">{{ formatDate(row.started_at) }}</p>
                                            <p class="text-micro text-ink-muted">
                                                #{{ row.id }} • {{ triggerLabel(row.triggered_by) }}
                                            </p>
                                        </div>
                                        <Badge :variant="statusVariant(row.status)" size="sm">
                                            <i :class="statusIcon(row.status)"></i>{{ statusLabel(row.status) }}
                                        </Badge>
                                    </div>

                                    <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-micro">
                                        <div class="flex gap-1.5">
                                            <dt class="text-ink-subtle">Duração:</dt>
                                            <dd class="font-mono tabular-nums text-ink-muted">{{ formatDuration(row.duration_ms) }}</dd>
                                        </div>
                                        <div class="flex gap-1.5">
                                            <dt class="text-ink-subtle">Tamanho:</dt>
                                            <dd class="font-mono tabular-nums text-ink-muted">{{ formatBytes(row.file_size_bytes) }}</dd>
                                        </div>
                                        <div class="flex gap-1.5 col-span-2">
                                            <dt class="text-ink-subtle">Etapa:</dt>
                                            <dd class="text-ink-muted truncate">{{ stageLabel(row.stage) }}</dd>
                                        </div>
                                        <div v-if="row.import_status" class="flex items-center gap-1.5 col-span-2">
                                            <dt class="text-ink-subtle">Restore:</dt>
                                            <dd>
                                                <Badge :variant="statusVariant(row.import_status)" size="sm">
                                                    {{ statusLabel(row.import_status) }}
                                                </Badge>
                                            </dd>
                                        </div>
                                    </dl>

                                    <p v-if="row.error_message || row.import_error_message"
                                        class="text-micro text-data-neg break-words line-clamp-3">
                                        {{ row.error_message || row.import_error_message }}
                                    </p>
                                </li>
                            </ul>
                        </template>
                    </Surface>
                </section>
            </div>
        </PageContainer>
    </div>
</template>
