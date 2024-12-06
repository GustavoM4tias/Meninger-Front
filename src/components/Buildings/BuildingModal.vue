<script setup>
import { ref, computed, onMounted } from 'vue';
import { deleteBuilding } from '../../utils/apiBuilding';  // Atualizado para apiBuilding
import { useBuildingStore } from '../../stores/buildingStore';
import EditBuildingModal from './EditBuildingModal.vue';
import WeatherInfo from './UI/WeatherInfo.vue'

// Store
const buildingStore = useBuildingStore();

const props = defineProps({
    building: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['close']);

const closeModal = () => { emit('close'); };

const isEditModalOpen = ref(false);

const openEditModal = () => {
    isEditModalOpen.value = true;
};

const excluirBuilding = async () => {
    const confirmar = confirm('Você tem certeza que deseja excluir este empreendimento?');
    if (confirmar === true) {
        try {
            await deleteBuilding(props.building.id); // Chama a API de exclusão com o ID do empreendimento
            closeModal(); // Fecha o modal
        } catch (error) {
            console.error("Erro ao excluir empreendimento:", error);
        }
    }
};

// Funções de navegação de imagens
const imagemAtual = ref(0);

const imagemTotal = computed(() => {
    return props.building && props.building.images ? props.building.images.length - 1 : -1;
});

const proximo = () => {
    if (imagemAtual.value >= imagemTotal.value) {
        imagemAtual.value = 0;
    } else {
        imagemAtual.value += 1;
    }
};

const anterior = () => {
    if (imagemAtual.value === 0) {
        imagemAtual.value = imagemTotal.value;
    } else {
        imagemAtual.value -= 1;
    }
};

const fetchWeather = async () => {
    if (props.building.address?.city) {
        try {
            await buildingStore.getWeather(props.building.address.city);
        } catch (error) {
            console.error('Erro ao buscar o clima:', error);
        }
    } else {
        console.warn('Cidade não encontrada no empreendimento.');
        buildingStore.weather = null; // Define como nulo se não houver cidade
    }
};

onMounted(() => {
    fetchWeather();
});
</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal">
        <div class="bg-gray-700 sm:w-8/12 w-11/12 rounded-lg mx-auto relative">
            <div class="content h-full grid grid-cols-1 lg:grid-cols-3">
                <div
                    class="img col-span-1 sm:col-span-2 relative rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none h-100 w-full h-full">
                    <img :src="building.images[imagemAtual] || '/noimg.jpg'"
                        class="w-full h-full object-cover rounded-tl-lg rounded-tr-lg lg:rounded-s-lg lg:rounded-tr-none" />

                    <div class="absolute filter drop-shadow top-0 left-0 m-5">
                        <h2 class="text-2xl md:text-3xl font-bold text-gray-50 mb-2 mr-5 drop-shadow-xl">{{
                            building.title }}</h2>
                        <ul class="flex flex-wrap">
                            <li class="hover:bg-gray-100 hover:text-gray-800 text-gray-200 font-semibold border-2 hover:border-gray-50 border-gray-300 cursor-pointer duration-300 shadow px-2 py- m-1 rounded-lg"
                                v-for="tag in building.tags" :key="tag">{{ tag }}</li>
                        </ul>
                    </div>

                    <div
                        class="flag absolute hidden lg:block bg-emerald-600 top-4 right-0 z-50 ps-12 pe-4 py-2 text-2xl shadow-lg">
                        Pré Lançamento
                    </div> <!-- Local Para Flag de Estagio empreendimento -->


                    <div class="nav" v-if="building.images.length > 0">
                        <div class="absolute top-1/2 left-4 transform -translate-y-1/2">
                            <i class="fas fa-chevron-left cursor-pointer text-2xl text-gray-100 hover:text-gray-200 duration-200"
                                @click="anterior"></i>
                        </div>
                        <div class="absolute top-1/2 right-4 transform -translate-y-1/2">
                            <i class="fas fa-chevron-right cursor-pointer text-2xl text-gray-100 hover:text-gray-200 duration-200"
                                @click="proximo"></i>
                        </div>
                    </div>

                    <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        <span v-for="(img, index) in building.images" :key="index" class="h-2 w-2 rounded-full"
                            :class="{ 'bg-gray-50': imagemAtual === index, 'bg-gray-300': imagemAtual !== index }"></span>
                    </div>


                    <WeatherInfo class="absolute bottom-4 right-0 transform -translate-x-1/2 z-50"
                        :weather="buildingStore.weather" :city="building.address.city" />

                </div>

                <div class="text flex flex-col">
                    <div class="text relative text-gray-100 flex flex-col py-4 px-4 md:px-6">
                        <div x-data="{ isActive: false }" class="relative dropdown">
                            <div class="inline-flex items-center overflow-hidden">
                                <i x-on:click="isActive = !isActive"
                                    class="fas fa-ellipsis-vertical text-2xl m-1.5 cursor-pointer text-gray-100 hover:text-gray-300 duration-200"></i>
                            </div>

                            <div class="absolute left-0 z-10 w-auto rounded-md border border-gray-700 bg-gray-500 shadow-lg"
                                role="menu" x-cloak x-transition x-show="isActive" x-on:click.away="isActive = false"
                                x-on:keydown.escape.window="isActive = false">
                                <div class="p-2">
                                    <a class="block rounded-md px-4 py-2 cursor-pointer text-sm text-gray-200 hover:bg-gray-300 hover:text-gray-700"
                                        role="menuitem" @click="openEditModal">
                                        <i class="fas text-xl fa-pencil mr-1"></i>
                                        Editar Empreendimento
                                    </a>
                                    <button @click="excluirBuilding"
                                        class="flex w-full items-center gap-2 mt-1 rounded-md px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                        role="menuitem">
                                        <i class="far text-red-700 text-xl fa-trash-can mr-1"></i>
                                        Excluir Empreendimento
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div
                            class="flag absolute block lg:hidden bg-emerald-600 top-4 right-0 z-50 ps-8 lg:ps-12 pe-4 py-1 lg:py-2 text-lg lg:text-2xl shadow-lg">
                            Pré Lançamento
                        </div> <!-- Local Para Flag de Estagio empreendimento -->

                        <span class="font-normal">{{ new Date(building.building_date).toLocaleDateString() }}</span>
                        <div class="descricao text-gray-300 mb-6">
                            <p class="pl-2">Descrição:</p>
                            <p class="text-md border rounded-xl  md:rounded-2xl p-2 md:p-3">{{ building?.description }}
                            </p>
                        </div>

                        <!-- 
                        <strong>Clima:</strong>
                        <span v-if="buildingStore.weather">
                            {{ buildingStore.weather.temperature }}°C
                        </span>
                        <span v-else>Carregando...</span> -->

                        <p>{{ building.address?.street }}</p>
                        <p>{{ building.address?.number }}</p>
                        <p>{{ building.address?.neighborhood }}</p>
                        <p>{{ building.address?.city }}</p>
                        <p>{{ building.address?.state }}</p>
                        <p>{{ building.address?.zip_code }}</p>

                        <p class="truncate">Criador: {{ building?.created_by }}</p>
                    </div>

                    <i class="fas fa-xmark absolute text-2xl top-0 right-0 m-5 cursor-pointer text-gray-200 hover:text-gray-300 duration-200"
                        @click="closeModal"></i>
                </div>
            </div>
        </div>
        <EditBuildingModal v-if="isEditModalOpen" :building="building" @close="isEditModalOpen = false" />
    </div>
</template>

<style scoped>
.flag {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 100% 100%, 12% 100%);
}
</style>