<!-- src/views/Events.vue -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getEvents } from '../utils/apiEvents';
import EventCard from '../components/Events/EventCard.vue';
import EventModal from '../components/Events/EventModal.vue';
import AddEventModal from '../components/Events/AddEventModal.vue';

const route = useRoute();
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


const handleEventAdded = () => {
    fetchEvents(); // Atualiza a lista de eventos após adicionar um novo
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

    <div class="bg-gray-100 min-h-screen w-full relative overflow-hidden">

        <img class="absolute z-0 left-72 top-0 h-full" src="/public/traçado.png">

        <div class="container md:mx-auto my-10 relative z-10">
            <h1 class="text-2xl md:text-5xl text-center font-bold mb-5">Eventos Marketing</h1>

            <div class="search d-flex">
                <input type="text" v-model="busca" @input="atualizarBusca"
                    class="busca px-3 py-2 rounded outline-none placeholder-gray-500" placeholder="Buscar eventos..." />

                <button @click="openAddEventModal"
                    class="bg-blue-500 text-white mx-4 px-4 py-2 rounded-md mb-4">Adicionar
                    Evento</button>
            </div>

            <!-- <EventCard v-for="event in events" :key="event.id"
                :event="{ ...event, event_date: formatDate(event.event_date) }" @click="openEventModal(event)" /> -->


            <EventModal v-if="selectedEvent" :event="selectedEvent" @close="closeEventModal"
                @event-deleted="handleEventDeleted" />
            <AddEventModal v-if="addEvent" @close="closeAddEventModal" @event-added="handleEventAdded" />
            <div v-if="errorMessage">{{ errorMessage }}</div>



            <!-- Se houver resultados da pesquisa, mostrar apenas os resultados filtrados -->
            <div v-if="route.query.busca && eventosFiltrados.length > 0" class="mb-10">
                <h2 class="text-2xl font-semibold mb-3">Resultados da Pesquisa</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <EventCard v-for="event in eventosFiltrados" :key="event.id"
                        :event="{ ...event, event_date: formatDate(event.event_date) }"
                        @click="openEventModal(event)" />
                </div>
            </div>

            <!-- Se não houver busca ativa, mostrar as seções normais -->
            <div v-else class="divide-y divide-gray-300">
                <div class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Próximos Eventos</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EventCard v-for="event in eventosEmAndamento" :key="event.id"
                            :event="{ ...event, event_date: formatDate(event.event_date) }"
                            @click="openEventModal(event)" />
                    </div>
                </div>

                <div class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Eventos Finalizados</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EventCard v-for="event in eventosFinalizados" :key="event.id"
                            :event="{ ...event, event_date: formatDate(event.event_date) }"
                            @click="openEventModal(event)" />
                    </div>
                </div>

                <div class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Posts Recentes</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EventCard v-for="event in eventosRecentes" :key="event.id"
                            :event="{ ...event, event_date: formatDate(event.event_date) }"
                            @click="openEventModal(event)" />
                    </div>
                </div>





            </div>
        </div>
    </div>

</template>
