<script setup>
import Flag from '../../Buildings/UI/Flag.vue';

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
    <div class="relative rounded-xl overflow-hidden h-[30vh] max-h-[100%]" @click="showBuildingDetails">
        <!-- Define altura do Card -->

        <img :src="building.foto" class="w-full h-full object-cover bg-center absolute z-0" /> <!-- Ajuste imagem -->

        <div class="absolute inset-0 h-[300px] rounded-lg bg-gradient-to-b from-gray-900 to-transparent opacity-75">
        </div>

        <div class="content flex flex-col justify-between h-full z-10 relative p-4 text-white">

            <div class="titulo">
                <div class="flex justify-between">
                    <h1 class="text-xl truncate filter md:text-2xl font-semibold drop-shadow-md w-4/6">{{ building.nome
                        }}
                    </h1>
                    <!-- <p
                        class="text-gray-200 font-semibold filter drop-shadow cursor-pointer duration-200 hover:text-gray-100 text-wrap text-sm bottom-0 right-0 m-1 md:m-2">
                        {{ building.data_entrega }}
                    </p> -->
                </div>

                <Flag :stage="building.situacao_comercial[0]?.nome" />

                <!-- <ul class="flex flex-wrap">
                    <li class="hover:bg-gray-100 hover:text-gray-800 text-gray-200 border border-gray-300 cursor-pointer filter drop-shadow duration-300 shadow px-2 py- m-1 rounded-lg"
                        v-for="tag in building.tags" :key="3">{{ tag }}</li>
                </ul>  -->
            </div>

            <!-- Descrição do evento -->
            <div class="descricao flex-1 flex items-end justify-between">
                <p
                    class="text-lg md:text-xl text-gray-100 cursor-pointer duration-200 filter drop-shadow hover:text-gray-200 -mt-1">
                    {{ building.cidade }}/{{ building.estado }}
                </p>
                <RouterLink :to="{
                    path: '/buildings',
                    query: { search: building.nome, section: 'geral' }
                }" class="border rounded-md md:rounded-lg text-white text-md md:text-lg text-wrap hover:bg-gray-100 hover:text-gray-800 duration-300 py-1 px-2 md:py-2 md:px-4 ml-4">
                    Ver Mais
                </RouterLink>
            </div>
        </div>
    </div>
</template>

<style scoped>
.flag {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 100% 100%, 12% 100%);
}
</style>