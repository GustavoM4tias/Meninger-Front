<script setup>
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import Favorite from '@/components/config/Favorite.vue'
import { useEnterpriseCitiesStore } from '@/stores/Admin/enterpriseCitiesStore'
import { useCarregamentoStore } from '@/stores/Config/carregamento'

const store = useEnterpriseCitiesStore()
const carregamento = useCarregamentoStore()

const { items, total, page, pageSize, loading, error, filtros, logs, showRaw } = storeToRefs(store)

// Popover de JSON
const jsonPopoverOpenId = ref(null)
function toggleJson(id) {
    jsonPopoverOpenId.value = jsonPopoverOpenId.value === id ? null : id
}

// UI state
const showOverrideModal = ref(false)
const editingRow = ref(null)
const newCity = ref('')

const showLogs = ref(false)

// filtros avançados
const searchQuery = computed({
    get: () => filtros.value.q || '',
    set: (v) => { filtros.value.q = v }
})
const filterSource = computed({
    get: () => filtros.value.source || '',
    set: (v) => { filtros.value.source = v }
})
const filterOverride = computed({
    get: () => filtros.value.hasOverride ?? '',
    set: (v) => { filtros.value.hasOverride = v }
})

const totalPages = computed(() =>
    Math.max(1, Math.ceil((total.value || 0) / (pageSize.value || 50)))
)

function fmtSource(s) {
    if (s === 'crm') return 'CRM'
    if (s === 'erp') return 'ERP'
    return s
}
function badgeSource(s) {
    return s === 'crm'
        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 ring-1 ring-inset ring-indigo-400/30'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 ring-1 ring-inset ring-emerald-400/30'
}

function openOverride(row) {
    editingRow.value = row
    newCity.value = row.city_override || row.effective_city || ''
    showOverrideModal.value = true
}
async function saveOverride() {
    try {
        await store.setOverride(editingRow.value.id, newCity.value.trim() || null)
        showOverrideModal.value = false
    } catch (e) {
        alert(e.message)
    }
}

async function buscar(reset = false) {
    await store.fetchList({ resetPage: reset })
}
function clearFilters() {
    searchQuery.value = ''
    filterSource.value = ''
    filterOverride.value = ''
    buscar(true)
}

async function goTo(p) {
    if (p < 1 || p > totalPages.value) return
    page.value = p
    await buscar(false)
}

// sync params
const erpLimit = ref(200)
const erpMaxCount = ref('')
const erpVerbose = ref(false)

// SYNC + Dupla confirmação
const confirmVisible = ref(false)
const confirmStep = ref(1) // 1 = aviso, 2 = digitar frase
const confirmSource = ref('') // 'crm' | 'erp'
const confirmPhraseInput = ref('')
const confirmRequiredPhrase = computed(() =>
    confirmSource.value === 'crm' ? 'RECALCULAR CRM' : 'RECALCULAR ERP'
)

function openConfirm(source) {
    confirmSource.value = source
    confirmStep.value = 1
    confirmPhraseInput.value = ''
    confirmVisible.value = true
}
function closeConfirm() {
    confirmVisible.value = false
    confirmPhraseInput.value = ''
    confirmStep.value = 1
    confirmSource.value = ''
}
function goToConfirmStep2() {
    confirmStep.value = 2
}

const canConfirm = computed(() =>
    confirmPhraseInput.value.trim().toUpperCase() === confirmRequiredPhrase.value
)

async function runConfirmedSync() {
    try {
        if (confirmSource.value === 'crm') {
            await doSyncCRM()
        } else {
            await doSyncERP()
        }
    } finally {
        closeConfirm()
    }
}

async function doSyncCRM() {
    try {
        carregamento.iniciarCarregamento()
        const r = await store.syncCRM()
        await buscar(false)
        alert(`CRM sync ok. Itens: ${r.count ?? 0}`)
    } catch (e) {
        alert(e.message)
    } finally {
        carregamento.finalizarCarregamento()
    }
}

async function doSyncERP() {
    try {
        carregamento.iniciarCarregamento()
        const opts = {
            limit: Number(erpLimit.value) || 200,
            verbose: !!erpVerbose.value
        }
        if (erpMaxCount.value) opts.maxCount = Number(erpMaxCount.value)
        const res = await store.syncERP(opts)
        await buscar(false)
        if (opts.verbose) {
            showLogs.value = true
        } else {
            alert(`ERP sync ok. upserts=${res.upserts}, matched=${res.matched}, skipped=${res.skipped}`)
        }
    } catch (e) {
        alert(e.message)
    } finally {
        carregamento.finalizarCarregamento()
    }
}

onMounted(() => buscar(true))
</script>

<template>
    <div class="h-full py-8 px-4">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-4">
                <h1 class="flex text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Vínculos de Cidades (CRM/ERP)
                    <Favorite class="my-auto" :router="'/settings/cidades'" :section="'Cidades'" /> 
                </h1>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                    Administre o mapeamento de empreendimentos para cidades.
                    <span class="font-medium">Overrides</span> prevalecem sobre o valor padrão.<br></br>
                    Os empreendimentos vinculados a cidades são a regra para mostrar ou ocultar determinado produto em usuários do sistema, exceto para Administradores. 
                </p> 
            </div>

            <!-- Filtros + Ações -->
            <div
                class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <!-- Primeira linha: busca -->
                <div class="relative mb-6">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <input v-model="searchQuery" type="text" placeholder="Buscar por nome/ID/cidade..."
                        @keyup.enter="buscar(true)"
                        class="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <!-- Segunda linha: filtros + ações -->
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Fonte
                        </label>
                        <select v-model="filterSource"
                            class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Todas</option>
                            <option value="crm">CRM</option>
                            <option value="erp">ERP</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Override
                        </label>
                        <select v-model="filterOverride"
                            class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Todos</option>
                            <option value="true">Somente com override</option>
                            <option value="false">Somente sem override</option>
                        </select>
                    </div>

                    <div class="flex items-end">
                        <button @click="buscar(true)"
                            class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-50 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
                            <i class="fas fa-search"></i>
                            Buscar
                        </button>
                    </div>

                    <div class="flex items-end">
                        <button @click="clearFilters"
                            class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-50 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
                            <i class="fas fa-eraser"></i>
                            Limpar
                        </button>
                    </div>

                    <div class="flex items-end">
                        <div class="w-full flex gap-2">
                            <button
                                class="flex px-2 py-2 gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 w-1/2"
                                @click="openConfirm('crm')"><img src="/CVLogo.png" alt="CV CRM"
                                    class="h-4 min-w-4 drop-shadow my-auto"> Sync CRM
                            </button>
                            <button class="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 w-1/2"
                                @click="openConfirm('erp')">
                                <i class="fas fa-arrows-rotate mr-1"></i> Sync ERP
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Linha “debug” -->
                <!-- Terceira linha: parâmetros do ERP (labels acima dos campos) -->
                <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ERP limit
                        </label>
                        <input v-model.number="erpLimit" type="number" min="50" step="50"
                            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Tamanho de página na API do ERP (Sienge).
                        </p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ERP máx
                        </label>
                        <input v-model="erpMaxCount" type="number" min="1"
                            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Opcional. Limita a quantidade total processada no teste.
                        </p>
                    </div>

                    <div class="flex flex-col mt-2 items-start justify-center gap-1">
                        <div class="flex gap-2">
                            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input type="checkbox" v-model="erpVerbose" class="rounded">
                                Registrar logs (verbose)
                            </label> <i class="fas fa-info-circle cursor-pointer"
                                v-tippy="'Logs de andamento do Sync no servidor'"></i>
                        </div>
                        <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input type="checkbox" v-model="showRaw" @change="buscar(true)" class="rounded">
                            Mostrar JSON (debug)
                        </label>
                    </div>
                </div>
            </div>

            <!-- Lista / Tabela -->
            <div class="space-y-4">
                <div v-if="error" class="text-center py-12">
                    <i class="fas fa-triangle-exclamation text-red-500 text-3xl"></i>
                    <h3 class="mt-3 text-sm font-medium text-gray-900 dark:text-white">{{ error }}</h3>
                </div>

                <!-- Skeletons -->
                <div v-else-if="loading" class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="animate-pulse divide-y divide-gray-200/60 dark:divide-gray-700/60">
                        <div class="h-12 bg-gray-100/60 dark:bg-gray-700/40"></div>
                        <div v-for="i in 8" :key="i" class="h-14 bg-gray-50/40 dark:bg-gray-800/30"></div>
                    </div>
                </div>

                <div v-else class="overflow-x-auto border rounded-lg border-gray-200 dark:border-gray-700">
                    <table class="min-w-full text-sm">
                        <thead class="bg-gray-50 dark:bg-gray-800/60">
                            <tr class="text-gray-700 dark:text-gray-300">
                                <th class="text-left p-3">Fonte</th>
                                <th class="text-left p-3">CRM ID</th>
                                <th class="text-left p-3">ERP ID</th>
                                <th class="text-left p-3">Empreendimento</th>
                                <th class="text-left p-3">Cidade Padrão</th>
                                <th class="text-left p-3">Override</th>
                                <th class="text-left p-3">Cidade Efetiva</th>
                                <th class="text-left p-3">Detalhes</th>
                                <th class="text-right p-3 w-24"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="!items.length">
                                <td colspan="8" class="p-6 text-center text-gray-500 dark:text-gray-400">Nenhum registro
                                </td>
                            </tr>
                            <tr v-for="row in items" :key="row.id"
                                class="border-t border-gray-200/70 dark:border-gray-700/50 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                                <td class="p-3">
                                    <span
                                        :class="['px-2 py-1 text-xs rounded-full inline-flex items-center gap-1', badgeSource(row.source)]">
                                        <i class="fas"
                                            :class="row.source === 'crm' ? 'fa-database' : 'fa-building'"></i>
                                        {{ fmtSource(row.source) }}
                                    </span>
                                </td>
                                <td class="p-3">{{ row.crm_id ?? '-' }}</td>
                                <td class="p-3">{{ row.erp_id ?? '-' }}</td>
                                <td class="p-3 max-w-[420px] truncate" :title="row.enterprise_name">{{
                                    row.enterprise_name }}</td>
                                <td class="p-3">{{ row.default_city || '-' }}</td>
                                <td class="p-3">
                                    <span v-if="row.city_override"
                                        class="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 ring-1 ring-amber-400/30">
                                        {{ row.city_override }}
                                    </span>
                                    <span v-else class="opacity-60" title="Sem override definido">-</span>
                                </td>
                                <td class="p-3 font-medium">
                                    {{ row.effective_city || '-' }}
                                    <span v-if="row.city_override" class="ml-1 text-xs opacity-60">(override)</span>
                                </td>
                                <td class="p-3 relative">
                                    <button v-if="'raw_payload' in row"
                                        :disabled="!row.raw_payload || (typeof row.raw_payload === 'object' && !Object.keys(row.raw_payload).length)"
                                        class="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        @click.stop="toggleJson(row.id)">
                                        Ver JSON
                                    </button>

                                    <!-- Popover “card” -->
                                    <div v-if="jsonPopoverOpenId === row.id"
                                        class="absolute z-20 mt-2 max-w-xl w-[36rem] right-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3"
                                        @click.stop>
                                        <div class="flex items-center justify-between mb-2">
                                            <div class="text-sm font-medium">raw_payload</div>
                                            <div class="flex items-center gap-2">
                                                <!-- COPIAR JSON -->
                                                <button class="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700"
                                                    @click="navigator.clipboard.writeText(JSON.stringify(row.raw_payload, null, 2))">
                                                    Copiar
                                                </button>

                                                <!-- BAIXAR JSON -->
                                                <a :href="'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(row.raw_payload, null, 2))"
                                                    :download="`raw-${row.source}-${row.erp_id || row.crm_id || row.id}.json`"
                                                    class="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700">
                                                    Baixar
                                                </a>

                                                <button class="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700"
                                                    @click="jsonPopoverOpenId = null">
                                                    Fechar
                                                </button>
                                            </div>
                                        </div>

                                        <pre class="text-xs leading-5 whitespace-pre-wrap overflow-auto max-h-80">
                                        {{ JSON.stringify(row.raw_payload, null, 2) }}
                                        </pre>
                                    </div>

                                </td>
                                <td class="p-3 text-right">
                                    <button
                                        class="px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-white"
                                        @click="openOverride(row)">
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Paginação -->
                <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        Total: {{ total }} | Página {{ page }} de {{ totalPages }}
                    </div>
                    <div class="flex items-center gap-2">
                        <button
                            class="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-50"
                            :disabled="page <= 1" @click="goTo(page - 1)">
                            Anterior
                        </button>
                        <button
                            class="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-50"
                            :disabled="page >= totalPages" @click="goTo(page + 1)">
                            Próxima
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Override -->
        <div v-if="showOverrideModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40">
            <div
                class="bg-white dark:bg-gray-900 text-slate-900 dark:text-gray-100 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                <h3 class="text-lg font-semibold">Editar cidade do empreendimento</h3>
                <div class="text-sm">
                    <div class="opacity-70 truncate">{{ editingRow?.enterprise_name }}</div>
                    <div class="mt-1">Cidade padrão: <strong>{{ editingRow?.default_city || '-' }}</strong></div>
                </div>
                <input v-model.trim="newCity" type="text" placeholder="Cidade override (deixe vazio para remover)"
                    class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
                <div class="flex justify-end gap-2">
                    <button class="px-3 py-2 rounded bg-slate-200 dark:bg-gray-700"
                        @click="showOverrideModal = false">Cancelar</button>
                    <button class="px-3 py-2 rounded bg-emerald-600 text-white" @click="saveOverride">Salvar</button>
                </div>
            </div>
        </div>

        <!-- Drawer Logs -->
        <div v-if="showLogs" class="fixed inset-0 bg-black/40 z-30">
            <div
                class="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 shadow-xl p-4 flex flex-col">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-semibold">Logs do Sync ERP</h3>

                    <div class="flex items-center gap-2">
                        <!-- COPIAR LOGS -->
                        <button class="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-700"
                            @click="navigator.clipboard.writeText((logs || []).join('\n'))">
                            Copiar
                        </button>

                        <!-- BAIXAR LOGS -->
                        <a :href="'data:text/plain;charset=utf-8,' + encodeURIComponent((logs || []).join('\n'))"
                            download="erp-sync.log" class="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-700">
                            Baixar
                        </a>

                        <button class="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-700"
                            @click="store.clearLogs()">Limpar</button>
                        <button class="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-700"
                            @click="showLogs = false">Fechar</button>
                    </div>
                </div>
                <div
                    class="flex-1 overflow-auto bg-slate-50 dark:bg-slate-800 rounded p-3 text-xs font-mono whitespace-pre-wrap leading-5">
                    <template v-if="logs?.length">
                        <div v-for="(l, i) in logs" :key="i">{{ l }}</div>
                    </template>
                    <div v-else class="opacity-60">Sem logs para exibir.</div>
                </div>
            </div>
        </div>

        <!-- Modal de Dupla Confirmação -->
        <div v-if="confirmVisible" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div
                class="bg-white dark:bg-gray-900 text-slate-900 dark:text-gray-100 rounded-xl shadow-xl w-full max-w-xl p-6 space-y-5">
                <!-- Step 1: Aviso -->
                <template v-if="confirmStep === 1">
                    <h3 class="text-lg font-semibold">
                        Confirmar sincronização de {{ confirmSource === 'crm' ? 'CRM' : 'ERP' }}
                    </h3>
                    <div class="text-sm space-y-3">
                        <p>
                            Esta operação pode ser <strong>demorada</strong> e irá
                            <strong>recalcular todas as empresas</strong> provenientes do
                            {{ confirmSource === 'crm' ? 'CRM' : 'ERP (Sienge)' }}.
                        </p>
                        <ul class="list-disc pl-5 opacity-90">
                            <li>Consulta a API de origem em páginas (paginação).</li>
                            <li>Atualiza/insere vínculos no banco conforme regras definidas.</li>
                            <li>Não remove overrides existentes.</li>
                        </ul>
                        <p class="opacity-80">
                            Prossiga apenas se você tem certeza que deseja atualizar a base de
                            {{ confirmSource === 'crm' ? 'empreendimentos do CRM' : 'centros de custo do ERP' }}.
                        </p>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button class="px-3 py-2 rounded bg-slate-200 dark:bg-gray-700"
                            @click="closeConfirm">Cancelar</button>
                        <button class="px-3 py-2 rounded bg-blue-600 text-white" @click="goToConfirmStep2">
                            Continuar
                        </button>
                    </div>
                </template>

                <!-- Step 2: Digitar frase -->
                <template v-else>
                    <h3 class="text-lg font-semibold">
                        Confirmação final
                    </h3>
                    <div class="text-sm space-y-3">
                        <p>
                            Para confirmar, digite exatamente a frase abaixo e clique em
                            <strong>Iniciar</strong>:
                        </p>
                        <div
                            class="p-3 rounded border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                            {{ confirmRequiredPhrase }}
                        </div>
                        <input v-model.trim="confirmPhraseInput" type="text"
                            placeholder="Digite aqui a frase de confirmação…"
                            class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
                        <p class="text-xs opacity-70">
                            Dica: {{ confirmSource === 'crm' ? 'RECALCULAR CRM' : 'RECALCULAR ERP' }} (tudo maiúsculo).
                        </p>
                    </div>
                    <div class="flex justify-between items-center pt-2">
                        <button class="px-3 py-2 rounded bg-slate-200 dark:bg-gray-700" @click="confirmStep = 1">
                            Voltar
                        </button>
                        <div class="flex gap-2">
                            <button class="px-3 py-2 rounded bg-slate-200 dark:bg-gray-700"
                                @click="closeConfirm">Cancelar</button>
                            <button class="px-3 py-2 rounded text-white"
                                :class="canConfirm ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600/40 cursor-not-allowed'"
                                :disabled="!canConfirm" @click="runConfirmedSync">
                                Iniciar
                            </button>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
