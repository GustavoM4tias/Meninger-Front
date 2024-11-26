<script setup>
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
  <div class="content grid grid-cols-12" style="height: 100vh;">
    <div class="content-1 col-span-full lg:col-span-8 h-full">
      <div class="news px-5 h-2/5 py-3">
        <p class="text-2xl font-semibold my-1">Eventos Recentes</p>
        <div class="h-full">
          <Carrossel class="duration-300 transform hover:scale-[102%] h-full" :eventos="eventStore.eventosRecentes" />
        </div>
        <div class="grid grid-cols-12 h-full">
          <div class="col-span-12 lg:col-span-8 h-full">
            <EventCardHome v-for="event in events" :key="event.id" :event="event" />
          </div>
        </div>

      </div>
      <div class="news h-3/5 bg-blue-200">
        news
      </div>
    </div>

    <div class="content-2 col-span-4 hidden lg:block h-full">
      <div class="enterprise flex h-4/6 py-8 px-12">

        <div class="border-2 rounded-xl h-[470px] w-full m-auto border-gray-600 bg-gray-700 overflow-hidden">

          <div class="title border-b-2 border-gray-600 p-5 text-3xl">
            <RouterLink class="hover:text-gray-300" :to="{
              path: '/events',
              query: { section: 'proximos' }
            }">
              <i class="fa-solid fa-calendar-days px-1"></i>
              Próximos eventos
            </RouterLink>
          </div>

          <!-- Ajustar scroll  -->
          <div class="events h-[calc(100%-85px)] overflow-y-auto">

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

      <div class="enterprise h-2/6 bg-red-200">

      </div>

    </div>
  </div>
</template>
