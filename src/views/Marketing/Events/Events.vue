<!-- src/views/Events.vue -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventStore } from '@/stores/Marketing/Event/eventStore';
import EventCard from '@/components/Events/EventCard.vue';
import EventModal from '@/components/Events/EventModal.vue';
import AddEventModal from '@/components/Events/AddEventModal.vue';
import Favorite from "@/components/config/Favorite.vue";

const route = useRoute();
const router = useRouter();
const currentDate = new Date();
const search = ref('');
const selectedEvent = ref(null);
const addEvent = ref(false);
const eventStore = useEventStore();

const searchDebounce = ref(null);

const openEventModal = (event) => {
    selectedEvent.value = event;
};

const closeEventModal = () => {
    selectedEvent.value = null;
    eventStore.fetchEvents();
};

const openAddEventModal = () => {
    addEvent.value = true;
};

const closeAddEventModal = () => {
    addEvent.value = false;
    eventStore.fetchEvents();
};

// Debounced search para melhor performance
const debouncedSearch = (value) => {
    clearTimeout(searchDebounce.value);
    searchDebounce.value = setTimeout(() => {
        router.push({ query: { search: value || undefined, section: currentSection.value } });
    }, 300);
};

// Watch para busca com debounce
watch(search, (newValue) => {
    debouncedSearch(newValue);
});

// Atualiza a busca ao alterar a query
watch(
    () => [route.query.search, route.query.busca],
    ([qSearch, qBusca]) => {
        search.value = qSearch ?? qBusca ?? '';
    },
    { immediate: true }
);

// Computed para filtros otimizados
const eventsFiltereds = computed(() => {
    if (!search.value) return eventStore.events;

    const filter = search.value.toLowerCase().trim();
    return eventStore.events.filter(event =>
        event.title?.toLowerCase().includes(filter) ||
        event.description?.toLowerCase().includes(filter) ||
        event.tags?.some(tag => tag.toLowerCase().includes(filter))
    );
});

const currentSection = computed(() => route.query.section || 'Geral');

const eventsInProgress = computed(() =>
    eventsFiltereds.value
        .filter(event => new Date(event.event_date) >= currentDate)
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
);

const eventsFinished = computed(() =>
    eventsFiltereds.value
        .filter(event => new Date(event.event_date) < currentDate)
        .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
);

const hasSearchResults = computed(() => route.query.search && eventsFiltereds.value.length > 0);
const hasNoResults = computed(() => route.query.search && eventsFiltereds.value.length === 0);

// Navegação por seções
const sections = [
    { key: 'Geral', label: 'Geral', icon: 'fas fa-th-large' },
    { key: 'Próximos', label: 'Próximos', icon: 'fas fa-calendar-alt' },
    { key: 'Finalizados', label: 'Finalizados', icon: 'fas fa-history' }
];

const changeSection = (section) => {
    router.push({ query: { section, search: search.value || undefined } });
};

// Inicialização
onMounted(async () => {
    await eventStore.fetchEvents();
});
</script>

<template>
    <div
        class="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
        <!-- Background Decoration -->
        <div class="absolute top-0 px-40 w-full opacity-5 dark:opacity-10">
            <svg class="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        </div>

        <!-- Floating Action Button -->
        <div class="fixed bottom-8 right-8 z-30">
            <button @click="openAddEventModal"
                class="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full w-14 h-14 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
                title="Adicionar Evento">
                <i class="fas fa-plus text-xl group-hover:rotate-90 transition-transform duration-300"></i>
            </button>
        </div>

        <div class="container mx-auto px-4 py-8 relative z-10">
            <!-- Header Section -->
            <div class="text-center mb-12">
                <!-- <div class="flex items-center justify-center mb-6">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl shadow-xl">
                        <i class="fas fa-calendar-alt text-4xl text-white"></i>
                    </div>
                </div>
                 -->
                <h1 class="text-5xl md:text-6xl font-bold mb-2">
                    Eventos
                    <Favorite :router="'/marketing/events'" :section="currentSection" />
                </h1>

                <p class="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Descubra e participe dos melhores eventos da sua região
                </p>
            </div>

            <!-- Search and Navigation -->
            <div class="max-w-4xl mx-auto mb-12">
                <!-- Search Bar -->
                <div class="relative mb-8">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i class="fas fa-search text-gray-400"></i>
                    </div>
                    <input type="text" v-model="search" placeholder="Buscar eventos, tags, descrições..."
                        class="w-full pl-12 pr-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-lg" />
                    <div v-if="search" class="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <button @click="search = ''" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Section Navigation -->
                <div v-if="!route.query.search" class="flex flex-wrap justify-center gap-4">
                    <button v-for="section in sections" :key="section.key" @click="changeSection(section.key)" :class="[
                        'flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105',
                        currentSection === section.key
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700'
                    ]">
                        <i :class="section.icon"></i>
                        {{ section.label }}
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div>
                <!-- Search Results -->
                <div v-if="hasSearchResults" class="mb-16">
                    <div class="text-center mb-8">
                        <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Resultados da Pesquisa</h2>
                        <p class="text-gray-600 dark:text-gray-400">{{ eventsFiltereds.length }} evento(s) encontrado(s)
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        <EventCard v-for="event in eventsFiltereds" :key="event.id" :event="event"
                            @click="openEventModal(event)"
                            class="transform hover:scale-105 transition-all duration-300" />
                    </div>
                </div>

                <!-- No Results -->
                <div v-else-if="hasNoResults" class="text-center py-20">
                    <div class="mb-8">
                        <i class="fas fa-search text-6xl text-gray-300 dark:text-gray-600 mb-6"></i>
                        <h3 class="text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-4">Nenhum resultado
                            encontrado</h3>
                        <p class="text-gray-500 dark:text-gray-500">Tente usar palavras-chave diferentes ou verifique a
                            ortografia</p>
                    </div>
                </div>

                <!-- Section-based Content -->
                <div v-else class="space-y-16">
                    <!-- Upcoming Events -->
                    <section
                        v-if="eventsInProgress.length > 0 && (currentSection === 'Geral' || currentSection === 'Próximos')">
                        <div class="flex items-center gap-4 mb-8">
                            <i class="fas fa-calendar-alt text-4xl text-white"></i>
                            <div>
                                <h2 class="text-3xl font-bold text-gray-800 dark:text-white">Próximos Eventos</h2>
                                <p class="text-gray-600 dark:text-gray-400">{{ eventsInProgress.length }} evento(s)
                                    programado(s)</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            <EventCard v-for="event in eventsInProgress" :key="event.id" :event="event"
                                @click="openEventModal(event)"
                                class="transform hover:scale-105 transition-all duration-300" />
                        </div>
                    </section>

                    <!-- No Upcoming Events Message -->
                    <div v-else-if="currentSection === 'Próximos'" class="text-center py-20">
                        <i class="fas fa-calendar-times text-6xl text-gray-300 dark:text-gray-600 mb-6"></i>
                        <h3 class="text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-4">Nenhum evento próximo
                        </h3>
                        <p class="text-gray-500 dark:text-gray-500">Novos eventos serão exibidos aqui quando disponíveis
                        </p>
                    </div>

                    <!-- Finished Events -->
                    <section
                        v-if="eventsFinished.length > 0 && (currentSection === 'Geral' || currentSection === 'Finalizados')">
                        <div class="flex items-center gap-4 mb-8">
                            <i class="fas fa-history text-4xl text-white"></i>
                            <div>
                                <h2 class="text-3xl font-bold text-gray-800 dark:text-white">Eventos Finalizados</h2>
                                <p class="text-gray-600 dark:text-gray-400">{{ eventsFinished.length }} evento(s)
                                    realizado(s)</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            <EventCard v-for="event in eventsFinished" :key="event.id" :event="event"
                                @click="openEventModal(event)"
                                class="transform hover:scale-105 transition-all duration-300 opacity-75 hover:opacity-100" />
                        </div>
                    </section>
                </div>
            </div>
        </div>

        <!-- Modals -->
        <EventModal v-if="selectedEvent" :event="selectedEvent" @close="closeEventModal" />
        <AddEventModal v-if="addEvent" @close="closeAddEventModal" />

        <!-- Error Message -->
        <div v-if="eventStore.errorMessage"
            class="fixed bottom-4 left-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {{ eventStore.errorMessage }}
        </div>
    </div>
</template>