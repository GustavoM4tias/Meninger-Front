<!-- src/components/Events/EventModal.vue -->
<script setup>
import { ref } from 'vue';
import { defineProps, defineEmits } from 'vue';
import EditEventModal from './EditEventModal.vue';

const props = defineProps({
    event: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['close']);
const isEditModalOpen = ref(false);

const closeModal = () => {
    emit('close');
};

const openEditModal = () => {
    isEditModalOpen.value = true;
};
</script>

<template>
    <div class="modal-backdrop" @click.self="closeModal">
        <div class="modal-content">
            <h2>{{ event.title }}</h2>
            <p>{{ event.description }}</p>
            <p><strong>Data do Evento:</strong> {{ new Date(event.event_date).toLocaleDateString() }}</p>

            <div class="tags">
                <span v-for="tag in event.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>

            <div class="images">
                <img v-for="(image, index) in event.images" :key="index" :src="image" alt="Imagem do evento" />
            </div>

            <!-- Botões para fechar e editar o evento -->
            <button @click="closeModal">Fechar</button>
            <button @click="openEditModal">Editar Evento</button>

            <!-- Modal de Edição do Evento -->
            <EditEventModal v-if="isEditModalOpen" :event="event" @close="isEditModalOpen = false" />
        </div>
    </div>
</template>

<style scoped>
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background-color: #fff;
    padding: 2em;
    border-radius: 8px;
    max-width: 500px;
    width: 100%;
    text-align: center;
}

.images img {
    max-width: 100%;
    height: auto;
    margin-top: 1em;
}

.tags .tag {
    display: inline-block;
    background-color: #ddd;
    padding: 0.3em;
    margin: 0.2em;
    border-radius: 4px;
}

button {
    margin-top: 1em;
    padding: 0.5em 1em;
}
</style>
