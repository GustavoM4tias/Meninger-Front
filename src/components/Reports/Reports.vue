<template>
    <div class="bg-gray-800 text-white w-full">
        <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-100 dark:bg-gray-800">

            <!-- Primeira coluna -->
            <div class="w-full md:w-2/3 flex flex-col">

                <div class="w-full">
                    <LineChart :leads="leads" class="flex-1 bg-yellow-200 filter drop-shadow-xl" />
                </div>

                <div class="others flex-1">

                    <div class="mb-4">
                        <button @click="buscarLeadsDiario" class="px-4 py-2 bg-blue-500 text-white rounded">
                            Buscar Leads Diários
                        </button>
                        <button @click="buscarLeadsSemanal" class="px-4 py-2 bg-green-500 text-white rounded ml-4">
                            Buscar Leads Semanais
                        </button>
                    </div>

                    <div v-if="erro" class="text-red-500 mb-4">
                        <p>{{ erro }}</p>
                    </div>

                    <div v-if="leads.length > 0" class="text-yellow-400 mb-4">
                        <p>Total de Leads: {{ total }}</p>
                        <p>Total de entradas: {{ leads.length }}</p>
                    </div>

                    <div v-else>
                        <p class="text-gray-400">Nenhum lead encontrado para o período selecionado.</p>
                    </div>

                </div>

            </div>

            <!-- Segunda coluna -->
            <div class="w-full md:w-1/3 f-full flex flex-col">

                <BarChart :leads="leads"
                    class="flex-1 bg-red-200 md:h-[60%] md:min-h-[60%] filter drop-shadow-xl order-2 md:order-1" />

                <div class="enterprise h-[40%] flex-1 order-1 md:order-2">
                    <div class="flex-1 bg-blue-300 filter drop-shadow-xl h-full m-auto" />
                </div>
                
            </div>
        </div>

    </div>
</template>


<script setup>
import { computed } from 'vue';
import { useLeadsStore } from '../../stores/leadStore';
import BarChart from './Leads/Daily/BarChart.vue';
import LineChart from './Leads/weekly/LineChart.vue';

const leadsStore = useLeadsStore();

const buscarLeadsDiario = async () => {
    console.log("Buscando leads diários...");
    await leadsStore.buscarLeadsDiario();
};

const buscarLeadsSemanal = async () => {
    console.log("Buscando leads semanais...");
    await leadsStore.buscarLeadsSemanal();
};


// Usando computed para garantir a reatividade
const leads = computed(() => leadsStore.leads);
const erro = computed(() => leadsStore.erro);
const total = computed(() => leadsStore.total);
</script>
