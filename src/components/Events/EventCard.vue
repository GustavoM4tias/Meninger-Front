<!-- src/components/Events/EventCard.vue -->
<script setup>
import { computed } from 'vue';

const props = defineProps({
    event: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['click']);

const showEventDetails = () => {
    emit('click', props.event);
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    };
    return date.toLocaleDateString('pt-BR', options);
};

const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const isEventPast = computed(() => {
    return new Date(props.event.event_date) < new Date();
});

const eventStatus = computed(() => {
    // A data e hora do evento
    const eventDate = new Date(props.event.event_date);
    // A data e hora atual
    const now = new Date();
    // 1. Clonar 'now' e zerar a hora/minuto/segundo/milissegundo para o início do dia de hoje.
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // 2. Clonar 'eventDate' e zerar a hora/minuto/segundo/milissegundo para o início do dia do evento.
    const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    // 3. Calcular a diferença entre o início do dia do evento e o início do dia atual.
    const diffTime = eventDayStart - todayStart;
    // 4. Calcular a diferença em dias (o resultado será um número inteiro).
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: 'Finalizado', color: 'bg-blue-600' };
    if (diffDays === 0) return { text: 'Hoje', color: 'bg-red-500' };
    if (diffDays === 1) return { text: 'Amanhã', color: 'bg-orange-500' };
    if (diffDays <= 7) return { text: `${diffDays} dias`, color: 'bg-yellow-500' };
    return { text: `${diffDays} dias`, color: 'bg-blue-500' };
});

const imageUrl = computed(() => {
    return (props.event.images && props.event.images.length > 0)
        ? props.event.images[0]
        : '/noimg.jpg';
});
</script>

<template>
    <article
        class="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 flex flex-col h-full"
        :class="{ 'opacity-75': isEventPast }" @click="showEventDetails">
        <!-- Image Container -->
        <div class="relative h-48 overflow-hidden">
            <img :src="imageUrl" :alt="event.title"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />

            <!-- Overlay Gradient -->
            <div
                class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            </div>

            <!-- Status Badge -->
            <div class="absolute top-4 left-4">
                <span :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold text-white shadow-lg backdrop-blur-sm',
                    eventStatus.color
                ]">
                    {{ eventStatus.text }}
                </span>
            </div>

            <!-- Favorite/Bookmark Icon -->
            <!-- <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button class="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                    <i class="far fa-bookmark text-white text-sm"></i>
                </button>
            </div> -->
        </div>

        <!-- Content -->
        <div class="p-6 flex flex-col flex-grow">
            <!-- Header -->
            <div class="flex-grow">
                <div class="mb-4">
                    <div class="flex items-start justify-between mb-2">
                        <h3
                            class="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 line-clamp-2">
                            {{ event.title }}
                        </h3>
                    </div>

                    <!-- Date and Time -->
                    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <i class="far fa-calendar text-blue-500"></i>
                        <span class="font-medium">{{ formatDate(event.event_date) }}</span>
                        <span class="text-gray-300 dark:text-gray-600">•</span>
                        <i class="far fa-clock text-blue-500"></i>
                        <span>{{ formatTime(event.event_date) }}</span>
                    </div>
                </div>

                <!-- Tags -->
                <div v-if="event.tags && event.tags.length > 0" class="mb-4">
                    <div class="flex flex-wrap gap-2">
                        <span v-for="(tag, index) in event.tags.slice(0, 3)" :key="index"
                            class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800">
                            {{ tag }}
                        </span>
                        <span v-if="event.tags.length > 3"
                            class="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg">
                            +{{ event.tags.length - 3 }}
                        </span>
                    </div>
                </div>

                <!-- Description Preview -->
                <div v-if="event.description" class="mb-4">
                    <p class="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 leading-relaxed">
                        {{ event.description }}
                    </p>
                </div>

                <!-- Location -->
                <div v-if="event.address" class="mb-4">
                    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <i class="fas fa-map-marker-alt text-red-500"></i>
                        <span class="truncate">
                            {{ event.address.city }}, {{ event.address.state }}
                        </span>
                    </div>
                </div>
            </div>

            <div>
                <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <!-- Creator -->
                    <div class="flex items-center gap-2">
                        <img class="w-8 h-8 rounded-full" :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            (event.created_by ?? '')
                                .split(' ')
                                .slice(0, 2)
                                .map(n => n[0]?.toUpperCase())
                                .join(' ')
                        )}&background=random`" alt="usuario foto" />
                        <span class="text-sm text-gray-500 dark:text-gray-400 truncate max-w-24">
                            {{ event.created_by }}
                        </span>
                    </div>

                    <!-- CTA Button -->
                    <button
                        class="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                        Ver Detalhes
                    </button>
                </div>
            </div>
        </div>

        <!-- Hover Effect Overlay -->
        <div
            class="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl">
        </div>
    </article>
</template>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
