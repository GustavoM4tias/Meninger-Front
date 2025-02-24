<!-- <script setup>
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
        .slice(0, 3); // Limita a 3 itens
});
</script>

<template>
    <div class="events-preview flex flex-col p-4">
        <Carrossel v-if="buildingStore.buildings.length > 0" class="duration-300 transform hover:scale-[102%] my-auto"
            :buildings="filteredBuildings" />
        <div v-else class="relative rounded-xl flex overflow-hidden h-[30vh] max-h-[100%] bg-gray-700 text-xl text-gray-500">
            <p class="m-auto">Nenhum empreendimento encontrado.</p>
        </div>
    </div>
</template> -->

<script setup>
import { onMounted, computed } from 'vue';
import Carrossel from "./Carrossel.vue";
import { useBuildingStore } from '../../../stores/Building/buildingStore';

const buildingStore = useBuildingStore();

onMounted(() => {
    if (buildingStore.buildings.length === 0) {
        buildingStore.fetchBuildings();
    }
});

// Filtrar e limitar os buildings para "Pré-Lançamento" e "Lançamento"
const filteredBuildings = computed(() => {
    return buildingStore.buildings
        .filter(building =>
            building.situacao_comercial.length > 0 &&
            ['Pré-Lançamento'].includes(building.situacao_comercial[0].nome) // , 'Lançamento'
        ) 
        .slice(0, 3);
});

</script>

<template>
    <div class="events-preview flex flex-col p-4">
        <Carrossel v-if="filteredBuildings.length > 0"
            class="duration-300 transform hover:scale-[102%] my-auto"
            :buildings="filteredBuildings" />
        <div v-else class="relative rounded-xl flex overflow-hidden h-[30vh] max-h-[100%] bg-gray-700 text-xl text-gray-500">
            <p class="m-auto">Nenhum empreendimento encontrado.</p>
        </div>
    </div>
</template>
