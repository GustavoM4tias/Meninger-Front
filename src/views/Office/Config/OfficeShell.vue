<!-- src/views/Office/layouts/OfficeShell.vue -->
<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Nav from '@/components/Navigation/Nav.vue'; 
import Carregamento from '@/components/Loading/Carregamento.vue';
import InPersonRecordingBar from '@/components/InPersonRecordingBar.vue';
import MuralFloatingCard from '@/components/Mural/MuralFloatingCard.vue';

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
        <main class="flex flex-col h-dvh w-full md:overflow-hidden">
            <div class="flex">
                <Nav />

                <div
                    class="flex flex-1 mt-16 sm:mt-12 w-full h-auto md:h-[calc(100dvh-3rem)] break-words overflow-auto">
                    <!-- md:h-full dá altura definida ao wrapper: páginas que querem scroll
                         próprio (ex.: ficha comercial) usam h-full e preenchem exatamente a
                         área útil; páginas normais continuam crescendo e rolando aqui. -->
                    <div class="w-full max-w-full md:h-full">
                        <router-view />
                    </div>
                </div>
            </div>
        </main>
 
        <InPersonRecordingBar />
        <MuralFloatingCard />
        <Carregamento />
    </div>
</template>
