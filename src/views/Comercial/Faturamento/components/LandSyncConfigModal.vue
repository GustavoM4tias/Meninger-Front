<template>
    <teleport to="body">
        <transition name="fade">
            <div v-if="open" class="fixed inset-0 z-40 flex items-center justify-center bg-black/40" aria-modal="true"
                role="dialog">
                <!-- Card -->
                <div
                    class="w-full max-w-3xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-visible">
                    <!-- Header -->
                    <div
                        class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                                <span
                                    class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                                    <i class="fas fa-cog text-xs"></i>
                                </span>
                                Terreno externo (OBSTIT)
                            </h2>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-xl">
                                Defina quais empreendimentos terão o campo <strong>land_value</strong> atualizado a
                                partir do OBSTIT.
                                Essa configuração influencia o cálculo de VGV / VGV+DC e os relatórios do dashboard.
                            </p>
                        </div>

                        <button
                            class="ml-3 px-3 py-1 rounded-full text-gray-200 hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            @click="emit('close')">
                            <i class="fas fa-xmark text-sm"></i>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="px-5 py-4 space-y-4">
                        <!-- Mensagens de estado -->
                        <div v-if="landSyncStore.error"
                            class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">
                            {{ landSyncStore.error }}
                        </div>

                        <div v-if="landSyncStore.loading"
                            class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span
                                class="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></span>
                            Carregando configurações de terreno externo...
                        </div>

                        <!-- Conteúdo principal: duas colunas -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Coluna esquerda: lista atual -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            Empreendimentos configurados
                                        </h3>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">
                                            Estes empreendimentos terão o terreno buscado externamente.
                                        </p>
                                    </div>
                                    <span
                                        class="inline-flex truncate items-center justify-center px-5 py-0.5 rounded-full text-[0.65rem] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                        {{ landSyncStore.items.length }} selecionado(s)
                                    </span>
                                </div>

                                <div
                                    class="mt-1 max-h-72 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/60 dark:bg-gray-900/40">
                                    <div v-if="!landSyncStore.items.length && !landSyncStore.loading"
                                        class="px-4 py-6 text-xs text-gray-500 dark:text-gray-400 text-center">
                                        Nenhum empreendimento configurado ainda.
                                        <br />
                                        Use o painel ao lado para adicionar.
                                    </div>

                                    <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
                                        <li v-for="item in landSyncStore.items" :key="item.id"
                                            class="px-4 py-3 flex items-start justify-between gap-2 hover:bg-white/80 dark:hover:bg-gray-800">
                                            <div class="flex items-start gap-3">

                                                <div>
                                                    <p class="text-xs font-medium text-gray-900 dark:text-gray-100">
                                                        {{ item.enterprise_name || 'Sem nome cadastrado' }}
                                                    </p>
                                                    <p class="text-[0.7rem] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        ID ERP: <span class="font-mono">{{ item.enterprise_id }}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                class="mt-0.5 inline-flex items-center px-2 py-1 rounded-full text-[0.7rem] font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/60"
                                                @click="handleRemove(item.id)">
                                                <i class="fas fa-trash-alt mr-1"></i>
                                                Remover
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Coluna direita: adicionar novo -->
                            <div class="space-y-3">
                                <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    Adicionar empreendimento
                                </h3>

                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Vincule quais empreendimentos terão atualização externa de terreno.
                                </p>

                                <!-- MultiSelector de empreendimentos -->
                                <div class="space-y-1">
                                    <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                                        <i class="fas fa-city mr-1"></i>Empreendimento(s)
                                    </label>

                                    <MultiSelector :model-value="selectedEnterpriseNames"
                                        @update:modelValue="onSelectorChange" :options="enterprisesOptions"
                                        placeholder="Selecione empreendimentos" :page-size="150" :select-all="true"
                                        panel-class="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-md border shadow bg-white dark:bg-gray-800" />

                                    <p class="text-[0.7rem] text-gray-400 dark:text-gray-500 mt-1">
                                        Serão adicionados todos os empreendimentos selecionados na lista acima.
                                    </p>
                                </div>

                                <div class="flex items-center justify-between pt-1">
                                    <div
                                        class="text-[0.65rem] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                        <span class="inline-flex w-2 h-2 rounded-full bg-emerald-400"></span>
                                        Ao salvar aqui, o próximo job de OBSTIT já usará essa configuração.
                                    </div>

                                    <button
                                        class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                        :disabled="!selectedEnterpriseNames.length" @click="handleAdd">
                                        <i class="fas fa-plus mr-1"></i>
                                        Adicionar selecionado(s)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div
                        class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-2 md:gap-0 md:items-center md:justify-between">
                        <p class="text-[0.6rem] text-gray-500 dark:text-gray-400">
                            Alterações aqui buscam o campo TR (terreno) nas observações do Sienge, podendo afetar o
                            valor de contratos já faturados.<br>
                            A coleta dos dados de TR é D-1, e feita 1x ao dia às 07:05 AM.<br>
                            Caso queira sincronizar agora no botão a direita, pode levar de 01 até 10 minutos.
                        </p>

                        <div class="flex gap-2 justify-end">
                            <button
                                class="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                @click="emit('close')">
                                Fechar
                            </button>

                            <button
                                class="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                :disabled="landSyncStore.syncLoading" @click="handleRunSync">
                                <i v-if="!landSyncStore.syncLoading" class="fas fa-play text-[0.7rem]"></i>
                                <i v-else class="fas fa-spinner fa-spin text-[0.7rem]"></i>
                                <span>
                                    {{ landSyncStore.syncLoading ? 'Sincronizando...' : 'Sincronizar' }}
                                </span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useLandSyncStore } from '@/stores/Comercial/Contracts/landSyncStore'
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore'
import MultiSelector from '@/components/UI/MultiSelector.vue'

const props = defineProps({
    open: {
        type: Boolean,
        default: false
    }
})
const emit = defineEmits(['close'])

const landSyncStore = useLandSyncStore()
const contractsStore = useContractsStore()

const selectedEnterpriseNames = ref([])

const enterprisesOptions = computed(() =>
    (contractsStore.enterprises || []).map(e => e.name)
)

watch(
    () => props.open,
    async (isOpen) => {
        if (isOpen) {
            if (!contractsStore.enterprises.length) {
                await contractsStore.fetchEnterprises()
            }
            await landSyncStore.fetchAll()
            selectedEnterpriseNames.value = []
        }
    }
)

function onSelectorChange(v) {
    selectedEnterpriseNames.value = Array.isArray(v) ? v : []
}

async function handleAdd() {
    if (!selectedEnterpriseNames.value.length) return

    const byName = new Map()
    for (const e of contractsStore.enterprises || []) {
        const key = (e.name || '').toString()
        if (!byName.has(key)) byName.set(key, [])
        byName.get(key).push(e)
    }

    try {
        for (const name of selectedEnterpriseNames.value) {
            const list = byName.get(name) || []
            for (const ent of list) {
                await landSyncStore.addItem({
                    enterprise_id: ent.id,
                    enterprise_name: ent.name
                })
            }
        }
        selectedEnterpriseNames.value = []
    } catch (e) {
        // erro já tratado em landSyncStore.error
    }
}

async function handleRemove(id) {
    const ok = window.confirm('Remover este empreendimento da atualização de terreno externo?')
    if (!ok) return

    try {
        await landSyncStore.removeItem(id)
    } catch (e) {
        // erro já tratado em landSyncStore.error
    }
}

// 👇 NOVO: rodar sincronização agora
async function handleRunSync() {
    try {
        const res = await landSyncStore.runSync()
        // opcional: feedback simples
        window.alert('Sincronização de terreno disparada com sucesso.')
        console.log('[OBSTIT sync result]', res)
    } catch (e) {
        window.alert(e?.message || 'Erro ao rodar sincronização OBSTIT.')
    }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.18s ease-out;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
