<template>
    <div class="p-4 rounded-lg shadow bg-white dark:bg-gray-900">
        <div class="flex flex-wrap items-end gap-4">

            <!-- Data Inicial -->
            <div class="flex-1 lg:flex-initial lg:min-w-52">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-day mr-1"></i>Data Distrato — Início
                </label>
                <input v-model="localFilters.startDate" type="date"
                    class="w-full px-2 py-2 border rounded-md text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 dark:bg-gray-900/60 text-center" />
            </div>

            <!-- Data Final -->
            <div class="flex-1 lg:flex-initial lg:min-w-52">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-check mr-1"></i>Data Distrato — Fim
                </label>
                <input v-model="localFilters.endDate" type="date"
                    class="w-full px-2 py-2 border rounded-md text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 dark:bg-gray-900/60 text-center" />
            </div>

            <!-- Empreendimentos -->
            <div class="flex-1 max-w-full">
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-city mr-1"></i>Empreendimento(s)
                </label>
                <MultiSelector
                    :model-value="localFilters.enterpriseName"
                    @update:modelValue="v => localFilters.enterpriseName = Array.isArray(v) ? v : []"
                    :options="enterprisesOptions"
                    placeholder="Todos os empreendimentos"
                    :page-size="150"
                    :select-all="true"
                />
            </div>

            <!-- Botões -->
            <div class="flex flex-1 gap-4 min-w-40">
                <button @click="clearFilters"
                    class="flex w-full px-4 py-2 text-lg font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none transition-colors">
                    <i class="fas fa-broom pe-1 my-auto"></i>
                    <span class="text-center w-full">Limpar</span>
                </button>
                <button @click="applyFilters"
                    class="flex w-full px-4 py-2 text-lg font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none transition-colors">
                    <i class="fas fa-filter pe-1 my-auto"></i>
                    <span class="text-center w-full">Filtrar</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useDistratosStore } from '@/stores/Comercial/Distratos/distratosStore'
import MultiSelector from '@/components/UI/MultiSelector.vue'

const emit   = defineEmits(['filter-changed'])
const store  = useDistratosStore()
const route  = useRoute()
const router = useRouter()

const localFilters = ref({
    startDate:      dayjs().startOf('year').format('YYYY-MM-DD'),
    endDate:        dayjs().format('YYYY-MM-DD'),
    enterpriseName: [],
})

const enterprisesOptions = computed(() =>
    (store.enterprises || []).map(e => e.name)
)

// ── URL sync ─────────────────────────────────────────────────────────────
function syncFromUrl() {
    const q = route.query
    if (!Object.keys(q).length) return
    const next = { ...localFilters.value }
    if (q.enterpriseName) next.enterpriseName = String(q.enterpriseName).split(',').map(s => s.trim()).filter(Boolean)
    else                  next.enterpriseName = []
    if (q.startDate) next.startDate = String(q.startDate)
    if (q.endDate)   next.endDate   = String(q.endDate)
    localFilters.value = next
    store.setFilters(localFilters.value)
}

function syncToUrl() {
    const q = {}
    if (localFilters.value.startDate) q.startDate = localFilters.value.startDate
    if (localFilters.value.endDate)   q.endDate   = localFilters.value.endDate
    if (localFilters.value.enterpriseName.length) q.enterpriseName = localFilters.value.enterpriseName.join(',')
    router.replace({ query: q })
}

// ── Actions ───────────────────────────────────────────────────────────────
function applyFilters() {
    store.setFilters({ ...localFilters.value })
    syncToUrl()
    emit('filter-changed')
}

function clearFilters() {
    localFilters.value = {
        startDate:      dayjs().startOf('year').format('YYYY-MM-DD'),
        endDate:        dayjs().format('YYYY-MM-DD'),
        enterpriseName: [],
    }
    store.clearFilters()
    router.replace({ query: {} })
    emit('filter-changed')
}

// Propaga mudanças ao store enquanto digita (sem disparar fetch)
watch(localFilters, v => store.setFilters({ ...v }), { deep: true })

onMounted(async () => {
    await store.fetchEnterprises()
    syncFromUrl()
})
</script>
