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
    <div class="border-b-2 border-gray-600 hover:bg-gray-800 cursor-pointer px-5 py-4 text-xl flex">
        <div class="date text-center text-md rounded-br-xl rounded-tl-lg bg-gray-500 py-1 px-2 mr-4">
            <p class="day font-semibold">{{ formatDate(event.event_date).day }}</p>
            <p class="month -mt-2">{{ formatDate(event.event_date).month }}</p>
        </div>
        <div class="text w-full truncate flex flex-col justify-center">
            <div class="title">{{ event.title }}</div>
            <p class="hour text-sm text-gray-300">Hora: {{ formatDate(event.event_date).hours }}:{{ formatDate(event.event_date).minutes }}</p>
        </div>
    </div>
</template>
