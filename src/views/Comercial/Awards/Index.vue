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

            <div v-if="rows.length === 0" class="text-gray-500 text-sm">
                Nenhum cliente vinculado ainda.
            </div>

            <div v-else
                class="overflow-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 shadow-sm">
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-800/80">
                        <tr>
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
                        <tr v-for="row in rows" :key="`${row.awardId}-${row.linkId || 'no-link'}`"
                            class="hover:bg-gray-50/70 dark:hover:bg-gray-800/70 transition-colors">
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
                                    <!-- Adicionar NF -->
                                    <button v-if="!row.nfAttached"
                                        class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                                        @click="openAddNF(row)">
                                        <i class="fas fa-file-circle-plus mr-1.5 text-[11px]"></i>
                                        Adicionar NF
                                    </button>

                                    <!-- Editar NF -->
                                    <button v-else
                                        class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/40 dark:text-purple-200 dark:hover:bg-purple-900/60 transition-colors"
                                        @click="openEditModal(row)">
                                        <i class="fas fa-pen mr-1.5 text-[11px]"></i>
                                        Editar NF
                                    </button>

                                    <!-- Próxima etapa -->
                                    <button
                                        class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
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

            <!-- Modal: Adicionar NF -->
            <AddNF v-if="showAddNf" :award="selectedAward" @close="showAddNf = false" />

            <!-- Modal: Editar NF -->
            <EditNF v-if="showEdit" :award="selectedAward" @close="showEdit = false" />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAwardsStore } from '@/stores/Comercial/Awards/awardStore'
import AddNF from './components/AddNF.vue'
import EditNF from './components/EditNF.vue'

const awardsStore = useAwardsStore()

const showAddNf = ref(false)
const showEdit = ref(false)
const selectedAward = ref(null)

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
                    costCenter: link.costCenter,
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
                costCenter: null,
                saleDate: null,
                saleValue: null,

                awardRaw: award,
                linkRaw: null,
            })
        }
    }

    return list
})

const formatCurrency = (v) =>
    Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDate = (value) => {
    if (!value) return '—'
    // se já vier como 'YYYY-MM-DD'
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
    return new Date(value).toLocaleDateString('pt-BR')
}

const openAddNF = (row) => {
    // por enquanto os modais recebem o Award inteiro
    selectedAward.value = row.awardRaw
    showAddNf.value = true
    console.log('award/link para AddNF:', row)
}

const openEditModal = (row) => {
    selectedAward.value = row.awardRaw
    showEdit.value = true
}

const nextStatus = async (row) => {
    const award = row.awardRaw
    if (!award) return

    const map = ['iniciado', 'autorizacao', 'andamento', 'pago']
    const current = map.indexOf(award.status)
    const next = map[(current + 1 + map.length) % map.length]

    await awardsStore.updateAward({ ...award, status: next })
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
