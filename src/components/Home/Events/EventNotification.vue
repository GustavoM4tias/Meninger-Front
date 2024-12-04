<script setup>
import { onMounted } from 'vue';
import EventTextHome from "../Events/EventTextHome.vue";
import { useEventStore } from '../../../stores/eventStore';

const eventStore = useEventStore();

onMounted(() => {
    if (eventStore.events.length === 0) {
        eventStore.fetchEvents();  
    }
});
</script>

<template>
    <div class="events-notification relative">
        <p class="text-2xl font-semibold py-1">Listagem</p>
        <div class="border-2 relative rounded-xl h-[calc(100%-2rem)] w-full m-auto border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700 overflow-hidden">
            <div class="title border-b-2 border-gray-300 dark:border-gray-600 p-5 text-2xl">
                <RouterLink class="hover:text-gray-700 dark:hover:text-gray-300" :to="{
                    path: '/events',
                    query: { section: 'proximos' }
                }">
                    <i class="fa-solid fa-calendar-days px-1"></i>
                    Próximos eventos
                </RouterLink>
            </div>
            <!-- Ajustar scroll  -->
            <div class="events relative h-[calc(100%-85px)] overflow-y-auto">
                <div v-for="event in eventStore.eventosEmAndamento" :key="event.id">
                    <EventTextHome :event="event" />
                </div>
                <div class="finished bg-gray-100 dark:bg-gray-600 text-center text-lg font-medium p-1 border-b-2 border-gray-300 dark:border-gray-600">Eventos Realizados</div>
                <div v-for="event in eventStore.eventosFinalizados" :key="event.id">
                    <EventTextHome :event="event" />
                </div>
            </div>
        </div>
    </div>
</template>
