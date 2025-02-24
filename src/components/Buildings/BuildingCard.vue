<script setup>
import Flag from './UI/Flag.vue';
const props = defineProps({
    building: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['click']);

const showBuildingDetails = () => {
    emit('click', props.building);
};

</script>

<template>
    <div class="shadow-md dark:shadow-2xl relative filter drop-shadow-lg rounded-xl overflow-hidden duration-300 transform hover:scale-105 h-full"
        @click="showBuildingDetails">
        <img :src="props.building.foto ? props.building.foto : '/noimg.jpg'"
            class="w-full h-full object-cover bg-center absolute z-0" />

        <div class="absolute inset-0 h-[300px] rounded-lg bg-gradient-to-b from-gray-900 to-transparent opacity-75">
        </div>

        <div class="content flex flex-col justify-between h-72 z-10 relative p-4 text-white">
            <div class="titulo">
                <div class="flex justify-between">
                    <h1 class="text-xl truncate filter md:text-xl font-semibold drop-shadow-md w-4/6">{{
                        props.building.nome }}</h1>
                    <!-- <p class="text-gray-200 font-semibold filter drop-shadow cursor-pointer duration-200 hover:text-gray-100 text-wrap text-sm bottom-0 right-0 m-1 md:m-2">
                        {{ formatDate(building.building_date) }}
                    </p> -->
                    <Flag :stage="props.building.situacao_comercial[0].nome" />
                </div>
                <ul class="flex flex-wrap">
                    <li
                        class="hover:bg-gray-100 hover:text-gray-800 text-gray-200 border border-gray-300 cursor-pointer filter drop-shadow duration-300 shadow px-2 py- m-1 rounded-lg">
                        {{ props.building.segmento[0].nome }}</li>
                    <li
                        class="hover:bg-gray-100 hover:text-gray-800 text-gray-200 border border-gray-300 cursor-pointer filter drop-shadow duration-300 shadow px-2 py- m-1 rounded-lg">
                        {{ props.building.situacao_obra[0].nome }}</li>
                    <li
                        class="hover:bg-gray-100 hover:text-gray-800 text-gray-200 border border-gray-300 cursor-pointer filter drop-shadow duration-300 shadow px-2 py- m-1 rounded-lg">
                        {{ props.building.tipo_empreendimento[0].nome }}</li>
                </ul>
            </div>

            <div class="descricao flex-1 flex items-end justify-between">
                <p
                    class="text-lg md:text-xl text-gray-100 cursor-pointer duration-200 filter drop-shadow hover:text-gray-200 -mt-1">
                    {{ props.building.cidade }}/{{ props.building.sigla }}
                </p>
                <button
                    class="border rounded-md md:rounded-lg text-gray-100 text-lg text-wrap hover:bg-gray-100 hover:text-gray-800 shadow filter drop-shadow duration-300 py-1 px-2 md:py-2 md:px-4 ml-4">
                    Ver Mais
                </button>
            </div>
        </div>
    </div>
</template>