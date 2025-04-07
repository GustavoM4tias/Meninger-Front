<template>
    <div class="flex flex-col items-center justify-center h-[calc(100vh-6rem)] bg-gray-300 dark:bg-gray-800 text-center text-2xl">
        <i class="fas fa-eye-low-vision text-9xl"></i>
        <h1 class="text-5xl font-bold">Sem Permissão</h1>
        <p class="mt-4 font-medium">
            {{ message }}
            <br>
        <p class="mt-1">Entre em contato com seu administrador.</p>
        </p>
        <router-link to="/" class="mt-4 text-gray-600 dark:text-gray-300 hover:text-gray-700 hover:dark:text-gray-400">
            <i class="fas fa-reply mr-3"></i>Voltar para a página inicial
        </router-link>
    </div>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const message = route.query.message;
</script>
