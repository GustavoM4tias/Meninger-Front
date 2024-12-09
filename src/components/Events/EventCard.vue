<!-- src/components/Events/EventCard.vue -->
<script setup>

const props = defineProps({
    event: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['click']);

const showEventDetails = () => {
    emit('click', props.event);
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

</script>

<template>
    <div class="shadow-md dark:shadow-lg relative filter drop-shadow-lg rounded-xl overflow-hidden duration-300 transform hover:scale-105 h-full"
        @click="showEventDetails">

        <img :src="(event.images && event.images.length > 0) ? event.images[0] : '/noimg.jpg'"
            class="w-full h-full object-cover bg-center absolute z-0" />

        <div class="absolute inset-0 rounded-lg bg-gradient-to-t from-gray-900 to-transparent opacity-75"></div>

        <div class="content flex flex-col justify-between h-72 z-10 relative p-4 text-white">
            <div class="titulo">
                <div class="flex justify-between">
                    <h1 class="text-xl truncate filter md:text-2xl font-semibold drop-shadow-md">{{ event.title }}</h1>
                    <p
                        class="text-gray-200 font-semibold filter drop-shadow cursor-pointer duration-200 hover:text-gray-100 text-wrap text-sm bottom-0 right-0 m-1 md:m-2">
                        {{ formatDate(event.event_date) }}
                    </p>
                </div>
                <ul class="flex flex-wrap">
                    <li class="hover:bg-gray-100 hover:text-gray-800 text-gray-200 border border-gray-300 cursor-pointer filter drop-shadow duration-300 shadow px-2 py- m-1 rounded-lg"
                        v-for="tag in event.tags" :key="tag">{{ tag }}</li>
                </ul>
            </div>

            <div class="descricao flex-1 flex items-end justify-between">
                <p class="text-md md:text-lg text-gray-300 cursor-pointer duration-200 hover:text-gray-100 -mt-1">
                    <!-- Cidade  -->
                </p>
                <button
                    class="border rounded-md md:rounded-lg text-white text-lg text-wrap hover:bg-gray-100 hover:text-gray-800 duration-300 py-1 px-2 md:py-2 md:px-4 ml-4">
                    Ver Mais
                </button>
            </div>

        </div>

    </div>

</template>
