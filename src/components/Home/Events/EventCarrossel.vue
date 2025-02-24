<script setup>
import { onMounted } from 'vue';
import Carrossel from "./Carrossel.vue";
import { useEventStore } from '../../../stores/Event/eventStore';
import { useAuthStore } from '../../../stores/Auth/authStore'; // Importando o authStore

const eventStore = useEventStore();
const authStore = useAuthStore();

onMounted(async () => {
    if (eventStore.events.length === 0) {
        eventStore.fetchEvents(); 
    }
    if (!authStore.user) {
        await authStore.fetchUserInfo();
    }
});

</script>

<template>
    <div class="events-preview flex flex-col p-4">
        <p v-if="authStore.user" class="text-lg md:text-2xl font-semibold py-1 truncate">Olá, {{ authStore.user.username }}!</p>
        <Carrossel class="duration-300 transform hover:scale-[102%]" :eventos="eventStore.eventosRecentes" />
    </div>
</template>