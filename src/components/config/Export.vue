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
                            <p class="text-xs text-gray-500">
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
                        class="lg:border-r flex flex-col h-full justify-between border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-white/60 dark:bg-gray-900/30">
                        <div class="flex flex-col gap-4">
                            <div>
                                <label class="block text-xs font-semibold mb-1">Buscar campos</label>
                                <input v-model="fieldSearch" type="text"
                                    placeholder="Digite para filtrar pelo caminho do campo…"
                                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600" />
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold mb-1">Delimitador</label>
                                    <select v-model="delimiter"
                                        class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600">
                                        <option value=",">Vírgula (,)</option>
                                        <option value=";">Ponto e vírgula (;)</option>
                                        <option :value="'\t'">Tabulação (Tab)</option>
                                        <option value="|">Barra vertical (|)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold mb-1">Tratamento de arrays</label>
                                    <select v-model="arrayMode"
                                        class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600">
                                        <option value="join">Juntar valores (" | ")</option>
                                        <option value="first">Apenas o primeiro</option>
                                        <option value="count">Somente quantidade</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold mb-1">Nome do arquivo</label>
                                <input v-model="baseFilename" type="text" placeholder="ex.: export-vendas"
                                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600" />
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <button @click="selectAllVisible()"
                                    class="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900">
                                    Selecionar visíveis
                                </button>
                                <button @click="clearSelection()"
                                    class="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900">
                                    Limpar
                                </button>
                                <button @click="selectCommon()"
                                    class="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900">
                                    Somente comuns
                                </button>
                                <button @click="selectRecommended()"
                                    class="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900">
                                    Recomendado
                                </button>
                            </div>

                            <div class="text-xs text-gray-500">
                                {{ selection.size }} campos selecionados de {{ filteredPaths.length }} (cobertura média
                                {{ Math.round(coverageAvg * 100) }}%)
                            </div>
                        </div>

                        <div class="flex gap-2">
                            <button @click="exportCSV('csv')"
                                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-md shadow">
                                <i class="fas fa-file-zipper"></i> Exportar CSV
                            </button>
                            <button @click="exportCSV('excel')"
                                class="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-md shadow">
                                <i class="fas fa-table"></i> Exportar p/ Excel
                            </button>
                        </div>
                    </div>

                    <!-- RIGHT: Fields / Preview -->
                    <div class="lg:col-span-2 p-4">
                        <template v-if="panel === 'fields'">
                            <div
                                class="min-h-[70vh] max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <div
                                    class="text-xs px-3 py-2 bg-gray-100 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                                    <label class="inline-flex items-center gap-2">
                                        <input type="checkbox" :checked="allVisibleChecked"
                                            @change="toggleAllVisible($event)" />
                                        Marcar todos os visíveis
                                    </label>
                                    <button class="underline" @click="expandAll">Expandir tudo</button>
                                    <button class="underline" @click="collapseAll">Recolher tudo</button>

                                    <label class="inline-flex items-center gap-2 ml-auto">
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
                            <div class="mb-2 text-xs text-gray-500">Prévia (máx. {{ maxPreviewRows }} linhas)</div>
                            <div
                                class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg min-h-[70vh] max-h-[70vh]">
                                <table class="w-full text-xs">
                                    <thead class="bg-gray-100 dark:bg-gray-900/60 sticky top-0">
                                        <tr>
                                            <th v-for="p in selectedPaths" :key="p"
                                                class="px-3 py-2 text-left font-semibold whitespace-nowrap" :title="p">
                                                {{ shortLabel(p) }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(row, i) in previewRows" :key="i"
                                            class="border-b border-gray-100 dark:border-gray-800">
                                            <td v-for="p in selectedPaths" :key="p"
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

/**
 * UniversalExportModal.vue (refeito)
 * - Aceita qualquer JSON (Array ou Objeto)
 * - Descobre todos os caminhos possíveis (paths), atravessando arrays
 * - Árvore hierárquica com tri-state; ordem inversa (desc) entre irmãos
 * - Exporta CSV / Excel-friendly (;)
 */

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    source: { type: [Array, Object], required: true },
    title: { type: String, default: 'Exportação de dados' },
    filename: { type: String, default: 'export' },
    initialDelimiter: { type: String, default: ';' },
    initialArrayMode: { type: String, default: 'join' }, // 'join' | 'first' | 'count'
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
const baseFilename = ref(props.filename)
const fieldSearch = ref('')
const showFullPaths = ref(false)

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

function toggle(path, ev) {
    const s = new Set(selection.value)
    ev.target.checked ? s.add(path) : s.delete(path)
    selection.value = s
}
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

/* ————— Stringify/flatten p/ export ————— */
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
    const mapped = (arr || []).map(v => stringifyScalar(v))
    return mapped.join(' | ')
}

function buildRow(row, paths) {
    const out = {}
    for (const p of paths) {
        const v = getByPath(row, p)
        out[p] = Array.isArray(v) ? stringifyArray(v) : stringifyScalar(v)
    }
    return out
}

const previewRows = computed(() =>
    rows.value.slice(0, props.maxPreviewRows).map(r => buildRow(r, selectedPaths.value))
)
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
function exportCSV(kind) {
    const paths = selectedPaths.value
    if (!paths.length) {
        alert('Selecione ao menos um campo.')
        return
    }
    const dataRows = rows.value.map(r => buildRow(r, paths))
    const delim = kind === 'excel' ? ';' : delimiter.value
    const csv = rowsToCSV(dataRows, paths, delim)
    const name = `${baseFilename.value || 'export'}.csv`
    downloadFile(csv, name, 'text/csv;charset=utf-8;')
    emit('export', { name, kind: 'csv', delimiter: delim, rows: dataRows, paths })
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
                        { class: 'text-[11px] text-gray-500 w-32 shrink-0 truncate' },
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
</style>
