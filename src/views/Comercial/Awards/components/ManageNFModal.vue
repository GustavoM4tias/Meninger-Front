<template>
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="handleClose">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-h-[80%] overflow-y-auto max-w-2xl p-6 space-y-6">
            <!-- Cabeçalho -->
            <div class="flex items-start justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Gerenciar NFS-e</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Aplique, reutilize, edite ou remova NF para {{ awardCount }} cliente(s) selecionado(s).
                    </p>
                </div>
                <button class="text-gray-400 hover:text-gray-600 text-xl" @click="handleClose">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Chips de clientes da seleção -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300 mb-1">Clientes</p>
                <div class="text-sm text-gray-700 dark:text-gray-100 flex flex-wrap gap-2">
                    <span v-for="name in sampleNames" :key="name"
                        class="px-2 py-0.5 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                        {{ name }}
                    </span>
                    <span v-if="extraCount > 0" class="text-xs text-gray-500">
                        +{{ extraCount }} outros
                    </span>
                </div>
            </div>

            <!-- Escolha da ação -->
            <div>
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300 mb-2">Escolha a ação</p>
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <button v-for="option in modeOptions" :key="option.key" :disabled="(option.key === 'existing' && !hasExistingOptions) ||
                        (option.key === 'edit' && !hasEditableOptions)
                        " @click="setMode(option.key)" :class="[
                            'rounded-xl border px-3 py-3 text-left transition',
                            mode === option.key
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-100'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200',
                            ((option.key === 'existing' && !hasExistingOptions) ||
                                (option.key === 'edit' && !hasEditableOptions))
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                        ]">
                        <div class="font-semibold text-sm mb-1">{{ option.label }}</div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ option.description }}</p>
                    </button>
                </div>
            </div>

            <!-- Modo: Upload -->
            <div v-if="mode === 'upload'" class="space-y-3">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Enviar arquivo (XML/PDF)</label>
                <input :key="fileInputKey" type="file" accept=".xml,.pdf"
                    class="w-full border border-dashed rounded-lg p-3 dark:bg-gray-800" @change="onFileChange" />
                <p class="text-xs text-gray-500">
                    O arquivo será aplicado a todos os clientes selecionados.
                </p>
            </div>

            <!-- Modo: Usar NF existente -->
            <div v-else-if="mode === 'existing'" class="space-y-3">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Selecionar NF já cadastrada</label>
                <input type="text" v-model="existingSearch" placeholder="Buscar por número, prestador ou cliente"
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800" />
                <select class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800" v-model="selectedExistingId">
                    <option v-for="option in filteredExistingOptions" :key="option.primaryAwardId"
                        :value="option.primaryAwardId">
                        {{ option.label }} • {{ formatDate(option.nfIssueDate) }}
                    </option>
                </select>
                <p v-if="!filteredExistingOptions.length" class="text-xs text-gray-500">
                    Nenhuma NF encontrada com esse filtro.
                </p>
                <p class="text-xs text-gray-500">
                    Copiamos os dados da NF escolhida para os clientes selecionados.
                </p>
            </div>

            <!-- Modo: Editar NF (com seletor) -->
            <div v-else-if="mode === 'edit'" class="space-y-3">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Editar dados da NF
                </label>

                <!-- Seletor de NF a ser editada -->
                <div class="space-y-2">
                    <span class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Escolha a NF que deseja editar
                    </span>
                    <input type="text" v-model="existingSearch" placeholder="Buscar por número, prestador ou cliente"
                        class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800" />
                    <select class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800" v-model="selectedExistingId">
                        <option v-for="option in filteredExistingOptions" :key="option.primaryAwardId"
                            :value="option.primaryAwardId">
                            {{ option.label }} • {{ formatDate(option.nfIssueDate) }}
                        </option>
                    </select>
                    <p v-if="!filteredExistingOptions.length" class="text-xs text-gray-500">
                        Nenhuma NF encontrada com esse filtro.
                    </p>
                    <p v-else class="text-xs text-gray-500">
                        Ao salvar, os dados serão aplicados a todas as premiações que usam esta mesma NF.
                    </p>
                </div>

                <!-- Form de edição -->
                <div v-if="editBaseAward" class="space-y-3 mt-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <span class="block text-xs text-gray-500 mb-1">Número da NF</span>
                            <input v-model="editData.nfNumber" type="text"
                                class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800" />
                        </div>

                        <div>
                            <span class="block text-xs text-gray-500 mb-1">Data de emissão</span>
                            <input v-model="editData.nfIssueDate" type="date"
                                class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800" />
                        </div>

                        <div>
                            <span class="block text-xs text-gray-500 mb-1">Prestador</span>
                            <input v-model="editData.providerName" type="text"
                                class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800" />
                        </div>

                        <div>
                            <span class="block text-xs text-gray-500 mb-1">CNPJ do prestador</span>
                            <input v-model="editData.providerCnpj" type="text"
                                class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800"
                                placeholder="Somente números" />
                        </div>

                        <div class="sm:col-span-2">
                            <span class="block text-xs text-gray-500 mb-1">Descrição do serviço</span>
                            <textarea v-model="editData.serviceDescription" rows="2"
                                class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800"></textarea>
                        </div>

                        <div>
                            <span class="block text-xs text-gray-500 mb-1">Valor total</span>
                            <input v-model.number="editData.totalAmount" type="number" step="0.01"
                                class="w-full border rounded-lg px-3 py-2 dark:bg-gray-800" />
                        </div>
                    </div>

                    <p class="text-xs text-gray-500">
                        Os dados acima serão aplicados a todas as premiações vinculadas a esta NF.
                    </p>
                </div>
            </div>

            <!-- Modo: Remover NF -->
            <div v-else class="space-y-3">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <i class="fas fa-triangle-exclamation text-red-500"></i>
                    Remover NF
                </label>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    Os dados da NF (número, data, prestador, valor e arquivos) serão limpos para todos os clientes
                    selecionados. Esta ação não pode ser desfeita.
                </p>
            </div>

            <!-- Erro -->
            <div v-if="awardsStore.error" class="text-sm text-red-500">
                {{ awardsStore.error }}
            </div>

            <!-- Rodapé -->
            <div class="flex items-center justify-end gap-3">
                <button class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-200"
                    @click="handleClose">
                    Cancelar
                </button>
                <button
                    class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!canConfirm || isProcessing" @click="handleConfirm">
                    {{ mode === 'clear' ? 'Remover NF' : 'Aplicar NF' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAwardsStore } from '@/stores/Comercial/Awards/awardStore'

const props = defineProps({
    awardIds: { type: Array, default: () => [] },
    initialMode: { type: String, default: 'upload' }
})
const emit = defineEmits(['close', 'done'])

const awardsStore = useAwardsStore()

const mode = ref('upload')
const file = ref(null)
const selectedExistingId = ref(null) // id de um award "base" para NF
const existingSearch = ref('')
const isProcessing = ref(false)
const fileInputKey = ref(Date.now())

// dados para edição de NF (UI)
const editData = ref({
    nfNumber: '',
    nfIssueDate: '',
    providerName: '',
    providerCnpj: '',
    serviceDescription: '',
    totalAmount: null
})

/** 
 * 🔢 Helpers de conversão de valor
 * Ajuste aqui se o backend NÃO usar centavos.
 */

// Backend → UI (ex.: 150000 -> 1500.00)
const toUiAmount = (raw) => {
    if (raw == null) return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null

    // se o valor for muito grande, provavelmente está em centavos
    // ex: 1500000000 -> 15000000.00 (aqui você pode ajustar a heurística)
    // assumindo backend guarda sempre em centavos:
    return n / 100
}

// UI → Backend (ex.: 1500.00 -> 150000)
const toApiAmount = (raw, fallback) => {
    if (raw == null || raw === '') return fallback ?? null
    const n = Number(raw)
    if (!Number.isFinite(n)) return fallback ?? null
    // arredonda pra 2 casas em centavos
    return Math.round(n * 100)
}

const modeOptions = [
    { key: 'upload', label: 'Enviar arquivo', description: 'Faça upload de um XML ou PDF.' },
    { key: 'existing', label: 'Usar NF existente', description: 'Copie os dados de outra NF cadastrada.' },
    { key: 'clear', label: 'Remover NF', description: 'Limpe todos os dados de NF selecionados.' },
    { key: 'edit', label: 'Editar dados da NF', description: 'Ajuste número, prestador, data e valor.' }
]

const awardCount = computed(() => props.awardIds.length)

const targetAwards = computed(() => {
    const set = new Set(props.awardIds)
    return (awardsStore.awards || []).filter((award) => set.has(award.id))
})

const gatherCustomersFromAwards = (awards) => {
    const names = []
    const seen = new Set()
    awards.forEach((award) => {
        const candidates = []
        const linkNames = (award.links || [])
            .map((link) => link.customerName)
            .filter(Boolean)

        if (linkNames.length) {
            candidates.push(...linkNames)
        } else if (award.customerName) {
            candidates.push(award.customerName)
        } else if (award.links?.[0]?.enterpriseName) {
            candidates.push(award.links[0].enterpriseName)
        } else {
            candidates.push(`Award #${award.id}`)
        }

        candidates.forEach((name) => {
            const trimmed = String(name).trim()
            if (trimmed && !seen.has(trimmed)) {
                seen.add(trimmed)
                names.push(trimmed)
            }
        })
    })
    return names
}

const targetCustomerNames = computed(() => gatherCustomersFromAwards(targetAwards.value))
const sampleNames = computed(() => targetCustomerNames.value.slice(0, 3))
const extraCount = computed(
    () => Math.max(0, targetCustomerNames.value.length - sampleNames.value.length)
)

/**
 * NF existentes deduplicadas
 * - primaryAwardId: um award de referência
 * - awardIds: TODOS os awards que usam a mesma NF (para editar em lote)
 */
const existingOptions = computed(() => {
    const byNf = new Map()

    for (const award of awardsStore.awards || []) {
        if (!award?.nfFilename && !award?.nfNumber) continue

        const nfKey = `${award.nfNumber || award.nfFilename}-${award.providerCnpj || ''}-${award.nfIssueDate || ''}`

        if (!byNf.has(nfKey)) {
            byNf.set(nfKey, {
                primaryAwardId: award.id,
                awardIds: new Set(),
                nfNumber: award.nfNumber,
                providerName: award.providerName,
                providerCnpj: award.providerCnpj,
                nfIssueDate: award.nfIssueDate,
                nfFilename: award.nfFilename,
                customers: new Set()
            })
        }

        const entry = byNf.get(nfKey)
        entry.awardIds.add(award.id)

        const names = gatherCustomersFromAwards([award])
        names.forEach((n) => entry.customers.add(n))
    }

    return Array.from(byNf.values()).map((entry) => {
        const customersList = Array.from(entry.customers)
        const firstCustomers = customersList.slice(0, 3).join(', ')
        const extra = customersList.length > 3 ? ` +${customersList.length - 3} outros` : ''

        const baseLabel = `NF ${entry.nfNumber || 'Sem nº'} • ${entry.providerName || 'Prestador'
            }`
        const label = firstCustomers
            ? `${baseLabel} • ${firstCustomers}${extra}`
            : baseLabel

        return {
            primaryAwardId: entry.primaryAwardId,
            awardIds: Array.from(entry.awardIds),
            label,
            nfIssueDate: entry.nfIssueDate,
            nfNumber: entry.nfNumber,
            providerName: entry.providerName,
            providerCnpj: entry.providerCnpj,
            nfFilename: entry.nfFilename,
            searchText: `${label} ${entry.nfFilename || ''}`.toLowerCase()
        }
    })
})

const filteredExistingOptions = computed(() => {
    const term = existingSearch.value.trim().toLowerCase()
    if (!term) return existingOptions.value
    return existingOptions.value.filter((option) =>
        option.searchText.includes(term)
    )
})

const hasExistingOptions = computed(() => existingOptions.value.length > 0)
const hasEditableOptions = computed(() => existingOptions.value.length > 0)
const hasAwardsSelected = computed(() => awardCount.value > 0)

const canConfirm = computed(() => {
    if (!hasAwardsSelected.value && mode.value !== 'edit') return false
    if (mode.value === 'upload') return !!file.value
    if (mode.value === 'existing')
        return !!selectedExistingId.value && filteredExistingOptions.value.length > 0
    if (mode.value === 'clear') return true
    if (mode.value === 'edit')
        return !!editBaseAward && !!selectedExistingId.value
    return false
})

const setMode = (nextMode) => {
    if (nextMode === 'existing' && !hasExistingOptions.value) return
    if (nextMode === 'edit' && !hasEditableOptions.value) return
    mode.value = nextMode
}

const resetInputs = () => {
    file.value = null
    fileInputKey.value = Date.now()
    existingSearch.value = ''
}

const handleClose = () => {
    resetInputs()
    emit('close')
}

const onFileChange = (event) => {
    const [uploaded] = event.target.files || []
    file.value = uploaded || null
}

const formatDate = (value) => {
    if (!value) return 'Sem data'
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
    if (match) return `${match[3]}/${match[2]}/${match[1]}`
    return value
}

/**
 * NF base selecionada para edição (grupo)
 */
const editOption = computed(
    () =>
        filteredExistingOptions.value.find(
            (opt) => opt.primaryAwardId === selectedExistingId.value
        ) ||
        existingOptions.value.find(
            (opt) => opt.primaryAwardId === selectedExistingId.value
        ) ||
        null
)

/**
 * Award real de referência para preencher os campos
 */
const editBaseAward = computed(() => {
    if (!editOption.value) return null
    return (awardsStore.awards || []).find(
        (a) => a.id === editOption.value.primaryAwardId
    ) || null
})

// sempre que mudar NF selecionada ou entrar em modo edit, popular editData
watch(
    () => [mode.value, editBaseAward.value],
    () => {
        if (mode.value !== 'edit' || !editBaseAward.value) return
        const a = editBaseAward.value
        editData.value = {
            nfNumber: a.nfNumber || '',
            nfIssueDate: a.nfIssueDate || '',
            providerName: a.providerName || '',
            providerCnpj: a.providerCnpj || '',
            serviceDescription: a.serviceDescription || '',
            // 🔥 aqui normalizamos o valor que vem do backend
            totalAmount: toUiAmount(a.totalAmount)
        }
    },
    { immediate: true }
)

const handleConfirm = async () => {
    if (!canConfirm.value || isProcessing.value) return
    isProcessing.value = true

    try {
        if (mode.value === 'clear') {
            await awardsStore.bulkClearNf(props.awardIds)
        } else if (mode.value === 'existing') {
            await awardsStore.bulkAttachNf({
                awardIds: props.awardIds,
                sourceAwardId: selectedExistingId.value
            })
        } else if (mode.value === 'edit') {
            // Editar uma NF e aplicar em todos os awards que usam essa NF
            if (!editOption.value) return
            const idsToUpdate = editOption.value.awardIds || []

            for (const id of idsToUpdate) {
                const award = (awardsStore.awards || []).find((a) => a.id === id)
                if (!award) continue

                await awardsStore.updateAward({
                    ...award,
                    nfNumber: editData.value.nfNumber || null,
                    nfIssueDate: editData.value.nfIssueDate || null,
                    providerName: editData.value.providerName || null,
                    providerCnpj: editData.value.providerCnpj || null,
                    serviceDescription: editData.value.serviceDescription || null,
                    // 🔥 converte de volta para o formato esperado pela API
                    totalAmount: toApiAmount(editData.value.totalAmount, award.totalAmount)
                })
            }
        } else {
            // upload
            await awardsStore.bulkAttachNf({
                awardIds: props.awardIds,
                file: file.value
            })
        }

        emit('done')
        handleClose()
    } catch (err) {
        console.error('Erro ao gerenciar NF:', err)
    } finally {
        isProcessing.value = false
    }
}

// mantém selectedExistingId coerente com o filtro (para existing + edit)
watch(
    filteredExistingOptions,
    (options) => {
        if (!options.length) {
            selectedExistingId.value = null
            return
        }
        if (!options.some((opt) => opt.primaryAwardId === selectedExistingId.value)) {
            selectedExistingId.value = options[0].primaryAwardId
        }
    },
    { immediate: true }
)

// respeita initialMode, com fallback quando não houver opções
watch(
    () => props.initialMode,
    (next) => {
        if (next === 'existing' && !hasExistingOptions.value) {
            mode.value = 'upload'
        } else if (next === 'edit' && !hasEditableOptions.value) {
            mode.value = 'upload'
        } else if (['upload', 'existing', 'clear', 'edit'].includes(next)) {
            mode.value = next
        } else {
            mode.value = 'upload'
        }
    },
    { immediate: true }
)
</script>
