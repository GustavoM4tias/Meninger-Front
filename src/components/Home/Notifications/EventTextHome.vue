<script setup>
const props = defineProps({
    event: {
        type: Object,
        required: true,
    },
});

const formatDate = (dateString) => {
    const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
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
    <RouterLink :to="{
        path: '/events',
        query: { busca: event.title, section: 'geral' }
    }" class="border-b-2 group border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 cursor-pointer px-3 py-2 md:px-5 md:py-4 text-lg md:text-xl flex">
        <div class="date text-center flex flex-col justify-center text-sm md:text-lg rounded-br-xl rounded-tl-lg bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-500 dark:hover:bg-gray-600 dark:group-hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-1 px-2 mr-4">
            <p class="day font-semibold">{{ formatDate(event.event_date).day }}</p>
            <p class="month -mt-2">{{ formatDate(event.event_date).month }}</p>
        </div>
        <div class="text w-full truncate flex flex-col justify-center">
            <div class="title text-xl font-medium text-gray-700 dark:text-gray-100">{{ event.title }}</div>
            <p class="hour text-xs md:text-sm text-gray-700 dark:text-gray-300">Hora: {{ formatDate(event.event_date).hours }}:{{
                formatDate(event.event_date).minutes }}</p>
        </div>
    </RouterLink>
</template>