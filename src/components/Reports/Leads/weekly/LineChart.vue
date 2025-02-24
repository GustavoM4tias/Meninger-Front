<template>
  <div class="bg-gray-200 dark:bg-gray-700 rounded-xl shadow-md px-2 md:px-8 py-2 m-2 h-full">
    <h1 class="text-lg md:text-2xl font-bold text-center">Relatório Semanal de Leads</h1>

    <div class="my-1 w-60 mx-auto">
      <Select classes="!text-sm md:!text-md !py-1 text-center" v-model="empreendimentoSelecionado"
        :options="empreendimentosUnicosComTodos" placeholder="Selecionar Empreendimento" required />
    </div>

    <div class="relative flex flex-col h-[80%] w-full">
      <div class="text-3xl absolute right-0 -top-5 z-10">
        <i class="far fa-file-image cursor-pointer hover:scale-[103%] text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
          @click="salvarComoImagem"></i>
        <!-- <i class="far fa-file-pdf mx-2 cursor-pointer hover:scale-[103%] text-gray-700 hover:text-gray-800 dark:text-gray-50 dark:hover:text-gray-100"
          @click="salvarComoPDF"></i> -->
      </div>
      <LineChart ref="chartSemanal" class="h-[30vh] w-full m-auto" :chart-data="chartData" :options="chartOptions"
        @click="abrirModalLeads" />

      <div class="flex justify-between items-center m-2 text-2xl gap-4 absolute">
        <button v-tippy="'Semana Anterior'" class="text-red-600 hover:underline dark:text-red-500"
          @click="abrirModalPorPeriodo('Semana Anterior')">
          <i class="fas fa-chart-column"></i>
        </button>
        <button v-tippy="'Semana Atual'" class="text-blue-600 hover:underline dark:text-blue-400"
          @click="abrirModalPorPeriodo('Semana Atual')">
          <i class="fas fa-chart-column"></i>
        </button>
      </div>
    </div>


    <LoadingComponents v-if="carregando" />
  </div>
  <ModalLeads :leads="leadsDoDia" :modalVisivel="modalVisivel"
    @update:modalVisivel="(visivel) => modalVisivel = visivel" />
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue';
import { LineChart } from 'vue-chart-3';
import { Chart as ChartJS, registerables } from 'chart.js';
// import jsPDF from 'jspdf';
import LoadingComponents from '../../../Loading/LoadingComponents.vue';
import Select from '../../../../components/UI/Select.vue';
import ModalLeads from '../components/ModalLeads.vue';
import { useLeadsStore } from '../../../../stores/Lead/leadStore';

const leadsStore = useLeadsStore();
const carregando = ref(true);
const chartSemanal = ref(null);
const modalVisivel = ref(false); // Controle de visibilidade do modal
const leadsDoDia = ref([]); // Lista de leads que será exibida no modal

// Controle de carregamento
watchEffect(() => {
  if (leadsStore.leads.length >= 450) {
    carregando.value = false;
  }
});

ChartJS.register(...registerables);

// Estado para o empreendimento selecionado
const empreendimentoSelecionado = ref('');

// Computed para obter os empreendimentos únicos com a opção "Todos"
const empreendimentosUnicosComTodos = computed(() => {
  const nomesUnicos = new Map();
  leadsStore.leads.forEach((lead) => {
    lead.empreendimento.forEach((emp) => {
      if (!nomesUnicos.has(emp.id)) {
        nomesUnicos.set(emp.id, emp);
      }
    });
  });
  // Adicionando a opção "Todos"
  const todosOption = { value: '', label: 'Todos' };
  return [todosOption, ...Array.from(nomesUnicos.values()).map(emp => ({
    value: emp.nome,
    label: emp.nome
  }))];
});

// Computed para dados do gráfico (filtrados por empreendimento)
const chartData = computed(() => {
  const diasSemanaAtual = [];
  const diasSemanaAnterior = [];
  const quantidadeLeadsSemanaAtual = [];
  const quantidadeLeadsSemanaAnterior = [];
  const hoje = new Date();

  const leadsFiltrados = empreendimentoSelecionado.value
    ? leadsStore.leads.filter((lead) => lead.empreendimento.some(emp => emp.nome === empreendimentoSelecionado.value))
    : leadsStore.leads;

  for (let i = 6; i >= 0; i--) {
    const dataDia = new Date(hoje);
    dataDia.setDate(hoje.getDate() - i);
    diasSemanaAtual.push(dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

    const leadsDoDia = leadsFiltrados.filter((lead) => {
      const dataCad = new Date(lead.data_cad);
      return dataCad.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    quantidadeLeadsSemanaAtual.push(leadsDoDia.length);
  }

  for (let i = 13; i >= 7; i--) {
    const dataDia = new Date(hoje);
    dataDia.setDate(hoje.getDate() - i);
    diasSemanaAnterior.push(dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

    const leadsDoDia = leadsFiltrados.filter((lead) => {
      const dataCad = new Date(lead.data_cad);
      return dataCad.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    quantidadeLeadsSemanaAnterior.push(leadsDoDia.length);
  }

  return {
    labels: [...diasSemanaAtual],
    datasets: [
      {
        label: `Semana Atual`,
        fill: false,
        borderColor: '#3498db',
        borderWidth: 4,
        tension: 0.4,
        data: quantidadeLeadsSemanaAtual,
      },
      {
        label: 'Semana Anterior',
        fill: false,
        borderColor: '#e74c3c',
        borderWidth: 4, // Largura da borda
        tension: 0.4,
        data: quantidadeLeadsSemanaAnterior.reverse(),
      },
    ],
  };
});

// Adicionando as opções do gráfico
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
      },
    },
    tooltip: {
      callbacks: {
        label: (tooltipItem) => {
          return `${tooltipItem.raw} Leads`;
        },
      },
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Últimos 7 dias',
      },
      ticks: {
        color: '#999', // Cor dos ticks no eixo X
      },
    },
    y: {
      title: {
        display: false,
        text: 'Quantidade de Leads',
      },
      ticks: {
        color: '#999', // Cor dos ticks no eixo Y
      },
    },
  },
};

const salvarComoImagem = () => {
  const canvas = chartSemanal.value.$el.querySelector('canvas'); // Captura o canvas do gráfico semanal
  const link = document.createElement('a');
  link.download = 'relatorio_semanal.png';
  link.href = canvas.toDataURL();
  link.click();
};

const abrirModalLeads = (event) => {
  const chart = chartSemanal.value.chartInstance;
  const pontosClicados = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);

  if (pontosClicados.length) {
    const index = pontosClicados[0].index;
    const dataSelecionada = chartData.value.labels[index];
    leadsDoDia.value = leadsStore.leads.filter((lead) => {
      const dataCad = new Date(lead.data_cad);
      return dataCad.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === dataSelecionada;
    });
    modalVisivel.value = true;
  }
};

const abrirModalPorPeriodo = (periodo) => {
  let dataInicio, dataFim;

  if (periodo === 'Semana Atual') {
    dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 6);
    dataFim = new Date();
  } else if (periodo === 'Semana Anterior') {
    dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 13);
    dataFim = new Date();
    dataFim.setDate(dataFim.getDate() - 7);
  }

  // Filtrar os leads no período selecionado
  leadsDoDia.value = leadsStore.leads.filter((lead) => {
    const dataCad = new Date(lead.data_cad);
    return dataCad >= dataInicio && dataCad <= dataFim;
  });

  // Abrir o modal
  modalVisivel.value = true;
};



// const salvarComoPDF = () => {
//   const pdf = new jsPDF();
//   const canvas = chartSemanal.value.$el.querySelector('canvas'); // Captura o canvas do gráfico semanal
//   const imagem = canvas.toDataURL('image/png');
//   pdf.addImage(imagem, 'PNG', 10, 10, 180, 90);
//   pdf.save('relatorio_semanal.pdf');
// };

</script>
