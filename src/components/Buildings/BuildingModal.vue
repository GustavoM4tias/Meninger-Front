<script setup>
import { onMounted } from 'vue';
import { useBuildingStore } from '../../stores/Building/buildingStore';
import WeatherInfo from './UI/WeatherInfo.vue'
import Flag from './UI/Flag.vue';

// Store
const buildingStore = useBuildingStore();

const props = defineProps({
    building: {
        type: Object,
        required: true,
    },
});

console.log(props.building)

const emit = defineEmits(['close']);

const closeModal = () => { emit('close'); };

const fetchWeather = async () => {
    if (props.building?.latitude && props.building?.longitude) {
        try {
            await buildingStore.getWeather(props.building.latitude, props.building.longitude);
        } catch (error) {
            console.error('Erro ao buscar o clima:', error);
        }
    } else {
        console.log('Latitude e longitude não encontradas no empreendimento.');
        buildingStore.weather = null; // Define como nulo se não houver coordenadas
    }
};

onMounted(() => {
    fetchWeather();
});
</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal">
        <div class="bg-gray-100 dark:bg-gray-700 sm:w-8/12 w-11/12 rounded-lg mx-auto relative">
            <div class="content h-full grid grid-cols-1 lg:grid-cols-5">
                <div
                    class="img col-span-2 sm:col-span-3 relative rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none h-100 w-full h-full">
                    <img :src="props.building.foto ? props.building.foto : '/noimg.jpg'"
                        class="w-full h-full object-cover rounded-tl-lg rounded-tr-lg lg:rounded-s-lg lg:rounded-tr-none" />

                    <div class="absolute filter drop-shadow top-0 left-0 m-5">
                        <h2 class="text-2xl md:text-3xl font-bold text-gray-50 mb-2 mr-5 drop-shadow-xl">{{
                            props.building.nome }}</h2>
                        <ul class="flex flex-wrap">
                            <li
                                class="hover:bg-gray-100 hover:text-gray-800 text-gray-50 font-semibold border-2 hover:border-gray-50 border-gray-100 cursor-pointer duration-300 shadow px-2 py- m-1 rounded-lg">
                                {{ props.building.situacao_comercial[0]?.nome }}</li>
                            <li
                                class="hover:bg-gray-100 hover:text-gray-800 text-gray-50 font-semibold border-2 hover:border-gray-50 border-gray-100 cursor-pointer duration-300 shadow px-2 py- m-1 rounded-lg">
                                {{ props.building.tipo_empreendimento[0]?.nome }}</li>
                            <li
                                class="hover:bg-gray-100 hover:text-gray-800 text-gray-50 font-semibold border-2 hover:border-gray-50 border-gray-100 cursor-pointer duration-300 shadow px-2 py- m-1 rounded-lg">
                                {{ props.building.situacao_obra[0]?.nome }}</li>
                            <li
                                class="hover:bg-gray-100 hover:text-gray-800 text-gray-50 font-semibold border-2 hover:border-gray-50 border-gray-100 cursor-pointer duration-300 shadow px-2 py- m-1 rounded-lg">
                                {{ props.building.segmento[0]?.nome }}</li>
                        </ul>
                    </div>

                    <Flag class="text-2xl ps-8 hidden lg:block" :stage="props.building.situacao_comercial[0].nome" />

                    <WeatherInfo class="absolute bottom-4 right-0 transform -translate-x-1/2 z-50"
                        :weather="buildingStore.weather" :city="props.building.cidade" />

                    <!-- <img class="absolute bottom-0 left-0 transform z-50" :src="props.building.logo" alt=""> -->

                </div>

                <div class="text flex flex-col col-span-2">
                    <div class="text relative text-gray-700 dark:text-gray-100 flex flex-col py-4 px-4 md:px-6">
                        <div x-data="{ isActive: false }" class="relative dropdown">
                            <div class="inline-flex items-center overflow-hidden">
                                <i x-on:click="isActive = !isActive"
                                    class="fas fa-ellipsis-vertical text-2xl m-1.5 cursor-pointer text-gray-700 hover:text-gray-800 dark:text-gray-100 dark:hover:text-gray-300 duration-200"></i>
                            </div>

                            <div class="absolute left-0 z-10 w-auto rounded-md border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-500 shadow-lg"
                                role="menu" x-cloak x-transition x-show="isActive" x-on:click.away="isActive = false"
                                x-on:keydown.escape.window="isActive = false">
                                <div class="p-2">
                                    <a class="block rounded-md px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-300 hover:text-gray-600 dark:text-gray-200 dark:hover:bg-gray-300 dark:hover:text-gray-700"
                                        role="menuitem" @click="openEditModal">
                                        <i class="fas text-xl fa-pencil mr-1"></i>
                                        Editar Empreendimento
                                    </a>
                                    <button @click="excluirBuilding"
                                        class="flex w-full items-center gap-2 mt-1 rounded-md px-4 py-2 text-sm text-red-700 hover:bg-red-100 dark:hover:bg-red-50"
                                        role="menuitem">
                                        <i class="far text-red-700 text-xl fa-trash-can mr-1"></i>
                                        Excluir Empreendimento
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Flag class="text-2xl ps-8 block lg:hidden"
                            :stage="props.building.situacao_comercial[0].nome" />

                        <div class="descricao text-gray-600 dark:text-gray-300 mb-4">
                            <p class="pl-2 text-2xl font-semibold">Sienge</p>
                            <div
                                class="text-md border border-gray-300 dark:border-gray-500 rounded-xl md:rounded-2xl p-@ md:p-3 text-center">
                                <p>{{ props.building?.nome_empresa }}</p>
                                <div class="flex justify-around">
                                    <p>EMPRESA SIENGE: <strong>{{ props.building?.idempresa_int }}</strong></p>
                                    <p>CDC SIENGE: <strong>{{ props.building?.idempreendimento_int }}</strong></p>
                                </div>
                            </div>
                        </div>

                        <!-- 
                        <strong>Clima:</strong>
                        <span v-if="buildingStore.weather">
                            {{ buildingStore.weather.temperature }}°C
                        </span>
                        <span v-else>Carregando...</span> -->

                        <!-- <img :src="props.building.logo" alt=""> -->


                        <p>{{ props.building?.endereco_emp }}</p>
                        <p>{{ props.building?.numero }}</p>
                        <p>{{ props.building?.bairro }}</p>
                        <p>{{ props.building?.cidade }}</p>
                        <p>{{ props.building?.cep }}</p>
                        <p>{{ props.building?.estado }}</p>
                        <p>{{ props.building?.regiao }}</p>

                        <p>Previsão para entrega: {{ props.building.data_entrega }}</p>

                        <!-- <a target="_blank"
                            :href="`https://www.google.com/maps?q=${props.building.latitude},${props.building.longitude}`">
                            <i
                                class="fas fa-map-location-dot text-2xl dark:hover:text-gray-300 hover:text-gray-600"></i>
                        </a> -->

                        <button v-tippy="'CV CRM'">
                            <a :href="`https://menin.cvcrm.com.br/gestor/cadastros/empreendimentos/${props.building.idempreendimento}/cadastro_simplificado`"
                                target="_blank">
                                <img src="/CVLogo.png" alt="CV CRM" class="h-6 min-w-6 drop-shadow">
                            </a>
                        </button>

                        <iframe
                            :src="`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1579.2792625838822!2d${props.building.longitude}!3d${props.building.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1spt-BR!2sbr!4v1738328467636!5m2!1spt-BR!2sbr`"
                            allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                            style="border: none; height: 300px; width: 100%;"></iframe>


                    </div>

                    <i class="fas fa-xmark absolute text-2xl top-0 right-0 m-5 cursor-pointer text-gray-700 hover:text-gray-800 dark:text-gray-200 dark:hover:text-gray-300 duration-200"
                        @click="closeModal"></i>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.flag {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 100% 100%, 12% 100%);
}
</style>