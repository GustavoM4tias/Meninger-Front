<template>
    <teleport to="body">
        <transition name="fade">
            <div v-if="open" class="fixed inset-0 z-40 flex items-center justify-center bg-black/40" aria-modal="true"
                role="dialog">
                <div
                    class="w-full max-w-3xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-visible">

                    <!-- Header -->
                    <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                                    <i class="fas fa-cog text-xs"></i>
                                </span>
                                Configurações do Dashboard
                            </h2>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Configurações avançadas de exibição e integração de dados.
                            </p>
                        </div>
                        <button class="ml-3 px-3 py-1 rounded-full text-gray-200 hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" @click="emit('close')">
                            <i class="fas fa-xmark text-sm"></i>
                        </button>
                    </div>

                    <!-- Tabs -->
                    <div class="border-b border-gray-200 dark:border-gray-700 px-5">
                        <nav class="flex gap-4 -mb-px">
                            <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
                                :class="[
                                    'py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                ]">
                                <i :class="tab.icon" class="mr-1.5"></i>
                                {{ tab.label }}
                            </button>
                        </nav>
                    </div>

                    <!-- Tab: Terreno Externo (OBSTIT) -->
                    <div v-if="activeTab === 'obstit'" class="px-5 py-4 space-y-4">
                        <div v-if="landSyncStore.error" class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">
                            {{ landSyncStore.error }}
                        </div>
                        <div v-if="landSyncStore.loading" class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span class="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></span>
                            Carregando configurações de terreno externo...
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Lista atual -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Empreendimentos configurados</h3>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">Estes terão o terreno buscado externamente.</p>
                                    </div>
                                    <span class="inline-flex truncate items-center justify-center px-5 py-0.5 rounded-full text-[0.65rem] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                        {{ landSyncStore.items.length }} selecionado(s)
                                    </span>
                                </div>
                                <div class="mt-1 max-h-72 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/60 dark:bg-gray-900/40">
                                    <div v-if="!landSyncStore.items.length && !landSyncStore.loading" class="px-4 py-6 text-xs text-gray-500 dark:text-gray-400 text-center">
                                        Nenhum empreendimento configurado ainda.<br />Use o painel ao lado para adicionar.
                                    </div>
                                    <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
                                        <li v-for="item in landSyncStore.items" :key="item.id"
                                            class="px-4 py-3 flex items-start justify-between gap-2 hover:bg-white/80 dark:hover:bg-gray-800">
                                            <div>
                                                <p class="text-xs font-medium text-gray-900 dark:text-gray-100">{{ item.enterprise_name || 'Sem nome cadastrado' }}</p>
                                                <p class="text-[0.7rem] text-gray-500 dark:text-gray-400 mt-0.5">ID ERP: <span class="font-mono">{{ item.enterprise_id }}</span></p>
                                            </div>
                                            <button class="mt-0.5 inline-flex items-center px-2 py-1 rounded-full text-[0.7rem] font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/60" @click="handleLandRemove(item.id)">
                                                <i class="fas fa-trash-alt mr-1"></i>Remover
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Adicionar -->
                            <div class="space-y-3">
                                <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Adicionar empreendimento</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400">Vincule empreendimentos com atualização externa de terreno.</p>
                                <div class="space-y-1">
                                    <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                                        <i class="fas fa-city mr-1"></i>Empreendimento(s)
                                    </label>
                                    <MultiSelector :model-value="selectedLandNames" @update:modelValue="selectedLandNames = Array.isArray($event) ? $event : []"
                                        :options="enterprisesOptions" placeholder="Selecione empreendimentos" :page-size="150" :select-all="true"
                                        panel-class="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-md border shadow bg-white dark:bg-gray-800" />
                                </div>
                                <div class="flex items-center justify-between pt-1">
                                    <div class="text-[0.65rem] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                        <span class="inline-flex w-2 h-2 rounded-full bg-emerald-400"></span>
                                        Ao salvar, o próximo job de OBSTIT usará essa configuração.
                                    </div>
                                    <button class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                        :disabled="!selectedLandNames.length" @click="handleLandAdd">
                                        <i class="fas fa-plus mr-1"></i>Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: Ocultar Empreendimentos -->
                    <div v-if="activeTab === 'hidden'" class="px-5 py-4 space-y-4">
                        <p class="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md px-3 py-2">
                            <i class="fas fa-info-circle mr-1 text-amber-500"></i>
                            Empreendimentos ocultos <strong>não aparecem na listagem</strong> e <strong>não são somados nos resultados</strong>, mas continuam sendo consultados internamente (regras de série, terreno, etc.).
                        </p>

                        <div v-if="hiddenStore.error" class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{{ hiddenStore.error }}</div>
                        <div v-if="hiddenStore.loading" class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span class="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></span>
                            Carregando...
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Lista atual de ocultos -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Empreendimentos ocultos</h3>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">Excluídos da listagem e dos cálculos.</p>
                                    </div>
                                    <span class="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[0.65rem] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                                        {{ hiddenStore.items.length }} oculto(s)
                                    </span>
                                </div>
                                <div class="mt-1 max-h-72 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/60 dark:bg-gray-900/40">
                                    <div v-if="!hiddenStore.items.length && !hiddenStore.loading" class="px-4 py-6 text-xs text-gray-500 dark:text-gray-400 text-center">
                                        Nenhum empreendimento oculto.<br />Todos estão visíveis no dashboard.
                                    </div>
                                    <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
                                        <li v-for="item in hiddenStore.items" :key="item.id"
                                            class="px-4 py-3 flex items-start justify-between gap-2 hover:bg-white/80 dark:hover:bg-gray-800">
                                            <div>
                                                <p class="text-xs font-medium text-gray-900 dark:text-gray-100">{{ item.enterprise_name || 'Sem nome' }}</p>
                                                <p class="text-[0.7rem] text-gray-500 dark:text-gray-400 mt-0.5">ID ERP: <span class="font-mono">{{ item.enterprise_id }}</span></p>
                                            </div>
                                            <button class="mt-0.5 inline-flex items-center px-2 py-1 rounded-full text-[0.7rem] font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                @click="handleHiddenRemove(item.id)" title="Restaurar visibilidade">
                                                <i class="fas fa-eye mr-1"></i>Restaurar
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Adicionar à lista de ocultos -->
                            <div class="space-y-3">
                                <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Ocultar empreendimento</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400">Selecione empreendimentos para remover da listagem e dos cálculos.</p>
                                <div class="space-y-1">
                                    <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                                        <i class="fas fa-eye-slash mr-1"></i>Empreendimento(s)
                                    </label>
                                    <MultiSelector :model-value="selectedHiddenNames" @update:modelValue="selectedHiddenNames = Array.isArray($event) ? $event : []"
                                        :options="enterprisesNotHiddenOptions" placeholder="Selecione para ocultar" :page-size="150" :select-all="false"
                                        panel-class="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-md border shadow bg-white dark:bg-gray-800" />
                                </div>
                                <div class="flex justify-end pt-1">
                                    <button class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                        :disabled="!selectedHiddenNames.length" @click="handleHiddenAdd">
                                        <i class="fas fa-eye-slash mr-1"></i>Ocultar selecionados
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-2 md:gap-0 md:items-center md:justify-between">
                        <p v-if="activeTab === 'obstit'" class="text-[0.6rem] text-gray-500 dark:text-gray-400">
                            A coleta de dados de TR é D-1, feita 1x ao dia às 07:05 AM.<br>
                            A sincronização manual pode levar de 1 a 10 minutos.
                        </p>
                        <p v-else class="text-[0.6rem] text-gray-500 dark:text-gray-400">
                            Alterações são aplicadas imediatamente no dashboard.<br>
                            Os dados dos empreendimentos ocultos continuam sendo consultados internamente.
                        </p>

                        <div class="flex gap-2 justify-end">
                            <button class="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" @click="emit('close')">
                                Fechar
                            </button>
                            <button v-if="activeTab === 'obstit'"
                                class="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                :disabled="landSyncStore.syncLoading" @click="handleRunSync">
                                <i v-if="!landSyncStore.syncLoading" class="fas fa-play text-[0.7rem]"></i>
                                <i v-else class="fas fa-spinner fa-spin text-[0.7rem]"></i>
                                <span>{{ landSyncStore.syncLoading ? 'Sincronizando...' : 'Sincronizar' }}</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useLandSyncStore } from '@/stores/Comercial/Contracts/landSyncStore'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore'
import MultiSelector from '@/components/UI/MultiSelector.vue'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const landSyncStore = useLandSyncStore()
const contractsStore = useContractsStore()
const hiddenStore = useHiddenEnterprisesStore()

const activeTab = ref('obstit')
const tabs = [
    { id: 'obstit', label: 'Terreno Externo (OBSTIT)', icon: 'fas fa-mountain' },
    { id: 'hidden', label: 'Ocultar Empreendimentos', icon: 'fas fa-eye-slash' }
]

const selectedLandNames = ref([])
const selectedHiddenNames = ref([])

const enterprisesOptions = computed(() =>
    (contractsStore.enterprises || []).map(e => e.name)
)

const enterprisesNotHiddenOptions = computed(() => {
    const hiddenIds = hiddenStore.hiddenIds
    return (contractsStore.enterprises || [])
        .filter(e => !hiddenIds.has(Number(e.id)))
        .map(e => e.name)
})

watch(() => props.open, async (isOpen) => {
    if (!isOpen) return
    activeTab.value = 'obstit'
    selectedLandNames.value = []
    selectedHiddenNames.value = []

    if (!contractsStore.enterprises.length) await contractsStore.fetchEnterprises()
    await Promise.all([landSyncStore.fetchAll(), hiddenStore.fetchAll()])
})

// ── OBSTIT handlers ────────────────────────────────────────────────
async function handleLandAdd() {
    if (!selectedLandNames.value.length) return
    const byName = new Map()
    for (const e of contractsStore.enterprises || []) {
        const key = (e.name || '').toString()
        if (!byName.has(key)) byName.set(key, [])
        byName.get(key).push(e)
    }
    for (const name of selectedLandNames.value) {
        for (const ent of byName.get(name) || []) {
            await landSyncStore.addItem({ enterprise_id: ent.id, enterprise_name: ent.name })
        }
    }
    selectedLandNames.value = []
}

async function handleLandRemove(id) {
    if (!window.confirm('Remover este empreendimento da atualização de terreno externo?')) return
    await landSyncStore.removeItem(id)
}

async function handleRunSync() {
    try {
        await landSyncStore.runSync()
        window.alert('Sincronização de terreno disparada com sucesso.')
    } catch (e) {
        window.alert(e?.message || 'Erro ao rodar sincronização OBSTIT.')
    }
}

// ── Hidden enterprises handlers ────────────────────────────────────
async function handleHiddenAdd() {
    if (!selectedHiddenNames.value.length) return
    const byName = new Map()
    for (const e of contractsStore.enterprises || []) {
        const key = (e.name || '').toString()
        if (!byName.has(key)) byName.set(key, [])
        byName.get(key).push(e)
    }
    for (const name of selectedHiddenNames.value) {
        for (const ent of byName.get(name) || []) {
            await hiddenStore.addItem({ enterprise_id: ent.id, enterprise_name: ent.name })
        }
    }
    selectedHiddenNames.value = []
    // Clear contracts cache so the filter takes effect immediately
    contractsStore.clearContractsCache()
}

async function handleHiddenRemove(id) {
    if (!window.confirm('Restaurar visibilidade deste empreendimento?')) return
    await hiddenStore.removeItem(id)
    contractsStore.clearContractsCache()
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
