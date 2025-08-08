<template>
    <hr class="border-gray-400 dark:border-gray-600" />

    <div class="m-auto p-1 w-full flex group">
        <button
            class="flex w-full truncate justify-center rounded-lg cursor-pointer px-1 py-0.5 duration-100 hover:bg-gray-200 dark:hover:bg-gray-400 hover:text-gray-200">
            <RouterLink :to="notification?.link" class="m-auto flex justify-between w-full truncate">
                <img v-if="notification.image" :src="notification?.image" alt=""
                    class="w-14 h-14 my-auto rounded-md object-cover" />
                <div v-if="notification.birth"
                    class="date min-w-14 h-14 my-auto text-center flex flex-col justify-center text-md md:text-xl rounded-md font-semibold bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-400 dark:hover:bg-gray-600 dark:group-hover:bg-gray-500 text-gray-700 dark:text-gray-100">
                    <p class="day">{{ formatDate(notification.birth).day }}</p>
                    <p class="month -mt-2">{{ formatDate(notification.birth).month }}</p>
                </div>
                <div class="flex flex-col w-full text-start ps-2 truncate">
                    <h4 class="text-gray-800 dark:text-gray-100 -mb-1 font-semibold truncate">{{ notification?.title }}
                    </h4>
                    <p class="text-md truncate text-gray-500 dark:text-gray-300">{{ notification?.type }}</p>
                    <!-- <p class="text-sm">{{ notification.date }}</p> -->
                </div>
            </RouterLink>
        </button>
    </div>
</template>

<script setup>
import { RouterLink } from 'vue-router';

defineProps({
    notification: {
        type: Object,
        required: true
    }
});

const formatDate = (dateString) => {
    const date = new Date(dateString);

    const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];  

    return { day, month };
};
</script>