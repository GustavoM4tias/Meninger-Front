<template>
    <div class="max-w-sm mx-auto p-6">
      <h1 class="text-3xl font-bold text-center mb-8">Relatório de Leads</h1>
  
      <div class="mb-8">
        <BarChart :chart-data="chartData" :options="chartOptions" />
      </div>
  
      <div class="flex justify-center gap-4">
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-green-500 transition"
          @click="salvarComoImagem">
          Exportar como Imagem
        </button>
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-green-500 transition"
          @click="salvarComoPDF">
          Exportar como PDF
        </button>
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
    const inicioUltimas24Horas = new Date(hoje);
    inicioUltimas24Horas.setHours(hoje.getHours() - 24);  // Calculando 24 horas atrás
  
    // Calculando o mesmo período do dia anterior
    const inicioDiaAnterior = new Date(hoje);
    inicioDiaAnterior.setDate(hoje.getDate() - 1);
    const inicioUltimas24HorasDiaAnterior = new Date(inicioDiaAnterior);
    inicioUltimas24HorasDiaAnterior.setHours(inicioDiaAnterior.getHours() - 24);
  
    // Filtrando leads para as últimas 24 horas
    const leadsUltimas24Horas = leads.filter((lead) => {
      const dataLead = new Date(lead.data_cad);
      return dataLead >= inicioUltimas24Horas && dataLead <= hoje;
    });
  
    // Filtrando leads para as últimas 24 horas do dia anterior
    const leadsUltimas24HorasDiaAnterior = leads.filter((lead) => {
      const dataLead = new Date(lead.data_cad);
      return dataLead >= inicioUltimas24HorasDiaAnterior && dataLead < inicioDiaAnterior;
    });
  
    return { 
      ultimas24Horas: leadsUltimas24Horas.length, 
      ultimas24HorasDiaAnterior: leadsUltimas24HorasDiaAnterior.length 
    };
  };
  
  // Propriedade computada para o resumo dos leads
  const resumoLeads = computed(() => obterResumoLeads(props.leads));
  
  // Computed para dados do gráfico
  const chartData = computed(() => ({
    labels: ['Últimas 24h (Dia Anterior)', 'Últimas 24h'],
    datasets: [
      {
        label: 'Leads',
        backgroundColor: ['#3498db', '#2ecc71'],
        data: [resumoLeads.value.ultimas24HorasDiaAnterior, resumoLeads.value.ultimas24Horas],
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
  