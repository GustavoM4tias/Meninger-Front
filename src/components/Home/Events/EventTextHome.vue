<!-- src/components/Events/EventTextHome.vue -->
<script setup>

const props = defineProps({
    event: {
        type: Object,
        required: true,
    },
});

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

</script>

<template>
    <div class="border-b-2 border-gray-600 hover:bg-gray-800 cursor-pointer px-5 py-4 text-2xl flex">

        <div class="date text-center text-md rounded-br-xl rounded-tl-xl bg-gray-500 py-1 px-2 mr-4">
            <p class="day font-semibold ">16</p>
            <p class="month -mt-2">Dez</p>
        </div>

        <div class="text w-full truncate flex flex-col justify-center">
            <div class="title">{{ event.title }}</div>
            <p class="hour text-sm text-gray-300">{{ event.title }}</p>
        </div>
    </div>
</template>
