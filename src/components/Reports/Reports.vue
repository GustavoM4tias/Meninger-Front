<template>
    <div class="bg-gray-800 w-full">
        <div class="h-auto md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-100 dark:bg-gray-800">

            <!-- Primeira coluna -->
            <div class="w-full md:w-2/3 flex flex-col">
                <LineChart :leads="leads" class="drop-shadow-none" />
                <BarChart2 :leads="leads" class="filter drop-shadow-none" />
                <!-- md:h-[60%] md:min-h-[60%]  -->
            </div>

            <!-- Segunda coluna -->
            <div class="w-full md:w-1/3 flex flex-col">

                <BarChart :leads="leads" class="flex-1 filter drop-shadow-none order-2 md:order-1" />
                <!-- md:h-[60%] md:min-h-[60%]  -->

                <div class="enterprise flex flex-1 order-1 md:order-2">
                    <div class="bg-gray-700 flex flex-col rounded-lg m-3 w-full shadow-xl px-5">

                        <h1 class="text-3xl font-bold text-center py-3">Relatório de Leads</h1>

                        <div class="flex flex-col" v-if="leads.length > 0">

                            <div class="flex justify-around">
                                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                                    <label class="absolute -top-5 truncate">Leads CV</label>
                                    <span>{{ total }}</span>
                                </div>

                                <div class="relative mb-2 mt-5 border border-gray-500 rounded-xl p-2">
                                    <label class="absolute -top-5">Consultados</label>
                                    <span>{{ leads.length }}</span>
                                </div>
                            </div>

                            <p>Leads de hoje: {{ getLeadsPorPeriodo('hoje') }}</p>
                            <p>Leads de ontem: {{ getLeadsPorPeriodo('ontem') }}</p>

                            <p>
                                <span :class="percentualCrescimentoHoje >= 0 ? 'text-green-500' : 'text-red-500'">
                                    {{ percentualCrescimentoHoje.toFixed(1) }}%
                                    <span :class="percentualCrescimentoHoje >= 0 ? 'text-green-500' : 'text-red-500'">
                                        <i
                                            :class="percentualCrescimentoHoje >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                                    </span>
                                </span>
                            </p>

                            <p>Leads desta semana: {{ getLeadsPorPeriodo('semana') }}</p>
                            <p>Leads da semana passada: {{ getLeadsPorPeriodo('semanaAnterior') }}</p>
                            <p>Leads deste mês: {{ getLeadsPorPeriodo('mes') }}</p>
                            <p>Leads do mês passado: {{ getLeadsPorPeriodo('mesAnterior') }}</p>

                            <p>
                                Percentual de crescimento semana vs semana passada:
                                <span :class="percentualCrescimentoSemana >= 0 ? 'text-green-500' : 'text-red-500'">
                                    {{ percentualCrescimentoSemana.toFixed(1) }}%
                                    <span :class="percentualCrescimentoSemana >= 0 ? 'text-green-500' : 'text-red-500'">
                                        <i
                                            :class="percentualCrescimentoSemana >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                                    </span>
                                </span>
                            </p>

                            <p>
                                Percentual de crescimento mês vs mês passado:
                                <span :class="percentualCrescimentoMes >= 0 ? 'text-green-500' : 'text-red-500'">
                                    {{ percentualCrescimentoMes.toFixed(1) }}%
                                    <span :class="percentualCrescimentoMes >= 0 ? 'text-green-500' : 'text-red-500'">
                                        <i
                                            :class="percentualCrescimentoMes >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                                    </span>
                                </span>
                            </p>

                            <span class="text-center text-gray-400">Relatório com valores aproximados</span>
                        </div>

                        <div v-else class=" m-auto text-center">
                            <p>Nenhum lead encontrado.</p>
                        </div>
                        <div v-if="erro" class="text-red-500 m-auto text-center">
                            <p>{{ erro }}</p>
                        </div>

                    </div>

                </div>

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

const leadsStore = useLeadsStore();
const hoje = new Date();
const diaHoje = hoje.getDate()
const mesAnterior = hoje.getMonth() - 1;
const ano = hoje.getFullYear();
const anoMesAnterior = mesAnterior < 0 ? ano - 1 : ano;
const ultimoDiaMesAnterior = new Date(anoMesAnterior, mesAnterior + 1, 0);
const diasNoMesAnterior = ultimoDiaMesAnterior.getDate();

onMounted(async () => {
    if (leadsStore.leads.length === 0) {
        await leadsStore.buscarLeads();
    }
});

// Usando computed para garantir a reatividade
const leads = computed(() => leadsStore.leads);
const erro = computed(() => leadsStore.erro);
const total = computed(() => leadsStore.total);
const getLeadsPorPeriodo = computed(() => leadsStore.getLeadsPorPeriodo);

// Cálculo dos percentuais de crescimento
const percentualCrescimentoHoje = computed(() => {
    const hojeLeads = getLeadsPorPeriodo.value('hoje');
    const ontemLeads = getLeadsPorPeriodo.value('ontem');
    return ((hojeLeads - ontemLeads) / ontemLeads) * 100;
});

const percentualCrescimentoSemana = computed(() => {
    const semanaLeads = getLeadsPorPeriodo.value('semana');
    const semanaAnteriorLeads = getLeadsPorPeriodo.value('semanaAnterior');
    return ((semanaLeads - semanaAnteriorLeads) / semanaAnteriorLeads) * 100;
});

const percentualCrescimentoMes = computed(() => {
    const mesLeads = getLeadsPorPeriodo.value('mes');
    const mesAnteriorLeads = getLeadsPorPeriodo.value('mesAnterior');
    const leadsPorDiaMesAnterior = mesAnteriorLeads / diasNoMesAnterior;
    return ((mesLeads - (leadsPorDiaMesAnterior * diaHoje)) / (leadsPorDiaMesAnterior * diaHoje)) * 100;
});
</script>
