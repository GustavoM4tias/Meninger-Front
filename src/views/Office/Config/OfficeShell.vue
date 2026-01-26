<!-- src/views/Office/layouts/OfficeShell.vue -->
<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Nav from '@/components/Navigation/Nav.vue';
import ChatBot from '@/components/ChatBot/ChatBotIcon.vue';
import Carregamento from '@/components/Loading/Carregamento.vue';

const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated());
</script>

<template>
    <!-- Office: não-autenticado -->
    <div v-if="!isAuthenticated" class="flex w-full">
        <router-view />
        <Carregamento />
    </div>

    <!-- Office: autenticado -->
    <div v-else class="flex w-full">
        <main class="flex flex-col h-screen w-full">
            <div class="flex">
                <Nav />

                <div
                    class="flex flex-1 mt-16 sm:mt-14 w-full h-auto md:min-h-[calc(100vh-3.5rem)] break-words overflow-auto">
                    <div class="w-full max-w-full bg-gray-50 dark:bg-gray-900">
                        <router-view />
                    </div>
                </div>
            </div>
        </main>

        <ChatBot v-if="isAuthenticated" />
        <Carregamento />
    </div>
</template>
