<!-- src/views/Events.vue -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventStore } from '../stores/Event/eventStore';
import EventCard from '../components/Events/EventCard.vue';
import EventModal from '../components/Events/EventModal.vue';
import AddEventModal from '../components/Events/AddEventModal.vue';

const route = useRoute();
const router = useRouter();
const currentDate = new Date();
const search = ref('');
const selectedEvent = ref(null);
const addEvent = ref(false);
const eventStore = useEventStore(); // Usando a store

const openEventModal = (event) => {
    selectedEvent.value = event;
};

const closeEventModal = () => {
    selectedEvent.value = null;
    eventStore.fetchEvents(); // Atualiza eventos após adicionar
};

const openAddEventModal = () => {
    addEvent.value = true;
};

const closeAddEventModal = () => {
    addEvent.value = false;
    eventStore.fetchEvents(); // Atualiza eventos após adicionar
};

// Atualiza a busca ao alterar a query
watch(
    () => route.query.search,
    (newQuery) => {
        search.value = newQuery || '';
    },
    { immediate: true }
);;

// Computed para acessar o estado da store
const eventsFiltereds = computed(() => {
    const filter = search.value.toLowerCase();
    return eventStore.events.filter(event =>
        event.title.toLowerCase().includes(filter) ||
        event.description.toLowerCase().includes(filter)
    );
});

// Computed para determinar qual seção mostrar
const currentSection = computed(() => route.query.section || 'geral');

const eventsInProgress = computed(() => eventsFiltereds.value.filter(event => new Date(event.event_date) >= currentDate));
const eventsFinisheds = computed(() => eventsFiltereds.value
    .filter(event => new Date(event.event_date) < currentDate)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
);

const updateQuery = () => {
    router.push({ query: { search: search.value, section: currentSection.value } });
};

// Inicializa os eventos
onMounted(() => eventStore.fetchEvents());
</script>

<template>

    <div
        class="bg-gray-300 dark:bg-gray-800 ms-4 md:ms-16 px-4 md:px-8 text-gray-800 dark:text-gray-200 h-[calc(100%-4rem)] relative overflow-hidden">

        <img class="absolute invert dark:invert-0 z-0 left-72 top-0 opacity-25" src="/traçado.png">

        <i @click="openAddEventModal"
            class="far fa-calendar-plus absolute text-gray-400 hover:text-gray-500 cursor-pointer top-0 right-0 m-4 md:m-8 text-4xl z-10"></i>
        <!-- Verificar se usuario é admin/mkt  -->

        <div class="container md:mx-auto mt-5 relative z-10">

            <div class="search items-center md:-mb-5">
                <h1 class="text-2xl md:text-4xl text-center font-bold mb-2">Eventos</h1>
                <div class="nav bg-gray-400 rounded-full mx-auto p-1 md:p-2 filter w-full md:w-2/5">
                    <input type="text" v-model="search" @input="updateQuery"
                        class="busca bg-gray-200 w-full rounded-full px-3 py-1.5 md:px-5 md:py-3 text-gray-700 outline-none font-semibold placeholder-gray-600"
                        placeholder="Buscar eventos..." />
                </div>
            </div>

            <!-- Se houver busca ativa -->
            <div v-if="route.query.search">
                <!-- Se houver resultados da pesquisa, mostrar apenas os resultados filtrados -->
                <div v-if="eventsFiltereds.length > 0" class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Resultados da Pesquisa</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EventCard v-for="event in eventsFiltereds" :key="event.id"
                            :event="{ ...event, event_date: (event.event_date) }" @click="openEventModal(event)" />
                    </div>
                </div>

                <div v-else>
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem Resultados</p>
                </div>
            </div>

            <!-- Se não houver busca ativa, mostrar as seções normais -->
            <div v-else class="divide-y divide-gray-500">

                <div class="overflow-x-auto pb-5"
                    v-if="eventsInProgress.length > 0 && (currentSection === 'geral' || currentSection === 'proximos')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1">Próximos Eventos</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <EventCard v-for="event in eventsInProgress" :key="event.id"
                            :event="{ ...event, event_date: (event.event_date) }" @click="openEventModal(event)" />
                    </div>
                </div>

                <div v-if="eventsInProgress >= 0 && (currentSection === 'proximos')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem Próximos Eventos</p>
                </div>

                <div class="overflow-x-auto pb-5"
                    v-if="eventsFinisheds.length > 0 && (currentSection === 'geral' || currentSection === 'finalizados')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1">Eventos Finalizados</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <EventCard v-for="event in eventsFinisheds" :key="event.id"
                            :event="{ ...event, event_date: (event.event_date) }" @click="openEventModal(event)" />
                    </div>
                </div>

            </div>

        </div>

        <EventModal v-if="selectedEvent" :event="selectedEvent" @close="closeEventModal" />

        <AddEventModal v-if="addEvent" @close="closeAddEventModal" @openAddEventModal="openAddEventModal" />
        <div v-if="eventStore.errorMessage">{{ eventStore.errorMessage }}</div>

    </div>

</template>
