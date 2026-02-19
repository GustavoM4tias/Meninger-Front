<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { useEventStore } from '@/stores/Marketing/Event/eventStore'
import EventText from './EventText.vue'

dayjs.locale('pt-br')

const eventStore = useEventStore()

// estado do calendário
const viewMonth = ref(dayjs().startOf('month')) // controla o mês exibido
const selectedDay = ref(dayjs())                // dia selecionado (dayjs)

// modais
const isDayModalOpen = ref(false)
const isMonthModalOpen = ref(false)

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

onMounted(async () => {
    if (!Array.isArray(eventStore.events) || eventStore.events.length === 0) {
        await eventStore.fetchEvents()
    }
})

const allEvents = computed(() => (Array.isArray(eventStore.events) ? eventStore.events : []))

const monthLabel = computed(() => viewMonth.value.format('MMMM'))
const yearLabel = computed(() => viewMonth.value.format('YYYY'))
const monthKey = computed(() => viewMonth.value.format('YYYY-MM'))

// eventos do mês (sem plugins)
const monthEvents = computed(() => {
    return allEvents.value
        .filter(e => {
            const d = dayjs(e.event_date)
            return d.isValid() && d.format('YYYY-MM') === monthKey.value
        })
        .sort((a, b) => dayjs(a.event_date).valueOf() - dayjs(b.event_date).valueOf())
})

// map dia -> eventos
const eventsByDay = computed(() => {
    const map = new Map()
    for (const e of monthEvents.value) {
        const key = dayjs(e.event_date).format('YYYY-MM-DD')
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(e)
    }
    return map
})

const selectedKey = computed(() => selectedDay.value.format('YYYY-MM-DD'))
const selectedEvents = computed(() => eventsByDay.value.get(selectedKey.value) || [])
const selectedDayLabel = computed(() => selectedDay.value.format('DD [de] MMMM'))

// lista do mês agrupada
const monthGrouped = computed(() => {
    const entries = Array.from(eventsByDay.value.entries())
    return entries.sort((a, b) => dayjs(a[0]).valueOf() - dayjs(b[0]).valueOf())
})

// grid (42 células / 6 semanas) padrão, estável
const daysGrid = computed(() => {
    const start = viewMonth.value.startOf('month')
    const startWeekday = start.day() // 0..6
    const firstCell = start.subtract(startWeekday, 'day') // domingo da primeira semana

    const cells = []
    for (let i = 0; i < 42; i++) {
        const date = firstCell.add(i, 'day')
        const key = date.format('YYYY-MM-DD')
        const inMonth = date.format('YYYY-MM') === monthKey.value
        const isToday = date.isSame(dayjs(), 'day')
        const isSelected = date.isSame(selectedDay.value, 'day')

        const list = eventsByDay.value.get(key) || []
        const today = dayjs().startOf('day')
        const hasEvents = list.length > 0
        const hasPast = hasEvents ? list.some(ev => dayjs(ev.event_date).startOf('day').isBefore(today)) : false
        const hasUpcoming = hasEvents ? list.some(ev => !dayjs(ev.event_date).startOf('day').isBefore(today)) : false

        cells.push({
            key,
            date,
            dayNumber: date.date(),
            inMonth,
            isToday,
            isSelected,
            hasEvents,
            hasPast,
            hasUpcoming,
        })
    }
    return cells
})

function goToday() {
    viewMonth.value = dayjs().startOf('month')
    selectedDay.value = dayjs()
}

function prevMonth() {
    viewMonth.value = viewMonth.value.subtract(1, 'month').startOf('month')
    // mantém seleção coerente
    selectedDay.value = viewMonth.value.startOf('month')
}

function nextMonth() {
    viewMonth.value = viewMonth.value.add(1, 'month').startOf('month')
    selectedDay.value = viewMonth.value.startOf('month')
}

function openDay(date) {
    selectedDay.value = date
    if (eventsByDay.value.has(date.format('YYYY-MM-DD'))) {
        isDayModalOpen.value = true
    }
}

function openMonthList() {
    isMonthModalOpen.value = true
}

function closeAll() {
    isDayModalOpen.value = false
    isMonthModalOpen.value = false
}

function onKeydown(e) {
    if (e.key === 'Escape') closeAll()
}
</script>

<template>
    <div class="w-full h-full" tabindex="0" @keydown="onKeydown">
        <!-- CARD (só calendário) -->
        <div
            class="rounded-2xl w-full h-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden flex flex-col">

            <div
                class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 shrink-0">
                <div class="min-w-0 truncate">
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ yearLabel }}</p>
                    <p class="text-base -mt-1 font-semibold text-gray-900 dark:text-gray-100 capitalize truncate">
                        {{ monthLabel }}
                    </p>
                </div>

                <div class="flex items-center gap-1">
                    <button
                        class="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-950"
                        @click="prevMonth" type="button" aria-label="Mês anterior">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button
                        class="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-950"
                        @click="nextMonth" type="button" aria-label="Próximo mês">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <button
                        class="w-12 h-8 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-950"
                        @click="goToday" type="button">
                        Hoje
                    </button>
                    <button
                        class="w-14 h-8 text-xs border border-gray-200 dark:border-gray-700 truncate rounded-xl bg-gray-900 text-white hover:bg-gray-950"
                        @click="openMonthList" type="button">
                        <i class="fas fa-list-ul"></i>
                        Lista
                    </button>
                </div>
            </div>

            <div class="px-4 py-3 flex flex-col flex-1 min-h-0">

                <div class="grid grid-cols-7 gap-2 mb-1 shrink-0">
                    <div v-for="w in weekdays" :key="w"
                        class="text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        {{ w }}
                    </div>
                </div>

                <div class="grid grid-cols-7 gap-1 flex-1 overflow-y-auto content-start pr-1 pb-1 pt-1">
                    <button v-for="cell in daysGrid" :key="cell.key" type="button"
                        class="relative h-10 rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-blue-500/35"
                        :class="[
                            cell.inMonth
                                ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                                : 'border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 text-gray-400 dark:text-gray-600',
                            cell.isSelected ? 'ring-2 ring-blue-500/25' : '',
                            cell.isToday ? 'shadow-[0_0_0_1px_rgba(59,130,246,0.35)]' : '',
                            cell.hasEvents ? 'cursor-pointer' : 'cursor-default'
                        ]" @click="cell.hasEvents ? openDay(cell.date) : (selectedDay = cell.date)">
                        <div class="h-full w-full flex items-center justify-center">
                            <span class="text-sm font-semibold"
                                :class="cell.inMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'">
                                {{ cell.dayNumber }}
                            </span>
                        </div>

                        <div v-if="cell.hasEvents" class="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                            <span v-if="cell.hasPast" class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            <span v-if="cell.hasUpcoming" class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
        <!-- MODAL: EVENTOS DO DIA -->
        <teleport to="body">
            <div v-if="isDayModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog"
                aria-modal="true" @click.self="isDayModalOpen = false">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

                <div
                    class="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
                    <div
                        class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                        <div>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Eventos do dia</p>
                            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                                {{ selectedDayLabel }}
                            </p>
                        </div>

                        <div class="flex items-center gap-2">
                            <button
                                class="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700
                       bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-950"
                                @click="isDayModalOpen = false; isMonthModalOpen = true" type="button">
                                <i class="fas fa-list-ul mr-2"></i> Lista do mês
                            </button>

                            <button
                                class="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700
                       bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-950"
                                @click="isDayModalOpen = false" type="button" aria-label="Fechar">
                                <i class="fas fa-xmark"></i>
                            </button>
                        </div>
                    </div>

                    <div class="p-4 max-h-[70vh] overflow-y-auto">
                        <div v-if="selectedEvents.length === 0"
                            class="text-center py-10 text-gray-500 dark:text-gray-400">
                            Nenhum evento neste dia.
                        </div>

                        <div v-else class="space-y-2">
                            <div v-for="item in selectedEvents" :key="item.id"
                                class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <EventText :item="item" />
                            </div>
                        </div>
                    </div>

                    <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button class="px-4 py-2 text-sm rounded-xl bg-gray-900 text-white hover:bg-gray-950"
                            @click="isDayModalOpen = false" type="button">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </teleport>

        <!-- MODAL: LISTA DO MÊS -->
        <teleport to="body">
            <div v-if="isMonthModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4"
                role="dialog" aria-modal="true" @click.self="isMonthModalOpen = false">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

                <div
                    class="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
                    <div
                        class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                        <div>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Lista do mês</p>
                            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                                {{ monthLabel }}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {{ monthEvents.length }} evento(s)
                            </p>
                        </div>

                        <button
                            class="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700
                     bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-950"
                            @click="isMonthModalOpen = false" type="button" aria-label="Fechar">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>

                    <div class="p-4 max-h-[70vh] overflow-y-auto">
                        <div v-if="monthEvents.length === 0" class="text-center py-10 text-gray-500 dark:text-gray-400">
                            Nenhum evento neste mês.
                        </div>

                        <div v-else class="space-y-4">
                            <div v-for="[dayKey, events] in monthGrouped" :key="dayKey"
                                class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div class="px-4 py-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        {{ dayjs(dayKey).format('DD/MM') }}
                                        <span
                                            class="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2 capitalize">
                                            {{ dayjs(dayKey).format('dddd') }}
                                        </span>
                                    </p>

                                    <button class="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                           bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        @click="selectedDay = dayjs(dayKey); isMonthModalOpen = false; isDayModalOpen = true"
                                        type="button">
                                        Ver dia
                                    </button>
                                </div>

                                <div class="p-2">
                                    <div v-for="item in events" :key="item.id">
                                        <EventText :item="item" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button class="px-4 py-2 text-sm rounded-xl bg-gray-900 text-white hover:bg-gray-950"
                            @click="isMonthModalOpen = false" type="button">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>
