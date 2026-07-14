<template>
    <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto export-modal" @click="emitClose">
        <div class="flex items-start justify-center min-h-screen pt-6 px-4 pb-12 text-center sm:p-0">
            <div class="fixed inset-0 bg-gray-900/60 transition-opacity"></div>

            <div class="relative inline-block w-full max-w-7xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-50 dark:bg-gray-800 shadow-xl rounded-2xl"
                @click.stop>
                <!-- Header -->
                <div class="px-6 py-4 bg-white  dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0">
                            <h3 class="text-xl font-bold truncate">{{ title }}</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                Selecione os campos para exportar (funciona com qualquer JSON)
                            </p>
                        </div>

                        <div class="flex items-center gap-2">
                            <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
                                <button type="button" @click="panel = 'fields'" :class="[
                                    'px-3 py-1 text-sm font-medium',
                                    panel === 'fields'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100'
                                ]">
                                    Campos
                                </button>
                                <button type="button" @click="panel = 'preview'" :class="[
                                    'px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700',
                                    panel === 'preview'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100'
                                ]">
                                    Prévia
                                </button>
                            </div>

                            <button type="button" @click="emitClose"
                                class="text-dark hover:text-gray-700 ps-3 pt-1 dark:text-white dark:hover:text-blue-100 text-2xl transition-colors">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-0">
                    <!-- LEFT: Controls -->
                    <div
                        class="lg:border-r flex flex-col h-full justify-between border-gray-200 dark:border-gray-700 p-4 gap-4 bg-white/60 dark:bg-gray-900/30">
                        <div class="flex flex-col gap-4 overflow-y-auto pr-1 min-h-0">
                            <!-- Mini-header (compacto) -->
                            <div class="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                <img :src="logo" alt="" :class="['h-8 w-auto object-contain flex-shrink-0', invertLogo ? 'logo-invert' : '']"
                                    @error="$event.target.style.display='none'" />
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight" :title="suggestedTitle">
                                        {{ suggestedTitle }}
                                    </p>
                                    <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                        Emitido por {{ issuerName }}
                                    </p>
                                </div>
                            </div>

                            <!-- Filtros aplicados (chips inline) -->
                            <div v-if="normalizedFilters.length" class="flex flex-wrap gap-1">
                                <span v-for="f in normalizedFilters" :key="f.label"
                                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 text-[11px]"
                                    :title="`${f.label}: ${f.value}`">
                                    <span class="opacity-70">{{ f.label }}:</span>
                                    <span class="max-w-[140px] truncate font-medium">{{ f.value }}</span>
                                </span>
                            </div>

                            <!-- Busca de campos -->
                            <div class="relative">
                                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                <input v-model="fieldSearch" type="text"
                                    placeholder="Buscar campos…"
                                    aria-label="Filtrar campos"
                                    class="w-full pl-8 pr-3 py-2 border rounded-lg bg-transparent text-sm text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500" />
                            </div>

                            <!-- Atalhos inline + contador discreto -->
                            <div class="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
                                <button type="button" @click="selectRecommended()"
                                    class="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 font-medium hover:underline focus:outline-none focus:underline">
                                    <i class="fas fa-magic-wand-sparkles text-[10px]"></i> Recomendado
                                </button>
                                <span class="text-gray-300 dark:text-gray-700">·</span>
                                <button type="button" @click="selectAllVisible()" class="text-gray-600 dark:text-gray-300 hover:underline focus:outline-none focus:underline">Marcar visíveis</button>
                                <span class="text-gray-300 dark:text-gray-700">·</span>
                                <button type="button" @click="selectCommon()" class="text-gray-600 dark:text-gray-300 hover:underline focus:outline-none focus:underline" title="Apenas campos presentes em 100% dos registros">Só comuns</button>
                                <span class="text-gray-300 dark:text-gray-700">·</span>
                                <button type="button" @click="clearSelection()" class="text-gray-500 dark:text-gray-400 hover:text-red-600 focus:outline-none focus:underline">Limpar</button>
                            </div>

                            <!-- Opções avançadas -->
                            <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
                                <button type="button" @click="showAdvanced = !showAdvanced"
                                    class="text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none">
                                    <i :class="['fas', showAdvanced ? 'fa-chevron-down' : 'fa-chevron-right', 'mr-1 text-[10px]']"></i>
                                    Opções avançadas
                                </button>
                                <div v-show="showAdvanced" class="mt-3 grid grid-cols-1 gap-3">
                                    <div>
                                        <label for="exp-array-mode" class="flex items-center gap-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-1">
                                            O que fazer com listas?
                                            <span class="text-gray-400" title="Quando um campo é uma lista (ex.: várias parcelas), define como apresentar os valores no relatório.">
                                                <i class="fas fa-circle-info text-[10px]"></i>
                                            </span>
                                        </label>
                                        <select id="exp-array-mode" v-model="arrayMode"
                                            class="w-full px-2 py-1.5 border rounded-md bg-transparent text-sm text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500">
                                            <option value="join">Juntar com " | "</option>
                                            <option value="expand-rows">Quebrar em linhas</option>
                                            <option value="expand-cols">Quebrar em colunas</option>
                                            <option value="first">Apenas o primeiro</option>
                                            <option value="count">Só quantidade</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label for="exp-filename" class="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-1">Nome do arquivo</label>
                                        <input id="exp-filename" v-model="baseFilename" type="text" :placeholder="suggestedFilename"
                                            class="w-full px-2 py-1.5 border rounded-md bg-transparent text-sm text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500" />
                                    </div>
                                    <div>
                                        <label for="exp-delimiter" class="block text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-1">
                                            Delimitador do CSV
                                        </label>
                                        <select id="exp-delimiter" v-model="delimiter"
                                            class="w-full px-2 py-1.5 border rounded-md bg-transparent text-sm text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500">
                                            <option value=",">Vírgula (,)</option>
                                            <option value=";">Ponto e vírgula (;)</option>
                                            <option :value="'\t'">Tabulação (Tab)</option>
                                            <option value="|">Barra vertical (|)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer: status + ações -->
                        <div class="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                            <p aria-live="polite" class="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2">
                                <span>
                                    <span class="font-semibold text-gray-700 dark:text-gray-200">{{ selection.size }}</span> campos
                                </span>
                                <span>·</span>
                                <span>
                                    <span class="font-semibold text-gray-700 dark:text-gray-200">{{ exportedRowCount.toLocaleString('pt-BR') }}</span>
                                    {{ exportedRowCount === 1 ? 'linha' : 'linhas' }}
                                </span>
                                <span v-if="arrayMode === 'expand-cols'">·</span>
                                <span v-if="arrayMode === 'expand-cols'">
                                    <span class="font-semibold text-gray-700 dark:text-gray-200">{{ previewPaths.length }}</span> cols
                                </span>
                            </p>
                            <button type="button" @click="exportXLSX()" :disabled="!selection.size || exporting"
                                class="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition active:scale-[0.99]">
                                <i :class="['fas', exporting ? 'fa-spinner fa-spin' : 'fa-file-excel']"></i>
                                <span>{{ exporting ? 'Gerando…' : 'Exportar Excel' }}</span>
                            </button>
                            <div class="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                                <span>ou exportar como</span>
                                <button type="button" @click="exportCSV('csv')" :disabled="!selection.size || exporting"
                                    class="hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40 focus:outline-none focus:underline underline-offset-2">
                                    CSV
                                </button>
                                <span>·</span>
                                <button type="button" @click="exportPDF()" :disabled="!selection.size || exporting"
                                    class="hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40 focus:outline-none focus:underline underline-offset-2">
                                    PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT: Fields / Preview -->
                    <div class="lg:col-span-2 p-4">
                        <template v-if="panel === 'fields'">
                            <div
                                class="min-h-[70vh] max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <div
                                    class="text-xs px-3 py-2 bg-gray-100 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 sticky top-0 z-10">
                                    <label class="inline-flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" :checked="allVisibleChecked"
                                            @change="toggleAllVisible($event)" />
                                        Marcar todos os visíveis
                                    </label>
                                    <button type="button" class="underline" @click="expandAll">Expandir tudo</button>
                                    <button type="button" class="underline" @click="collapseAll">Recolher tudo</button>

                                    <label class="inline-flex items-center gap-2 ml-auto cursor-pointer">
                                        <input type="checkbox" v-model="showFullPaths" />
                                        Mostrar caminho completo
                                    </label>
                                </div>

                                <ul class="p-2">
                                    <FieldNode v-for="child in rootChildren(filteredTree)" :key="child.path"
                                        :node="child" :level="0" :stats-for-node="statsForNode"
                                        :selection-state="selectionState" :toggle-node="toggleNode"
                                        :toggle-expand="toggleExpand" :is-expanded="isExpanded" :leaf-paths="leafPaths"
                                        :show-full-paths="showFullPaths" />
                                </ul>
                            </div>
                        </template>

                        <template v-else>
                            <div class="mb-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                                <span>Prévia (máx. {{ maxPreviewRows }} linhas-fonte)</span>
                                <span v-if="previewPaths.length">{{ previewPaths.length }} colunas · {{ previewRows.length }} linhas</span>
                            </div>
                            <div
                                class="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg min-h-[70vh] max-h-[70vh]">
                                <table class="w-full text-xs">
                                    <thead class="bg-gray-100 dark:bg-gray-900/60 sticky top-0">
                                        <tr>
                                            <th v-for="p in previewPaths" :key="p"
                                                class="px-3 py-2 text-left font-semibold whitespace-nowrap" :title="p">
                                                {{ shortLabel(p) }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(row, i) in previewRows" :key="i"
                                            class="border-b border-gray-100 dark:border-gray-800">
                                            <td v-for="p in previewPaths" :key="p"
                                                class="px-3 py-1 align-top whitespace-pre-wrap">
                                                {{ formatCell(row[p]) }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import {
    computed,
    ref,
    watch,
    onMounted,
    defineComponent,
    h,
    nextTick
} from 'vue'
import ExcelJS from 'exceljs/dist/exceljs.min.js'
import saveAs from 'file-saver'
import dayjs from 'dayjs'
import { useAuthStore } from '@/stores/Settings/Auth/authStore'

/**
 * UniversalExportModal.vue
 * - Aceita qualquer JSON (Array ou Objeto)
 * - Descobre todos os caminhos possíveis (paths), atravessando arrays
 * - Árvore hierárquica com tri-state; ordem inversa (desc) entre irmãos
 * - Exporta XLSX (com logo, cabeçalho de relatório e formatação) ou CSV
 */

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    source: { type: [Array, Object], required: true },
    title: { type: String, default: 'Exportação de dados' },
    subtitle: { type: String, default: '' },
    filename: { type: String, default: '' },
    /** filtros aplicados na tela; aparecem no cabeçalho do XLSX e ajudam a
        gerar o título e o nome do arquivo. Formato:
        { 'Empreendimento': 'TERRAS V', 'Período': '05/2025' } */
    filters: { type: Object, default: () => ({}) },
    /** quem está emitindo o relatório; se vazio, pega do authStore */
    issuer: { type: String, default: '' },
    /** logo do cabeçalho (caminho público, png ou jpg) */
    logo: { type: String, default: '/Mlogotext.png' },
    /** inverte cores do logo (útil quando o logo é branco e o relatório tem fundo claro) */
    invertLogo: { type: Boolean, default: true },
    initialDelimiter: { type: String, default: ';' },
    initialArrayMode: { type: String, default: 'join' }, // 'join' | 'expand-rows' | 'expand-cols' | 'first' | 'count'
    maxPreviewRows: { type: Number, default: 50 },
    preselect: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'close', 'export'])
const emitClose = () => {
    emit('update:modelValue', false)
    emit('close')
}

/* ————— Painéis/estado ————— */
const panel = ref('fields')
const delimiter = ref(props.initialDelimiter)
const arrayMode = ref(props.initialArrayMode)
const fieldSearch = ref('')
const showFullPaths = ref(false)
const showAdvanced = ref(false)

/* ————— Contexto do relatório ————— */
const authStore = useAuthStore()
const issuerName = computed(() => {
    if (props.issuer) return props.issuer
    const u = authStore?.user || {}
    return u.username || u.name || u.email || 'Usuário'
})

/* Filtros normalizados: aceita objeto plano ou array de {label,value}. */
const normalizedFilters = computed(() => {
    const src = props.filters
    if (!src) return []
    if (Array.isArray(src)) {
        return src
            .map(f => ({ label: f.label || f.key, value: formatFilterValue(f.value) }))
            .filter(f => f.label && f.value && f.value !== '—')
    }
    return Object.entries(src)
        .map(([label, value]) => ({ label, value: formatFilterValue(value) }))
        .filter(f => f.value && f.value !== '—')
})

function formatFilterValue(v) {
    if (v == null || v === '') return ''
    if (v instanceof Set) v = [...v]
    if (Array.isArray(v)) {
        if (v.length === 0) return ''
        return v.map(formatFilterValue).filter(Boolean).join(', ')
    }
    if (v instanceof Date) return dayjs(v).format('DD/MM/YYYY')
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
}

/* Título sugerido = title + valores dos filtros mais relevantes (separados por ·) */
const suggestedTitle = computed(() => {
    const base = (props.title || 'Relatório').replace(/^Exporta[çc][ãa]o\s+(de\s+)?/i, '')
    const baseClean = base.charAt(0).toUpperCase() + base.slice(1)
    const parts = normalizedFilters.value
        .slice(0, 3)
        .map(f => f.value)
        .filter(Boolean)
    return parts.length ? `${baseClean} · ${parts.join(' · ')}` : baseClean
})

/* Filename sugerido: kebab-case do título sugerido + data atual */
const suggestedFilename = computed(() => {
    const slug = suggestedTitle.value
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
    const date = dayjs().format('YYYY-MM-DD')
    return slug ? `${slug}-${date}` : `relatorio-${date}`
})

const baseFilename = ref('')
watch(
    () => [props.modelValue, props.filename, suggestedFilename.value],
    ([open]) => {
        if (open && !baseFilename.value) {
            baseFilename.value = props.filename || suggestedFilename.value
        }
    },
    { immediate: true }
)

/* ————— Normalização da fonte de dados ————— */
const rows = computed(() => {
    const src = props.source
    if (Array.isArray(src)) return src
    if (src && typeof src === 'object') return [src]
    return []
})
const totalRows = computed(() => rows.value.length)

function isPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v)
}

/* ————— Coleta de paths (atravessando arrays) ————— */
function collectPathsFromValue(value, prefix, set) {
    if (Array.isArray(value)) {
        // path para o array em si
        if (prefix) set.add(prefix)
        for (const el of value) {
            collectPathsFromValue(el, prefix, set) // mantém o mesmo prefix para elementos (mesma coluna)
            if (isPlainObject(el)) {
                for (const k of Object.keys(el)) {
                    const next = prefix ? `${prefix}.${k}` : k
                    collectPathsFromValue(el[k], next, set)
                }
            }
        }
    } else if (isPlainObject(value)) {
        const keys = Object.keys(value)
        if (keys.length === 0 && prefix) set.add(prefix)
        for (const k of keys) {
            const next = prefix ? `${prefix}.${k}` : k
            collectPathsFromValue(value[k], next, set)
        }
    } else {
        if (prefix) set.add(prefix)
    }
}

const allPaths = computed(() => {
    const s = new Set()
    for (const row of rows.value) collectPathsFromValue(row, '', s)
    // ordenação padrão asc; a UI da árvore ordena desc por nível
    return [...s].sort()
})

/* ————— Resolução de paths (atravessa arrays) ————— */
function getByPath(obj, path) {
    if (!path) return obj
    const parts = path.split('.')
    return getDeep(obj, parts)
}
function getDeep(cur, parts) {
    if (cur == null) return undefined
    if (parts.length === 0) return cur
    const [head, ...tail] = parts
    if (Array.isArray(cur)) {
        const mapped = cur.map(el => getDeep(el, parts))
        return mapped.flat()
    }
    return getDeep(cur[head], tail)
}

/* ————— Estatísticas por path ————— */
function typeOfValue(v) {
    if (v === null || v === undefined) return 'vazio'
    if (Array.isArray(v)) return 'array'
    if (isPlainObject(v)) return 'objeto'
    if (typeof v === 'number') return Number.isFinite(v) ? 'número' : 'número'
    if (typeof v === 'boolean') return 'booleano'
    if (typeof v === 'string') {
        const iso =
            /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(:\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
        if (iso.test(v)) return 'data'
        return 'texto'
    }
    return typeof v
}

const statsMap = computed(() => {
    const m = new Map()
    const inc = (p, v) => {
        const e = m.get(p) || { present: 0, types: new Set() }
        const hasValue =
            v !== undefined &&
            v !== null &&
            !(Array.isArray(v) && v.length === 0) &&
            !(isPlainObject(v) && Object.keys(v).length === 0)
        if (hasValue) e.present++
        // tipos — se vier array, checa elementos
        if (Array.isArray(v)) {
            if (!v.length) e.types.add('array')
            else {
                for (const el of v) e.types.add(typeOfValue(el))
            }
        } else {
            e.types.add(typeOfValue(v))
        }
        m.set(p, e)
    }
    for (const row of rows.value) {
        for (const p of allPaths.value) inc(p, getByPath(row, p))
    }
    return m
})

const coverageAvg = computed(() => {
    if (!allPaths.value.length || !totalRows.value) return 0
    let s = 0
    for (const p of allPaths.value) {
        s += (statsMap.value.get(p)?.present || 0) / totalRows.value
    }
    return s / allPaths.value.length
})

/* ————— Filtro plano (para “Selecionar visíveis”) ————— */
const filteredPaths = computed(() => {
    const t = (fieldSearch.value || '').toLowerCase().trim()
    if (!t) return allPaths.value
    return allPaths.value.filter(p => p.toLowerCase().includes(t))
})

/* ————— Árvore: build / filter / order (desc) ————— */
function buildTree(paths) {
    const root = { path: '', label: '', children: new Map(), isLeaf: false }
    for (const full of paths) {
        const parts = full.split('.')
        let node = root
        let acc = []
        for (const part of parts) {
            acc.push(part)
            if (!node.children.has(part)) {
                node.children.set(part, {
                    path: acc.join('.'),
                    label: part,
                    children: new Map(),
                    isLeaf: false
                })
            }
            node = node.children.get(part)
        }
        node.isLeaf = true
    }
    return root
}
const treeRoot = computed(() => buildTree(allPaths.value))

function sortChildrenDesc(node) {
    const entries = [...node.children.entries()].sort((a, b) =>
        b[0].localeCompare(a[0])
    )
    const m = new Map(entries)
    node.children = m
    for (const [, child] of node.children) sortChildrenDesc(child)
    return node
}

function cloneNode(node) {
    const copy = {
        path: node.path,
        label: node.label,
        isLeaf: node.isLeaf,
        children: new Map()
    }
    for (const [k, v] of node.children) copy.children.set(k, cloneNode(v))
    return copy
}

function filterTree(node, term) {
    const t = term.toLowerCase()
    const copy = cloneNode(node)
    const children = []
    for (const [, child] of node.children) {
        const kept = filterTree(child, term)
        if (kept) children.push(kept)
    }
    const nodeMatches = node.path && node.path.toLowerCase().includes(t)
    if (t === '' || nodeMatches || children.length) {
        copy.children = new Map(
            children
                .sort((a, b) => b.label.localeCompare(a.label)) // inverso
                .map(ch => [ch.label, ch])
        )
        return copy
    }
    return null
}

const filteredTree = computed(() => {
    const base = sortChildrenDesc(cloneNode(treeRoot.value))
    if (!fieldSearch.value) return base
    const f = filterTree(treeRoot.value, fieldSearch.value)
    return sortChildrenDesc(f || base)
})

function rootChildren(node) {
    return [...(node.children?.values?.() || [])]
}

/* ————— Tri-state seleção ————— */
const selection = ref(new Set(props.preselect))
watch(allPaths, () => {
    if (!selection.value.size) selectRecommended()
})

const expanded = ref(new Set()) // nodes abertos por path

function leafPaths(node) {
    const out = []
    if (!node) return out
    for (const [, child] of node.children) {
        if (child.children.size === 0) out.push(child.path)
        out.push(...leafPaths(child))
    }
    // se o próprio nó é “folha lógica” (tem path válido e foi criado do path completo)
    if (node.children.size === 0 && node.path) out.push(node.path)
    return [...new Set(out)]
}

function selectionState(node) {
    const leaves = leafPaths(node)
    if (!leaves.length) return 'unchecked'
    const sel = leaves.filter(p => selection.value.has(p)).length
    if (sel === 0) return 'unchecked'
    if (sel === leaves.length) return 'checked'
    return 'indeterminate'
}

function toggleNode(node, checked) {
    const leaves = leafPaths(node)
    const s = new Set(selection.value)
    if (checked) {
        for (const p of leaves) s.add(p)
    } else {
        for (const p of leaves) s.delete(p)
    }
    selection.value = s
}

function toggleExpand(node) {
    const s = new Set(expanded.value)
    if (s.has(node.path)) s.delete(node.path)
    else s.add(node.path)
    expanded.value = s
}

function isExpanded(node) {
    if (node.path === '') return true
    if (fieldSearch.value) return true
    return expanded.value.has(node.path)
}

function expandAll() {
    const s = new Set()
    const walk = n => {
        if (n.path) s.add(n.path)
        for (const [, ch] of n.children) walk(ch)
    }
    walk(treeRoot.value)
    expanded.value = s
}
function collapseAll() {
    expanded.value = new Set()
}

/* ————— Seleção em massa / utilidades ————— */
const selectedPaths = computed(() => [...selection.value])
const allVisibleChecked = computed(
    () =>
        filteredPaths.value.length > 0 &&
        filteredPaths.value.every(p => selection.value.has(p))
)

function toggleAllVisible(ev) {
    const s = new Set(selection.value)
    if (ev.target.checked) {
        for (const p of filteredPaths.value) s.add(p)
    } else {
        for (const p of filteredPaths.value) s.delete(p)
    }
    selection.value = s
}
function selectAllVisible() {
    const s = new Set(selection.value)
    for (const p of filteredPaths.value) s.add(p)
    selection.value = s
}
function clearSelection() {
    selection.value = new Set()
}
function selectCommon() {
    const s = new Set()
    for (const p of allPaths.value) {
        if ((statsMap.value.get(p)?.present || 0) === totalRows.value) s.add(p)
    }
    selection.value = s
}
function selectRecommended() {
    const s = new Set()
    for (const p of allPaths.value) {
        const st = statsMap.value.get(p)
        const cov = (st?.present || 0) / (totalRows.value || 1)
        const types = st?.types || new Set()
        if (types.has('objeto')) continue
        if (p.endsWith('.links') || p.endsWith('.documentos')) continue
        if (
            cov >= 0.8 ||
            /(^|\.)id[a-z_]*$/i.test(p) ||
            /(name|nome)$/i.test(p) ||
            /(date|data)$/i.test(p) ||
            /(valor|value)$/i.test(p)
        ) {
            s.add(p)
        }
    }
    selection.value = s
}

/* ————— Stringify p/ export ————— */
function stringifyScalar(v) {
    if (v == null) return ''
    if (Array.isArray(v)) return stringifyArray(v)
    if (isPlainObject(v)) return JSON.stringify(v)
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    return String(v)
}

function stringifyArray(arr) {
    if (arrayMode.value === 'count') return String(arr?.length || 0)
    if (arrayMode.value === 'first') {
        const v = arr && arr.length ? arr[0] : undefined
        return stringifyScalar(v)
    }
    // modos 'expand-rows' e 'expand-cols' não chegam aqui (tratados no pipeline)
    const mapped = (arr || []).map(v => stringifyScalar(v))
    return mapped.join(' | ')
}

/* Resolve um path para um array de valores, preservando o número de elementos
   quando o path atravessa arrays na origem. Para escalares retorna [valor]. */
function resolveValues(obj, path) {
    if (!path) return [obj]
    return resolveValuesDeep(obj, path.split('.'))
}
function resolveValuesDeep(cur, parts) {
    if (cur == null) return [null]
    if (parts.length === 0) return Array.isArray(cur) ? cur.slice() : [cur]
    const [head, ...tail] = parts
    if (Array.isArray(cur)) {
        if (cur.length === 0) return [null]
        return cur.flatMap(el => resolveValuesDeep(el, parts))
    }
    return resolveValuesDeep(cur[head], tail)
}

/* Mode 'join' / 'first' / 'count' — 1 linha por registro */
function buildRow(row, paths) {
    const out = {}
    for (const p of paths) {
        const v = getByPath(row, p)
        out[p] = Array.isArray(v) ? stringifyArray(v) : stringifyScalar(v)
    }
    return out
}

/* Mode 'expand-rows' — N linhas por registro, alinhando arrays por índice */
function buildExpandedRows(row, paths) {
    const values = {}
    let maxLen = 1
    for (const p of paths) {
        const vs = resolveValues(row, p)
        values[p] = vs
        if (vs.length > 1) maxLen = Math.max(maxLen, vs.length)
    }
    const out = []
    for (let i = 0; i < maxLen; i++) {
        const r = {}
        for (const p of paths) {
            const vs = values[p]
            const v = vs.length === 1 ? vs[0] : (i < vs.length ? vs[i] : null)
            r[p] = stringifyScalar(v)
        }
        out.push(r)
    }
    return out
}

/* Mode 'expand-cols' — 1 linha, mas paths array viram path[0], path[1]…
   maxLengths é o tamanho máximo observado por path em TODAS as linhas, para
   garantir colunas consistentes. */
function buildExpandedColsRow(row, paths, maxLengths) {
    const out = {}
    for (const p of paths) {
        const max = maxLengths[p] || 1
        const vs = resolveValues(row, p)
        if (max <= 1) {
            out[p] = stringifyScalar(vs[0])
        } else {
            for (let i = 0; i < max; i++) {
                out[`${p}[${i + 1}]`] = stringifyScalar(i < vs.length ? vs[i] : null)
            }
        }
    }
    return out
}

function computeMaxLengths(rows, paths) {
    const m = {}
    for (const p of paths) m[p] = 1
    for (const row of rows) {
        for (const p of paths) {
            const vs = resolveValues(row, p)
            if (vs.length > m[p]) m[p] = vs.length
        }
    }
    return m
}

function expandedColsPaths(paths, maxLengths) {
    const out = []
    for (const p of paths) {
        const max = maxLengths[p] || 1
        if (max <= 1) out.push(p)
        else for (let i = 0; i < max; i++) out.push(`${p}[${i + 1}]`)
    }
    return out
}

/* Pipeline unificado: devolve { rows, paths } prontos para CSV/preview.
   Para join/first/count, paths é igual ao selecionado e há 1 linha por registro.
   Para expand-rows, paths é igual ao selecionado mas há N linhas por registro.
   Para expand-cols, paths é expandido e há 1 linha por registro. */
function buildExportedRows(sourceRows, selected) {
    if (arrayMode.value === 'expand-rows') {
        const out = []
        for (const r of sourceRows) out.push(...buildExpandedRows(r, selected))
        return { rows: out, paths: selected }
    }
    if (arrayMode.value === 'expand-cols') {
        const maxLengths = computeMaxLengths(sourceRows, selected)
        const newPaths = expandedColsPaths(selected, maxLengths)
        const out = sourceRows.map(r => buildExpandedColsRow(r, selected, maxLengths))
        return { rows: out, paths: newPaths }
    }
    const out = sourceRows.map(r => buildRow(r, selected))
    return { rows: out, paths: selected }
}

const previewBuild = computed(() => {
    const slice = rows.value.slice(0, props.maxPreviewRows)
    return buildExportedRows(slice, selectedPaths.value)
})
const previewRows = computed(() => previewBuild.value.rows)
const previewPaths = computed(() => previewBuild.value.paths)

const exportedRowCount = computed(() => {
    if (!selectedPaths.value.length) return 0
    if (arrayMode.value === 'expand-rows') {
        let total = 0
        for (const r of rows.value) {
            let maxLen = 1
            for (const p of selectedPaths.value) {
                const vs = resolveValues(r, p)
                if (vs.length > maxLen) maxLen = vs.length
            }
            total += maxLen
        }
        return total
    }
    return rows.value.length
})

function formatCell(v) {
    return v
}
function shortLabel(p) {
    const parts = p.split('.')
    return parts[parts.length - 1]
}

/* ————— Export CSV ————— */
function escapeCSV(value, delim) {
    const s = value ?? ''
    if (s === '') return ''
    // precisa quote se contiver aspas, quebra de linha, delimitador, ou espaço nas pontas
    const needsQuote = /["\n\r]/.test(s) || s.includes(delim) || s.startsWith(' ') || s.endsWith(' ')
    if (needsQuote) return '"' + s.replace(/"/g, '""') + '"'
    return s
}
function rowsToCSV(dataRows, paths, delim) {
    const header = paths.map(p => escapeCSV(p, delim)).join(delim)
    const lines = [header]
    for (const r of dataRows) {
        const line = paths.map(p => escapeCSV(r[p] ?? '', delim)).join(delim)
        lines.push(line)
    }
    return '\uFEFF' + lines.join('\r\n') // BOM para Excel
}
function downloadFile(content, name, mime) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}
function sanitizeFilename(name) {
    const trimmed = (name || '').trim()
    if (!trimmed) return 'export'
    // troca caracteres inválidos (Windows/macOS/Linux) por _
    // remove pontos/espaços do fim (problemáticos no Windows)
    return trimmed
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/[. ]+$/g, '')
        || 'export'
}

function exportCSV(kind = 'csv') {
    const selected = selectedPaths.value
    if (!selected.length) {
        alert('Selecione ao menos um campo.')
        return
    }
    const { rows: dataRows, paths } = buildExportedRows(rows.value, selected)
    const delim = kind === 'excel' ? ';' : delimiter.value
    const csv = rowsToCSV(dataRows, paths, delim)
    const name = `${sanitizeFilename(baseFilename.value)}.csv`
    downloadFile(csv, name, 'text/csv;charset=utf-8;')
    emit('export', { name, kind, delimiter: delim, rows: dataRows, paths })
}

/* ————— Export XLSX (com logo + cabeçalho de relatório) ————— */
const logoCache = new Map() // key: `${url}|${invert}` → { buffer, naturalWidth, naturalHeight }

async function loadLogoData(url, invert) {
    const key = `${url}|${invert ? '1' : '0'}`
    if (logoCache.has(key)) return logoCache.get(key)
    try {
        const res = await fetch(url, { cache: 'force-cache' })
        if (!res.ok) return null
        const raw = await res.arrayBuffer()
        const img = await loadImageFromBlob(new Blob([raw]))
        const naturalWidth = img.naturalWidth
        const naturalHeight = img.naturalHeight
        const buffer = invert ? await invertImageBuffer(img) : raw
        const data = { buffer, naturalWidth, naturalHeight }
        logoCache.set(key, data)
        return data
    } catch {
        return null
    }
}

/* Inverte R/G/B preservando alpha — funciona para PNG transparente com pixels brancos. */
async function invertImageBuffer(img) {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
        px[i] = 255 - px[i]
        px[i + 1] = 255 - px[i + 1]
        px[i + 2] = 255 - px[i + 2]
        // alpha preservado
    }
    ctx.putImageData(data, 0, 0)
    const outBlob = await new Promise(r => canvas.toBlob(r, 'image/png'))
    return await outBlob.arrayBuffer()
}

function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
        img.onerror = e => { URL.revokeObjectURL(url); reject(e) }
        img.src = url
    })
}

const exporting = ref(false)

async function exportXLSX() {
    const selected = selectedPaths.value
    if (!selected.length) {
        alert('Selecione ao menos um campo.')
        return
    }
    exporting.value = true
    try {
        const { rows: dataRows, paths } = buildExportedRows(rows.value, selected)
        const wb = new ExcelJS.Workbook()
        wb.creator = issuerName.value
        wb.created = new Date()
        const ws = wb.addWorksheet('Relatório', {
            views: [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 0 }],
        })

        const colCount = Math.max(paths.length, 4)
        const lastColLetter = columnLetter(colCount)

        // Logo: ocupa 3 linhas, tamanho calculado a partir do aspect ratio natural
        const ext = (props.logo || '').toLowerCase().endsWith('.jpg') || (props.logo || '').toLowerCase().endsWith('.jpeg')
            ? 'jpeg' : 'png'
        const LOGO_HEIGHT = 48 // px
        const LOGO_MAX_WIDTH = 280 // px (limite quando aspect for muito largo)
        const logoData = await loadLogoData(props.logo, props.invertLogo)
        if (logoData) {
            const ratio = logoData.naturalWidth / logoData.naturalHeight || 3
            const width = Math.min(LOGO_HEIGHT * ratio, LOGO_MAX_WIDTH)
            const imgId = wb.addImage({ buffer: logoData.buffer, extension: ext })
            ws.addImage(imgId, {
                tl: { col: 0.15, row: 0.15 },
                ext: { width, height: LOGO_HEIGHT },
                editAs: 'oneCell',
            })
        }
        // 3 linhas reservadas pro logo (~16px cada = 48px total)
        for (let i = 0; i < 3; i++) ws.addRow([])
        ws.getRow(1).height = 16
        ws.getRow(2).height = 16
        ws.getRow(3).height = 16

        // Título
        const titleRow = ws.addRow([suggestedTitle.value])
        ws.mergeCells(`A${titleRow.number}:${lastColLetter}${titleRow.number}`)
        const titleCell = titleRow.getCell(1)
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
        titleRow.height = 20

        // Subtítulo (se houver) na mesma linha-bloco abaixo do título, mais leve
        if (props.subtitle) {
            const subRow = ws.addRow([props.subtitle])
            ws.mergeCells(`A${subRow.number}:${lastColLetter}${subRow.number}`)
            subRow.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF475569' } }
            subRow.getCell(1).alignment = { vertical: 'middle' }
            subRow.height = 14
        }

        // Meta (emissor · data · total) numa linha discreta
        const meta = [
            `Emitido por ${issuerName.value}`,
            `em ${dayjs().format('DD/MM/YYYY HH:mm')}`,
            `${exportedRowCount.value.toLocaleString('pt-BR')} ${exportedRowCount.value === 1 ? 'registro' : 'registros'}`,
        ].join(' · ')
        const metaRow = ws.addRow([meta])
        ws.mergeCells(`A${metaRow.number}:${lastColLetter}${metaRow.number}`)
        metaRow.getCell(1).font = { size: 9, color: { argb: 'FF64748B' } }
        metaRow.height = 13

        // Bloco de filtros
        if (normalizedFilters.value.length) {
            ws.addRow([])
            const filtersHeader = ws.addRow(['Filtros aplicados'])
            ws.mergeCells(`A${filtersHeader.number}:${lastColLetter}${filtersHeader.number}`)
            filtersHeader.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1E293B' } }
            filtersHeader.getCell(1).fill = {
                type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' },
            }
            filtersHeader.height = 18

            for (const f of normalizedFilters.value) {
                const fRow = ws.addRow([f.label, f.value])
                if (colCount > 2) ws.mergeCells(`B${fRow.number}:${lastColLetter}${fRow.number}`)
                fRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF475569' } }
                fRow.getCell(1).alignment = { vertical: 'middle' }
                fRow.getCell(2).font = { size: 10, color: { argb: 'FF0F172A' } }
                fRow.getCell(2).alignment = { vertical: 'middle', wrapText: true }
                fRow.height = 16
            }
        }

        // Espaço
        ws.addRow([])
        ws.addRow([])

        // Cabeçalho da tabela
        const headerLabels = paths.map(p => shortLabel(p))
        const headerRow = ws.addRow(headerLabels)
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
            cell.font = { bold: true, color: { argb: 'FFE2E8F0' }, size: 11 }
            cell.border = { bottom: { style: 'medium', color: { argb: 'FF6366F1' } } }
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
        })
        headerRow.height = 24
        ws.views[0].ySplit = headerRow.number

        // Dados
        dataRows.forEach((row, ri) => {
            const vals = paths.map(p => coerceForExcel(row[p]))
            const r = ws.addRow(vals)
            r.eachCell(cell => {
                cell.fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: ri % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' },
                }
                cell.font = { color: { argb: 'FF0F172A' }, size: 10 }
                cell.alignment = { vertical: 'middle', wrapText: false }
                cell.border = {
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                }
            })
        })

        // Larguras automáticas (cap em 40)
        ws.columns.forEach((col, i) => {
            const path = paths[i] ?? ''
            const label = shortLabel(path)
            const sampleLens = dataRows.slice(0, 200).map(r => String(r[path] ?? '').length)
            const maxLen = Math.max(label.length, ...sampleLens, 0)
            col.width = Math.min(Math.max(maxLen + 3, 12), 40)
        })

        const buf = await wb.xlsx.writeBuffer()
        const name = `${sanitizeFilename(baseFilename.value || suggestedFilename.value)}.xlsx`
        saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name)
        emit('export', { name, kind: 'xlsx', rows: dataRows, paths })
    } finally {
        exporting.value = false
    }
}

/* ————— Export PDF (mesmo cabeçalho do XLSX: logo + título + filtros) ————— */
async function exportPDF() {
    const selected = selectedPaths.value
    if (!selected.length) {
        alert('Selecione ao menos um campo.')
        return
    }
    exporting.value = true
    try {
        const { jsPDF } = await import('jspdf')
        const { rows: dataRows, paths } = buildExportedRows(rows.value, selected)

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const margin = 10
        const availW = pageW - margin * 2
        let y = margin

        // Logo
        const logoData = await loadLogoData(props.logo, props.invertLogo)
        if (logoData) {
            const ratio = logoData.naturalWidth / logoData.naturalHeight || 3
            const h = 10
            const w = Math.min(h * ratio, 60)
            const isJpeg = !props.invertLogo && /\.jpe?g$/i.test(props.logo || '')
            doc.addImage(new Uint8Array(logoData.buffer), isJpeg ? 'JPEG' : 'PNG', margin, y, w, h)
            y += h + 5
        }

        // Título + subtítulo + meta
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(15, 23, 42)
        doc.text(suggestedTitle.value, margin, y)
        y += 6
        if (props.subtitle) {
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(9)
            doc.setTextColor(71, 85, 105)
            doc.text(props.subtitle, margin, y)
            y += 5
        }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        const meta = [
            `Emitido por ${issuerName.value}`,
            `em ${dayjs().format('DD/MM/YYYY HH:mm')}`,
            `${exportedRowCount.value.toLocaleString('pt-BR')} ${exportedRowCount.value === 1 ? 'registro' : 'registros'}`,
        ].join(' · ')
        doc.text(meta, margin, y)
        y += 5

        // Filtros aplicados
        if (normalizedFilters.value.length) {
            const filtersText = 'Filtros: ' + normalizedFilters.value.map(f => `${f.label}: ${f.value}`).join(' · ')
            const lines = doc.splitTextToSize(filtersText, availW)
            doc.text(lines, margin, y)
            y += lines.length * 3.6 + 2
        }
        y += 2

        // Larguras proporcionais ao conteúdo (mesma heurística do XLSX, cap em 40 chars)
        const FONT = 7
        const PAD = 1.6
        const rowH = 5.4
        const weights = paths.map(p => {
            const label = shortLabel(p)
            const sampleLens = dataRows.slice(0, 200).map(r => String(r[p] ?? '').length)
            return Math.min(Math.max(label.length, ...sampleLens, 4), 40)
        })
        const totalWeight = weights.reduce((a, b) => a + b, 0) || 1
        const colW = weights.map(w => (w / totalWeight) * availW)

        doc.setFontSize(FONT)
        const fit = (text, width) => {
            const s = String(text ?? '')
            if (!s) return ''
            const maxW = Math.max(width - PAD * 2, 2)
            const lines = doc.splitTextToSize(s, maxW)
            if (lines.length <= 1) return lines[0] ?? ''
            let first = lines[0]
            while (first.length && doc.getTextWidth(first + '…') > maxW) first = first.slice(0, -1)
            return first + '…'
        }

        const drawHeader = () => {
            doc.setFillColor(30, 41, 59)
            doc.rect(margin, y, availW, rowH + 1, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(226, 232, 240)
            let x = margin
            paths.forEach((p, i) => {
                doc.text(fit(shortLabel(p), colW[i]), x + PAD, y + rowH - 1.2)
                x += colW[i]
            })
            y += rowH + 1
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(15, 23, 42)
        }

        drawHeader()
        dataRows.forEach((row, ri) => {
            if (y + rowH > pageH - margin) {
                doc.addPage()
                y = margin
                drawHeader()
            }
            if (ri % 2 === 1) {
                doc.setFillColor(248, 250, 252)
                doc.rect(margin, y, availW, rowH, 'F')
            }
            let x = margin
            paths.forEach((p, i) => {
                doc.text(fit(row[p], colW[i]), x + PAD, y + rowH - 1.6)
                x += colW[i]
            })
            y += rowH
        })

        const name = `${sanitizeFilename(baseFilename.value || suggestedFilename.value)}.pdf`
        doc.save(name)
        emit('export', { name, kind: 'pdf', rows: dataRows, paths })
    } finally {
        exporting.value = false
    }
}

function columnLetter(n) {
    let s = ''
    while (n > 0) {
        const r = (n - 1) % 26
        s = String.fromCharCode(65 + r) + s
        n = Math.floor((n - 1) / 26)
    }
    return s
}

function coerceForExcel(v) {
    if (v == null || v === '') return null
    // detecta números puros e converte para number para que Excel reconheça
    if (/^-?\d+(?:[.,]\d+)?$/.test(v)) {
        const n = Number(String(v).replace(',', '.'))
        if (Number.isFinite(n)) return n
    }
    // detecta datas ISO simples
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(v)
    if (m) {
        const [, y, mo, d, h = '0', mi = '0', s = '0'] = m
        const dt = new Date(+y, +mo - 1, +d, +h, +mi, +s)
        if (!isNaN(dt.getTime())) return dt
    }
    return v
}

/* ————— UX ————— */
function onKey(e) {
    if (e.key === 'Escape') emitClose()
}
onMounted(() => {
    window.addEventListener('keydown', onKey)
})
watch(
    () => props.modelValue,
    v => {
        if (v) panel.value = 'fields'
    }
)

/* ————— Componente recursivo (FieldNode) ————— */
const FieldNode = defineComponent({
    name: 'FieldNode',
    props: {
        node: { type: Object, required: true },
        level: { type: Number, required: true },
        statsForNode: { type: Function, required: true },
        selectionState: { type: Function, required: true },
        toggleNode: { type: Function, required: true },
        toggleExpand: { type: Function, required: true },
        isExpanded: { type: Function, required: true },
        leafPaths: { type: Function, required: true },
        showFullPaths: { type: Boolean, default: false }
    },
    setup(props) {
        const checkboxRef = ref(null)
        return () => {
            const n = props.node
            const children = [...(n.children?.values?.() || [])]
            const state = props.selectionState(n)
            const st = props.statsForNode(n)
            // cobertura simples: média de presença das folhas do nó
            const leaves = props.leafPaths(n)
            const present = st.present || 0
            const cov =
                leaves.length && totalRows.value
                    ? Math.round((present / (leaves.length * totalRows.value)) * 100)
                    : 0
            const types = [...(st.types || [])].join(', ')
            const pad = `${props.level * 12}px`

            // checkbox com indeterminate
            const checkbox = h('input', {
                ref: checkboxRef,
                type: 'checkbox',
                checked: state === 'checked',
                onVnodeMounted: () => {
                    if (checkboxRef.value) checkboxRef.value.indeterminate = state === 'indeterminate'
                },
                onVnodeUpdated: () => {
                    if (checkboxRef.value) checkboxRef.value.indeterminate = state === 'indeterminate'
                },
                onChange: e => props.toggleNode(n, e.target.checked)
            })

            const expander =
                children.length > 0
                    ? h(
                        'button',
                        {
                            class: 'mr-2 text-xs w-5',
                            onClick: () => props.toggleExpand(n),
                            title: props.isExpanded(n) ? 'Recolher' : 'Expandir'
                        },
                        props.isExpanded(n) ? '▾' : '▸'
                    )
                    : h('span', { class: 'mr-2 w-5 inline-block' }, '')

            const row = h(
                'div',
                {
                    class:
                        'flex items-start gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-900 rounded'
                },
                [
                    h('div', { style: { paddingLeft: pad }, class: 'flex items-center' }, [
                        expander,
                        checkbox
                    ]),
                    h(
                        'div',
                        {
                            class: 'flex-1 font-mono text-[11px] break-all select-text',
                            title: n.path
                        },
                        props.showFullPaths ? n.path : n.label
                    ),
                    h('div', { class: 'text-[11px] text-right w-14 shrink-0' }, `${cov}%`),
                    h(
                        'div',
                        { class: 'text-[11px] text-gray-500 dark:text-gray-400 w-32 shrink-0 truncate' },
                        types
                    )
                ]
            )

            const kids = props.isExpanded(n)
                ? h(
                    'ul',
                    children.map(ch =>
                        h(FieldNode, {
                            node: ch,
                            level: props.level + 1,
                            statsForNode: props.statsForNode,
                            selectionState: props.selectionState,
                            toggleNode: props.toggleNode,
                            toggleExpand: props.toggleExpand,
                            isExpanded: props.isExpanded,
                            leafPaths: props.leafPaths,
                            showFullPaths: props.showFullPaths,
                        })
                    )
                )
                : null

            return h('li', [row, kids])
        }
    }
})

/* ————— Agregadores p/ nó ————— */
function statsForNode(node) {
    // se for folha real (sem filhos), use stats do próprio path
    if (node.children.size === 0 && node.path) {
        return (
            statsMap.value.get(node.path) || { present: 0, types: new Set(['vazio']) }
        )
    }
    // senão, agregue das folhas
    const leaves = leafPaths(node)
    const types = new Set()
    let present = 0
    for (const p of leaves) {
        const st = statsMap.value.get(p)
        if (!st) continue
        st.types.forEach(t => types.add(t))
        present += st.present
    }
    return { present, types }
}
</script>

<style scoped>
::-webkit-scrollbar {
    height: 10px;
    width: 10px;
}

::-webkit-scrollbar-thumb {
    background-color: rgba(107, 114, 128, 0.4);
    border-radius: 8px;
}

/* Inverte logo branca → preta na UI (combina com fundo claro do modal). */
.logo-invert {
    filter: invert(1);
}
</style>
