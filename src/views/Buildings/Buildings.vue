<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBuildingStore } from '@/stores/Building/buildingStore';
import BuildingCard from '@/components/Buildings/BuildingCard.vue';
import BuildingModal from '@/components/Buildings/BuildingModal.vue';
import Favorite from "@/components/config/Favorite.vue";

const route = useRoute();
const router = useRouter();
const search = ref('');
const selectedBuilding = ref(null);
const buildingStore = useBuildingStore();

// ... (seu código igual até enableDragScroll)

const enableDragScroll = (el) => {
  // evita ligar duas vezes
  if (el.__dragBound) return;
  el.__dragBound = true;

  let isDown = false;
  let startX;
  let scrollLeft;

  const onMouseDown = (e) => {
    isDown = true;
    el.classList.add("active");
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  };
  const onMouseLeave = () => { isDown = false; el.classList.remove("active"); };
  const onMouseUp = () => { isDown = false; el.classList.remove("active"); };
  const onMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX);
    el.scrollLeft = scrollLeft - walk;
  };

  el.addEventListener("mousedown", onMouseDown);
  el.addEventListener("mouseleave", onMouseLeave);
  el.addEventListener("mouseup", onMouseUp);
  el.addEventListener("mousemove", onMouseMove);
};

const bindDragScroll = () => {
  document.querySelectorAll(".scroll-drag").forEach((el) => enableDragScroll(el));
};

// Inicializa os empreendimentos
onMounted(async () => {
  await buildingStore.fetchBuildings();
  await nextTick();        // garante que as seções v-if já renderizaram
  bindDragScroll();
});

// --- seus computeds (iguais) ---
const buildingsFiltered = computed(() => {
  const filter = search.value.toLowerCase();
  return buildingStore.buildings
    .filter(b => b.nome.toLowerCase().includes(filter))
    .reverse();
});

const buildingsPreLaunch = computed(() => buildingsFiltered.value.filter(b =>
  b.situacao_comercial.length > 0 && b.situacao_comercial[0].nome === 'Pré-Lançamento'
));
const buildingsLaunch = computed(() => buildingsFiltered.value.filter(b =>
  b.situacao_comercial.length > 0 && b.situacao_comercial[0].nome === 'Lançamento'
));
const buildingsUnderConstruction = computed(() => buildingsFiltered.value.filter(b =>
  b.situacao_comercial.length > 0 && b.situacao_comercial[0].nome === 'Em construção'
));
const buildingsFinished = computed(() => buildingsFiltered.value.filter(b =>
  b.situacao_comercial.length > 0 && b.situacao_comercial[0].nome === 'Finalizado'
));
const buildingsPortal = computed(() => buildingsFiltered.value.filter(b =>
  b.situacao_comercial.length > 0 && b.situacao_comercial[0].nome === 'Portal do Cliente'
));

// quando QUALQUER seção mudar, re-liga (caso tenha aparecido/ sumido uma .scroll-drag)
watch(
  [buildingsPreLaunch, buildingsLaunch, buildingsUnderConstruction, buildingsFinished, buildingsPortal],
  async () => {
    await nextTick();
    bindDragScroll();
  }
);

// Atualiza a busca ao alterar a query (igual ao seu)
watch(() => route.query.search, (newQuery) => {
  search.value = newQuery || '';
}, { immediate: true });

const currentSection = computed(() => route.query.section || 'Geral');
const updateQuery = () => router.push({ query: { search: search.value, section: currentSection.value } });

const openBuildingModal = async (building) => {
  await buildingStore.fetchBuildingById(building.idempreendimento);
  selectedBuilding.value = buildingStore.selectedBuilding;
};
const closeBuildingModal = () => {
  selectedBuilding.value = null;
  buildingStore.fetchBuildings();
};
</script>

<template>
    <div class="h-full relative overflow-y-auto overflow-x-hidden">
        <img class="absolute invert dark:invert-0 z-0 left-72 top-0 w-full opacity-25" src="/traçado.png">

        <div class="container md:mx-auto mb-16 relative z-10">

            <div class="container mx-auto px-4 py-8 relative z-10">
                <!-- Título + estrela -->
                <div class="text-center">
                    <h1 class="text-4xl md:text-5xl font-bold mb-4">
                        Empreendimentos
                        <Favorite :router="'/buildings'" :section="currentSection" />
                    </h1>

                    <!-- Busca pill -->
                    <div class="relative max-w-3xl mx-auto">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i class="fas fa-search text-gray-400"></i>
                        </div>
                        <input v-model="search" @input="updateQuery" type="text" placeholder="Buscar empreendimentos..."
                            class="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-lg" />
                        <div v-if="search" class="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <button @click="search = ''; updateQuery();" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Se houver busca ativa -->
            <div v-if="route.query.search">
                <!-- Se houver resultados da pesquisa, mostrar apenas os resultados filtrados -->
                <div v-if="buildingsFiltered.length > 0" class="mb-10">
                    <h2 class="text-2xl font-semibold m-3">Resultados da Pesquisa</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <BuildingCard v-for="building in buildingsFiltered" :key="building.idempreendimento"
                            :building="building" @click="openBuildingModal(building)" />
                    </div>
                </div>
                <div v-else class="text-center py-24">
                    <i class="fas fa-search text-6xl text-gray-300 dark:text-gray-600 mb-6"></i>
                    <p class="text-xl text-gray-500">Sem resultados</p>
                </div>

            </div>

            <!-- Se não houver busca ativa, mostrar as seções normais -->
            <div v-else class="divide-y divide-gray-500">
                <div class="overflow-x-auto pb-5 scroll-drag"
                    v-if="buildingsPreLaunch.length > 0 && (currentSection === 'Geral' || currentSection === 'Pré Lançamentos')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1"><i class="fas fa-map-marked-alt"></i> Pré Lançamentos
                    </h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsPreLaunch" :key="building.idempreendimento"
                            :building="building" @click="openBuildingModal(building)" />
                    </div>
                </div>

                <div v-if="buildingsPreLaunch.length === 0 && (currentSection === 'Pré Lançamentos')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos em pré lançamentos</p>
                </div>

                <div class="overflow-x-auto pb-5 scroll-drag"
                    v-if="buildingsLaunch.length > 0 && (currentSection === 'Geral' || currentSection === 'Lançamentos')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1"><i class="fas fa-building"></i> Lançamentos</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsLaunch" :key="building.idempreendimento"
                            :building="building" @click="openBuildingModal(building)" />
                    </div>
                </div>

                <div v-if="buildingsLaunch.length === 0 && (currentSection === 'Lançamentos')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos em lançamentos</p>
                </div>

                <div class="overflow-x-auto pb-5 scroll-drag"
                    v-if="buildingsUnderConstruction.length > 0 && (currentSection === 'Geral' || currentSection === 'Em Obras')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1"><i class="fas fa-hard-hat"></i> Em Obras</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsUnderConstruction" :key="building.idempreendimento"
                            :building="building" @click="openBuildingModal(building)" />
                    </div>
                </div>

                <div v-if="buildingsUnderConstruction.length === 0 && (currentSection === 'Em Obras')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos em obras</p>
                </div>

                <div class="overflow-x-auto pb-5 scroll-drag"
                    v-if="buildingsFinished.length > 0 && (currentSection === 'Geral' || currentSection === 'Finalizados')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1"><i class="fas fa-key"></i> Finalizados</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsFinished" :key="building.idempreendimento"
                            :building="building" @click="openBuildingModal(building)" />
                    </div>
                </div>

                <div v-if="buildingsFinished.length === 0 && (currentSection === 'Finalizados')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos finalizados</p>
                </div>

                <div class="overflow-x-auto pb-5 scroll-drag"
                    v-if="buildingsPortal.length > 0 && (currentSection === 'Geral' || currentSection === 'Portal do Cliente')">
                    <h2 class="text-2xl font-semibold mt-2 mb-1"><i class="fas fa-door-open"></i> Portal do Cliente</h2>
                    <div class="grid grid-flow-col auto-cols-[100%] md:auto-cols-[32.6%] gap-4 mx-3">
                        <BuildingCard v-for="building in buildingsPortal" :key="building.idempreendimento"
                            :building="building" @click="openBuildingModal(building)" />
                    </div>
                </div>

                <div v-if="buildingsPortal.length === 0 && (currentSection === 'Finalizados')">
                    <p class="text-gray-500 text-5xl text-center mt-64">Sem empreendimentos para Portal do Cliente</p>
                </div>
            </div>
        </div>

        <BuildingModal v-if="selectedBuilding" :building="selectedBuilding" @close="closeBuildingModal" />
    </div>
</template>

<style scoped>
.scroll-drag::-webkit-scrollbar {
    display: none;
    /* Chrome, Safari */
}

.scroll-drag {
    user-select: none;
    /* impede seleção de texto */
    -webkit-user-select: none;
    /* Safari */
    -ms-user-select: none;
    /* IE */
}

.scroll-drag:active {
    cursor: grabbing;
}
</style>
