<script setup>
import { computed, onMounted } from 'vue';
import { useLeadsStore } from '../../../stores/leadStore';
import BarChart from './Daily/BarChart.vue';
import BarChart2 from './Monthly/BarChart.vue';
import LineChart from './weekly/LineChart.vue';
import LeadsGeneral from './LeadsGeneral.vue';

const leadsStore = useLeadsStore();

onMounted(async () => {
    if (leadsStore.leads.length === 0) {
        await leadsStore.buscarLeads();
        await leadsStore.carregarFilas();
    }
});

// Usando computed para garantir a reatividade
const leads = computed(() => leadsStore.leads);
const filas = computed(() => leadsStore.filas);
</script>

<template>
    <div class="bg-gray-800 w-full relative overflow-hidden">
        <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-100 dark:bg-gray-800 relative">

            <!-- Primeira coluna -->
            <div class="w-full md:w-2/3 flex flex-col">
                <LineChart :leads="leads" class="drop-shadow-none" />
                <BarChart2 :leads="leads" class="filter drop-shadow-none" />
            </div>{{ leadsStore.filas }}

            <!-- Segunda coluna -->
            <div class="w-full md:w-1/3 flex flex-col">
                <BarChart :leads="leads" class="flex-1 filter drop-shadow-none order-2 md:order-1" />
                <LeadsGeneral class="enterprise flex flex-1 order-1 md:order-2" />
            </div>
        </div>

        <div
            class="group bg-gray-600 cursor-pointer absolute right-[18rem] top-52 rounded-bl-lg transform transition-transform duration-300">
            <div class="button absolute -left-7 bg-gray-600 cursor-pointer rounded-l-lg py-3 px-2.5">
                <i class="fas fa-chevron-left"></i>
            </div>
            <div class="content w-72 h-96 p-2 flex flex-col justify-between">
                <!-- <div class="bg-yellow-200 relative">
                    <h1 class="text-2xl absolute font-semibold">Marília</h1>
                    <h1 class="text-2xl right-0 absolute font-semibold">leads</h1>
                </div> -->
                <div class="">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Cidade</th>
                                <th scope="col">Entrada de Leads</th>
                                <th scope="col">Leads em Atendimento</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>São Paulo</td>
                                <td>30</td>
                                <td>25</td>
                            </tr>
                            <tr>
                                <td>Rio de Janeiro</td>
                                <td>28</td>
                                <td>25</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="text-gray-500 text-xs mx-auto">Relatório dos ultímos 7 dias.</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <!-- <div class="bg-red-200">teste</div>
                <div class="bg-orange-200">teste</div>
                <div class="bg-green-200">teste</div>
                <div class="bg-pink-200">teste</div> -->
                <!-- <p class="text-gray-500 text-xs mx-auto"></p> -->
            </div>
        </div>

    </div>
</template>

<style scoped>
.group:hover {
    transform: translateX(-288px);
}
</style>
