<script setup>
const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
});

const formatDate = (dateString) => {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return { day, month, year, hours, minutes };
};
</script>

<template>
    <!-- Verifica se o item é um evento ou aniversário -->
    <RouterLink v-if="item.event_date" :to="{
        path: '/marketing/events',
        query: { busca: item.title, section: 'geral' }
    }"
        class="border-b-2 group border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 cursor-pointer px-3 py-2 md:px-4 md:py-2 text-lg md:text-xl flex">
        <!-- <div
            class="date text-center flex flex-col justify-center md:text-lg font-semibold rounded-tl-lg rounded-br-lg bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-500 dark:hover:bg-gray-600 dark:group-hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 mr-3">
            <p class="day font-semibold"></p>
            <p class="month -mt-2"></p>
        </div> -->
        <div class="text w-full truncate flex flex-col justify-center">
            <p class="title md:text-lg font-medium text-gray-700 dark:text-gray-100 truncate">{{ item.title }}</p>
            <p class="hour text-xs md:text-sm text-gray-700 dark:text-gray-300">
                {{ formatDate(item.event_date).day }} {{ formatDate(item.event_date).month }} de {{ formatDate(item.event_date).year }}.  {{ formatDate(item.event_date).hours }}:{{ formatDate(item.event_date).minutes }}</p>
        </div>
    </RouterLink>

    <!-- Caso seja um aniversário
    <div v-if="item.birth_date" :to="{
        path: '/profile',
        query: { user: item.username }
    }"
        class="border-b-2 group border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 cursor-pointer px-3 py-2 md:px-5 md:py-4 text-lg md:text-xl flex">
        <div
            class="date text-center flex flex-col justify-center text-sm md:text-lg rounded-br-xl rounded-tl-lg bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-500 dark:hover:bg-gray-600 dark:group-hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-1 px-2 mr-4">
            <p class="day font-semibold">{{ formatDate(item.birth_date).day }}</p>
            <p class="month -mt-2">{{ formatDate(item.birth_date).month }}</p>
        </div>
        <div class="text w-full truncate flex flex-col justify-center">
            <p class="hour text-xs md:text-sm text-gray-700 dark:text-gray-300 -mb-1">Aniversário de </p>
            <p class="title text-xl font-medium text-gray-700 dark:text-gray-100">{{ item.username }}</p>
        </div>
    </div> -->
</template>
