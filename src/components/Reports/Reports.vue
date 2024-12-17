<template>
    <div class="bg-gray-800 w-full">
        <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-100 dark:bg-gray-800">

            <!-- Primeira coluna -->
            <div class="w-full md:w-2/3 flex flex-col">
                <LineChart :leads="leads" class="drop-shadow-none" />
                <BarChart2 :leads="leads" class="filter drop-shadow-none" />
            </div>

            <!-- Segunda coluna -->
            <div class="w-full md:w-1/3 flex flex-col">
                <BarChart :leads="leads" class="flex-1 filter drop-shadow-none order-2 md:order-1" />
                <LeadsGeneral class="enterprise flex flex-1 order-1 md:order-2" />
            </div>
        </div>

    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useLeadsStore } from '../../stores/leadStore';
import BarChart from './Leads/Daily/BarChart.vue';
import BarChart2 from './Leads/Monthly/BarChart.vue';
import LineChart from './Leads/weekly/LineChart.vue';
import LeadsGeneral from './LeadsGeneral.vue';

const leadsStore = useLeadsStore();

onMounted(async () => {
    if (leadsStore.leads.length === 0) {
        await leadsStore.buscarLeads();
    }
});

// Usando computed para garantir a reatividade
const leads = computed(() => leadsStore.leads);

</script>
