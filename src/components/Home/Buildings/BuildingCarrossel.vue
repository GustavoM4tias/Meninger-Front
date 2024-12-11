<script setup>
import { onMounted, computed } from 'vue';
import Carrossel from "./Carrossel.vue";
import { useBuildingStore } from '../../../stores/buildingStore';

const buildingStore = useBuildingStore();

onMounted(() => {
    if (buildingStore.buildings.length === 0) {
        buildingStore.fetchBuildings(); 
    }
});

// Filtrar e limitar os buildings
const filteredBuildings = computed(() => {
    return buildingStore.buildings
        .filter(building => ['Pré Lançamento', 'Lançamento'].includes(building.stage))
        .slice(0, 4); // Limita a 3 itens
});
</script>

<template>
    <div class="events-preview flex flex-col p-4 md:py-0">
        <Carrossel class="duration-300 transform hover:scale-[102%] my-auto" :buildings="filteredBuildings" />
    </div>
</template>