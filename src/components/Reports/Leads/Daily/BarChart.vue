<template>
  <div class="">
    <h1 class="text-3xl font-bold text-center mb-8">Relatório de Leads</h1>

    <div class="relative">
      <div class="text-3xl absolute right-0 z-20">
        <i class="far fa-file-image cursor-pointer hover:scale-[103%] text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100" @click="salvarComoImagem"></i>
        <i class="far fa-file-pdf mx-2 cursor-pointer hover:scale-[103%] text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100" @click="salvarComoPDF"></i>
      </div>
      <BarChart :chart-data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { BarChart } from 'vue-chart-3';
import { Chart as ChartJS, registerables } from 'chart.js';
import { ref, computed } from 'vue';
import jsPDF from 'jspdf';

ChartJS.register(...registerables);

// Props para receber os dados de leads
const props = defineProps({
  leads: {
    type: Array,
    required: true
  }
});

// Função para calcular o resumo das últimas 24 horas e o período anterior
const obterResumoLeads = (leads) => {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0));  // Início do dia de hoje
  const fimHoje = new Date(hoje.setHours(23, 59, 59, 999));  // Fim do dia de hoje

  // Calculando o início e o fim do dia anterior
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  const inicioOntem = new Date(ontem.setHours(0, 0, 0, 0));  // Início do dia anterior
  const fimOntem = new Date(ontem.setHours(23, 59, 59, 999));  // Fim do dia anterior

  // Filtrando leads para o dia de hoje
  const leadsHoje = leads.filter((lead) => {
    const dataLead = new Date(lead.data_cad);
    return dataLead >= inicioHoje && dataLead <= fimHoje;
  });

  // Filtrando leads para o dia anterior
  const leadsOntem = leads.filter((lead) => {
    const dataLead = new Date(lead.data_cad);
    return dataLead >= inicioOntem && dataLead <= fimOntem;
  });

  return {
    hoje: leadsHoje.length,
    ontem: leadsOntem.length,
  };
};


// Propriedade computada para o resumo dos leads
const resumoLeads = computed(() => obterResumoLeads(props.leads));

// Computed para dados do gráfico
const chartData = computed(() => ({
  labels: ['Ontem', 'Hoje'],
  datasets: [
    {
      label: 'Leads',
      backgroundColor: ['#3498db', '#2ecc71'],
      data: [resumoLeads.value.ontem, resumoLeads.value.hoje],
    },
  ],
}));


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