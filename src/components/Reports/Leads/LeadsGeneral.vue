<template>
    <div
        class="bg-gray-200 dark:bg-gray-700 flex flex-col rounded-xl shadow-md px-2 md:px-8 py-2 m-2 h-full relative">
        <!-- <iframe title="report" src="https://app.reportei.com/embed/YYJMtclpNtn7w5pnGeAyukXVrcqIYcfJ" width="500" height="300"></iframe> Instagram Pages -->
        <LoadingComponents v-if="carregando" />
        <div class="flex flex-col justify-between h-full" v-if="leads.length > 0">
            <!-- <div class="flex justify-between bg-red-300 w-80 m-auto">
                                <div class="relative mb-2 mt-5 border border-gray-500 rounded-lg px-12">
                                    <label class="absolute -top-5 truncate">Leads CV</label>
                                    <span>{{ total }}</span>
                                </div>
                                <div class="relative mb-2 mt-5 border border-gray-500 rounded-lg px-12">
                                    <label class="absolute -top-5">Consultados</label>
                                    <span>{{ leads.length }}</span>
                                </div>
                            </div> -->
                <h1 class="text-lg md:text-2xl font-bold text-center mt-2">Relatório de Leads</h1>
            <div class="text-[2.7vh]">
                <div class="text-center">
                    <div class="flex items-center justify-center">
                        <p class="me-1.5">Hoje: <strong>{{ getLeadsPorPeriodo('hoje') }}</strong></p>
                    </div>

                    <p class="text-xs text-gray-400"> <span
                            :class="percentualCrescimentoHoje >= 0 ? 'text-green-500' : 'text-red-500'">
                            <strong>{{ percentualCrescimentoHoje.toFixed(1) }}%</strong>
                            <span :class="percentualCrescimentoHoje >= 0 ? 'text-green-500' : 'text-red-500'">
                                <i
                                    :class="percentualCrescimentoHoje >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                            </span>
                        </span> em comparação ao dia anterior ({{
                            getLeadsPorPeriodo('ontem') }}).</p>
                </div>

                <div class="text-center">
                    <div class="flex items-center justify-center">
                        <p class="me-1.5">Semana: <strong>{{ getLeadsPorPeriodo('semana') }}</strong></p>
                    </div>
                    <p class="text-xs text-gray-400">
                        <span :class="percentualCrescimentoSemana >= 0 ? 'text-green-500' : 'text-red-500'">
                            <strong>{{ percentualCrescimentoSemana.toFixed(1) }}%</strong>
                            <span :class="percentualCrescimentoSemana >= 0 ? 'text-green-500' : 'text-red-500'">
                                <i
                                    :class="percentualCrescimentoSemana >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                            </span>
                        </span>
                        em comparação a semana anterior ({{
                            getLeadsPorPeriodo('semanaAnterior') }}).
                    </p>
                </div>

                <div class="text-center">
                    <div class="flex items-center justify-center">
                        <p class="me-1.5">Mês: <strong>{{ getLeadsPorPeriodo('mes') }}</strong></p>

                    </div>
                    <p class="text-xs text-gray-400">
                        <span :class="percentualCrescimentoMes >= 0 ? 'text-green-500' : 'text-red-500'">
                            <strong>{{ percentualCrescimentoMes.toFixed(1) }}%</strong>
                            <span :class="percentualCrescimentoMes >= 0 ? 'text-green-500' : 'text-red-500'">
                                <i :class="percentualCrescimentoMes >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                            </span>
                        </span>
                        em comparação ao mês anterior ({{
                            getLeadsPorPeriodo('mesAnterior') }}).
                    </p>
                </div>

            </div>
            <p class="text-gray-400 bottom-0 w-full text-center py-2 text-xs">Relatório com
                valores aproximados!</p>
        </div>
        <div v-else class="m-auto text-center">
            <p>Nenhum lead encontrado.</p>
        </div>
        <div v-if="erro" class="text-red-500 m-auto text-center">
            <p>{{ erro }}</p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect } from 'vue';
import { useLeadsStore } from '../../../stores/Lead/leadStore';
import LoadingComponents from '../../Loading/LoadingComponents.vue';

const leadsStore = useLeadsStore();
const hoje = new Date();
const diaHoje = hoje.getDate()
const mesAnterior = hoje.getMonth() - 1;
const ano = hoje.getFullYear();
const anoMesAnterior = mesAnterior < 0 ? ano - 1 : ano;
const ultimoDiaMesAnterior = new Date(anoMesAnterior, mesAnterior + 1, 0);
const diasNoMesAnterior = ultimoDiaMesAnterior.getDate();
const horaDia = hoje.getHours(); // pega a a hora do dia para o calculo diario 
const carregando = ref(true);

onMounted(async () => {
    if (leadsStore.leads.length === 0) {
        await leadsStore.buscarLeads();
    }
});

// Usando computed para garantir a reatividade
const leads = computed(() => leadsStore.leads);
const erro = computed(() => leadsStore.erro);
const getLeadsPorPeriodo = computed(() => leadsStore.getLeadsPorPeriodo);

// Cálculo dos percentuais de crescimento
const percentualCrescimentoHoje = computed(() => {
    const hojeLeads = getLeadsPorPeriodo.value('hoje');
    const ontemLeads = getLeadsPorPeriodo.value('ontem');
    return ((hojeLeads - ((ontemLeads / 24) * horaDia)) / ontemLeads) * 100;
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

// Controle de carregamento
watchEffect(() => {
    if (leadsStore.leads.length >= 1200) {
        carregando.value = false;
    }
});
</script>