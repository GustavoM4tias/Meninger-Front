<script setup>
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

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};
</script>

<template>
    <div
        class="shadow-md dark:shadow-2xl relative filter drop-shadow-lg rounded-xl overflow-hidden duration-300 transform hover:scale-105 h-full"
        @click="showBuildingDetails"
    >
        <img :src="(building.images && building.images.length > 0) ? building.images[0] : '/noimg.jpg'"
            class="w-full h-full object-cover bg-center absolute z-0" />

        <div class="absolute inset-0 h-[300px] rounded-lg bg-gradient-to-b from-gray-900 to-transparent opacity-75"></div>

        <div class="content flex flex-col justify-between h-72 z-10 relative p-4 text-white">
            <div class="titulo">
                <div class="flex justify-between">
                    <h1 class="text-xl truncate filter md:text-2xl font-semibold drop-shadow-md">{{ building.title }}</h1>
                    <!-- <p class="text-gray-200 font-semibold filter drop-shadow cursor-pointer duration-200 hover:text-gray-100 text-wrap text-sm bottom-0 right-0 m-1 md:m-2">
                        {{ formatDate(building.building_date) }}
                    </p> -->

                    <div class="flag absolute bg-emerald-500 top-3 right-0 z-50 ps-6 pe-3 py-1 text- shadow-lg">
                        Pré Lançamento
                    </div> <!-- Local Para Flag de Estagio empreendimento -->

                </div>
                <ul class="flex flex-wrap">
                    <li class="hover:bg-gray-100 hover:text-gray-800 text-gray-200 border border-gray-300 cursor-pointer filter drop-shadow duration-300 shadow px-2 py- m-1 rounded-lg"
                        v-for="tag in building.tags" :key="tag">{{ tag }}</li>
                </ul>
            </div>

            <div class="descricao flex-1 flex items-end justify-between">
                <p class="text-lg md:text-xl text-gray-100 cursor-pointer duration-200 filter drop-shadow hover:text-gray-200 -mt-1">
                    {{ building.address.city }}
                </p>
                <button
                    class="border rounded-md md:rounded-lg text-gray-100 text-lg text-wrap hover:bg-gray-100 hover:text-gray-800 shadow filter drop-shadow duration-300 py-1 px-2 md:py-2 md:px-4 ml-4">
                    Ver Mais
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.flag {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 100% 100%, 12% 100%);
}
</style>