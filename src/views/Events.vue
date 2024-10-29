<!-- src/views/Events.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import { getEvents } from '../utils/apiEvents';
import EventCard from '../components/Events/EventCard.vue';
import EventModal from '../components/Events/EventModal.vue';
import AddEventModal from '../components/Events/AddEventModal.vue';

const events = ref([]);
const errorMessage = ref('');
const selectedEvent = ref(null);
const showAddEventModal = ref(false); // Para controlar a exibição do modal de adicionar evento

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
    showAddEventModal.value = true;
};

const closeAddEventModal = () => {
    showAddEventModal.value = false;
};

const handleEventAdded = () => {
    fetchEvents(); // Atualiza a lista de eventos após adicionar um novo
};

onMounted(fetchEvents);
</script>

<template>
    <div>
        <h2>Eventos</h2>
        <button @click="openAddEventModal" class="bg-blue-500 text-white px-4 py-2 rounded-md mb-4">Adicionar Evento</button>
        <EventCard v-for="event in events" :key="event.id" :event="event" @click="openEventModal(event)" />
        <EventModal v-if="selectedEvent" :event="selectedEvent" @close="closeEventModal" />
        <AddEventModal v-if="showAddEventModal" @close="closeAddEventModal" @event-added="handleEventAdded" />
        <div v-if="errorMessage">{{ errorMessage }}</div>
    </div>
</template>

<style scoped>
.error {
    color: red;
}
</style>
