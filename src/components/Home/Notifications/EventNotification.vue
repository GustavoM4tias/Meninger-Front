<!-- <script setup>
import { onMounted } from 'vue';
import EventTextHome from "./EventTextHome.vue";
import BirthTextHome from "./BirthTextHome.vue";
import { useEventStore } from '../../../stores/eventStore';
import { useAuthStore } from '../../../stores/authStore';

const userStore = useAuthStore();
const eventStore = useEventStore();

onMounted(() => {
    if (eventStore.events.length === 0) {
        eventStore.fetchEvents();
    }
    if (userStore.users.length === 0) {
        userStore.getAllUsers();
    }
});
</script>

<template>
    <div class="events-notification">
        <div
            class="border-2 rounded-xl h-80 md:h-[calc(100%-2rem)] w-full m-auto md:mt-10 border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700 overflow-hidden">
            <div class="title border-b-2 border-gray-300 dark:border-gray-600 p-3 md:p-5 text-xl md:text-2xl">
                <RouterLink class="hover:text-gray-700 dark:hover:text-gray-300" :to="{
                    path: '/events',
                    query: { section: 'proximos' }
                }">
                    <i class="fa-solid fa-calendar-days px-1"></i>
                    Próximos eventos
                </RouterLink>
            </div>
 
            <div class="events relative h-[calc(100%-3.5rem)] md:h-[calc(100%-4.5rem)] overflow-y-auto">
                <div v-for="event in eventStore.eventosEmAndamento" :key="event.id">
                    <EventTextHome :event="event" />
                </div>
                <div v-for="user in userStore.aniversariosEmAndamento" :key="user.id">
                    <BirthTextHome :user="user" />
                </div>

                <div
                    class="finished bg-gray-100 dark:bg-gray-600 text-center text-md md:text-lg font-medium md:p-1 border-b-2 border-gray-300 dark:border-gray-600">
                    Eventos Realizados</div>
                <div v-for="event in eventStore.eventosFinalizados" :key="event.id">
                    <EventTextHome :event="event" />
                </div>

                <div v-for="user in userStore.aniversariosFinalizados" :key="user.id">
                    <BirthTextHome :user="user" />
                </div>

            </div>

        </div>
    </div>
</template> -->
<script setup>
import { onMounted, computed } from 'vue';
import EventTextHome from './EventTextHome.vue';
import BirthTextHome from './BirthTextHome.vue';
import { useEventStore } from '../../../stores/eventStore';
import { useAuthStore } from '../../../stores/authStore';

const userStore = useAuthStore();
const eventStore = useEventStore();

// Pega os eventos e aniversários em andamento, combinando e ordenando-os
const todosEventosEmAndamento = computed(() => {
    const eventos = [...eventStore.eventosEmAndamento, ...userStore.aniversariosEmAndamento];
    return eventos.sort((a, b) => new Date(a.event_date || a.birth_date) - new Date(b.event_date || b.birth_date));
});

// Pega os eventos e aniversários finalizados, combinando e ordenando-os
const todosEventosFinalizados = computed(() => {
    const eventosFinalizados = [...eventStore.eventosFinalizados, ...userStore.aniversariosFinalizados];
    return eventosFinalizados.sort((b, a) => new Date(a.event_date || a.birth_date) - new Date(b.event_date || b.birth_date));
});

onMounted(() => {
    if (eventStore.events.length === 0) {
        eventStore.fetchEvents();
    }
    if (userStore.users.length === 0) {
        userStore.getAllUsers();
    }
});
</script>

<template>
    <div class="events-notification">
        <div
            class="border-2 rounded-xl h-80 md:h-[calc(100%-2rem)] w-full m-auto md:mt-10 border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700 overflow-hidden">
            <div class="title border-b-2 border-gray-300 dark:border-gray-600 p-3 md:p-5 text-xl md:text-2xl">
                <RouterLink class="hover:text-gray-700 dark:hover:text-gray-300"
                    :to="{ path: '/events', query: { section: 'proximos' } }">
                    <i class="fa-solid fa-calendar-days px-1"></i>
                    Próximos eventos
                </RouterLink>
            </div>

            <!-- Ajustar scroll -->
            <div class="events relative h-[calc(100%-3.5rem)] md:h-[calc(100%-4.5rem)] overflow-y-auto">
                <!-- Eventos e Aniversários em andamento -->
                <div v-for="item in todosEventosEmAndamento" :key="item.id">
                    <template v-if="item.event_date">
                        <EventTextHome :event="item" />
                    </template>
                    <template v-else>
                        <BirthTextHome :user="item" />
                    </template>
                </div>

                <!-- Eventos Realizados -->
                <div
                    class="finished bg-gray-100 dark:bg-gray-600 text-center text-md md:text-lg font-medium md:p-1 border-b-2 border-gray-300 dark:border-gray-600">
                    Eventos Realizados
                </div>

                <!-- Eventos e Aniversários finalizados -->
                <div v-for="item in todosEventosFinalizados" :key="item.id">
                    <template v-if="item.event_date">
                        <EventTextHome :event="item" />
                    </template>
                    <template v-else>
                        <BirthTextHome :user="item" />
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>
