<!-- src/views/Buildings.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import { useBuildingStore } from '../stores/buildingStore';
import BuildingCard from '../components/Buildings/BuildingCard.vue';
import BuildingModal from '../components/Buildings/BuildingModal.vue';
import AddBuildingModal from '../components/Buildings/AddBuildingModal.vue';

const buildingStore = useBuildingStore();

const selectedBuildings = ref(null);
const addBuilding = ref(false);


const openBuildingModal = (building) => {
    selectedBuildings.value = building;
};

const closeBuildingModal = () => {
    selectedBuildings.value = null;
    buildingStore.fetchBuildings(); // Atualiza empreendimentos após adicionar
};

const openAddBuildingModal = () => {
    addBuilding.value = true;
};

const closeAddBuildingModal = () => {
    addBuilding.value = false;
    buildingStore.fetchBuildings(); // Atualiza empreendimentos após adicionar
};

// Centraliza o fechamento e atualização após a exclusão
const handleBuildingDeleted = () => {
    closeBuildingModal(); // Fecha o modal de visualização
    buildingStore.fetchBuildings(); // Atualiza a lista de empreendimentos
};

// Inicializa os empreendimentos
onMounted(() => buildingStore.fetchBuildings());

</script>

<template>
    <div class="bg-gray-300 dark:bg-gray-800 px-4 md:px-8 text-gray-800 dark:text-gray-200 min-h-screen w-full relative overflow-hidden">

        <img class="absolute invert dark:invert-0 z-0 left-72 top-0 w-full opacity-25" src="/traçado.png">

        <i @click="openAddBuildingModal" class="far fa-calendar-plus absolute text-gray-400 hover:text-gray-500 cursor-pointer top-0 right-0 m-8 text-4xl"></i>
        <!-- Verificar se usuario é admin/mkt  -->

        <div class="container md:mx-auto my-5 relative z-10">

            <div class="search items-center -mb-3">
                <h1 class="text-2xl md:text-4xl text-center font-bold mb-2">Eventos</h1>
                <div class="nav bg-gray-400 rounded-full mx-auto p-2 filter w-2/5">
                    <!-- <input type="text" v-model="busca" @input="atualizarBusca"
                        class="busca bg-gray-200 w-full rounded-full px-5 py-3 text-gray-700 outline-none font-semibold placeholder-gray-600"
                        placeholder="Buscar eventos..." /> -->
                </div>
            </div>

            <div>
                <div v-if="buildingStore.buildings.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BuildingCard v-for="building in buildingStore.buildings" :key="building.id" :building="building"
                        @click="openBuildingModal(building)" />
                </div>
                <p v-else class="text-center text-gray-500">Nenhum empreendimento encontrado.</p>
            </div>
        </div>

        <BuildingModal v-if="selectedBuildings" :building="selectedBuildings" @close="closeBuildingModal"
            @building-deleted="handleBuildingDeleted" />

        <AddBuildingModal v-if="addBuilding" @close="closeAddBuildingModal"
            @openAddBuildingModal="openAddBuildingModal" />

        <div v-if="buildingStore.errorMessage">{{ buildingStore.errorMessage }}</div>

    </div>
</template>