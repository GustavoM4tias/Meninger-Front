<script setup>
const props = defineProps({
    user: {
        type: Object,
        required: true,
    },
});

// Função para formatar a data
const formatDate = (dateString) => {
    const date = new Date(dateString);

    // Array de meses abreviados
    const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()]; // Pega o mês abreviado

    return { day, month };
};
</script>

<template>
    <div
        class="border-b-2 group border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 cursor-pointer px-3 py-2 md:px-5 md:py-4 text-lg md:text-xl flex">
        <div
            class="date text-center flex flex-col justify-center text-sm md:text-lg rounded-br-xl rounded-tl-lg bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-500 dark:hover:bg-gray-600 dark:group-hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-1 px-2 mr-4">
            <p class="day font-semibold">{{ formatDate(user.birth_date).day }}</p>
            <p class="month -mt-2">{{ formatDate(user.birth_date).month }}</p>
        </div>
        <div class="text w-full truncate flex flex-col justify-center">
            <p class="hour text-xs md:text-sm text-gray-700 dark:text-gray-300 -mb-1">Aniversário de </p>
            <p class="title text-xl font-medium text-gray-700 dark:text-gray-100"> {{ user.username }}</p>
        </div>
    </div>
</template>
