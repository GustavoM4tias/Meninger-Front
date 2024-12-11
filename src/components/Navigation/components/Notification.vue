<template>
    <hr class="border-gray-400 dark:border-gray-600" />

    <div class="m-auto p-1 w-full flex">
        <button
            class="flex w-full truncate justify-center rounded-lg cursor-pointer px-2 py-1 duration-100 hover:bg-gray-200 dark:hover:bg-gray-400 hover:text-gray-200">
            <RouterLink :to="link" class="m-auto flex justify-between w-full truncate">
                <img :src="image || '/noimg.jpg'" alt="" class="w-12 h-12 rounded-md object-cover" />
                <div class="flex flex-col w-full text-start ps-2 truncate">
                    <h4 class="text-gray-800 dark:text-gray-100 -mb-1 font-semibold truncate">{{ title }}</h4>
                    <p class="text-md truncate text-gray-500 dark:text-gray-300">{{ type }}</p>
                </div>
            </RouterLink>
        </button>
    </div>
</template>

<script setup>
import { RouterLink } from 'vue-router';

// Props para o componente
defineProps({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ''
    },
    link: {
        type: String,
        default: '/'
    }
});
</script>