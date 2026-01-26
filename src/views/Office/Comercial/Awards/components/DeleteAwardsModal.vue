<template>
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="emit('close')">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <i class="fas fa-trash-alt"></i>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Remover clientes da premiação</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        Tem certeza que deseja remover {{ count }} {{ count === 1 ? 'cliente' : 'clientes' }} da
                        premiação? Esta ação não pode ser desfeita.
                    </p>
                    <p class="text-xs text-gray-500 mt-1" v-if="showAdminWarning">
                        Somente administradores podem remover registros fora da etapa inicial.
                    </p>
                </div>
            </div>

            <ul class="text-sm text-gray-700 dark:text-gray-200 max-h-40 overflow-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                <li v-for="name in sampleNames" :key="name" class="flex items-center gap-2">
                    <i class="fas fa-user text-gray-400 text-xs"></i>
                    <span>{{ name }}</span>
                </li>
                <li v-if="remainingCount > 0" class="text-xs text-gray-500">
                    +{{ remainingCount }} outros
                </li>
            </ul>

            <div class="flex justify-end gap-2">
                <button class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-200"
                    @click="emit('close')">
                    Cancelar
                </button>
                <button
                    class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    :disabled="!canConfirm || loading" @click="confirm">
                    <span v-if="loading" class="flex items-center gap-2">
                        <i class="fas fa-circle-notch fa-spin"></i>
                        Removendo...
                    </span>
                    <span v-else>Remover</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAwardsStore } from '@/stores/Comercial/Awards/awardStore'

const props = defineProps({
    awardIds: { type: Array, default: () => [] },
    rows: { type: Array, default: () => [] },
    canDelete: { type: Boolean, default: false },
    requiresAdmin: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'done'])
const awardsStore = useAwardsStore()
const loading = ref(false)

const count = computed(() => props.awardIds.length)

const sampleNames = computed(() => {
    const names = []
    const seen = new Set()
    props.rows.forEach((row) => {
        const base = row.customerName || row.enterpriseName || `Award #${row.awardId}`
        if (!seen.has(base)) {
            seen.add(base)
            names.push(base)
        }
    })
    return names.slice(0, 5)
})

const remainingCount = computed(() => Math.max(0, props.rows.length - sampleNames.value.length))

const showAdminWarning = computed(() => props.requiresAdmin && !props.canDelete)
const canConfirm = computed(() => props.canDelete && props.awardIds.length > 0)

const confirm = async () => {
    if (!canConfirm.value || loading.value) return
    loading.value = true
    try {
        await awardsStore.deleteAwards(props.awardIds)
        emit('done')
        emit('close')
    } catch (err) {
        console.error('Erro ao remover clientes da premiação:', err)
    } finally {
        loading.value = false
    }
}
</script>
