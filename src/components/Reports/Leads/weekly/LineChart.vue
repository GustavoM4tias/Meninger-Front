<template>
  <div class="">
    <h1 class="text-3xl font-bold text-center mb-8">Relatório de Leads - Últimas 2 Semanas</h1>

    <div class="mb-8">
      <LineChart :chart-data="chartData" :options="chartOptions" />
    </div>

    <div class="flex justify-center gap-4">
      <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-green-500 transition" @click="salvarComoImagem">
        Exportar como Imagem
      </button>
      <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-green-500 transition" @click="salvarComoPDF">
        Exportar como PDF
      </button>
    </div>
  </div>
</template>

<script setup>
import { LineChart } from 'vue-chart-3';
import { Chart as ChartJS, registerables } from 'chart.js';
import { ref, computed } from 'vue';
import jsPDF from 'jspdf';

// Registra os componentes do ChartJS
ChartJS.register(...registerables);

// Props para receber os dados de leads
const props = defineProps({
  leads: {
    type: Array,
    required: true
  }
});

// Computed para dados do gráfico (leads nas últimas 2 semanas)
const chartData = computed(() => {
  const diasSemanaAtual = [];
  const diasSemanaAnterior = [];
  const quantidadeLeadsSemanaAtual = [];
  const quantidadeLeadsSemanaAnterior = [];
  const hoje = new Date();

  // Calculando os dados da semana atual (últimos 7 dias)
  for (let i = 6; i >= 0; i--) {
    const dataDia = new Date(hoje);
    dataDia.setDate(hoje.getDate() - i);
    diasSemanaAtual.push(dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

    const leadsDoDia = props.leads.filter((lead) => {
      const dataCad = new Date(lead.data_cad);
      return dataCad.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    quantidadeLeadsSemanaAtual.push(leadsDoDia.length);
  }

  // Calculando os dados da semana anterior (7 dias antes da semana atual)
  for (let i = 13; i >= 7; i--) {
    const dataDia = new Date(hoje);
    dataDia.setDate(hoje.getDate() - i);
    diasSemanaAnterior.push(dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

    const leadsDoDia = props.leads.filter((lead) => {
      const dataCad = new Date(lead.data_cad);
      return dataCad.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    quantidadeLeadsSemanaAnterior.push(leadsDoDia.length);
  }

  // Retorna os dados do gráfico
  return {
  
    labels: [...diasSemanaAtual],  // Exibe apenas os dias das duas semanas
    datasets: [
      {
        label: 'Semana Atual',
        fill: false,
        borderColor: '#3498db',  // Cor para a semana atual
        tension: 0.1,
        data: quantidadeLeadsSemanaAtual,  // Dados da semana atual
      },
      {
        label: 'Semana Anterior',
        fill: false,
        borderColor: '#e74c3c',  // Cor para a semana anterior
        tension: 0.1,
        data: quantidadeLeadsSemanaAnterior.reverse(),  // Inverte a semana anterior para o gráfico
      },
    ],
  };
});

// Opções do gráfico
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
    },
  },
});

// Funções de exportação
const salvarComoImagem = () => {
  const canvas = document.querySelector('canvas');
  const link = document.createElement('a');
  link.download = 'relatorio_leads.png';
  link.href = canvas.toDataURL();
  link.click();
};

const salvarComoPDF = () => {
  const pdf = new jsPDF();
  const canvas = document.querySelector('canvas');
  const imagem = canvas.toDataURL('image/png');
  pdf.addImage(imagem, 'PNG', 10, 10, 180, 90);
  pdf.save('relatorio_leads.pdf');
};
</script>
