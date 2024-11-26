<!-- <script setup>
import { ref, onMounted } from 'vue';
import Carrossel from "../components/Home/Events/Carrossel.vue";
import EventTextHome from "../components/Home/Events/EventTextHome.vue";
import { useEventStore } from '../stores/eventStore';

const eventStore = useEventStore();

onMounted(() => {
    if (eventStore.events.length === 0) {
        eventStore.fetchEvents(); // Garante que os eventos sejam carregados
    }
});
</script>

<template>
    <div class="bg-red-300 h-auto md:h-[calc(100%-4rem)] flex">

        <!-- Segunda coluna (events-notification + enterprise) 
        <div class="w-full md:w-9/12 h-full">

            <div class="events-preview bg-blue-200 h-1/2 p-4 px-8">
                <p class="text-2xl font-semibold py-1">Eventos Recentes</p>
                <div class="h-[calc(100%-2rem)]">
                    <Carrossel class="duration-300 transform hover:scale-[102%]"
                        :eventos="eventStore.eventosRecentes" />
                </div>
            </div>

            <div class="others bg-purple-200 h-1/2">
                others
            </div>
        </div>


        <!-- Segunda coluna (events-notification + enterprise) 
        <div class="w-full md:w-3/12 h-full">
            <div class="events-notification relative bg-green-200 h-4/6 p-4">

                <p class="text-2xl font-semibold py-1">Eventos Recentes</p>

                <div class="border-2 relative rounded-xl h-5/6 w-full m-auto border-gray-600 bg-gray-700 overflow-hidden">

                    <div class="title border-b-2 border-gray-600 p-5 text-3xl">
                        <RouterLink class="hover:text-gray-300" :to="{
                            path: '/events',
                            query: { section: 'proximos' }
                        }">
                            <i class="fa-solid fa-calendar-days px-1"></i>
                            Próximos eventos
                        </RouterLink>
                    </div>

                    <!-- Ajustar scroll 
                    <div class="events relative h-[calc(100%-85px)] overflow-y-auto">

                        <div v-for="event in eventStore.eventosEmAndamento" :key="event.id">
                            <EventTextHome :event="event" />
                        </div>

                        <div class="finished bg-gray-600 text-center text-lg p-1">Eventos Passados</div>

                        <div v-for="event in eventStore.eventosFinalizados" :key="event.id">
                            <EventTextHome :event="event" />
                        </div>

                    </div>
                </div>




            </div>

            <div class="enterprise bg-yellow-200 h-2/6">
                Empreendimentos
            </div>
        </div>

    </div>
</template> -->