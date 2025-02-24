<template>
    <div class="bg-gray-200 dark:bg-gray-700 rounded-xl shadow-md px-2 md:px-8 py-2 m-2 h-full">
        <h1 class="text-lg md:text-2xl font-bold text-center">Relatório Mensal de Leads</h1>

        <div class="my-1 w-60 mx-auto">
            <Select classes="!text-sm md:!text-md !py-1 text-center" v-model="empreendimentoSelecionado"
                :options="empreendimentosUnicos" placeholder="Selecionar Empreendimento" required />
        </div>

        <div class="relative">
            <!-- Botões para exportação -->
            <div class="text-3xl absolute right-0 -top-5 z-10">
                <i class="far fa-file-image cursor-pointer hover:scale-[103%] text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
                    @click="salvarComoImagem"></i>
                <!-- <i class="far fa-file-pdf mx-2 cursor-pointer hover:scale-[103%] h- text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
                    @click="salvarComoPDF"></i> -->
            </div>
            <BarChart ref="chartMensal" class="h-[34vh]" :chart-data="chartData" :options="chartOptions" />
            <!-- Tabela detalhada -->
            <!-- <div class="mt-8 overflow-x-auto">
                <table class="min-w-full border border-gray-300">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="px-4 py-2 text-left">Empreendimento</th>
                            <th class="px-4 py-2 text-center">Leads Mês Anterior</th>
                            <th class="px-4 py-2 text-center">Leads Mês Atual</th>
                            <th class="px-4 py-2 text-center">Variação (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(dados, index) in dadosDetalhados" :key="index">
                            <td class="px-4 py-2">{{ dados.nome }}</td>
                            <td class="px-4 py-2 text-center">{{ dados.leadsMesAnterior }}</td>
                            <td class="px-4 py-2 text-center">{{ dados.leadsMesAtual }}</td>
                            <td class="px-4 py-2 text-center">{{ dados.variacao }}%</td>
                        </tr>
                    </tbody>
                </table>
            </div> -->
        </div>
        <LoadingComponents v-if="carregando" />
    </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import { BarChart } from 'vue-chart-3';
import { Chart as ChartJS, registerables } from 'chart.js';
// import jsPDF from 'jspdf';
import LoadingComponents from '../../../Loading/LoadingComponents.vue';
import Select from '../../../../components/UI/Select.vue';
import { useLeadsStore } from '../../../../stores/Lead/leadStore';

// Registrar plugins do Chart.js
ChartJS.register(...registerables);

const leadsStore = useLeadsStore();
const carregando = ref(true);
const empreendimentoSelecionado = ref('');
const chartMensal = ref(null);

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

// Dados detalhados por empreendimento
const dadosDetalhados = computed(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    const leadsFiltrados = filtrarLeadsPorEmpreendimento(leadsStore.leads);

    const empreendimentos = empreendimentosUnicos.value.slice(1); // Remover o "Todos"

    return empreendimentos.map(emp => {
        const leadsMesAnterior = obterLeadsDoMes(
            leadsFiltrados.filter(lead => lead.empreendimento.some(e => e.nome === emp.label)),
            mesAnterior,
            anoAnterior
        );
        const leadsMesAtual = obterLeadsDoMes(
            leadsFiltrados.filter(lead => lead.empreendimento.some(e => e.nome === emp.label)),
            mesAtual,
            anoAtual
        );
        const variacao = leadsMesAnterior.length > 0
            ? (((leadsMesAtual.length - leadsMesAnterior.length) / leadsMesAnterior.length) * 100).toFixed(2)
            : leadsMesAtual.length > 0
                ? 100
                : 0;

        return {
            nome: emp.label,
            leadsMesAnterior: leadsMesAnterior.length,
            leadsMesAtual: leadsMesAtual.length,
            variacao: variacao,
        };
    });
});

const chartData = computed(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    const empreendimentos = Array.from(new Set(leadsStore.leads.flatMap(lead => lead.empreendimento.map(emp => emp.nome))));

    const datasetAtual = empreendimentos.map(nome => {
        const leadsAtual = filtrarLeadsPorEmpreendimento(obterLeadsDoMes(leadsStore.leads, mesAtual, anoAtual))
            .filter(lead => lead.empreendimento.some(emp => emp.nome === nome)).length;
        return leadsAtual;
    });

    const datasetAnterior = empreendimentos.map(nome => {
        const leadsAnterior = filtrarLeadsPorEmpreendimento(obterLeadsDoMes(leadsStore.leads, mesAnterior, anoAnterior))
            .filter(lead => lead.empreendimento.some(emp => emp.nome === nome)).length;
        return leadsAnterior;
    });

    return {
        labels: empreendimentos,
        datasets: [
            {
                label: 'Mês Anterior',
                borderColor: '#e74c3c', // Cor da borda
                borderWidth: 3, // Largura da borda
                fill: false, // Sem preenchimento
                tension: 0.4, // Suavidade da linha
                data: datasetAnterior,
            },
            {
                label: 'Mês Atual',
                borderColor: '#3498db', // Cor da borda
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                data: datasetAtual,
            },
        ],
    };
});

const chartOptions = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top',
            display: true,
            labels: {
                color: '#999', // Cor das labels
                font: {
                    size: 16, // Tamanho das labels
                },
                boxWidth: 20, // Tamanho do quadrado de legenda
                boxHeight: 12, // Altura do quadrado de legenda
            },
        },
    },
    scales: {
        x: {
            title: {
                display: true,
                text: 'Empreendimentos',
                color: '#666',
                font: {
                    size: 14,
                },
            },
            ticks: {
                display: false, // Oculta os nomes abaixo
            },
        },
        y: {
            title: {
                display: false,
                text: 'Quantidade de Leads',
                color: '#666',
                font: {
                    size: 14,
                },
            },
            ticks: {
                color: '#666',
                font: {
                    size: 12,
                },
            },
        },
    },
};

// Controle de carregamento
watchEffect(() => {
    if (leadsStore.leads.length >= 1200) {
        carregando.value = false;
    }
});

const salvarComoImagem = () => {
  const canvas = chartMensal.value.$el.querySelector('canvas'); // Captura o canvas do gráfico mensal
  const link = document.createElement('a');
  link.download = 'relatorio_mensal.png';
  link.href = canvas.toDataURL();
  link.click();
};

// const salvarComoPDF = () => {
//   const pdf = new jsPDF();
//   const canvas = chartMensal.value.$el.querySelector('canvas'); // Captura o canvas do gráfico mensal
//   const imagem = canvas.toDataURL('image/png');
//   pdf.addImage(imagem, 'PNG', 10, 10, 180, 90);
//   pdf.save('relatorio_mensal.pdf');
// };

</script>
