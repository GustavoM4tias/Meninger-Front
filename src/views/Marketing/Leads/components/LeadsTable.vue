<template>
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-600 overflow-hidden">
        <!-- Header -->
        <div class="p-6 border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center justify-between">
                <div class="flex">
                    <div>
                        <h3 class="text-lg font-semibold">Leads por Empreendimento</h3>
                        <p class="text-sm">Performance de cada empreendimento</p>
                    </div>
                    <span v-if="selectedNames.size"
                        class="ml-2 my-auto text-purple-600 dark:text-purple-300 font-medium">
                        • {{ selectedNames.size }} selecionado(s)
                    </span>
                </div>

                <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
                    <button @click="openGroup('list')" :disabled="disabledOpen"
                        class="px-3 py-1 text-sm font-medium bg-white dark:bg-gray-600 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
                        Listagem
                    </button>
                    <button @click="openGroup('funnel')" :disabled="disabledOpen"
                        class="px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-600 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
                        Funil
                    </button>
                    <button @click="openGroup('stacked')" :disabled="disabledOpen"
                        class="px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-600 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
                        Barras
                    </button>
                    <button @click="openGroup('pie')" :disabled="disabledOpen"
                        class="px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-600 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
                        Pizza
                    </button>
                </div>
            </div>
        </div>

        <div v-if="sortedData.length === 0" class="p-12 text-center">
            <i class="fas fa-inbox text-5xl text-gray-400"></i>
            <p class="mt-2">Nenhum empreendimento encontrado</p>
        </div>

        <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                        <th class="px-6 py-3 w-10">
                            <input type="checkbox" :checked="allVisibleChecked" @change="toggleAllVisible($event)" />
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Empreendimento</th>
                        <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Leads</th>
                        <th class="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-600">
                    <tr v-for="(e, idx) in sortedData" :key="e.name"
                        class="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                        <td class="px-6 py-4">
                            <input type="checkbox" :checked="selectedNames.has(e.name)"
                                @change="toggleOne(e.name, $event)" />
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div :style="{ backgroundColor: getColor(idx) }" class="w-3 h-3 rounded-full mr-3">
                                </div>
                                <div class="text-sm font-medium line-clamp-2">{{ e.name }}</div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="text-sm font-semibold">{{ e.count }}</div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex gap-1 justify-center items-center">
                                <button @click="openSingle(e, 'list')" class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors
                   text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                                    v-tippy="'Ver leads'">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button @click="openSingle(e, 'funnel')" class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors
                   text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                                    v-tippy="'Ver leads'">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button @click="openSingle(e, 'pie')" class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors
                   text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                                    v-tippy="'Pizza por situação'">
                                    <i class="fas fa-chart-pie"></i>
                                </button>
                                <button @click="openSingle(e, 'stacked')" class="inline-flex items-center px-2 py-2 text-xs font-medium rounded-full transition-colors
                   text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                                    v-tippy="'Colunas por situação'">
                                    <i class="fas fa-chart-bar"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="data?.length" class="p-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>Mostrando {{ data.length }} empreendimentos</span>
            <button @click="openGroup('list')"
                class="px-3 py-1 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                Ver selecionados
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ data: { type: Array, required: true } })
const emit = defineEmits(['abrirModal'])

const sortBy = ref('count-desc')
const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1']
const getColor = (i) => colors[i % colors.length]

const selectedNames = ref(new Set())
const visibleNames = computed(() => props.data.map(e => e.name))
const allVisibleChecked = computed(() => visibleNames.value.every(n => selectedNames.value.has(n)) && visibleNames.value.length > 0)
const disabledOpen = computed(() => props.data.length === 0)

const sortedData = computed(() => {
    const arr = [...props.data]
    return sortBy.value === 'count' ? arr.sort((a, b) => a.count - b.count) : arr.sort((a, b) => b.count - a.count)
})

const toggleAllVisible = (evt) => {
    const next = new Set(selectedNames.value)
    if (evt.target.checked) visibleNames.value.forEach(n => next.add(n))
    else visibleNames.value.forEach(n => next.delete(n))
    selectedNames.value = next
}
const toggleOne = (name, evt) => {
    const next = new Set(selectedNames.value)
    evt.target.checked ? next.add(name) : next.delete(name)
    selectedNames.value = next
}

const modeMap = { list: 'list', funnel: 'funnel', pie: 'pie', stacked: 'stacked', bar: 'stacked' }

const openSingle = (entry, mode = 'list') => {
  emit('abrirModal', [entry.leads, modeMap[mode] || 'list'])
}
const openGroup = (mode = 'list') => {
  const namesSet = selectedNames.value.size ? new Set(selectedNames.value) : new Set(visibleNames.value)
  const leads = props.data.filter(e => namesSet.has(e.name)).flatMap(e => e.leads)
  emit('abrirModal', [leads, modeMap[mode] || 'list'])
}

</script>
