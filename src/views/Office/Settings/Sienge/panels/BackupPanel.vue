<script setup>
/**
 * Aba "Backup" da tela Sienge (o cabeçalho vive no hub, ../Index.vue).
 *
 * Acompanha a carga diária que alimenta Custos/Títulos, Faturamento, Contas a
 * Receber, Inadimplência, Stand de Vendas e os relatórios da Eme. A regra da
 * carga (horário, retentativa, vigia, aviso) mora na aba Configuração.
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useSiengeBackupStore } from '@/stores/Sienge/backupStore'

import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import Surface from '@/components/UI/Surface.vue'
import EmptyState from '@/components/UI/EmptyState.vue'
import Skeleton from '@/components/UI/Skeleton.vue'
import StatRow from '@/components/UI/StatRow.vue'
import DataTable from '@/components/UI/DataTable.vue'

import BackupFilters from '../components/BackupFilters.vue'
import RunningPipeline from '../components/RunningPipeline.vue'
import { pedirConfirmacao } from '@/composables/useConfirm';
import {
    formatBytes, formatDate, formatDuration, formatTime,
    stageLabel, statusIcon, statusLabel, statusVariant,
    triggerKind, triggerLabel,
} from '../format'

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

/** Refinamentos aplicados sobre o período carregado (filtro + recorte do KPI). */
const filteredItems = computed(() => {
    const q = applied.q.trim().toLowerCase()
    return store.items.filter((row) => {
        if (recorte.value && row.status !== recorte.value) return false
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

/* `priority` decide a ORDEM no celular. Quem abre esta aba quer saber QUANDO
   rodou e se DEU CERTO; o erro vem logo abaixo, porque e o motivo de abrir. */
const HIST_COLUMNS = [
    { key: 'started_at', label: 'Início', priority: 1, sortable: true },
    { key: 'status', label: 'Status', priority: 1, sortable: true },
    { key: '_erro', label: 'Erro', priority: 2 },
    { key: 'import_status', label: 'Restore', priority: 2, sortable: true },
    { key: 'duration_ms', label: 'Duração', priority: 2, sortable: true, numeric: true },
    { key: 'file_size_bytes', label: 'Tamanho', priority: 2, sortable: true, numeric: true },
    { key: 'stage', label: 'Etapa', priority: 2, sortable: true },
    { key: 'triggered_by', label: 'Disparo', priority: 3, sortable: true },
    { key: 'id', label: '#', priority: 3, sortable: true },
]

/* Quem ordena continua sendo o `sortedItems` daqui, que tem SORT_VALUES com
   regra propria por coluna. O DataTable so mostra os controles e avisa - dai
   o `manual-sort`. */
const ordenarPor = computed({
    get: () => sort.key,
    set: (v) => { sort.key = v || 'started_at' },
})
const ordenarDir = computed({
    get: () => sort.dir,
    set: (v) => { sort.dir = v === 'asc' ? 'asc' : 'desc' },
})

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

/* KPIs do período carregado. Clicar recorta a TABELA, não os cartões: os
   cartões descrevem o período, a tabela mostra o recorte. */
const KPI_DEFS = [
    { key: 'success', label: 'Sucesso',     icon: 'fas fa-circle-check', tone: 'pos' },
    { key: 'failed',  label: 'Falhas',      icon: 'fas fa-circle-xmark', tone: 'neg' },
    { key: 'running', label: 'Em execução', icon: 'fas fa-circle-notch', tone: 'accent' },
    { key: 'skipped', label: 'Ignorados',   icon: 'fas fa-forward',      tone: 'neutral' },
]

const inteiro = (v) => Math.round(v).toLocaleString('pt-BR')

const kpiCards = computed(() => {
    const total = store.items.length
    const cards = [{
        key: 'total', label: 'Execuções', raw: total, format: inteiro,
        icon: 'fas fa-list-check', tone: 'accent', hint: appliedLabel.value,
        tooltip: 'Clique para voltar ao período inteiro',
    }]
    for (const def of KPI_DEFS) {
        const n = store.items.filter(i => i.status === def.key).length
        if (!n) continue
        cards.push({
            ...def,
            raw: n,
            format: inteiro,
            hint: total ? `${Math.round((n / total) * 100)}% do período` : '',
            tooltip: `Clique para ver só as rodadas com status ${statusLabel(def.key)}`,
        })
    }
    return cards
})

/* O mesmo gesto liga e desliga, e "Execuções" sempre volta ao conjunto inteiro. */
const recorte = ref('')
function aoClicarKpi(item) {
    recorte.value = (item.key === 'total' || recorte.value === item.key) ? '' : item.key
}

// ─── Idade do espelho ───────────────────────────────────────────────────────
// A pergunta que nenhuma tela respondia: de quando é o dado que Custos/Títulos,
// Recebimentos do Ato, Inadimplência e Stand de Vendas estão mostrando? Quando
// a carga falhava, todas seguiam exibindo o número antigo em silêncio.

/* `lastChange` vem SEM fuso, de propósito: é a hora de parede que o Sienge
   gravou. Anexar 'Z' ou deixar o servidor converter jogaria a data 3 h, porque
   o Railway roda em UTC. */
const espelhoData = computed(() => {
    const iso = store.freshness?.lastChange
    if (!iso) return null
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? null : d
})

const espelhoIdade = computed(() => {
    const h = store.freshness?.ageHours
    if (h == null) return null
    if (h < 1) return `${Math.round(h * 60)} min`
    if (h < 48) return `${h.toFixed(1).replace('.', ',')} h`
    return `${Math.floor(h / 24)} dias`
})

const espelhoVelho = computed(() => store.freshness?.stale === true)

// ─── Polling ────────────────────────────────────────────────────────────────
let pollTimer = null

function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
        fetchRange()
        store.fetchFreshness()
    }, isRunning.value ? 5000 : 30000)
}

function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// `store.loading` também fica true nos polls silenciosos - por isso o botão usa
// um estado próprio, senão ele piscaria sozinho a cada atualização automática.
const refreshing = ref(false)

/* O esqueleto so aparece quando a LISTA esta sendo trocada (filtro, recarga
   manual). `store.loading` tambem fica true nos polls silenciosos, e liga-lo
   direto faria a lista inteira piscar sozinha a cada atualizacao automatica -
   o mesmo motivo pelo qual o botao ja tinha estado proprio. */
const carregandoLista = computed(() => (filtering.value || refreshing.value) && !sortedItems.value.length)
async function refresh() {
    refreshing.value = true
    try {
        await Promise.all([
            fetchRange({ withSpinner: true }),
            store.fetchFreshness({ force: true }),
        ])
        startPolling()
    } finally {
        refreshing.value = false
    }
}

// ─── Ações ──────────────────────────────────────────────────────────────────
async function onTriggerFullBackup() {
    if (!await pedirConfirmacao({
        title: 'Disparar o pipeline completo do backup?',
        consequence: 'Download do Sienge, restore no banco de staging, validacao e troca atomica. Leva de 20 a 50 minutos.',
        hint: 'A producao fica intocada ate a validacao passar. Se falhar, o dado antigo e preservado.',
        tone: 'accent',
        confirmLabel: 'Disparar pipeline',
    })) return
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
    if (!await pedirConfirmacao({
        title: 'Marcar este backup como falho?',
        consequence: 'Isto nao mata processo nenhum: se o pg_restore ainda estiver rodando no servidor, ele continua ate o fim. So libera o estado para disparar de novo.',
        hint: 'Use apenas quando o processo morreu fora do controle, como um redeploy no meio do restore.',
        confirmLabel: 'Marcar como falho',
    })) return
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
    // `store.loaded` a aba desenha status/KPIs/histórico, pra não piscar vazio.
    await fetchRange({ withSpinner: true })
    store.fetchFreshness()
    startPolling()
})
onBeforeUnmount(stopPolling)
</script>

<template>
    <div>
        <!-- Toolbar da aba (o cabeçalho vive no hub Sienge) -->
        <div class="flex items-center justify-end gap-2 mb-3 flex-wrap">
            <Button variant="secondary" size="sm" icon="fas fa-rotate" :loading="refreshing" @click="refresh">
                <span class="hidden sm:inline">Atualizar</span>
            </Button>

            <Button v-if="isRunning" variant="danger" size="sm" icon="fas fa-circle-stop"
                :loading="cancelling"
                title="Use somente se o processo morreu (ex: após deploy). Marca o log como falho - não mata processo nenhum."
                @click="onCancelRunning">
                <span class="hidden sm:inline">Forçar cancelar</span>
            </Button>

            <Button variant="primary" size="sm" icon="fas fa-play"
                :disabled="isRunning || store.triggering" @click="onTriggerFullBackup">
                Rodar backup<span class="hidden sm:inline"> agora</span>
            </Button>
        </div>

        <div v-if="store.hasError"
            class="mb-4 rounded-xl border border-data-neg/30 bg-data-neg/10 px-4 py-3 text-sm text-data-neg
                   flex items-center gap-3 flex-wrap">
            <i class="fas fa-circle-exclamation"></i>
            <span class="flex-1 min-w-0">{{ store.error }}</span>
            <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="refresh">
                Tentar novamente
            </Button>
        </div>

        <!-- Esqueleto na forma exata do conteúdo: o layout não pode pular
             quando o dado chega. -->
        <div v-if="!store.loaded" class="space-y-4">
            <Skeleton variant="row" />
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                <Skeleton v-for="i in 5" :key="i" variant="stat" />
            </div>
            <Skeleton variant="table" :lines="8" />
        </div>

        <div v-else class="space-y-4">

            <!-- Idade do espelho. Fica ACIMA do status da rodada de propósito:
                 "a última carga deu certo" não é a mesma pergunta que "de
                 quando é o dado que as telas estão mostrando", e é a segunda
                 que interessa a quem abre esta aba. -->
            <Surface v-if="store.freshness" padding="none"
                :class="espelhoVelho ? 'border-data-neg/30 bg-data-neg/[0.06]' : 'border-line'">
                <div class="p-4 flex items-start gap-3 sm:gap-4">
                    <div class="text-xl sm:text-2xl shrink-0"
                        :class="espelhoVelho ? 'text-data-neg' : 'text-ink-muted'">
                        <i :class="espelhoVelho ? 'fas fa-clock-rotate-left' : 'fas fa-database'"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-semibold text-ink text-sm sm:text-base">
                            <span v-if="espelhoData">
                                Espelho com dado de {{ formatDate(espelhoData) }}
                            </span>
                            <span v-else>Não foi possível ler a data do espelho</span>
                        </p>
                        <p class="text-micro sm:text-xs text-ink-muted mt-0.5">
                            <span v-if="espelhoIdade">{{ espelhoIdade }} atrás</span>
                            <span v-if="espelhoIdade"> • </span>
                            limite de {{ store.freshness.staleLimitHours }} h
                        </p>
                        <p v-if="espelhoVelho" class="text-xs text-data-neg mt-1.5">
                            Custos/Títulos, Recebimentos do Ato, Inadimplência e Stand de Vendas
                            estão mostrando esse dado, não o de agora.
                        </p>
                    </div>
                    <Badge v-if="espelhoVelho" variant="danger" size="sm">Velho</Badge>
                    <Badge v-else variant="success" size="sm">Em dia</Badge>
                </div>
            </Surface>

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
                <h2 class="text-base sm:text-lg font-semibold text-ink">Histórico</h2>

                <StatRow :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 5 }"
                    selectable :active-key="recorte" @select="aoClicarKpi" />

                <BackupFilters :filters="filters" :facets="facets" :loading="filtering"
                    :applied-label="appliedLabel" :active-count="activeFiltersCount"
                    @apply="applyFilters" @reset="resetFilters" />

                <!-- Linha de estado: impede alguém de ler uma lista recortada
                     achando que é o total. -->
                <p class="text-xs text-ink-muted flex items-center gap-2 flex-wrap">
                    <span>
                        <span v-if="filteredItems.length !== store.items.length" class="tabular-nums">
                            {{ filteredItems.length }} de
                        </span>
                        <span class="tabular-nums">{{ store.items.length }}</span>
                        execução(ões) em <span class="font-mono tabular-nums">{{ appliedLabel }}</span>
                    </span>
                    <button v-if="recorte" type="button"
                        class="inline-flex items-center gap-1.5 px-2 h-6 rounded-full border border-accent/20
                               bg-accent-soft text-accent focus-ring"
                        @click="recorte = ''">
                        só {{ statusLabel(recorte).toLowerCase() }}
                        <i class="fas fa-times text-micro"></i>
                    </button>
                </p>

                <!-- A listagem é o primitivo. Eram duas listas escritas em
                     paralelo, e elas divergiram: só o cabeçalho da tabela
                     ordenava, então no celular não havia como ordenar por
                     duração nem por tamanho - que é exatamente o que se
                     procura quando um restore demora demais. -->
                <Surface padding="none" class="overflow-hidden">
                    <div class="p-3 sm:p-4">
                        <DataTable
                            :columns="HIST_COLUMNS"
                            :rows="sortedItems"
                            row-key="id"
                            :loading="carregandoLista"
                            manual-sort
                            v-model:sort-by="ordenarPor"
                            v-model:sort-dir="ordenarDir"
                            empty-icon="fas fa-filter-circle-xmark"
                            :empty-title="store.items.length ? 'Nenhuma execução com esses filtros' : 'Nenhuma execução no período'"
                            :empty-text="store.items.length ? 'Ajuste ou limpe os filtros da barra acima.' : 'Ajuste as datas e clique em Filtrar para consultar outro período.'">

                            <template #cell-started_at="{ row }">
                                <span class="text-ink">{{ formatDate(row.started_at) }}</span>
                                <span v-if="row.finished_at" class="block text-xs text-ink-muted font-normal">
                                    até {{ formatTime(row.finished_at) }}
                                </span>
                            </template>

                            <template #cell-status="{ row }">
                                <Badge :variant="statusVariant(row.status)" size="sm">
                                    <i :class="statusIcon(row.status)"></i>{{ statusLabel(row.status) }}
                                </Badge>
                            </template>

                            <template #cell-id="{ row }">
                                <span class="font-mono text-xs text-ink-subtle">{{ row.id }}</span>
                            </template>

                            <template #cell-triggered_by="{ row }">
                                <span class="text-ink-muted">{{ triggerLabel(row.triggered_by) }}</span>
                            </template>

                            <template #cell-stage="{ row }">
                                <span class="text-ink-muted">{{ stageLabel(row.stage) }}</span>
                            </template>

                            <template #cell-import_status="{ row }">
                                <Badge v-if="row.import_status" :variant="statusVariant(row.import_status)" size="sm">
                                    <i :class="statusIcon(row.import_status)"></i>{{ statusLabel(row.import_status) }}
                                </Badge>
                                <span v-else class="text-ink-subtle text-xs">-</span>
                            </template>

                            <template #cell-duration_ms="{ row }">
                                <span class="font-mono tabular-nums text-ink-muted">{{ formatDuration(row.duration_ms) }}</span>
                            </template>

                            <template #cell-file_size_bytes="{ row }">
                                <span class="font-mono tabular-nums text-ink-muted">{{ formatBytes(row.file_size_bytes) }}</span>
                            </template>

                            <!-- O erro é o motivo de alguém abrir esta aba: fica
                                 inteiro, sem cortar em três linhas. -->
                            <template #cell-_erro="{ row }">
                                <span v-if="row.error_message || row.import_error_message"
                                    class="text-data-neg break-words">
                                    {{ row.error_message || row.import_error_message }}
                                </span>
                                <span v-else class="text-ink-subtle">-</span>
                            </template>
                        </DataTable>
                    </div>
                </Surface>
            </section>
        </div>
    </div>
</template>
