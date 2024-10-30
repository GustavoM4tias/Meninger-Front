<!-- src/views/Events.vue -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getEvents } from '../utils/apiEvents';
import EventCard from '../components/Events/EventCard.vue';
import EventModal from '../components/Events/EventModal.vue';
import AddEventModal from '../components/Events/AddEventModal.vue';

const route = useRoute();
const router = useRouter();
const dataAtual = new Date();
const busca = ref(''); // Estado para armazenar o valor do input
const events = ref([]);
const errorMessage = ref('');
const selectedEvent = ref(null);
const addEvent = ref(false); // Para controlar a exibição do modal de adicionar evento

const fetchEvents = async () => {
    errorMessage.value = '';
    try {
        const result = await getEvents();
        events.value = result.data.events;
    } catch (error) {
        console.error('Erro ao obter eventos:', error);
        errorMessage.value = 'Erro ao carregar eventos.';
    }
};

const openEventModal = (event) => {
    selectedEvent.value = event;
};

const closeEventModal = () => {
    selectedEvent.value = null;
};

const openAddEventModal = () => {
    addEvent.value = true;
};

const closeAddEventModal = () => {
    addEvent.value = false;
    fetchEvents();
};

// Centraliza o fechamento e atualização após a exclusão
const handleEventDeleted = () => {
    closeEventModal(); // Fecha o modal de visualização
    fetchEvents(); // Atualiza a lista de eventos
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

// Observa mudanças na query da URL para sincronizar com a `busca`
watch(() => route.query.busca, (newBusca) => {
    busca.value = newBusca || '';
});

// Computed para filtrar os eventos
const eventosFiltrados = computed(() => {
    const filtro = busca.value.toLowerCase();
    return events.value.filter(event =>
        event.title.toLowerCase().includes(filtro) ||
        event.description.toLowerCase().includes(filtro)
    );
});

const eventosEmAndamento = computed(() => eventosFiltrados.value.filter(event => new Date(event.event_date) >= dataAtual));
const eventosFinalizados = computed(() => eventosFiltrados.value
    .filter(event => new Date(event.event_date) < dataAtual)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
);

const eventosRecentes = computed(() => eventosFiltrados.value
    .sort((a, b) => new Date(b.dataHoraPostagem) - new Date(a.dataHoraPostagem))
    .slice(0, 3)
);

const atualizarBusca = () => {
    router.push({ query: { busca: busca.value } });
};

onMounted(fetchEvents);

</script>

<template>

    <div class="bg-gray-800 text-gray-200 min-h-screen w-full relative overflow-hidden">

        <img class="absolute z-0 left-72 top-0 w-full opacity-25" src="../../public/traçado.png">

        <i @click="openAddEventModal" class="far fa-calendar-plus absolute text-gray-400 hover:text-gray-500 cursor-pointer top-0 right-0 m-8 text-4xl"></i> <!-- Verificar se usuario é admin/mkt  -->

        <div class="container md:mx-auto my-5 relative z-10">

            <div class="search items-center -mb-3">
                <h1 class="text-2xl md:text-4xl text-center font-bold mb-2">Eventos</h1>
                <div class="nav bg-gray-400 rounded-full mx-auto p-2  filter w-2/5">
                    <input type="text" v-model="busca" @input="atualizarBusca" class="busca bg-gray-200 w-full rounded-full px-5 py-3 text-gray-700 rounded outline-none font-semibold placeholder-gray-600" placeholder="Buscar eventos..." />
                </div>
            </div>

            <!-- <EventCard v-for="event in events" :key="event.id"
                :event="{ ...event, event_date: formatDate(event.event_date) }" @click="openEventModal(event)" /> -->

            <!-- Se houver busca ativa -->
            <div v-if="route.query.busca">
                <!-- Se houver resultados da pesquisa, mostrar apenas os resultados filtrados -->
                <div v-if="eventosFiltrados.length > 0" class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Resultados da Pesquisa</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EventCard v-for="event in eventosFiltrados" :key="event.id"
                            :event="{ ...event, event_date: formatDate(event.event_date) }"
                            @click="openEventModal(event)" />
                    </div>
                </div>

                <div v-else>
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem Resultados</p>
                </div>
            </div>

            <!-- Se não houver busca ativa, mostrar as seções normais -->
            <div v-else class="divide-y divide-gray-500">
                <div v-if="eventosEmAndamento.length > 0" class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Próximos Eventos</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EventCard v-for="event in eventosEmAndamento" :key="event.id"
                            :event="{ ...event, event_date: formatDate(event.event_date) }"
                            @click="openEventModal(event)" />
                    </div>
                </div>

                <div class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Eventos Finalizados</h2>
                    <div v-if="eventosFinalizados.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EventCard v-for="event in eventosFinalizados" :key="event.id"
                            :event="{ ...event, event_date: formatDate(event.event_date) }"
                            @click="openEventModal(event)" />
                    </div>
                </div>

                <div class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Posts Recentes</h2>
                    <div v-if="eventosRecentes.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EventCard v-for="event in eventosRecentes" :key="event.id"
                            :event="{ ...event, event_date: formatDate(event.event_date) }"
                            @click="openEventModal(event)" />
                    </div>
                </div>
            </div>

        </div>

        <EventModal v-if="selectedEvent" :event="selectedEvent" @close="closeEventModal"
            @event-deleted="handleEventDeleted" />
            
        <AddEventModal v-if="addEvent" @close="closeAddEventModal" @openAddEventModal="openAddEventModal" />
        <div v-if="errorMessage">{{ errorMessage }}</div>


    </div>

</template>
