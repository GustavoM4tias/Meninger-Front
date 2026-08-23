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
        class="border-b-2 group border-line hover:bg-surface-sunken border-line hover:bg-surface-sunken cursor-pointer px-3 py-2 md:px-4 md:py-2 text-lg md:text-xl flex">
        <!-- <div
            class="date text-center flex flex-col justify-center md:text-lg font-semibold rounded-tl-lg rounded-br-lg bg-surface-sunken group-hover:bg-surface-sunken dark:bg-gray-500 hover:bg-surface-sunken dark:group-hover:bg-surface-sunken text-ink px-2 py-1 mr-3">
            <p class="day font-semibold"></p>
            <p class="month -mt-2"></p>
        </div> -->
        <div class="text w-full truncate flex flex-col justify-center">
            <p class="title md:text-lg font-medium text-ink truncate">{{ item.title }}</p>
            <p class="hour text-xs md:text-sm text-ink">
                {{ formatDate(item.event_date).day }} {{ formatDate(item.event_date).month }} de {{ formatDate(item.event_date).year }}.  {{ formatDate(item.event_date).hours }}:{{ formatDate(item.event_date).minutes }}</p>
        </div>
    </RouterLink>

    <!-- Caso seja um aniversário
    <div v-if="item.birth_date" :to="{
        path: '/profile',
        query: { user: item.username }
    }"
        class="border-b-2 group border-line hover:bg-surface-sunken border-line hover:bg-surface-sunken cursor-pointer px-3 py-2 md:px-5 md:py-4 text-lg md:text-xl flex">
        <div
            class="date text-center flex flex-col justify-center text-sm md:text-lg rounded-br-xl rounded-tl-lg bg-surface-sunken group-hover:bg-surface-sunken dark:bg-gray-500 hover:bg-surface-sunken dark:group-hover:bg-surface-sunken text-ink py-1 px-2 mr-4">
            <p class="day font-semibold">{{ formatDate(item.birth_date).day }}</p>
            <p class="month -mt-2">{{ formatDate(item.birth_date).month }}</p>
        </div>
        <div class="text w-full truncate flex flex-col justify-center">
            <p class="hour text-xs md:text-sm text-ink -mb-1">Aniversário de </p>
            <p class="title text-xl font-medium text-ink">{{ item.username }}</p>
        </div>
    </div> -->
</template>
