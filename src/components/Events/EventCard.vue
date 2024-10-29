<!-- src/components/Events/EventCard.vue -->
<script setup>
import { defineProps, defineEmits } from 'vue';

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
</script>

<template>
    <div class="event-card" @click="showEventDetails">
        <h3>{{ event.title }}</h3>
        <p>{{ event.description }}</p>
        <p><strong>Data do Evento:</strong> {{ new Date(event.event_date).toLocaleDateString() }}</p>
        <div class="tags">
            <span v-for="tag in event.tags" :key="tag">{{ tag }}</span>
        </div>
        <div class="images">
            <img v-for="(image, index) in event.images" :key="index" :src="image" alt="Imagem do evento" />
        </div>
    </div>
</template>

<style scoped>
.event-card {
    border: 1px solid #ccc;
    padding: 1em;
    margin: 1em 0;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.event-card:hover {
    transform: scale(1.02);
}

.images img {
    max-width: 100%;
    height: auto;
}
</style>