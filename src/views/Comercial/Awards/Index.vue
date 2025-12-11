<template>
    <div class="h-full flex flex-col">
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold">Premiações (Awards / NFS-e)</h1>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        Gerencie a premiação dos clientes e envie NFS-e individualmente.
                    </p>
                </div>
                <!-- espaço pra filtros rápidos no futuro -->
            </div>
        </div>

        <!-- Error -->
        <div v-if="awardsStore.error" class="px-6 pt-4">
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                <p class="text-red-800 font-medium">Erro:</p>
                <p class="text-red-700">{{ awardsStore.error }}</p>
            </div>
        </div>

        <!-- Lista -->
        <div class="px-6 pb-6 pt-4 flex-1 flex flex-col gap-3">
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-semibold">Clientes vinculados à premiação</h2>
                <span class="text-xs text-gray-500">
                    Total de vínculos: {{ rows.length }}
                </span>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 mb-2">
                <span>Selecionados:
                    <strong class="text-gray-900 dark:text-gray-100">{{ selectedCount }}</strong>
                </span>
                <div class="flex flex-wrap gap-2">
                    <button
                        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-200 dark:hover:bg-purple-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="selectedCount === 0" @click="openManageForSelection">
                        <i class="fas fa-layer-group text-[11px]"></i>
                        Gerenciar NF(s) selecionadas
                    </button>
                    <button
                        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="!canDeleteSelected" :title="!canDeleteSelected ? deleteSelectionHint : ''"
                        @click="openDeleteModalForSelection">
                        <i class="fas fa-trash text-[11px]"></i>
                        Excluir selecionados
                    </button>
                </div>
            </div>

            <div v-if="rows.length === 0" class="text-gray-500 text-sm">
                Nenhum cliente vinculado ainda.
            </div>

            <div v-else
                class="overflow-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-800/80">
                        <tr>
                            <th
                                class="px-4 py-2.5 text-center font-medium text-xs uppercase tracking-wide text-gray-500">
                                <input type="checkbox"
                                    class="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    :checked="allVisibleSelected" @change="toggleSelectAllVisible">
                            </th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">
                                Cliente
                            </th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">
                                Empreendimento / Unidade
                            </th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">
                                Etapa / Bloco
                            </th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">
                                Centro de Custo
                            </th>
                            <th class="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide text-gray-500">
                                Data Venda
                            </th>
                            <th
                                class="px-4 py-2.5 text-right font-medium text-xs uppercase tracking-wide text-gray-500">
                                Valor
                            </th>
                            <th
                                class="px-4 py-2.5 text-center font-medium text-xs uppercase tracking-wide text-gray-500">
                                NF
                            </th>
                            <th
                                class="px-4 py-2.5 text-center font-medium text-xs uppercase tracking-wide text-gray-500">
                                Etapa Premiação
                            </th>
                            <th
                                class="px-4 py-2.5 text-center font-medium text-xs uppercase tracking-wide text-gray-500">
                                Ações
                            </th>
                        </tr>
                    </thead>

                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr v-for="row in rows" :key="`${row.awardId}-${row.linkId || 'no-link'}`" :class="[
                            'hover:bg-gray-50/70 dark:hover:bg-gray-800/70 transition-colors',
                            isRowSelected(row) ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : ''
                        ]">
                            <td class="px-4 py-3 align-top text-center">
                                <input type="checkbox"
                                    class="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    :checked="isRowSelected(row)" :disabled="!row.awardId"
                                    @change.stop="toggleAwardSelection(row.awardId)" />
                            </td>
                            <!-- Cliente -->
                            <td class="px-4 py-3 align-top">
                                <div class="font-medium text-gray-900 dark:text-gray-100">
                                    {{ row.customerName || '—' }}
                                </div>
                                <div class="text-xs text-gray-500" v-if="row.customerId">
                                    #{{ row.customerId }}
                                </div>
                            </td>

                            <!-- Empreendimento / Unidade -->
                            <td class="px-4 py-3 align-top">
                                <div class="text-sm text-gray-900 dark:text-gray-100">
                                    {{ row.enterpriseName || '—' }}
                                </div>
                                <div class="text-xs text-gray-500 mt-0.5">
                                    Unidade: <span class="font-medium">{{ row.unitName || '—' }}</span>
                                </div>
                            </td>

                            <!-- Etapa / Bloco -->
                            <td class="px-4 py-3 align-top">
                                <div class="flex flex-col gap-1">
                                    <span v-if="row.etapa"
                                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                        Etapa: {{ row.etapa }}
                                    </span>
                                    <span v-if="row.bloco"
                                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                                        Bloco: {{ row.bloco }}
                                    </span>
                                </div>
                            </td>

                            <!-- Centro de Custo -->
                            <td class="px-4 py-3 align-top">
                                <div class="text-xs text-gray-700 dark:text-gray-200">
                                    {{ row.costCenter || '—' }}
                                </div>
                            </td>

                            <!-- Data Venda -->
                            <td class="px-4 py-3 align-top">
                                <div class="text-xs text-gray-700 dark:text-gray-200">
                                    {{ formatDate(row.saleDate) }}
                                </div>
                            </td>

                            <!-- Valor -->
                            <td class="px-4 py-3 align-top text-right">
                                <div class="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {{ formatCurrency(row.saleValue) }}
                                </div>
                            </td>

                            <!-- NF -->
                            <td class="px-4 py-3 align-top text-center">
                                <div v-if="row.nfAttached" class="flex flex-col items-center gap-1">
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                        NF vinculada
                                    </span>
                                    <span class="text-[11px] text-gray-500" v-if="row.nfNumber">
                                        Nº {{ row.nfNumber }}
                                    </span>
                                </div>
                                <span v-else class="text-[11px] text-gray-400">
                                    Sem NF
                                </span>
                            </td>

                            <!-- Etapa Premiação -->
                            <td class="px-4 py-3 align-top text-center">
                                <span class="px-2 py-1 rounded-full text-[11px]" :class="statusClass(row.status)">
                                    {{ statusLabel(row.status) }}
                                </span>
                            </td>

                            <!-- Ações -->
                            <td class="px-4 py-3 align-top">
                                <div class="flex items-center justify-center gap-2">
                                    <button
                                        class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 ..."
                                        @click="openManageForRow(row)">
                                        <i class="fas fa-file-circle-plus mr-1.5 text-[11px]"></i>
                                        {{ row.nfAttached ? 'Gerenciar NF' : 'Adicionar NF' }}
                                    </button>

                                    <button
                                        class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 ..."
                                        :disabled="!canDeleteAward(row)" @click="openDeleteModalForRow(row)">
                                        <i class="fas fa-trash mr-1.5 text-[11px]"></i>
                                        Excluir
                                    </button>

                                    <button
                                        class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 ..."
                                        @click="nextStatus(row)">
                                        <i class="fas fa-forward-step mr-1.5 text-[11px]"></i>
                                        Próx. etapa
                                    </button>
                                </div>
                            </td>

                        </tr>
                    </tbody>
                </table>
            </div>

            <ManageNFModal v-if="manageModalState.open" :award-ids="manageModalState.awardIds"
                :initial-mode="manageModalState.initialMode" @close="closeManageModal" @done="handleManageDone" />

            <DeleteAwardsModal v-if="deleteModalState.open" :award-ids="deleteModalState.awardIds"
                :rows="deleteModalState.rows" :can-delete="deleteModalState.canDelete"
                :requires-admin="deleteModalState.requiresAdmin" @close="deleteModalState.open = false"
                @done="handleDeleteDone" />
 
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useAwardsStore } from '@/stores/Comercial/Awards/awardStore'
import ManageNFModal from './components/ManageNFModal.vue'
import DeleteAwardsModal from './components/DeleteAwardsModal.vue' 

const awardsStore = useAwardsStore()
  

const selectedAwardIds = ref(new Set())
const manageModalState = reactive({
    open: false,
    awardIds: [],
    initialMode: 'upload'
})
const deleteModalState = reactive({
    open: false,
    awardIds: [],
    rows: [],
    requiresAdmin: false,
    canDelete: true
})

const userRole = ref('')
try {
    userRole.value = localStorage.getItem('role') || ''
} catch (err) {
    console.warn('Não foi possível carregar a role do usuário:', err)
}
const isAdmin = computed(() => userRole.value?.toLowerCase() === 'admin')

const normalizeCostCenter = (value) => {
    if (value == null) return null
    const digits = String(value).replace(/\D/g, '')
    if (!digits) return null
    if (digits.length >= 5) return digits.slice(-5)
    return digits
}

const extractCostCenterFromText = (text) => {
    if (!text) return null
    const match = String(text).match(/(\d{5})/)
    return match ? match[1] : null
}

const deriveCostCenter = (link, award) => {
    return normalizeCostCenter(
        link?.costCenter ||
        extractCostCenterFromText(link?.enterpriseName) ||
        extractCostCenterFromText(award?.enterpriseName) ||
        extractCostCenterFromText(award?.customerName) ||
        link?.enterpriseId ||
        award?.links?.[0]?.enterpriseId ||
        null
    )
}

// 🔥 monta linhas a partir de Award + AwardLink
const rows = computed(() => {
    const list = []

    for (const award of awardsStore.awards || []) {
        const hasLinks = Array.isArray(award.links) && award.links.length > 0

        if (hasLinks) {
            for (const link of award.links) {
                list.push({
                    awardId: award.id,
                    linkId: link.id,
                    status: award.status,
                    nfNumber: award.nfNumber,
                    nfAttached: !!award.nfFilename,

                    // do link (cliente / venda)
                    customerId: link.customerId,
                    customerName: link.customerName || award.customerName,
                    unitName: link.unitName,
                    unitId: link.unitId,
                    enterpriseId: link.enterpriseId,
                    enterpriseName: link.enterpriseName,
                    etapa: link.etapa,
                    bloco: link.bloco,
                    costCenter: deriveCostCenter(link, award),
                    saleDate: link.saleDate,
                    saleValue: link.saleValue,

                    // objeto bruto se precisar no modal
                    awardRaw: award,
                    linkRaw: link,
                })
            }
        } else {
            // fallback: award sem links (compatibilidade)
            list.push({
                awardId: award.id,
                linkId: null,
                status: award.status,
                nfNumber: award.nfNumber,
                nfAttached: !!award.nfFilename,

                customerId: null,
                customerName: award.customerName,
                unitName: null,
                unitId: null,
                enterpriseId: null,
                enterpriseName: null,
                etapa: null,
                bloco: null,
                costCenter: deriveCostCenter(null, award),
                saleDate: null,
                saleValue: null,

                awardRaw: award,
                linkRaw: null,
            })
        }
    }

    return list
})

const visibleAwardIds = computed(() => {
    const ids = new Set()
    rows.value.forEach((row) => {
        if (row.awardId != null) ids.add(row.awardId)
    })
    return Array.from(ids)
})

const selectedCount = computed(() => selectedAwardIds.value.size)
const selectedAwardRows = computed(() =>
    rows.value.filter((row) => row.awardId != null && selectedAwardIds.value.has(row.awardId))
)
const requiresAdminForSelection = computed(() =>
    selectedAwardRows.value.some((row) => row.status && row.status !== 'iniciado')
)
const canDeleteSelected = computed(() =>
    selectedAwardRows.value.length > 0 && (!requiresAdminForSelection.value || isAdmin.value)
)
const deleteSelectionHint = computed(() => {
    if (selectedAwardRows.value.length === 0) return 'Selecione clientes para excluir'
    if (requiresAdminForSelection.value && !isAdmin.value) {
        return 'Somente administradores podem excluir premiações fora da etapa inicial'
    }
    return ''
})
const allVisibleSelected = computed(() => {
    const visible = visibleAwardIds.value
    if (visible.length === 0) return false
    return visible.every((id) => selectedAwardIds.value.has(id))
})

const toggleAwardSelection = (awardId) => {
    if (awardId == null) return
    const next = new Set(selectedAwardIds.value)
    if (next.has(awardId)) next.delete(awardId)
    else next.add(awardId)
    selectedAwardIds.value = next
}

const isRowSelected = (row) => row?.awardId != null && selectedAwardIds.value.has(row.awardId)

const clearSelection = () => {
    selectedAwardIds.value = new Set()
}

const toggleSelectAllVisible = () => {
    const next = new Set(selectedAwardIds.value)
    if (allVisibleSelected.value) {
        visibleAwardIds.value.forEach((id) => next.delete(id))
    } else {
        visibleAwardIds.value.forEach((id) => next.add(id))
    }
    selectedAwardIds.value = next
}

const openManageModalWith = (awardIds, initialMode = 'upload', replaceSelection = true) => {
    const validIds = Array.from(new Set((awardIds || []).filter((id) => id != null)))
    if (validIds.length === 0) return
    if (replaceSelection) {
        selectedAwardIds.value = new Set(validIds)
    }
    manageModalState.awardIds = validIds
    manageModalState.initialMode = initialMode
    manageModalState.open = true
}

const openManageForRow = (row, mode) => {
    if (!row?.awardId) return
    const initial = mode || (row.nfAttached ? 'existing' : 'upload')
    openManageModalWith([row.awardId], initial)
}

const openManageForSelection = () => {
    if (selectedAwardIds.value.size === 0) return
    openManageModalWith(Array.from(selectedAwardIds.value), 'upload', false)
}

const closeManageModal = () => {
    manageModalState.open = false
}

const handleManageDone = () => {
    clearSelection()
}

const canDeleteAward = (row) => {
    if (!row?.awardId) return false
    return row.status === 'iniciado' || isAdmin.value
}

const openDeleteModalWith = (awardIds) => {
    const ids = Array.from(new Set((awardIds || []).filter((id) => id != null)))
    if (ids.length === 0) return
    const rowsForIds = rows.value.filter((row) => ids.includes(row.awardId))
    deleteModalState.awardIds = ids
    deleteModalState.rows = rowsForIds
    const requiresAdmin = rowsForIds.some((row) => row.status !== 'iniciado')
    deleteModalState.requiresAdmin = requiresAdmin
    deleteModalState.canDelete = !requiresAdmin || isAdmin.value
    deleteModalState.open = true
}

const openDeleteModalForSelection = () => {
    if (!canDeleteSelected.value) return
    openDeleteModalWith(Array.from(selectedAwardIds.value))
}

const openDeleteModalForRow = (row) => {
    if (!canDeleteAward(row)) return
    openDeleteModalWith([row.awardId])
}

const handleDeleteDone = () => {
    clearSelection()
}

const formatCurrency = (v) =>
    Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDate = (value) => {
    if (!value) return '—'
    // se já vier como 'YYYY-MM-DD'
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
    return new Date(value).toLocaleDateString('pt-BR')
}

const nextStatus = async (row) => {
    const award = row.awardRaw
    if (!award) return

    const map = ['iniciado', 'autorizacao', 'andamento', 'pago']
    const current = map.indexOf(award.status)
    const next = map[(current + 1 + map.length) % map.length]

    try {
        await awardsStore.updateAward({ ...award, status: next })
    } catch (err) {
        console.error('Erro ao atualizar status da premiação:', err)
    }
}

const statusLabel = (s) =>
({
    iniciado: 'Iniciado',
    autorizacao: 'Em autorização',
    andamento: 'Em andamento',
    pago: 'Pago',
}[s] || '—')

const statusClass = (s) =>
({
    iniciado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    autorizacao: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200',
    andamento: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
    pago: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
}[s] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200')

onMounted(() => awardsStore.fetchAwards())
</script>
