<script setup>
defineProps({
    user: Object
});
</script>

<template>
    <div class="bg-white shadow-lg rounded-xl p-4 text-center border border-gray-200 w-48 flex flex-col items-center">
        <h3 class="font-bold text-lg text-blue-600">{{ user.name }}</h3>
        <p class="text-gray-500 text-sm">{{ user.position }}</p>
    </div>
</template>