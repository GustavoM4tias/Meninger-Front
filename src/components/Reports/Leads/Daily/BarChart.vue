<template>
  <div class="bg-gray-200 dark:bg-gray-700 rounded-xl shadow-md px-2 md:px-8 py-2 md:py-4 m-2">
    <h1 class="text-lg md:text-2xl font-bold text-center">Relatório Diário de Leads</h1>

    <div class="my-1 w-60 mx-auto">
      <Select classes="!text-sm md:!text-md !py-1 text-center" v-model="empreendimentoSelecionado"
        :options="empreendimentosUnicos" placeholder="Selecionar Empreendimento" required />
    </div>

    <div class="relative">
      <div class="text-3xl absolute right-0 -top-5 z-10">
        <i class="far fa-file-image cursor-pointer hover:scale-[103%] text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
          @click="salvarComoImagem"></i>
        <i class="far fa-file-pdf mx-2 cursor-pointer hover:scale-[103%] text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
          @click="salvarComoPDF"></i>
      </div>
      <BarChart ref="chartDiario" class="h-[36vh]" :chart-data="chartData" :options="chartOptions" />
    </div>
    <LoadingComponents v-if="carregando" />
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

const leadsStore = useLeadsStore();
const carregando = ref(true);
const chartDiario = ref(null);

watchEffect(() => {
  if (leadsStore.leads.length > 0) {
    carregando.value = false;
  }
});

ChartJS.register(...registerables);

const empreendimentoSelecionado = ref('');

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
    label: emp.nome
  }))];
});

const obterResumoLeads = (leads) => {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0));
  const fimHoje = new Date(hoje.setHours(23, 59, 59, 999));

  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  const inicioOntem = new Date(ontem.setHours(0, 0, 0, 0));
  const fimOntem = new Date(ontem.setHours(23, 59, 59, 999));

  const leadsHoje = leads.filter((lead) => {
    const dataLead = new Date(lead.data_cad);
    return dataLead >= inicioHoje && dataLead <= fimHoje;
  });

  const leadsOntem = leads.filter((lead) => {
    const dataLead = new Date(lead.data_cad);
    return dataLead >= inicioOntem && dataLead <= fimOntem;
  });

  return {
    hoje: leadsHoje.length,
    ontem: leadsOntem.length,
  };
};

const resumoLeads = computed(() => obterResumoLeads(filtrarLeadsPorEmpreendimento(leadsStore.leads)));

const filtrarLeadsPorEmpreendimento = (leads) => {
  if (empreendimentoSelecionado.value) {
    return leads.filter((lead) =>
      lead.empreendimento.some((emp) => emp.nome === empreendimentoSelecionado.value)
    );
  }
  return leads;
};

const chartData = computed(() => {
  return {
    labels: ['Ontem', 'Hoje'],
    datasets: [
      {
        label: 'Leads',
        borderColor: ['#e74c3c', '#3498db'], // Cor da borda
        borderWidth: 4, // Largura da borda
        backgroundColor: 'transparent', // Fundo transparente
        //fill: false, // Sem preenchimento
        data: [resumoLeads.value.ontem, resumoLeads.value.hoje],
      },
    ],
  };
});

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      display: true,
      labels: {
        color: '#999', // Cor das labels
        font: {
          size: 16, // Tamanho das labels
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#999', // Cor dos ticks no eixo X
      },
    },
    y: {
      ticks: {
        color: '#999', // Cor dos ticks no eixo Y
      },
    },
  },
});

const salvarComoImagem = () => {
  const canvas = chartDiario.value.$el.querySelector('canvas'); // Captura o canvas do gráfico diário
  const link = document.createElement('a');
  link.download = 'relatorio_diario.png';
  link.href = canvas.toDataURL();
  link.click();
};

const salvarComoPDF = () => {
  const pdf = new jsPDF();
  const canvas = chartDiario.value.$el.querySelector('canvas'); // Captura o canvas do gráfico diário
  const imagem = canvas.toDataURL('image/png');
  pdf.addImage(imagem, 'PNG', 10, 10, 180, 90);
  pdf.save('relatorio_diario.pdf');
};

</script>
