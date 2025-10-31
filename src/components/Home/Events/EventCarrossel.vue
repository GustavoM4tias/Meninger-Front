<script setup>
import { onMounted } from 'vue';
import Carrossel from "./Carrossel.vue";
import { useEventStore } from '@/stores/Marketing/Event/eventStore';

const eventStore = useEventStore();

onMounted(async () => {
    if (eventStore.events.length === 0) {
        eventStore.fetchEvents();
    }
});

</script>

<template>
    <Carrossel class="duration-300 transform hover:scale-[101%] filter drop-shadow-xl" :eventos="eventStore.eventosRecentes" />
</template>