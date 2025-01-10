<template>
    <div class="bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
        <div class="flex w-full justify-between items-center px-1">
            <h2 class="text-xl font-semibold">{{ fila.nome }}</h2>
            <p class="text-xl">{{ fila.leadsCount }} Lead{{ fila.leadsCount > 1 ? 's' : '' }}</p>  
        </div>
        <!-- Exibindo os atendentes -->
        <div class="bg-gray-100 dark:bg-gray-600 rounded-md flex justify-between py-0.5 px-2">
            <div class="flex items-center"
                v-tippy="`${fila.corretores_e_imobiliarias.map(corretor => corretor.nome_corretor).join(' - ')}`">
                <div class="bg-green-400 w-4 h-4 rounded-full"></div>
                <p class="ms-1.5">
                    {{ fila.corretores_e_imobiliarias.length }} Corretor{{
                        fila.corretores_e_imobiliarias.length > 1 ? 'es' : '' }}
                </p>
            </div>
            <div class="flex items-center relative">
                <i @click="handleInfo()" class="fas cursor-pointer"
                    :class="{ 'fa-chevron-up': moreInfo, 'fa-chevron-down': !moreInfo }"></i>
                <div v-if="moreInfo" class="bg-gray-200 dark:bg-gray-500 absolute top-6 right-0 w-64 h-16 p-1 rounded-lg shadow z-10">
                    <div class="grid grid-cols-2 text-center text-sm h-full font-">
                        <div class="col-span-1">
                            <h2 class="text-gray-700 dark:text-gray-300"><span class="font-bold text-green-400">•</span> Atendimento</h2>
                        </div>
                        <div class="col-span-1">
                            <h2 class="text-gray-700 dark:text-gray-300"><span class="font-bold text-orange-400">•</span> Aguardando</h2>
                        </div>
                        <div class="col-span-1">
                            <p class="text-xl font-bold">
                                {{ fila.leadsCount - fila.leadsWaitingCount }} Lead{{ fila.leadsCount > 1 ? 's' : '' }}
                            </p>
                        </div>
                        <div class="col-span-1">
                            <p class="text-xl font-bold">
                                {{ fila.leadsWaitingCount }} Lead{{ fila.leadsCount > 1 ? 's' : '' }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

// Recebe a fila como prop
defineProps({
    fila: Object
});

const moreInfo = ref(false);

function handleInfo() {
    moreInfo.value = !moreInfo.value;
}
</script>
 