<script setup>
import { onMounted } from 'vue';
import Carrossel from "./Carrossel.vue";
import { useBuildingStore } from '../../../stores/buildingStore';

const buildingStore = useBuildingStore();

onMounted(() => {
    if (buildingStore.buildings.length === 0) {
        buildingStore.fetchBuildings(); 
    }
});

</script>

<template>
    <div class="events-preview flex flex-col p-4 md:py-0">
        <Carrossel class="duration-300 transform hover:scale-[102%] my-auto" :buildings="buildingStore.buildings" />
    </div>
</template>