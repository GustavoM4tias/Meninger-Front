<template>
    <div class="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-3">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                            Reservas por Empreendimento
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Pipeline de venda — reservas, vendas e cancelamentos</p>
                    </div>
                    <span v-if="selectedNames.size"
                        class="ml-2 my-auto text-purple-600 dark:text-purple-300 font-medium text-sm">
                        • {{ selectedNames.size }} selecionado(s)
                    </span>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                    <select v-model="sortBy"
                        class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm px-2 py-1.5 text-gray-700 dark:text-gray-100">
                        <option value="count-desc">Total ↓</option>
                        <option value="vendidas-desc">Vendidas ↓</option>
                        <option value="conv-desc">% Conversão ↓</option>
                        <option value="name-asc">Nome A→Z</option>
                    </select>

                    <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden"
                        v-tippy="selectedNames.size ? `Abrir ${selectedNames.size} selecionado(s)` : 'Abrir todos os visíveis'">
                        <button @click="openGroup('list')" :disabled="!sorted.length"
                            class="px-3 py-1 text-sm font-medium bg-white dark:bg-gray-700 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
                            Listagem
                        </button>
                        <button @click="openGroup('pie')" :disabled="!sorted.length"
                            class="px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
                            Pizza
                        </button>
                        <button @click="openGroup('bar')" :disabled="!sorted.length"
                            class="px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
                            Colunas
                        </button>
                        <button @click="openGroup('funnel')" :disabled="!sorted.length"
                            class="px-3 py-1 text-sm font-medium border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 hover:bg-purple-600 dark:hover:bg-purple-600 hover:text-white disabled:opacity-50">
                            Funil
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="!sorted.length" class="p-12 text-center">
            <i class="fas fa-inbox text-5xl text-gray-300 dark:text-gray-600"></i>
            <p class="mt-2 text-gray-400 dark:text-gray-500 text-sm">Nenhum empreendimento encontrado no período</p>
        </div>

        <div v-else class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-10">
                            <input type="checkbox" :checked="allVisibleChecked" @change="toggleAllVisible($event)" />
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Empreendimento</th>
                        <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</th>
                        <th class="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-yellow-600" v-tippy="'Ativas (em curso)'"><i class="fas fa-bookmark"></i></th>
                        <th class="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-emerald-600" v-tippy="'Etapa Vendida (CRM) — não é venda concretizada'"><i class="fas fa-flag-checkered"></i></th>
                        <th class="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-red-600" v-tippy="'Canceladas / Distratadas'"><i class="fas fa-ban"></i></th>
                        <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400" v-tippy="'Vendidas ÷ Total'">% Conv.</th>
                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-900/40 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="(e, idx) in sorted" :key="e.name"
                        class="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                        <td class="px-4 py-3">
                            <input type="checkbox" :checked="selectedNames.has(e.name)" @change="toggleOne(e.name, $event)" />
                        </td>
                        <td class="px-4 py-3 cursor-pointer" @click="toggleOne(e.name, { target: { checked: !selectedNames.has(e.name) } })">
                            <div class="flex items-center gap-3 min-w-0">
                                <div :style="{ backgroundColor: getColor(idx) }" class="w-2.5 h-2.5 rounded-full shrink-0"></div>
                                <div class="min-w-0 flex-1">
                                    <div class="text-sm font-medium line-clamp-1 text-gray-900 dark:text-white">{{ e.name }}</div>
                                    <div class="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
                                        <div class="h-full bg-yellow-500"  :style="{ width: `${pctOf(e.ativas, e.count)}%` }"></div>
                                        <div class="h-full bg-emerald-500" :style="{ width: `${pctOf(e.vendidas, e.count)}%` }"></div>
                                        <div class="h-full bg-red-500"     :style="{ width: `${pctOf(e.canceladas, e.count)}%` }"></div>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-right tabular-nums font-bold text-gray-900 dark:text-white">{{ e.count }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-sm" :class="e.ativas ? 'text-yellow-600 font-semibold' : 'text-gray-400'">{{ e.ativas }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-sm" :class="e.vendidas ? 'text-emerald-600 font-semibold' : 'text-gray-400'">{{ e.vendidas }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-sm" :class="e.canceladas ? 'text-red-500 font-semibold' : 'text-gray-400'">{{ e.canceladas }}</td>
                        <td class="px-4 py-3 text-right tabular-nums">
                            <span class="text-sm font-medium" :class="convColor(taxaConv(e))">
                                {{ taxaConv(e) === null ? '—' : (taxaConv(e) * 100).toFixed(1) + '%' }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <div class="flex gap-1 justify-center items-center">
                                <button @click.stop="openSingle(e, 'list')"
                                    class="inline-flex items-center px-2 py-1.5 text-xs rounded-full text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                                    v-tippy="'Listagem'">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button @click.stop="openSingle(e, 'pie')"
                                    class="inline-flex items-center px-2 py-1.5 text-xs rounded-full text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                                    v-tippy="'Pizza'">
                                    <i class="fas fa-chart-pie"></i>
                                </button>
                                <button @click.stop="openSingle(e, 'bar')"
                                    class="inline-flex items-center px-2 py-1.5 text-xs rounded-full text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                                    v-tippy="'Colunas'">
                                    <i class="fas fa-chart-bar"></i>
                                </button>
                                <button @click.stop="openSingle(e, 'funnel')"
                                    class="inline-flex items-center px-2 py-1.5 text-xs rounded-full text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-200 dark:bg-purple-700/30"
                                    v-tippy="'Funil'">
                                    <i class="fas fa-filter"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot class="bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700">
                    <tr>
                        <td></td>
                        <td class="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Total ({{ sorted.length }} empreendimento{{ sorted.length !== 1 ? 's' : '' }})
                        </td>
                        <td class="px-4 py-3 text-right tabular-nums font-bold text-gray-900 dark:text-white">{{ totals.count }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-sm font-semibold text-yellow-600">{{ totals.ativas }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-sm font-semibold text-emerald-600">{{ totals.vendidas }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-sm font-semibold text-red-500">{{ totals.canceladas }}</td>
                        <td class="px-4 py-3 text-right tabular-nums text-sm font-semibold" :class="convColor(totalConv)">
                            {{ totalConv === null ? '—' : (totalConv * 100).toFixed(1) + '%' }}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ data: { type: Array, default: () => [] } })
const emit = defineEmits(['abrirModal'])

const sortBy = ref('count-desc')
const selectedNames = ref(new Set())

const taxaConv = (e) => e.count ? e.vendidas / e.count : null
const convColor = (t) => {
    if (t === null) return 'text-gray-400'
    if (t >= 0.5) return 'text-emerald-500'
    if (t >= 0.25) return 'text-amber-500'
    return 'text-red-500'
}

const sorted = computed(() => {
    const arr = [...(props.data || [])]
    switch (sortBy.value) {
        case 'count-asc':     return arr.sort((a, b) => a.count - b.count)
        case 'vendidas-desc': return arr.sort((a, b) => b.vendidas - a.vendidas)
        case 'conv-desc':     return arr.sort((a, b) => (taxaConv(b) ?? -1) - (taxaConv(a) ?? -1))
        case 'name-asc':      return arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        default:              return arr.sort((a, b) => b.count - a.count)
    }
})

const pctOf = (n, d) => d > 0 ? (n / d) * 100 : 0

const totals = computed(() => {
    const t = { count: 0, ativas: 0, vendidas: 0, canceladas: 0 }
    for (const e of (props.data || [])) {
        t.count += e.count
        t.ativas += e.ativas || 0
        t.vendidas += e.vendidas || 0
        t.canceladas += e.canceladas || 0
    }
    return t
})
const totalConv = computed(() =>
    totals.value.count ? totals.value.vendidas / totals.value.count : null
)

const visibleNames = computed(() => sorted.value.map(e => e.name))
const allVisibleChecked = computed(() =>
    visibleNames.value.length > 0 && visibleNames.value.every(n => selectedNames.value.has(n))
)
function toggleAllVisible(evt) {
    const next = new Set(selectedNames.value)
    if (evt.target.checked) visibleNames.value.forEach(n => next.add(n))
    else                    visibleNames.value.forEach(n => next.delete(n))
    selectedNames.value = next
}
function toggleOne(name, evt) {
    const next = new Set(selectedNames.value)
    if (evt.target.checked) next.add(name)
    else                    next.delete(name)
    selectedNames.value = next
}
function openGroup(mode = 'list') {
    const names = selectedNames.value.size > 0 ? selectedNames.value : new Set(visibleNames.value)
    const flat = []
    for (const e of sorted.value) {
        if (!names.has(e.name)) continue
        for (const r of (e.reservas || [])) flat.push(r)
    }
    emit('abrirModal', [flat, mode])
}
function openSingle(e, mode = 'list') {
    emit('abrirModal', [e.reservas || [], mode])
}

const palette = ['#818CF8', '#22D3EE', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#FB923C', '#60A5FA', '#4ADE80']
const getColor = (idx) => palette[idx % palette.length]
</script>
