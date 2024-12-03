<script setup>
import { onMounted } from 'vue';
import Carrossel from "./Carrossel.vue";
import { useEventStore } from '../../../stores/eventStore';

const eventStore = useEventStore();

onMounted(() => {
    if (eventStore.events.length === 0) {
        eventStore.fetchEvents(); 
    }
});

</script>

<template>
    <div class="events-preview flex flex-col p-4">
        <p class="text-2xl font-semibold py-1">Eventos Recentes</p>
        <Carrossel class="duration-300 transform hover:scale-[102%]" :eventos="eventStore.eventosRecentes" />
    </div>
</template>