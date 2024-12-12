<!-- src/views/Buildings.vue -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBuildingStore } from '../stores/buildingStore';
import BuildingCard from '../components/Buildings/BuildingCard.vue';
import BuildingModal from '../components/Buildings/BuildingModal.vue';
import AddBuildingModal from '../components/Buildings/AddBuildingModal.vue';

const route = useRoute();
const router = useRouter();
const dataAtual = new Date();
const search = ref('');
const selectedBuilding = ref(null);
const addBuilding = ref(false);
const buildingStore = useBuildingStore();

const openBuildingModal = (building) => {
    selectedBuilding.value = building;
};

const closeBuildingModal = () => {
    selectedBuilding.value = null;
    buildingStore.fetchBuildings(); // Atualiza empreendimentos após adicionar
};

const openAddBuildingModal = () => {
    addBuilding.value = true;
};

const closeAddBuildingModal = () => {
    addBuilding.value = false;
    buildingStore.fetchBuildings(); // Atualiza empreendimentos após adicionar
};

// Atualiza a busca ao alterar a query
watch(
    () => route.query.search,
    (newQuery) => {
        search.value = newQuery || '';
    },
    { immediate: true }
);;

// Computed para acessar o estado da store
const buildingsFiltered = computed(() => {
    const filter = search.value.toLowerCase();
    return buildingStore.buildings.filter(building =>
        building.title.toLowerCase().includes(filter) ||
        building.description.toLowerCase().includes(filter)
    );
});

// Computed para filtrar empreendimentos por estágio
const buildingsPreLaunch = computed(() =>
    buildingsFiltered.value.filter(building => building.stage === 'Pré Lançamento')
);
const buildingsLaunch = computed(() =>
    buildingsFiltered.value.filter(building => building.stage === 'Lançamento')
);
const buildingsUnderConstruction = computed(() =>
    buildingsFiltered.value.filter(building => building.stage === 'Em Obras')
);
const buildingsFinished = computed(() =>
    buildingsFiltered.value.filter(building => building.stage === 'Finalizado')
);

// Computed para determinar qual seção mostrar
const currentSection = computed(() => route.query.section || 'geral');

// const buildingsInProgress = computed(() => buildingsFiltered.value.filter(building => new Date(building.building_date) >= dataAtual));
// const buildingsFinished = computed(() => buildingsFiltered.value
//     .filter(building => new Date(building.building_date) < dataAtual)
//     .sort((a, b) => new Date(b.building_date) - new Date(a.building_date))
// );

const updateQuery = () => {
    router.push({ query: { search: search.value, section: currentSection.value } });
};

// Inicializa os empreendimentos
onMounted(() => buildingStore.fetchBuildings());

</script>

<template>
    <div
        class="bg-gray-300 dark:bg-gray-800 ms-4 md:ms-16 px-4 md:px-8 text-gray-800 dark:text-gray-200 h-[calc(100%-4rem)] relative overflow-x-hidden overflowy--auto">

        <img class="absolute invert dark:invert-0 z-0 left-72 top-0 w-full opacity-25" src="/traçado.png">

        <i @click="openAddBuildingModal"
            class="far fa-calendar-plus absolute text-gray-400 hover:text-gray-500 cursor-pointer top-0 right-0 m-4 md:m-8 text-4xl"></i>
        <!-- Verificar se usuario é admin/mkt  -->

        <div class="container md:mx-auto my-5 relative z-10">

            <div class="busca items-center md:-mb-3">
                <h1 class="text-2xl md:text-4xl text-center font-bold mb-2">Empreendimentos</h1>
                <div class="nav bg-gray-400 rounded-full mx-auto p-1 md:p-2 filter w-full md:w-2/5">
                    <input type="text" v-model="search" @input="updateQuery"
                        class="busca bg-gray-200 w-full rounded-full px-3 py-1.5 md:px-5 md:py-3 text-gray-700 outline-none font-semibold placeholder-gray-600"
                        placeholder="Buscar eventos..." />
                </div>
            </div>


            <!-- Se houver busca ativa -->
            <div v-if="route.query.search">
                <!-- Se houver resultados da pesquisa, mostrar apenas os resultados filtrados -->
                <div v-if="buildingsFiltered.length > 0" class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Resultados da Pesquisa</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <BuildingCard v-for="building in buildingsFiltered" :key="building.id"
                            :building="{ ...building, building_date: (building.building_date) }"
                            @click="openBuildingModal(building)" />
                    </div>
                </div>

                <div v-else>
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem Resultados</p>
                </div>
            </div>

            <!-- Se não houver busca ativa, mostrar as seções normais -->
            <div v-else class="divide-y divide-gray-500">

                <div class="overflow-x-auto pb-5"
                    v-if="buildingsPreLaunch.length > 0 && (currentSection === 'geral' || currentSection === 'Pré Lançamentos')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1">Pré Lançamentos</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsPreLaunch" :key="building.id"
                            :building="{ ...building, building_date: (building.building_date) }"
                            @click="openBuildingModal(building)" /> 
                    </div>
                </div>

                <div v-if="buildingsPreLaunch >= 0 && (currentSection === 'Pré Lançamentos')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos em pré lançamentos</p>
                </div>

                <div class="overflow-x-auto pb-5"
                    v-if="buildingsLaunch.length > 0 && (currentSection === 'geral' || currentSection === 'Lançamentos')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1">Lançamentos</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsLaunch" :key="building.id"
                            :building="{ ...building, building_date: (building.building_date) }"
                            @click="openBuildingModal(building)" /> 
                    </div>
                </div>

                <div v-if="buildingsLaunch >= 0 && (currentSection === 'Lançamento')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos em lançamentos</p>
                </div>

                <div class="overflow-x-auto pb-5"
                    v-if="buildingsUnderConstruction.length > 0 && (currentSection === 'geral' || currentSection === 'Em Obras')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1">Em Obras</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsUnderConstruction" :key="building.id"
                            :building="{ ...building, building_date: (building.building_date) }"
                            @click="openBuildingModal(building)" /> 
                    </div>
                </div>

                <div v-if="buildingsUnderConstruction >= 0 && (currentSection === 'Em Obras')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos em obras</p>
                </div>

                <div class="overflow-x-auto pb-5"
                    v-if="buildingsFinished.length > 0 && (currentSection === 'geral' || currentSection === 'Finalizados')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1">Finalizados</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsFinished" :key="building.id"
                            :building="{ ...building, building_date: (building.building_date) }"
                            @click="openBuildingModal(building)" />
                    </div>
                </div>

                <div v-if="buildingsFinished >= 0 && (currentSection === 'Finalizados')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos finalizados</p>
                </div>

            </div>

        </div>

        <BuildingModal v-if="selectedBuilding" :building="selectedBuilding" @close="closeBuildingModal" />

        <AddBuildingModal v-if="addBuilding" @close="closeAddBuildingModal"
            @openAddBuildingModal="openAddBuildingModal" />

        <div v-if="buildingStore.errorMessage">{{ buildingStore.errorMessage }}</div>

    </div>
</template>