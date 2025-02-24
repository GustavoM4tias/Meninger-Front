<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useEventStore } from '../../../stores/Event/eventStore';
import { useAuthStore } from '../../../stores/Auth/authStore';
import EventText from './EventText.vue';

const userStore = useAuthStore();
const eventStore = useEventStore();

const mounth = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
]

const mesSelecionado = ref('');

const filtrarEventosPorMes = (eventos) => {
    if (mesSelecionado.value !== '') {
        return eventos.filter(evento => {
            const dataEvento = new Date(evento.event_date);
            return dataEvento.getMonth() === Number(mesSelecionado.value);
        });
    }
    return eventos; // Se nenhum mês for selecionado, retorna todos os eventos
};

// Computed para eventos em andamento filtrados pelo mês
const todosEventosEmAndamento = computed(() => {
    const eventos = eventStore.eventosEmAndamento;
    const eventosFiltrados = filtrarEventosPorMes(eventos);
    return eventosFiltrados.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
});

// Computed para eventos finalizados filtrados pelo mês
const todosEventosFinalizados = computed(() => {
    const eventosFinalizados = eventStore.eventosFinalizados;
    const eventosFiltrados = filtrarEventosPorMes(eventosFinalizados);
    return eventosFiltrados.sort((b, a) => new Date(a.event_date) - new Date(b.event_date));
});

onMounted(() => {
    if (eventStore.events.length === 0) {
        eventStore.fetchEvents();
    }
    if (userStore.users.length === 0) {
        userStore.getAllUsers();
    }
});

watch(mesSelecionado, () => {
    eventStore.fetchEvents();
});
</script>

<template>
    <!-- Ajustar campo de aniversario -->
    <div class="events-notification">
        <div
            class="border-2 rounded-xl h-80 md:h-[calc(100%-2rem)] w-full m-auto md:mt-10 border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700 overflow-hidden">
            <div
                class="flex justify-between title border-b-2 border-gray-300 dark:border-gray-600 p-3 md:p-5 text-xl md:text-2xl">
                <RouterLink class="hover:text-gray-700 dark:hover:text-gray-300 flex items-center text-lg md:text-2xl"
                    :to="{ path: '/events', query: { section: 'proximos' } }">
                    <i class="fa-solid fa-calendar-days px-1"></i>
                    <span class="hidden lg:block ms-1">Próximos</span> <span class="ms-1.5">Eventos</span>
                </RouterLink>
                <div class="text-md">
                    <select v-model="mesSelecionado"
                        class="py-1 border text-sm text-center md:text-lg text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-500 dark:border-gray-600 rounded-lg focus:outline-none shadow-sm w-full">
                        <option value="">Todos</option>
                        <option v-for="(mes, index) in mounth" :key="index" :value="index">
                            {{ mes }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Ajustar scroll -->
            <div class="events flex flex-col relative h-[calc(100%-3.5rem)] md:h-[calc(100%-4.5rem)] overflow-y-auto">
                <!-- Eventos e Aniversários em andamento -->
                <div v-for="item in todosEventosEmAndamento" :key="item.id">
                    <EventText :item="item" />
                    <!-- Eventos Realizados -->
                </div>

                <div v-if="todosEventosFinalizados.length != 0"
                    class="bg-gray-100 dark:bg-gray-600 text-center text-md md:text-lg font-medium md:p-0.5 border-b-2 border-gray-300 dark:border-gray-600">
                    Eventos Realizados
                </div>
                
                <div v-if="todosEventosEmAndamento.length === 0 && todosEventosFinalizados.length === 0"
                    class="text-center text-xl m-auto p-4 text-gray-500">
                    Nenhum evento em andamento.
                </div>

                <!-- Eventos e Aniversários finalizados -->
                <div v-for="item in todosEventosFinalizados" :key="item.id">
                    <EventText :item="item" />
                </div>
            </div>
        </div>
    </div>
</template>
