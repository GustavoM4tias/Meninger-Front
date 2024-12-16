<template>
    <div class="container mx-auto px-4">
        <h1 class="text-2xl font-bold text-center mt-8">Relatório Mensal de Leads</h1>

        <div class="my-4 w-full sm:w-72 mx-auto">
            <Select classes="!text-sm md:!text-lg !py-2 text-center" v-model="empreendimentoSelecionado"
                :options="empreendimentosUnicos" placeholder="Selecionar Empreendimento" required />
        </div>

        <div class="relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <!-- Botões para exportação -->
            <div class="flex justify-end space-x-4 mb-4">
                <i class="far fa-file-image cursor-pointer hover:scale-105 text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
                    @click="salvarComoImagem" title="Salvar como Imagem"></i>
                <i class="far fa-file-pdf cursor-pointer hover:scale-105 text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
                    @click="salvarComoPDF" title="Salvar como PDF"></i>
            </div>

            <!-- Carregamento ou gráfico -->
            <div class="relative">
                <LoadingComponents v-if="carregando" />
                <BarChart v-else :chart-data="chartData" :options="chartOptions" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import { BarChart } from 'vue-chart-3';
import { Chart as ChartJS, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import LoadingComponents from '../../../Loading/LoadingComponents.vue';
import Select from '../../../../components/UI/Select.vue';
import { useLeadsStore } from '../../../../stores/leadStore';

// Registrar plugins do Chart.js
ChartJS.register(...registerables);

const leadsStore = useLeadsStore();
const carregando = ref(true);
const empreendimentoSelecionado = ref('');

// Computed para empreendimentos únicos
const empreendimentosUnicos = computed(() => {
    const nomesUnicos = new Map();
    leadsStore.leads.forEach((lead) => {
        lead.empreendimento.forEach((emp) => {
            if (!nomesUnicos.has(emp.id)) {
                nomesUnicos.set(emp.id, emp);
            }
        });
    });
    return [{ value: '', label: 'Todos' }, ...Array.from(nomesUnicos.values()).map(emp => ({
        value: emp.nome,
        label: emp.nome,
    }))];
});

// Função para calcular dados filtrados
const filtrarLeadsPorEmpreendimento = (leads) => {
    return empreendimentoSelecionado.value
        ? leads.filter(lead => lead.empreendimento.some(emp => emp.nome === empreendimentoSelecionado.value))
        : leads;
};

// Função para obter os leads de um determinado mês
const obterLeadsDoMes = (leads, mes, ano) => {
    return leads.filter(lead => {
        const dataCad = new Date(lead.data_cad);
        return dataCad.getMonth() === mes && dataCad.getFullYear() === ano;
    });
};

// Dados do gráfico
const chartData = computed(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    const leadsMesAtual = filtrarLeadsPorEmpreendimento(obterLeadsDoMes(leadsStore.leads, mesAtual, anoAtual));
    const leadsMesAnterior = filtrarLeadsPorEmpreendimento(obterLeadsDoMes(leadsStore.leads, mesAnterior, anoAnterior));

    return {
        labels: ['Mês Anterior', 'Mês Atual'],
        datasets: [
            {
                label: 'Quantidade de Leads',
                backgroundColor: ['#FF5733', '#4CAF50'],
                data: [leadsMesAnterior.length, leadsMesAtual.length],
            },
        ],
    };
});

// Opções do gráfico
const chartOptions = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top',
        },
    },
    scales: {
        x: {
            title: {
                display: true,
                text: 'Período',
            },
        },
        y: {
            title: {
                display: true,
                text: 'Quantidade de Leads',
            },
        },
    },
};

// Funções para exportação
const salvarComoImagem = () => {
    const canvas = document.querySelector('canvas');
    const link = document.createElement('a');
    link.download = 'relatorio_mensal.png';
    link.href = canvas.toDataURL();
    link.click();
};

const salvarComoPDF = () => {
    const pdf = new jsPDF();
    const canvas = document.querySelector('canvas');
    const imagem = canvas.toDataURL('image/png');
    pdf.addImage(imagem, 'PNG', 10, 10, 180, 90);
    pdf.save('relatorio_mensal.pdf');
};

// Controle de carregamento
watchEffect(() => {
    if (leadsStore.leads.length > 0) {
        carregando.value = false;
    }
});
</script>

<style scoped>
.container {
    max-width: 900px;
}
</style>
